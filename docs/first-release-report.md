# Heritage Resource Platform — First Release Report

## Table of Contents

1. [Introduction](#1-introduction)
2. [Architectural Design](#2-architectural-design)
3. [Software Design and Engineering Practice](#3-software-design-and-engineering-practice)
4. [Legal, Social, Ethical, and Professional Considerations](#4-legal-social-ethical-and-professional-considerations)
5. [Software Testing](#5-software-testing)
6. [References](#6-references)
7. [Appendix](#7-appendix)

---

## 1. Introduction

### 1.1 Problem Statement

Cultural heritage — oral traditions, historical photographs, local craftsmanship, sacred sites — is at risk of being lost as communities modernise. Existing platforms (museums, archives) are institution-centric and do not empower ordinary community members to contribute, curate, or discover heritage materials in a structured, quality-controlled way. There is a need for a community-driven digital platform that allows anyone to submit heritage resources while maintaining content quality through a moderated review workflow.

### 1.2 Project Aims

- Provide a web-based platform where community members can discover, share, and preserve cultural heritage resources (images, stories, traditions, historical sites, educational materials).
- Implement a role-based access control system with four progressive permission levels to balance openness with content quality.
- Enforce a structured review workflow (draft → review → publish) so that all publicly visible content has been vetted by designated reviewers.
- Deliver a responsive, accessible web interface with full-text search, filtering, and file attachment capabilities.
- Deploy the system on cloud infrastructure with CI/CD automation for continuous delivery.

### 1.3 Project Scope and Core Use Cases

The first release covers the complete resource lifecycle from creation to publication, including user management, search, and administrative functions.

**Use Case Diagram** (see Appendix A for full diagram):

| # | Use Case | Primary Actor | Description |
|---|----------|---------------|-------------|
| UC1 | Register / Login | All Users | Self-service registration with email/password; JWT-based login with 1-hour token expiry and 30-minute idle timeout |
| UC2 | Browse & Search | Registered Viewer+ | Full-text search across approved resources with category and tag filters; paginated results |
| UC3 | View Resource Detail | Registered Viewer+ | View resource metadata, file attachments (with download), external links, and comments |
| UC4 | Comment on Resource | Registered Viewer+ | Add comments to approved resources; optional anonymous posting |
| UC5 | Create Resource | Contributor+ | Create draft resource with title, category, description, copyright declaration, tags, external links |
| UC6 | Upload Files | Contributor+ | Attach files (up to 50 MB each, max 10 per resource) to draft resources; automatic thumbnail generation for images |
| UC7 | Edit / Delete Draft | Contributor+ | Modify or delete resources in DRAFT status |
| UC8 | Submit for Review | Contributor+ | Transition a complete draft to PENDING_REVIEW status |
| UC9 | Revise Rejected Resource | Contributor+ | Move a REJECTED resource back to DRAFT for editing |
| UC10 | Review Resource | Reviewer / Admin | View review queue; approve or reject with mandatory feedback |
| UC11 | Manage Users | Administrator | View all users, change roles, grant/revoke contributor status, delete users |
| UC12 | Manage Categories & Tags | Administrator | CRUD operations on categories and tags (deletion blocked if resources are associated) |
| UC13 | Archive / Unpublish / Restore | Administrator | Archive approved resources, unpublish with reason, restore archived resources |
| UC14 | View Profile | All Authenticated | View and update display name, avatar, bio, privacy settings; optional password change (min 8 chars) |
| UC15 | Featured Resources | Contributor+ / Admin | Contributors apply for featured status; admins approve/reject; homepage displays strictly approved featured resources |
| UC16 | Review History | Reviewer / Admin | View past review decisions with filtering by reviewer email and decision type |
| UC17 | My Comments | Registered Viewer+ | View personal comment history with links back to the resource and comment page |
| UC18 | Public Contributor Profile | All Authenticated | View a contributor's public profile and their published resources |

### 1.4 User Characteristics

| Role | Description | Typical User |
|------|-------------|-------------|
| Registered Viewer | Can browse, search, and comment on approved resources | General public interested in cultural heritage |
| Contributor | Can create, edit, and submit resources for review | Community members, local historians, educators |
| Reviewer | Can approve or reject submitted resources with feedback | Subject-matter experts, community moderators |
| Administrator | Full system access including user management and content governance | Platform operators, project leads |

Role progression: new users register as Registered Viewer → request Contributor status → Administrator grants upgrade. Administrators can elevate any user to any role.

### 1.5 Assumptions, Dependencies, and Risks

**Assumptions:**
- Users have modern web browsers (Chrome, Firefox, Safari, Edge) with JavaScript enabled.
- The platform operates in a trusted community context where most submissions are good-faith contributions.
- A single-server deployment is sufficient for the expected user base in the first release.

**Dependencies:**
- Java 21 (Temurin) and Maven for backend build
- Node.js 20+ and npm for frontend build
- MySQL 8.0 for persistent storage
- Nginx as reverse proxy
- Alibaba Cloud ECS for hosting
- GitHub Actions for CI/CD

**Risks:**

| Risk | Impact | Mitigation |
|------|--------|------------|
| Single server = single point of failure | Service outage if ECS instance fails | Automated systemd restart; future: containerisation + multi-instance |
| No HTTPS in current deployment | Data transmitted in cleartext | Nginx is HTTPS-ready; Let's Encrypt integration planned for next iteration |
| JWT stored in localStorage | Vulnerable to XSS attacks | 30-minute idle timeout; HttpOnly cookie migration planned |
| No rate limiting on API | Potential abuse (spam submissions, brute-force login) | Nginx rate limiting configuration prepared but not yet enabled |
| File storage on local disk | Data loss if disk fails | Regular backup scripts; future: object storage migration |

### 1.6 First-Release Scope and Prioritisation Rationale

The initial requirements were translated into the first-release scope using a MoSCoW prioritisation approach, driven by business value, technical feasibility, and dependency ordering.

**Must Have (Increment 1–2):** User authentication, resource CRUD, review workflow, role-based access control, search with filters. These form the core value proposition — without them the platform has no function.

**Should Have (Increment 2–3):** File upload with thumbnails, comment system, admin panel (user/category/tag management), archive/unpublish/restore. These enhance usability and governance but the platform is functional without them.

**Could Have (Future):** Real-time notifications (WebSocket), advanced search (Elasticsearch), caching (Redis), content moderation flags, structured copyright declarations. Deferred to post-first-release iterations.

**Won't Have (First Release):** Multi-language support, mobile app, social sharing, analytics dashboard, email notifications.

The three increments were structured as:
- **Increment 1:** Authentication system (register/login/JWT), database schema (Flyway V1+V2), core entity models, basic CRUD for resources.
- **Increment 2:** Review workflow (submit/approve/reject/revise), role-based security configuration, search with filters, file upload with thumbnail generation.
- **Increment 3:** Admin panel (user management, category/tag CRUD, archive/restore), comment system, deployment to Alibaba Cloud ECS with CI/CD, migration from AWS services to self-hosted equivalents.

---

## 2. Architectural Design

### 2.1 Architecture Drivers (Requirements Affecting Architecture)

| Driver | Requirement | Architectural Impact |
|--------|-------------|---------------------|
| Security | Role-based access with four permission levels | Stateless JWT authentication with Spring Security filter chain; role encoded in token claims |
| Content Quality | Moderated review workflow | Resource status state machine enforced at service layer; status transitions audited in `status_transitions` table |
| File Handling | Support file uploads up to 50 MB with auto-thumbnails | Local disk storage with Nginx static serving; Thumbnailator for in-process image resizing |
| Deployment Simplicity | Single-server deployment on Alibaba Cloud ECS | Monolithic backend (Spring Boot) + standalone Next.js frontend behind Nginx reverse proxy |
| Maintainability | Clean separation of concerns for team parallel work | Layered architecture (Controller → Service → Repository); separate frontend/backend codebases |
| Data Integrity | Structured relational data with foreign key constraints | MySQL 8.0 with Flyway-managed schema migrations; UUID primary keys |
| API Documentation | Interactive API docs for frontend development | SpringDoc OpenAPI with Swagger UI auto-generated from controller annotations |

### 2.2 System Architecture

The system follows a three-tier architecture deployed on a single Alibaba Cloud ECS instance:

```
┌─────────────────────────────────────────────────────────┐
│              Alibaba Cloud ECS (ecs.c9i.large)           │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Nginx :80                                        │  │
│  │  /api/*       → Spring Boot :8080                 │  │
│  │  /files/*     → local disk (static serving)       │  │
│  │    /files/uploads/     → /opt/heritage/uploads/    │  │
│  │    /files/thumbnails/  → /opt/heritage/thumbnails/ │  │
│  │    /files/avatars/     → /opt/heritage/avatars/    │  │
│  │  /*           → Next.js :3000                     │  │
│  └─────────────┬─────────────────┬───────────────────┘  │
│                │                 │                       │
│  ┌─────────────▼──────┐  ┌──────▼──────────────────┐   │
│  │  Spring Boot :8080  │  │  Next.js :3000          │   │
│  │  REST API (JSON)    │  │  React 19 (standalone)  │   │
│  │  JWT Auth Filter    │  │  TanStack Query         │   │
│  │  Spring Security    │  │  shadcn/ui + Tailwind   │   │
│  │  Flyway Migrations  │  └─────────────────────────┘   │
│  │  Thumbnailator      │                                │
│  └─────────┬───────────┘                                │
│            │                                            │
│  ┌─────────▼───────────┐                                │
│  │  MySQL 8.0           │                                │
│  │  heritage_db         │                                │
│  └─────────────────────┘                                │
│                                                         │
│  /opt/heritage/uploads/      ← user-uploaded files      │
│  /opt/heritage/thumbnails/   ← auto-generated thumbs    │
│  /opt/heritage/avatars/      ← user avatar images       │
└─────────────────────────────────────────────────────────┘
```

**Component Responsibilities:**

- **Nginx** — Reverse proxy, TLS termination (when configured), static file serving for uploads/thumbnails, request routing.
- **Spring Boot Backend** — REST API, business logic, JWT authentication/authorisation, database access via JPA, file storage, thumbnail generation.
- **Next.js Frontend** — Server-side rendered React application, client-side routing via App Router, data fetching via TanStack Query, UI components via shadcn/ui.
- **MySQL 8.0** — Persistent storage for all application data, schema managed by Flyway migrations.

**Justification:** A monolithic architecture was chosen over microservices because (1) the team size and project scope do not warrant the operational complexity of distributed services, (2) a single deployable unit simplifies CI/CD and debugging, and (3) the layered internal structure still supports parallel development across controllers, services, and frontend components.

### 2.3 High-Level Database Design (ERD)

The database consists of 10 application tables plus the Flyway schema history table. All primary keys are UUIDs stored as `BINARY(16)` for compactness and global uniqueness. The schema is managed by five Flyway migrations: `V1__initial_schema.sql` (core tables), `V2__replace_cognito_with_local_auth.sql` (local auth columns), `V3__seed_data.sql` (sample data), `V4__add_featured_profile_comment_fields.sql` (user profile, featured resources, anonymous comments), and `V5__allow_incomplete_drafts.sql` (nullable draft fields).

```
┌──────────┐       ┌────────────┐       ┌──────────┐
│  users   │───┐   │ resources  │───┐   │categories│
│──────────│   │   │────────────│   │   │──────────│
│ id (PK)  │   └──►│ id (PK)    │◄──┘   │ id (PK)  │
│ email    │       │ contributor│       │ name     │
│ password │       │ category   │◄──────│          │
│ role     │       │ title      │       └──────────┘
│ display  │       │ status     │
│ name     │       │ copyright  │       ┌──────────┐
└──────────┘       │ thumbnail  │       │  tags    │
     │             └────────────┘       │──────────│
     │                  │  │  │  │      │ id (PK)  │
     │                  │  │  │  │      │ name     │
     ▼                  │  │  │  │      └──────────┘
┌──────────┐           │  │  │  │           │
│ comments │◄──────────┘  │  │  │           │
│──────────│              │  │  │      ┌────▼─────┐
│ id (PK)  │              │  │  │      │resource  │
│ body     │              │  │  │      │_tags     │
│ author   │              │  │  │      │──────────│
└──────────┘              │  │  │      │resource  │
                          │  │  │      │tag       │
┌──────────────┐◄─────────┘  │  │      └──────────┘
│file_references│             │  │
│──────────────│             │  │
│ id (PK)      │             │  │
│ s3_key       │             │  │
│ file_name    │             │  │
│ content_type │             │  │
│ file_size    │             │  │
└──────────────┘             │  │
                             │  │
┌──────────────┐◄────────────┘  │
│external_links│                │
│──────────────│                │
│ id (PK)      │                │
│ url          │                │
│ label        │                │
└──────────────┘                │
                                │
┌──────────────────┐◄───────────┤
│ review_feedback   │            │
│──────────────────│            │
│ id (PK)          │            │
│ reviewer (FK)    │            │
│ comments         │            │
│ decision         │            │
└──────────────────┘            │
                                │
┌──────────────────┐◄───────────┘
│status_transitions │
│──────────────────│
│ id (PK)          │
│ actor (FK)       │
│ from_status      │
│ to_status        │
└──────────────────┘
```

See Appendix B for the full Mermaid ERD with all columns and data types.

**Key Design Decisions:**
- **UUID primary keys** (`BINARY(16)`) — avoids sequential ID enumeration attacks and supports distributed ID generation.
- **`resource_tags` junction table** — many-to-many relationship between resources and tags.
- **`status_transitions` audit table** — records every status change with actor, from/to status, and timestamp for full audit trail.
- **`review_feedback` table** — stores reviewer comments and decisions separately from status transitions, enabling multiple rounds of feedback.
- **Cascade deletes** on `file_references`, `external_links` — when a resource is deleted, its attachments are automatically cleaned up.
- **`cognito_sub` column retained as nullable** — legacy from AWS Cognito migration; new users do not use it. Kept to avoid complex migration on existing data.
- **User profile fields** (`avatar_url`, `profile_public`, `show_email`, `bio`) — added in V4 migration to support public contributor profiles and avatar display.
- **Featured resource fields** (`is_featured`, `featured_status`) — added in V4 to support the featured resource application/approval workflow with states: NONE → PENDING → APPROVED/REJECTED.
- **Anonymous comment support** (`anonymous` boolean on `comments`) — added in V4 to allow users to post comments without revealing their identity.
- **Nullable draft fields** (`title`, `category_id`, `copyright_declaration`) — made nullable in V5 to allow saving incomplete drafts; submission for review still validates required metadata at the service layer.

### 2.4 Architectural Trade-offs and Support for Incremental Development

**Incremental Development Support:**
- The layered architecture (Controller → Service → Repository) allowed team members to work on different layers simultaneously. Frontend developers could work against the Swagger UI API documentation while backend developers implemented services.
- Flyway migrations ensured database schema changes were versioned and applied consistently across all environments (local, dev, prod, test).
- The frontend's centralised `apiClient` abstraction meant API endpoint changes only required updates in one place.
- Spring profiles (`local`, `dev`, `prod`, `test`) allowed each environment to have its own configuration without code changes.

**Parallel Development:**
- Frontend and backend are separate codebases with a clear REST API contract. The Swagger UI served as a living API specification.
- Backend modules (auth, resource, review, admin, search, file, comment) have minimal cross-dependencies, enabling parallel feature development.
- The `ProtectedRoute` component on the frontend and `SecurityConfig` on the backend independently enforce access control, allowing UI and API security to be developed and tested separately.

**Major Trade-offs:**

| Decision | Trade-off |
|----------|-----------|
| Monolithic deployment | Simpler ops and debugging vs. limited independent scaling |
| Local file storage | Zero external dependencies vs. no redundancy or CDN |
| Stateless JWT (no refresh token) | Simpler implementation vs. 1-hour hard session limit |
| SQL LIKE for search | No additional infrastructure vs. no fuzzy matching or relevance ranking |
| Single ECS instance | Low cost and simple deployment vs. single point of failure |
| Manual Nginx config | Full control vs. no auto-scaling or load balancing |

---

## 3. Software Design and Engineering Practice

### 3.1 Software Modules and Responsibilities

The backend is organised into seven packages under `com.heritage.platform`:

| Package | Responsibility | Key Classes |
|---------|---------------|-------------|
| `config` | Security filter chain, CORS policy, JWT filter, OpenAPI config | `SecurityConfig`, `JwtAuthFilter`, `CorsConfig`, `OpenApiConfig` |
| `controller` | REST endpoint definitions, request validation, response mapping | `AuthController`, `ResourceController`, `ReviewController`, `AdminController`, `SearchController`, `FileController`, `UserController`, `CategoryController`, `TagController`, `CommentController` (10 controllers) |
| `service` | Business logic, transaction management, status machine enforcement | `AuthService`, `ResourceService`, `ReviewService`, `AdminService`, `SearchService`, `FileService`, `JwtService`, `UserService`, `CommentService`, `CategoryService`, `TagService`, `PredefinedFeedbackService` (12 services) |
| `repository` | Spring Data JPA interfaces with custom JPQL queries | `ResourceRepository`, `UserRepository`, `CategoryRepository`, `TagRepository`, `FileReferenceRepository`, `ReviewFeedbackRepository`, `CommentRepository`, `StatusTransitionRepository` |
| `model` | JPA entity classes and enums | `User`, `Resource`, `Category`, `Tag`, `FileReference`, `ExternalLink`, `Comment`, `ReviewFeedback`, `StatusTransition`, `UserRole`, `ResourceStatus`, `FeaturedStatus` |
| `dto` | Request/Response data transfer objects | `CreateResourceRequest`, `ResourceResponse`, `LoginRequest`, `AuthResponse`, `ErrorResponse`, `UserResponse`, `UserProfileResponse`, `CommentResponse`, `MyCommentResponse`, `ReviewHistoryResponse`, `PredefinedFeedbackResponse`, etc. (22 DTOs total) |
| `exception` | Custom exception classes and global handler | `GlobalExceptionHandler`, `ResourceNotFoundException`, `AccessDeniedException`, `InvalidStatusTransitionException`, `AuthenticationException`, `DuplicateEmailException`, `DuplicateNameException`, `AssociatedResourcesException` |

The frontend is organised into four directories under `src/`:

| Directory | Responsibility | Key Files |
|-----------|---------------|-----------|
| `app/` | Next.js App Router pages (file-based routing) | `page.tsx` (home), `browse/`, `contribute/`, `review/`, `review/history/`, `admin/`, `login/`, `register/`, `profile/`, `resources/[id]/`, `featured/`, `my-comments/`, `users/[id]/` |
| `components/` | Reusable UI components | `navbar.tsx`, `resource-card.tsx`, `resource-form.tsx`, `file-uploader.tsx`, `search-bar.tsx`, `protected-route.tsx`, `status-badge.tsx`, `comment-section.tsx`, `admin-nav.tsx`, `page-container.tsx` |
| `components/ui/` | shadcn/ui primitive components | `button.tsx`, `input.tsx`, `card.tsx`, `badge.tsx`, `select.tsx`, `textarea.tsx`, `skeleton.tsx`, `separator.tsx` |
| `lib/` | Shared utilities and context | `api-client.ts` (typed fetch wrapper with JWT), `auth-context.tsx` (React Context for auth state), `utils.ts` (Tailwind `cn` helper) |
| `types/` | TypeScript type definitions | `index.ts` (all shared interfaces: `User`, `ResourceResponse`, `ResourceStatus`, `FeaturedStatus`, `UserProfileResponse`, `MyCommentResponse`, `UploadUrlResponse`, etc.), `review-history.ts` |

**Module Dependencies:**
- Controllers depend only on Services (never on Repositories directly).
- Services depend on Repositories and other Services (e.g., `ReviewService` delegates status transitions to `ResourceService`).
- The `GlobalExceptionHandler` intercepts all custom exceptions and maps them to consistent `ErrorResponse` JSON with HTTP status codes.
- The frontend `apiClient` is the single point of contact with the backend; all components use it via TanStack Query hooks.

### 3.2 High-Level Process Flows of Core Functions

**Resource Lifecycle Flow:**

```
Contributor                    System                      Reviewer/Admin
    │                            │                              │
    │── Create Resource ────────►│                              │
    │   (POST /api/resources)    │── Save as DRAFT ───────────►│
    │                            │                              │
    │── Upload Files ───────────►│                              │
    │   (POST /api/files/..)     │── Store on disk             │
    │                            │── Generate thumbnail         │
    │                            │                              │
    │── Submit for Review ──────►│                              │
    │   (POST /resources/submit) │── Validate metadata         │
    │                            │── DRAFT → PENDING_REVIEW    │
    │                            │── Record StatusTransition    │
    │                            │                              │
    │                            │◄── View Review Queue ───────│
    │                            │    (GET /api/reviews/queue)  │
    │                            │                              │
    │                            │◄── Approve ─────────────────│
    │                            │    (POST /reviews/../approve)│
    │                            │── PENDING → APPROVED         │
    │                            │── Record ReviewFeedback      │
    │                            │── Resource now publicly      │
    │                            │   visible in search          │
    │                            │                              │
    │              OR            │                              │
    │                            │◄── Reject (with feedback) ──│
    │                            │── PENDING → REJECTED         │
    │                            │── Record ReviewFeedback      │
    │                            │                              │
    │── View Feedback ──────────►│                              │
    │── Revise ─────────────────►│                              │
    │   (POST /resources/revise) │── REJECTED → DRAFT          │
    │── Edit & Resubmit ───────►│── (cycle repeats)            │
```

**Authentication Flow:**

```
User                           System
  │                              │
  │── Register ─────────────────►│
  │   (email, password, name)    │── Validate unique email
  │                              │── bcrypt hash password
  │                              │── Save user (REGISTERED_VIEWER)
  │                              │
  │── Login ────────────────────►│
  │   (email, password)          │── Find user by email
  │                              │── Verify bcrypt hash
  │                              │── Generate JWT (email, role, userId)
  │◄── { accessToken, expiresIn }│
  │                              │
  │── API Request ──────────────►│
  │   (Authorization: Bearer ..) │── JwtAuthFilter extracts token
  │                              │── Validate signature + expiry
  │                              │── Set SecurityContext (email, ROLE_*)
  │                              │── SecurityConfig checks role
  │                              │── Controller processes request
```

### 3.3 Support Services and Engineering Tools

| Tool | Purpose | How Used in This Project |
|------|---------|------------------------|
| **Git + GitHub** | Version control, collaboration | Feature branch workflow (`feature/aliyun-migration`); pull requests for code review; `.gitignore` for build artifacts |
| **GitHub Actions** | CI/CD pipeline | Automated build (Maven + npm) and deployment (SCP + SSH restart) on push to feature branch (see `.github/workflows/deploy-backend.yml`) |
| **Maven** | Backend build and dependency management | `pom.xml` manages all Java dependencies; `mvn test` runs JUnit + jqwik tests; `mvn package` produces deployable JAR; JaCoCo plugin for coverage reports |
| **npm** | Frontend build and dependency management | `package.json` manages React/Next.js dependencies; `npm run build` produces standalone output; `npm run lint` for ESLint checks |
| **Flyway** | Database schema migration | 5 versioned SQL scripts (V1: initial schema, V2: auth migration, V3: seed data, V4: featured/profile/comment fields, V5: nullable draft fields) applied automatically on startup; ensures schema consistency across environments |
| **SpringDoc OpenAPI** | API documentation | Auto-generates interactive Swagger UI at `/swagger-ui.html` from controller annotations; used by frontend developers as living API reference |
| **Nginx** | Reverse proxy and static file serving | Routes `/api/*` to Spring Boot, `/files/*` to local disk, `/*` to Next.js; configuration in `scripts/nginx-heritage.conf` |
| **systemd** | Process management | `heritage-backend` and `heritage-frontend` services with auto-restart on failure |
| **JaCoCo** | Code coverage | Integrated into Maven build; generates HTML coverage reports in `target/site/jacoco/` |
| **ESLint** | Frontend linting | Configured via `eslint.config.mjs` with `eslint-config-next`; enforces TypeScript and React best practices |

### 3.4 Coding Structure and Convention

**Backend (Java) Conventions:**
- Package structure follows domain-driven layering: `config`, `controller`, `service`, `repository`, `model`, `dto`, `exception`.
- All entity IDs are `UUID` (generated by JPA `@GeneratedValue(strategy = GenerationType.UUID)`).
- DTOs use manual getters/setters (no Lombok on DTOs) for explicit control; entity models use Lombok where appropriate.
- Service methods are annotated with `@Transactional` (read-write) or `@Transactional(readOnly = true)` for query methods.
- Lazy JPA associations are force-initialised within transaction boundaries to prevent `LazyInitializationException`.
- Custom exceptions extend `RuntimeException` and are mapped to HTTP status codes by `GlobalExceptionHandler`.
- Jakarta Bean Validation annotations (`@NotBlank`, `@NotNull`) on DTO fields for input validation.
- Naming: classes are PascalCase, methods are camelCase, constants are UPPER_SNAKE_CASE.
- Test classes mirror the source package structure and follow the naming convention `*Test.java` (unit) and `*PropertyTest.java` (property-based).

**Frontend (TypeScript/React) Conventions:**
- Next.js App Router with file-based routing (`src/app/` directory).
- Path alias `@/*` maps to `./src/*` (configured in `tsconfig.json`).
- TypeScript strict mode enabled.
- Components are functional components with hooks; no class components.
- shadcn/ui components in `components/ui/` (base-nova style); app-specific components in `components/`.
- All API calls go through `apiClient` (`src/lib/api-client.ts`) — never raw `fetch`.
- Auth state managed via React Context (`auth-context.tsx`); JWT stored in `localStorage`.
- TanStack Query for server state management with `queryKey` conventions (e.g., `["resource", id]`, `["my-resources"]`).
- File naming: kebab-case for component files (e.g., `resource-card.tsx`), `page.tsx` for route pages.

**Enforcement:**
- ESLint with `eslint-config-next` for frontend linting.
- TypeScript strict mode catches type errors at compile time.
- Jakarta validation annotations enforce input constraints at the API boundary.
- `GlobalExceptionHandler` ensures all error responses follow a consistent JSON structure.
- Code review via GitHub pull requests before merging to the main branch.

### 3.5 Production Environment and Deployment Approach

**Production Environment:**
- **Server:** Alibaba Cloud ECS `ecs.c9i.large` (8 vCPU, 16 GB RAM), running Ubuntu.
- **Reverse Proxy:** Nginx on port 80, routing to Spring Boot (:8080) and Next.js (:3000).
- **Database:** MySQL 8.0 running locally on the same ECS instance.
- **File Storage:** Local disk at `/opt/heritage/uploads/` and `/opt/heritage/thumbnails/`, served directly by Nginx with 7-day cache headers.
- **Process Management:** systemd services (`heritage-backend`, `heritage-frontend`) with auto-restart.

**Deployment Process:**
1. Developer pushes to `feature/aliyun-migration` branch on GitHub.
2. GitHub Actions workflow triggers automatically.
3. Backend: `mvn clean package -DskipTests` builds the JAR; SCP copies it to `/opt/heritage/app/` on ECS.
4. Frontend: `npm ci && npm run build` produces standalone output; SCP copies `.next/standalone/`, `.next/static/`, and `public/` to ECS.
5. SSH command restarts both systemd services and verifies they are active.

**Key Constraints:**
- No HTTPS in the current deployment (HTTP only on port 80). Nginx is configured and ready for Let's Encrypt TLS certificates.
- Single-server deployment means zero redundancy. Mitigated by systemd auto-restart and the ability to redeploy within minutes via CI/CD.
- Database runs on the same instance as the application. Future improvement: migrate to managed database service.

---

## 4. Legal, Social, Ethical, and Professional Considerations

### 4.1 Privacy and Data Protection

- User passwords are hashed with bcrypt (cost factor 10) and never stored or transmitted in plaintext.
- JWT tokens contain only email, userId, and role — no sensitive personal data.
- The `cognito_sub` field is retained as nullable for migration compatibility but is not used for new users.
- User deletion (`DELETE /api/users/{id}`) performs a hard delete, removing all personal data from the database.
- **Future improvement:** Implement GDPR-compliant data export and right-to-erasure workflows; add privacy policy page.

### 4.2 Copyright and Licensing

- Every resource submission requires a mandatory `copyrightDeclaration` field where contributors must declare the copyright status of their submission.
- The platform does not claim ownership of submitted content — it serves as a hosting and curation platform.
- File uploads are stored privately and only accessible to authenticated users (or via Nginx static serving for approved resources).
- **Future improvement:** Replace free-text copyright declaration with structured options (e.g., Creative Commons licence selector) to reduce ambiguity and improve legal clarity.

### 4.3 Accessibility

- Frontend uses semantic HTML elements and ARIA attributes where appropriate.
- shadcn/ui components provide keyboard navigation and screen reader support out of the box.
- Form inputs have associated `<Label>` elements; error messages use `role="alert"`.
- Colour contrast follows Tailwind CSS defaults which generally meet WCAG AA standards.
- **Future improvement:** Conduct formal accessibility audit with assistive technology testing.

### 4.4 Security

- Role-based access control enforced at both API level (Spring Security) and UI level (`ProtectedRoute` component).
- CSRF protection is disabled (appropriate for stateless JWT APIs where tokens are sent via `Authorization` header).
- CORS is restricted to the configured frontend origin.
- File upload size limited to 50 MB per file (max 10 files per resource), 55 MB per request.
- External link URLs validated with regex pattern on backend (`@Pattern`) and URL constructor check on frontend — only `http://` and `https://` allowed.
- Password updates require minimum 8 characters, enforced on both frontend and backend; passwords hashed with bcrypt before storage.
- Input validation via Jakarta Bean Validation prevents malformed data from reaching the database.
- SQL injection prevented by JPA parameterised queries (no raw SQL string concatenation).
- **Future improvement:** Migrate JWT storage from localStorage to HttpOnly cookies; add rate limiting; enable HTTPS.

### 4.5 Professional Responsibility

- The review workflow ensures that no user-submitted content is publicly visible without moderation, reducing the risk of harmful or misleading content.
- Status transitions are fully audited in the `status_transitions` table, providing accountability for all content decisions.
- The `review_feedback` table records reviewer comments and decisions, creating a transparent record of moderation actions.
- API documentation (Swagger UI) is auto-generated and always up-to-date, supporting professional development practices.

---

## 5. Software Testing

### 5.1 Unit Testing

Unit tests are located in `backend/src/test/java/com/heritage/platform/` and mirror the source package structure. Tests use JUnit 5 with Mockito for mocking dependencies and AssertJ for fluent assertions.

**Test Coverage by Module:**

| Test Class | Module Under Test | # Tests | Key Scenarios |
|-----------|-------------------|---------|---------------|
| `AuthServiceTest` | `AuthService` | 7 | Registration (success, duplicate email), login (valid, invalid password, non-existent user, null password hash), logout no-op |
| `ResourceServiceTest` | `ResourceService` | 15 | Create resource, get by ID (owner, admin, reviewer, viewer access control), update (success, non-owner, non-draft), delete (success, non-draft), submit for review (success, missing metadata), revise, list contributor resources |
| `ReviewServiceTest` | `ReviewService` | 11 | Approve (success, non-pending), reject (success, empty feedback, non-pending), review queue retrieval, feedback recording |
| `AdminServiceTest` | `AdminService` | 11 | Archive (success, non-approved), unpublish (with/without reason, non-approved), restore (success, non-archived), archived list |
| `UserServiceTest` | `UserService` | 14 | Get by email, update profile (extended fields: avatar, bio, privacy), change role, delete user, grant/revoke contributor, pending requests, get user profile (filters approved resources only) |
| `UserServicePasswordUpdateTests` | `UserService` | 1 | Password update hashes with bcrypt before saving |
| `UserResourceValidationTests` | DTO validation | 6 | Password min length, blank password kept, incomplete draft allowed, invalid URL rejected, valid URL accepted, draft without category |
| `FileServiceTest` | `FileService` | 11 | Upload (success, oversized, non-owner, non-draft), delete file reference, thumbnail generation, download URL generation |
| `CommentServiceTest` | `CommentService` | 8 | Add comment (success, empty body, non-approved resource), get comments pagination |
| `TagServiceTest` | `TagService` | 9 | CRUD operations, duplicate name, delete with associated resources |
| `SearchServiceTest` | `SearchService` | 15 | Search with various filter combinations (query, category, tag, all, none), pagination, default page size |
| `JwtServiceTest` | `JwtService` | 11 | Token generation, validation (valid, expired, tampered, malformed), claim extraction (email, role, userId) |
| `JwtAuthFilterTest` | `JwtAuthFilter` | 7 | Valid token sets SecurityContext, invalid token passes through, missing header, public endpoints skipped |
| `SecurityConfigTest` | `SecurityConfig` | 19 | Public endpoints accessible, unauthenticated returns 401, role-based access for admin/reviewer/contributor/viewer endpoints |

**Total: 169+ tests, all passing.**

**Property-Based Testing (jqwik):**

In addition to example-based unit tests, the project uses jqwik for property-based testing of the resource status state machine:

| Test Class | # Properties | Description |
|-----------|-------------|-------------|
| `ResourceStatusPropertyTest` | 2 | Tests the `ResourceStatus.canTransitionTo()` enum method directly — verifies all valid transitions return true and all invalid transitions return false |
| `ResourceServiceStatusTransitionPropertyTest` | 2 | Tests the full `ResourceService.transitionStatus()` method with mocked repositories — verifies valid transitions persist audit records and invalid transitions throw `InvalidStatusTransitionException` |

These property tests exhaustively generate all (from, to) status pairs and verify the state machine behaves correctly for every combination, providing stronger guarantees than hand-picked example tests.

### 5.2 Integration Testing

Integration testing was conducted at two levels:

**Backend Integration (SecurityConfig + Filter Chain):**
The `SecurityConfigTest` class uses `@WebMvcTest` with lightweight stub controllers to test the full Spring Security filter chain without loading real service implementations. This verifies that:
- Public endpoints (register, login) are accessible without authentication.
- All protected endpoints return 401 for unauthenticated requests.
- Role-based access rules are correctly enforced (ADMINISTRATOR, REVIEWER, CONTRIBUTOR, REGISTERED_VIEWER).
- The JWT filter correctly extracts and validates tokens.

This is a true integration test because it exercises the `SecurityConfig` bean, `JwtAuthFilter`, and Spring's `MockMvc` together, verifying the complete request processing pipeline.

**Frontend-Backend Integration:**
- The frontend `apiClient` was tested against the running backend during development using the Swagger UI as a reference.
- TanStack Query's `queryKey` invalidation was verified to correctly refresh data after mutations (e.g., submitting a resource for review updates the "My Resources" list).
- The `ProtectedRoute` component was tested to ensure it correctly redirects unauthenticated users and restricts access based on roles.

**Database Integration:**
- Flyway migrations were tested by running the application against a fresh MySQL instance and verifying all tables are created correctly.
- The `application-test.yml` profile uses H2 in-memory database with `ddl-auto: none` and Flyway disabled, ensuring unit tests run without a real database while integration tests can use the full MySQL schema.

### 5.3 Acceptance Testing

Acceptance testing was conducted manually against the deployed system at `http://116.62.231.99` using the four pre-configured user accounts (viewer, contributor, reviewer, admin).

**Test Scenarios and Results:**

| # | Scenario | Steps | Expected Result | Actual Result |
|---|----------|-------|-----------------|---------------|
| AT1 | User Registration | Navigate to /register, fill form, submit | New account created, redirected to login | ✅ Pass |
| AT2 | User Login | Enter valid credentials at /login | JWT issued, redirected to home, navbar shows user | ✅ Pass |
| AT3 | Browse Resources | Navigate to /browse, search "temple" | Paginated results with matching approved resources | ✅ Pass |
| AT4 | Filter by Category | Select category from dropdown on browse page | Results filtered to selected category | ✅ Pass |
| AT5 | Create Resource | As contributor, click New Resource, fill form, save | Draft resource created, redirected to edit page | ✅ Pass |
| AT6 | Upload File | On edit page, upload an image file | File uploaded, thumbnail generated, shown in file list | ✅ Pass |
| AT7 | Submit for Review | Click "Submit for Review" on draft resource | Status changes to PENDING_REVIEW | ✅ Pass |
| AT8 | Review & Approve | As reviewer, open review queue, approve resource | Status changes to APPROVED, resource visible in search | ✅ Pass |
| AT9 | Review & Reject | As reviewer, reject with feedback | Status changes to REJECTED, feedback recorded | ✅ Pass |
| AT10 | View Rejection Feedback | As contributor, view rejected resource | Reviewer feedback displayed in amber panel | ✅ Pass |
| AT11 | Revise & Resubmit | Click "Revise", edit, resubmit | Resource cycles back through review workflow | ✅ Pass |
| AT12 | Admin User Management | As admin, change user role | User role updated, reflected in user list | ✅ Pass |
| AT13 | Admin Category CRUD | Create, rename, delete category | Category operations succeed; delete blocked if resources exist | ✅ Pass |
| AT14 | Archive Resource | As admin, archive an approved resource | Status changes to ARCHIVED, removed from search | ✅ Pass |
| AT15 | Unpublish Resource | As admin, unpublish with reason | Status changes to DRAFT, reason recorded as feedback | ✅ Pass |
| AT16 | Comment on Resource | As viewer, add comment to approved resource | Comment appears in comment section | ✅ Pass |
| AT17 | Idle Timeout | Leave session idle for 30 minutes | Auto-logout, redirected to login | ✅ Pass |
| AT18 | Role-Based Navigation | Login as each role | Navbar shows appropriate links per role | ✅ Pass |

### 5.4 Defect Tracking and Improvement Before First Release

**When Testing Was Conducted:**
- Unit tests were written alongside feature implementation (test-driven for critical paths like auth and status transitions).
- Integration tests (`SecurityConfigTest`) were written after the security configuration was finalised in Increment 2.
- Acceptance testing was conducted after each increment deployment and comprehensively before the first release.
- Peer review testing was conducted by team members using each other's features, which identified several defects (see below).

**Defects Tracked and Resolved:**

| # | Defect | Severity | How Discovered | Resolution |
|---|--------|----------|----------------|------------|
| D1 | `ResourceResponse` DTO missing `reviewFeedbacks` field — contributors could not see rejection reasons | High | Peer review testing | Added `ReviewFeedbackDto` inner class and mapping in `ResourceResponse.fromEntity()` |
| D2 | `SecurityConfig` restricted resource write operations to CONTRIBUTOR only — admin and reviewer got 403 on My Resources | High | Peer review testing | Changed `hasRole("CONTRIBUTOR")` to `hasAnyRole("CONTRIBUTOR", "REVIEWER", "ADMINISTRATOR")` for resource endpoints |
| D3 | Frontend `ProtectedRoute` on contribute pages only allowed CONTRIBUTOR role — admin/reviewer redirected to home | Medium | Peer review testing | Updated `requiredRoles` to include all three content-creating roles |
| D4 | `findByCognitoSub()` method still defined in `UserRepository` after Cognito migration | Low | Code review | Identified as dead code; no service calls it. Retained for now, cleanup planned |
| D5 | File upload only available in edit mode, not during initial resource creation | Low (by design) | Peer review | Confirmed as intentional — resource must exist before files can be associated. UI shows "You can upload files after saving" hint |
| D6 | Missing Flyway migration for new DB fields (user profile, featured, anonymous comments) | High | PR #26 code review | Added `V4__add_featured_profile_comment_fields.sql` migration script |
| D7 | SecurityConfig not updated for new public endpoints (featured, user profile) | High | PR #26 code review | Added `permitAll()` rules for `GET /api/resources/featured`, `GET /api/resources/homepage-featured`, `GET /api/users/*/profile` |
| D8 | Duplicate HTML rendering (title shown twice, copyright shown twice) | Medium | PR #27 code review | Removed duplicate `<h1>` and `<p>` tags from resource detail and review pages |
| D9 | PR #28 developed against wrong architecture branch (AWS instead of Alibaba) | Critical | PR #28 code review | PR rejected; developer instructed to rebase on current main |
| D10 | Flyway V4 version conflict between parallel PRs | High | PR #30 code review | Renamed to V6 to avoid duplicate version numbers |
| D11 | JWT principal changed from email to userId, breaking all controllers | Critical | PR #30 code review | Reverted; kept email as principal identity |
| D12 | Nginx missing `/files/avatars/` location block — avatars uploaded but not displayed | Medium | Issue #31 (peer testing) | Added avatar location block to `nginx-heritage.conf`; CI/CD auto-deploys config |

**How Testing Informed Improvements:**
- The peer review feedback (D1, D2, D3) directly led to code fixes committed before the first release.
- Property-based tests for the status state machine caught edge cases that example-based tests missed (e.g., ARCHIVED → APPROVED transition).
- The `SecurityConfigTest` integration test suite was expanded after D2 was discovered, adding explicit tests for admin and reviewer access to contributor endpoints.

---

## 6. References

1. Spring Boot 3.4 Documentation — https://docs.spring.io/spring-boot/docs/3.4.x/reference/html/
2. Next.js 16 Documentation — https://nextjs.org/docs
3. Spring Security Reference — https://docs.spring.io/spring-security/reference/
4. JJWT (Java JWT) Library — https://github.com/jwtk/jjwt
5. Flyway Database Migrations — https://documentation.red-gate.com/fd
6. TanStack Query v5 — https://tanstack.com/query/latest
7. shadcn/ui Component Library — https://ui.shadcn.com/
8. jqwik Property-Based Testing — https://jqwik.net/
9. Thumbnailator Image Processing — https://github.com/coobird/thumbnailator
10. SpringDoc OpenAPI — https://springdoc.org/

---

## 7. Appendix

### Appendix A: Use Case Diagram

```
                    ┌─────────────────────────────────────────┐
                    │        Heritage Resource Platform         │
                    │                                         │
  ┌──────────┐     │  ┌─────────────────────────────────┐    │
  │Registered│─────┼─►│ UC1: Register / Login            │    │
  │ Viewer   │     │  │ UC2: Browse & Search             │    │
  │          │─────┼─►│ UC3: View Resource Detail         │    │
  │          │─────┼─►│ UC4: Comment on Resource          │    │
  │          │─────┼─►│ UC14: View/Edit Profile           │    │
  └──────────┘     │  └─────────────────────────────────┘    │
       ▲           │                                         │
       │           │  ┌─────────────────────────────────┐    │
  ┌────┴─────┐     │  │ UC5: Create Resource             │    │
  │Contributor│────┼─►│ UC6: Upload Files                │    │
  │          │─────┼─►│ UC7: Edit / Delete Draft          │    │
  │          │─────┼─►│ UC8: Submit for Review            │    │
  │          │─────┼─►│ UC9: Revise Rejected Resource     │    │
  └──────────┘     │  └─────────────────────────────────┘    │
       ▲           │                                         │
       │           │  ┌─────────────────────────────────┐    │
  ┌────┴─────┐     │  │ UC10: Review Resource            │    │
  │ Reviewer │─────┼─►│       (Approve / Reject)         │    │
  └──────────┘     │  └─────────────────────────────────┘    │
       ▲           │                                         │
       │           │  ┌─────────────────────────────────┐    │
  ┌────┴─────┐     │  │ UC11: Manage Users               │    │
  │  Admin   │─────┼─►│ UC12: Manage Categories & Tags   │    │
  │          │─────┼─►│ UC13: Archive/Unpublish/Restore   │    │
  └──────────┘     │  └─────────────────────────────────┘    │
                    │                                         │
                    └─────────────────────────────────────────┘

  Note: Each higher role inherits all use cases from lower roles.
  Admin ⊃ Reviewer ⊃ Contributor ⊃ Registered Viewer.
```

### Appendix B: Full ERD (Mermaid)

See `docs/er-diagram.md` for the complete Mermaid ERD with all columns, data types, and relationships.

### Appendix C: Class Diagram

See `docs/class-diagram.md` for the complete Mermaid class diagram including entity relationships, service layer, controller layer, and the resource status state machine.

### Appendix D: Test Results Summary

```
[INFO] Tests run: 169+, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS

Breakdown by test class:
  AuthServiceTest .................. 7 tests  ✅
  ResourceServiceTest ............. 15 tests  ✅
  ReviewServiceTest ............... 11 tests  ✅
  AdminServiceTest ................ 11 tests  ✅
  UserServiceTest ................. 14 tests  ✅
  UserServicePasswordUpdateTests .. 1 test   ✅
  UserResourceValidationTests ..... 6 tests  ✅
  FileServiceTest ................. 11 tests  ✅
  CommentServiceTest .............. 8 tests   ✅
  TagServiceTest .................. 9 tests   ✅
  SearchServiceTest ............... 15 tests  ✅
  JwtServiceTest .................. 11 tests  ✅
  JwtAuthFilterTest ............... 7 tests   ✅
  SecurityConfigTest .............. 19 tests  ✅
  ResourceStatusPropertyTest ...... 2 props   ✅
  ResourceServiceStatusTransitionPropertyTest .. 2 props ✅
  HeritagePlatformApplicationTests  1 test    ✅
```

### Appendix E: CI/CD Pipeline Configuration

See `.github/workflows/deploy-backend.yml` for the full GitHub Actions workflow definition.

### Appendix F: Nginx Configuration

See `scripts/nginx-heritage.conf` for the production Nginx reverse proxy configuration.

### Appendix G: Database Migration Scripts

- `V1__initial_schema.sql` — Creates all 10 application tables with indexes and foreign keys.
- `V2__replace_cognito_with_local_auth.sql` — Adds `password_hash` column and makes `cognito_sub` nullable for the AWS-to-local-auth migration.
- `V3__seed_data.sql` — Seeds sample users, categories, and tags for development and demo.
- `V4__add_featured_profile_comment_fields.sql` — Adds user profile fields (avatar, bio, privacy settings), featured resource fields (isFeatured, featuredStatus), and anonymous comment support.
- `V5__allow_incomplete_drafts.sql` — Makes title, category_id, and copyright_declaration nullable to support saving incomplete drafts.
