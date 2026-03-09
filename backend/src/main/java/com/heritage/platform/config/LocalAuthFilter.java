package com.heritage.platform.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Mock authentication filter for the local profile.
 * Accepts a dummy Bearer token ("local-dev-token") and reads the user role
 * from the X-Mock-User-Role header, enabling Postman/local API testing
 * without a running Cognito instance.
 */
public class LocalAuthFilter extends OncePerRequestFilter {

    private static final String DUMMY_TOKEN = "local-dev-token";
    private static final String DEFAULT_ROLE = "REGISTERED_VIEWER";
    private static final String DEFAULT_USER_ID = "local-user";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.equals("Bearer " + DUMMY_TOKEN)) {
            String role = request.getHeader("X-Mock-User-Role");
            if (role == null || role.isBlank()) {
                role = DEFAULT_ROLE;
            }

            String userId = request.getHeader("X-Mock-User-Id");
            if (userId == null || userId.isBlank()) {
                userId = DEFAULT_USER_ID;
            }

            SimpleGrantedAuthority authority = new SimpleGrantedAuthority("ROLE_" + role);
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(userId, null, List.of(authority));

            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }
}
