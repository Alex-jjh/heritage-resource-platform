package com.heritage.platform.service;

import com.heritage.platform.exception.ResourceNotFoundException;
import com.heritage.platform.model.Comment;
import com.heritage.platform.model.Resource;
import com.heritage.platform.model.ResourceStatus;
import com.heritage.platform.model.User;
import com.heritage.platform.repository.CommentRepository;
import com.heritage.platform.repository.ResourceRepository;
import com.heritage.platform.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final ResourceRepository resourceRepository;
    private final UserRepository userRepository;

    public CommentService(CommentRepository commentRepository,
            ResourceRepository resourceRepository,
            UserRepository userRepository) {
        this.commentRepository = commentRepository;
        this.resourceRepository = resourceRepository;
        this.userRepository = userRepository;
    }

    /**
     * Backward-compatible overload. If the caller has not been updated yet,
     * comments default to non-anonymous.
     */
    @Transactional
    public Comment addComment(UUID resourceId, String email, String body) {
        return addComment(resourceId, email, body, false);
    }

    /**
     * Adds a comment to an approved resource. Rejects comments on non-approved
     * resources and empty comment bodies.
     */
    @Transactional
    public Comment addComment(UUID resourceId, String email, String body, boolean anonymous) {
        if (body == null || body.isBlank()) {
            throw new IllegalArgumentException("Comment body must not be empty");
        }

        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        if (resource.getStatus() != ResourceStatus.APPROVED) {
            throw new IllegalStateException("Comments can only be added to approved resources");
        }

        User author = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Comment comment = new Comment();
        comment.setResource(resource);
        comment.setAuthor(author);
        comment.setBody(body.trim());
        comment.setAnonymous(anonymous);

        return commentRepository.save(comment);
    }

    /**
     * Returns paginated comments for a resource ordered by creation date
     * descending.
     */
    @Transactional(readOnly = true)
    public Page<Comment> getComments(UUID resourceId, Pageable pageable) {
        if (!resourceRepository.existsById(resourceId)) {
            throw new ResourceNotFoundException("Resource not found");
        }

        Page<Comment> comments
                = commentRepository.findByResourceIdOrderByCreatedAtDesc(resourceId, pageable);

        // Force-initialize lazy author association for DTO mapping
        comments.getContent().forEach(c -> {
            if (c.getAuthor() != null) {
                c.getAuthor().getDisplayName();
                c.getAuthor().getAvatarUrl();
            }
        });

        return comments;
    }
}
