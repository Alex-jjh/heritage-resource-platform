package com.heritage.platform.dto;

import com.heritage.platform.model.Category;

import java.time.Instant;
import java.util.UUID;

public class CategoryResponse {

    private UUID id;
    private String name;
    private Instant createdAt;

    public CategoryResponse() {}

    public CategoryResponse(UUID id, String name, Instant createdAt) {
        this.id = id;
        this.name = name;
        this.createdAt = createdAt;
    }

    public static CategoryResponse fromEntity(Category entity) {
        return new CategoryResponse(entity.getId(), entity.getName(), entity.getCreatedAt());
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public Instant getCreatedAt() { return createdAt; }
}
