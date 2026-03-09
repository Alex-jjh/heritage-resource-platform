package com.heritage.platform.exception;

/**
 * Thrown when authentication fails. Uses a generic message to avoid
 * revealing whether the email or password was incorrect.
 */
public class AuthenticationException extends RuntimeException {
    public AuthenticationException() {
        super("Invalid email or password");
    }
}
