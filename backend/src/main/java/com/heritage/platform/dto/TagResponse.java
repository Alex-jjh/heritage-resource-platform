package com.heritage.platform.dto;

import com.heritage.platform.model.Tag;

import java.time.Instant;
import java.util.UUID;

public class TagResponse {

    private UUID id;
    private String name;
    private Instant createdAt;

    public TagResponse() {}

    public TagResponse(UUID id, String name, Instant createdAt) {
        this.id = id;
        this.name = name;
        this.createdAt = createdAt;
    }

    public static TagResponse fromEntity(Tag entity) {
        return new TagResponse(entity.getId(), entity.getName(), entity.getCreatedAt());
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public Instant getCreatedAt() { return createdAt; }
}
