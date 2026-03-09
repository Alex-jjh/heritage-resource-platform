package com.heritage.platform.service;

import com.heritage.platform.exception.InvalidStatusTransitionException;
import com.heritage.platform.exception.ResourceNotFoundException;
import com.heritage.platform.model.*;
import com.heritage.platform.repository.ResourceRepository;
import com.heritage.platform.repository.ReviewFeedbackRepository;
import com.heritage.platform.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ReviewService {

    private final ResourceRepository resourceRepository;
    private final ReviewFeedbackRepository reviewFeedbackRepository;
    private final UserRepository userRepository;
    private final ResourceService resourceService;

    public ReviewService(ResourceRepository resourceRepository,
                         ReviewFeedbackRepository reviewFeedbackRepository,
                         UserRepository userRepository,
                         ResourceService resourceService) {
        this.resourceRepository = resourceRepository;
        this.reviewFeedbackRepository = reviewFeedbackRepository;
        this.userRepository = userRepository;
        this.resourceService = resourceService;
    }

    /**
     * Returns all PENDING_REVIEW resources ordered by submission date ascending.
     */
    public List<Resource> getReviewQueue() {
        return resourceRepository.findByStatusOrderByCreatedAtAsc(ResourceStatus.PENDING_REVIEW);
    }

    /**
     * Approves a resource. Only PENDING_REVIEW resources can be approved.
     */
    @Transactional
    public Resource approveResource(UUID resourceId, String cognitoSub) {
        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        validatePendingReviewStatus(resource);

        User reviewer = userRepository.findByCognitoSub(cognitoSub)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        ReviewFeedback feedback = new ReviewFeedback();
        feedback.setResource(resource);
        feedback.setReviewer(reviewer);
        feedback.setComments("Approved");
        feedback.setDecision("APPROVED");
        reviewFeedbackRepository.save(feedback);

        return resourceService.transitionStatus(resourceId, ResourceStatus.APPROVED, reviewer);
    }

    /**
     * Rejects a resource with required feedback comments.
     * Only PENDING_REVIEW resources can be rejected.
     */
    @Transactional
    public Resource rejectResource(UUID resourceId, String cognitoSub, String comments) {
        if (comments == null || comments.isBlank()) {
            throw new IllegalArgumentException("Feedback comments are required when rejecting a resource");
        }

        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        validatePendingReviewStatus(resource);

        User reviewer = userRepository.findByCognitoSub(cognitoSub)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        ReviewFeedback feedback = new ReviewFeedback();
        feedback.setResource(resource);
        feedback.setReviewer(reviewer);
        feedback.setComments(comments);
        feedback.setDecision("REJECTED");
        reviewFeedbackRepository.save(feedback);

        return resourceService.transitionStatus(resourceId, ResourceStatus.REJECTED, reviewer);
    }

    private void validatePendingReviewStatus(Resource resource) {
        if (resource.getStatus() != ResourceStatus.PENDING_REVIEW) {
            throw new InvalidStatusTransitionException(
                    String.format("Resource is in %s status. Only PENDING_REVIEW resources can be reviewed.",
                            resource.getStatus()));
        }
    }
}
