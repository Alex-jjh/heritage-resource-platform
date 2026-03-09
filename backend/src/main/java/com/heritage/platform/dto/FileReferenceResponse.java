package com.heritage.platform.dto;

import com.heritage.platform.model.FileReference;

import java.time.Instant;
import java.util.UUID;

public class FileReferenceResponse {

    private UUID id;
    private String s3Key;
    private String originalFileName;
    private String contentType;
    private Long fileSize;
    private Instant createdAt;

    public static FileReferenceResponse fromEntity(FileReference fr) {
        FileReferenceResponse resp = new FileReferenceResponse();
        resp.id = fr.getId();
        resp.s3Key = fr.getS3Key();
        resp.originalFileName = fr.getOriginalFileName();
        resp.contentType = fr.getContentType();
        resp.fileSize = fr.getFileSize();
        resp.createdAt = fr.getCreatedAt();
        return resp;
    }

    public UUID getId() { return id; }
    public String getS3Key() { return s3Key; }
    public String getOriginalFileName() { return originalFileName; }
    public String getContentType() { return contentType; }
    public Long getFileSize() { return fileSize; }
    public Instant getCreatedAt() { return createdAt; }
}
