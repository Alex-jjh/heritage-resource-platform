# Implementation Plan: Heritage Resource Platform

## Overview

Incremental implementation of the Heritage Resource Platform starting with AWS core infrastructure provisioning (Cognito + S3 via Terraform), then project scaffolding and data models, building out backend services layer by layer (auth, resources, review, search, files, comments, admin), followed by frontend pages, and finally Lambda async processing. Each task builds on previous work so there is no orphaned code. The Terraform-first approach ensures real AWS credentials are available for cloud integration from day one, while local development uses docker-compose with LocalStack and mock auth.

## Tasks

- [x] 1. AWS core infrastructure and project scaffolding
  - [x] 1.0 Create Terraform configuration for AWS core resources
    - Define Terraform modules for: Cognito User Pool + App Client (email sign-in, `custom:role` attribute, `USER_PASSWORD_AUTH` flow) and S3 bucket (`heritage-resources-{env}`) with CORS policies allowing frontend uploads
    - Output the resulting Cognito Pool ID, Client ID, and S3 Bucket Name so they can be injected into `application-dev.yml`
    - _Requirements: 1.1, 14.1_

  - [x] 1.1 Initialize Spring Boot 3.x project with Java 21 and configure dependencies
    - Create the Maven/Gradle project with dependencies: Spring Web, Spring Data JPA, Spring Security, OAuth2 Resource Server, MySQL Connector, AWS SDK (S3, Cognito), Flyway for migrations
    - Create `application.yml`, `application-local.yml`, `application-dev.yml` with database, S3, and Cognito configuration as specified in the design
    - Create `docker-compose.yml` with MySQL 8.0 and LocalStack services
    - _Requirements: 13.6, 14.5_

  - [x] 1.2 Configure Spring Security with JWT validation and role mapping
    - Implement `SecurityConfig` with role-based endpoint authorization rules matching the RBAC matrix from the design
    - Implement `JwtAuthenticationConverter` that reads `custom:role` claim from Cognito JWT and maps to Spring Security `ROLE_` prefix
    - Implement `LocalAuthFilter` for the local profile that accepts a dummy Bearer token and reads role from `X-Mock-User-Role` header
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

  - [x] 1.3 Write unit tests for security configuration
    - Test that public endpoints are accessible without authentication
    - Test that role-restricted endpoints return 403 for unauthorized roles
    - Test that requests without a valid token return 401
    - Test the local mock auth filter accepts dummy tokens with role headers
    - _Requirements: 1.6, 13.5, 13.6_

- [x] 2. Data models and database schema
  - [x] 2.1 Create JPA entities and enums
    - Implement `UserRole` enum (REGISTERED_VIEWER, CONTRIBUTOR, REVIEWER, ADMINISTRATOR)
    - Implement `ResourceStatus` enum with `canTransitionTo()` state machine method and `ALLOWED_TRANSITIONS` map as specified in the design
    - Implement JPA entities: `User`, `Resource`, `Category`, `Tag`, `FileReference`, `ExternalLink`, `Comment`, `StatusTransition`, `ReviewFeedback`
    - Define all relationships: Resource→User (ManyToOne), Resource→Category (ManyToOne), Resource↔Tag (ManyToMany via resource_tags), Resource→FileReference/ExternalLink/Comment/StatusTransition (OneToMany), Resource→ReviewFeedback (OneToMany)
    - _Requirements: 4.1, 4.6, 15.1, 15.3_

  - [x] 2.2 Create Spring Data JPA repositories
    - Implement `UserRepository`, `ResourceRepository`, `CategoryRepository`, `TagRepository`, `FileReferenceRepository`, `ExternalLinkRepository`, `CommentRepository`, `StatusTransitionRepository`, `ReviewFeedbackRepository`
    - Add custom query methods: `ResourceRepository.findByContributorId()`, `ResourceRepository.findByStatusOrderByCreatedAtAsc()`, `ResourceRepository.findByStatusAndTitleContainingOrDescriptionContaining()`, `CommentRepository.findByResourceIdOrderByCreatedAtDesc()`
    - _Requirements: 5.4, 6.1, 8.1, 8.2, 10.2_

  - [x] 2.3 Create Flyway database migration scripts
    - Write initial migration creating all tables: users, resources, categories, tags, resource_tags, file_references, external_links, comments, status_transitions, review_feedback
    - Define indexes on frequently queried columns (resource.status, resource.contributor_id, resource.category_id, comment.resource_id)
    - **CRITICAL**: Flyway is the single source of truth for schema. Ensure `spring.jpa.hibernate.ddl-auto=validate` in all profiles (common `application.yml`). NEVER use `update` or `create` — Hibernate must not modify the schema. Only Flyway migrations create or alter tables.
    - _Requirements: 4.1, 15.3_

  - [x] 2.4 Write property test for ResourceStatus state machine
    - **Property 1: Valid transitions are accepted** — For every (from, to) pair in the allowed transitions table, `canTransitionTo()` returns true
    - **Property 2: Invalid transitions are rejected** — For every (from, to) pair NOT in the allowed transitions table, `canTransitionTo()` returns false
    - **Validates: Requirements 15.1, 15.2**

- [x] 3. Authentication and user management service
  - [x] 3.1 Implement AuthService for registration and login
    - Create `AuthService` that integrates with AWS Cognito SDK for user registration (creating user with REGISTERED_VIEWER role), login (returning tokens), and logout (revoking tokens)
    - Create `AuthController` with endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
    - Handle duplicate email registration by returning appropriate error
    - Return generic authentication error on invalid credentials (do not reveal whether email or password was wrong)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 3.2 Implement UserService for profile and contributor management
    - Create `UserService` with methods for getting/updating user profile, listing pending contributor requests, granting/revoking contributor status
    - Create `UserController` with endpoints: `GET /api/users/me`, `PUT /api/users/me`, `GET /api/users/pending-contributors`, `POST /api/users/{userId}/grant-contributor`, `POST /api/users/{userId}/revoke-contributor`
    - Validate profile update input and return field-level validation errors
    - Update Cognito `custom:role` attribute when granting/revoking contributor status
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.3 Write unit tests for AuthService and UserService
    - Test registration creates user with REGISTERED_VIEWER role
    - Test duplicate email returns error
    - Test login with invalid credentials returns generic error
    - Test granting contributor updates role, revoking resets to REGISTERED_VIEWER
    - Test profile validation rejects invalid data
    - _Requirements: 1.1, 1.4, 1.5, 3.1, 3.2_

- [ ] 4. Checkpoint — Verify foundation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Category and tag management
  - [x] 5.1 Implement CategoryService and TagService
    - Create `CategoryService` with CRUD operations: create (unique name check), update (propagate name change), list all, prevent deletion if associated with resources
    - Create `TagService` with CRUD operations: create (unique name check), update, list all, prevent deletion if associated with resources
    - Create `CategoryController` (`GET/POST /api/categories`, `PUT /api/categories/{id}`) and `TagController` (`GET/POST /api/tags`, `PUT /api/tags/{id}`)
    - Return duplicate error when creating category/tag with existing name
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 5.2 Write unit tests for CategoryService and TagService
    - Test creating category/tag with unique name succeeds
    - Test creating category/tag with duplicate name returns error
    - Test deleting category/tag associated with resources is prevented
    - _Requirements: 11.4, 11.5_

- [x] 6. Resource CRUD and status transitions
  - [x] 6.1 Implement ResourceService for create, read, update, delete
    - Create `ResourceService` with methods: create draft resource (set status=DRAFT, validate required fields), update draft resource (only owner, only DRAFT status), delete draft resource (hard delete with cascade to file references and external links), get resource by ID (access control based on status and role), list contributor's own resources
    - Create DTOs for request/response: `CreateResourceRequest`, `UpdateResourceRequest`, `ResourceResponse`
    - Validate required fields (title, category, copyright declaration) on create and return field-level errors
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 4.7, 4.8, 5.4_

  - [x] 6.2 Implement resource status transition logic
    - Add `transitionStatus()` method to `ResourceService` that validates transitions using `ResourceStatus.canTransitionTo()`, rejects invalid transitions with descriptive error, and records every transition in `StatusTransition` table (actor, from, to, timestamp)
    - Implement submit for review: `POST /api/resources/{id}/submit` — validates required metadata, transitions DRAFT→PENDING_REVIEW
    - Implement revise: `POST /api/resources/{id}/revise` — transitions REJECTED→DRAFT
    - Prevent editing of resources not in DRAFT status
    - _Requirements: 5.1, 5.2, 5.3, 7.1, 7.3, 15.1, 15.2, 15.3_

  - [x] 6.3 Create ResourceController with all resource endpoints
    - Wire up endpoints: `POST /api/resources`, `GET /api/resources/{id}`, `PUT /api/resources/{id}`, `DELETE /api/resources/{id}`, `POST /api/resources/{id}/submit`, `POST /api/resources/{id}/revise`, `GET /api/resources/mine`
    - Enforce ownership checks: only the owning contributor can edit, delete, submit, or revise their resources
    - Return 404 for non-approved resources when requested by non-admin users
    - _Requirements: 4.1, 4.2, 4.7, 4.8, 5.1, 9.3_

  - [x] 6.4 Write property test for resource status transitions
    - **Property 3: All valid transitions succeed** — For each allowed (from, to) pair, calling `transitionStatus()` changes the status and creates a StatusTransition record
    - **Property 4: All invalid transitions are rejected** — For each disallowed (from, to) pair, calling `transitionStatus()` throws an exception and the status remains unchanged
    - **Validates: Requirements 15.1, 15.2, 15.3**

  - [x] 6.5 Write unit tests for ResourceService
    - Test creating resource with valid data sets status to DRAFT
    - Test creating resource with missing required fields returns validation error
    - Test updating resource only allowed in DRAFT status by owner
    - Test deleting draft resource performs hard delete with cascading file reference removal
    - Test submitting resource with missing metadata is rejected
    - _Requirements: 4.1, 4.3, 4.7, 4.8, 5.2_

- [x] 7. Review workflow
  - [x] 7.1 Implement ReviewService
    - Create `ReviewService` with methods: get review queue (all PENDING_REVIEW resources ordered by submission date ascending), approve resource (transition PENDING_REVIEW→APPROVED, record reviewer and timestamp), reject resource (transition PENDING_REVIEW→REJECTED, require and store feedback comments)
    - Reject approve/reject attempts on resources not in PENDING_REVIEW status
    - Require feedback comments when rejecting (return error if empty)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 7.2 Create ReviewController
    - Wire up endpoints: `GET /api/reviews/queue`, `POST /api/reviews/{resourceId}/approve`, `POST /api/reviews/{resourceId}/reject`
    - Ensure reviewer feedback is accessible to the owning contributor for rejected resources
    - _Requirements: 6.1, 6.2, 6.3, 7.2_

  - [x] 7.3 Write unit tests for ReviewService
    - Test review queue returns only PENDING_REVIEW resources ordered by date
    - Test approval changes status to APPROVED and records reviewer/timestamp
    - Test rejection requires feedback and stores it
    - Test approve/reject on non-PENDING_REVIEW resource returns error
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8. File storage integration
  - [x] 8.1 Implement FileService for S3 pre-signed URLs
    - Create `FileService` that generates pre-signed PUT URLs scoped to `uploads/{resourceId}/{fileName}` with 15-minute expiry and 50MB max file size policy
    - Generate read-only pre-signed GET URLs for file downloads with 60-minute expiry
    - Handle S3 connectivity errors by returning 503 with retry-after header
    - Support LocalStack S3 endpoint when local profile is active
    - _Requirements: 4.4, 9.2, 14.1, 14.2, 14.4, 14.5_

  - [x] 8.2 Implement FileController and file reference management
    - Create `FileController` with endpoints: `POST /api/files/upload-url`, `POST /api/files/{resourceId}/references`, `DELETE /api/files/{resourceId}/references/{fileRefId}`
    - Store file references (s3Key, originalFileName, contentType, fileSize) on the resource after upload completes
    - Validate resource ownership and DRAFT status before allowing file operations
    - _Requirements: 4.4, 4.6, 14.1, 14.3_

  - [x] 8.3 Write unit tests for FileService
    - Test pre-signed URL generation with correct S3 key pattern and expiry
    - Test 503 response on S3 connectivity failure
    - Test file reference creation and deletion
    - _Requirements: 14.1, 14.2, 14.4_

- [x] 9. Search and browse service
  - [x] 9.1 Implement SearchService
    - Create `SearchService` with methods: search approved resources by text query (matching title, description, or tags), filter by category, filter by tag, combine multiple filters with AND logic
    - Return paginated results with configurable page size defaulting to 20
    - Exclude ARCHIVED resources from all query results
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [x] 9.2 Create SearchController
    - Wire up endpoint: `GET /api/search/resources` with query parameters `q`, `categoryId`, `tagId`, `page`, `size`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 9.3 Write unit tests for SearchService
    - Test text search matches title, description, and tags
    - Test category and tag filters return correct results
    - Test combined filters use AND logic
    - Test pagination with default page size of 20
    - Test archived resources are excluded
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [x] 10. Comments service
  - [x] 10.1 Implement CommentService and CommentController
    - Create `CommentService` with methods: add comment to approved resource (store author, timestamp), get paginated comments for resource ordered by creation date descending
    - Create `CommentController` with endpoints: `POST /api/comments/{resourceId}`, `GET /api/comments/{resourceId}`
    - Reject comments on non-approved resources
    - Reject empty comments with validation error
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 10.2 Write unit tests for CommentService
    - Test adding comment to approved resource succeeds
    - Test adding comment to non-approved resource is rejected
    - Test empty comment returns validation error
    - Test comments are returned in descending timestamp order
    - _Requirements: 10.1, 10.3, 10.4_

- [x] 11. Admin operations
  - [x] 11.1 Implement admin resource management endpoints
    - Create admin endpoints: `POST /api/admin/resources/{id}/archive` (transition APPROVED→ARCHIVED, record timestamp), `POST /api/admin/resources/{id}/unpublish` (transition APPROVED→DRAFT, notify contributor), `GET /api/admin/resources/archived` (list all archived resources)
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [x] 11.2 Write unit tests for admin operations
    - Test archiving approved resource changes status and records timestamp
    - Test unpublishing approved resource changes status to DRAFT
    - Test archived resources list returns only ARCHIVED resources
    - _Requirements: 12.1, 12.2, 12.4_

- [x] 12. Resource detail view with file URLs
  - [x] 12.1 Enhance ResourceService for public detail view
    - When returning an approved resource detail, include complete metadata (title, category, place, description, tags, copyright, contributor name, approval date)
    - Generate read-only pre-signed URLs for all file attachments (60-minute expiry)
    - Return 404 for non-approved resources to non-admin users
    - _Requirements: 9.1, 9.2, 9.3_

- [ ] 13. Checkpoint — Verify all backend services
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Frontend project setup
  - [x] 14.1 Initialize Next.js project with Tailwind CSS and shadcn/ui
    - Create Next.js project with App Router, configure Tailwind CSS with the cultural heritage theme (off-white background #FAFAF5, slate/navy primary, warm amber accent #B45309)
    - Install and configure shadcn/ui components
    - Set up typography: serif font for headings (Playfair Display or Merriweather), sans-serif for body (Inter)
    - Install TanStack Query for server state management
    - _Requirements: 8.1, 9.1_

  - [x] 14.2 Implement AuthProvider and API client
    - Create `AuthProvider` React context that manages Cognito tokens (login, logout, token refresh), provides current user info and role
    - Create API client utility with automatic JWT Bearer token injection on all requests
    - Create `ProtectedRoute` wrapper component that checks user role before rendering child routes
    - _Requirements: 1.2, 1.3, 13.1_

- [x] 15. Frontend pages — Authentication and profile
  - [x] 15.1 Build login and registration pages
    - Create `/login` page with email/password form, error handling for invalid credentials
    - Create `/register` page with registration form (display name, email, password), duplicate email error handling
    - Redirect to browse page on successful login
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

  - [x] 15.2 Build user profile page
    - Create `/profile` page showing display name, email, role
    - Add edit form for updating profile information with validation
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 16. Frontend pages — Browse and resource detail
  - [x] 16.1 Build browse and search page
    - Create `/browse` page with `SearchBar` component (text input, category dropdown, tag dropdown)
    - Display results as `ResourceCard` grid (thumbnail, title, category, tags using `StatusBadge`)
    - Implement pagination controls with configurable page size
    - Wire up TanStack Query hooks for search API calls with filter parameters
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 16.2 Build resource detail page
    - Create `/resources/[id]` page showing full resource metadata, file attachments (with pre-signed URL links), external links, contributor name, approval date
    - Include `CommentSection` component with paginated comment list and add-comment form
    - _Requirements: 9.1, 9.2, 10.1, 10.2_

- [x] 17. Frontend pages — Contributor workflow
  - [x] 17.1 Build contributor dashboard and resource form
    - Create `/contribute` page listing contributor's own resources with status badges
    - Create `/contribute/new` page with `ResourceForm` (title, category select, place, description, tags multi-select, copyright declaration, `FileUploader` for attachments, external link inputs)
    - Create `/contribute/[id]/edit` page reusing `ResourceForm` for editing draft resources
    - Implement `FileUploader` component: request pre-signed URL → PUT file to S3 → register file reference
    - Add submit-for-review action button on draft resources
    - Show reviewer feedback on rejected resources with revise action
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.4, 7.1, 7.2_

- [x] 18. Frontend pages — Review workflow
  - [x] 18.1 Build review queue and review page
    - Create `/review` page showing `DataTable` of pending review resources ordered by submission date
    - Create `/review/[id]` page with `ReviewPanel`: resource detail view alongside approve/reject actions
    - Require feedback text input when rejecting
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [x] 19. Frontend pages — Admin
  - [x] 19.1 Build admin pages
    - Create `/admin/users` page with `DataTable` for user management: list pending contributor requests, grant/revoke contributor status
    - Create `/admin/categories` page with CRUD form and `DataTable` for category management
    - Create `/admin/tags` page with CRUD form and `DataTable` for tag management
    - Create `/admin/archived` page listing archived resources
    - Add archive and unpublish actions on resource detail for admin users
    - _Requirements: 3.1, 3.2, 3.4, 11.1, 11.2, 11.3, 12.1, 12.2, 12.4_

- [ ] 20. Checkpoint — Verify frontend integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 21. Lambda thumbnail generator and async processing
  - [x] 21.1 Create Terraform configuration for Lambda thumbnail generator
    - Define Terraform modules for: Lambda function with S3 trigger on `uploads/` prefix, and IAM roles/policies for Lambda execution allowing S3 read/write and API invocation
    - _Requirements: 16.1_

  - [x] 21.2 Implement Lambda thumbnail generator
    - Create Lambda function (Python 3.12 or Node.js 20) triggered by S3 ObjectCreated events in uploads/ prefix
    - Read uploaded image, generate 400x400 max web-optimized thumbnail, store under thumbnails/ prefix
    - Skip non-image files gracefully
    - Callback to backend: `POST /api/internal/thumbnails` with resourceId and thumbnailS3Key
    - _Requirements: 16.1, 16.2, 16.3_

  - [x] 21.3 Implement internal thumbnail callback endpoint
    - Create `POST /api/internal/thumbnails` endpoint secured with SYSTEM role (API key auth for Lambda)
    - Update resource's `thumbnailS3Key` field in database
    - _Requirements: 16.3_

- [x] 22. Landing page and final wiring
  - [x] 22.1 Build landing/home page
    - Create `/` page showcasing featured approved resources
    - Include navigation with role-aware menu items (contribute, review, admin links based on user role)
    - _Requirements: 8.1, 9.1_

- [ ] 23. Final checkpoint — Full integration verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Backend is built first to enable frontend integration testing against real APIs
- Property tests validate the resource status state machine correctness
- Local development uses docker-compose (MySQL + LocalStack) with mock auth for offline testing
