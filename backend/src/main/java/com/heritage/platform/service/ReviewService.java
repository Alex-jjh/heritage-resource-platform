package com.heritage.platform.service;

import com.heritage.platform.dto.ReviewHistoryResponse;
import com.heritage.platform.exception.InvalidStatusTransitionException;
import com.heritage.platform.exception.ResourceNotFoundException;
import com.heritage.platform.exception.TaskLockedByAnotherUserException;
import com.heritage.platform.model.Resource;
import com.heritage.platform.model.ResourceStatus;
import com.heritage.platform.model.ReviewFeedback;
import com.heritage.platform.model.User;
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
    @Transactional(readOnly = true)
    public List<Resource> getReviewQueue() {
        List<Resource> resources = resourceRepository.findByStatusOrderByCreatedAtAsc(ResourceStatus.PENDING_REVIEW);
        resources.forEach(r -> {
            if (r.getCategory() != null) r.getCategory().getName();
            if (r.getTags() != null) r.getTags().size();
            if (r.getFileReferences() != null) r.getFileReferences().size();
            if (r.getExternalLinks() != null) r.getExternalLinks().size();
            if (r.getReviewFeedbacks() != null) r.getReviewFeedbacks().size();
            if (r.getContributor() != null) r.getContributor().getDisplayName();
        });
        return resources;
    }

    /**
     * Approves a resource. Supports both PENDING_REVIEW and IN_REVIEW resources.
     * For IN_REVIEW resources, validates that the current user is the locked reviewer.
     */
    @Transactional
    public Resource approveResource(UUID resourceId, String email) {
        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        User reviewer = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Validate status and lock ownership
        validateReviewStatusAndLock(resource, reviewer);

        ReviewFeedback feedback = new ReviewFeedback();
        feedback.setResource(resource);
        feedback.setReviewer(reviewer);
        feedback.setComments("Approved");
        feedback.setDecision("APPROVED");
        reviewFeedbackRepository.save(feedback);

        // Clear lock if resource was locked
        clearResourceLock(resource);

        return resourceService.transitionStatus(resourceId, ResourceStatus.APPROVED, reviewer);
    }

    /**
     * Rejects a resource with required feedback comments.
     * Supports both PENDING_REVIEW and IN_REVIEW resources.
     * For IN_REVIEW resources, validates that the current user is the locked reviewer.
     */
    @Transactional
    public Resource rejectResource(UUID resourceId, String email, String comments) {
        if (comments == null || comments.isBlank()) {
            throw new IllegalArgumentException("Feedback comments are required when rejecting a resource");
        }

        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        User reviewer = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Validate status and lock ownership
        validateReviewStatusAndLock(resource, reviewer);

        ReviewFeedback feedback = new ReviewFeedback();
        feedback.setResource(resource);
        feedback.setReviewer(reviewer);
        feedback.setComments(comments);
        feedback.setDecision("REJECTED");
        reviewFeedbackRepository.save(feedback);

        // Clear lock if resource was locked
        clearResourceLock(resource);

        return resourceService.transitionStatus(resourceId, ResourceStatus.REJECTED, reviewer);
    }

    /**
     * Validates that the resource can be reviewed by the current user.
     * Supports PENDING_REVIEW (unlocked) and IN_REVIEW (locked by current user) statuses.
     */
    private void validateReviewStatusAndLock(Resource resource, User currentReviewer) {
        ResourceStatus status = resource.getStatus();
        
        // Check if status is valid for review
        if (status != ResourceStatus.PENDING_REVIEW && status != ResourceStatus.IN_REVIEW) {
            throw new InvalidStatusTransitionException(
                    String.format("Resource is in %s status. Only PENDING_REVIEW or IN_REVIEW resources can be reviewed.",
                            status));
        }
        
        // For IN_REVIEW resources, verify the current user is the locked reviewer
        if (status == ResourceStatus.IN_REVIEW) {
            if (resource.getLockedBy() == null) {
                throw new InvalidStatusTransitionException("Resource is IN_REVIEW but not locked by any user");
            }
            
            if (!resource.getLockedBy().getId().equals(currentReviewer.getId())) {
                throw new TaskLockedByAnotherUserException(
                        "Access denied: This task has been claimed by another user");
            }
        }
    }

    /**
     * Clears the lock fields from a resource.
     */
    private void clearResourceLock(Resource resource) {
        resource.setLockedBy(null);
        resource.setLockedAt(null);
        resourceRepository.save(resource);
    }

    @Transactional(readOnly = true)
    public List<ReviewFeedback> searchReviewHistory(String reviewerEmail, String decision) {
        List<ReviewFeedback> records = reviewFeedbackRepository.searchReviewHistory(reviewerEmail, decision);

        
        records.forEach(rf -> {
            if (rf.getResource() != null) {
                rf.getResource().getId();
                rf.getResource().getTitle();
            }
            if (rf.getReviewer() != null) {
                rf.getReviewer().getDisplayName();
                rf.getReviewer().getEmail();
            }
        });

        return records;
    }

    @Transactional(readOnly = true)
    public List<ReviewHistoryResponse> getReviewHistory(String reviewerEmail, String decision) {
        List<ReviewFeedback> records = searchReviewHistory(reviewerEmail, decision);

        return records.stream()
                .map(ReviewHistoryResponse::fromEntity)
                .toList();
    }
}
