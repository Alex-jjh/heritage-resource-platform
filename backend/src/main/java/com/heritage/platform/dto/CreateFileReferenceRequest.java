package com.heritage.platform.dto;

import jakarta.validation.constraints.NotBlank;

public class CreateFileReferenceRequest {

    @NotBlank(message = "S3 key is required")
    private String s3Key;

    @NotBlank(message = "Original file name is required")
    private String originalFileName;

    private String contentType;
    private Long fileSize;

    public String getS3Key() { return s3Key; }
    public void setS3Key(String s3Key) { this.s3Key = s3Key; }
    public String getOriginalFileName() { return originalFileName; }
    public void setOriginalFileName(String originalFileName) { this.originalFileName = originalFileName; }
    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }
    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }
}
