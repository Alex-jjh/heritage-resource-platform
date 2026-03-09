package com.heritage.platform.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.*;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests for LocalSecurityConfig + LocalAuthFilter (local profile).
 * Verifies that the dummy Bearer token with X-Mock-User-Role header
 * correctly authenticates and authorizes requests.
 */
// 终极隔离：只加载当前测试类内部的 Stub 控制器，彻底阻断对真实业务组件（如 AdminService）的扫描
@WebMvcTest(
        controllers = {
                LocalAuthFilterTest.LocalStubAuthController.class,
                LocalAuthFilterTest.LocalStubResourceController.class,
                LocalAuthFilterTest.LocalStubAdminController.class,
                LocalAuthFilterTest.LocalStubReviewController.class,
                LocalAuthFilterTest.LocalStubSearchController.class
        },
        properties = "app.internal-api-key=dummy-test-key"
)
@ActiveProfiles("local")
@Import(LocalSecurityConfig.class)
class LocalAuthFilterTest {

    @Autowired
    private MockMvc mockMvc;

    private static final String DUMMY_TOKEN = "Bearer local-dev-token";

    // ── Stub controllers that map to the secured paths ──

    @RestController static class LocalStubAuthController {
        @PostMapping("/api/auth/register") String register() { return "ok"; }
        @PostMapping("/api/auth/login") String login() { return "ok"; }
        @PostMapping("/api/auth/logout") String logout() { return "ok"; }
    }

    @RestController static class LocalStubResourceController {
        @PostMapping("/api/resources") String create() { return "ok"; }
        @GetMapping("/api/resources/{id}") String getById(@PathVariable String id) { return "ok"; }
        @PutMapping("/api/resources/{id}") String update(@PathVariable String id) { return "ok"; }
        @DeleteMapping("/api/resources/{id}") String remove(@PathVariable String id) { return "ok"; }
    }

    @RestController static class LocalStubAdminController {
        @PostMapping("/api/admin/resources/{id}/archive") String archive(@PathVariable String id) { return "ok"; }
        @GetMapping("/api/admin/resources/archived") String archived() { return "ok"; }
    }

    @RestController static class LocalStubReviewController {
        @GetMapping("/api/reviews/queue") String queue() { return "ok"; }
        @PostMapping("/api/reviews/{id}/approve") String approve(@PathVariable String id) { return "ok"; }
    }

    @RestController static class LocalStubSearchController {
        @GetMapping("/api/search/resources") String search() { return "ok"; }
    }

    // ── Tests ──

    @Nested
    @DisplayName("Local auth filter: dummy token acceptance")
    class DummyTokenAcceptance {

        @Test
        @DisplayName("Dummy token with CONTRIBUTOR role grants access to contributor endpoints")
        void dummyTokenWithContributorRole() throws Exception {
            mockMvc.perform(post("/api/resources")
                    .header("Authorization", DUMMY_TOKEN)
                    .header("X-Mock-User-Role", "CONTRIBUTOR")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{}"))
                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Dummy token with ADMINISTRATOR role grants access to admin endpoints")
        void dummyTokenWithAdminRole() throws Exception {
            mockMvc.perform(get("/api/admin/resources/archived")
                    .header("Authorization", DUMMY_TOKEN)
                    .header("X-Mock-User-Role", "ADMINISTRATOR"))
                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Dummy token with REVIEWER role grants access to review endpoints")
        void dummyTokenWithReviewerRole() throws Exception {
            mockMvc.perform(get("/api/reviews/queue")
                    .header("Authorization", DUMMY_TOKEN)
                    .header("X-Mock-User-Role", "REVIEWER"))
                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Dummy token without role header defaults to REGISTERED_VIEWER")
        void dummyTokenWithoutRoleDefaultsToViewer() throws Exception {
            // REGISTERED_VIEWER can access general authenticated endpoints
            mockMvc.perform(get("/api/search/resources")
                    .header("Authorization", DUMMY_TOKEN))
                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Dummy token with default role cannot access contributor endpoints — returns 403")
        void defaultRoleCannotAccessContributorEndpoints() throws Exception {
            mockMvc.perform(post("/api/resources")
                    .header("Authorization", DUMMY_TOKEN)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{}"))
                .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("Dummy token with CONTRIBUTOR role cannot access admin endpoints — returns 403")
        void contributorCannotAccessAdminViaLocalAuth() throws Exception {
            mockMvc.perform(get("/api/admin/resources/archived")
                    .header("Authorization", DUMMY_TOKEN)
                    .header("X-Mock-User-Role", "CONTRIBUTOR"))
                .andExpect(status().isForbidden());
        }
    }

    @Nested
    @DisplayName("Local auth filter: invalid/missing tokens")
    class InvalidTokens {

        @Test
        @DisplayName("Request without any token returns 401 for protected endpoints")
        void noTokenReturns401() throws Exception {
            mockMvc.perform(get("/api/search/resources"))
                .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("Request with wrong Bearer token returns 401")
        void wrongTokenReturns401() throws Exception {
            mockMvc.perform(get("/api/search/resources")
                    .header("Authorization", "Bearer wrong-token"))
                .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("Public endpoints remain accessible without token in local profile")
        void publicEndpointsStillWork() throws Exception {
            mockMvc.perform(post("/api/auth/register")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{}"))
                .andExpect(status().isOk());

            mockMvc.perform(post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{}"))
                .andExpect(status().isOk());
        }
    }
}