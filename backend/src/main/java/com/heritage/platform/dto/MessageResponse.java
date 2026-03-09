package com.heritage.platform.dto;

/**
 * Simple message response for operations that don't return data.
 */
public class MessageResponse {

    private String message;

    public MessageResponse() {}

    public MessageResponse(String message) {
        this.message = message;
    }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
