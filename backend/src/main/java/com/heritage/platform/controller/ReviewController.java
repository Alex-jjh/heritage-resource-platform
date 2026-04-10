package com.heritage.platform.controller;

import com.heritage.platform.dto.RejectResourceRequest;
import com.heritage.platform.dto.ResourceResponse;
import com.heritage.platform.model.Resource;
import com.heritage.platform.service.ReviewService;
import com.heritage.platform.service.PredefinedFeedbackService; // 1. 引入新Service
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
    private final PredefinedFeedbackService predefinedFeedbackService; // 2. 声明变量

    // 3. 修改构造函数，把两个Service都放进来
    public ReviewController(ReviewService reviewService, PredefinedFeedbackService predefinedFeedbackService) {
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

    // This section handles AC 1 & 2: reject logic, which will invoke the mandatory
    // validation in the Service.
    @PostMapping("/{resourceId}/reject")
    public ResponseEntity<ResourceResponse> reject(
            @PathVariable UUID resourceId,
            Principal principal,
            @Valid @RequestBody RejectResourceRequest request) {
        // 如果 request.getComments() 为空，Service 层会抛出异常，前端会收到报错弹窗
        Resource resource = reviewService.rejectResource(resourceId, principal.getName(), request.getComments());
        return ResponseEntity.ok(ResourceResponse.fromEntity(resource));
    }

    @GetMapping("/predefined-feedback")
    public ResponseEntity<List<com.heritage.platform.dto.PredefinedFeedbackResponse>> getPredefinedFeedback() {
        return ResponseEntity.ok(predefinedFeedbackService.getPredefinedFeedbacks());
    }

    @org.springframework.web.bind.annotation.GetMapping("/history")
    public org.springframework.http.ResponseEntity<java.util.List<com.heritage.platform.dto.ReviewHistoryResponse>> getReviewHistory(
            @org.springframework.web.bind.annotation.RequestParam(required = false) java.util.UUID reviewerId,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String decision) {

        return org.springframework.http.ResponseEntity.ok(
                reviewService.getReviewHistory(reviewerId, decision));
    }
}
