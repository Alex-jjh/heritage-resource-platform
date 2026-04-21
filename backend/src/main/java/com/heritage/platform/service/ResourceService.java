package com.heritage.platform.service;

import com.heritage.platform.dto.CreateResourceRequest;
import com.heritage.platform.dto.UpdateResourceRequest;
import com.heritage.platform.exception.AccessDeniedException;
import com.heritage.platform.exception.InvalidStatusTransitionException;
import com.heritage.platform.exception.ResourceNotFoundException;
import com.heritage.platform.model.Category;
import com.heritage.platform.model.ExternalLink;
import com.heritage.platform.model.FeaturedStatus;
import com.heritage.platform.model.Resource;
import com.heritage.platform.model.ResourceStatus;
import com.heritage.platform.model.StatusTransition;
import com.heritage.platform.model.Tag;
import com.heritage.platform.model.User;
import com.heritage.platform.model.UserRole;
import com.heritage.platform.repository.CategoryRepository;
import com.heritage.platform.repository.ResourceRepository;
import com.heritage.platform.repository.StatusTransitionRepository;
import com.heritage.platform.repository.TagRepository;
import com.heritage.platform.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ResourceService {

    private static final int HOMEPAGE_FEATURED_LIMIT = 20;

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

    @Transactional
    public Resource createResource(String email, CreateResourceRequest request) {
        User contributor = userRepository.findByEmail(email)
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
            resource.setTags(new HashSet<>(tagRepository.findAllById(request.getTagIds())));
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

        return saveAndInitialize(resource);
    }

    @Transactional(readOnly = true)
    public Resource getResourceById(UUID resourceId, String email) {
        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getRole() == UserRole.ADMINISTRATOR) {
            initializeLazyAssociations(resource);
            return resource;
        }

        if (resource.getContributor().getId().equals(user.getId())) {
            initializeLazyAssociations(resource);
            return resource;
        }

        if (user.getRole() == UserRole.REVIEWER
                && resource.getStatus() == ResourceStatus.PENDING_REVIEW) {
            initializeLazyAssociations(resource);
            return resource;
        }

        if (resource.getStatus() != ResourceStatus.APPROVED) {
            throw new ResourceNotFoundException("Resource not found");
        }

        initializeLazyAssociations(resource);
        return resource;
    }

    @Transactional
    public Resource updateResource(UUID resourceId, String email, UpdateResourceRequest request) {
        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        User user = userRepository.findByEmail(email)
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
            resource.setTags(new HashSet<>(tagRepository.findAllById(request.getTagIds())));
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

        return saveAndInitialize(resource);
    }

    @Transactional
    public void deleteResource(UUID resourceId, String email) {
        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        validateOwnership(resource, user);

        if (resource.getStatus() != ResourceStatus.DRAFT) {
            throw new IllegalStateException("Only DRAFT resources can be deleted");
        }

        resourceRepository.delete(resource);
    }

    @Transactional(readOnly = true)
    public List<Resource> listContributorResources(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<Resource> resources = resourceRepository.findByContributorId(user.getId());
        resources.forEach(this::initializeLazyAssociations);
        return resources;
    }

    @Transactional(readOnly = true)
    public List<Resource> getFeaturedResources() {
        List<Resource> resources = resourceRepository.findByIsFeaturedTrueAndStatusOrderByApprovedAtDesc(ResourceStatus.APPROVED);
        resources.forEach(this::initializeLazyAssociations);
        return resources;
    }

    @Transactional(readOnly = true)
    public List<Resource> getHomepageFeaturedResources() {
        List<Resource> featured = resourceRepository.findByIsFeaturedTrueAndStatusOrderByApprovedAtDesc(ResourceStatus.APPROVED);
        List<Resource> latestApproved = resourceRepository.findByStatusOrderByApprovedAtDesc(ResourceStatus.APPROVED);

        LinkedHashMap<UUID, Resource> ordered = new LinkedHashMap<>();

        for (Resource resource : featured) {
            ordered.put(resource.getId(), resource);
            if (ordered.size() == HOMEPAGE_FEATURED_LIMIT) {
                break;
            }
        }

        if (ordered.size() < HOMEPAGE_FEATURED_LIMIT) {
            for (Resource resource : latestApproved) {
                ordered.putIfAbsent(resource.getId(), resource);
                if (ordered.size() == HOMEPAGE_FEATURED_LIMIT) {
                    break;
                }
            }
        }

        List<Resource> result = new ArrayList<>(ordered.values());
        result.forEach(this::initializeLazyAssociations);
        return result;
    }

    @Transactional(readOnly = true)
    public List<Resource> getPendingFeaturedApplications(String email) {
        requireAdministrator(email);

        List<Resource> resources = resourceRepository.findByFeaturedStatusOrderByCreatedAtDesc(FeaturedStatus.PENDING);
        resources.forEach(this::initializeLazyAssociations);
        return resources;
    }

    @Transactional
    public Resource transitionStatus(UUID resourceId, ResourceStatus targetStatus, User actor) {
        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        ResourceStatus currentStatus = resource.getStatus();
        if (!currentStatus.canTransitionTo(targetStatus)) {
            throw new InvalidStatusTransitionException(
                    String.format("Cannot transition from %s to %s. Allowed transitions from %s: %s",
                            currentStatus, targetStatus, currentStatus, getAllowedTargets(currentStatus)))
                    ;
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

        return saveAndInitialize(resource);
    }

    @Transactional
    public Resource submitForReview(UUID resourceId, String email) {
        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        validateOwnership(resource, user);
        validateRequiredMetadata(resource);

        return transitionStatus(resourceId, ResourceStatus.PENDING_REVIEW, user);
    }

    @Transactional
    public Resource revise(UUID resourceId, String email) {
        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        validateOwnership(resource, user);

        return transitionStatus(resourceId, ResourceStatus.DRAFT, user);
    }

    @Transactional
    public void applyForFeatured(UUID resourceId, String email) {
        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        validateOwnership(resource, user);

        if (resource.getStatus() != ResourceStatus.APPROVED) {
            throw new IllegalStateException("Only approved resources can be featured.");
        }

        if (resource.isFeatured() || resource.getFeaturedStatus() == FeaturedStatus.APPROVED) {
            throw new IllegalStateException("This resource is already featured.");
        }

        if (resource.getFeaturedStatus() == FeaturedStatus.PENDING) {
            throw new IllegalStateException("This resource already has a pending featured application.");
        }

        resource.setFeaturedStatus(FeaturedStatus.PENDING);
        resourceRepository.save(resource);
    }

    @Transactional
    public void approveFeatured(UUID resourceId, boolean approved, String email) {
        requireAdministrator(email);

        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        if (resource.getFeaturedStatus() != FeaturedStatus.PENDING) {
            throw new IllegalStateException("This resource does not have a pending featured application.");
        }

        if (approved) {
            resource.setFeaturedStatus(FeaturedStatus.APPROVED);
            resource.setFeatured(true);
        } else {
            resource.setFeaturedStatus(FeaturedStatus.REJECTED);
            resource.setFeatured(false);
        }

        resourceRepository.save(resource);
    }

    @Transactional
    public void featureResource(UUID resourceId, String email) {
        requireAdministrator(email);

        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        if (resource.getStatus() != ResourceStatus.APPROVED) {
            throw new IllegalStateException("Only approved resources can be manually featured.");
        }

        resource.setFeatured(true);
        resource.setFeaturedStatus(FeaturedStatus.APPROVED);
        resourceRepository.save(resource);
    }

    @Transactional
    public void unfeatureResource(UUID resourceId, String email) {
        requireAdministrator(email);

        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        resource.setFeatured(false);
        resource.setFeaturedStatus(FeaturedStatus.NONE);
        resourceRepository.save(resource);
    }

    private Resource saveAndInitialize(Resource resource) {
        Resource saved = resourceRepository.save(resource);
        initializeLazyAssociations(saved);
        return saved;
    }

    private void initializeLazyAssociations(Resource resource) {
        if (resource.getCategory() != null) resource.getCategory().getName();
        if (resource.getTags() != null) resource.getTags().size();
        if (resource.getExternalLinks() != null) resource.getExternalLinks().size();
        if (resource.getFileReferences() != null) resource.getFileReferences().size();
        if (resource.getReviewFeedbacks() != null) resource.getReviewFeedbacks().size();
        if (resource.getContributor() != null) resource.getContributor().getDisplayName();
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

    private User requireAdministrator(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getRole() != UserRole.ADMINISTRATOR) {
            throw new AccessDeniedException("Administrator permission is required");
        }

        return user;
    }
}