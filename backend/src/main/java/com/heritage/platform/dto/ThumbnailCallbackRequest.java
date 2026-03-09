package com.heritage.platform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public class ThumbnailCallbackRequest {

    @NotNull
    private UUID resourceId;

    @NotBlank
    private String thumbnailS3Key;

    public ThumbnailCallbackRequest() {}

    public ThumbnailCallbackRequest(UUID resourceId, String thumbnailS3Key) {
        this.resourceId = resourceId;
        this.thumbnailS3Key = thumbnailS3Key;
    }

    public UUID getResourceId() { return resourceId; }
    public void setResourceId(UUID resourceId) { this.resourceId = resourceId; }
    public String getThumbnailS3Key() { return thumbnailS3Key; }
    public void setThumbnailS3Key(String thumbnailS3Key) { this.thumbnailS3Key = thumbnailS3Key; }
}
