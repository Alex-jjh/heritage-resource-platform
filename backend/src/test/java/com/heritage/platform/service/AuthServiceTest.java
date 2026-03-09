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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.*;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private CognitoIdentityProviderClient cognitoClient;
    @Mock
    private UserRepository userRepository;

    private AwsCognitoConfig cognitoConfig;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        cognitoConfig = new AwsCognitoConfig();
        cognitoConfig.setUserPoolId("test-pool");
        cognitoConfig.setClientId("test-client");
        cognitoConfig.setRegion("us-east-1");
        authService = new AuthService(cognitoClient, cognitoConfig, userRepository);
    }

    @Test
    void register_createsUserWithRegisteredViewerRole() {
        RegisterRequest request = new RegisterRequest();
        request.setDisplayName("Test User");
        request.setEmail("test@example.com");
        request.setPassword("password123");

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.empty());

        AdminCreateUserResponse cognitoResponse = AdminCreateUserResponse.builder()
                .user(UserType.builder()
                        .attributes(AttributeType.builder().name("sub").value("cognito-sub-123").build())
                        .build())
                .build();
        
        // 修改点 1：强转 AdminCreateUserRequest
        when(cognitoClient.adminCreateUser((AdminCreateUserRequest) any())).thenReturn(cognitoResponse);
        // 修改点 2：强转 AdminSetUserPasswordRequest
        when(cognitoClient.adminSetUserPassword((AdminSetUserPasswordRequest) any()))
                .thenReturn(AdminSetUserPasswordResponse.builder().build());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        when(userRepository.save(userCaptor.capture())).thenAnswer(inv -> inv.getArgument(0));

        User result = authService.register(request);

        assertEquals(UserRole.REGISTERED_VIEWER, result.getRole());
        assertEquals("test@example.com", result.getEmail());
        assertEquals("Test User", result.getDisplayName());
        assertEquals("cognito-sub-123", result.getCognitoSub());
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
        
        // 修改点 3：强转 AdminCreateUserRequest
        verify(cognitoClient, never()).adminCreateUser((AdminCreateUserRequest) any());
    }

    @Test
    void register_whenCognitoThrowsUsernameExists_throwsDuplicateEmailException() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("dup@example.com");
        request.setPassword("password123");
        request.setDisplayName("Dup User");

        when(userRepository.findByEmail("dup@example.com")).thenReturn(Optional.empty());
        
        // 修改点 4：强转 AdminCreateUserRequest
        when(cognitoClient.adminCreateUser((AdminCreateUserRequest) any()))
                .thenThrow(UsernameExistsException.builder().message("Username already exists").build());

        assertThrows(DuplicateEmailException.class, () -> authService.register(request));
    }

    @Test
    void login_withValidCredentials_returnsTokens() {
        LoginRequest request = new LoginRequest();
        request.setEmail("user@example.com");
        request.setPassword("password123");

        AuthenticationResultType authResult = AuthenticationResultType.builder()
                .accessToken("access-token")
                .idToken("id-token")
                .refreshToken("refresh-token")
                .expiresIn(3600)
                .build();
        InitiateAuthResponse authResponse = InitiateAuthResponse.builder()
                .authenticationResult(authResult)
                .build();
        
        // 修改点 5：强转 InitiateAuthRequest
        when(cognitoClient.initiateAuth((InitiateAuthRequest) any())).thenReturn(authResponse);

        AuthResponse result = authService.login(request);

        assertEquals("access-token", result.getAccessToken());
        assertEquals("id-token", result.getIdToken());
        assertEquals("refresh-token", result.getRefreshToken());
        assertEquals(3600, result.getExpiresIn());
    }

    @Test
    void login_withInvalidCredentials_throwsGenericAuthenticationError() {
        LoginRequest request = new LoginRequest();
        request.setEmail("user@example.com");
        request.setPassword("wrong-password");

        // 修改点 6：强转 InitiateAuthRequest
        when(cognitoClient.initiateAuth((InitiateAuthRequest) any()))
                .thenThrow(NotAuthorizedException.builder().message("Incorrect username or password").build());

        AuthenticationException ex = assertThrows(AuthenticationException.class,
                () -> authService.login(request));

        assertEquals("Invalid email or password", ex.getMessage());
    }

    @Test
    void login_withNonExistentUser_throwsGenericAuthenticationError() {
        LoginRequest request = new LoginRequest();
        request.setEmail("noone@example.com");
        request.setPassword("password123");

        // 修改点 7：强转 InitiateAuthRequest
        when(cognitoClient.initiateAuth((InitiateAuthRequest) any()))
                .thenThrow(UserNotFoundException.builder().message("User does not exist").build());

        AuthenticationException ex = assertThrows(AuthenticationException.class,
                () -> authService.login(request));

        assertEquals("Invalid email or password", ex.getMessage());
    }

    @Test
    void logout_callsGlobalSignOut() {
        authService.logout("some-access-token");
        // 修改点 8：强转 GlobalSignOutRequest
        verify(cognitoClient).globalSignOut((GlobalSignOutRequest) any());
    }
}