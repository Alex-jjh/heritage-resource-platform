package com.heritage.platform.controller;

import com.heritage.platform.dto.MessageResponse;
import com.heritage.platform.dto.ResourceResponse;
import com.heritage.platform.model.Resource;
import com.heritage.platform.service.AdminService;
import com.heritage.platform.service.ResourceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/resources")
public class AdminController {

    private final AdminService adminService;
    private final ResourceService resourceService;

    public AdminController(AdminService adminService, ResourceService resourceService) {
        this.adminService = adminService;
        this.resourceService = resourceService;
    }

    @PostMapping("/{id}/archive")
    public ResponseEntity<ResourceResponse> archiveResource(
            @PathVariable UUID id,
            Principal principal) {
        Resource resource = adminService.archiveResource(id, principal.getName());
        return ResponseEntity.ok(ResourceResponse.fromEntity(resource));
    }

    @PostMapping("/{id}/unpublish")
    public ResponseEntity<ResourceResponse> unpublishResource(
            @PathVariable UUID id,
            Principal principal,
            @RequestBody(required = false) java.util.Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        Resource resource = adminService.unpublishResource(id, principal.getName(), reason);
        return ResponseEntity.ok(ResourceResponse.fromEntity(resource));
    }

    @PostMapping("/{id}/restore")
    public ResponseEntity<ResourceResponse> restoreResource(
            @PathVariable UUID id,
            Principal principal) {
        Resource resource = adminService.restoreResource(id, principal.getName());
        return ResponseEntity.ok(ResourceResponse.fromEntity(resource));
    }

    @GetMapping("/archived")
    public ResponseEntity<List<ResourceResponse>> getArchivedResources() {
        List<ResourceResponse> archived = adminService.getArchivedResources()
                .stream()
                .map(ResourceResponse::fromEntity)
                .toList();
        return ResponseEntity.ok(archived);
    }

    @GetMapping("/featured-applications")
    public ResponseEntity<List<ResourceResponse>> getFeaturedApplications(Principal principal) {
        List<ResourceResponse> pending = resourceService.getPendingFeaturedApplications(principal.getName())
                .stream()
                .map(ResourceResponse::fromEntity)
                .toList();
        return ResponseEntity.ok(pending);
    }

    @PostMapping("/{id}/approve-featured")
    public ResponseEntity<MessageResponse> approveFeatured(
            @PathVariable UUID id,
            @RequestParam boolean approved,
            Principal principal) {
        resourceService.approveFeatured(id, approved, principal.getName());
        String message = approved
                ? "Featured application approved"
                : "Featured application rejected";
        return ResponseEntity.ok(new MessageResponse(message));
    }

    @PostMapping("/{id}/feature")
    public ResponseEntity<MessageResponse> featureResource(
            @PathVariable UUID id,
            Principal principal) {
        resourceService.featureResource(id, principal.getName());
        return ResponseEntity.ok(new MessageResponse("Resource marked as featured"));
    }

    @PostMapping("/{id}/unfeature")
    public ResponseEntity<MessageResponse> unfeatureResource(
            @PathVariable UUID id,
            Principal principal) {
        resourceService.unfeatureResource(id, principal.getName());
        return ResponseEntity.ok(new MessageResponse("Resource removed from featured"));
    }
}