package com.heritage.platform.controller;

import com.heritage.platform.dto.PredefinedFeedbackResponse;
import com.heritage.platform.dto.RejectResourceRequest;
import com.heritage.platform.dto.ResourceResponse;
import com.heritage.platform.dto.ReviewHistoryResponse;
import com.heritage.platform.model.Resource;
import com.heritage.platform.service.PredefinedFeedbackService;
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
    private final PredefinedFeedbackService predefinedFeedbackService;

    public ReviewController(
            ReviewService reviewService,
            PredefinedFeedbackService predefinedFeedbackService) {
        this.reviewService = reviewService;
        this.predefinedFeedbackService = predefinedFeedbackService;
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
        Resource resource = reviewService.rejectResource(
                resourceId,
                principal.getName(),
                request.getComments());
        return ResponseEntity.ok(ResourceResponse.fromEntity(resource));
    }

    @GetMapping("/predefined-feedback")
    public ResponseEntity<List<PredefinedFeedbackResponse>> getPredefinedFeedback() {
        return ResponseEntity.ok(predefinedFeedbackService.getPredefinedFeedbacks());
    }

    @GetMapping("/history")
    public ResponseEntity<List<ReviewHistoryResponse>> getReviewHistory(
            @RequestParam(required = false) String reviewerEmail,
            @RequestParam(required = false) String decision) {
        return ResponseEntity.ok(
                reviewService.getReviewHistory(reviewerEmail, decision));
    }
}