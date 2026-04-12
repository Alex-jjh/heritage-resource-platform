package com.heritage.platform.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = true)
    private String cognitoSub;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = true)
    private String passwordHash;

    @Column(nullable = false)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role;

    @Column(nullable = false)
    private boolean contributorRequested;

    @Column(length = 500)
    private String avatarUrl;

    @Column(nullable = false)
    private boolean profilePublic = true;

    @Column(nullable = false)
    private boolean showEmail = false;

    @Column(columnDefinition = "TEXT")
    private String bio;

    private Instant createdAt;
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();

        if (bio != null && bio.isBlank()) {
            bio = null;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();

        if (bio != null && bio.isBlank()) {
            bio = null;
        }
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getCognitoSub() {
        return cognitoSub;
    }

    public void setCognitoSub(String cognitoSub) {
        this.cognitoSub = cognitoSub;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public UserRole getRole() {
        return role;
    }

    public void setRole(UserRole role) {
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
        this.bio = (bio != null && bio.isBlank()) ? null : bio;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
