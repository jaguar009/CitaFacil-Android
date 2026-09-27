package com.example.myapplication.ui;

import android.content.Context;
import android.view.*;
import android.widget.*;
import com.example.myapplication.R;
import com.example.myapplication.model.AppointmentItem;
import java.util.List;

/** Lista personalizada: cada cita tiene datos, estado y acciones propias. */
public class AppointmentAdapter extends BaseAdapter {
    public interface Actions {void edit(AppointmentItem a);void cancel(AppointmentItem a);void delete(AppointmentItem a);}
    private final Context context;private final List<AppointmentItem> items;private final Actions actions;private final boolean enabled;
    public AppointmentAdapter(Context c,List<AppointmentItem> list,Actions actions,boolean enabled){context=c;items=list;this.actions=actions;this.enabled=enabled;}
    @Override public int getCount(){return items.size();}
    @Override public AppointmentItem getItem(int position){return items.get(position);}
    @Override public long getItemId(int position){return position;}
    @Override public View getView(int position,View convert,ViewGroup parent) {
        View row=convert==null?LayoutInflater.from(context).inflate(R.layout.item_appointment,parent,false):convert;
        AppointmentItem a=getItem(position);
        ((TextView)row.findViewById(R.id.rowService)).setText(a.service());
        ((TextView)row.findViewById(R.id.rowDate)).setText(a.date()+" · "+a.time());
        ((TextView)row.findViewById(R.id.rowProfessional)).setText(a.professional());
        ((TextView)row.findViewById(R.id.rowPatient)).setText("Paciente: "+a.patient());
        ((TextView)row.findViewById(R.id.rowStatus)).setText(a.displayStatus());
        TextView error=row.findViewById(R.id.rowError);error.setText(a.error);error.setVisibility(a.error.isEmpty()?View.GONE:View.VISIBLE);
        Button edit=row.findViewById(R.id.rowEdit),cancel=row.findViewById(R.id.rowCancel),delete=row.findViewById(R.id.rowDelete);
        edit.setVisibility(a.canEdit()?View.VISIBLE:View.GONE);
        cancel.setVisibility(!a.terminal()&&!a.action.equals("CANCEL")?View.VISIBLE:View.GONE);
        delete.setVisibility(a.canEdit()||(a.terminal()&&a.action.isEmpty())?View.VISIBLE:View.GONE);
        edit.setEnabled(enabled);cancel.setEnabled(enabled);delete.setEnabled(enabled);
        edit.setOnClickListener(v->actions.edit(a));cancel.setOnClickListener(v->actions.cancel(a));delete.setOnClickListener(v->actions.delete(a));
        return row;
    }
}
