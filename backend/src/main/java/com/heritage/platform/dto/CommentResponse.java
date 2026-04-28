package com.heritage.platform.dto;

import com.heritage.platform.model.Comment;

import java.time.Instant;
import java.util.UUID;

public class CommentResponse {

    private UUID id;
    private UUID resourceId;
    private UUID authorId;
    private String authorName;
    private String body;
    private Instant createdAt;

    public CommentResponse() {}

    public static CommentResponse fromEntity(Comment comment) {
        CommentResponse resp = new CommentResponse();
        resp.id = comment.getId();
        resp.resourceId = comment.getResource().getId();
        resp.authorId = comment.getAuthor().getId();
        resp.authorName = comment.getAuthor().getDisplayName();
        resp.body = comment.getBody();
        resp.createdAt = comment.getCreatedAt();
        return resp;
    }

    public UUID getId() { return id; }
    public UUID getResourceId() { return resourceId; }
    public UUID getAuthorId() { return authorId; }
    public String getAuthorName() { return authorName; }
    public String getBody() { return body; }
    public Instant getCreatedAt() { return createdAt; }
}
