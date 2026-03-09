package com.heritage.platform.exception;

/**
 * Thrown when S3 operations fail due to connectivity or service errors.
 */
public class S3ServiceException extends RuntimeException {
    public S3ServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}
