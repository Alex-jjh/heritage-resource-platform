package com.heritage.platform.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.util.UUID;

@Component
public class TaskLockExpirationListener implements MessageListener {

    private static final String TASK_LOCK_PREFIX = "task:lock:";

    @Autowired
    private RedisMessageListenerContainer redisContainer;

    @Autowired
    private TaskAllocationService taskAllocationService;

    @PostConstruct
    public void init() {
        // Listen for expired key events
        redisContainer.addMessageListener(this, new PatternTopic("__keyevent@*:expired"));
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String expiredKey = message.toString();
        
        // Check if it's a task lock key
        if (expiredKey.startsWith(TASK_LOCK_PREFIX)) {
            String resourceIdStr = expiredKey.substring(TASK_LOCK_PREFIX.length());
            try {
                UUID resourceId = UUID.fromString(resourceIdStr);
                // Release the task back to pool
                taskAllocationService.releaseTask(resourceId);
            } catch (Exception e) {
                // Log error but don't throw
                System.err.println("Failed to release task on lock expiration: " + e.getMessage());
            }
        }
    }
}
