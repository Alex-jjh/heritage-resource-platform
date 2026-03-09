package com.heritage.platform.service;

import com.heritage.platform.config.AwsCognitoConfig;
import com.heritage.platform.dto.UpdateProfileRequest;
import com.heritage.platform.exception.ResourceNotFoundException;
import com.heritage.platform.model.User;
import com.heritage.platform.model.UserRole;
import com.heritage.platform.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AdminUpdateUserAttributesRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AdminUpdateUserAttributesResponse;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private CognitoIdentityProviderClient cognitoClient;

    private AwsCognitoConfig cognitoConfig;
    private UserService userService;

    @BeforeEach
    void setUp() {
        cognitoConfig = new AwsCognitoConfig();
        cognitoConfig.setUserPoolId("test-pool");
        cognitoConfig.setClientId("test-client");
        cognitoConfig.setRegion("us-east-1");
        userService = new UserService(userRepository, cognitoClient, cognitoConfig);
    }

    private User createTestUser(UUID id, String cognitoSub, UserRole role) {
        User user = new User();
        user.setId(id);
        user.setCognitoSub(cognitoSub);
        user.setEmail("user@example.com");
        user.setDisplayName("Test User");
        user.setRole(role);
        user.setContributorRequested(false);
        return user;
    }

    @Test
    void getUserByCognitoSub_returnsUser() {
        User user = createTestUser(UUID.randomUUID(), "sub-123", UserRole.REGISTERED_VIEWER);
        when(userRepository.findByCognitoSub("sub-123")).thenReturn(Optional.of(user));

        User result = userService.getUserByCognitoSub("sub-123");
        assertEquals("sub-123", result.getCognitoSub());
    }

    @Test
    void getUserByCognitoSub_notFound_throwsException() {
        when(userRepository.findByCognitoSub("unknown")).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> userService.getUserByCognitoSub("unknown"));
    }

    @Test
    void updateProfile_updatesDisplayName() {
        User user = createTestUser(UUID.randomUUID(), "sub-123", UserRole.REGISTERED_VIEWER);
        when(userRepository.findByCognitoSub("sub-123")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setDisplayName("New Name");

        User result = userService.updateProfile("sub-123", request);
        assertEquals("New Name", result.getDisplayName());
    }

    @Test
    void getPendingContributorRequests_returnsOnlyPendingViewers() {
        User pending = createTestUser(UUID.randomUUID(), "sub-1", UserRole.REGISTERED_VIEWER);
        pending.setContributorRequested(true);

        when(userRepository.findByRoleAndContributorRequestedTrue(UserRole.REGISTERED_VIEWER))
                .thenReturn(List.of(pending));

        List<User> result = userService.getPendingContributorRequests();
        assertEquals(1, result.size());
        assertTrue(result.get(0).isContributorRequested());
    }

    @Test
    void grantContributorStatus_updatesRoleToContributor() {
        UUID userId = UUID.randomUUID();
        User user = createTestUser(userId, "sub-123", UserRole.REGISTERED_VIEWER);
        user.setContributorRequested(true);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(cognitoClient.adminUpdateUserAttributes(any(AdminUpdateUserAttributesRequest.class)))
                .thenReturn(AdminUpdateUserAttributesResponse.builder().build());

        User result = userService.grantContributorStatus(userId);

        assertEquals(UserRole.CONTRIBUTOR, result.getRole());
        assertFalse(result.isContributorRequested());

        // Verify Cognito was updated
        ArgumentCaptor<AdminUpdateUserAttributesRequest> captor =
                ArgumentCaptor.forClass(AdminUpdateUserAttributesRequest.class);
        verify(cognitoClient).adminUpdateUserAttributes(captor.capture());
        assertEquals("CONTRIBUTOR",
                captor.getValue().userAttributes().get(0).value());
    }

    @Test
    void revokeContributorStatus_resetsToRegisteredViewer() {
        UUID userId = UUID.randomUUID();
        User user = createTestUser(userId, "sub-456", UserRole.CONTRIBUTOR);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(cognitoClient.adminUpdateUserAttributes(any(AdminUpdateUserAttributesRequest.class)))
                .thenReturn(AdminUpdateUserAttributesResponse.builder().build());

        User result = userService.revokeContributorStatus(userId);

        assertEquals(UserRole.REGISTERED_VIEWER, result.getRole());
        assertFalse(result.isContributorRequested());

        ArgumentCaptor<AdminUpdateUserAttributesRequest> captor =
                ArgumentCaptor.forClass(AdminUpdateUserAttributesRequest.class);
        verify(cognitoClient).adminUpdateUserAttributes(captor.capture());
        assertEquals("REGISTERED_VIEWER",
                captor.getValue().userAttributes().get(0).value());
    }

    @Test
    void grantContributorStatus_userNotFound_throwsException() {
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> userService.grantContributorStatus(userId));
    }
}
