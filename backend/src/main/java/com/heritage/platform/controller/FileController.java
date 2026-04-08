package com.heritage.platform.controller;

import com.heritage.platform.dto.FileReferenceResponse;
import com.heritage.platform.exception.FileSizeLimitExceededException;
import com.heritage.platform.model.FileReference;
import com.heritage.platform.service.FileService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
public class FileController {

    private final FileService fileService;
    
    // 100MB limit in bytes
    private static final long MAX_FILE_SIZE = 100L * 1024 * 1024;

    public FileController(FileService fileService) {
        this.fileService = fileService;
    }

    /**
     * Upload a file directly to the server (multipart).
     */
    @PostMapping("/{resourceId}/upload")
    public ResponseEntity<FileReferenceResponse> uploadFile(
            @PathVariable UUID resourceId,
            @RequestParam("file") MultipartFile file,
            Principal principal) throws IOException {
        // Check file size limit (100MB)
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new FileSizeLimitExceededException("File size exceeds 100MB");
        }
        
        FileReference fileRef = fileService.uploadFile(resourceId, file, principal.getName());
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
