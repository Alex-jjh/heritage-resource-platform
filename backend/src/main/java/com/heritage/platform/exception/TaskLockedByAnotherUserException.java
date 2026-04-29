package com.heritage.platform.exception;

public class TaskLockedByAnotherUserException extends RuntimeException {
    public TaskLockedByAnotherUserException(String message) {
        super(message);
    }
}
