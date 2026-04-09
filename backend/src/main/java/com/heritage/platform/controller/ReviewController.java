package com.heritage.platform.controller;

import com.heritage.platform.dto.RejectResourceRequest;
import com.heritage.platform.dto.ResourceResponse;
import com.heritage.platform.model.Resource;
import com.heritage.platform.service.ReviewService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping("/queue")
    public ResponseEntity<List<ResourceResponse>> getReviewQueue() {
        List<ResourceResponse> queue = reviewService.getReviewQueue()
                .stream()
                .map(ResourceResponse::fromEntity)
                .toList();
        return ResponseEntity.ok(queue);
    }

    @PostMapping("/{resourceId}/approve")
    public ResponseEntity<ResourceResponse> approve(
            @PathVariable UUID resourceId,
            Principal principal) {
        Resource resource = reviewService.approveResource(resourceId, principal.getName());
        return ResponseEntity.ok(ResourceResponse.fromEntity(resource));
    }

    @PostMapping("/{resourceId}/reject")
    public ResponseEntity<ResourceResponse> reject(
            @PathVariable UUID resourceId,
            Principal principal,
            @Valid @RequestBody RejectResourceRequest request) {
        Resource resource = reviewService.rejectResource(resourceId, principal.getName(), request.getComments());
        return ResponseEntity.ok(ResourceResponse.fromEntity(resource));
    }

    @org.springframework.web.bind.annotation.GetMapping("/history")
    public org.springframework.http.ResponseEntity<java.util.List<com.heritage.platform.dto.ReviewHistoryResponse>> getReviewHistory(
            @org.springframework.web.bind.annotation.RequestParam(required = false) java.util.UUID reviewerId,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String decision) {
            
        java.util.List<com.heritage.platform.model.ReviewFeedback> rawData = reviewService.searchReviewHistory(reviewerId, decision);
        
        java.util.List<com.heritage.platform.dto.ReviewHistoryResponse> packagedData = rawData.stream()
                .map(com.heritage.platform.dto.ReviewHistoryResponse::fromEntity)
                .toList();
                
        return org.springframework.http.ResponseEntity.ok(packagedData);
    }

}
