package com.heritage.platform.service;

import com.heritage.platform.dto.UpdateProfileRequest;
import com.heritage.platform.dto.UserProfileResponse;
import com.heritage.platform.exception.ResourceNotFoundException;
import com.heritage.platform.model.Resource;
import com.heritage.platform.model.ResourceStatus;
import com.heritage.platform.model.User;
import com.heritage.platform.model.UserRole;
import com.heritage.platform.repository.ResourceRepository;
import com.heritage.platform.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final ResourceRepository resourceRepository;

    public UserService(UserRepository userRepository, ResourceRepository resourceRepository) {
        this.userRepository = userRepository;
        this.resourceRepository = resourceRepository;
    }

    /**
     * Retrieves a user by their email (the principal name from the JWT).
     */
    @Transactional(readOnly = true)
    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    /**
     * Allows a REGISTERED_VIEWER to request contributor status.
     * The request is stored and visible to administrators for approval.
     */
    @Transactional
    public void requestContributorStatus(String email) {
        User user = getUserByEmail(email);
        if (user.getRole() != UserRole.REGISTERED_VIEWER) {
            throw new IllegalStateException("Only registered viewers can request contributor status");
        }
        if (user.isContributorRequested()) {
            throw new IllegalStateException("Contributor status has already been requested");
        }
        user.setContributorRequested(true);
        userRepository.save(user);
    }

    /**
     * Updates the current user's profile.
     */
    @Transactional
    public User updateProfile(String email, UpdateProfileRequest request) {
        User user = getUserByEmail(email);

        if (request.getDisplayName() != null) {
            user.setDisplayName(request.getDisplayName());
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl());
        }
        if (request.getProfilePublic() != null) {
            user.setProfilePublic(request.getProfilePublic());
        }
        if (request.getShowEmail() != null) {
            user.setShowEmail(request.getShowEmail());
        }
        if (request.getBio() != null) {
            user.setBio(request.getBio());
        }

        return userRepository.save(user);
    }

    /**
     * Returns all REGISTERED_VIEWER users who have requested contributor status.
     */
    @Transactional(readOnly = true)
    public List<User> getPendingContributorRequests() {
        return userRepository.findByRoleAndContributorRequestedTrue(UserRole.REGISTERED_VIEWER);
    }

    @Transactional(readOnly = true)
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @Transactional
    public void changeUserRole(UUID userId, String roleName) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        UserRole newRole = UserRole.valueOf(roleName);
        user.setRole(newRole);
        user.setContributorRequested(false);
        userRepository.save(user);
    }

    @Transactional
    public void deleteUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        userRepository.delete(user);
    }

    /**
     * Grants contributor status to a user.
     */
    @Transactional
    public User grantContributorStatus(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setRole(UserRole.CONTRIBUTOR);
        user.setContributorRequested(false);
        return userRepository.save(user);
    }

    /**
     * Revokes contributor status, resetting the user to REGISTERED_VIEWER.
     */
    @Transactional
    public User revokeContributorStatus(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setRole(UserRole.REGISTERED_VIEWER);
        user.setContributorRequested(false);
        return userRepository.save(user);
    }

    /**
     * Returns a user's public profile and their published resources.
     */
    @Transactional(readOnly = true)
    public UserProfileResponse getUserProfile(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<Resource> publishedResources = resourceRepository.findByContributorId(userId)
                .stream()
                .filter(resource -> resource.getStatus() == ResourceStatus.APPROVED)
                .toList();

        return UserProfileResponse.fromEntity(user, publishedResources);
    }
}