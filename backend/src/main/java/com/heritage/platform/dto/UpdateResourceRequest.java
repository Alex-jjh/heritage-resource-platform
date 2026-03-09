package com.heritage.platform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.Set;
import java.util.UUID;

public class UpdateResourceRequest {

    @NotBlank(message = "Title is required")
    private String title;

    @NotNull(message = "Category is required")
    private UUID categoryId;

    private String place;
    private String description;

    @NotBlank(message = "Copyright declaration is required")
    private String copyrightDeclaration;

    private Set<UUID> tagIds;
    private List<CreateResourceRequest.ExternalLinkDto> externalLinks;

    public UpdateResourceRequest() {}

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
    public List<CreateResourceRequest.ExternalLinkDto> getExternalLinks() { return externalLinks; }
    public void setExternalLinks(List<CreateResourceRequest.ExternalLinkDto> externalLinks) { this.externalLinks = externalLinks; }
}
