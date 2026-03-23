package com.heritage.platform.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.http.HttpStatus;

/**
 * Security configuration for the local profile.
 * Uses the same authorization rules as the production config but replaces
 * Cognito JWT validation with a LocalAuthFilter that accepts a dummy
 * Bearer token and reads the role from the X-Mock-User-Role header.
 */
@Configuration
@EnableWebSecurity
@Profile("local")
public class LocalSecurityConfig {

    @Value("${app.internal-api-key}")
    private String internalApiKey;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/register", "/api/auth/login").permitAll()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
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
            .addFilterBefore(new ApiKeyAuthFilter(internalApiKey), UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(new LocalAuthFilter(), UsernamePasswordAuthenticationFilter.class)
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)));
        return http.build();
    }
}
