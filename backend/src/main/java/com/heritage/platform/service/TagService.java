package com.heritage.platform.service;

import com.heritage.platform.exception.AssociatedResourcesException;
import com.heritage.platform.exception.DuplicateNameException;
import com.heritage.platform.exception.ResourceNotFoundException;
import com.heritage.platform.model.Tag;
import com.heritage.platform.repository.ResourceRepository;
import com.heritage.platform.repository.TagRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class TagService {

    private final TagRepository tagRepository;
    private final ResourceRepository resourceRepository;

    public TagService(TagRepository tagRepository, ResourceRepository resourceRepository) {
        this.tagRepository = tagRepository;
        this.resourceRepository = resourceRepository;
    }

    public List<Tag> listAll() {
        return tagRepository.findAll();
    }

    @Transactional
    public Tag create(String name) {
        if (tagRepository.existsByName(name)) {
            throw new DuplicateNameException("Tag with name '" + name + "' already exists");
        }
        Tag tag = new Tag();
        tag.setName(name);
        return tagRepository.save(tag);
    }

    @Transactional
    public Tag update(UUID id, String name) {
        Tag tag = tagRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tag not found"));
        if (tagRepository.existsByName(name) && !tag.getName().equals(name)) {
            throw new DuplicateNameException("Tag with name '" + name + "' already exists");
        }
        tag.setName(name);
        return tagRepository.save(tag);
    }

    @Transactional
    public void delete(UUID id) {
        Tag tag = tagRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tag not found"));
        if (resourceRepository.existsByTagId(id)) {
            throw new AssociatedResourcesException("Cannot delete tag with associated resources");
        }
        tagRepository.delete(tag);
    }
}
