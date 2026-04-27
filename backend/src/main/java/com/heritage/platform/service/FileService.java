package com.heritage.platform.service;

import com.heritage.platform.exception.AccessDeniedException;
import com.heritage.platform.exception.ResourceNotFoundException;
import com.heritage.platform.model.FileReference;
import com.heritage.platform.model.Resource;
import com.heritage.platform.model.ResourceStatus;
import com.heritage.platform.model.User;
import com.heritage.platform.repository.FileReferenceRepository;
import com.heritage.platform.repository.ResourceRepository;
import com.heritage.platform.repository.UserRepository;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;

@Service
public class FileService {

    private static final long MAX_FILE_SIZE_BYTES = 50L * 1024 * 1024; // 50 MB
    private static final long MAX_AVATAR_SIZE_BYTES = 5L * 1024 * 1024; // 5 MB
    private static final int MAX_FILES_PER_RESOURCE = 10;

    private static final int THUMBNAIL_WIDTH = 400;
    private static final int THUMBNAIL_HEIGHT = 300;

    private static final Set<String> IMAGE_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp"
    );

    private static final Set<String> AVATAR_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp"
    );

    private final ResourceRepository resourceRepository;
    private final FileReferenceRepository fileReferenceRepository;
    private final UserRepository userRepository;

    @Value("${app.storage.upload-dir:/opt/heritage/uploads}")
    private String uploadDir;

    @Value("${app.storage.thumbnail-dir:/opt/heritage/thumbnails}")
    private String thumbnailDir;

    @Value("${app.storage.avatar-dir:/opt/heritage/avatars}")
    private String avatarDir;

    @Value("${app.storage.base-url:}")
    private String storageBaseUrl;

    public FileService(ResourceRepository resourceRepository,
                       FileReferenceRepository fileReferenceRepository,
                       UserRepository userRepository) {
        this.resourceRepository = resourceRepository;
        this.fileReferenceRepository = fileReferenceRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public FileReference uploadFile(UUID resourceId, MultipartFile file, String email) throws IOException {
        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        validateOwnershipAndDraftStatus(resource, user);

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File must not be empty");
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File size exceeds maximum of 50MB");
        }

        int currentCount = fileReferenceRepository.countByResourceId(resourceId);
        if (currentCount >= MAX_FILES_PER_RESOURCE) {
            throw new IllegalStateException("Upload limit reached: a resource cannot have more than 10 media files");
        }

        String originalFileName = file.getOriginalFilename() == null
                ? "upload-file"
                : file.getOriginalFilename();

        String storedFileName = UUID.randomUUID() + "_" + originalFileName;
        Path resourceDir = Paths.get(uploadDir, resourceId.toString());
        Files.createDirectories(resourceDir);
        Path filePath = resourceDir.resolve(storedFileName);
        file.transferTo(filePath.toFile());

        String fileKey = resourceId + "/" + storedFileName;
        FileReference fileRef = new FileReference();
        fileRef.setResource(resource);
        fileRef.setS3Key(fileKey);
        fileRef.setOriginalFileName(originalFileName);
        fileRef.setContentType(file.getContentType());
        fileRef.setFileSize(file.getSize());
        FileReference saved = fileReferenceRepository.save(fileRef);

        if (file.getContentType() != null && IMAGE_CONTENT_TYPES.contains(file.getContentType())) {
            generateThumbnail(resourceId, filePath, storedFileName);
        }

        return saved;
    }

    public String uploadAvatar(MultipartFile file, UUID userId) {
        validateAvatarFile(file);

        userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String originalFileName = file.getOriginalFilename() == null
                ? "avatar"
                : file.getOriginalFilename();

        String storedFileName = UUID.randomUUID() + "_" + originalFileName;

        try {
            Path userAvatarDir = Paths.get(avatarDir, userId.toString());
            Files.createDirectories(userAvatarDir);

            Path avatarPath = userAvatarDir.resolve(storedFileName);
            file.transferTo(avatarPath.toFile());

            String avatarKey = userId + "/" + storedFileName;
            return generateAvatarUrl(avatarKey);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to upload avatar image", e);
        }
    }

    public String generateDownloadUrl(String fileKey) {
        return storageBaseUrl + "/files/uploads/" + fileKey;
    }

    public String generateThumbnailUrl(String thumbnailKey) {
        return storageBaseUrl + "/files/thumbnails/" + thumbnailKey;
    }

    public String generateAvatarUrl(String avatarKey) {
        return storageBaseUrl + "/files/avatars/" + avatarKey;
    }

    @Transactional
    public void setCover(UUID resourceId, UUID fileRefId, String email) {
        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        validateOwnershipAndDraftStatus(resource, user);

        FileReference fileRef = fileReferenceRepository.findById(fileRefId)
                .orElseThrow(() -> new ResourceNotFoundException("File reference not found"));
        if (!fileRef.getResource().getId().equals(resourceId)) {
            throw new ResourceNotFoundException("File reference not found on this resource");
        }

        resource.setThumbnailS3Key(fileRef.getS3Key());
        resourceRepository.save(resource);
    }

    /**
     * Deletes a file reference and its physical file from disk.
     */
    @Transactional
    public void deleteFileReference(UUID resourceId, UUID fileRefId, String email) {
        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        validateOwnershipAndDraftStatus(resource, user);

        FileReference fileRef = fileReferenceRepository.findById(fileRefId)
                .orElseThrow(() -> new ResourceNotFoundException("File reference not found"));
        if (!fileRef.getResource().getId().equals(resourceId)) {
            throw new ResourceNotFoundException("File reference not found on this resource");
        }

        try {
            Path filePath = Paths.get(uploadDir, fileRef.getS3Key());
            Files.deleteIfExists(filePath);
        } catch (IOException ignored) {
        }

        fileReferenceRepository.delete(fileRef);
    }

    private void validateAvatarFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Avatar file must not be empty");
        }

        if (file.getSize() > MAX_AVATAR_SIZE_BYTES) {
            throw new IllegalArgumentException("Avatar image must be smaller than 5MB");
        }

        String contentType = file.getContentType();
        if (contentType == null || !AVATAR_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Only JPG, PNG, and WEBP images are allowed for avatars");
        }
    }

    private void generateThumbnail(UUID resourceId, Path originalPath, String fileName) {
        try {
            Path thumbDir = Paths.get(thumbnailDir, resourceId.toString());
            Files.createDirectories(thumbDir);
            Path thumbPath = thumbDir.resolve(fileName);

            Thumbnails.of(originalPath.toFile())
                    .size(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT)
                    .toFile(thumbPath.toFile());

            Resource resource = resourceRepository.findById(resourceId).orElse(null);
            if (resource != null) {
                resource.setThumbnailS3Key(resourceId + "/" + fileName);
                resourceRepository.save(resource);
            }
        } catch (IOException e) {
        }
    }

    private void validateOwnershipAndDraftStatus(Resource resource, User user) {
        if (!resource.getContributor().getId().equals(user.getId())) {
            throw new AccessDeniedException("You do not have permission to modify this resource");
        }
        if (resource.getStatus() != ResourceStatus.DRAFT) {
            throw new IllegalStateException("File operations are only allowed on DRAFT resources");
        }
    }
}