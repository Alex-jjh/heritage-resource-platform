package com.heritage.platform.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class TaskLockExpirationScheduler {
    private static final Logger log = LoggerFactory.getLogger(TaskLockExpirationScheduler.class);

    private final TaskAllocationService taskAllocationService;

    public TaskLockExpirationScheduler(TaskAllocationService taskAllocationService) {
        this.taskAllocationService = taskAllocationService;
    }

    /**
     * Check for expired locks every 1 minute
     * Releases tasks that have been locked for more than 30 minutes
     */
    @Scheduled(fixedRate = 60000) // Every 1 minute
    public void releaseExpiredLocks() {
        int releasedCount = taskAllocationService.releaseExpiredLocks();
        if (releasedCount > 0) {
            log.info("Released {} expired task locks", releasedCount);
        }
    }
}
