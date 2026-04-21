package com.heritage.platform.controller;

import com.heritage.platform.dto.CreateResourceRequest;
import com.heritage.platform.dto.ResourceResponse;
import com.heritage.platform.dto.UpdateResourceRequest;
import com.heritage.platform.model.Resource;
import com.heritage.platform.model.ResourceStatus;
import com.heritage.platform.service.FileService;
import com.heritage.platform.service.ResourceService;
import com.heritage.platform.dto.MessageResponse;
import com.heritage.platform.repository.ResourceRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/resources")
public class ResourceController {

    private final ResourceService resourceService;
    private final FileService fileService;
    private final ResourceRepository resourceRepository;

    public ResourceController(ResourceService resourceService, FileService fileService, ResourceRepository resourceRepository) {
        this.resourceService = resourceService;
        this.fileService = fileService;
        this.resourceRepository = resourceRepository;
    }

    @PostMapping
    public ResponseEntity<ResourceResponse> create(
            Principal principal,
            @Valid @RequestBody CreateResourceRequest request) {
        Resource resource = resourceService.createResource(principal.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ResourceResponse.fromEntity(resource));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResourceResponse> getById(
            @PathVariable UUID id,
            Principal principal) {
        Resource resource = resourceService.getResourceById(id, principal.getName());

        // Generate pre-signed download URLs for file attachments on approved resources
        if (resource.getStatus() == ResourceStatus.APPROVED
                && resource.getFileReferences() != null
                && !resource.getFileReferences().isEmpty()) {
            return ResponseEntity.ok(
                    ResourceResponse.fromEntityWithFileUrls(resource, fileService::generateDownloadUrl));
        }

        return ResponseEntity.ok(ResourceResponse.fromEntity(resource));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResourceResponse> update(
            @PathVariable UUID id,
            Principal principal,
            @Valid @RequestBody UpdateResourceRequest request) {
        Resource resource = resourceService.updateResource(id, principal.getName(), request);
        return ResponseEntity.ok(ResourceResponse.fromEntity(resource));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            Principal principal) {
        resourceService.deleteResource(id, principal.getName());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<ResourceResponse> submitForReview(
            @PathVariable UUID id,
            Principal principal) {
        Resource resource = resourceService.submitForReview(id, principal.getName());
        return ResponseEntity.ok(ResourceResponse.fromEntity(resource));
    }

    @PostMapping("/{id}/revise")
    public ResponseEntity<ResourceResponse> revise(
            @PathVariable UUID id,
            Principal principal) {
        Resource resource = resourceService.revise(id, principal.getName());
        return ResponseEntity.ok(ResourceResponse.fromEntity(resource));
    }

    @GetMapping("/mine")
    public ResponseEntity<List<ResourceResponse>> listMine(Principal principal) {
        List<ResourceResponse> resources = resourceService.listContributorResources(principal.getName())
                .stream()
                .map(ResourceResponse::fromEntity)
                .toList();
        return ResponseEntity.ok(resources);
    }

    @GetMapping("/featured")
    public ResponseEntity<List<ResourceResponse>> getFeaturedResources() {
        List<ResourceResponse> featured = resourceRepository.findByIsFeaturedTrueOrderByCreatedAtDesc()
                .stream()
                .map(ResourceResponse::fromEntity)
                .toList();
        return ResponseEntity.ok(featured);
    }

    @PostMapping("/{id}/apply-featured")
    public ResponseEntity<MessageResponse> applyFeatured(
            @PathVariable UUID id,
            Principal principal) {
        resourceService.applyForFeatured(id, principal.getName());
        return ResponseEntity.ok(new MessageResponse("Featured application submitted"));
    }

    @PostMapping("/{id}/approve-featured")
    public ResponseEntity<MessageResponse> approveFeatured(
            @PathVariable UUID id,
            @RequestParam boolean approved) {
        resourceService.approveFeatured(id, approved);
        String msg = approved ? "Resource is now featured" : "Featured application rejected";
        return ResponseEntity.ok(new MessageResponse(msg));
    }

}
