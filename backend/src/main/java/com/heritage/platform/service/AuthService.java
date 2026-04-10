package com.heritage.platform.service;

import com.heritage.platform.dto.AuthResponse;
import com.heritage.platform.dto.LoginRequest;
import com.heritage.platform.dto.RegisterRequest;
import com.heritage.platform.exception.AuthenticationException;
import com.heritage.platform.exception.DuplicateEmailException;
import com.heritage.platform.model.User;
import com.heritage.platform.model.UserRole;
import com.heritage.platform.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    /**
     * Registers a new user with bcrypt-hashed password and REGISTERED_VIEWER role.
     */
    @Transactional
    public User register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new DuplicateEmailException("An account with this email already exists");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setDisplayName(request.getDisplayName());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(UserRole.REGISTERED_VIEWER);
        user.setContributorRequested(false);

        return userRepository.save(user);
    }

    /**
     * Authenticates a user by email/password and returns a JWT access token.
     */
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(AuthenticationException::new);

        if (user.getPasswordHash() == null ||
                !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new AuthenticationException();
        }

        String token = jwtService.generateToken(user);
        return new AuthResponse(token, (int) (jwtService.getExpirationMs() / 1000));
    }

    /**
     * Stateless JWT — logout is a no-op on the server side.
     * The client simply discards the token.
     */
    public void logout(String accessToken) {
        // No-op for stateless JWT
    }
}
