package com.heritage.platform.config;

import com.heritage.platform.service.JwtService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Unified security configuration using local JWT authentication.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtService jwtService;

    public SecurityConfig(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                // CORS preflight requests
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                // Public authentication endpoints
                .requestMatchers("/api/auth/register", "/api/auth/login").permitAll()
                .requestMatchers("/api/tasks/health").permitAll()
                .requestMatchers("/api/tasks/**").hasAnyRole("REVIEWER", "ADMINISTRATOR")
                // Public discovery endpoints
                .requestMatchers(HttpMethod.GET, "/api/stats/homepage").permitAll()
                .requestMatchers("/api/search/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/categories").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/tags").permitAll()
                // Public featured resource endpoints for homepage display
                .requestMatchers(HttpMethod.GET, "/api/resources/featured").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/resources/homepage-featured").permitAll()
                // Public contributor profile endpoint
                .requestMatchers(HttpMethod.GET, "/api/users/*/profile").permitAll()
                // Public file-serving URLs for images, avatars, thumbnails, and previews.
                // Actual uploads and file-management APIs remain protected under /api/files/**.
                .requestMatchers(HttpMethod.GET, "/files/**").permitAll()
                // API documentation
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
                // Administrator-only APIs
                .requestMatchers("/api/admin/**").hasRole("ADMINISTRATOR")
                .requestMatchers("/api/users/pending-contributors").hasRole("ADMINISTRATOR")
                .requestMatchers("/api/users/all").hasRole("ADMINISTRATOR")
                .requestMatchers(HttpMethod.PUT, "/api/users/*/role").hasRole("ADMINISTRATOR")
                .requestMatchers(HttpMethod.DELETE, "/api/users/*").hasRole("ADMINISTRATOR")
                .requestMatchers("/api/users/*/grant-contributor").hasRole("ADMINISTRATOR")
                .requestMatchers("/api/users/*/revoke-contributor").hasRole("ADMINISTRATOR")
                // Category and tag management
                .requestMatchers(HttpMethod.POST, "/api/categories").hasRole("ADMINISTRATOR")
                .requestMatchers(HttpMethod.PUT, "/api/categories/**").hasRole("ADMINISTRATOR")
                .requestMatchers(HttpMethod.DELETE, "/api/categories/**").hasRole("ADMINISTRATOR")
                .requestMatchers(HttpMethod.POST, "/api/tags").hasRole("ADMINISTRATOR")
                .requestMatchers(HttpMethod.PUT, "/api/tags/**").hasRole("ADMINISTRATOR")
                .requestMatchers(HttpMethod.DELETE, "/api/tags/**").hasRole("ADMINISTRATOR")
                // Review workflow
                .requestMatchers("/api/reviews/**").hasAnyRole("REVIEWER", "ADMINISTRATOR")
                // Resource authoring and contributor workflow
                .requestMatchers(HttpMethod.POST, "/api/resources").hasAnyRole("CONTRIBUTOR", "REVIEWER", "ADMINISTRATOR")
                .requestMatchers(HttpMethod.PUT, "/api/resources/**").hasAnyRole("CONTRIBUTOR", "REVIEWER", "ADMINISTRATOR")
                .requestMatchers(HttpMethod.DELETE, "/api/resources/**").hasAnyRole("CONTRIBUTOR", "REVIEWER", "ADMINISTRATOR")
                .requestMatchers(HttpMethod.POST, "/api/resources/*/submit").hasAnyRole("CONTRIBUTOR", "REVIEWER", "ADMINISTRATOR")
                .requestMatchers(HttpMethod.POST, "/api/resources/*/revise").hasAnyRole("CONTRIBUTOR", "REVIEWER", "ADMINISTRATOR")
                .requestMatchers(HttpMethod.POST, "/api/resources/*/apply-featured").hasAnyRole("CONTRIBUTOR", "REVIEWER", "ADMINISTRATOR")
                // File-management APIs must stay protected.
                // Public reading is handled by GET /files/** above, not by these mutation endpoints.
                .requestMatchers(HttpMethod.POST, "/api/files/**").hasAnyRole("CONTRIBUTOR", "REVIEWER", "ADMINISTRATOR")
                .requestMatchers(HttpMethod.PUT, "/api/files/**").hasAnyRole("CONTRIBUTOR", "REVIEWER", "ADMINISTRATOR")
                .requestMatchers(HttpMethod.DELETE, "/api/files/**").hasAnyRole("CONTRIBUTOR", "REVIEWER", "ADMINISTRATOR")
                // Everything else requires authentication
                .anyRequest().authenticated()
                )
                .addFilterBefore(new JwtAuthFilter(jwtService), UsernamePasswordAuthenticationFilter.class)
                .exceptionHandling(ex -> ex
                .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)));

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
