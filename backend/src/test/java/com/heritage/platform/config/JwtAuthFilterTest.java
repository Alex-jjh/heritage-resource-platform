package com.heritage.platform.config;

import com.heritage.platform.model.User;
import com.heritage.platform.model.UserRole;
import com.heritage.platform.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link JwtAuthFilter}.
 *
 * <p>Tests the filter in isolation using {@code MockHttpServletRequest},
 * {@code MockHttpServletResponse}, and a mock {@code FilterChain}. A real
 * {@code JwtService} is used (not mocked) so that token generation and
 * validation are exercised end-to-end.
 *
 * <p>Key scenarios covered:
 * <ul>
 *   <li>Valid Bearer token sets SecurityContext with correct principal and authority</li>
 *   <li>Invalid, missing, and non-Bearer tokens leave SecurityContext empty</li>
 *   <li>{@code shouldNotFilter} behaviour for public auth endpoints vs protected endpoints</li>
 * </ul>
 */
class JwtAuthFilterTest {

    private static final String TEST_SECRET =
            "test-secret-key-must-be-at-least-256-bits-long-for-hmac-sha256-algorithm!!";

    private JwtService jwtService;
    private JwtAuthFilter jwtAuthFilter;
    private FilterChain filterChain;
    private User testUser;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(TEST_SECRET, 3600000L);
        jwtAuthFilter = new JwtAuthFilter(jwtService);
        filterChain = mock(FilterChain.class);

        testUser = new User();
        testUser.setId(UUID.randomUUID());
        testUser.setEmail("user@example.com");
        testUser.setDisplayName("Test User");
        testUser.setRole(UserRole.CONTRIBUTOR);

        // Ensure a clean SecurityContext before each test
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void validToken_setsSecurityContext() throws ServletException, IOException {
        String token = jwtService.generateToken(testUser);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();

        jwtAuthFilter.doFilterInternal(request, response, filterChain);

        var auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        assertThat(auth.getPrincipal()).isEqualTo("user@example.com");
        assertThat(auth.getAuthorities())
                .extracting("authority")
                .containsExactly("ROLE_CONTRIBUTOR");

        verify(filterChain).doFilter(request, response);
    }

    @Test
    void invalidToken_doesNotSetSecurityContext() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer invalid-token-value");
        MockHttpServletResponse response = new MockHttpServletResponse();

        jwtAuthFilter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void noAuthorizationHeader_doesNotSetSecurityContext() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        jwtAuthFilter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void nonBearerAuthorizationHeader_doesNotSetSecurityContext() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Basic dXNlcjpwYXNz");
        MockHttpServletResponse response = new MockHttpServletResponse();

        jwtAuthFilter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void shouldNotFilter_registerEndpoint() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/auth/register");

        assertThat(jwtAuthFilter.shouldNotFilter(request)).isTrue();
    }

    @Test
    void shouldNotFilter_loginEndpoint() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/auth/login");

        assertThat(jwtAuthFilter.shouldNotFilter(request)).isTrue();
    }

    @Test
    void shouldNotFilter_otherEndpoints_returnsFalse() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/resources");

        assertThat(jwtAuthFilter.shouldNotFilter(request)).isFalse();
    }
}
