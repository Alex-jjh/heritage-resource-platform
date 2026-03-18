package com.heritage.platform.controller;

import com.heritage.platform.dto.ResourceResponse;
import com.heritage.platform.model.Resource;
import com.heritage.platform.service.SearchService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping("/resources")
    public ResponseEntity<Page<ResourceResponse>> searchResources(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) UUID tagId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<Resource> results = searchService.searchResources(q, categoryId, tagId, page, size);
        Page<ResourceResponse> response = results.map(ResourceResponse::fromEntity);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/featured")
    public ResponseEntity<List<ResourceResponse>> getFeatured() {
        Page<Resource> results = searchService.searchResources(null, null, null, 0, 3);
        List<ResourceResponse> response = results.getContent().stream()
                .map(ResourceResponse::fromEntity)
                .toList();
        return ResponseEntity.ok(response);
    }
}
