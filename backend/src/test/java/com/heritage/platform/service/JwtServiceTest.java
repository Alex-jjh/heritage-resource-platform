package com.heritage.platform.service;

import com.heritage.platform.model.User;
import com.heritage.platform.model.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit tests for {@link JwtService}.
 *
 * <p>Pure unit tests — no Spring context is loaded. A real {@code JwtService}
 * instance is created directly with a test secret and expiration value.
 *
 * <p>Key scenarios covered:
 * <ul>
 *   <li>Token generation with correct claims (email, userId, role)</li>
 *   <li>Validation of valid, expired, tampered, null, empty, and random tokens</li>
 *   <li>Claim extraction helpers (email, role, userId)</li>
 *   <li>Expiration configuration accessor</li>
 * </ul>
 */
class JwtServiceTest {

    private static final String TEST_SECRET =
            "test-secret-key-must-be-at-least-256-bits-long-for-hmac-sha256-algorithm!!";
    private static final long TEST_EXPIRATION_MS = 3600000L;

    private JwtService jwtService;
    private User testUser;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(TEST_SECRET, TEST_EXPIRATION_MS);

        testUser = new User();
        testUser.setId(UUID.randomUUID());
        testUser.setEmail("user@example.com");
        testUser.setDisplayName("Test User");
        testUser.setRole(UserRole.CONTRIBUTOR);
    }

    @Test
    void generateToken_containsCorrectClaims() {
        String token = jwtService.generateToken(testUser);

        assertThat(token).isNotBlank();
        assertThat(jwtService.getEmailFromToken(token)).isEqualTo("user@example.com");
        assertThat(jwtService.getUserIdFromToken(token)).isEqualTo(testUser.getId());
        assertThat(jwtService.getRoleFromToken(token)).isEqualTo("CONTRIBUTOR");
    }

    @Test
    void validateToken_validToken_returnsTrue() {
        String token = jwtService.generateToken(testUser);

        assertThat(jwtService.validateToken(token)).isTrue();
    }

    @Test
    void validateToken_expiredToken_returnsFalse() throws InterruptedException {
        // Use a separate JwtService with 1ms expiration so the token expires immediately
        JwtService shortLivedService = new JwtService(TEST_SECRET, 1L);
        String token = shortLivedService.generateToken(testUser);

        Thread.sleep(50);

        assertThat(shortLivedService.validateToken(token)).isFalse();
    }

    @Test
    void validateToken_tamperedToken_returnsFalse() {
        String token = jwtService.generateToken(testUser);

        // Flip a character in the middle of the token to simulate tampering
        char[] chars = token.toCharArray();
        int mid = chars.length / 2;
        chars[mid] = (chars[mid] == 'a') ? 'b' : 'a';
        String tampered = new String(chars);

        assertThat(jwtService.validateToken(tampered)).isFalse();
    }

    @Test
    void validateToken_nullToken_returnsFalse() {
        assertThat(jwtService.validateToken(null)).isFalse();
    }

    @Test
    void validateToken_emptyToken_returnsFalse() {
        assertThat(jwtService.validateToken("")).isFalse();
    }

    @Test
    void validateToken_randomString_returnsFalse() {
        assertThat(jwtService.validateToken("not-a-jwt-token")).isFalse();
    }

    @Test
    void getEmailFromToken_returnsCorrectEmail() {
        String token = jwtService.generateToken(testUser);

        assertThat(jwtService.getEmailFromToken(token)).isEqualTo("user@example.com");
    }

    @Test
    void getRoleFromToken_returnsCorrectRole() {
        String token = jwtService.generateToken(testUser);

        assertThat(jwtService.getRoleFromToken(token)).isEqualTo("CONTRIBUTOR");
    }

    @Test
    void getUserIdFromToken_returnsCorrectId() {
        String token = jwtService.generateToken(testUser);

        assertThat(jwtService.getUserIdFromToken(token)).isEqualTo(testUser.getId());
    }

    @Test
    void getExpirationMs_returnsConfiguredValue() {
        assertThat(jwtService.getExpirationMs()).isEqualTo(TEST_EXPIRATION_MS);
    }
}
