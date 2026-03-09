package com.heritage.platform.dto;

import com.heritage.platform.model.*;

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
    private Instant createdAt;
    private Instant updatedAt;
    private Instant approvedAt;

    public ResourceResponse() {}

    public static ResourceResponse fromEntity(Resource resource) {
        ResourceResponse resp = new ResourceResponse();
        resp.id = resource.getId();
        resp.title = resource.getTitle();
        resp.category = CategoryResponse.fromEntity(resource.getCategory());
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
        resp.createdAt = resource.getCreatedAt();
        resp.updatedAt = resource.getUpdatedAt();
        resp.approvedAt = resource.getApprovedAt();
        return resp;
    }

    /**
     * Creates a ResourceResponse with pre-signed download URLs for all file attachments.
     * Used for the public detail view of approved resources.
     *
     * @param resource the resource entity
     * @param downloadUrlGenerator function that takes an S3 key and returns a pre-signed download URL
     */
    public static ResourceResponse fromEntityWithFileUrls(Resource resource,
                                                          Function<String, String> downloadUrlGenerator) {
        ResourceResponse resp = new ResourceResponse();
        resp.id = resource.getId();
        resp.title = resource.getTitle();
        resp.category = CategoryResponse.fromEntity(resource.getCategory());
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
        resp.createdAt = resource.getCreatedAt();
        resp.updatedAt = resource.getUpdatedAt();
        resp.approvedAt = resource.getApprovedAt();
        return resp;
    }

    // Getters
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
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getApprovedAt() { return approvedAt; }

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
}
