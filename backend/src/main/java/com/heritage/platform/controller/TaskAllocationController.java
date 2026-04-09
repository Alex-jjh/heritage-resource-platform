package com.heritage.platform.controller;

import com.heritage.platform.dto.ResourceResponse;
import com.heritage.platform.model.Resource;
import com.heritage.platform.model.User;
import com.heritage.platform.service.TaskAllocationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/api/tasks")
public class TaskAllocationController {

    @Autowired
    private TaskAllocationService taskAllocationService;

    /**
     * Get next task from pool and lock it for current reviewer
     */
    @PostMapping("/next")
    @PreAuthorize("hasRole('REVIEWER')")
    public ResponseEntity<ResourceResponse> getNextTask(Principal principal) {
        UUID reviewerId = UUID.fromString(principal.getName());
        Resource resource = taskAllocationService.getNextTask(reviewerId);
        
        if (resource == null) {
            return ResponseEntity.noContent().build();
        }
        
        return ResponseEntity.ok(ResourceResponse.fromEntity(resource));
    }

    /**
     * Release a task back to the pool
     */
    @PostMapping("/{resourceId}/release")
    @PreAuthorize("hasRole('REVIEWER')")
    public ResponseEntity<Void> releaseTask(
            @PathVariable UUID resourceId,
            Principal principal) {
        taskAllocationService.releaseTask(resourceId);
        return ResponseEntity.ok().build();
    }
}
