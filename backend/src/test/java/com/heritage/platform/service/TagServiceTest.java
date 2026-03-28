package com.heritage.platform.service;

import com.heritage.platform.exception.AssociatedResourcesException;
import com.heritage.platform.exception.DuplicateNameException;
import com.heritage.platform.exception.ResourceNotFoundException;
import com.heritage.platform.model.Tag;
import com.heritage.platform.repository.ResourceRepository;
import com.heritage.platform.repository.TagRepository;
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

/**
 * Unit tests for {@link TagService}.
 *
 * <p>Uses Mockito mocks for {@code TagRepository} and {@code ResourceRepository}.
 * Covers CRUD operations on heritage resource tags.
 *
 * <p>Key scenarios covered:
 * <ul>
 *   <li>Create and update with unique-name enforcement</li>
 *   <li>Duplicate-name rejection</li>
 *   <li>Deletion guarded by associated-resource check</li>
 *   <li>Not-found error handling for update and delete</li>
 *   <li>Listing all tags</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
class TagServiceTest {

    @Mock
    private TagRepository tagRepository;
    @Mock
    private ResourceRepository resourceRepository;

    private TagService tagService;

    @BeforeEach
    void setUp() {
        tagService = new TagService(tagRepository, resourceRepository);
    }

    private Tag createTestTag(UUID id, String name) {
        Tag tag = new Tag();
        tag.setId(id);
        tag.setName(name);
        return tag;
    }

    @Test
    void createTag_withUniqueName_succeeds() {
        when(tagRepository.existsByName("historical")).thenReturn(false);
        when(tagRepository.save(any(Tag.class))).thenAnswer(inv -> {
            Tag t = inv.getArgument(0);
            t.setId(UUID.randomUUID());
            return t;
        });

        Tag result = tagService.create("historical");

        assertEquals("historical", result.getName());
        verify(tagRepository).existsByName("historical");
        verify(tagRepository).save(any(Tag.class));
    }

    @Test
    void createTag_withDuplicateName_throwsDuplicateNameException() {
        when(tagRepository.existsByName("historical")).thenReturn(true);

        assertThrows(DuplicateNameException.class, () -> tagService.create("historical"));
        verify(tagRepository, never()).save(any());
    }

    @Test
    void updateTag_withUniqueName_succeeds() {
        UUID id = UUID.randomUUID();
        Tag existing = createTestTag(id, "old-tag");

        when(tagRepository.findById(id)).thenReturn(Optional.of(existing));
        when(tagRepository.existsByName("new-tag")).thenReturn(false);
        when(tagRepository.save(any(Tag.class))).thenAnswer(inv -> inv.getArgument(0));

        Tag result = tagService.update(id, "new-tag");

        assertEquals("new-tag", result.getName());
        verify(tagRepository).save(existing);
    }

    @Test
    void updateTag_withDuplicateName_throwsDuplicateNameException() {
        UUID id = UUID.randomUUID();
        Tag existing = createTestTag(id, "old-tag");

        when(tagRepository.findById(id)).thenReturn(Optional.of(existing));
        when(tagRepository.existsByName("taken-tag")).thenReturn(true);

        assertThrows(DuplicateNameException.class, () -> tagService.update(id, "taken-tag"));
        verify(tagRepository, never()).save(any());
    }

    @Test
    void updateTag_notFound_throwsResourceNotFoundException() {
        UUID id = UUID.randomUUID();
        when(tagRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> tagService.update(id, "any-tag"));
    }

    @Test
    void deleteTag_withNoAssociatedResources_succeeds() {
        UUID id = UUID.randomUUID();
        Tag tag = createTestTag(id, "removable");

        when(tagRepository.findById(id)).thenReturn(Optional.of(tag));
        when(resourceRepository.existsByTagId(id)).thenReturn(false);

        tagService.delete(id);

        verify(tagRepository).delete(tag);
    }

    // Tags in use by resources cannot be deleted to preserve referential integrity
    @Test
    void deleteTag_withAssociatedResources_throwsAssociatedResourcesException() {
        UUID id = UUID.randomUUID();
        Tag tag = createTestTag(id, "in-use");

        when(tagRepository.findById(id)).thenReturn(Optional.of(tag));
        when(resourceRepository.existsByTagId(id)).thenReturn(true);

        assertThrows(AssociatedResourcesException.class, () -> tagService.delete(id));
        verify(tagRepository, never()).delete(any());
    }

    @Test
    void deleteTag_notFound_throwsResourceNotFoundException() {
        UUID id = UUID.randomUUID();
        when(tagRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> tagService.delete(id));
    }

    @Test
    void listAll_returnsAllTags() {
        List<Tag> tags = List.of(
                createTestTag(UUID.randomUUID(), "historical"),
                createTestTag(UUID.randomUUID(), "cultural")
        );
        when(tagRepository.findAll()).thenReturn(tags);

        List<Tag> result = tagService.listAll();

        assertEquals(2, result.size());
        verify(tagRepository).findAll();
    }
}
