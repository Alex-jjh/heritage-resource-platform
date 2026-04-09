package com.heritage.platform.service;

import com.heritage.platform.model.Resource;
import com.heritage.platform.model.ResourceStatus;
import com.heritage.platform.model.User;
import com.heritage.platform.repository.ResourceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class TaskAllocationService {

    private static final String TASK_POOL_KEY = "task:pool";
    private static final String TASK_LOCK_PREFIX = "task:lock:";
    private static final long LOCK_TIMEOUT_MINUTES = 30;

    @Autowired
    private ResourceRepository resourceRepository;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    /**
     * Get next task from pool and lock it for the reviewer
     */
    @Transactional
    public Resource getNextTask(UUID reviewerId) {
        // Try to get task from Redis sorted set (priority-based)
        Object taskId = redisTemplate.opsForZSet().popMin(TASK_POOL_KEY);
        
        if (taskId == null) {
            // Fallback: query database for pending tasks
            return getNextTaskFromDatabase(reviewerId);
        }

        UUID resourceId = UUID.fromString(taskId.toString());
        return lockTask(resourceId, reviewerId);
    }

    /**
     * Fallback method to get task directly from database
     */
    private Resource getNextTaskFromDatabase(UUID reviewerId) {
        // Find the highest priority pending task that is not locked
        Resource resource = resourceRepository
            .findFirstByStatusAndLockedByIsNullOrderByReviewPriorityDescCreatedAtAsc(
                ResourceStatus.PENDING_REVIEW
            );

        if (resource == null) {
            return null;
        }

        return lockTask(resource.getId(), reviewerId);
    }

    /**
     * Lock a task for a reviewer
     */
    @Transactional
    public Resource lockTask(UUID resourceId, UUID reviewerId) {
        Resource resource = resourceRepository.findById(resourceId)
            .orElseThrow(() -> new RuntimeException("Resource not found"));

        // Check if already locked
        if (resource.getLockedBy() != null) {
            throw new RuntimeException("Task is already locked by another reviewer");
        }

        // Update resource status
        resource.setStatus(ResourceStatus.IN_REVIEW);
        resource.setLockedBy(new User() {{ setId(reviewerId); }});
        resource.setLockedAt(Instant.now());
        resourceRepository.save(resource);

        // Create Redis lock with TTL
        String lockKey = TASK_LOCK_PREFIX + resourceId;
        redisTemplate.opsForValue().set(lockKey, reviewerId.toString(), 
            LOCK_TIMEOUT_MINUTES, TimeUnit.MINUTES);

        return resource;
    }

    /**
     * Release a task back to the pool
     */
    @Transactional
    public void releaseTask(UUID resourceId) {
        Resource resource = resourceRepository.findById(resourceId)
            .orElseThrow(() -> new RuntimeException("Resource not found"));

        // Reset lock fields
        resource.setLockedBy(null);
        resource.setLockedAt(null);
        resource.setStatus(ResourceStatus.PENDING_REVIEW);
        resourceRepository.save(resource);

        // Remove Redis lock
        String lockKey = TASK_LOCK_PREFIX + resourceId;
        redisTemplate.delete(lockKey);

        // Add back to task pool
        redisTemplate.opsForZSet().add(TASK_POOL_KEY, resourceId.toString(), 
            calculatePriorityScore(resource));
    }

    /**
     * Add a new task to the pool
     */
    public void addTaskToPool(UUID resourceId, int priority) {
        double score = System.currentTimeMillis() - (priority * 1000000L);
        redisTemplate.opsForZSet().add(TASK_POOL_KEY, resourceId.toString(), score);
    }

    /**
     * Calculate priority score for Redis sorted set
     * Higher priority = lower score (processed first)
     */
    private double calculatePriorityScore(Resource resource) {
        long baseTime = resource.getCreatedAt() != null ? 
            resource.getCreatedAt().toEpochMilli() : System.currentTimeMillis();
        int priority = resource.getReviewPriority() != null ? 
            resource.getReviewPriority() : 0;
        return baseTime - (priority * 1000000L);
    }
}
