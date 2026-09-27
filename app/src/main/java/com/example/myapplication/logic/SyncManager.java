package com.example.myapplication.logic;

import com.example.myapplication.data.local.DatabaseHelper;
import com.example.myapplication.data.remote.ApiClient;
import com.example.myapplication.model.AppointmentItem;
import org.json.*;

/** Sincroniza primero la cola local y después descarga el estado real del servidor. */
public class SyncManager {
    public static String synchronize(DatabaseHelper db,ApiClient api,long owner) throws Exception {
        int sent=0,conflicts=0;
        for(AppointmentItem item:db.getAppointments(owner,"")) {
            if(item.action.isEmpty())continue;
            try {
                db.markAttempt(owner,item.clientId);
                long serverId=item.serverId;
                JSONObject remote=null;
                if(serverId==0) {
                    JSONObject payload=new JSONObject().put("client_id",item.clientId).put("schedule_id",item.scheduleId()).put("patient_name",item.patient());
                    remote=new JSONObject(api.request("POST","/api/appointments",payload));
                    serverId=remote.getLong("id");
                }
                if(item.action.equals("CANCEL"))remote=new JSONObject(api.request("POST","/api/appointments/"+serverId+"/cancel",new JSONObject()));
                if(remote!=null)db.saveRemote(owner,remote,false);
                sent++;
            }catch(ApiClient.ApiException error) {
                if(error.status==0 || error.status==401 || error.status>=500)throw error;
                if(item.action.equals("CANCEL") && item.serverId>0 && error.status==409) {
                    // El administrador pudo atenderla antes de recibir la cancelación.
                    JSONArray list=new JSONArray(api.request("GET","/api/appointments",null));
                    for(int i=0;i<list.length();i++)if(list.getJSONObject(i).getLong("id")==item.serverId)db.saveRemote(owner,list.getJSONObject(i),false);
                } else db.saveError(owner,item,error.getMessage(),true);
                conflicts++;
            }
        }
        JSONArray remote=new JSONArray(api.request("GET","/api/appointments",null));
        for(int i=0;i<remote.length();i++)db.saveRemote(owner,remote.getJSONObject(i),true);
        db.saveCatalog(new JSONObject(api.request("GET","/api/catalog",null)));
        return conflicts>0?"Actualizado. "+conflicts+" solicitud(es) requieren revisión.":"Agenda actualizada · "+sent+" cambio(s) enviados";
    }
}
