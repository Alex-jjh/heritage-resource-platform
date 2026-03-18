package com.heritage.platform.service;

import com.heritage.platform.config.AwsCognitoConfig;
import com.heritage.platform.dto.UpdateProfileRequest;
import com.heritage.platform.exception.ResourceNotFoundException;
import com.heritage.platform.model.User;
import com.heritage.platform.model.UserRole;
import com.heritage.platform.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AdminUpdateUserAttributesRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AttributeType;

import java.util.List;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final CognitoIdentityProviderClient cognitoClient;
    private final AwsCognitoConfig cognitoConfig;

    public UserService(UserRepository userRepository,
                       CognitoIdentityProviderClient cognitoClient,
                       AwsCognitoConfig cognitoConfig) {
        this.userRepository = userRepository;
        this.cognitoClient = cognitoClient;
        this.cognitoConfig = cognitoConfig;
    }

    /**
     * Retrieves a user by their Cognito sub (the principal name from the JWT).
     */
    public User getUserByCognitoSub(String cognitoSub) {
        return userRepository.findByCognitoSub(cognitoSub)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    /**
     * Updates the current user's profile.
     */
    @Transactional
    public User updateProfile(String cognitoSub, UpdateProfileRequest request) {
        User user = getUserByCognitoSub(cognitoSub);
        user.setDisplayName(request.getDisplayName());
        return userRepository.save(user);
    }

    /**
     * Returns all REGISTERED_VIEWER users who have requested contributor status.
     */
    public List<User> getPendingContributorRequests() {
        return userRepository.findByRoleAndContributorRequestedTrue(UserRole.REGISTERED_VIEWER);
    }

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
        updateCognitoRole(user.getCognitoSub(), newRole);
    }

    @Transactional
    public void deleteUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        // Delete from Cognito first
        try {
            cognitoClient.adminDeleteUser(
                    software.amazon.awssdk.services.cognitoidentityprovider.model.AdminDeleteUserRequest.builder()
                            .userPoolId(cognitoConfig.getUserPoolId())
                            .username(user.getEmail())
                            .build());
        } catch (Exception e) {
            // Log but continue — user may already be deleted from Cognito
        }
        userRepository.delete(user);
    }

    /**
     * Grants contributor status to a user, updating both the local DB and Cognito.
     */
    @Transactional
    public User grantContributorStatus(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setRole(UserRole.CONTRIBUTOR);
        user.setContributorRequested(false);
        userRepository.save(user);

        updateCognitoRole(user.getCognitoSub(), UserRole.CONTRIBUTOR);
        return user;
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
        userRepository.save(user);

        updateCognitoRole(user.getCognitoSub(), UserRole.REGISTERED_VIEWER);
        return user;
    }

    private void updateCognitoRole(String cognitoSub, UserRole role) {
        cognitoClient.adminUpdateUserAttributes(AdminUpdateUserAttributesRequest.builder()
                .userPoolId(cognitoConfig.getUserPoolId())
                .username(cognitoSub)
                .userAttributes(
                        AttributeType.builder()
                                .name("custom:role")
                                .value(role.name())
                                .build()
                )
                .build());
    }
}
