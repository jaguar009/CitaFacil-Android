package com.example.myapplication.ui;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
public class ScreenInsets {
    public static void apply(View root) {
        ViewCompat.setOnApplyWindowInsetsListener(root,(view,window)->{
            Insets bars=window.getInsets(WindowInsetsCompat.Type.systemBars()|WindowInsetsCompat.Type.ime());
            view.setPadding(bars.left,bars.top,bars.right,bars.bottom);
            return window;
        });
        ViewCompat.requestApplyInsets(root);
    }
}
