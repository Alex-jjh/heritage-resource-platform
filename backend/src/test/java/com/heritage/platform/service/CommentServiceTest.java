package com.heritage.platform.service;

import com.heritage.platform.exception.ResourceNotFoundException;
import com.heritage.platform.model.*;
import com.heritage.platform.repository.CommentRepository;
import com.heritage.platform.repository.ResourceRepository;
import com.heritage.platform.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @Mock private CommentRepository commentRepository;
    @Mock private ResourceRepository resourceRepository;
    @Mock private UserRepository userRepository;

    private CommentService commentService;

    private User author;
    private Resource approvedResource;
    private Category category;

    @BeforeEach
    void setUp() {
        commentService = new CommentService(commentRepository, resourceRepository, userRepository);

        author = new User();
        author.setId(UUID.randomUUID());
        author.setEmail("author@example.com");
        author.setDisplayName("Test Author");
        author.setRole(UserRole.REGISTERED_VIEWER);

        category = new Category();
        category.setId(UUID.randomUUID());
        category.setName("Traditions");

        approvedResource = new Resource();
        approvedResource.setId(UUID.randomUUID());
        approvedResource.setContributor(author);
        approvedResource.setTitle("Heritage Site");
        approvedResource.setCategory(category);
        approvedResource.setCopyrightDeclaration("CC BY 4.0");
        approvedResource.setStatus(ResourceStatus.APPROVED);
        approvedResource.setTags(new HashSet<>());
        approvedResource.setFileReferences(new ArrayList<>());
        approvedResource.setExternalLinks(new ArrayList<>());
        approvedResource.setCreatedAt(Instant.now());
    }

    // --- Add comment tests ---

    @Test
    void addComment_toApprovedResource_succeeds() {
        when(resourceRepository.findById(approvedResource.getId())).thenReturn(Optional.of(approvedResource));
        when(userRepository.findByEmail("author@example.com")).thenReturn(Optional.of(author));
        when(commentRepository.save(any(Comment.class))).thenAnswer(inv -> {
            Comment c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        Comment result = commentService.addComment(approvedResource.getId(), "author@example.com", "Great resource!");

        assertThat(result).isNotNull();
        assertThat(result.getBody()).isEqualTo("Great resource!");
        assertThat(result.getAuthor()).isEqualTo(author);
        assertThat(result.getResource()).isEqualTo(approvedResource);

        ArgumentCaptor<Comment> captor = ArgumentCaptor.forClass(Comment.class);
        verify(commentRepository).save(captor.capture());
        Comment saved = captor.getValue();
        assertThat(saved.getBody()).isEqualTo("Great resource!");
        assertThat(saved.getAuthor()).isEqualTo(author);
    }

    @Test
    void addComment_toDraftResource_throwsIllegalState() {
        Resource draftResource = new Resource();
        draftResource.setId(UUID.randomUUID());
        draftResource.setStatus(ResourceStatus.DRAFT);

        when(resourceRepository.findById(draftResource.getId())).thenReturn(Optional.of(draftResource));

        assertThatThrownBy(() ->
                commentService.addComment(draftResource.getId(), "author@example.com", "A comment"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("approved");
    }

    @Test
    void addComment_toPendingReviewResource_throwsIllegalState() {
        Resource pendingResource = new Resource();
        pendingResource.setId(UUID.randomUUID());
        pendingResource.setStatus(ResourceStatus.PENDING_REVIEW);

        when(resourceRepository.findById(pendingResource.getId())).thenReturn(Optional.of(pendingResource));

        assertThatThrownBy(() ->
                commentService.addComment(pendingResource.getId(), "author@example.com", "A comment"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("approved");
    }

    @Test
    void addComment_toRejectedResource_throwsIllegalState() {
        Resource rejectedResource = new Resource();
        rejectedResource.setId(UUID.randomUUID());
        rejectedResource.setStatus(ResourceStatus.REJECTED);

        when(resourceRepository.findById(rejectedResource.getId())).thenReturn(Optional.of(rejectedResource));

        assertThatThrownBy(() ->
                commentService.addComment(rejectedResource.getId(), "author@example.com", "A comment"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("approved");
    }

    @Test
    void addComment_toArchivedResource_throwsIllegalState() {
        Resource archivedResource = new Resource();
        archivedResource.setId(UUID.randomUUID());
        archivedResource.setStatus(ResourceStatus.ARCHIVED);

        when(resourceRepository.findById(archivedResource.getId())).thenReturn(Optional.of(archivedResource));

        assertThatThrownBy(() ->
                commentService.addComment(archivedResource.getId(), "author@example.com", "A comment"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("approved");
    }

    @Test
    void addComment_withNullBody_throwsIllegalArgument() {
        assertThatThrownBy(() ->
                commentService.addComment(approvedResource.getId(), "author@example.com", null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("empty");
    }

    @Test
    void addComment_withBlankBody_throwsIllegalArgument() {
        assertThatThrownBy(() ->
                commentService.addComment(approvedResource.getId(), "author@example.com", "   "))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("empty");
    }

    @Test
    void addComment_resourceNotFound_throwsNotFound() {
        UUID id = UUID.randomUUID();
        when(resourceRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                commentService.addComment(id, "author@example.com", "A comment"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void addComment_userNotFound_throwsNotFound() {
        when(resourceRepository.findById(approvedResource.getId())).thenReturn(Optional.of(approvedResource));
        when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                commentService.addComment(approvedResource.getId(), "unknown@example.com", "A comment"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // --- Get comments tests ---

    @Test
    void getComments_returnsDescendingTimestampOrder() {
        Comment c1 = new Comment();
        c1.setId(UUID.randomUUID());
        c1.setResource(approvedResource);
        c1.setAuthor(author);
        c1.setBody("First comment");
        c1.setCreatedAt(Instant.parse("2025-01-01T10:00:00Z"));

        Comment c2 = new Comment();
        c2.setId(UUID.randomUUID());
        c2.setResource(approvedResource);
        c2.setAuthor(author);
        c2.setBody("Second comment");
        c2.setCreatedAt(Instant.parse("2025-01-02T10:00:00Z"));

        Pageable pageable = PageRequest.of(0, 20);
        Page<Comment> page = new PageImpl<>(List.of(c2, c1), pageable, 2);

        when(resourceRepository.existsById(approvedResource.getId())).thenReturn(true);
        when(commentRepository.findByResourceIdOrderByCreatedAtDesc(approvedResource.getId(), pageable))
                .thenReturn(page);

        Page<Comment> result = commentService.getComments(approvedResource.getId(), pageable);

        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getContent().get(0).getCreatedAt())
                .isAfter(result.getContent().get(1).getCreatedAt());
    }

    @Test
    void getComments_resourceNotFound_throwsNotFound() {
        UUID id = UUID.randomUUID();
        when(resourceRepository.existsById(id)).thenReturn(false);

        assertThatThrownBy(() ->
                commentService.getComments(id, PageRequest.of(0, 20)))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getComments_emptyPage_returnsEmptyResult() {
        Pageable pageable = PageRequest.of(0, 20);
        Page<Comment> emptyPage = new PageImpl<>(List.of(), pageable, 0);

        when(resourceRepository.existsById(approvedResource.getId())).thenReturn(true);
        when(commentRepository.findByResourceIdOrderByCreatedAtDesc(approvedResource.getId(), pageable))
                .thenReturn(emptyPage);

        Page<Comment> result = commentService.getComments(approvedResource.getId(), pageable);

        assertThat(result.getContent()).isEmpty();
        assertThat(result.getTotalElements()).isZero();
    }
}
