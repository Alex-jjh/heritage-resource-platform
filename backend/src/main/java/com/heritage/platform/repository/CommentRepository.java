package com.heritage.platform.repository;

import com.heritage.platform.model.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.UUID;

@Repository
public interface CommentRepository extends JpaRepository<Comment, UUID> {

    /**
     * Resource detail page comments: newest first.
     */
    Page<Comment> findByResourceIdOrderByCreatedAtDesc(UUID resourceId, Pageable pageable);

    /**
     * "My Comments" page: current user's comments, newest first.
     */
    Page<Comment> findByAuthorEmailOrderByCreatedAtDesc(String email, Pageable pageable);
    long countByResourceIdAndCreatedAtAfter(UUID resourceId, Instant createdAt);
}
