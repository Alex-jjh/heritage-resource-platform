package com.heritage.platform.dto;

import com.heritage.platform.model.User;
import com.heritage.platform.model.UserRole;

import java.util.UUID;

public class UserProfileResponse {

    private UUID id;
    private String email;
    private String displayName;
    private UserRole role;
    private boolean contributorRequested;
    private List<ResourceResponse> publishedResources; // Store the resources posted by this user

    public List<ResourceResponse> getPublishedResources() {
        return publishedResources;
    }

    public void setPublishedResources(List<ResourceResponse> publishedResources) {
        this.publishedResources = publishedResources;
    }
    
    public UserProfileResponse() {}

    public static UserProfileResponse fromUser(User user) {
        UserProfileResponse response = new UserProfileResponse();
        response.setId(user.getId());
        response.setEmail(user.getEmail());
        response.setDisplayName(user.getDisplayName());
        response.setRole(user.getRole());
        response.setContributorRequested(user.isContributorRequested());
        return response;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public UserRole getRole() { return role; }
    public void setRole(UserRole role) { this.role = role; }
    public boolean isContributorRequested() { return contributorRequested; }
    public void setContributorRequested(boolean contributorRequested) { this.contributorRequested = contributorRequested; }
}
