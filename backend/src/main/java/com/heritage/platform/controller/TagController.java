package com.heritage.platform.controller;

import com.heritage.platform.dto.CreateTagRequest;
import com.heritage.platform.dto.TagResponse;
import com.heritage.platform.model.Tag;
import com.heritage.platform.service.TagService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tags")
public class TagController {

    private final TagService tagService;

    public TagController(TagService tagService) {
        this.tagService = tagService;
    }

    @GetMapping
    public ResponseEntity<List<TagResponse>> listAll() {
        List<TagResponse> tags = tagService.listAll()
                .stream()
                .map(TagResponse::fromEntity)
                .toList();
        return ResponseEntity.ok(tags);
    }

    @PostMapping
    public ResponseEntity<TagResponse> create(@Valid @RequestBody CreateTagRequest request) {
        Tag tag = tagService.create(request.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(TagResponse.fromEntity(tag));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TagResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateTagRequest request) {
        Tag tag = tagService.update(id, request.getName());
        return ResponseEntity.ok(TagResponse.fromEntity(tag));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        tagService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
