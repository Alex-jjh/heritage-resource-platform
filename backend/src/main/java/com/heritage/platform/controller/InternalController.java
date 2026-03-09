package com.heritage.platform.controller;

import com.heritage.platform.dto.MessageResponse;
import com.heritage.platform.dto.ThumbnailCallbackRequest;
import com.heritage.platform.exception.ResourceNotFoundException;
import com.heritage.platform.model.Resource;
import com.heritage.platform.repository.ResourceRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/internal")
public class InternalController {

    private final ResourceRepository resourceRepository;

    public InternalController(ResourceRepository resourceRepository) {
        this.resourceRepository = resourceRepository;
    }

    /**
     * Callback from Lambda thumbnail generator.
     * Updates the resource's thumbnailS3Key after thumbnail processing completes.
     */
    @PostMapping("/thumbnails")
    public ResponseEntity<MessageResponse> updateThumbnail(
            @Valid @RequestBody ThumbnailCallbackRequest request) {
        Resource resource = resourceRepository.findById(request.getResourceId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Resource not found: " + request.getResourceId()));

        resource.setThumbnailS3Key(request.getThumbnailS3Key());
        resourceRepository.save(resource);

        return ResponseEntity.ok(new MessageResponse("Thumbnail updated successfully"));
    }
}
