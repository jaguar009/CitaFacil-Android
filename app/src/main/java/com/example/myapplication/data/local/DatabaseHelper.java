package com.example.myapplication.data.local;

import android.content.*;
import android.database.Cursor;
import android.database.sqlite.*;
import com.example.myapplication.model.*;
import org.json.*;
import java.util.*;

/** SQLite del teléfono: catálogo, solicitudes y cola de sincronización. */
public class DatabaseHelper extends SQLiteOpenHelper {
    public DatabaseHelper(Context context) { super(context,"citafacil_v2.db",null,1); }
    @Override public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE catalog(type TEXT NOT NULL,id INTEGER NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(type,id))");
        db.execSQL("CREATE TABLE appointments(client_id TEXT NOT NULL,owner INTEGER NOT NULL,server_id INTEGER NOT NULL DEFAULT 0,payload TEXT NOT NULL,action TEXT NOT NULL DEFAULT '',error TEXT NOT NULL DEFAULT '',attempted INTEGER NOT NULL DEFAULT 0,hidden INTEGER NOT NULL DEFAULT 0,label TEXT NOT NULL,PRIMARY KEY(client_id,owner))");
    }
    @Override public void onUpgrade(SQLiteDatabase db,int oldVersion,int newVersion) {}

    public void saveCatalog(JSONObject catalog) throws JSONException {
        SQLiteDatabase db=getWritableDatabase(); db.beginTransaction();
        try {
            db.delete("catalog",null,null);
            for(String type:new String[]{"services","professionals","schedules"}) {
                JSONArray list=catalog.getJSONArray(type);
                for(int i=0;i<list.length();i++) {
                    JSONObject row=list.getJSONObject(i); ContentValues v=new ContentValues();
                    v.put("type",type);v.put("id",row.getLong("id"));v.put("payload",row.toString());
                    db.insertOrThrow("catalog",null,v);
                }
            }
            db.setTransactionSuccessful();
        } finally {db.endTransaction();}
    }
    private List<JSONObject> catalog(String type) {
        List<JSONObject> rows=new ArrayList<>();
        try(Cursor c=getReadableDatabase().rawQuery("SELECT payload FROM catalog WHERE type=? ORDER BY id",new String[]{type})) {
            while(c.moveToNext()) try {rows.add(new JSONObject(c.getString(0)));} catch(JSONException ignored) {}
        } return rows;
    }
    public List<CatalogItem> getServices() {
        List<CatalogItem> rows=new ArrayList<>();
        for(JSONObject r:catalog("services"))rows.add(new CatalogItem(r.optLong("id"),r.optString("name")));
        return rows;
    }
    public List<CatalogItem> getProfessionals(long serviceId) {
        List<CatalogItem> rows=new ArrayList<>();
        for(JSONObject r:catalog("professionals"))if(r.optLong("service_id")==serviceId)rows.add(new CatalogItem(r.optLong("id"),r.optString("name")));
        return rows;
    }
    public List<ScheduleItem> getSchedules(long professionalId,long owner,String exceptClient) {
        Set<Long> pending=new HashSet<>();
        for(AppointmentItem a:getAppointments(owner,""))if(!a.clientId.equals(exceptClient) && a.action.equals("CREATE"))pending.add(a.scheduleId());
        List<ScheduleItem> rows=new ArrayList<>();
        for(JSONObject r:catalog("schedules")) {
            long id=r.optLong("id");String date=r.optString("date_label"),time=r.optString("time_label");
            if(r.optLong("professional_id")==professionalId && !pending.contains(id) && isFuture(date,time))
                rows.add(new ScheduleItem(id,professionalId,date,time));
        } return rows;
    }
    private boolean isFuture(String date,String time) {
        try {
            java.text.SimpleDateFormat format=new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm",Locale.ROOT);
            format.setTimeZone(TimeZone.getTimeZone("America/Lima"));format.setLenient(false);
            return format.parse(date+" "+time).getTime()>System.currentTimeMillis();
        }catch(Exception e){return false;}
    }
    private String label(JSONObject d) {return d.optString("patient_name")+" "+d.optString("service_name")+" "+d.optString("professional_name")+" "+d.optString("date_label");}
    public void saveDraft(long owner,String existingId,String patient,CatalogItem service,CatalogItem professional,ScheduleItem schedule) throws JSONException {
        String client=existingId==null?UUID.randomUUID().toString():existingId;
        JSONObject d=new JSONObject().put("client_id",client).put("patient_name",patient.trim())
            .put("schedule_id",schedule.getId()).put("service_id",service.getId()).put("professional_id",professional.getId())
            .put("service_name",service.getName()).put("professional_name",professional.getName())
            .put("date_label",schedule.getDate()).put("time_label",schedule.getTime()).put("status","BORRADOR");
        ContentValues v=new ContentValues();v.put("payload",d.toString());v.put("label",label(d));v.put("action","CREATE");v.put("error","");
        SQLiteDatabase db=getWritableDatabase();
        if(existingId==null) {v.put("client_id",client);v.put("owner",owner);db.insertOrThrow("appointments",null,v);}
        else {
            int changed=db.update("appointments",v,"client_id=? AND owner=? AND server_id=0 AND attempted=0 AND action='CREATE'",new String[]{client,Long.toString(owner)});
            if(changed!=1)throw new IllegalStateException("La cita ya se envió. Actualiza la lista.");
        }
    }
    public List<AppointmentItem> getAppointments(long owner,String search) {
        List<AppointmentItem> rows=new ArrayList<>();
        String sql="SELECT client_id,server_id,payload,action,error,attempted FROM appointments WHERE owner=? AND hidden=0 AND label LIKE ? ORDER BY rowid DESC";
        try(Cursor c=getReadableDatabase().rawQuery(sql,new String[]{Long.toString(owner),"%"+search+"%"})) {
            while(c.moveToNext())try {rows.add(new AppointmentItem(c.getString(0),c.getLong(1),new JSONObject(c.getString(2)),c.getString(3),c.getString(4),c.getInt(5)==1));}catch(JSONException ignored){}
        } return rows;
    }
    public void saveRemote(long owner,JSONObject data,boolean preservePending) throws JSONException {
        String client=data.getString("client_id");
        SQLiteDatabase db=getWritableDatabase();
        ContentValues v=new ContentValues();v.put("server_id",data.getLong("id"));v.put("payload",data.toString());v.put("label",label(data));v.put("error","");v.put("action","");
        try(Cursor c=db.rawQuery("SELECT action FROM appointments WHERE client_id=? AND owner=?",new String[]{client,Long.toString(owner)})) {
            if(c.moveToFirst()) {
                if(preservePending && !c.getString(0).isEmpty())return;
                db.update("appointments",v,"client_id=? AND owner=?",new String[]{client,Long.toString(owner)});
            } else {v.put("client_id",client);v.put("owner",owner);db.insertOrThrow("appointments",null,v);}
        }
    }
    public void markAttempt(long owner,String client) {ContentValues v=new ContentValues();v.put("attempted",1);update(owner,client,v);}
    public void requestCancel(long owner,AppointmentItem a) {
        if(a.terminal())throw new IllegalStateException("La cita ya está cerrada.");
        ContentValues v=new ContentValues();v.put("action","CANCEL");v.put("error","");update(owner,a.clientId,v);
    }
    public void saveError(long owner,AppointmentItem a,String message,boolean rejected) throws JSONException {
        ContentValues v=new ContentValues();v.put("error",message);
        if(rejected){a.data.put("status",a.action.equals("CANCEL")?"CANCELADA":"RECHAZADA");v.put("payload",a.data.toString());v.put("action","");}
        update(owner,a.clientId,v);
    }
    public void deleteLocal(long owner,AppointmentItem a) {
        if(a.canEdit())getWritableDatabase().delete("appointments","client_id=? AND owner=? AND attempted=0",new String[]{a.clientId,Long.toString(owner)});
        else if(a.terminal() && a.action.isEmpty()) {ContentValues v=new ContentValues();v.put("hidden",1);update(owner,a.clientId,v);}
        else throw new IllegalStateException("Primero cancela y sincroniza esta cita.");
    }
    private void update(long owner,String client,ContentValues v) {
        getWritableDatabase().update("appointments",v,"client_id=? AND owner=?",new String[]{client,Long.toString(owner)});
    }
}
