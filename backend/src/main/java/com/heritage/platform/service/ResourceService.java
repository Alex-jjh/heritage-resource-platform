package com.heritage.platform.service;

import com.heritage.platform.dto.CreateResourceRequest;
import com.heritage.platform.dto.UpdateResourceRequest;
import com.heritage.platform.exception.AccessDeniedException;
import com.heritage.platform.exception.InvalidStatusTransitionException;
import com.heritage.platform.exception.ResourceNotFoundException;
import com.heritage.platform.model.*;
import com.heritage.platform.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
public class ResourceService {

    private final ResourceRepository resourceRepository;
    private final CategoryRepository categoryRepository;
    private final TagRepository tagRepository;
    private final UserRepository userRepository;
    private final StatusTransitionRepository statusTransitionRepository;

    public ResourceService(ResourceRepository resourceRepository,
                           CategoryRepository categoryRepository,
                           TagRepository tagRepository,
                           UserRepository userRepository,
                           StatusTransitionRepository statusTransitionRepository) {
        this.resourceRepository = resourceRepository;
        this.categoryRepository = categoryRepository;
        this.tagRepository = tagRepository;
        this.userRepository = userRepository;
        this.statusTransitionRepository = statusTransitionRepository;
    }

    /**
     * Creates a new draft resource for the given contributor.
     */
    @Transactional
    public Resource createResource(String cognitoSub, CreateResourceRequest request) {
        User contributor = userRepository.findByCognitoSub(cognitoSub)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));

        Resource resource = new Resource();
        resource.setContributor(contributor);
        resource.setTitle(request.getTitle());
        resource.setCategory(category);
        resource.setPlace(request.getPlace());
        resource.setDescription(request.getDescription());
        resource.setCopyrightDeclaration(request.getCopyrightDeclaration());
        resource.setStatus(ResourceStatus.DRAFT);

        if (request.getTagIds() != null && !request.getTagIds().isEmpty()) {
            Set<Tag> tags = new HashSet<>(tagRepository.findAllById(request.getTagIds()));
            resource.setTags(tags);
        }

        if (request.getExternalLinks() != null) {
            for (CreateResourceRequest.ExternalLinkDto linkDto : request.getExternalLinks()) {
                ExternalLink link = new ExternalLink();
                link.setUrl(linkDto.getUrl());
                link.setLabel(linkDto.getLabel());
                link.setResource(resource);
                resource.getExternalLinks().add(link);
            }
        }

        return resourceRepository.save(resource);
    }

    /**
     * Gets a resource by ID with access control based on status and role.
     * Non-admin users can only see APPROVED resources (or their own).
     */
    public Resource getResourceById(UUID resourceId, String cognitoSub) {
        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        User user = userRepository.findByCognitoSub(cognitoSub)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Admins can see all resources
        if (user.getRole() == UserRole.ADMINISTRATOR) {
            return resource;
        }

        // Owners can see their own resources regardless of status
        if (resource.getContributor().getId().equals(user.getId())) {
            return resource;
        }

        // Reviewers can see PENDING_REVIEW resources
        if (user.getRole() == UserRole.REVIEWER
                && resource.getStatus() == ResourceStatus.PENDING_REVIEW) {
            return resource;
        }

        // Everyone else can only see APPROVED resources
        if (resource.getStatus() != ResourceStatus.APPROVED) {
            throw new ResourceNotFoundException("Resource not found");
        }

        return resource;
    }

    /**
     * Updates a draft resource. Only the owner can update, and only while in DRAFT status.
     */
    @Transactional
    public Resource updateResource(UUID resourceId, String cognitoSub, UpdateResourceRequest request) {
        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        User user = userRepository.findByCognitoSub(cognitoSub)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        validateOwnership(resource, user);

        if (resource.getStatus() != ResourceStatus.DRAFT) {
            throw new IllegalStateException("Resource can only be edited in DRAFT status");
        }

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));

        resource.setTitle(request.getTitle());
        resource.setCategory(category);
        resource.setPlace(request.getPlace());
        resource.setDescription(request.getDescription());
        resource.setCopyrightDeclaration(request.getCopyrightDeclaration());

        if (request.getTagIds() != null) {
            Set<Tag> tags = new HashSet<>(tagRepository.findAllById(request.getTagIds()));
            resource.setTags(tags);
        }

        if (request.getExternalLinks() != null) {
            resource.getExternalLinks().clear();
            for (CreateResourceRequest.ExternalLinkDto linkDto : request.getExternalLinks()) {
                ExternalLink link = new ExternalLink();
                link.setUrl(linkDto.getUrl());
                link.setLabel(linkDto.getLabel());
                link.setResource(resource);
                resource.getExternalLinks().add(link);
            }
        }

        return resourceRepository.save(resource);
    }

    /**
     * Deletes a draft resource. Hard delete with cascade to file references and external links.
     */
    @Transactional
    public void deleteResource(UUID resourceId, String cognitoSub) {
        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        User user = userRepository.findByCognitoSub(cognitoSub)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        validateOwnership(resource, user);

        if (resource.getStatus() != ResourceStatus.DRAFT) {
            throw new IllegalStateException("Only DRAFT resources can be deleted");
        }

        resourceRepository.delete(resource);
    }

    /**
     * Lists all resources owned by the given contributor.
     */
    public List<Resource> listContributorResources(String cognitoSub) {
        User user = userRepository.findByCognitoSub(cognitoSub)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return resourceRepository.findByContributorId(user.getId());
    }

    /**
     * Transitions a resource to a new status, validating the transition and recording it.
     */
    @Transactional
    public Resource transitionStatus(UUID resourceId, ResourceStatus targetStatus, User actor) {
        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        ResourceStatus currentStatus = resource.getStatus();
        if (!currentStatus.canTransitionTo(targetStatus)) {
            throw new InvalidStatusTransitionException(
                    String.format("Cannot transition from %s to %s. Allowed transitions from %s: %s",
                            currentStatus, targetStatus, currentStatus,
                            getAllowedTargets(currentStatus)));
        }

        resource.setStatus(targetStatus);

        if (targetStatus == ResourceStatus.APPROVED) {
            resource.setApprovedAt(Instant.now());
        } else if (targetStatus == ResourceStatus.ARCHIVED) {
            resource.setArchivedAt(Instant.now());
        }

        StatusTransition transition = new StatusTransition();
        transition.setResource(resource);
        transition.setActor(actor);
        transition.setFromStatus(currentStatus);
        transition.setToStatus(targetStatus);
        statusTransitionRepository.save(transition);

        return resourceRepository.save(resource);
    }

    /**
     * Submits a draft resource for review. Validates required metadata.
     */
    @Transactional
    public Resource submitForReview(UUID resourceId, String cognitoSub) {
        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        User user = userRepository.findByCognitoSub(cognitoSub)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        validateOwnership(resource, user);
        validateRequiredMetadata(resource);

        return transitionStatus(resourceId, ResourceStatus.PENDING_REVIEW, user);
    }

    /**
     * Moves a rejected resource back to draft for revision.
     */
    @Transactional
    public Resource revise(UUID resourceId, String cognitoSub) {
        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        User user = userRepository.findByCognitoSub(cognitoSub)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        validateOwnership(resource, user);

        return transitionStatus(resourceId, ResourceStatus.DRAFT, user);
    }

    private void validateOwnership(Resource resource, User user) {
        if (!resource.getContributor().getId().equals(user.getId())) {
            throw new AccessDeniedException("You do not have permission to modify this resource");
        }
    }

    private void validateRequiredMetadata(Resource resource) {
        Map<String, String> errors = new LinkedHashMap<>();
        if (resource.getTitle() == null || resource.getTitle().isBlank()) {
            errors.put("title", "Title is required");
        }
        if (resource.getCategory() == null) {
            errors.put("category", "Category is required");
        }
        if (resource.getCopyrightDeclaration() == null || resource.getCopyrightDeclaration().isBlank()) {
            errors.put("copyrightDeclaration", "Copyright declaration is required");
        }
        if (!errors.isEmpty()) {
            throw new IllegalStateException("Resource is missing required metadata: " + errors.keySet());
        }
    }

    private String getAllowedTargets(ResourceStatus status) {
        List<String> allowed = new ArrayList<>();
        for (ResourceStatus target : ResourceStatus.values()) {
            if (status.canTransitionTo(target)) {
                allowed.add(target.name());
            }
        }
        return allowed.isEmpty() ? "none" : String.join(", ", allowed);
    }
}
