package com.heritage.platform.config;

import com.heritage.platform.service.JwtService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.*;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests for SecurityConfig authorization rules.
 * Uses stub controllers to exercise the security filter chain rules
 * without requiring real service implementations.
 */
@WebMvcTest(
        controllers = {
                SecurityConfigTest.StubAuthController.class,
                SecurityConfigTest.StubResourceController.class,
                SecurityConfigTest.StubAdminController.class,
                SecurityConfigTest.StubReviewController.class,
                SecurityConfigTest.StubFileController.class,
                SecurityConfigTest.StubInternalController.class,
                SecurityConfigTest.StubSearchController.class
        },
        properties = "app.internal-api-key=dummy-test-key"
)
@ActiveProfiles("test")
@Import(SecurityConfig.class)
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JwtService jwtService;

    // ── Stub controllers that map to the secured paths ──

    @RestController static class StubAuthController {
        @PostMapping("/api/auth/register") String register() { return "ok"; }
        @PostMapping("/api/auth/login") String login() { return "ok"; }
        @PostMapping("/api/auth/logout") String logout() { return "ok"; }
    }

    @RestController static class StubResourceController {
        @PostMapping("/api/resources") String create() { return "ok"; }
        @GetMapping("/api/resources/{id}") String getById(@PathVariable String id) { return "ok"; }
        @PutMapping("/api/resources/{id}") String update(@PathVariable String id) { return "ok"; }
        @DeleteMapping("/api/resources/{id}") String remove(@PathVariable String id) { return "ok"; }
        @PostMapping("/api/resources/{id}/submit") String submit(@PathVariable String id) { return "ok"; }
        @GetMapping("/api/resources/mine") String mine() { return "ok"; }
    }

    @RestController static class StubAdminController {
        @PostMapping("/api/admin/resources/{id}/archive") String archive(@PathVariable String id) { return "ok"; }
        @GetMapping("/api/admin/resources/archived") String archived() { return "ok"; }
    }

    @RestController static class StubReviewController {
        @GetMapping("/api/reviews/queue") String queue() { return "ok"; }
        @PostMapping("/api/reviews/{id}/approve") String approve(@PathVariable String id) { return "ok"; }
        @PostMapping("/api/reviews/{id}/reject") String reject(@PathVariable String id) { return "ok"; }
    }

    @RestController static class StubFileController {
        @PostMapping("/api/files/upload-url") String uploadUrl() { return "ok"; }
    }

    @RestController static class StubInternalController {
        @PostMapping("/api/internal/thumbnails") String thumbnails() { return "ok"; }
    }

    @RestController static class StubSearchController {
        @GetMapping("/api/search/resources") String search() { return "ok"; }
    }

    // ── Tests ──

    @Nested
    @DisplayName("Public endpoints (no auth required)")
    class PublicEndpoints {

        @Test
        @DisplayName("POST /api/auth/register is accessible without authentication")
        void registerIsPublic() throws Exception {
            mockMvc.perform(post("/api/auth/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{}"))
                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("POST /api/auth/login is accessible without authentication")
        void loginIsPublic() throws Exception {
            mockMvc.perform(post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{}"))
                .andExpect(status().isOk());
        }
    }

    @Nested
    @DisplayName("Unauthenticated requests return 401")
    class UnauthenticatedRequests {

        @Test
        @DisplayName("GET /api/resources/{id} without token returns 401")
        void getResourceWithoutToken() throws Exception {
            mockMvc.perform(get("/api/resources/123"))
                .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("POST /api/auth/logout without token returns 401")
        void logoutWithoutToken() throws Exception {
            mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("GET /api/search/resources without token returns 401")
        void searchWithoutToken() throws Exception {
            mockMvc.perform(get("/api/search/resources"))
                .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("POST /api/resources without token returns 401")
        void createResourceWithoutToken() throws Exception {
            mockMvc.perform(post("/api/resources")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{}"))
                .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("GET /api/admin/resources/archived without token returns 401")
        void adminWithoutToken() throws Exception {
            mockMvc.perform(get("/api/admin/resources/archived"))
                .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("GET /api/reviews/queue without token returns 401")
        void reviewQueueWithoutToken() throws Exception {
            mockMvc.perform(get("/api/reviews/queue"))
                .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("Role-based access: ADMINISTRATOR endpoints")
    class AdminRoleAccess {

        @Test
        @DisplayName("ADMINISTRATOR can access admin endpoints")
        void adminCanAccessAdminEndpoints() throws Exception {
            mockMvc.perform(post("/api/admin/resources/123/archive")
                    .with(user("admin@example.com").authorities(new SimpleGrantedAuthority("ROLE_ADMINISTRATOR"))))
                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("CONTRIBUTOR cannot access admin endpoints — returns 403")
        void contributorCannotAccessAdmin() throws Exception {
            mockMvc.perform(get("/api/admin/resources/archived")
                    .with(user("contributor@example.com").authorities(new SimpleGrantedAuthority("ROLE_CONTRIBUTOR"))))
                .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("REGISTERED_VIEWER cannot access admin endpoints — returns 403")
        void viewerCannotAccessAdmin() throws Exception {
            mockMvc.perform(get("/api/admin/resources/archived")
                    .with(user("viewer@example.com").authorities(new SimpleGrantedAuthority("ROLE_REGISTERED_VIEWER"))))
                .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("REVIEWER cannot access admin endpoints — returns 403")
        void reviewerCannotAccessAdmin() throws Exception {
            mockMvc.perform(get("/api/admin/resources/archived")
                    .with(user("reviewer@example.com").authorities(new SimpleGrantedAuthority("ROLE_REVIEWER"))))
                .andExpect(status().isForbidden());
        }
    }

    @Nested
    @DisplayName("Role-based access: REVIEWER endpoints")
    class ReviewerRoleAccess {

        @Test
        @DisplayName("REVIEWER can access review queue")
        void reviewerCanAccessQueue() throws Exception {
            mockMvc.perform(get("/api/reviews/queue")
                    .with(user("reviewer@example.com").authorities(new SimpleGrantedAuthority("ROLE_REVIEWER"))))
                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("ADMINISTRATOR can also access review queue")
        void adminCanAccessQueue() throws Exception {
            mockMvc.perform(get("/api/reviews/queue")
                    .with(user("admin@example.com").authorities(new SimpleGrantedAuthority("ROLE_ADMINISTRATOR"))))
                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("CONTRIBUTOR cannot access review endpoints — returns 403")
        void contributorCannotAccessReview() throws Exception {
            mockMvc.perform(get("/api/reviews/queue")
                    .with(user("contributor@example.com").authorities(new SimpleGrantedAuthority("ROLE_CONTRIBUTOR"))))
                .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("REGISTERED_VIEWER cannot access review endpoints — returns 403")
        void viewerCannotAccessReview() throws Exception {
            mockMvc.perform(post("/api/reviews/123/approve")
                    .with(user("viewer@example.com").authorities(new SimpleGrantedAuthority("ROLE_REGISTERED_VIEWER"))))
                .andExpect(status().isForbidden());
        }
    }

    @Nested
    @DisplayName("Role-based access: CONTRIBUTOR endpoints")
    class ContributorRoleAccess {

        @Test
        @DisplayName("CONTRIBUTOR can create resources")
        void contributorCanCreateResource() throws Exception {
            mockMvc.perform(post("/api/resources")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{}")
                    .with(user("contributor@example.com").authorities(new SimpleGrantedAuthority("ROLE_CONTRIBUTOR"))))
                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("CONTRIBUTOR can update resources")
        void contributorCanUpdateResource() throws Exception {
            mockMvc.perform(put("/api/resources/123")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{}")
                    .with(user("contributor@example.com").authorities(new SimpleGrantedAuthority("ROLE_CONTRIBUTOR"))))
                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("CONTRIBUTOR can delete resources")
        void contributorCanDeleteResource() throws Exception {
            mockMvc.perform(delete("/api/resources/123")
                    .with(user("contributor@example.com").authorities(new SimpleGrantedAuthority("ROLE_CONTRIBUTOR"))))
                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("CONTRIBUTOR can submit resources for review")
        void contributorCanSubmitResource() throws Exception {
            mockMvc.perform(post("/api/resources/123/submit")
                    .with(user("contributor@example.com").authorities(new SimpleGrantedAuthority("ROLE_CONTRIBUTOR"))))
                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("CONTRIBUTOR can request file upload URL")
        void contributorCanRequestUploadUrl() throws Exception {
            mockMvc.perform(post("/api/files/upload-url")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{}")
                    .with(user("contributor@example.com").authorities(new SimpleGrantedAuthority("ROLE_CONTRIBUTOR"))))
                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("REGISTERED_VIEWER cannot create resources — returns 403")
        void viewerCannotCreateResource() throws Exception {
            mockMvc.perform(post("/api/resources")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{}")
                    .with(user("viewer@example.com").authorities(new SimpleGrantedAuthority("ROLE_REGISTERED_VIEWER"))))
                .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("REVIEWER cannot create resources — returns 403")
        void reviewerCannotCreateResource() throws Exception {
            mockMvc.perform(post("/api/resources")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{}")
                    .with(user("reviewer@example.com").authorities(new SimpleGrantedAuthority("ROLE_REVIEWER"))))
                .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("REGISTERED_VIEWER cannot request file upload URL — returns 403")
        void viewerCannotRequestUploadUrl() throws Exception {
            mockMvc.perform(post("/api/files/upload-url")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{}")
                    .with(user("viewer@example.com").authorities(new SimpleGrantedAuthority("ROLE_REGISTERED_VIEWER"))))
                .andExpect(status().isForbidden());
        }
    }

    @Nested
    @DisplayName("Role-based access: INTERNAL endpoints")
    class InternalEndpointAccess {

        @Test
        @DisplayName("SYSTEM role can access internal endpoints")
        void systemCanAccessInternal() throws Exception {
            mockMvc.perform(post("/api/internal/thumbnails")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{}")
                    .with(user("system").authorities(new SimpleGrantedAuthority("ROLE_SYSTEM"))))
                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("ADMINISTRATOR cannot access internal endpoints — returns 403")
        void adminCannotAccessInternal() throws Exception {
            mockMvc.perform(post("/api/internal/thumbnails")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{}")
                    .with(user("admin@example.com").authorities(new SimpleGrantedAuthority("ROLE_ADMINISTRATOR"))))
                .andExpect(status().isForbidden());
        }
    }

    @Nested
    @DisplayName("Authenticated users can access general endpoints")
    class AuthenticatedAccess {

        @Test
        @DisplayName("Any authenticated user can GET a resource")
        void authenticatedUserCanGetResource() throws Exception {
            mockMvc.perform(get("/api/resources/123")
                    .with(user("viewer@example.com").authorities(new SimpleGrantedAuthority("ROLE_REGISTERED_VIEWER"))))
                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Any authenticated user can search resources")
        void authenticatedUserCanSearch() throws Exception {
            mockMvc.perform(get("/api/search/resources")
                    .with(user("viewer@example.com").authorities(new SimpleGrantedAuthority("ROLE_REGISTERED_VIEWER"))))
                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Any authenticated user can list their own resources")
        void authenticatedUserCanListMine() throws Exception {
            mockMvc.perform(get("/api/resources/mine")
                    .with(user("contributor@example.com").authorities(new SimpleGrantedAuthority("ROLE_CONTRIBUTOR"))))
                .andExpect(status().isOk());
        }
    }
}
