package com.heritage.platform.service;

import com.heritage.platform.dto.AuthResponse;
import com.heritage.platform.dto.LoginRequest;
import com.heritage.platform.dto.RegisterRequest;
import com.heritage.platform.exception.AuthenticationException;
import com.heritage.platform.exception.DuplicateEmailException;
import com.heritage.platform.model.User;
import com.heritage.platform.model.UserRole;
import com.heritage.platform.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link AuthService}.
 *
 * <p>Uses Mockito mocks for {@code UserRepository} while wiring real
 * {@code BCryptPasswordEncoder} and {@code JwtService} instances so that
 * password hashing and token generation are exercised end-to-end.
 *
 * <p>Key scenarios covered:
 * <ul>
 *   <li>Successful registration with correct role assignment and password hashing</li>
 *   <li>Duplicate-email rejection during registration</li>
 *   <li>Login with valid credentials, invalid password, non-existent user, and null password hash</li>
 *   <li>Logout no-op behaviour</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    private PasswordEncoder passwordEncoder;
    private JwtService jwtService;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder();
        jwtService = new JwtService(
                "test-secret-key-must-be-at-least-256-bits-long-for-hmac-sha256-algorithm!!",
                3600000L);
        authService = new AuthService(userRepository, passwordEncoder, jwtService);
    }

    // Verifies that new users default to REGISTERED_VIEWER and that the raw password is hashed
    @Test
    void register_createsUserWithRegisteredViewerRole() {
        RegisterRequest request = new RegisterRequest();
        request.setDisplayName("Test User");
        request.setEmail("test@example.com");
        request.setPassword("password123");

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.empty());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        when(userRepository.save(userCaptor.capture())).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });

        User result = authService.register(request);

        assertEquals(UserRole.REGISTERED_VIEWER, result.getRole());
        assertEquals("test@example.com", result.getEmail());
        assertEquals("Test User", result.getDisplayName());
        assertNotNull(result.getPasswordHash());
        assertTrue(passwordEncoder.matches("password123", result.getPasswordHash()));
        assertFalse(result.isContributorRequested());
    }

    @Test
    void register_withDuplicateEmail_throwsDuplicateEmailException() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("existing@example.com");
        request.setPassword("password123");
        request.setDisplayName("Dup User");

        when(userRepository.findByEmail("existing@example.com"))
                .thenReturn(Optional.of(new User()));

        assertThrows(DuplicateEmailException.class, () -> authService.register(request));
        verify(userRepository, never()).save(any());
    }

    @Test
    void login_withValidCredentials_returnsToken() {
        LoginRequest request = new LoginRequest();
        request.setEmail("user@example.com");
        request.setPassword("password123");

        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("user@example.com");
        user.setDisplayName("Test User");
        user.setRole(UserRole.REGISTERED_VIEWER);
        user.setPasswordHash(passwordEncoder.encode("password123"));

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));

        AuthResponse result = authService.login(request);

        assertNotNull(result.getAccessToken());
        assertTrue(result.getExpiresIn() > 0);
        // Verify the token is valid and contains correct claims
        assertTrue(jwtService.validateToken(result.getAccessToken()));
        assertEquals("user@example.com", jwtService.getEmailFromToken(result.getAccessToken()));
    }

    @Test
    void login_withInvalidPassword_throwsAuthenticationException() {
        LoginRequest request = new LoginRequest();
        request.setEmail("user@example.com");
        request.setPassword("wrong-password");

        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("user@example.com");
        user.setPasswordHash(passwordEncoder.encode("correct-password"));
        user.setRole(UserRole.REGISTERED_VIEWER);

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));

        assertThrows(AuthenticationException.class, () -> authService.login(request));
    }

    @Test
    void login_withNonExistentUser_throwsAuthenticationException() {
        LoginRequest request = new LoginRequest();
        request.setEmail("noone@example.com");
        request.setPassword("password123");

        when(userRepository.findByEmail("noone@example.com")).thenReturn(Optional.empty());

        assertThrows(AuthenticationException.class, () -> authService.login(request));
    }

    // Covers migrated users who don't yet have a local password set
    @Test
    void login_withNullPasswordHash_throwsAuthenticationException() {
        LoginRequest request = new LoginRequest();
        request.setEmail("user@example.com");
        request.setPassword("password123");

        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("user@example.com");
        user.setPasswordHash(null); // migrated user without password
        user.setRole(UserRole.REGISTERED_VIEWER);

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));

        assertThrows(AuthenticationException.class, () -> authService.login(request));
    }

    // JWT-based auth has no server-side session to invalidate
    @Test
    void logout_isNoOp() {
        // Should not throw
        authService.logout("some-access-token");
    }
}
