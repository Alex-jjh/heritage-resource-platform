package com.heritage.platform.dto;

import java.time.Instant;
import java.util.Map;

/**
 * Standard error response with optional field-level validation errors.
 */
public class ErrorResponse {

    private int status;
    private String message;
    private Map<String, String> fieldErrors;
    private Instant timestamp;

    public ErrorResponse(int status, String message) {
        this.status = status;
        this.message = message;
        this.timestamp = Instant.now();
    }

    public ErrorResponse(int status, String message, Map<String, String> fieldErrors) {
        this(status, message);
        this.fieldErrors = fieldErrors;
    }

    public int getStatus() { return status; }
    public String getMessage() { return message; }
    public Map<String, String> getFieldErrors() { return fieldErrors; }
    public Instant getTimestamp() { return timestamp; }
}
