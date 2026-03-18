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

        if (hasQuery && hasCategory && hasTag) {
            return resourceRepository.searchByTextQueryAndCategoryAndTag(status, query.trim(), categoryId, tagId, pageable);
        } else if (hasQuery && hasCategory) {
            return resourceRepository.searchByTextQueryAndCategory(status, query.trim(), categoryId, pageable);
        } else if (hasQuery && hasTag) {
            return resourceRepository.searchByTextQueryAndTag(status, query.trim(), tagId, pageable);
        } else if (hasCategory && hasTag) {
            return resourceRepository.findByStatusAndCategoryIdAndTagId(status, categoryId, tagId, pageable);
        } else if (hasQuery) {
            return resourceRepository.searchByTextQuery(status, query.trim(), pageable);
        } else if (hasCategory) {
            return resourceRepository.findByStatusAndCategoryId(status, categoryId, pageable);
        } else if (hasTag) {
            return resourceRepository.findByStatusAndTagId(status, tagId, pageable);
        } else {
            return resourceRepository.findByStatus(status, pageable);
        }
    }
}
