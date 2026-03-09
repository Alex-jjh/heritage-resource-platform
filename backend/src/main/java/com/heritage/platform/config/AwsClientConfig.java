package com.heritage.platform.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;

@Configuration
public class AwsClientConfig {

    private final AwsCognitoConfig cognitoConfig;

    public AwsClientConfig(AwsCognitoConfig cognitoConfig) {
        this.cognitoConfig = cognitoConfig;
    }

    @Bean
    public CognitoIdentityProviderClient cognitoIdentityProviderClient() {
        String region = cognitoConfig.getRegion();
        var builder = CognitoIdentityProviderClient.builder();
        if (region != null && !region.isBlank()) {
            builder.region(Region.of(region));
        }
        return builder.build();
    }
}
