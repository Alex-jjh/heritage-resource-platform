package com.heritage.platform.dto;

import com.heritage.platform.model.Comment;

import java.time.Instant;
import java.util.UUID;

public class MyCommentResponse {

    private UUID commentId;
    private UUID resourceId;
    private String resourceTitle;
    private String body;
    private Instant createdAt;
    private boolean anonymous;
    private int commentPage;

    public MyCommentResponse() {
    }

    public static MyCommentResponse fromEntity(Comment comment, int commentPage) {
        MyCommentResponse resp = new MyCommentResponse();
        resp.commentId = comment.getId();
        resp.resourceId = comment.getResource().getId();
        resp.resourceTitle = comment.getResource().getTitle();
        resp.body = comment.getBody();
        resp.createdAt = comment.getCreatedAt();
        resp.anonymous = comment.isAnonymous();
        resp.commentPage = commentPage;
        return resp;
    }

    public UUID getCommentId() {
        return commentId;
    }

    public void setCommentId(UUID commentId) {
        this.commentId = commentId;
    }

    public UUID getResourceId() {
        return resourceId;
    }

    public void setResourceId(UUID resourceId) {
        this.resourceId = resourceId;
    }

    public String getResourceTitle() {
        return resourceTitle;
    }

    public void setResourceTitle(String resourceTitle) {
        this.resourceTitle = resourceTitle;
    }

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public boolean isAnonymous() {
        return anonymous;
    }

    public void setAnonymous(boolean anonymous) {
        this.anonymous = anonymous;
    }

    public int getCommentPage() {
        return commentPage;
    }

    public void setCommentPage(int commentPage) {
        this.commentPage = commentPage;
    }
}
