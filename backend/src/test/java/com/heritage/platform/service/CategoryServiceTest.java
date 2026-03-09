package com.heritage.platform.service;

import com.heritage.platform.exception.AssociatedResourcesException;
import com.heritage.platform.exception.DuplicateNameException;
import com.heritage.platform.exception.ResourceNotFoundException;
import com.heritage.platform.model.Category;
import com.heritage.platform.repository.CategoryRepository;
import com.heritage.platform.repository.ResourceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock
    private CategoryRepository categoryRepository;
    @Mock
    private ResourceRepository resourceRepository;

    private CategoryService categoryService;

    @BeforeEach
    void setUp() {
        categoryService = new CategoryService(categoryRepository, resourceRepository);
    }

    private Category createTestCategory(UUID id, String name) {
        Category category = new Category();
        category.setId(id);
        category.setName(name);
        return category;
    }

    @Test
    void createCategory_withUniqueName_succeeds() {
        when(categoryRepository.existsByName("Traditions")).thenReturn(false);
        when(categoryRepository.save(any(Category.class))).thenAnswer(inv -> {
            Category c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        Category result = categoryService.create("Traditions");

        assertEquals("Traditions", result.getName());
        verify(categoryRepository).existsByName("Traditions");
        verify(categoryRepository).save(any(Category.class));
    }

    @Test
    void createCategory_withDuplicateName_throwsDuplicateNameException() {
        when(categoryRepository.existsByName("Traditions")).thenReturn(true);

        assertThrows(DuplicateNameException.class, () -> categoryService.create("Traditions"));
        verify(categoryRepository, never()).save(any());
    }

    @Test
    void updateCategory_withUniqueName_succeeds() {
        UUID id = UUID.randomUUID();
        Category existing = createTestCategory(id, "Old Name");

        when(categoryRepository.findById(id)).thenReturn(Optional.of(existing));
        when(categoryRepository.existsByName("New Name")).thenReturn(false);
        when(categoryRepository.save(any(Category.class))).thenAnswer(inv -> inv.getArgument(0));

        Category result = categoryService.update(id, "New Name");

        assertEquals("New Name", result.getName());
        verify(categoryRepository).save(existing);
    }

    @Test
    void updateCategory_withDuplicateName_throwsDuplicateNameException() {
        UUID id = UUID.randomUUID();
        Category existing = createTestCategory(id, "Old Name");

        when(categoryRepository.findById(id)).thenReturn(Optional.of(existing));
        when(categoryRepository.existsByName("Taken Name")).thenReturn(true);

        assertThrows(DuplicateNameException.class, () -> categoryService.update(id, "Taken Name"));
        verify(categoryRepository, never()).save(any());
    }

    @Test
    void updateCategory_notFound_throwsResourceNotFoundException() {
        UUID id = UUID.randomUUID();
        when(categoryRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> categoryService.update(id, "Any Name"));
    }

    @Test
    void deleteCategory_withNoAssociatedResources_succeeds() {
        UUID id = UUID.randomUUID();
        Category category = createTestCategory(id, "Places");

        when(categoryRepository.findById(id)).thenReturn(Optional.of(category));
        when(resourceRepository.existsByCategoryId(id)).thenReturn(false);

        categoryService.delete(id);

        verify(categoryRepository).delete(category);
    }

    @Test
    void deleteCategory_withAssociatedResources_throwsAssociatedResourcesException() {
        UUID id = UUID.randomUUID();
        Category category = createTestCategory(id, "Places");

        when(categoryRepository.findById(id)).thenReturn(Optional.of(category));
        when(resourceRepository.existsByCategoryId(id)).thenReturn(true);

        assertThrows(AssociatedResourcesException.class, () -> categoryService.delete(id));
        verify(categoryRepository, never()).delete(any());
    }

    @Test
    void deleteCategory_notFound_throwsResourceNotFoundException() {
        UUID id = UUID.randomUUID();
        when(categoryRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> categoryService.delete(id));
    }

    @Test
    void listAll_returnsAllCategories() {
        List<Category> categories = List.of(
                createTestCategory(UUID.randomUUID(), "Places"),
                createTestCategory(UUID.randomUUID(), "Traditions")
        );
        when(categoryRepository.findAll()).thenReturn(categories);

        List<Category> result = categoryService.listAll();

        assertEquals(2, result.size());
        verify(categoryRepository).findAll();
    }
}
