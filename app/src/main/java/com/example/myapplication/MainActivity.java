package com.example.myapplication;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.text.*;
import android.view.View;
import android.widget.*;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.app.AlertDialog;
import com.example.myapplication.data.SessionStore;
import com.example.myapplication.data.local.DatabaseHelper;
import com.example.myapplication.data.remote.ApiClient;
import com.example.myapplication.logic.SyncManager;
import com.example.myapplication.model.*;
import com.example.myapplication.ui.*;
import org.json.JSONObject;
import java.util.*;
import java.util.concurrent.*;

/** Presentación: SQLite conserva las solicitudes y SyncManager las envía por REST. */
public class MainActivity extends AppCompatActivity implements AppointmentAdapter.Actions {
    private DatabaseHelper db;
    private ApiClient api;
    private SessionStore store;
    private long owner;
    private String userName, editingId;
    private AppointmentItem editing;
    private boolean busy;
    private Spinner services, professionals, schedules;
    private EditText name, search;
    private TextView status;
    private final ExecutorService executor=Executors.newSingleThreadExecutor();

    @Override protected void onCreate(Bundle state){
        super.onCreate(state);
        store=new SessionStore(this);
        JSONObject session=store.read(),user=session==null?null:session.optJSONObject("user");
        if(user==null){store.clear();openLogin();return;}
        owner=user.optLong("id");userName=user.optString("name");
        db=new DatabaseHelper(this);api=new ApiClient();api.setToken(session.optString("token"));
        setContentView(R.layout.activity_main);ScreenInsets.apply(findViewById(R.id.root));
        services=findViewById(R.id.serviceSpinner);professionals=findViewById(R.id.professionalSpinner);
        schedules=findViewById(R.id.scheduleSpinner);name=findViewById(R.id.nameInput);
        search=findViewById(R.id.searchInput);status=findViewById(R.id.syncStatusText);name.setText(userName);
        ((TextView)findViewById(R.id.greeting)).setText("Hola, "+userName);
        ((TextView)findViewById(R.id.profileName)).setText(userName);
        ((TextView)findViewById(R.id.profileEmail)).setText(user.optString("email"));
        ((TextView)findViewById(R.id.profileRole)).setText("Cuenta: "+user.optString("kind","PACIENTE"));
        services.setOnItemSelectedListener(new Selection(){public void selected(){loadProfessionals();}});
        professionals.setOnItemSelectedListener(new Selection(){public void selected(){loadSchedules();}});
        findViewById(R.id.reserveButton).setOnClickListener(v->save());
        findViewById(R.id.discardEdit).setOnClickListener(v->resetEditor());
        findViewById(R.id.syncButton).setOnClickListener(v->sync());
        findViewById(R.id.tabReserve).setOnClickListener(v->tab(0));
        findViewById(R.id.tabList).setOnClickListener(v->tab(1));
        findViewById(R.id.tabProfile).setOnClickListener(v->tab(2));
        findViewById(R.id.portalButton).setVisibility(user.optString("kind").equals("ADMIN")?View.VISIBLE:View.GONE);
        findViewById(R.id.portalButton).setOnClickListener(v->startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(ApiClient.BASE_URL+"/admin.html"))));
        findViewById(R.id.logoutButton).setOnClickListener(v->logout());
        search.addTextChangedListener(new TextWatcher(){
            public void beforeTextChanged(CharSequence s,int start,int count,int after){}
            public void onTextChanged(CharSequence s,int start,int before,int count){refresh();}
            public void afterTextChanged(Editable s){}
        });
        loadServices();refresh();sync();
    }
    private void tab(int index){
        int[] panels={R.id.reservePanel,R.id.listPanel,R.id.profilePanel};
        int[] buttons={R.id.tabReserve,R.id.tabList,R.id.tabProfile};
        for(int i=0;i<3;i++){findViewById(panels[i]).setVisibility(i==index?View.VISIBLE:View.GONE);findViewById(buttons[i]).setAlpha(i==index?1f:.55f);}
        if(index==1)refresh();
    }
    private void items(Spinner spinner,List<?> list){
        ArrayAdapter<Object> adapter=new ArrayAdapter<>(this,android.R.layout.simple_spinner_item,new ArrayList<>(list));
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);spinner.setAdapter(adapter);
    }
    private void select(Spinner spinner,long id){
        for(int i=0;i<spinner.getCount();i++){
            Object item=spinner.getItemAtPosition(i);
            long value=item instanceof CatalogItem?((CatalogItem)item).getId():((ScheduleItem)item).getId();
            if(value==id){spinner.setSelection(i);return;}
        }
    }
    private void loadServices(){
        items(services,db.getServices());
        if(editing!=null)select(services,editing.data.optLong("service_id"));
        loadProfessionals();
    }
    private void loadProfessionals(){
        CatalogItem item=(CatalogItem)services.getSelectedItem();
        items(professionals,item==null?Collections.emptyList():db.getProfessionals(item.getId()));
        if(editing!=null)select(professionals,editing.data.optLong("professional_id"));
        loadSchedules();
    }
    private void loadSchedules(){
        CatalogItem item=(CatalogItem)professionals.getSelectedItem();
        List<ScheduleItem> list=item==null?Collections.emptyList():db.getSchedules(item.getId(),owner,editingId);
        items(schedules,list);if(editing!=null)select(schedules,editing.scheduleId());
        ((TextView)findViewById(R.id.availabilityText)).setText(list.isEmpty()?
            "No hay horarios. Pulsa Actualizar o elige otro profesional.":
            "Hora de Lima · Disponibilidad sujeta a sincronización.");
    }
    private void save(){
        if(busy)return;
        String patient=name.getText().toString().trim();
        CatalogItem service=(CatalogItem)services.getSelectedItem(),professional=(CatalogItem)professionals.getSelectedItem();
        ScheduleItem schedule=(ScheduleItem)schedules.getSelectedItem();
        if(patient.length()<2||patient.length()>120){name.setError("Escribe un nombre de 2 a 120 caracteres.");return;}
        if(service==null||professional==null||schedule==null){toast("Elige un servicio, profesional y horario disponible.");return;}
        try{
            db.saveDraft(owner,editingId,patient,service,professional,schedule);
            resetEditor();refresh();tab(1);status.setText("Guardado en el teléfono. Pulsa Actualizar para enviar.");
        }catch(Exception e){toast(e.getMessage());}
    }
    private void resetEditor(){
        editing=null;editingId=null;name.setText(userName);
        ((Button)findViewById(R.id.reserveButton)).setText("Guardar solicitud");
        findViewById(R.id.discardEdit).setVisibility(View.GONE);loadSchedules();
    }
    private void refresh(){
        List<AppointmentItem> list=db.getAppointments(owner,search.getText().toString());
        ((ListView)findViewById(R.id.appointmentsList)).setAdapter(new AppointmentAdapter(this,list,this,!busy));
        findViewById(R.id.emptyText).setVisibility(list.isEmpty()?View.VISIBLE:View.GONE);
    }
    @Override public void edit(AppointmentItem a){
        if(busy)return;editing=a;editingId=a.clientId;name.setText(a.patient());
        ((Button)findViewById(R.id.reserveButton)).setText("Guardar cambios");
        findViewById(R.id.discardEdit).setVisibility(View.VISIBLE);loadServices();tab(0);
    }
    @Override public void cancel(AppointmentItem a){
        if(busy)return;
        new AlertDialog.Builder(this).setTitle("Cancelar cita")
            .setMessage("Se guardará la cancelación. Pulsa Actualizar para enviarla.")
            .setNegativeButton("Volver",null).setPositiveButton("Cancelar cita",(d,w)->{
                try{db.requestCancel(owner,a);refresh();status.setText("Cancelación pendiente de sincronizar.");}
                catch(Exception e){toast(e.getMessage());}
            }).show();
    }
    @Override public void delete(AppointmentItem a){
        if(busy)return;
        new AlertDialog.Builder(this).setTitle(a.canEdit()?"Eliminar borrador":"Quitar del teléfono")
            .setMessage(a.canEdit()?"Este borrador no se ha enviado. ¿Eliminarlo?":"El historial del servidor se conserva.")
            .setNegativeButton("Volver",null).setPositiveButton("Eliminar",(d,w)->{
                try{db.deleteLocal(owner,a);refresh();loadSchedules();}catch(Exception e){toast(e.getMessage());}
            }).show();
    }
    private void busy(boolean value){
        busy=value;findViewById(R.id.syncButton).setEnabled(!value);
        findViewById(R.id.reserveButton).setEnabled(!value);
        findViewById(R.id.logoutButton).setEnabled(!value);refresh();
    }
    private void sync(){
        if(busy)return;
        if(editingId!=null){toast("Guarda tus cambios o vuelve sin editar antes de actualizar.");return;}
        busy(true);status.setText("Actualizando agenda…");
        executor.execute(()->{
            try{
                String result=SyncManager.synchronize(db,api,owner);
                runOnUiThread(()->{if(!isDestroyed()){busy(false);status.setText(result);loadServices();}});
            }catch(Exception e){
                runOnUiThread(()->{
                    if(isDestroyed())return;busy(false);
                    if(e instanceof ApiClient.ApiException && ((ApiClient.ApiException)e).status==401){
                        store.clear();toast("Tu sesión venció. Ingresa nuevamente.");openLogin();
                    }else status.setText("No se pudo actualizar: "+e.getMessage()+". Tus solicitudes siguen guardadas.");
                });
            }
        });
    }
    private void logout(){
        if(busy)return;busy(true);
        executor.execute(()->{
            try{api.request("POST","/api/auth/logout",new JSONObject());}catch(Exception ignored){}
            store.clear();runOnUiThread(()->{if(!isDestroyed())openLogin();});
        });
    }
    private void openLogin(){startActivity(new Intent(this,LoginActivity.class));finish();}
    private void toast(String message){Toast.makeText(this,message,Toast.LENGTH_LONG).show();}
    @Override protected void onDestroy(){
        if(db!=null)executor.execute(()->db.close());
        executor.shutdown();super.onDestroy();
    }
    private abstract static class Selection implements AdapterView.OnItemSelectedListener{
        public abstract void selected();
        public void onItemSelected(AdapterView<?> parent,View view,int position,long id){selected();}
        public void onNothingSelected(AdapterView<?> parent){}
    }
}
