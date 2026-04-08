package com.heritage.platform.controller;

import com.heritage.platform.dto.*;
import com.heritage.platform.exception.FileSizeLimitExceededException;
import com.heritage.platform.model.FileReference;
import com.heritage.platform.service.FileService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
public class FileController {

    private final FileService fileService;
    
    // 100MB in bytes
    private static final long MAX_FILE_SIZE = 100L * 1024 * 1024;

    public FileController(FileService fileService) {
        this.fileService = fileService;
    }

    /**
     * Generate a pre-signed PUT URL for uploading a file to S3.
     */
    @PostMapping("/upload-url")
    public ResponseEntity<UploadUrlResponse> generateUploadUrl(
            Principal principal,
            @Valid @RequestBody UploadUrlRequest request) {
        // Check file size limit (100MB)
        if (request.getFileSize() > MAX_FILE_SIZE) {
            throw new com.heritage.platform.exception.FileSizeLimitExceededException("文件大小超过 100MB");
        }
        
        String url = fileService.generateUploadUrl(
                request.getResourceId(),
                request.getFileName(),
                request.getContentType(),
                principal.getName());

        String s3Key = fileService.buildUploadKey(request.getResourceId(), request.getFileName());
        return ResponseEntity.ok(new UploadUrlResponse(url, s3Key, fileService.getUploadExpiryMinutes() * 60));
    }

    /**
     * Register a file reference on a resource after upload completes.
     */
    @PostMapping("/{resourceId}/references")
    public ResponseEntity<FileReferenceResponse> createFileReference(
            @PathVariable UUID resourceId,
            Principal principal,
            @Valid @RequestBody CreateFileReferenceRequest request) {
        FileReference fileRef = fileService.createFileReference(resourceId, request, principal.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(FileReferenceResponse.fromEntity(fileRef));
    }

    /**
     * Remove a file reference from a draft resource.
     */
    @DeleteMapping("/{resourceId}/references/{fileRefId}")
    public ResponseEntity<Void> deleteFileReference(
            @PathVariable UUID resourceId,
            @PathVariable UUID fileRefId,
            Principal principal) {
        fileService.deleteFileReference(resourceId, fileRefId, principal.getName());
        return ResponseEntity.noContent().build();
    }
}
