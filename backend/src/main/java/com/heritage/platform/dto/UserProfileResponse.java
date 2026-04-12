package com.heritage.platform.dto;

import com.heritage.platform.model.User;
import com.heritage.platform.model.Resource;

import java.util.List;
import java.util.UUID;

public class UserProfileResponse {

    private UUID id;
    private String email;
    private String displayName;
    private String role;
    private boolean contributorRequested;

    private String avatarUrl;
    private boolean profilePublic;
    private boolean showEmail;
    private String bio;

    private List<ResourceResponse> publishedResources;

    public static UserProfileResponse fromEntity(User user, List<Resource> publishedResources) {
        UserProfileResponse response = new UserProfileResponse();

        response.id = user.getId();
        response.email = user.getEmail();
        response.displayName = user.getDisplayName();
        response.role = user.getRole().name();
        response.contributorRequested = user.isContributorRequested();

        response.avatarUrl = user.getAvatarUrl();
        response.profilePublic = user.isProfilePublic();
        response.showEmail = user.isShowEmail();
        response.bio = user.getBio();

        response.publishedResources = publishedResources == null
                ? List.of()
                : publishedResources.stream()
                        .map(ResourceResponse::fromEntity)
                        .toList();

        return response;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public boolean isContributorRequested() {
        return contributorRequested;
    }

    public void setContributorRequested(boolean contributorRequested) {
        this.contributorRequested = contributorRequested;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public boolean isProfilePublic() {
        return profilePublic;
    }

    public void setProfilePublic(boolean profilePublic) {
        this.profilePublic = profilePublic;
    }

    public boolean isShowEmail() {
        return showEmail;
    }

    public void setShowEmail(boolean showEmail) {
        this.showEmail = showEmail;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public List<ResourceResponse> getPublishedResources() {
        return publishedResources;
    }

    public void setPublishedResources(List<ResourceResponse> publishedResources) {
        this.publishedResources = publishedResources;
    }
}
