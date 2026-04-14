package com.heritage.platform.controller;

import com.heritage.platform.dto.CommentResponse;
import com.heritage.platform.dto.CreateCommentRequest;
import com.heritage.platform.dto.MyCommentResponse;
import com.heritage.platform.model.Comment;
import com.heritage.platform.service.CommentService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/api/comments")
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    @PostMapping("/{resourceId}")
    public ResponseEntity<CommentResponse> addComment(
            @PathVariable UUID resourceId,
            Principal principal,
            @Valid @RequestBody CreateCommentRequest request
    ) {
        Comment comment = commentService.addComment(
                resourceId,
                principal.getName(),
                request.getBody(),
                request.isAnonymous()
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(CommentResponse.fromEntity(comment));
    }

    @GetMapping("/{resourceId}")
    public ResponseEntity<Page<CommentResponse>> getComments(
            @PathVariable UUID resourceId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);

        Page<CommentResponse> comments = commentService.getComments(resourceId, pageable)
                .map(CommentResponse::fromEntity);

        return ResponseEntity.ok(comments);
    }

    @GetMapping("/me")
    public ResponseEntity<Page<MyCommentResponse>> getMyComments(
            Principal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);

        Page<MyCommentResponse> comments = commentService.getMyComments(
                principal.getName(),
                pageable
        );

        return ResponseEntity.ok(comments);
    }
}
