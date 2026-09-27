package com.example.myapplication.logic;

import com.example.myapplication.model.CatalogItem;
import com.example.myapplication.model.ScheduleItem;

import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

public class AppointmentValidatorTest {
    private final CatalogItem service = new CatalogItem(1, "Medicina general");
    private final CatalogItem professional = new CatalogItem(1, "Dra. Ana Torres");
    private final ScheduleItem schedule = new ScheduleItem(1, 1, "2026-10-01", "09:00");

    @Test
    public void acceptsCompleteForm() {
        assertNull(AppointmentValidator.validate("Ana Pérez", "ana@email.com",
                service, professional, schedule));
    }

    @Test
    public void rejectsInvalidEmail() {
        assertEquals("Escribe un correo válido.", AppointmentValidator.validate(
                "Ana Pérez", "correo-invalido", service, professional, schedule));
    }
}
