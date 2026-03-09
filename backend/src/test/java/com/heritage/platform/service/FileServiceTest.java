package com.heritage.platform.service;

import com.heritage.platform.config.AwsS3Config;
import com.heritage.platform.dto.CreateFileReferenceRequest;
import com.heritage.platform.exception.AccessDeniedException;
import com.heritage.platform.exception.ResourceNotFoundException;
import com.heritage.platform.exception.S3ServiceException;
import com.heritage.platform.model.*;
import com.heritage.platform.repository.FileReferenceRepository;
import com.heritage.platform.repository.ResourceRepository;
import com.heritage.platform.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.net.URI;
import java.net.URL;
import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FileServiceTest {

    @Mock private S3Presigner s3Presigner;
    @Mock private AwsS3Config s3Config;
    @Mock private ResourceRepository resourceRepository;
    @Mock private FileReferenceRepository fileReferenceRepository;
    @Mock private UserRepository userRepository;

    private FileService fileService;

    private User contributor;
    private User otherUser;
    private Resource draftResource;
    private Category category;

    @BeforeEach
    void setUp() {
        fileService = new FileService(s3Presigner, s3Config, resourceRepository, fileReferenceRepository, userRepository);

        contributor = new User();
        contributor.setId(UUID.randomUUID());
        contributor.setCognitoSub("contributor-sub");
        contributor.setDisplayName("Contributor");
        contributor.setRole(UserRole.CONTRIBUTOR);

        otherUser = new User();
        otherUser.setId(UUID.randomUUID());
        otherUser.setCognitoSub("other-sub");
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

    // --- Upload URL generation tests ---

    @Test
    void generateUploadUrl_validRequest_returnsPresignedUrl() throws Exception {
        when(resourceRepository.findById(draftResource.getId())).thenReturn(Optional.of(draftResource));
        when(userRepository.findByCognitoSub("contributor-sub")).thenReturn(Optional.of(contributor));
        when(s3Config.getBucket()).thenReturn("heritage-resources-local");

        PresignedPutObjectRequest presigned = mock(PresignedPutObjectRequest.class);
        when(presigned.url()).thenReturn(URI.create("https://s3.amazonaws.com/heritage-resources-local/uploads/test").toURL());
        when(s3Presigner.presignPutObject(any(PutObjectPresignRequest.class))).thenReturn(presigned);

        String url = fileService.generateUploadUrl(draftResource.getId(), "photo.jpg", "image/jpeg", "contributor-sub");

        assertThat(url).contains("s3.amazonaws.com");
        verify(s3Presigner).presignPutObject(any(PutObjectPresignRequest.class));
    }

    @Test
    void generateUploadUrl_correctS3KeyPattern() {
        String key = fileService.buildUploadKey(draftResource.getId(), "photo.jpg");
        assertThat(key).isEqualTo("uploads/" + draftResource.getId() + "/photo.jpg");
    }

    @Test
    void generateUploadUrl_resourceNotFound_throwsNotFound() {
        UUID id = UUID.randomUUID();
        when(resourceRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> fileService.generateUploadUrl(id, "file.jpg", null, "contributor-sub"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void generateUploadUrl_notOwner_throwsAccessDenied() {
        when(resourceRepository.findById(draftResource.getId())).thenReturn(Optional.of(draftResource));
        when(userRepository.findByCognitoSub("other-sub")).thenReturn(Optional.of(otherUser));

        assertThatThrownBy(() -> fileService.generateUploadUrl(draftResource.getId(), "file.jpg", null, "other-sub"))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void generateUploadUrl_notDraftStatus_throwsIllegalState() {
        draftResource.setStatus(ResourceStatus.PENDING_REVIEW);
        when(resourceRepository.findById(draftResource.getId())).thenReturn(Optional.of(draftResource));
        when(userRepository.findByCognitoSub("contributor-sub")).thenReturn(Optional.of(contributor));

        assertThatThrownBy(() -> fileService.generateUploadUrl(draftResource.getId(), "file.jpg", null, "contributor-sub"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("DRAFT");
    }

    @Test
    void generateUploadUrl_s3Failure_throwsS3ServiceException() {
        when(resourceRepository.findById(draftResource.getId())).thenReturn(Optional.of(draftResource));
        when(userRepository.findByCognitoSub("contributor-sub")).thenReturn(Optional.of(contributor));
        when(s3Config.getBucket()).thenReturn("heritage-resources-local");
        when(s3Presigner.presignPutObject(any(PutObjectPresignRequest.class)))
                .thenThrow(new RuntimeException("S3 connection refused"));

        assertThatThrownBy(() -> fileService.generateUploadUrl(draftResource.getId(), "file.jpg", null, "contributor-sub"))
                .isInstanceOf(S3ServiceException.class)
                .hasMessageContaining("Failed to generate upload URL");
    }

    // --- Download URL generation tests ---

    @Test
    void generateDownloadUrl_returnsPresignedGetUrl() throws Exception {
        when(s3Config.getBucket()).thenReturn("heritage-resources-local");

        PresignedGetObjectRequest presigned = mock(PresignedGetObjectRequest.class);
        when(presigned.url()).thenReturn(URI.create("https://s3.amazonaws.com/heritage-resources-local/uploads/test").toURL());
        when(s3Presigner.presignGetObject(any(GetObjectPresignRequest.class))).thenReturn(presigned);

        String url = fileService.generateDownloadUrl("uploads/resource-id/photo.jpg");

        assertThat(url).contains("s3.amazonaws.com");
        verify(s3Presigner).presignGetObject(any(GetObjectPresignRequest.class));
    }

    @Test
    void generateDownloadUrl_s3Failure_throwsS3ServiceException() {
        when(s3Config.getBucket()).thenReturn("heritage-resources-local");
        when(s3Presigner.presignGetObject(any(GetObjectPresignRequest.class)))
                .thenThrow(new RuntimeException("S3 connection refused"));

        assertThatThrownBy(() -> fileService.generateDownloadUrl("uploads/resource-id/photo.jpg"))
                .isInstanceOf(S3ServiceException.class)
                .hasMessageContaining("Failed to generate download URL");
    }

    // --- File reference creation tests ---

    @Test
    void createFileReference_validRequest_savesReference() {
        when(resourceRepository.findById(draftResource.getId())).thenReturn(Optional.of(draftResource));
        when(userRepository.findByCognitoSub("contributor-sub")).thenReturn(Optional.of(contributor));
        when(fileReferenceRepository.save(any(FileReference.class))).thenAnswer(inv -> {
            FileReference fr = inv.getArgument(0);
            fr.setId(UUID.randomUUID());
            return fr;
        });

        CreateFileReferenceRequest request = new CreateFileReferenceRequest();
        request.setS3Key("uploads/" + draftResource.getId() + "/photo.jpg");
        request.setOriginalFileName("photo.jpg");
        request.setContentType("image/jpeg");
        request.setFileSize(1024L);

        FileReference result = fileService.createFileReference(draftResource.getId(), request, "contributor-sub");

        assertThat(result.getS3Key()).isEqualTo(request.getS3Key());
        assertThat(result.getOriginalFileName()).isEqualTo("photo.jpg");
        assertThat(result.getContentType()).isEqualTo("image/jpeg");
        assertThat(result.getFileSize()).isEqualTo(1024L);

        ArgumentCaptor<FileReference> captor = ArgumentCaptor.forClass(FileReference.class);
        verify(fileReferenceRepository).save(captor.capture());
        assertThat(captor.getValue().getResource()).isEqualTo(draftResource);
    }

    @Test
    void createFileReference_notOwner_throwsAccessDenied() {
        when(resourceRepository.findById(draftResource.getId())).thenReturn(Optional.of(draftResource));
        when(userRepository.findByCognitoSub("other-sub")).thenReturn(Optional.of(otherUser));

        CreateFileReferenceRequest request = new CreateFileReferenceRequest();
        request.setS3Key("uploads/test/photo.jpg");
        request.setOriginalFileName("photo.jpg");

        assertThatThrownBy(() -> fileService.createFileReference(draftResource.getId(), request, "other-sub"))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void createFileReference_notDraft_throwsIllegalState() {
        draftResource.setStatus(ResourceStatus.APPROVED);
        when(resourceRepository.findById(draftResource.getId())).thenReturn(Optional.of(draftResource));
        when(userRepository.findByCognitoSub("contributor-sub")).thenReturn(Optional.of(contributor));

        CreateFileReferenceRequest request = new CreateFileReferenceRequest();
        request.setS3Key("uploads/test/photo.jpg");
        request.setOriginalFileName("photo.jpg");

        assertThatThrownBy(() -> fileService.createFileReference(draftResource.getId(), request, "contributor-sub"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("DRAFT");
    }

    // --- File reference deletion tests ---

    @Test
    void deleteFileReference_validRequest_deletesReference() {
        FileReference fileRef = new FileReference();
        fileRef.setId(UUID.randomUUID());
        fileRef.setResource(draftResource);
        fileRef.setS3Key("uploads/" + draftResource.getId() + "/photo.jpg");
        fileRef.setOriginalFileName("photo.jpg");

        when(resourceRepository.findById(draftResource.getId())).thenReturn(Optional.of(draftResource));
        when(userRepository.findByCognitoSub("contributor-sub")).thenReturn(Optional.of(contributor));
        when(fileReferenceRepository.findById(fileRef.getId())).thenReturn(Optional.of(fileRef));

        fileService.deleteFileReference(draftResource.getId(), fileRef.getId(), "contributor-sub");

        verify(fileReferenceRepository).delete(fileRef);
    }

    @Test
    void deleteFileReference_fileRefNotFound_throwsNotFound() {
        UUID fileRefId = UUID.randomUUID();
        when(resourceRepository.findById(draftResource.getId())).thenReturn(Optional.of(draftResource));
        when(userRepository.findByCognitoSub("contributor-sub")).thenReturn(Optional.of(contributor));
        when(fileReferenceRepository.findById(fileRefId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> fileService.deleteFileReference(draftResource.getId(), fileRefId, "contributor-sub"))
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
        when(userRepository.findByCognitoSub("contributor-sub")).thenReturn(Optional.of(contributor));
        when(fileReferenceRepository.findById(fileRef.getId())).thenReturn(Optional.of(fileRef));

        assertThatThrownBy(() -> fileService.deleteFileReference(draftResource.getId(), fileRef.getId(), "contributor-sub"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("File reference not found on this resource");
    }

    @Test
    void deleteFileReference_notOwner_throwsAccessDenied() {
        when(resourceRepository.findById(draftResource.getId())).thenReturn(Optional.of(draftResource));
        when(userRepository.findByCognitoSub("other-sub")).thenReturn(Optional.of(otherUser));

        assertThatThrownBy(() -> fileService.deleteFileReference(draftResource.getId(), UUID.randomUUID(), "other-sub"))
                .isInstanceOf(AccessDeniedException.class);
    }

    // --- Constants tests ---

    @Test
    void uploadExpiryIs15Minutes() {
        assertThat(fileService.getUploadExpiryMinutes()).isEqualTo(15);
    }

    @Test
    void downloadExpiryIs60Minutes() {
        assertThat(fileService.getDownloadExpiryMinutes()).isEqualTo(60);
    }

    @Test
    void maxFileSizeIs50MB() {
        assertThat(fileService.getMaxFileSizeBytes()).isEqualTo(50L * 1024 * 1024);
    }
}
