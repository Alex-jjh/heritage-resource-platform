package com.heritage.platform.service;

import com.heritage.platform.exception.InvalidStatusTransitionException;
import com.heritage.platform.exception.ResourceNotFoundException;
import com.heritage.platform.model.*;
import com.heritage.platform.repository.ResourceRepository;
import com.heritage.platform.repository.ReviewFeedbackRepository;
import com.heritage.platform.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReviewServiceTest {

    @Mock private ResourceRepository resourceRepository;
    @Mock private ReviewFeedbackRepository reviewFeedbackRepository;
    @Mock private UserRepository userRepository;
    @Mock private ResourceService resourceService;

    private ReviewService reviewService;

    private User reviewer;
    private User contributor;
    private Category category;

    @BeforeEach
    void setUp() {
        reviewService = new ReviewService(
                resourceRepository, reviewFeedbackRepository, userRepository, resourceService);

        reviewer = new User();
        reviewer.setId(UUID.randomUUID());
        reviewer.setCognitoSub("reviewer-sub");
        reviewer.setDisplayName("Reviewer");
        reviewer.setRole(UserRole.REVIEWER);

        contributor = new User();
        contributor.setId(UUID.randomUUID());
        contributor.setCognitoSub("contributor-sub");
        contributor.setDisplayName("Contributor");
        contributor.setRole(UserRole.CONTRIBUTOR);

        category = new Category();
        category.setId(UUID.randomUUID());
        category.setName("Traditions");
    }

    private Resource createPendingResource() {
        Resource resource = new Resource();
        resource.setId(UUID.randomUUID());
        resource.setContributor(contributor);
        resource.setTitle("Heritage Site");
        resource.setCategory(category);
        resource.setCopyrightDeclaration("CC BY 4.0");
        resource.setStatus(ResourceStatus.PENDING_REVIEW);
        resource.setTags(new HashSet<>());
        resource.setFileReferences(new ArrayList<>());
        resource.setExternalLinks(new ArrayList<>());
        resource.setCreatedAt(Instant.now());
        return resource;
    }

    // --- Review queue tests ---

    @Test
    void getReviewQueue_returnsOnlyPendingReviewResources() {
        Resource r1 = createPendingResource();
        Resource r2 = createPendingResource();

        when(resourceRepository.findByStatusOrderByCreatedAtAsc(ResourceStatus.PENDING_REVIEW))
                .thenReturn(List.of(r1, r2));

        List<Resource> queue = reviewService.getReviewQueue();

        assertThat(queue).hasSize(2);
        assertThat(queue).allMatch(r -> r.getStatus() == ResourceStatus.PENDING_REVIEW);
        verify(resourceRepository).findByStatusOrderByCreatedAtAsc(ResourceStatus.PENDING_REVIEW);
    }

    @Test
    void getReviewQueue_emptyWhenNoPendingResources() {
        when(resourceRepository.findByStatusOrderByCreatedAtAsc(ResourceStatus.PENDING_REVIEW))
                .thenReturn(List.of());

        List<Resource> queue = reviewService.getReviewQueue();

        assertThat(queue).isEmpty();
    }

    // --- Approve tests ---

    @Test
    void approveResource_pendingReview_changesStatusToApproved() {
        Resource resource = createPendingResource();
        Resource approvedResource = createPendingResource();
        approvedResource.setStatus(ResourceStatus.APPROVED);
        approvedResource.setApprovedAt(Instant.now());

        when(resourceRepository.findById(resource.getId())).thenReturn(Optional.of(resource));
        when(userRepository.findByCognitoSub("reviewer-sub")).thenReturn(Optional.of(reviewer));
        when(reviewFeedbackRepository.save(any(ReviewFeedback.class))).thenAnswer(inv -> inv.getArgument(0));
        when(resourceService.transitionStatus(resource.getId(), ResourceStatus.APPROVED, reviewer))
                .thenReturn(approvedResource);

        Resource result = reviewService.approveResource(resource.getId(), "reviewer-sub");

        assertThat(result.getStatus()).isEqualTo(ResourceStatus.APPROVED);
    }

    @Test
    void approveResource_recordsReviewerAndFeedback() {
        Resource resource = createPendingResource();

        when(resourceRepository.findById(resource.getId())).thenReturn(Optional.of(resource));
        when(userRepository.findByCognitoSub("reviewer-sub")).thenReturn(Optional.of(reviewer));
        when(reviewFeedbackRepository.save(any(ReviewFeedback.class))).thenAnswer(inv -> inv.getArgument(0));
        when(resourceService.transitionStatus(any(), any(), any())).thenReturn(resource);

        reviewService.approveResource(resource.getId(), "reviewer-sub");

        ArgumentCaptor<ReviewFeedback> captor = ArgumentCaptor.forClass(ReviewFeedback.class);
        verify(reviewFeedbackRepository).save(captor.capture());
        ReviewFeedback saved = captor.getValue();
        assertThat(saved.getReviewer()).isEqualTo(reviewer);
        assertThat(saved.getDecision()).isEqualTo("APPROVED");
        assertThat(saved.getResource()).isEqualTo(resource);
    }

    @Test
    void approveResource_notPendingReview_throwsInvalidTransition() {
        Resource resource = createPendingResource();
        resource.setStatus(ResourceStatus.DRAFT);

        when(resourceRepository.findById(resource.getId())).thenReturn(Optional.of(resource));

        assertThatThrownBy(() ->
                reviewService.approveResource(resource.getId(), "reviewer-sub"))
                .isInstanceOf(InvalidStatusTransitionException.class)
                .hasMessageContaining("DRAFT")
                .hasMessageContaining("PENDING_REVIEW");
    }

    @Test
    void approveResource_resourceNotFound_throwsNotFound() {
        UUID id = UUID.randomUUID();
        when(resourceRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> reviewService.approveResource(id, "reviewer-sub"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // --- Reject tests ---

    @Test
    void rejectResource_withFeedback_changesStatusToRejected() {
        Resource resource = createPendingResource();
        Resource rejectedResource = createPendingResource();
        rejectedResource.setStatus(ResourceStatus.REJECTED);

        when(resourceRepository.findById(resource.getId())).thenReturn(Optional.of(resource));
        when(userRepository.findByCognitoSub("reviewer-sub")).thenReturn(Optional.of(reviewer));
        when(reviewFeedbackRepository.save(any(ReviewFeedback.class))).thenAnswer(inv -> inv.getArgument(0));
        when(resourceService.transitionStatus(resource.getId(), ResourceStatus.REJECTED, reviewer))
                .thenReturn(rejectedResource);

        Resource result = reviewService.rejectResource(resource.getId(), "reviewer-sub", "Needs more detail");

        assertThat(result.getStatus()).isEqualTo(ResourceStatus.REJECTED);
    }

    @Test
    void rejectResource_storesFeedbackComments() {
        Resource resource = createPendingResource();

        when(resourceRepository.findById(resource.getId())).thenReturn(Optional.of(resource));
        when(userRepository.findByCognitoSub("reviewer-sub")).thenReturn(Optional.of(reviewer));
        when(reviewFeedbackRepository.save(any(ReviewFeedback.class))).thenAnswer(inv -> inv.getArgument(0));
        when(resourceService.transitionStatus(any(), any(), any())).thenReturn(resource);

        reviewService.rejectResource(resource.getId(), "reviewer-sub", "Please add more context");

        ArgumentCaptor<ReviewFeedback> captor = ArgumentCaptor.forClass(ReviewFeedback.class);
        verify(reviewFeedbackRepository).save(captor.capture());
        ReviewFeedback saved = captor.getValue();
        assertThat(saved.getComments()).isEqualTo("Please add more context");
        assertThat(saved.getDecision()).isEqualTo("REJECTED");
        assertThat(saved.getReviewer()).isEqualTo(reviewer);
    }

    @Test
    void rejectResource_withNullComments_throwsIllegalArgument() {
        assertThatThrownBy(() ->
                reviewService.rejectResource(UUID.randomUUID(), "reviewer-sub", null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Feedback comments are required");
    }

    @Test
    void rejectResource_withBlankComments_throwsIllegalArgument() {
        assertThatThrownBy(() ->
                reviewService.rejectResource(UUID.randomUUID(), "reviewer-sub", "   "))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Feedback comments are required");
    }

    @Test
    void rejectResource_notPendingReview_throwsInvalidTransition() {
        Resource resource = createPendingResource();
        resource.setStatus(ResourceStatus.APPROVED);

        when(resourceRepository.findById(resource.getId())).thenReturn(Optional.of(resource));

        assertThatThrownBy(() ->
                reviewService.rejectResource(resource.getId(), "reviewer-sub", "Some feedback"))
                .isInstanceOf(InvalidStatusTransitionException.class)
                .hasMessageContaining("APPROVED")
                .hasMessageContaining("PENDING_REVIEW");
    }
}
