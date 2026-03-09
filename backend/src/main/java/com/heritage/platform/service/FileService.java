package com.heritage.platform.service;

import com.heritage.platform.config.AwsS3Config;
import com.heritage.platform.dto.CreateFileReferenceRequest;
import com.heritage.platform.exception.AccessDeniedException;
import com.heritage.platform.exception.ResourceNotFoundException;
import com.heritage.platform.exception.S3ServiceException;
import com.heritage.platform.model.FileReference;
import com.heritage.platform.model.Resource;
import com.heritage.platform.model.ResourceStatus;
import com.heritage.platform.model.User;
import com.heritage.platform.repository.FileReferenceRepository;
import com.heritage.platform.repository.ResourceRepository;
import com.heritage.platform.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;
import java.util.UUID;

@Service
public class FileService {

    private static final int UPLOAD_EXPIRY_MINUTES = 15;
    private static final int DOWNLOAD_EXPIRY_MINUTES = 60;
    private static final long MAX_FILE_SIZE_BYTES = 50L * 1024 * 1024; // 50 MB

    private final S3Presigner s3Presigner;
    private final AwsS3Config s3Config;
    private final ResourceRepository resourceRepository;
    private final FileReferenceRepository fileReferenceRepository;
    private final UserRepository userRepository;

    public FileService(S3Presigner s3Presigner,
                       AwsS3Config s3Config,
                       ResourceRepository resourceRepository,
                       FileReferenceRepository fileReferenceRepository,
                       UserRepository userRepository) {
        this.s3Presigner = s3Presigner;
        this.s3Config = s3Config;
        this.resourceRepository = resourceRepository;
        this.fileReferenceRepository = fileReferenceRepository;
        this.userRepository = userRepository;
    }

    /**
     * Generates a pre-signed PUT URL for uploading a file to S3.
     * Scoped to uploads/{resourceId}/{fileName} with 15-minute expiry.
     */
    public String generateUploadUrl(UUID resourceId, String fileName, String contentType, String cognitoSub) {
        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        User user = userRepository.findByCognitoSub(cognitoSub)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        validateOwnershipAndDraftStatus(resource, user);

        String s3Key = buildUploadKey(resourceId, fileName);

        try {
            PutObjectRequest.Builder putBuilder = PutObjectRequest.builder()
                    .bucket(s3Config.getBucket())
                    .key(s3Key);

            if (contentType != null && !contentType.isBlank()) {
                putBuilder.contentType(contentType);
            }

            PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofMinutes(UPLOAD_EXPIRY_MINUTES))
                    .putObjectRequest(putBuilder.build())
                    .build();

            return s3Presigner.presignPutObject(presignRequest).url().toString();
        } catch (Exception e) {
            throw new S3ServiceException("Failed to generate upload URL", e);
        }
    }

    /**
     * Generates a pre-signed GET URL for downloading a file from S3.
     * 60-minute expiry for read-only access.
     */
    public String generateDownloadUrl(String s3Key) {
        try {
            GetObjectRequest getRequest = GetObjectRequest.builder()
                    .bucket(s3Config.getBucket())
                    .key(s3Key)
                    .build();

            GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofMinutes(DOWNLOAD_EXPIRY_MINUTES))
                    .getObjectRequest(getRequest)
                    .build();

            return s3Presigner.presignGetObject(presignRequest).url().toString();
        } catch (Exception e) {
            throw new S3ServiceException("Failed to generate download URL", e);
        }
    }

    /**
     * Creates a file reference on a resource after upload completes.
     */
    @Transactional
    public FileReference createFileReference(UUID resourceId, CreateFileReferenceRequest request, String cognitoSub) {
        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        User user = userRepository.findByCognitoSub(cognitoSub)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        validateOwnershipAndDraftStatus(resource, user);

        FileReference fileRef = new FileReference();
        fileRef.setResource(resource);
        fileRef.setS3Key(request.getS3Key());
        fileRef.setOriginalFileName(request.getOriginalFileName());
        fileRef.setContentType(request.getContentType());
        fileRef.setFileSize(request.getFileSize());

        return fileReferenceRepository.save(fileRef);
    }

    /**
     * Deletes a file reference from a draft resource.
     */
    @Transactional
    public void deleteFileReference(UUID resourceId, UUID fileRefId, String cognitoSub) {
        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        User user = userRepository.findByCognitoSub(cognitoSub)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        validateOwnershipAndDraftStatus(resource, user);

        FileReference fileRef = fileReferenceRepository.findById(fileRefId)
                .orElseThrow(() -> new ResourceNotFoundException("File reference not found"));

        if (!fileRef.getResource().getId().equals(resourceId)) {
            throw new ResourceNotFoundException("File reference not found on this resource");
        }

        fileReferenceRepository.delete(fileRef);
    }

    public String buildUploadKey(UUID resourceId, String fileName) {
        return "uploads/" + resourceId + "/" + fileName;
    }

    private void validateOwnershipAndDraftStatus(Resource resource, User user) {
        if (!resource.getContributor().getId().equals(user.getId())) {
            throw new AccessDeniedException("You do not have permission to modify this resource");
        }
        if (resource.getStatus() != ResourceStatus.DRAFT) {
            throw new IllegalStateException("File operations are only allowed on DRAFT resources");
        }
    }

    public int getUploadExpiryMinutes() {
        return UPLOAD_EXPIRY_MINUTES;
    }

    public int getDownloadExpiryMinutes() {
        return DOWNLOAD_EXPIRY_MINUTES;
    }

    public long getMaxFileSizeBytes() {
        return MAX_FILE_SIZE_BYTES;
    }
}
