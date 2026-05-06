package com.heritage.platform.controller;

import com.heritage.platform.dto.PlatformStatsResponse;
import com.heritage.platform.model.ResourceStatus;
import com.heritage.platform.repository.ResourceRepository;
import com.heritage.platform.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final ResourceRepository resourceRepository;
    private final UserRepository userRepository;

    public StatsController(ResourceRepository resourceRepository, UserRepository userRepository) {
        this.resourceRepository = resourceRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/homepage")
    public ResponseEntity<PlatformStatsResponse> getHomepageStats() {
        return ResponseEntity.ok(new PlatformStatsResponse(
                resourceRepository.countByStatus(ResourceStatus.APPROVED),
                userRepository.count()
        ));
    }
}
