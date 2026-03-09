package com.heritage.platform.service;

import com.heritage.platform.model.*;
import com.heritage.platform.repository.ResourceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SearchServiceTest {

    @Mock
    private ResourceRepository resourceRepository;

    private SearchService searchService;

    private Category category;
    private Tag tag;

    @BeforeEach
    void setUp() {
        searchService = new SearchService(resourceRepository);

        category = new Category();
        category.setId(UUID.randomUUID());
        category.setName("Traditions");

        tag = new Tag();
        tag.setId(UUID.randomUUID());
        tag.setName("ancient");
    }

    private Resource createApprovedResource(String title) {
        User contributor = new User();
        contributor.setId(UUID.randomUUID());
        contributor.setDisplayName("Contributor");
        contributor.setRole(UserRole.CONTRIBUTOR);

        Resource resource = new Resource();
        resource.setId(UUID.randomUUID());
        resource.setContributor(contributor);
        resource.setTitle(title);
        resource.setCategory(category);
        resource.setCopyrightDeclaration("CC BY 4.0");
        resource.setStatus(ResourceStatus.APPROVED);
        resource.setTags(new HashSet<>());
        resource.setFileReferences(new ArrayList<>());
        resource.setExternalLinks(new ArrayList<>());
        return resource;
    }

    // --- Text search tests ---

    @Test
    void searchResources_withTextQuery_matchesTitle() {
        Resource resource = createApprovedResource("Ancient Temple");
        Page<Resource> page = new PageImpl<>(List.of(resource));

        when(resourceRepository.searchByTextQuery(eq(ResourceStatus.APPROVED), eq("Ancient"), any(Pageable.class)))
                .thenReturn(page);

        Page<Resource> result = searchService.searchResources("Ancient", null, null, 0, 20);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getTitle()).isEqualTo("Ancient Temple");
        verify(resourceRepository).searchByTextQuery(eq(ResourceStatus.APPROVED), eq("Ancient"), any(Pageable.class));
    }

    @Test
    void searchResources_withTextQuery_matchesDescription() {
        Resource resource = createApprovedResource("Heritage Site");
        resource.setDescription("An ancient ruin from the medieval period");
        Page<Resource> page = new PageImpl<>(List.of(resource));

        when(resourceRepository.searchByTextQuery(eq(ResourceStatus.APPROVED), eq("medieval"), any(Pageable.class)))
                .thenReturn(page);

        Page<Resource> result = searchService.searchResources("medieval", null, null, 0, 20);

        assertThat(result.getContent()).hasSize(1);
        verify(resourceRepository).searchByTextQuery(eq(ResourceStatus.APPROVED), eq("medieval"), any(Pageable.class));
    }

    @Test
    void searchResources_withTextQuery_matchesTags() {
        Resource resource = createApprovedResource("Temple");
        resource.setTags(Set.of(tag));
        Page<Resource> page = new PageImpl<>(List.of(resource));

        when(resourceRepository.searchByTextQuery(eq(ResourceStatus.APPROVED), eq("ancient"), any(Pageable.class)))
                .thenReturn(page);

        Page<Resource> result = searchService.searchResources("ancient", null, null, 0, 20);

        assertThat(result.getContent()).hasSize(1);
        verify(resourceRepository).searchByTextQuery(eq(ResourceStatus.APPROVED), eq("ancient"), any(Pageable.class));
    }

    // --- Category filter tests ---

    @Test
    void searchResources_withCategoryFilter_returnsCorrectResults() {
        Resource resource = createApprovedResource("Tradition Dance");
        Page<Resource> page = new PageImpl<>(List.of(resource));

        when(resourceRepository.findByStatusAndCategoryId(eq(ResourceStatus.APPROVED), eq(category.getId()), any(Pageable.class)))
                .thenReturn(page);

        Page<Resource> result = searchService.searchResources(null, category.getId(), null, 0, 20);

        assertThat(result.getContent()).hasSize(1);
        verify(resourceRepository).findByStatusAndCategoryId(eq(ResourceStatus.APPROVED), eq(category.getId()), any(Pageable.class));
    }

    // --- Tag filter tests ---

    @Test
    void searchResources_withTagFilter_returnsCorrectResults() {
        Resource resource = createApprovedResource("Ancient Artifact");
        resource.setTags(Set.of(tag));
        Page<Resource> page = new PageImpl<>(List.of(resource));

        when(resourceRepository.findByStatusAndTagId(eq(ResourceStatus.APPROVED), eq(tag.getId()), any(Pageable.class)))
                .thenReturn(page);

        Page<Resource> result = searchService.searchResources(null, null, tag.getId(), 0, 20);

        assertThat(result.getContent()).hasSize(1);
        verify(resourceRepository).findByStatusAndTagId(eq(ResourceStatus.APPROVED), eq(tag.getId()), any(Pageable.class));
    }

    // --- Combined filter tests (AND logic) ---

    @Test
    void searchResources_withTextAndCategoryFilter_usesAndLogic() {
        Resource resource = createApprovedResource("Ancient Temple");
        Page<Resource> page = new PageImpl<>(List.of(resource));

        when(resourceRepository.searchByTextQueryAndCategory(
                eq(ResourceStatus.APPROVED), eq("Ancient"), eq(category.getId()), any(Pageable.class)))
                .thenReturn(page);

        Page<Resource> result = searchService.searchResources("Ancient", category.getId(), null, 0, 20);

        assertThat(result.getContent()).hasSize(1);
        verify(resourceRepository).searchByTextQueryAndCategory(
                eq(ResourceStatus.APPROVED), eq("Ancient"), eq(category.getId()), any(Pageable.class));
    }

    @Test
    void searchResources_withTextAndTagFilter_usesAndLogic() {
        Resource resource = createApprovedResource("Temple");
        Page<Resource> page = new PageImpl<>(List.of(resource));

        when(resourceRepository.searchByTextQueryAndTag(
                eq(ResourceStatus.APPROVED), eq("Temple"), eq(tag.getId()), any(Pageable.class)))
                .thenReturn(page);

        Page<Resource> result = searchService.searchResources("Temple", null, tag.getId(), 0, 20);

        assertThat(result.getContent()).hasSize(1);
        verify(resourceRepository).searchByTextQueryAndTag(
                eq(ResourceStatus.APPROVED), eq("Temple"), eq(tag.getId()), any(Pageable.class));
    }

    @Test
    void searchResources_withCategoryAndTagFilter_usesAndLogic() {
        Resource resource = createApprovedResource("Heritage Item");
        Page<Resource> page = new PageImpl<>(List.of(resource));

        when(resourceRepository.findByStatusAndCategoryIdAndTagId(
                eq(ResourceStatus.APPROVED), eq(category.getId()), eq(tag.getId()), any(Pageable.class)))
                .thenReturn(page);

        Page<Resource> result = searchService.searchResources(null, category.getId(), tag.getId(), 0, 20);

        assertThat(result.getContent()).hasSize(1);
        verify(resourceRepository).findByStatusAndCategoryIdAndTagId(
                eq(ResourceStatus.APPROVED), eq(category.getId()), eq(tag.getId()), any(Pageable.class));
    }

    @Test
    void searchResources_withAllFilters_usesAndLogic() {
        Resource resource = createApprovedResource("Ancient Temple");
        Page<Resource> page = new PageImpl<>(List.of(resource));

        when(resourceRepository.searchByTextQueryAndCategoryAndTag(
                eq(ResourceStatus.APPROVED), eq("Ancient"), eq(category.getId()), eq(tag.getId()), any(Pageable.class)))
                .thenReturn(page);

        Page<Resource> result = searchService.searchResources("Ancient", category.getId(), tag.getId(), 0, 20);

        assertThat(result.getContent()).hasSize(1);
        verify(resourceRepository).searchByTextQueryAndCategoryAndTag(
                eq(ResourceStatus.APPROVED), eq("Ancient"), eq(category.getId()), eq(tag.getId()), any(Pageable.class));
    }

    // --- Pagination tests ---

    @Test
    void searchResources_defaultPageSize_is20() {
        Page<Resource> page = new PageImpl<>(List.of());
        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);

        when(resourceRepository.findByStatus(eq(ResourceStatus.APPROVED), pageableCaptor.capture()))
                .thenReturn(page);

        searchService.searchResources(null, null, null, 0, 20);

        Pageable captured = pageableCaptor.getValue();
        assertThat(captured.getPageSize()).isEqualTo(20);
        assertThat(captured.getPageNumber()).isEqualTo(0);
    }

    @Test
    void searchResources_invalidPageSize_defaultsTo20() {
        Page<Resource> page = new PageImpl<>(List.of());
        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);

        when(resourceRepository.findByStatus(eq(ResourceStatus.APPROVED), pageableCaptor.capture()))
                .thenReturn(page);

        searchService.searchResources(null, null, null, 0, 0);

        Pageable captured = pageableCaptor.getValue();
        assertThat(captured.getPageSize()).isEqualTo(20);
    }

    @Test
    void searchResources_customPageSize_isRespected() {
        Page<Resource> page = new PageImpl<>(List.of());
        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);

        when(resourceRepository.findByStatus(eq(ResourceStatus.APPROVED), pageableCaptor.capture()))
                .thenReturn(page);

        searchService.searchResources(null, null, null, 2, 10);

        Pageable captured = pageableCaptor.getValue();
        assertThat(captured.getPageSize()).isEqualTo(10);
        assertThat(captured.getPageNumber()).isEqualTo(2);
    }

    // --- Archived resources exclusion ---

    @Test
    void searchResources_alwaysQueriesApprovedStatus_excludingArchived() {
        Page<Resource> page = new PageImpl<>(List.of());

        when(resourceRepository.findByStatus(eq(ResourceStatus.APPROVED), any(Pageable.class)))
                .thenReturn(page);

        searchService.searchResources(null, null, null, 0, 20);

        // Verify that APPROVED status is always passed, which inherently excludes ARCHIVED
        verify(resourceRepository).findByStatus(eq(ResourceStatus.APPROVED), any(Pageable.class));
        verify(resourceRepository, never()).findByStatus(eq(ResourceStatus.ARCHIVED), any(Pageable.class));
    }

    // --- No results ---

    @Test
    void searchResources_noFilters_returnsAllApproved() {
        Resource r1 = createApprovedResource("Resource 1");
        Resource r2 = createApprovedResource("Resource 2");
        Page<Resource> page = new PageImpl<>(List.of(r1, r2));

        when(resourceRepository.findByStatus(eq(ResourceStatus.APPROVED), any(Pageable.class)))
                .thenReturn(page);

        Page<Resource> result = searchService.searchResources(null, null, null, 0, 20);

        assertThat(result.getContent()).hasSize(2);
        verify(resourceRepository).findByStatus(eq(ResourceStatus.APPROVED), any(Pageable.class));
    }

    @Test
    void searchResources_blankQuery_treatedAsNoQuery() {
        Page<Resource> page = new PageImpl<>(List.of());

        when(resourceRepository.findByStatus(eq(ResourceStatus.APPROVED), any(Pageable.class)))
                .thenReturn(page);

        searchService.searchResources("   ", null, null, 0, 20);

        // Blank query should fall through to the no-query branch
        verify(resourceRepository).findByStatus(eq(ResourceStatus.APPROVED), any(Pageable.class));
        verify(resourceRepository, never()).searchByTextQuery(any(), any(), any());
    }
}
