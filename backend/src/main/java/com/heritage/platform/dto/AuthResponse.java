package com.heritage.platform.dto;

/**
 * Response returned on successful login containing a JWT access token.
 */
public class AuthResponse {

    private String accessToken;
    private int expiresIn;

    public AuthResponse() {}

    public AuthResponse(String accessToken, int expiresIn) {
        this.accessToken = accessToken;
        this.expiresIn = expiresIn;
    }

    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String accessToken) { this.accessToken = accessToken; }
    public int getExpiresIn() { return expiresIn; }
    public void setExpiresIn(int expiresIn) { this.expiresIn = expiresIn; }
}
