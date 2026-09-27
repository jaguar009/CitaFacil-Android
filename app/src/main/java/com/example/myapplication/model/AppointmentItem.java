package com.example.myapplication.model;

import org.json.JSONObject;

/** La clave local UUID y el identificador del servidor son distintos. */
public class AppointmentItem {
    public final String clientId;
    public final long serverId;
    public final JSONObject data;
    public final String action, error;
    public final boolean attempted;
    public AppointmentItem(String clientId, long serverId, JSONObject data, String action, String error, boolean attempted) {
        this.clientId=clientId; this.serverId=serverId; this.data=data;
        this.action=action; this.error=error; this.attempted=attempted;
    }
    public String status() { return data.optString("status","BORRADOR"); }
    public String patient() { return data.optString("patient_name"); }
    public String service() { return data.optString("service_name"); }
    public String professional() { return data.optString("professional_name"); }
    public String date() { return data.optString("date_label"); }
    public String time() { return data.optString("time_label"); }
    public long scheduleId() { return data.optLong("schedule_id"); }
    public boolean canEdit() { return serverId==0 && !attempted && action.equals("CREATE"); }
    public boolean terminal() { return status().equals("CANCELADA") || status().equals("ATENDIDA") || status().equals("RECHAZADA"); }
    public String displayStatus() {
        if(action.equals("CANCEL")) return "Cancelación por enviar";
        if(action.equals("CREATE")) return "Solicitud por enviar";
        return status().substring(0,1)+status().substring(1).toLowerCase(java.util.Locale.ROOT);
    }
}
