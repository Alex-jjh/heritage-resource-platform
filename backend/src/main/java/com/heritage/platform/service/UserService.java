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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class UserService {

    private static final long MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

    private static final Set<String> ALLOWED_AVATAR_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );

    private final UserRepository userRepository;
    private final ResourceRepository resourceRepository;
    private final FileService fileService;
    private final PasswordEncoder passwordEncoder;

    public UserService(
            UserRepository userRepository,
            ResourceRepository resourceRepository,
            FileService fileService,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.resourceRepository = resourceRepository;
        this.fileService = fileService;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Retrieves a user by their email.
     */
    @Transactional(readOnly = true)
    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    /**
     * Allows a REGISTERED_VIEWER to request contributor status.
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

        if (request.getPassword() != null) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }

        return userRepository.save(user);
    }

    /**
     * Uploads a new avatar image for the current user and stores the resolved
     * URL.
     */
    @Transactional
    public User uploadAvatar(String email, MultipartFile file) {
        User user = getUserByEmail(email);

        validateAvatarFile(file);

        String avatarUrl = fileService.uploadAvatar(file, user.getId());
        user.setAvatarUrl(avatarUrl);

        return userRepository.save(user);
    }

    private void validateAvatarFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Avatar file must not be empty");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_AVATAR_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Only JPG, PNG, and WEBP images are allowed for avatars");
        }

        if (file.getSize() > MAX_AVATAR_SIZE_BYTES) {
            throw new IllegalArgumentException("Avatar image must be smaller than 5MB");
        }
    }

    /**
     * Returns all REGISTERED_VIEWER users who have requested contributor
     * status.
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
