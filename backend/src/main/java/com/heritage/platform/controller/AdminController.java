package com.heritage.platform.controller;

import com.heritage.platform.dto.ResourceResponse;
import com.heritage.platform.model.Resource;
import com.heritage.platform.service.AdminService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/resources")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
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
            Principal principal) {
        Resource resource = adminService.unpublishResource(id, principal.getName());
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
}
