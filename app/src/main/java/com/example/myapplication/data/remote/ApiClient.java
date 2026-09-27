package com.example.myapplication.data.remote;

import org.json.JSONObject;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;

/** Cliente REST compartido. Todas sus llamadas se ejecutan fuera del hilo de la pantalla. */
public class ApiClient {
    public static final String BASE_URL = "https://citafacil.jaguar009.workers.dev";
    private String token = "";
    public void setToken(String value) { token = value == null ? "" : value; }

    public static class ApiException extends Exception {
        public final int status;
        public ApiException(int status, String message) { super(message); this.status = status; }
    }

    public String request(String method, String path, JSONObject body) throws Exception {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(BASE_URL + path).openConnection();
            connection.setRequestMethod(method);
            connection.setConnectTimeout(12000);
            connection.setReadTimeout(15000);
            connection.setRequestProperty("Accept", "application/json");
            if (!token.isEmpty()) connection.setRequestProperty("Authorization", "Bearer " + token);
            if (body != null) {
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                try (OutputStream output = connection.getOutputStream()) {
                    output.write(body.toString().getBytes(StandardCharsets.UTF_8));
                }
            }
            int code = connection.getResponseCode();
            InputStream input = code >= 400 ? connection.getErrorStream() : connection.getInputStream();
            StringBuilder result = new StringBuilder();
            if (input != null) try (BufferedReader reader = new BufferedReader(new InputStreamReader(input, StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) result.append(line);
            }
            if (code >= 400) {
                String message = "No se pudo completar la solicitud.";
                try { message = new JSONObject(result.toString()).optString("error", message); } catch (Exception ignored) {}
                throw new ApiException(code, message);
            }
            return result.toString();
        } catch (IOException error) {
            throw new ApiException(0, "Sin conexión. Tus cambios siguen guardados en el teléfono.");
        } finally {
            if (connection != null) connection.disconnect();
        }
    }
}
