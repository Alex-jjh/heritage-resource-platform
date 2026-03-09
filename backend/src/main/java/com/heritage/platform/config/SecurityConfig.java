package com.heritage.platform.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Security configuration for dev/prod profiles.
 * Validates JWTs issued by AWS Cognito and maps the custom:role claim
 * to Spring Security granted authorities with the ROLE_ prefix.
 */
@Configuration
@EnableWebSecurity
@Profile("!local")
public class SecurityConfig {

    @Value("${app.internal-api-key}")
    private String internalApiKey;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/register", "/api/auth/login").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMINISTRATOR")
                .requestMatchers("/api/users/pending-contributors").hasRole("ADMINISTRATOR")
                .requestMatchers("/api/users/*/grant-contributor").hasRole("ADMINISTRATOR")
                .requestMatchers("/api/users/*/revoke-contributor").hasRole("ADMINISTRATOR")
                .requestMatchers("/api/reviews/**").hasAnyRole("REVIEWER", "ADMINISTRATOR")
                .requestMatchers(HttpMethod.POST, "/api/resources").hasRole("CONTRIBUTOR")
                .requestMatchers(HttpMethod.PUT, "/api/resources/**").hasRole("CONTRIBUTOR")
                .requestMatchers(HttpMethod.DELETE, "/api/resources/**").hasRole("CONTRIBUTOR")
                .requestMatchers("/api/resources/*/submit").hasRole("CONTRIBUTOR")
                .requestMatchers("/api/resources/*/revise").hasRole("CONTRIBUTOR")
                .requestMatchers("/api/files/upload-url").hasRole("CONTRIBUTOR")
                .requestMatchers("/api/files/**").hasRole("CONTRIBUTOR")
                .requestMatchers("/api/internal/**").hasRole("SYSTEM")
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())))
            .addFilterBefore(new ApiKeyAuthFilter(internalApiKey), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    /**
     * AWS Cognito stores the platform role in a custom claim "custom:role"
     * (e.g., "custom:role": "CONTRIBUTOR"). Spring Security's hasRole()
     * expects a "ROLE_" prefix. This converter bridges the two by reading
     * from the custom claim and adding the prefix automatically.
     */
    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter grantedAuthoritiesConverter = new JwtGrantedAuthoritiesConverter();
        grantedAuthoritiesConverter.setAuthoritiesClaimName("custom:role");
        grantedAuthoritiesConverter.setAuthorityPrefix("ROLE_");

        JwtAuthenticationConverter jwtAuthenticationConverter = new JwtAuthenticationConverter();
        jwtAuthenticationConverter.setJwtGrantedAuthoritiesConverter(grantedAuthoritiesConverter);
        return jwtAuthenticationConverter;
    }
}
