package com.heritage.platform.service;

import com.heritage.platform.dto.UpdateProfileRequest;
import com.heritage.platform.exception.ResourceNotFoundException;
import com.heritage.platform.model.User;
import com.heritage.platform.model.UserRole;
import com.heritage.platform.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link UserService}.
 *
 * <p>Uses Mockito mocks for {@code UserRepository}. Covers user profile
 * management and the contributor-request lifecycle.
 *
 * <p>Key scenarios covered:
 * <ul>
 *   <li>Lookup by email (success and not-found)</li>
 *   <li>Profile display-name update</li>
 *   <li>Pending contributor request listing</li>
 *   <li>Granting and revoking contributor status (role changes and flag resets)</li>
 *   <li>User-not-found error handling</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository);
    }

    private User createTestUser(UUID id, String email, UserRole role) {
        User user = new User();
        user.setId(id);
        user.setEmail(email);
        user.setDisplayName("Test User");
        user.setRole(role);
        user.setContributorRequested(false);
        return user;
    }

    @Test
    void getUserByEmail_returnsUser() {
        User user = createTestUser(UUID.randomUUID(), "user@example.com", UserRole.REGISTERED_VIEWER);
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));

        User result = userService.getUserByEmail("user@example.com");
        assertEquals("user@example.com", result.getEmail());
    }

    @Test
    void getUserByEmail_notFound_throwsException() {
        when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> userService.getUserByEmail("unknown@example.com"));
    }

    @Test
    void updateProfile_updatesDisplayName() {
        User user = createTestUser(UUID.randomUUID(), "user@example.com", UserRole.REGISTERED_VIEWER);
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setDisplayName("New Name");

        User result = userService.updateProfile("user@example.com", request);
        assertEquals("New Name", result.getDisplayName());
    }

    @Test
    void getPendingContributorRequests_returnsOnlyPendingViewers() {
        User pending = createTestUser(UUID.randomUUID(), "pending@example.com", UserRole.REGISTERED_VIEWER);
        pending.setContributorRequested(true);

        when(userRepository.findByRoleAndContributorRequestedTrue(UserRole.REGISTERED_VIEWER))
                .thenReturn(List.of(pending));

        List<User> result = userService.getPendingContributorRequests();
        assertEquals(1, result.size());
        assertTrue(result.get(0).isContributorRequested());
    }

    // Granting contributor status promotes the role and clears the pending request flag
    @Test
    void grantContributorStatus_updatesRoleToContributor() {
        UUID userId = UUID.randomUUID();
        User user = createTestUser(userId, "user@example.com", UserRole.REGISTERED_VIEWER);
        user.setContributorRequested(true);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User result = userService.grantContributorStatus(userId);

        assertEquals(UserRole.CONTRIBUTOR, result.getRole());
        assertFalse(result.isContributorRequested());
        verify(userRepository).save(any(User.class));
    }

    // Revoking demotes back to REGISTERED_VIEWER and clears the request flag
    @Test
    void revokeContributorStatus_resetsToRegisteredViewer() {
        UUID userId = UUID.randomUUID();
        User user = createTestUser(userId, "user@example.com", UserRole.CONTRIBUTOR);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User result = userService.revokeContributorStatus(userId);

        assertEquals(UserRole.REGISTERED_VIEWER, result.getRole());
        assertFalse(result.isContributorRequested());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void grantContributorStatus_userNotFound_throwsException() {
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> userService.grantContributorStatus(userId));
    }
}
