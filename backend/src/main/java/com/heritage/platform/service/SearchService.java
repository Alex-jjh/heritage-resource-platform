package com.heritage.platform.service;

import com.heritage.platform.model.Resource;
import com.heritage.platform.model.ResourceStatus;
import com.heritage.platform.repository.ResourceRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class SearchService {

    private static final int DEFAULT_PAGE_SIZE = 20;

    private final ResourceRepository resourceRepository;

    public SearchService(ResourceRepository resourceRepository) {
        this.resourceRepository = resourceRepository;
    }

    /**
     * Searches approved resources with optional text query, category, and tag filters.
     * All filters are combined with AND logic. Archived resources are always excluded.
     */
    @Transactional(readOnly = true)
    public Page<Resource> searchResources(String query, UUID categoryId, UUID tagId, int page, int size) {
        if (size <= 0) {
            size = DEFAULT_PAGE_SIZE;
        }
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        ResourceStatus status = ResourceStatus.APPROVED;

        boolean hasQuery = query != null && !query.isBlank();
        boolean hasCategory = categoryId != null;
        boolean hasTag = tagId != null;

        Page<Resource> result;
        if (hasQuery && hasCategory && hasTag) {
            result = resourceRepository.searchByTextQueryAndCategoryAndTag(status, query.trim(), categoryId, tagId, pageable);
        } else if (hasQuery && hasCategory) {
            result = resourceRepository.searchByTextQueryAndCategory(status, query.trim(), categoryId, pageable);
        } else if (hasQuery && hasTag) {
            result = resourceRepository.searchByTextQueryAndTag(status, query.trim(), tagId, pageable);
        } else if (hasCategory && hasTag) {
            result = resourceRepository.findByStatusAndCategoryIdAndTagId(status, categoryId, tagId, pageable);
        } else if (hasQuery) {
            result = resourceRepository.searchByTextQuery(status, query.trim(), pageable);
        } else if (hasCategory) {
            result = resourceRepository.findByStatusAndCategoryId(status, categoryId, pageable);
        } else if (hasTag) {
            result = resourceRepository.findByStatusAndTagId(status, tagId, pageable);
        } else {
            result = resourceRepository.findByStatus(status, pageable);
        }

        // Force-initialize lazy associations to prevent LazyInitializationException in DTO conversion
        result.getContent().forEach(r -> {
            if (r.getCategory() != null) r.getCategory().getName();
            if (r.getTags() != null) r.getTags().size();
            if (r.getFileReferences() != null) r.getFileReferences().size();
            if (r.getExternalLinks() != null) r.getExternalLinks().size();
            if (r.getReviewFeedbacks() != null) r.getReviewFeedbacks().size();
            if (r.getContributor() != null) r.getContributor().getDisplayName();
        });

        return result;
    }
}
