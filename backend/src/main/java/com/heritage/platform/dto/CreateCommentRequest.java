package com.heritage.platform.dto;

import jakarta.validation.constraints.NotBlank;

public class CreateCommentRequest {

    @NotBlank(message = "Comment body must not be empty")
    private String body;

    public CreateCommentRequest() {}

    public CreateCommentRequest(String body) {
        this.body = body;
    }

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
}
