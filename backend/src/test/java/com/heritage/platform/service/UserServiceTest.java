package com.heritage.platform.service;

import com.heritage.platform.dto.UpdateProfileRequest;
import com.heritage.platform.dto.UserProfileResponse;
import com.heritage.platform.exception.ResourceNotFoundException;
import com.heritage.platform.model.Category;
import com.heritage.platform.model.Resource;
import com.heritage.platform.model.ResourceStatus;
import com.heritage.platform.model.User;
import com.heritage.platform.model.UserRole;
import com.heritage.platform.repository.ResourceRepository;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private ResourceRepository resourceRepository;

    @Mock
    private FileService fileService;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository, resourceRepository, fileService);
    }

    private User createTestUser(UUID id, String email, UserRole role) {
        User user = new User();
        user.setId(id);
        user.setEmail(email);
        user.setDisplayName("Test User");
        user.setRole(role);
        user.setContributorRequested(false);
        user.setAvatarUrl("https://example.com/avatar.png");
        user.setProfilePublic(true);
        user.setShowEmail(false);
        user.setBio("Test bio");
        return user;
    }

    private Resource createTestResource(UUID id, String title, ResourceStatus status, User contributor) {
        Resource resource = new Resource();
        resource.setId(id);
        resource.setTitle(title);
        resource.setStatus(status);

        Category category = new Category();
        category.setId(UUID.randomUUID());
        category.setName("Architecture");
        resource.setCategory(category);

        resource.setContributor(contributor);
        resource.setPlace("Test Place");
        resource.setDescription("Test description");
        resource.setCopyrightDeclaration("Test copyright");

        return resource;
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

        assertThrows(
                ResourceNotFoundException.class,
                () -> userService.getUserByEmail("unknown@example.com")
        );
    }

    @Test
    void updateProfile_updatesExtendedFields() {
        User user = createTestUser(UUID.randomUUID(), "user@example.com", UserRole.REGISTERED_VIEWER);
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setDisplayName("New Name");
        request.setAvatarUrl("https://example.com/new-avatar.png");
        request.setProfilePublic(false);
        request.setShowEmail(true);
        request.setBio("Updated bio");

        User result = userService.updateProfile("user@example.com", request);

        assertEquals("New Name", result.getDisplayName());
        assertEquals("https://example.com/new-avatar.png", result.getAvatarUrl());
        assertFalse(result.isProfilePublic());
        assertTrue(result.isShowEmail());
        assertEquals("Updated bio", result.getBio());
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

        assertThrows(
                ResourceNotFoundException.class,
                () -> userService.grantContributorStatus(userId)
        );
    }

    @Test
    void changeUserRole_validRole_updatesRole() {
        UUID userId = UUID.randomUUID();
        User user = createTestUser(userId, "viewer@example.com", UserRole.REGISTERED_VIEWER);
        user.setContributorRequested(true);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        userService.changeUserRole(userId, "ADMINISTRATOR");

        assertEquals(UserRole.ADMINISTRATOR, user.getRole());
        assertFalse(user.isContributorRequested());
        verify(userRepository).save(user);
    }

    @Test
    void changeUserRole_userNotFound_throwsException() {
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> userService.changeUserRole(userId, "CONTRIBUTOR")
        );
    }

    @Test
    void changeUserRole_invalidRoleName_throwsIllegalArgument() {
        UUID userId = UUID.randomUUID();
        User user = createTestUser(userId, "user@example.com", UserRole.REGISTERED_VIEWER);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        assertThrows(
                IllegalArgumentException.class,
                () -> userService.changeUserRole(userId, "INVALID_ROLE")
        );
    }

    @Test
    void deleteUser_existingUser_deletesFromRepository() {
        UUID userId = UUID.randomUUID();
        User user = createTestUser(userId, "user@example.com", UserRole.REGISTERED_VIEWER);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        userService.deleteUser(userId);

        verify(userRepository).delete(user);
    }

    @Test
    void deleteUser_userNotFound_throwsException() {
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> userService.deleteUser(userId)
        );
    }

    @Test
    void getAllUsers_returnsAllUsers() {
        User u1 = createTestUser(UUID.randomUUID(), "a@example.com", UserRole.REGISTERED_VIEWER);
        User u2 = createTestUser(UUID.randomUUID(), "b@example.com", UserRole.CONTRIBUTOR);

        when(userRepository.findAll()).thenReturn(List.of(u1, u2));

        List<User> result = userService.getAllUsers();

        assertEquals(2, result.size());
        verify(userRepository).findAll();
    }

    @Test
    void revokeContributorStatus_userNotFound_throwsException() {
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> userService.revokeContributorStatus(userId)
        );
    }

    @Test
    void getUserProfile_returnsOnlyApprovedResources() {
        UUID userId = UUID.randomUUID();
        User user = createTestUser(userId, "user@example.com", UserRole.CONTRIBUTOR);

        Resource approved = createTestResource(
                UUID.randomUUID(),
                "Approved Resource",
                ResourceStatus.APPROVED,
                user
        );
        Resource draft = createTestResource(
                UUID.randomUUID(),
                "Draft Resource",
                ResourceStatus.DRAFT,
                user
        );

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(resourceRepository.findByContributorId(userId)).thenReturn(List.of(approved, draft));

        UserProfileResponse result = userService.getUserProfile(userId);

        assertEquals(userId, result.getId());
        assertEquals("Test User", result.getDisplayName());
        assertEquals(1, result.getPublishedResources().size());
        assertEquals("Approved Resource", result.getPublishedResources().get(0).getTitle());
    }

    @Test
    void getUserProfile_userNotFound_throwsException() {
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> userService.getUserProfile(userId)
        );
    }
}