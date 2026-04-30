package com.heritage.platform.service;

import com.heritage.platform.dto.UpdateProfileRequest;
import com.heritage.platform.model.User;
import com.heritage.platform.model.UserRole;
import com.heritage.platform.repository.ResourceRepository;
import com.heritage.platform.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class UserServicePasswordUpdateTests {

    @Test
    void updateProfileHashesNewPasswordBeforeSaving() {
        UserRepository userRepository = mock(UserRepository.class);
        ResourceRepository resourceRepository = mock(ResourceRepository.class);
        FileService fileService = mock(FileService.class);
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("viewer@heritage.demo");
        user.setDisplayName("Viewer");
        user.setRole(UserRole.REGISTERED_VIEWER);
        user.setPasswordHash("old-hash");

        when(userRepository.findByEmail("viewer@heritage.demo"))
                .thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        UserService userService = new UserService(
                userRepository,
                resourceRepository,
                fileService,
                passwordEncoder
        );

        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setPassword("NewPass123");

        User updated = userService.updateProfile("viewer@heritage.demo", request);

        assertNotEquals("NewPass123", updated.getPasswordHash());
        assertTrue(passwordEncoder.matches("NewPass123", updated.getPasswordHash()));
    }
}
