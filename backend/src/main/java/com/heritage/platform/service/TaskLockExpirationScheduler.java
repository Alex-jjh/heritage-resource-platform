package com.heritage.platform.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class TaskLockExpirationScheduler {

    @Autowired
    private TaskAllocationService taskAllocationService;

    /**
     * Check for expired locks every 1 minute
     * Releases tasks that have been locked for more than 30 minutes
     */
    @Scheduled(fixedRate = 60000) // Every 1 minute
    public void releaseExpiredLocks() {
        int releasedCount = taskAllocationService.releaseExpiredLocks();
        if (releasedCount > 0) {
            System.out.println("Released " + releasedCount + " expired task locks");
        }
    }
}
