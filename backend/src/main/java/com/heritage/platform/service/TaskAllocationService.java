package com.heritage.platform.service;

import com.heritage.platform.exception.AccessDeniedException;
import com.heritage.platform.exception.ResourceNotFoundException;
import com.heritage.platform.model.Resource;
import com.heritage.platform.model.ResourceStatus;
import com.heritage.platform.model.User;
import com.heritage.platform.repository.ResourceRepository;
import com.heritage.platform.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
public class TaskAllocationService {

    private static final long LOCK_TIMEOUT_MINUTES = 30;

    @Autowired
    private ResourceRepository resourceRepository;
    @Autowired
    private UserRepository userRepository;

    /**
     * Get next task from pool and lock it for the reviewer
     */
    @Transactional
    public Resource getNextTask(String reviewerEmail) {
        User reviewer = userRepository.findByEmail(reviewerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Find the highest priority pending task that is not locked
        Resource resource = resourceRepository
            .findFirstByStatusAndLockedByIsNullOrderByReviewPriorityDescCreatedAtAsc(
                ResourceStatus.PENDING_REVIEW
            );

        if (resource == null) {
            return null;
        }

        return lockTask(resource.getId(), reviewer.getId());
    }

    /**
     * Lock a task for a reviewer
     */
    @Transactional
    public Resource lockTask(UUID resourceId, UUID reviewerId) {
        Resource resource = resourceRepository.findById(resourceId)
            .orElseThrow(() -> new RuntimeException("Resource not found"));

        // Check if already locked
        if (resource.getLockedBy() != null && !resource.getLockedBy().getId().equals(reviewerId)) {
            throw new RuntimeException("Task is already locked by another reviewer");
        }

        // Update resource status
        User reviewer = userRepository.findById(reviewerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        resource.setStatus(ResourceStatus.IN_REVIEW);
        resource.setLockedBy(reviewer);
        resource.setLockedAt(Instant.now());
        
        return resourceRepository.save(resource);
    }

    /**
     * Release a task back to the pool
     */
    @Transactional
    public void releaseTask(UUID resourceId, String reviewerEmail) {
        Resource resource = resourceRepository.findById(resourceId)
            .orElseThrow(() -> new RuntimeException("Resource not found"));
        User reviewer = userRepository.findByEmail(reviewerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (resource.getLockedBy() != null && !resource.getLockedBy().getId().equals(reviewer.getId())) {
            throw new AccessDeniedException("You do not have permission to release this task");
        }

        // Reset lock fields
        resource.setLockedBy(null);
        resource.setLockedAt(null);
        resource.setStatus(ResourceStatus.PENDING_REVIEW);
        resourceRepository.save(resource);
    }

    /**
     * Get tasks assigned to a reviewer
     */
    @Transactional(readOnly = true)
    public List<Resource> getAssignedTasks(UUID reviewerId) {
        return resourceRepository.findByStatusAndLockedById(ResourceStatus.IN_REVIEW, reviewerId);
    }

    /**
     * Release expired locks (called by scheduled task)
     * Returns number of released tasks
     */
    @Transactional
    public int releaseExpiredLocks() {
        Instant cutoffTime = Instant.now().minus(LOCK_TIMEOUT_MINUTES, ChronoUnit.MINUTES);
        
        List<Resource> expiredTasks = resourceRepository
            .findByStatusAndLockedAtBefore(ResourceStatus.IN_REVIEW, cutoffTime);
        
        for (Resource resource : expiredTasks) {
            resource.setLockedBy(null);
            resource.setLockedAt(null);
            resource.setStatus(ResourceStatus.PENDING_REVIEW);
            resourceRepository.save(resource);
        }
        
        return expiredTasks.size();
    }
}
