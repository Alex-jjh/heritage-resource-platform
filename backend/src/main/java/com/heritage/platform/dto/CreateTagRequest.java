package com.heritage.platform.dto;

import jakarta.validation.constraints.NotBlank;

public class CreateTagRequest {

    @NotBlank(message = "Name is required")
    private String name;

    public CreateTagRequest() {}

    public CreateTagRequest(String name) {
        this.name = name;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
