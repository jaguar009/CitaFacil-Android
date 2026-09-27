package com.example.myapplication.model;

/** Horario disponible para reservar una cita. */
public class ScheduleItem {
    private final long id;
    private final long professionalId;
    private final String date;
    private final String time;

    public ScheduleItem(long id, long professionalId, String date, String time) {
        this.id = id;
        this.professionalId = professionalId;
        this.date = date;
        this.time = time;
    }

    public long getId() {
        return id;
    }

    public long getProfessionalId() {
        return professionalId;
    }

    public String getDate() {
        return date;
    }

    public String getTime() {
        return time;
    }

    @Override
    public String toString() {
        return date + "  •  " + time;
    }
}
