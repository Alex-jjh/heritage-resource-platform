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
public class AdminService {

    private final ResourceRepository resourceRepository;
    private final ReviewFeedbackRepository reviewFeedbackRepository;
    private final UserRepository userRepository;
    private final ResourceService resourceService;

    public AdminService(ResourceRepository resourceRepository,
                        ReviewFeedbackRepository reviewFeedbackRepository,
                        UserRepository userRepository,
                        ResourceService resourceService) {
        this.resourceRepository = resourceRepository;
        this.reviewFeedbackRepository = reviewFeedbackRepository;
        this.userRepository = userRepository;
        this.resourceService = resourceService;
    }

    /**
     * Archives an approved resource. Only APPROVED resources can be archived.
     */
    @Transactional
    public Resource archiveResource(UUID resourceId, String email) {
        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        if (resource.getStatus() != ResourceStatus.APPROVED) {
            throw new InvalidStatusTransitionException(
                    String.format("Resource is in %s status. Only APPROVED resources can be archived.",
                            resource.getStatus()));
        }

        User admin = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return resourceService.transitionStatus(resourceId, ResourceStatus.ARCHIVED, admin);
    }

    /**
     * Unpublishes an approved resource by moving it back to DRAFT.
     * Only APPROVED resources can be unpublished.
     */
    @Transactional
    public Resource unpublishResource(UUID resourceId, String email, String reason) {
        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        if (resource.getStatus() != ResourceStatus.APPROVED) {
            throw new InvalidStatusTransitionException(
                    String.format("Resource is in %s status. Only APPROVED resources can be unpublished.",
                            resource.getStatus()));
        }

        User admin = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Record the reason as review feedback
        if (reason != null && !reason.isBlank()) {
            ReviewFeedback feedback = new ReviewFeedback();
            feedback.setResource(resource);
            feedback.setReviewer(admin);
            feedback.setComments(reason);
            feedback.setDecision("UNPUBLISHED");
            reviewFeedbackRepository.save(feedback);
        }

        return resourceService.transitionStatus(resourceId, ResourceStatus.DRAFT, admin);
    }

    /**
     * Restores an archived resource back to APPROVED status.
     */
    @Transactional
    public Resource restoreResource(UUID resourceId, String email) {
        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        if (resource.getStatus() != ResourceStatus.ARCHIVED) {
            throw new InvalidStatusTransitionException(
                    String.format("Resource is in %s status. Only ARCHIVED resources can be restored.",
                            resource.getStatus()));
        }

        User admin = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return resourceService.transitionStatus(resourceId, ResourceStatus.APPROVED, admin);
    }

    /**
     * Returns all archived resources.
     */
    @Transactional(readOnly = true)
    public List<Resource> getArchivedResources() {
        List<Resource> resources = resourceRepository.findByStatusOrderByCreatedAtAsc(ResourceStatus.ARCHIVED);
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
}
