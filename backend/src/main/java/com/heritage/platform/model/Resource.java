package com.heritage.platform.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;

@Entity
@Table(name = "resources")
public class Resource {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contributor_id", nullable = false)
    private User contributor;

    @Column(nullable = false)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    private String place;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String copyrightDeclaration;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ResourceStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "locked_by")
    private User lockedBy;

    private Instant lockedAt;

    @Column(nullable = false)
    private Integer reviewPriority = 0;

    @ManyToMany
    @JoinTable(name = "resource_tags",
        joinColumns = @JoinColumn(name = "resource_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id"))
    private Set<Tag> tags = new HashSet<>();

    @OneToMany(mappedBy = "resource", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FileReference> fileReferences = new ArrayList<>();

    @OneToMany(mappedBy = "resource", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ExternalLink> externalLinks = new ArrayList<>();

    @OneToMany(mappedBy = "resource", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Comment> comments = new ArrayList<>();

    @OneToMany(mappedBy = "resource", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<StatusTransition> statusTransitions = new ArrayList<>();

    @OneToMany(mappedBy = "resource", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ReviewFeedback> reviewFeedbacks = new ArrayList<>();

    private String thumbnailS3Key;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant approvedAt;
    private Instant archivedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public User getContributor() { return contributor; }
    public void setContributor(User contributor) { this.contributor = contributor; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }
    public String getPlace() { return place; }
    public void setPlace(String place) { this.place = place; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getCopyrightDeclaration() { return copyrightDeclaration; }
    public void setCopyrightDeclaration(String copyrightDeclaration) { this.copyrightDeclaration = copyrightDeclaration; }
    public ResourceStatus getStatus() { return status; }
    public void setStatus(ResourceStatus status) { this.status = status; }
    public Set<Tag> getTags() { return tags; }
    public void setTags(Set<Tag> tags) { this.tags = tags; }
    public List<FileReference> getFileReferences() { return fileReferences; }
    public void setFileReferences(List<FileReference> fileReferences) { this.fileReferences = fileReferences; }
    public List<ExternalLink> getExternalLinks() { return externalLinks; }
    public void setExternalLinks(List<ExternalLink> externalLinks) { this.externalLinks = externalLinks; }
    public List<Comment> getComments() { return comments; }
    public void setComments(List<Comment> comments) { this.comments = comments; }
    public List<StatusTransition> getStatusTransitions() { return statusTransitions; }
    public void setStatusTransitions(List<StatusTransition> statusTransitions) { this.statusTransitions = statusTransitions; }
    public List<ReviewFeedback> getReviewFeedbacks() { return reviewFeedbacks; }
    public void setReviewFeedbacks(List<ReviewFeedback> reviewFeedbacks) { this.reviewFeedbacks = reviewFeedbacks; }
    public String getThumbnailS3Key() { return thumbnailS3Key; }
    public void setThumbnailS3Key(String thumbnailS3Key) { this.thumbnailS3Key = thumbnailS3Key; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public Instant getApprovedAt() { return approvedAt; }
    public void setApprovedAt(Instant approvedAt) { this.approvedAt = approvedAt; }
    public Instant getArchivedAt() { return archivedAt; }
    public void setArchivedAt(Instant archivedAt) { this.archivedAt = archivedAt; }
    public User getLockedBy() { return lockedBy; }
    public void setLockedBy(User lockedBy) { this.lockedBy = lockedBy; }
    public Instant getLockedAt() { return lockedAt; }
    public void setLockedAt(Instant lockedAt) { this.lockedAt = lockedAt; }
    public Integer getReviewPriority() { return reviewPriority; }
    public void setReviewPriority(Integer reviewPriority) { this.reviewPriority = reviewPriority; }
}
