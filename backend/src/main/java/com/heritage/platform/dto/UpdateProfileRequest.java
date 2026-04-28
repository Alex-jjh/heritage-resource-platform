package com.heritage.platform.dto;

import jakarta.validation.constraints.Size;

public class UpdateProfileRequest {

    @Size(min = 1, max = 100, message = "Display name must be between 1 and 100 characters")
    private String displayName;

    @Size(max = 500, message = "Avatar URL must be at most 500 characters")
    private String avatarUrl;

    private Boolean profilePublic;

    private Boolean showEmail;

    @Size(max = 1000, message = "Bio must be at most 1000 characters")
    private String bio;

    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = normalize(displayName);
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = normalize(avatarUrl);
    }

    public Boolean getProfilePublic() {
        return profilePublic;
    }

    public void setProfilePublic(Boolean profilePublic) {
        this.profilePublic = profilePublic;
    }

    public Boolean getShowEmail() {
        return showEmail;
    }

    public void setShowEmail(Boolean showEmail) {
        this.showEmail = showEmail;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = normalizeMultiline(bio);
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = normalize(password);
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeMultiline(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.strip();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
