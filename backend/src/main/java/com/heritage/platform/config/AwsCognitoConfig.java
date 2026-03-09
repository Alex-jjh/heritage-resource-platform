package com.heritage.platform.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Binds AWS Cognito configuration from application-*.yml.
 */
@Configuration
@ConfigurationProperties(prefix = "aws.cognito")
public class AwsCognitoConfig {

    private String userPoolId;
    private String clientId;
    private String region;

    public String getUserPoolId() { return userPoolId; }
    public void setUserPoolId(String userPoolId) { this.userPoolId = userPoolId; }
    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }
    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }
}
