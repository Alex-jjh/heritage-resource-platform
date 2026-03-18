package com.heritage.platform.controller;

import com.heritage.platform.dto.MessageResponse;
import com.heritage.platform.dto.UpdateProfileRequest;
import com.heritage.platform.dto.UserProfileResponse;
import com.heritage.platform.model.User;
import com.heritage.platform.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getProfile(Principal principal) {
        User user = userService.getUserByCognitoSub(principal.getName());
        return ResponseEntity.ok(UserProfileResponse.fromUser(user));
    }

    @PutMapping("/me")
    public ResponseEntity<UserProfileResponse> updateProfile(
            Principal principal,
            @Valid @RequestBody UpdateProfileRequest request) {
        User user = userService.updateProfile(principal.getName(), request);
        return ResponseEntity.ok(UserProfileResponse.fromUser(user));
    }

    @GetMapping("/pending-contributors")
    public ResponseEntity<List<UserProfileResponse>> getPendingContributors() {
        List<UserProfileResponse> pending = userService.getPendingContributorRequests()
                .stream()
                .map(UserProfileResponse::fromUser)
                .toList();
        return ResponseEntity.ok(pending);
    }

    @GetMapping("/all")
    public ResponseEntity<List<UserProfileResponse>> getAllUsers() {
        List<UserProfileResponse> users = userService.getAllUsers()
                .stream()
                .map(UserProfileResponse::fromUser)
                .toList();
        return ResponseEntity.ok(users);
    }

    @PostMapping("/{userId}/grant-contributor")
    public ResponseEntity<MessageResponse> grantContributor(@PathVariable UUID userId) {
        userService.grantContributorStatus(userId);
        return ResponseEntity.ok(new MessageResponse("Contributor status granted"));
    }

    @PostMapping("/{userId}/revoke-contributor")
    public ResponseEntity<MessageResponse> revokeContributor(@PathVariable UUID userId) {
        userService.revokeContributorStatus(userId);
        return ResponseEntity.ok(new MessageResponse("Contributor status revoked"));
    }
}
