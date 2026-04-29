package com.heritage.platform.controller;

import com.heritage.platform.dto.ResourceResponse;
import com.heritage.platform.model.Resource;
import com.heritage.platform.service.TaskAllocationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/api/tasks")
@Profile("!test")
public class TaskAllocationController {

    @Autowired
    private TaskAllocationService taskAllocationService;

    /**
     * Health check endpoint (no auth required)
     */
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Task allocation service is running");
    }

    /**
     * Get next task from pool and lock it for current reviewer
     */
    @PostMapping("/next")
    public ResponseEntity<ResourceResponse> getNextTask(Principal principal) {
        Resource resource = taskAllocationService.getNextTask(principal.getName());
        
        if (resource == null) {
            return ResponseEntity.noContent().build();
        }
        
        return ResponseEntity.ok(ResourceResponse.fromEntity(resource));
    }

    /**
     * Release a task back to the pool
     */
    @PostMapping("/{resourceId}/release")
    public ResponseEntity<Void> releaseTask(
            @PathVariable UUID resourceId,
            Principal principal) {
        taskAllocationService.releaseTask(resourceId, principal.getName());
        return ResponseEntity.ok().build();
    }
}
