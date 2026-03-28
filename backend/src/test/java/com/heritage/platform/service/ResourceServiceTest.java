package com.heritage.platform.service;

import com.heritage.platform.dto.CreateResourceRequest;
import com.heritage.platform.dto.UpdateResourceRequest;
import com.heritage.platform.exception.AccessDeniedException;
import com.heritage.platform.exception.ResourceNotFoundException;
import com.heritage.platform.model.*;
import com.heritage.platform.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link ResourceService}.
 *
 * <p>Uses Mockito mocks for all repository dependencies. Tests cover the full
 * resource lifecycle managed by contributors: creation, update, deletion,
 * submission for review, and visibility rules.
 *
 * <p>Key scenarios covered:
 * <ul>
 *   <li>Resource creation with tags, external links, and default DRAFT status</li>
 *   <li>Update and delete restricted to DRAFT status and resource owner</li>
 *   <li>Submit-for-review validation (title, copyright required)</li>
 *   <li>Visibility rules: approved resources visible to all, drafts only to owner/admin</li>
 *   <li>Listing a contributor's own resources</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
class ResourceServiceTest {

    @Mock private ResourceRepository resourceRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private TagRepository tagRepository;
    @Mock private UserRepository userRepository;
    @Mock private StatusTransitionRepository statusTransitionRepository;

    private ResourceService resourceService;

    private User contributor;
    private User otherUser;
    private Category category;

    @BeforeEach
    void setUp() {
        resourceService = new ResourceService(
                resourceRepository, categoryRepository, tagRepository,
                userRepository, statusTransitionRepository);

        contributor = new User();
        contributor.setId(UUID.randomUUID());
        contributor.setEmail("contributor@example.com");
        contributor.setDisplayName("Contributor");
        contributor.setRole(UserRole.CONTRIBUTOR);

        otherUser = new User();
        otherUser.setId(UUID.randomUUID());
        otherUser.setEmail("other@example.com");
        otherUser.setDisplayName("Other");
        otherUser.setRole(UserRole.CONTRIBUTOR);

        category = new Category();
        category.setId(UUID.randomUUID());
        category.setName("Traditions");
    }

    private CreateResourceRequest validCreateRequest() {
        CreateResourceRequest req = new CreateResourceRequest();
        req.setTitle("Heritage Site");
        req.setCategoryId(category.getId());
        req.setPlace("Old Town");
        req.setDescription("A historic site");
        req.setCopyrightDeclaration("CC BY 4.0");
        return req;
    }

    private Resource createDraftResource() {
        Resource resource = new Resource();
        resource.setId(UUID.randomUUID());
        resource.setContributor(contributor);
        resource.setTitle("Heritage Site");
        resource.setCategory(category);
        resource.setCopyrightDeclaration("CC BY 4.0");
        resource.setStatus(ResourceStatus.DRAFT);
        resource.setTags(new HashSet<>());
        resource.setFileReferences(new ArrayList<>());
        resource.setExternalLinks(new ArrayList<>());
        return resource;
    }

    // --- Create tests ---

    @Test
    void createResource_withValidData_setsStatusToDraft() {
        when(userRepository.findByEmail("contributor@example.com")).thenReturn(Optional.of(contributor));
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(resourceRepository.save(any(Resource.class))).thenAnswer(inv -> {
            Resource r = inv.getArgument(0);
            r.setId(UUID.randomUUID());
            return r;
        });

        Resource result = resourceService.createResource("contributor@example.com", validCreateRequest());

        assertThat(result.getStatus()).isEqualTo(ResourceStatus.DRAFT);
        assertThat(result.getTitle()).isEqualTo("Heritage Site");
        assertThat(result.getContributor().getId()).isEqualTo(contributor.getId());
        verify(resourceRepository).save(any(Resource.class));
    }

    @Test
    void createResource_withTags_associatesTags() {
        Tag tag1 = new Tag();
        tag1.setId(UUID.randomUUID());
        tag1.setName("ancient");
        Tag tag2 = new Tag();
        tag2.setId(UUID.randomUUID());
        tag2.setName("cultural");

        CreateResourceRequest req = validCreateRequest();
        req.setTagIds(Set.of(tag1.getId(), tag2.getId()));

        when(userRepository.findByEmail("contributor@example.com")).thenReturn(Optional.of(contributor));
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(tagRepository.findAllById(req.getTagIds())).thenReturn(List.of(tag1, tag2));
        when(resourceRepository.save(any(Resource.class))).thenAnswer(inv -> inv.getArgument(0));

        Resource result = resourceService.createResource("contributor@example.com", req);

        assertThat(result.getTags()).hasSize(2);
    }

    @Test
    void createResource_withExternalLinks_addsLinks() {
        CreateResourceRequest req = validCreateRequest();
        req.setExternalLinks(List.of(
                new CreateResourceRequest.ExternalLinkDto("https://example.com", "Example")));

        when(userRepository.findByEmail("contributor@example.com")).thenReturn(Optional.of(contributor));
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(resourceRepository.save(any(Resource.class))).thenAnswer(inv -> inv.getArgument(0));

        Resource result = resourceService.createResource("contributor@example.com", req);

        assertThat(result.getExternalLinks()).hasSize(1);
        assertThat(result.getExternalLinks().get(0).getUrl()).isEqualTo("https://example.com");
    }

    // --- Update tests ---

    @Test
    void updateResource_inDraftByOwner_succeeds() {
        Resource resource = createDraftResource();
        UpdateResourceRequest req = new UpdateResourceRequest();
        req.setTitle("Updated Title");
        req.setCategoryId(category.getId());
        req.setCopyrightDeclaration("CC BY 4.0");

        when(resourceRepository.findById(resource.getId())).thenReturn(Optional.of(resource));
        when(userRepository.findByEmail("contributor@example.com")).thenReturn(Optional.of(contributor));
        when(categoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(resourceRepository.save(any(Resource.class))).thenAnswer(inv -> inv.getArgument(0));

        Resource result = resourceService.updateResource(resource.getId(), "contributor@example.com", req);

        assertThat(result.getTitle()).isEqualTo("Updated Title");
    }

    @Test
    void updateResource_notInDraftStatus_throwsIllegalState() {
        Resource resource = createDraftResource();
        resource.setStatus(ResourceStatus.PENDING_REVIEW);

        when(resourceRepository.findById(resource.getId())).thenReturn(Optional.of(resource));
        when(userRepository.findByEmail("contributor@example.com")).thenReturn(Optional.of(contributor));

        UpdateResourceRequest req = new UpdateResourceRequest();
        req.setTitle("Updated");
        req.setCategoryId(category.getId());
        req.setCopyrightDeclaration("CC BY 4.0");

        assertThatThrownBy(() ->
                resourceService.updateResource(resource.getId(), "contributor@example.com", req))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("DRAFT");
    }

    @Test
    void updateResource_byNonOwner_throwsAccessDenied() {
        Resource resource = createDraftResource();

        when(resourceRepository.findById(resource.getId())).thenReturn(Optional.of(resource));
        when(userRepository.findByEmail("other@example.com")).thenReturn(Optional.of(otherUser));

        UpdateResourceRequest req = new UpdateResourceRequest();
        req.setTitle("Updated");
        req.setCategoryId(category.getId());
        req.setCopyrightDeclaration("CC BY 4.0");

        assertThatThrownBy(() ->
                resourceService.updateResource(resource.getId(), "other@example.com", req))
                .isInstanceOf(AccessDeniedException.class);
    }

    // --- Delete tests ---

    // Only DRAFT resources can be permanently deleted (hard delete, not soft)
    @Test
    void deleteResource_draftByOwner_performsHardDelete() {
        Resource resource = createDraftResource();

        when(resourceRepository.findById(resource.getId())).thenReturn(Optional.of(resource));
        when(userRepository.findByEmail("contributor@example.com")).thenReturn(Optional.of(contributor));

        resourceService.deleteResource(resource.getId(), "contributor@example.com");

        verify(resourceRepository).delete(resource);
    }

    @Test
    void deleteResource_nonDraft_throwsIllegalState() {
        Resource resource = createDraftResource();
        resource.setStatus(ResourceStatus.APPROVED);

        when(resourceRepository.findById(resource.getId())).thenReturn(Optional.of(resource));
        when(userRepository.findByEmail("contributor@example.com")).thenReturn(Optional.of(contributor));

        assertThatThrownBy(() ->
                resourceService.deleteResource(resource.getId(), "contributor@example.com"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("DRAFT");
    }

    // --- Submit for review tests ---

    @Test
    void submitForReview_withValidMetadata_transitionsToPendingReview() {
        Resource resource = createDraftResource();

        when(resourceRepository.findById(resource.getId())).thenReturn(Optional.of(resource));
        when(userRepository.findByEmail("contributor@example.com")).thenReturn(Optional.of(contributor));
        when(resourceRepository.save(any(Resource.class))).thenAnswer(inv -> inv.getArgument(0));
        when(statusTransitionRepository.save(any(StatusTransition.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        Resource result = resourceService.submitForReview(resource.getId(), "contributor@example.com");

        assertThat(result.getStatus()).isEqualTo(ResourceStatus.PENDING_REVIEW);
    }

    @Test
    void submitForReview_withMissingTitle_throwsIllegalState() {
        Resource resource = createDraftResource();
        resource.setTitle(null);

        when(resourceRepository.findById(resource.getId())).thenReturn(Optional.of(resource));
        when(userRepository.findByEmail("contributor@example.com")).thenReturn(Optional.of(contributor));

        assertThatThrownBy(() ->
                resourceService.submitForReview(resource.getId(), "contributor@example.com"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("title");
    }

    @Test
    void submitForReview_withMissingCopyright_throwsIllegalState() {
        Resource resource = createDraftResource();
        resource.setCopyrightDeclaration(null);

        when(resourceRepository.findById(resource.getId())).thenReturn(Optional.of(resource));
        when(userRepository.findByEmail("contributor@example.com")).thenReturn(Optional.of(contributor));

        assertThatThrownBy(() ->
                resourceService.submitForReview(resource.getId(), "contributor@example.com"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("copyrightDeclaration");
    }

    // --- Get resource by ID tests ---

    @Test
    void getResourceById_approvedResource_visibleToAll() {
        Resource resource = createDraftResource();
        resource.setStatus(ResourceStatus.APPROVED);

        User viewer = new User();
        viewer.setId(UUID.randomUUID());
        viewer.setEmail("viewer@example.com");
        viewer.setRole(UserRole.REGISTERED_VIEWER);

        when(resourceRepository.findById(resource.getId())).thenReturn(Optional.of(resource));
        when(userRepository.findByEmail("viewer@example.com")).thenReturn(Optional.of(viewer));

        Resource result = resourceService.getResourceById(resource.getId(), "viewer@example.com");

        assertThat(result.getId()).isEqualTo(resource.getId());
    }

    // Draft resources are private — only the owner and admins may view them
    @Test
    void getResourceById_draftResource_notVisibleToNonOwner() {
        Resource resource = createDraftResource();

        User viewer = new User();
        viewer.setId(UUID.randomUUID());
        viewer.setEmail("viewer@example.com");
        viewer.setRole(UserRole.REGISTERED_VIEWER);

        when(resourceRepository.findById(resource.getId())).thenReturn(Optional.of(resource));
        when(userRepository.findByEmail("viewer@example.com")).thenReturn(Optional.of(viewer));

        assertThatThrownBy(() ->
                resourceService.getResourceById(resource.getId(), "viewer@example.com"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getResourceById_draftResource_visibleToAdmin() {
        Resource resource = createDraftResource();

        User admin = new User();
        admin.setId(UUID.randomUUID());
        admin.setEmail("admin@example.com");
        admin.setRole(UserRole.ADMINISTRATOR);

        when(resourceRepository.findById(resource.getId())).thenReturn(Optional.of(resource));
        when(userRepository.findByEmail("admin@example.com")).thenReturn(Optional.of(admin));

        Resource result = resourceService.getResourceById(resource.getId(), "admin@example.com");

        assertThat(result.getId()).isEqualTo(resource.getId());
    }

    // --- List contributor resources ---

    @Test
    void listContributorResources_returnsOwnResources() {
        List<Resource> resources = List.of(createDraftResource());

        when(userRepository.findByEmail("contributor@example.com")).thenReturn(Optional.of(contributor));
        when(resourceRepository.findByContributorId(contributor.getId())).thenReturn(resources);

        List<Resource> result = resourceService.listContributorResources("contributor@example.com");

        assertThat(result).hasSize(1);
    }
}
