package com.example.myapplication.logic;

import com.example.myapplication.model.CatalogItem;
import com.example.myapplication.model.ScheduleItem;

import java.util.regex.Pattern;

/** Reglas pequeñas del formulario. Se mantiene separada para poder probarla. */
public final class AppointmentValidator {
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private AppointmentValidator() {
    }

    public static String validate(String name, String email,
                                  CatalogItem service, CatalogItem professional,
                                  ScheduleItem schedule) {
        if (name == null || name.trim().isEmpty()) {
            return "Escribe el nombre del paciente.";
        }
        if (email == null || !EMAIL.matcher(email.trim()).matches()) {
            return "Escribe un correo válido.";
        }
        if (service == null) {
            return "Selecciona un servicio.";
        }
        if (professional == null) {
            return "Selecciona un profesional.";
        }
        if (schedule == null) {
            return "Selecciona un horario.";
        }
        return null;
    }
}
