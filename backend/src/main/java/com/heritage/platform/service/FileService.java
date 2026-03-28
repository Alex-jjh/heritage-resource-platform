package com.heritage.platform.service;

import com.heritage.platform.dto.CreateFileReferenceRequest;
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
    private static final int THUMBNAIL_WIDTH = 400;
    private static final int THUMBNAIL_HEIGHT = 300;
    private static final Set<String> IMAGE_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp");

    private final ResourceRepository resourceRepository;
    private final FileReferenceRepository fileReferenceRepository;
    private final UserRepository userRepository;

    @Value("${app.storage.upload-dir:/opt/heritage/uploads}")
    private String uploadDir;

    @Value("${app.storage.thumbnail-dir:/opt/heritage/thumbnails}")
    private String thumbnailDir;

    @Value("${app.storage.base-url:}")
    private String storageBaseUrl;

    public FileService(ResourceRepository resourceRepository,
                       FileReferenceRepository fileReferenceRepository,
                       UserRepository userRepository) {
        this.resourceRepository = resourceRepository;
        this.fileReferenceRepository = fileReferenceRepository;
        this.userRepository = userRepository;
    }

    /**
     * Uploads a file to local disk and creates a file reference.
     * Also generates a thumbnail if the file is an image.
     */
    @Transactional
    public FileReference uploadFile(UUID resourceId, MultipartFile file, String email) throws IOException {
        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        validateOwnershipAndDraftStatus(resource, user);

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File size exceeds maximum of 50MB");
        }

        // Save file to disk
        String storedFileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path resourceDir = Paths.get(uploadDir, resourceId.toString());
        Files.createDirectories(resourceDir);
        Path filePath = resourceDir.resolve(storedFileName);
        file.transferTo(filePath.toFile());

        // Create file reference
        String fileKey = resourceId + "/" + storedFileName;
        FileReference fileRef = new FileReference();
        fileRef.setResource(resource);
        fileRef.setS3Key(fileKey); // reuse s3_key column for local path
        fileRef.setOriginalFileName(file.getOriginalFilename());
        fileRef.setContentType(file.getContentType());
        fileRef.setFileSize(file.getSize());
        FileReference saved = fileReferenceRepository.save(fileRef);

        // Generate thumbnail if image
        if (file.getContentType() != null && IMAGE_CONTENT_TYPES.contains(file.getContentType())) {
            generateThumbnail(resourceId, filePath, storedFileName);
        }

        return saved;
    }

    /**
     * Generates a download URL for a file (local path served by Nginx).
     */
    public String generateDownloadUrl(String fileKey) {
        return storageBaseUrl + "/files/uploads/" + fileKey;
    }

    /**
     * Generates a thumbnail URL.
     */
    public String generateThumbnailUrl(String thumbnailKey) {
        return storageBaseUrl + "/files/thumbnails/" + thumbnailKey;
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

        // Delete physical file
        try {
            Path filePath = Paths.get(uploadDir, fileRef.getS3Key());
            Files.deleteIfExists(filePath);
        } catch (IOException ignored) {}

        fileReferenceRepository.delete(fileRef);
    }

    private void generateThumbnail(UUID resourceId, Path originalPath, String fileName) {
        try {
            Path thumbDir = Paths.get(thumbnailDir, resourceId.toString());
            Files.createDirectories(thumbDir);
            Path thumbPath = thumbDir.resolve(fileName);

            Thumbnails.of(originalPath.toFile())
                    .size(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT)
                    .toFile(thumbPath.toFile());

            // Update resource thumbnail key
            Resource resource = resourceRepository.findById(resourceId).orElse(null);
            if (resource != null) {
                resource.setThumbnailS3Key(resourceId + "/" + fileName);
                resourceRepository.save(resource);
            }
        } catch (IOException e) {
            // Thumbnail generation failure is non-fatal
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
