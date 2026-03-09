package com.heritage.platform.service;

import com.heritage.platform.config.AwsCognitoConfig;
import com.heritage.platform.dto.AuthResponse;
import com.heritage.platform.dto.LoginRequest;
import com.heritage.platform.dto.RegisterRequest;
import com.heritage.platform.exception.AuthenticationException;
import com.heritage.platform.exception.DuplicateEmailException;
import com.heritage.platform.model.User;
import com.heritage.platform.model.UserRole;
import com.heritage.platform.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.*;

import java.util.Map;

@Service
public class AuthService {

    private final CognitoIdentityProviderClient cognitoClient;
    private final AwsCognitoConfig cognitoConfig;
    private final UserRepository userRepository;

    public AuthService(CognitoIdentityProviderClient cognitoClient,
                       AwsCognitoConfig cognitoConfig,
                       UserRepository userRepository) {
        this.cognitoClient = cognitoClient;
        this.cognitoConfig = cognitoConfig;
        this.userRepository = userRepository;
    }

    /**
     * Registers a new user in Cognito and persists a local User record
     * with the REGISTERED_VIEWER role.
     */
    @Transactional
    public User register(RegisterRequest request) {
        // Check for duplicate email locally first
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new DuplicateEmailException("An account with this email already exists");
        }

        try {
            // Create user in Cognito
            AdminCreateUserRequest cognitoRequest = AdminCreateUserRequest.builder()
                    .userPoolId(cognitoConfig.getUserPoolId())
                    .username(request.getEmail())
                    .temporaryPassword(request.getPassword())
                    .messageAction(MessageActionType.SUPPRESS)
                    .userAttributes(
                            AttributeType.builder().name("email").value(request.getEmail()).build(),
                            AttributeType.builder().name("email_verified").value("true").build(),
                            AttributeType.builder().name("custom:role").value(UserRole.REGISTERED_VIEWER.name()).build()
                    )
                    .build();

            AdminCreateUserResponse cognitoResponse = cognitoClient.adminCreateUser(cognitoRequest);
            String cognitoSub = cognitoResponse.user().attributes().stream()
                    .filter(a -> "sub".equals(a.name()))
                    .findFirst()
                    .map(AttributeType::value)
                    .orElseThrow(() -> new RuntimeException("Cognito did not return a sub attribute"));

            // Set permanent password (skip the FORCE_CHANGE_PASSWORD state)
            cognitoClient.adminSetUserPassword(AdminSetUserPasswordRequest.builder()
                    .userPoolId(cognitoConfig.getUserPoolId())
                    .username(request.getEmail())
                    .password(request.getPassword())
                    .permanent(true)
                    .build());

            // Persist local user record
            User user = new User();
            user.setCognitoSub(cognitoSub);
            user.setEmail(request.getEmail());
            user.setDisplayName(request.getDisplayName());
            user.setRole(UserRole.REGISTERED_VIEWER);
            user.setContributorRequested(false);

            return userRepository.save(user);

        } catch (UsernameExistsException e) {
            throw new DuplicateEmailException("An account with this email already exists");
        }
    }

    /**
     * Authenticates a user via Cognito USER_PASSWORD_AUTH flow and returns tokens.
     * Returns a generic error on failure to avoid revealing whether email or password was wrong.
     */
    public AuthResponse login(LoginRequest request) {
        try {
            InitiateAuthRequest authRequest = InitiateAuthRequest.builder()
                    .authFlow(AuthFlowType.USER_PASSWORD_AUTH)
                    .clientId(cognitoConfig.getClientId())
                    .authParameters(Map.of(
                            "USERNAME", request.getEmail(),
                            "PASSWORD", request.getPassword()
                    ))
                    .build();

            InitiateAuthResponse authResponse = cognitoClient.initiateAuth(authRequest);
            AuthenticationResultType result = authResponse.authenticationResult();

            return new AuthResponse(
                    result.accessToken(),
                    result.idToken(),
                    result.refreshToken(),
                    result.expiresIn()
            );
        } catch (NotAuthorizedException | UserNotFoundException e) {
            throw new AuthenticationException();
        }
    }

    /**
     * Revokes the user's refresh token, effectively logging them out.
     */
    public void logout(String accessToken) {
        try {
            cognitoClient.globalSignOut(GlobalSignOutRequest.builder()
                    .accessToken(accessToken)
                    .build());
        } catch (Exception e) {
            // Log but don't fail — token may already be expired
        }
    }
}
