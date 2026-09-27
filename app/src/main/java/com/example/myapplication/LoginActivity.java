package com.example.myapplication;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.*;
import androidx.appcompat.app.AppCompatActivity;
import com.example.myapplication.data.SessionStore;
import com.example.myapplication.data.remote.ApiClient;
import com.example.myapplication.ui.ScreenInsets;
import org.json.JSONObject;
import java.util.concurrent.*;

public class LoginActivity extends AppCompatActivity {
    private boolean registering=false,busy=false;
    private final ExecutorService executor=Executors.newSingleThreadExecutor();
    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        if(new SessionStore(this).read()!=null){openHome();return;}
        setContentView(R.layout.activity_login);ScreenInsets.apply(findViewById(R.id.root));
        findViewById(R.id.authToggle).setOnClickListener(v->{
            if(busy)return;
            registering=!registering;
            findViewById(R.id.nameGroup).setVisibility(registering?View.VISIBLE:View.GONE);
            ((TextView)findViewById(R.id.authTitle)).setText(registering?"Crea tu cuenta":"Inicia sesión");
            ((Button)findViewById(R.id.authSubmit)).setText(registering?"Crear cuenta":"Ingresar");
            ((Button)findViewById(R.id.authToggle)).setText(registering?"Ya tengo una cuenta":"Crear una cuenta");
        });
        findViewById(R.id.authSubmit).setOnClickListener(v->authenticate());
    }
    private String value(int id){return ((EditText)findViewById(id)).getText().toString();}
    private void authenticate() {
        String email=value(R.id.authEmail).trim(),password=value(R.id.authPassword),name=value(R.id.authName).trim();
        TextView message=findViewById(R.id.authMessage);
        if(!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()){message.setText("Escribe un correo válido.");return;}
        if(password.length()<10){message.setText("La contraseña debe tener al menos 10 caracteres.");return;}
        if(registering && name.length()<2){message.setText("Escribe tu nombre completo.");return;}
        busy=true;findViewById(R.id.authSubmit).setEnabled(false);message.setText("Conectando…");
        final boolean create=registering;
        executor.execute(()->{
            try {
                JSONObject payload=new JSONObject().put("email",email).put("password",password).put("name",name);
                JSONObject result=new JSONObject(new ApiClient().request("POST","/api/auth/"+(create?"register":"login"),payload));
                new SessionStore(getApplicationContext()).save(result);
                runOnUiThread(()->{if(!isDestroyed())openHome();});
            }catch(Exception error){
                runOnUiThread(()->{if(!isDestroyed()){busy=false;findViewById(R.id.authSubmit).setEnabled(true);message.setText(error.getMessage());}});
            }
        });
    }
    private void openHome(){startActivity(new Intent(this,MainActivity.class));finish();}
    @Override protected void onDestroy(){executor.shutdown();super.onDestroy();}
}
