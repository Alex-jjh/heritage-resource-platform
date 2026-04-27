package com.heritage.platform.dto;

import com.heritage.platform.model.ReviewFeedback;
import java.time.Instant;
import java.util.UUID;

public class ReviewHistoryResponse {
    private UUID id;
    private UUID resourceId;
    private String resourceTitle;
    private String reviewerName;
    private String reviewerEmail; // 改为 reviewer email
    private String comments;
    private String decision;
    private Instant createdAt;

    public static ReviewHistoryResponse fromEntity(ReviewFeedback rf) {
        ReviewHistoryResponse dto = new ReviewHistoryResponse();
        dto.id = rf.getId();

        if (rf.getResource() != null) {
            dto.resourceId = rf.getResource().getId();
            dto.resourceTitle = rf.getResource().getTitle();
        }

        if (rf.getReviewer() != null) {
            dto.reviewerName = rf.getReviewer().getDisplayName();
            dto.reviewerEmail = rf.getReviewer().getEmail();
        }

        dto.comments = rf.getComments();
        dto.decision = rf.getDecision();
        dto.createdAt = rf.getCreatedAt();

        return dto;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getResourceId() {
        return resourceId;
    }

    public void setResourceId(UUID resourceId) {
        this.resourceId = resourceId;
    }

    public String getResourceTitle() {
        return resourceTitle;
    }

    public void setResourceTitle(String resourceTitle) {
        this.resourceTitle = resourceTitle;
    }

    public String getReviewerName() {
        return reviewerName;
    }

    public void setReviewerName(String reviewerName) {
        this.reviewerName = reviewerName;
    }

    public String getReviewerEmail() {
        return reviewerEmail;
    }

    public void setReviewerEmail(String reviewerEmail) {
        this.reviewerEmail = reviewerEmail;
    }

    public String getComments() {
        return comments;
    }

    public void setComments(String comments) {
        this.comments = comments;
    }

    public String getDecision() {
        return decision;
    }

    public void setDecision(String decision) {
        this.decision = decision;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}