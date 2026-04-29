package com.heritage.platform.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.util.List;
import java.util.Set;
import java.util.UUID;

public class CreateResourceRequest {

    private String title;

    private UUID categoryId;

    private String place;
    private String description;

    private String copyrightDeclaration;

    private Set<UUID> tagIds;

    @Valid
    private List<ExternalLinkDto> externalLinks;

    public CreateResourceRequest() {}

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public UUID getCategoryId() { return categoryId; }
    public void setCategoryId(UUID categoryId) { this.categoryId = categoryId; }
    public String getPlace() { return place; }
    public void setPlace(String place) { this.place = place; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getCopyrightDeclaration() { return copyrightDeclaration; }
    public void setCopyrightDeclaration(String copyrightDeclaration) { this.copyrightDeclaration = copyrightDeclaration; }
    public Set<UUID> getTagIds() { return tagIds; }
    public void setTagIds(Set<UUID> tagIds) { this.tagIds = tagIds; }
    public List<ExternalLinkDto> getExternalLinks() { return externalLinks; }
    public void setExternalLinks(List<ExternalLinkDto> externalLinks) { this.externalLinks = externalLinks; }

    public static class ExternalLinkDto {
        @NotBlank(message = "URL is required")
        @Pattern(
                regexp = "^https?://[\\w.-]+(?:\\.[\\w.-]+)+(?:[\\w\\-._~:/?#\\[\\]@!$&'()*+,;=%]*)?$",
                message = "URL must be a valid http or https address"
        )
        private String url;
        private String label;

        public ExternalLinkDto() {}
        public ExternalLinkDto(String url, String label) { this.url = url; this.label = label; }

        public String getUrl() { return url; }
        public void setUrl(String url) { this.url = normalize(url); }
        public String getLabel() { return label; }
        public void setLabel(String label) { this.label = normalize(label); }

        private String normalize(String value) {
            if (value == null) {
                return null;
            }
            String trimmed = value.trim();
            return trimmed.isEmpty() ? null : trimmed;
        }
    }
}
