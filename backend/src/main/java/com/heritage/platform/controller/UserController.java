package com.heritage.platform.controller;

import com.heritage.platform.dto.MessageResponse;
import com.heritage.platform.dto.UpdateProfileRequest;
import com.heritage.platform.dto.UserProfileResponse;
import com.heritage.platform.model.User;
import com.heritage.platform.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
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
        User user = userService.getUserByEmail(principal.getName());

        return ResponseEntity.ok(
                UserProfileResponse.fromEntity(user, List.of())
        );
    }

    @PostMapping("/me/request-contributor")
    public ResponseEntity<MessageResponse> requestContributor(Principal principal) {
        userService.requestContributorStatus(principal.getName());
        return ResponseEntity.ok(new MessageResponse("Contributor application submitted"));
    }

    @PutMapping("/me")
    public ResponseEntity<UserProfileResponse> updateProfile(
            Principal principal,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        User user = userService.updateProfile(principal.getName(), request);

        return ResponseEntity.ok(
                UserProfileResponse.fromEntity(user, List.of())
        );
    }

    @GetMapping("/pending-contributors")
    public ResponseEntity<List<UserProfileResponse>> getPendingContributors() {
        List<UserProfileResponse> pending = userService.getPendingContributorRequests()
                .stream()
                .map(user -> UserProfileResponse.fromEntity(user, List.of()))
                .toList();

        return ResponseEntity.ok(pending);
    }

    @GetMapping("/all")
    public ResponseEntity<List<UserProfileResponse>> getAllUsers() {
        List<UserProfileResponse> users = userService.getAllUsers()
                .stream()
                .map(user -> UserProfileResponse.fromEntity(user, List.of()))
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

    @PutMapping("/{userId}/role")
    public ResponseEntity<MessageResponse> changeRole(
            @PathVariable UUID userId,
            @RequestBody java.util.Map<String, String> body
    ) {
        String role = body.get("role");
        userService.changeUserRole(userId, role);
        return ResponseEntity.ok(new MessageResponse("Role updated to " + role));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<MessageResponse> deleteUser(@PathVariable UUID userId) {
        userService.deleteUser(userId);
        return ResponseEntity.ok(new MessageResponse("User deleted"));
    }

    @GetMapping("/{userId}/profile")
    public ResponseEntity<UserProfileResponse> getUserProfile(@PathVariable UUID userId) {
        return ResponseEntity.ok(userService.getUserProfile(userId));
    }
}
