package com.heritage.platform.dto;

import com.heritage.platform.model.ExternalLink;
import com.heritage.platform.model.FileReference;
import com.heritage.platform.model.Resource;
import com.heritage.platform.model.ReviewFeedback;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

public class ResourceResponse {

    private UUID id;
    private String title;
    private CategoryResponse category;
    private String place;
    private String description;
    private String copyrightDeclaration;
    private String status;
    private Set<TagResponse> tags;
    private List<FileReferenceDto> fileReferences;
    private List<ExternalLinkDto> externalLinks;
    private String contributorName;
    private UUID contributorId;
    private String thumbnailS3Key;
    private String thumbnailUrl;
    private List<ReviewFeedbackDto> reviewFeedbacks;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant approvedAt;
    private boolean isFeatured;
    private String featuredStatus;

    public ResourceResponse() {
    }

    public static ResourceResponse fromEntity(Resource resource) {
        return fromEntity(resource, null);
    }

    public static ResourceResponse fromEntity(Resource resource, Function<String, String> thumbnailUrlGenerator) {
        ResourceResponse resp = new ResourceResponse();
        resp.id = resource.getId();
        resp.title = resource.getTitle();
        resp.category = resource.getCategory() != null ? CategoryResponse.fromEntity(resource.getCategory()) : null;
        resp.place = resource.getPlace();
        resp.description = resource.getDescription();
        resp.copyrightDeclaration = resource.getCopyrightDeclaration();
        resp.status = resource.getStatus().name();
        resp.tags = resource.getTags().stream()
                .map(TagResponse::fromEntity)
                .collect(Collectors.toSet());
        resp.fileReferences = resource.getFileReferences().stream()
                .map(FileReferenceDto::fromEntity)
                .toList();
        resp.externalLinks = resource.getExternalLinks().stream()
                .map(ExternalLinkDto::fromEntity)
                .toList();
        resp.contributorName = resource.getContributor().getDisplayName();
        resp.contributorId = resource.getContributor().getId();
        resp.thumbnailS3Key = resource.getThumbnailS3Key();
        if (resource.getThumbnailS3Key() != null && thumbnailUrlGenerator != null) {
            resp.thumbnailUrl = thumbnailUrlGenerator.apply(resource.getThumbnailS3Key());
        }
        resp.reviewFeedbacks = resource.getReviewFeedbacks() != null
                ? resource.getReviewFeedbacks().stream().map(ReviewFeedbackDto::fromEntity).toList()
                : List.of();
        resp.createdAt = resource.getCreatedAt();
        resp.updatedAt = resource.getUpdatedAt();
        resp.approvedAt = resource.getApprovedAt();
        resp.isFeatured = resource.isFeatured();
        resp.featuredStatus = resource.getFeaturedStatus() != null ? resource.getFeaturedStatus().name() : null;
        return resp;
    }

    public static ResourceResponse fromEntityWithFileUrls(Resource resource,
                                                          Function<String, String> downloadUrlGenerator) {
        ResourceResponse resp = new ResourceResponse();
        resp.id = resource.getId();
        resp.title = resource.getTitle();
        resp.category = resource.getCategory() != null ? CategoryResponse.fromEntity(resource.getCategory()) : null;
        resp.place = resource.getPlace();
        resp.description = resource.getDescription();
        resp.copyrightDeclaration = resource.getCopyrightDeclaration();
        resp.status = resource.getStatus().name();
        resp.tags = resource.getTags().stream()
                .map(TagResponse::fromEntity)
                .collect(Collectors.toSet());
        resp.fileReferences = resource.getFileReferences().stream()
                .map(fr -> FileReferenceDto.fromEntityWithUrl(fr, downloadUrlGenerator.apply(fr.getS3Key())))
                .toList();
        resp.externalLinks = resource.getExternalLinks().stream()
                .map(ExternalLinkDto::fromEntity)
                .toList();
        resp.contributorName = resource.getContributor().getDisplayName();
        resp.contributorId = resource.getContributor().getId();
        resp.thumbnailS3Key = resource.getThumbnailS3Key();
        if (resource.getThumbnailS3Key() != null && downloadUrlGenerator != null) {
            resp.thumbnailUrl = downloadUrlGenerator.apply(resource.getThumbnailS3Key());
        }
        resp.reviewFeedbacks = resource.getReviewFeedbacks() != null
                ? resource.getReviewFeedbacks().stream().map(ReviewFeedbackDto::fromEntity).toList()
                : List.of();
        resp.createdAt = resource.getCreatedAt();
        resp.updatedAt = resource.getUpdatedAt();
        resp.approvedAt = resource.getApprovedAt();
        resp.isFeatured = resource.isFeatured();
        resp.featuredStatus = resource.getFeaturedStatus() != null ? resource.getFeaturedStatus().name() : null;
        return resp;
    }

    public UUID getId() { return id; }
    public String getTitle() { return title; }
    public CategoryResponse getCategory() { return category; }
    public String getPlace() { return place; }
    public String getDescription() { return description; }
    public String getCopyrightDeclaration() { return copyrightDeclaration; }
    public String getStatus() { return status; }
    public Set<TagResponse> getTags() { return tags; }
    public List<FileReferenceDto> getFileReferences() { return fileReferences; }
    public List<ExternalLinkDto> getExternalLinks() { return externalLinks; }
    public String getContributorName() { return contributorName; }
    public UUID getContributorId() { return contributorId; }
    public String getThumbnailS3Key() { return thumbnailS3Key; }
    public String getThumbnailUrl() { return thumbnailUrl; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getApprovedAt() { return approvedAt; }
    public List<ReviewFeedbackDto> getReviewFeedbacks() { return reviewFeedbacks; }
    public boolean isFeatured() { return isFeatured; }
    public String getFeaturedStatus() { return featuredStatus; }

    public static class FileReferenceDto {
        private UUID id;
        private String s3Key;
        private String originalFileName;
        private String contentType;
        private Long fileSize;
        private String downloadUrl;

        public static FileReferenceDto fromEntity(FileReference fr) {
            FileReferenceDto dto = new FileReferenceDto();
            dto.id = fr.getId();
            dto.s3Key = fr.getS3Key();
            dto.originalFileName = fr.getOriginalFileName();
            dto.contentType = fr.getContentType();
            dto.fileSize = fr.getFileSize();
            return dto;
        }

        public static FileReferenceDto fromEntityWithUrl(FileReference fr, String downloadUrl) {
            FileReferenceDto dto = fromEntity(fr);
            dto.downloadUrl = downloadUrl;
            return dto;
        }

        public UUID getId() { return id; }
        public String getS3Key() { return s3Key; }
        public String getOriginalFileName() { return originalFileName; }
        public String getContentType() { return contentType; }
        public Long getFileSize() { return fileSize; }
        public String getDownloadUrl() { return downloadUrl; }
    }

    public static class ExternalLinkDto {
        private UUID id;
        private String url;
        private String label;

        public static ExternalLinkDto fromEntity(ExternalLink el) {
            ExternalLinkDto dto = new ExternalLinkDto();
            dto.id = el.getId();
            dto.url = el.getUrl();
            dto.label = el.getLabel();
            return dto;
        }

        public UUID getId() { return id; }
        public String getUrl() { return url; }
        public String getLabel() { return label; }
    }

    public static class ReviewFeedbackDto {
        private UUID id;
        private UUID resourceId;
        private UUID reviewerId;
        private String comments;
        private String decision;
        private Instant createdAt;

        public static ReviewFeedbackDto fromEntity(ReviewFeedback rf) {
            ReviewFeedbackDto dto = new ReviewFeedbackDto();
            dto.id = rf.getId();
            dto.resourceId = rf.getResource().getId();
            dto.reviewerId = rf.getReviewer().getId();
            dto.comments = rf.getComments();
            dto.decision = rf.getDecision();
            dto.createdAt = rf.getCreatedAt();
            return dto;
        }

        public UUID getId() { return id; }
        public UUID getResourceId() { return resourceId; }
        public UUID getReviewerId() { return reviewerId; }
        public String getComments() { return comments; }
        public String getDecision() { return decision; }
        public Instant getCreatedAt() { return createdAt; }
    }
}