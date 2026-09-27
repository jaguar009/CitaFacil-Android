package com.example.myapplication.model;

/** Elemento sencillo para mostrar un catálogo en un Spinner. */
public class CatalogItem {
    private final long id;
    private final String name;

    public CatalogItem(long id, String name) {
        this.id = id;
        this.name = name;
    }

    public long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    @Override
    public String toString() {
        return name;
    }
}
