package com.heritage.platform.dto;

/**
 * Response returned on successful login containing Cognito tokens.
 */
public class AuthResponse {

    private String accessToken;
    private String idToken;
    private String refreshToken;
    private int expiresIn;

    public AuthResponse() {}

    public AuthResponse(String accessToken, String idToken, String refreshToken, int expiresIn) {
        this.accessToken = accessToken;
        this.idToken = idToken;
        this.refreshToken = refreshToken;
        this.expiresIn = expiresIn;
    }

    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String accessToken) { this.accessToken = accessToken; }
    public String getIdToken() { return idToken; }
    public void setIdToken(String idToken) { this.idToken = idToken; }
    public String getRefreshToken() { return refreshToken; }
    public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }
    public int getExpiresIn() { return expiresIn; }
    public void setExpiresIn(int expiresIn) { this.expiresIn = expiresIn; }
}
