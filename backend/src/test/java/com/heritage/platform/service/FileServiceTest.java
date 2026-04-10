package com.heritage.platform.service;

import com.heritage.platform.exception.AccessDeniedException;
import com.heritage.platform.exception.ResourceNotFoundException;
import com.heritage.platform.model.*;
import com.heritage.platform.repository.FileReferenceRepository;
import com.heritage.platform.repository.ResourceRepository;
import com.heritage.platform.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FileServiceTest {

    @Mock private ResourceRepository resourceRepository;
    @Mock private FileReferenceRepository fileReferenceRepository;
    @Mock private UserRepository userRepository;

    private FileService fileService;

    private User contributor;
    private User otherUser;
    private Resource draftResource;
    private Category category;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        fileService = new FileService(resourceRepository, fileReferenceRepository, userRepository);
        ReflectionTestUtils.setField(fileService, "uploadDir", tempDir.resolve("uploads").toString());
        ReflectionTestUtils.setField(fileService, "thumbnailDir", tempDir.resolve("thumbnails").toString());
        ReflectionTestUtils.setField(fileService, "storageBaseUrl", "http://localhost:8080");

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

        draftResource = new Resource();
        draftResource.setId(UUID.randomUUID());
        draftResource.setContributor(contributor);
        draftResource.setTitle("Heritage Site");
        draftResource.setCategory(category);
        draftResource.setCopyrightDeclaration("CC BY 4.0");
        draftResource.setStatus(ResourceStatus.DRAFT);
        draftResource.setTags(new HashSet<>());
        draftResource.setFileReferences(new ArrayList<>());
        draftResource.setExternalLinks(new ArrayList<>());
        draftResource.setCreatedAt(Instant.now());
    }

    // --- Upload tests (unchanged) ---

    @Test
    void uploadFile_validRequest_savesFileAndReference() throws Exception {
        when(resourceRepository.findById(draftResource.getId())).thenReturn(Optional.of(draftResource));
        when(userRepository.findByEmail("contributor@example.com")).thenReturn(Optional.of(contributor));
        when(fileReferenceRepository.save(any(FileReference.class))).thenAnswer(inv -> {
            FileReference fr = inv.getArgument(0);
            fr.setId(UUID.randomUUID());
            return fr;
        });

        MultipartFile mockFile = mock(MultipartFile.class);
        when(mockFile.getOriginalFilename()).thenReturn("photo.jpg");
        when(mockFile.getContentType()).thenReturn("text/plain");
        when(mockFile.getSize()).thenReturn(1024L);
        doNothing().when(mockFile).transferTo(any(java.io.File.class));

        FileReference result = fileService.uploadFile(draftResource.getId(), mockFile, "contributor@example.com");

        assertThat(result.getOriginalFileName()).isEqualTo("photo.jpg");
        assertThat(result.getContentType()).isEqualTo("text/plain");
        assertThat(result.getFileSize()).isEqualTo(1024L);

        ArgumentCaptor<FileReference> captor = ArgumentCaptor.forClass(FileReference.class);
        verify(fileReferenceRepository).save(captor.capture());
        assertThat(captor.getValue().getResource()).isEqualTo(draftResource);
    }

    @Test
    void uploadFile_resourceNotFound_throwsNotFound() {
        UUID id = UUID.randomUUID();
        when(resourceRepository.findById(id)).thenReturn(Optional.empty());

        MultipartFile mockFile = mock(MultipartFile.class);

        assertThatThrownBy(() -> fileService.uploadFile(id, mockFile, "contributor@example.com"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void uploadFile_notOwner_throwsAccessDenied() {
        when(resourceRepository.findById(draftResource.getId())).thenReturn(Optional.of(draftResource));
        when(userRepository.findByEmail("other@example.com")).thenReturn(Optional.of(otherUser));

        MultipartFile mockFile = mock(MultipartFile.class);

        assertThatThrownBy(() -> fileService.uploadFile(draftResource.getId(), mockFile, "other@example.com"))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void uploadFile_notDraftStatus_throwsIllegalState() {
        draftResource.setStatus(ResourceStatus.PENDING_REVIEW);
        when(resourceRepository.findById(draftResource.getId())).thenReturn(Optional.of(draftResource));
        when(userRepository.findByEmail("contributor@example.com")).thenReturn(Optional.of(contributor));

        MultipartFile mockFile = mock(MultipartFile.class);

        assertThatThrownBy(() -> fileService.uploadFile(draftResource.getId(), mockFile, "contributor@example.com"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("DRAFT");
    }

    @Test
    void uploadFile_exceedsMaxSize_throwsIllegalArgument() {
        when(resourceRepository.findById(draftResource.getId())).thenReturn(Optional.of(draftResource));
        when(userRepository.findByEmail("contributor@example.com")).thenReturn(Optional.of(contributor));

        MultipartFile mockFile = mock(MultipartFile.class);
        when(mockFile.getSize()).thenReturn(51L * 1024 * 1024);

        assertThatThrownBy(() -> fileService.uploadFile(draftResource.getId(), mockFile, "contributor@example.com"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("50MB");
    }

    // --- Download URL tests (unchanged) ---

    @Test
    void generateDownloadUrl_returnsLocalUrl() {
        String url = fileService.generateDownloadUrl("resource-id/photo.jpg");
        assertThat(url).isEqualTo("http://localhost:8080/files/uploads/resource-id/photo.jpg");
    }

    @Test
    void generateThumbnailUrl_returnsLocalUrl() {
        String url = fileService.generateThumbnailUrl("resource-id/photo.jpg");
        assertThat(url).isEqualTo("http://localhost:8080/files/thumbnails/resource-id/photo.jpg");
    }

    // --- File reference deletion tests (unchanged) ---

    @Test
    void deleteFileReference_validRequest_deletesReference() {
        FileReference fileRef = new FileReference();
        fileRef.setId(UUID.randomUUID());
        fileRef.setResource(draftResource);
        fileRef.setS3Key(draftResource.getId() + "/photo.jpg");
        fileRef.setOriginalFileName("photo.jpg");

        when(resourceRepository.findById(draftResource.getId())).thenReturn(Optional.of(draftResource));
        when(userRepository.findByEmail("contributor@example.com")).thenReturn(Optional.of(contributor));
        when(fileReferenceRepository.findById(fileRef.getId())).thenReturn(Optional.of(fileRef));

        fileService.deleteFileReference(draftResource.getId(), fileRef.getId(), "contributor@example.com");

        verify(fileReferenceRepository).delete(fileRef);
    }

    @Test
    void deleteFileReference_fileRefNotFound_throwsNotFound() {
        UUID fileRefId = UUID.randomUUID();
        when(resourceRepository.findById(draftResource.getId())).thenReturn(Optional.of(draftResource));
        when(userRepository.findByEmail("contributor@example.com")).thenReturn(Optional.of(contributor));
        when(fileReferenceRepository.findById(fileRefId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> fileService.deleteFileReference(draftResource.getId(), fileRefId, "contributor@example.com"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("File reference not found");
    }

    @Test
    void deleteFileReference_fileRefOnDifferentResource_throwsNotFound() {
        Resource otherResource = new Resource();
        otherResource.setId(UUID.randomUUID());

        FileReference fileRef = new FileReference();
        fileRef.setId(UUID.randomUUID());
        fileRef.setResource(otherResource);

        when(resourceRepository.findById(draftResource.getId())).thenReturn(Optional.of(draftResource));
        when(userRepository.findByEmail("contributor@example.com")).thenReturn(Optional.of(contributor));
        when(fileReferenceRepository.findById(fileRef.getId())).thenReturn(Optional.of(fileRef));

        assertThatThrownBy(() -> fileService.deleteFileReference(draftResource.getId(), fileRef.getId(), "contributor@example.com"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("File reference not found on this resource");
    }

    @Test
    void deleteFileReference_notOwner_throwsAccessDenied() {
        when(resourceRepository.findById(draftResource.getId())).thenReturn(Optional.of(draftResource));
        when(userRepository.findByEmail("other@example.com")).thenReturn(Optional.of(otherUser));

        assertThatThrownBy(() -> fileService.deleteFileReference(draftResource.getId(), UUID.randomUUID(), "other@example.com"))
                .isInstanceOf(AccessDeniedException.class);
    }

    // --- setCover tests (new) ---

    @Test
    void setCover_validRequest_updatesThumbnailKey() {
        FileReference fileRef = new FileReference();
        fileRef.setId(UUID.randomUUID());
        fileRef.setResource(draftResource);
        fileRef.setS3Key(draftResource.getId() + "/cover.jpg");

        when(resourceRepository.findById(draftResource.getId())).thenReturn(Optional.of(draftResource));
        when(userRepository.findByEmail("contributor@example.com")).thenReturn(Optional.of(contributor));
        when(fileReferenceRepository.findById(fileRef.getId())).thenReturn(Optional.of(fileRef));

        fileService.setCover(draftResource.getId(), fileRef.getId(), "contributor@example.com");

        ArgumentCaptor<Resource> captor = ArgumentCaptor.forClass(Resource.class);
        verify(resourceRepository).save(captor.capture());
        assertThat(captor.getValue().getThumbnailS3Key()).isEqualTo(draftResource.getId() + "/cover.jpg");
    }

    @Test
    void setCover_notOwner_throwsAccessDenied() {
        when(resourceRepository.findById(draftResource.getId())).thenReturn(Optional.of(draftResource));
        when(userRepository.findByEmail("other@example.com")).thenReturn(Optional.of(otherUser));

        assertThatThrownBy(() -> fileService.setCover(draftResource.getId(), UUID.randomUUID(), "other@example.com"))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void setCover_notDraftStatus_throwsIllegalState() {
        draftResource.setStatus(ResourceStatus.PENDING_REVIEW);
        when(resourceRepository.findById(draftResource.getId())).thenReturn(Optional.of(draftResource));
        when(userRepository.findByEmail("contributor@example.com")).thenReturn(Optional.of(contributor));

        assertThatThrownBy(() -> fileService.setCover(draftResource.getId(), UUID.randomUUID(), "contributor@example.com"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("DRAFT");
    }

    @Test
    void setCover_fileRefNotFound_throwsNotFound() {
        UUID fileRefId = UUID.randomUUID();
        when(resourceRepository.findById(draftResource.getId())).thenReturn(Optional.of(draftResource));
        when(userRepository.findByEmail("contributor@example.com")).thenReturn(Optional.of(contributor));
        when(fileReferenceRepository.findById(fileRefId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> fileService.setCover(draftResource.getId(), fileRefId, "contributor@example.com"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("File reference not found");
    }

    @Test
    void setCover_fileRefOnDifferentResource_throwsNotFound() {
        Resource otherResource = new Resource();
        otherResource.setId(UUID.randomUUID());

        FileReference fileRef = new FileReference();
        fileRef.setId(UUID.randomUUID());
        fileRef.setResource(otherResource);

        when(resourceRepository.findById(draftResource.getId())).thenReturn(Optional.of(draftResource));
        when(userRepository.findByEmail("contributor@example.com")).thenReturn(Optional.of(contributor));
        when(fileReferenceRepository.findById(fileRef.getId())).thenReturn(Optional.of(fileRef));

        assertThatThrownBy(() -> fileService.setCover(draftResource.getId(), fileRef.getId(), "contributor@example.com"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("File reference not found on this resource");
    }
}
