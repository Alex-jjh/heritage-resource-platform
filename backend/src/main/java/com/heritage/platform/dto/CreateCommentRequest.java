package com.heritage.platform.dto;

import jakarta.validation.constraints.NotBlank;

public class CreateCommentRequest {

    @NotBlank(message = "Comment body must not be empty")
    private String body;

    private boolean anonymous = false;

    public CreateCommentRequest() {
    }

    public CreateCommentRequest(String body) {
        this.body = body;
        this.anonymous = false;
    }

    public CreateCommentRequest(String body, boolean anonymous) {
        this.body = body;
        this.anonymous = anonymous;
    }

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public boolean isAnonymous() {
        return anonymous;
    }

    public void setAnonymous(boolean anonymous) {
        this.anonymous = anonymous;
    }
}
