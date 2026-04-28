package com.heritage.platform.dto;

import com.heritage.platform.model.Comment;

import java.time.Instant;
import java.util.UUID;

public class CommentResponse {

    private UUID id;
    private UUID resourceId;
    private UUID authorId;
    private String authorName;
    private String avatarUrl;
    private boolean anonymous;
    private boolean profileClickable;
    private String body;
    private Instant createdAt;

    public CommentResponse() {
    }

    public static CommentResponse fromEntity(Comment comment) {
        CommentResponse resp = new CommentResponse();
        resp.id = comment.getId();
        resp.resourceId = comment.getResource().getId();
        resp.body = comment.getBody();
        resp.createdAt = comment.getCreatedAt();
        resp.anonymous = comment.isAnonymous();

        if (comment.isAnonymous()) {
            resp.authorId = null;
            resp.authorName = "Anonymous";
            resp.avatarUrl = null;
            resp.profileClickable = false;
        } else {
            resp.authorId = comment.getAuthor().getId();
            resp.authorName = comment.getAuthor().getDisplayName();
            resp.avatarUrl = comment.getAuthor().getAvatarUrl();
            resp.profileClickable = true;
        }

        return resp;
    }

    public UUID getId() {
        return id;
    }

    public UUID getResourceId() {
        return resourceId;
    }

    public UUID getAuthorId() {
        return authorId;
    }

    public String getAuthorName() {
        return authorName;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public boolean isAnonymous() {
        return anonymous;
    }

    public boolean isProfileClickable() {
        return profileClickable;
    }

    public String getBody() {
        return body;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
