package com.heritage.platform;

import com.heritage.platform.service.TaskAllocationService;
import com.heritage.platform.model.Resource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("local")
public class TaskAllocationTest {

    @Autowired
    private TaskAllocationService taskAllocationService;

    @Test
    public void testGetNextTask() {
        // Reviewer ID from seed data
        UUID reviewerId = UUID.fromString("a0000003-0000-0000-0000-000000000003");
        
        // Get next task
        Resource resource = taskAllocationService.getNextTask(reviewerId);
        
        // Verify
        assertNotNull(resource, "Should return a task");
        assertEquals("High Priority Heritage Site", resource.getTitle(), 
            "Should return highest priority task");
        System.out.println("✅ Test passed: Got task - " + resource.getTitle());
    }

    @Test
    public void testReleaseTask() {
        UUID reviewerId = UUID.fromString("a0000003-0000-0000-0000-000000000003");
        UUID resourceId = UUID.fromString("f0000001-0000-0000-0000-000000000001");
        
        // First lock the task
        Resource resource = taskAllocationService.lockTask(resourceId, reviewerId);
        assertNotNull(resource);
        
        // Then release it
        taskAllocationService.releaseTask(resourceId);
        
        System.out.println("✅ Test passed: Task released successfully");
    }
}
