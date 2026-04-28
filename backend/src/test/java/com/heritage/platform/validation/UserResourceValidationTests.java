package com.heritage.platform.validation;

import com.heritage.platform.dto.CreateResourceRequest;
import com.heritage.platform.dto.ResourceResponse;
import com.heritage.platform.dto.UpdateProfileRequest;
import com.heritage.platform.dto.UpdateResourceRequest;
import com.heritage.platform.model.Resource;
import com.heritage.platform.model.ResourceStatus;
import com.heritage.platform.model.User;
import com.heritage.platform.model.UserRole;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class UserResourceValidationTests {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    @Test
    void updateProfileRejectsPasswordShorterThanEightCharacters() {
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setPassword("1234567");

        Set<ConstraintViolation<UpdateProfileRequest>> violations = validator.validate(request);

        assertTrue(
                violations.stream().anyMatch(v ->
                        "password".equals(v.getPropertyPath().toString())
                                && "Password must be at least 8 characters".equals(v.getMessage())
                )
        );
    }

    @Test
    void updateProfileAllowsBlankPasswordSoCurrentPasswordIsKept() {
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setPassword("   ");

        Set<ConstraintViolation<UpdateProfileRequest>> violations = validator.validate(request);

        assertNull(request.getPassword());
        assertTrue(violations.isEmpty());
    }

    @Test
    void createResourceAllowsIncompleteDraftMetadata() {
        CreateResourceRequest request = new CreateResourceRequest();
        request.setTitle(null);
        request.setCategoryId(null);
        request.setCopyrightDeclaration(null);

        Set<ConstraintViolation<CreateResourceRequest>> violations = validator.validate(request);

        assertTrue(violations.isEmpty());
    }

    @Test
    void createResourceRejectsInvalidExternalUrl() {
        CreateResourceRequest request = new CreateResourceRequest();
        request.setExternalLinks(List.of(
                new CreateResourceRequest.ExternalLinkDto("not-a-valid-url", "Bad link")
        ));

        Set<ConstraintViolation<CreateResourceRequest>> violations = validator.validate(request);

        assertTrue(
                violations.stream().anyMatch(v ->
                        v.getPropertyPath().toString().contains("externalLinks")
                                && "URL must be a valid http or https address".equals(v.getMessage())
                )
        );
    }

    @Test
    void createResourceAcceptsValidHttpAndHttpsExternalUrls() {
        CreateResourceRequest request = new CreateResourceRequest();
        request.setExternalLinks(List.of(
                new CreateResourceRequest.ExternalLinkDto("https://example.com/resource?id=1", "HTTPS link"),
                new CreateResourceRequest.ExternalLinkDto("http://example.org/page", "HTTP link")
        ));

        Set<ConstraintViolation<CreateResourceRequest>> violations = validator.validate(request);

        assertTrue(violations.isEmpty());
    }

    @Test
    void updateResourceValidatesNestedExternalLinks() {
        UpdateResourceRequest request = new UpdateResourceRequest();
        request.setExternalLinks(List.of(
                new CreateResourceRequest.ExternalLinkDto("ftp://example.com/file", "FTP link")
        ));

        Set<ConstraintViolation<UpdateResourceRequest>> violations = validator.validate(request);

        assertTrue(
                violations.stream().anyMatch(v ->
                        v.getPropertyPath().toString().contains("externalLinks")
                                && "URL must be a valid http or https address".equals(v.getMessage())
                )
        );
    }

    @Test
    void resourceResponseSupportsDraftWithoutCategory() {
        User contributor = new User();
        contributor.setId(UUID.randomUUID());
        contributor.setEmail("contributor@heritage.demo");
        contributor.setDisplayName("Contributor");
        contributor.setRole(UserRole.CONTRIBUTOR);

        Resource resource = new Resource();
        resource.setId(UUID.randomUUID());
        resource.setContributor(contributor);
        resource.setTitle(null);
        resource.setCategory(null);
        resource.setCopyrightDeclaration(null);
        resource.setStatus(ResourceStatus.DRAFT);

        ResourceResponse response = ResourceResponse.fromEntity(resource);

        assertNull(response.getCategory());
        assertNull(response.getTitle());
        assertEquals("DRAFT", response.getStatus());
        assertEquals(contributor.getId(), response.getContributorId());
    }
}
