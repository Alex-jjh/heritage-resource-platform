package com.heritage.platform.dto;

import jakarta.validation.constraints.NotBlank;

public class RejectResourceRequest {

    @NotBlank(message = "Feedback comments are required when rejecting a resource")
    private String comments;

    public RejectResourceRequest() {}

    public RejectResourceRequest(String comments) {
        this.comments = comments;
    }

    public String getComments() { return comments; }
    public void setComments(String comments) { this.comments = comments; }
}
