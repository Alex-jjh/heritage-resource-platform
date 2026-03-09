package com.heritage.platform.service;

import com.heritage.platform.exception.AssociatedResourcesException;
import com.heritage.platform.exception.DuplicateNameException;
import com.heritage.platform.exception.ResourceNotFoundException;
import com.heritage.platform.model.Category;
import com.heritage.platform.repository.CategoryRepository;
import com.heritage.platform.repository.ResourceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ResourceRepository resourceRepository;

    public CategoryService(CategoryRepository categoryRepository, ResourceRepository resourceRepository) {
        this.categoryRepository = categoryRepository;
        this.resourceRepository = resourceRepository;
    }

    public List<Category> listAll() {
        return categoryRepository.findAll();
    }

    @Transactional
    public Category create(String name) {
        if (categoryRepository.existsByName(name)) {
            throw new DuplicateNameException("Category with name '" + name + "' already exists");
        }
        Category category = new Category();
        category.setName(name);
        return categoryRepository.save(category);
    }

    @Transactional
    public Category update(UUID id, String name) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        if (categoryRepository.existsByName(name) && !category.getName().equals(name)) {
            throw new DuplicateNameException("Category with name '" + name + "' already exists");
        }
        category.setName(name);
        return categoryRepository.save(category);
    }

    @Transactional
    public void delete(UUID id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        if (resourceRepository.existsByCategoryId(id)) {
            throw new AssociatedResourcesException("Cannot delete category with associated resources");
        }
        categoryRepository.delete(category);
    }
}
