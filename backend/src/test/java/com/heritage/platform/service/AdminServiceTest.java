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
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link AdminService}.
 *
 * <p>Uses Mockito mocks for repository and service dependencies. Verifies
 * administrator-only operations on heritage resources.
 *
 * <p>Key scenarios covered:
 * <ul>
 *   <li>Archiving an approved resource (status transition and timestamp)</li>
 *   <li>Unpublishing an approved resource back to DRAFT with a reason</li>
 *   <li>Guard clauses: non-approved status rejection, resource-not-found errors</li>
 *   <li>Listing archived resources, including the empty-list edge case</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock private ResourceRepository resourceRepository;
    @Mock private ReviewFeedbackRepository reviewFeedbackRepository;
    @Mock private UserRepository userRepository;
    @Mock private ResourceService resourceService;

    private AdminService adminService;

    private User admin;
    private User contributor;
    private Category category;

    @BeforeEach
    void setUp() {
        adminService = new AdminService(resourceRepository, reviewFeedbackRepository, userRepository, resourceService);

        admin = new User();
        admin.setId(UUID.randomUUID());
        admin.setCognitoSub("admin-sub");
        admin.setEmail("admin@example.com");
        admin.setDisplayName("Admin");
        admin.setRole(UserRole.ADMINISTRATOR);

        contributor = new User();
        contributor.setId(UUID.randomUUID());
        contributor.setCognitoSub("contributor-sub");
        contributor.setEmail("contributor@example.com");
        contributor.setDisplayName("Contributor");
        contributor.setRole(UserRole.CONTRIBUTOR);

        category = new Category();
        category.setId(UUID.randomUUID());
        category.setName("Traditions");
    }

    private Resource createApprovedResource() {
        Resource resource = new Resource();
        resource.setId(UUID.randomUUID());
        resource.setContributor(contributor);
        resource.setTitle("Heritage Site");
        resource.setCategory(category);
        resource.setCopyrightDeclaration("CC BY 4.0");
        resource.setStatus(ResourceStatus.APPROVED);
        resource.setTags(new HashSet<>());
        resource.setFileReferences(new ArrayList<>());
        resource.setExternalLinks(new ArrayList<>());
        resource.setCreatedAt(Instant.now());
        resource.setApprovedAt(Instant.now());
        return resource;
    }

    // --- Archive tests ---

    @Test
    void archiveResource_approvedResource_changesStatusToArchived() {
        Resource resource = createApprovedResource();
        Resource archivedResource = createApprovedResource();
        archivedResource.setStatus(ResourceStatus.ARCHIVED);
        archivedResource.setArchivedAt(Instant.now());

        when(resourceRepository.findById(resource.getId())).thenReturn(Optional.of(resource));
        when(userRepository.findByEmail("admin@example.com")).thenReturn(Optional.of(admin));
        when(resourceService.transitionStatus(resource.getId(), ResourceStatus.ARCHIVED, admin))
                .thenReturn(archivedResource);

        Resource result = adminService.archiveResource(resource.getId(), "admin@example.com");

        assertThat(result.getStatus()).isEqualTo(ResourceStatus.ARCHIVED);
        assertThat(result.getArchivedAt()).isNotNull();
        verify(resourceService).transitionStatus(resource.getId(), ResourceStatus.ARCHIVED, admin);
    }

    @Test
    void archiveResource_nonApprovedResource_throwsInvalidTransition() {
        Resource resource = createApprovedResource();
        resource.setStatus(ResourceStatus.DRAFT);

        when(resourceRepository.findById(resource.getId())).thenReturn(Optional.of(resource));

        assertThatThrownBy(() -> adminService.archiveResource(resource.getId(), "admin@example.com"))
                .isInstanceOf(InvalidStatusTransitionException.class)
                .hasMessageContaining("DRAFT")
                .hasMessageContaining("APPROVED");
    }

    @Test
    void archiveResource_resourceNotFound_throwsNotFound() {
        UUID id = UUID.randomUUID();
        when(resourceRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminService.archiveResource(id, "admin@example.com"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // --- Unpublish tests ---

    // Unpublish reverts an approved resource to DRAFT, recording the admin's reason
    @Test
    void unpublishResource_approvedResource_changesStatusToDraft() {
        Resource resource = createApprovedResource();
        Resource draftResource = createApprovedResource();
        draftResource.setStatus(ResourceStatus.DRAFT);

        when(resourceRepository.findById(resource.getId())).thenReturn(Optional.of(resource));
        when(userRepository.findByEmail("admin@example.com")).thenReturn(Optional.of(admin));
        when(resourceService.transitionStatus(resource.getId(), ResourceStatus.DRAFT, admin))
                .thenReturn(draftResource);

        Resource result = adminService.unpublishResource(resource.getId(), "admin@example.com", "Violates guidelines");

        assertThat(result.getStatus()).isEqualTo(ResourceStatus.DRAFT);
        verify(resourceService).transitionStatus(resource.getId(), ResourceStatus.DRAFT, admin);
    }

    @Test
    void unpublishResource_nonApprovedResource_throwsInvalidTransition() {
        Resource resource = createApprovedResource();
        resource.setStatus(ResourceStatus.PENDING_REVIEW);

        when(resourceRepository.findById(resource.getId())).thenReturn(Optional.of(resource));

        assertThatThrownBy(() -> adminService.unpublishResource(resource.getId(), "admin@example.com", "reason"))
                .isInstanceOf(InvalidStatusTransitionException.class)
                .hasMessageContaining("PENDING_REVIEW")
                .hasMessageContaining("APPROVED");
    }

    @Test
    void unpublishResource_resourceNotFound_throwsNotFound() {
        UUID id = UUID.randomUUID();
        when(resourceRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> adminService.unpublishResource(id, "admin@example.com", "reason"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // --- Archived list tests ---

    @Test
    void getArchivedResources_returnsOnlyArchivedResources() {
        Resource r1 = createApprovedResource();
        r1.setStatus(ResourceStatus.ARCHIVED);
        Resource r2 = createApprovedResource();
        r2.setStatus(ResourceStatus.ARCHIVED);

        when(resourceRepository.findByStatusOrderByCreatedAtAsc(ResourceStatus.ARCHIVED))
                .thenReturn(List.of(r1, r2));

        List<Resource> result = adminService.getArchivedResources();

        assertThat(result).hasSize(2);
        assertThat(result).allMatch(r -> r.getStatus() == ResourceStatus.ARCHIVED);
        verify(resourceRepository).findByStatusOrderByCreatedAtAsc(ResourceStatus.ARCHIVED);
    }

    @Test
    void getArchivedResources_emptyWhenNoArchivedResources() {
        when(resourceRepository.findByStatusOrderByCreatedAtAsc(ResourceStatus.ARCHIVED))
                .thenReturn(List.of());

        List<Resource> result = adminService.getArchivedResources();

        assertThat(result).isEmpty();
    }
}
