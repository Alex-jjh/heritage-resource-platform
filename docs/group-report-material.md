# Group Report Material — Heritage Resource Platform

> Compiled from actual project artifacts: Git history, PR reviews, issue tracker, and codebase analysis.
> Use this as raw material for the group report sections.

---

## 1. Introduction

### Problem Statement
Cultural heritage resources (images, oral traditions, historical sites, educational materials) are scattered across individuals and institutions with no unified platform for discovery, sharing, and preservation. There is a need for a community-driven platform that enables structured contribution, quality review, and public access to heritage content.

### Project Aims
- Build a web application for discovering, sharing, and preserving cultural heritage resources
- Implement role-based access control (Viewer → Contributor → Reviewer → Administrator)
- Enforce a structured review workflow where content is vetted before publication
- Deploy a production-ready first release on Alibaba Cloud ECS

### User Characteristics
| Role | Description |
|------|-------------|
| Registered Viewer | Can browse approved resources, post comments, request contributor status |
| Contributor | Can create/edit draft resources, upload files, submit for review, apply for featured |
| Reviewer | Can approve/reject pending resources, view review history, use task allocation |
| Administrator | Full access: manage users, categories, tags, archive/restore, approve featured |

### First-Release Scope and Prioritization
The team divided work into 4 modules across 3 sub-teams:
- **Module A** (Yi Niu): User profile management, password validation, draft save rules, URL format check
- **Module B** (Yi Niu): Draft save conditions, URL validation for external links
- **Module C** (Lois & Zekai): Featured resources, review history, predefined feedback, user profiles with avatars
- **Module D** (Qianxun & Wenlu): Content engagement (comments, file upload limits), review task allocation with locking

Architecture and infrastructure (Alex): Database schema, REST API layer, JWT auth, CI/CD, deployment.

Prioritization rationale: Core infrastructure first (auth, CRUD, state machine), then user-facing features (profiles, featured), then workflow enhancements (task locking, review history).

---

## 2. Architectural Design

### Architecture Drivers
- **Security**: Role-based access control with 4 permission levels; JWT stateless authentication
- **Maintainability**: Layered architecture (Controller → Service → Repository) for separation of concerns
- **Parallel development**: Module boundaries aligned with team assignments; Swagger UI as API contract
- **Deployment simplicity**: Single ECS instance with Nginx reverse proxy; Docker Compose for local dev
- **Data integrity**: Flyway-managed migrations; resource status state machine enforcing valid transitions

### System Architecture
- **Backend**: Spring Boot 3 + Java 21, Spring Security with custom JwtAuthFilter, JPA/Hibernate with MySQL
- **Frontend**: Next.js 16 + React 19 + TypeScript, TanStack Query for data fetching, Tailwind CSS + shadcn/ui
- **Database**: MySQL 8 with 10+ application tables, Flyway migrations (V1–V6)
- **Deployment**: Alibaba Cloud ECS, Nginx serving frontend static files + reverse proxy to backend, systemd for process management, GitHub Actions CI/CD

### High-level Database Design
10 core tables: `users`, `categories`, `tags`, `resources`, `resource_tags`, `file_references`, `external_links`, `comments`, `review_feedback`, `status_transitions`. Plus `flyway_schema_history`.

Key relationships:
- `resources` → `users` (contributor), `categories` (classification)
- `resources` ↔ `tags` (many-to-many via `resource_tags`)
- `resources` → `file_references`, `external_links`, `comments`, `review_feedback`
- `status_transitions` provides full audit trail of every state change

### Architectural Trade-offs
| Decision | Trade-off |
|----------|-----------|
| Monolithic deployment | Simpler ops, but single point of failure; no horizontal scaling |
| Local file storage (not S3) | Simpler, cheaper, but limited to single server capacity |
| SQL LIKE search | No extra infrastructure, but poor fuzzy matching and no relevance ranking |
| Stateless JWT | No server-side session storage, but token revocation requires client cooperation |
| Flyway migrations | Reproducible schema across environments, but requires version coordination across branches (we hit V4 conflicts) |

---

## 3. Software Design and Engineering Practice

### Software Modules and Responsibilities

**Backend modules (10 controllers):**
| Controller | Responsibility |
|-----------|---------------|
| AuthController | Registration, login, JWT token issuance |
| UserController | Profile CRUD, avatar upload, contributor request |
| ResourceController | Resource CRUD, submit for review, featured application |
| ReviewController | Review queue, approve/reject, predefined feedback, review history |
| AdminController | User role management, archive/restore, featured approval |
| CategoryController | Category CRUD |
| TagController | Tag CRUD |
| CommentController | Add comments, list comments, my comments |
| FileController | File upload, delete, cover image selection |
| SearchController | Full-text search with category/tag filters |

**Frontend modules:**
- Pages: browse, resource detail, contribute (create/edit), review queue, review detail, admin panel, profile, featured, my-comments, review history, user profile
- Shared components: Navbar, ResourceCard, ResourceForm, CommentSection, FileUploader, ProtectedRoute

### Support Services and Engineering Tools

| Tool | How We Used It |
|------|---------------|
| **Git + GitHub** | Branch-per-feature workflow; branch protection on main; PR-based code review |
| **GitHub Issues** | 23 issues tracking PBIs, bugs, and infrastructure tasks |
| **GitHub PRs** | 7 PRs with structured review process; request-changes workflow |
| **Flyway** | 6 versioned migrations (V1–V6) managing schema evolution |
| **Maven** | Backend build, dependency management, test execution |
| **Docker Compose** | Local development environment (MySQL + backend + frontend) |
| **Swagger/OpenAPI** | Living API documentation; frontend-backend contract |
| **GitHub Actions** | CI/CD pipeline: build → test → deploy to ECS on push to main |
| **Nginx** | Reverse proxy, static file serving, file upload endpoint |
| **Kiro/AI tools** | Code review assistance, steering files for coding guidelines |

### Coding Structure and Convention
- Backend: Java package structure `com.heritage.platform.{controller,service,repository,model,dto,exception,config}`
- Constructor injection (not field injection) throughout
- DTOs with `fromEntity()` static factory methods for entity-to-response conversion
- Global exception handler mapping domain exceptions to HTTP status codes
- Frontend: Next.js App Router with file-based routing, TypeScript strict mode
- Code review enforced via PR process; two steering files (`eight-honors-eight-shame.md`, `karpathy-guidelines.md`) codifying team coding standards

---

## 4. Problems Encountered and How We Solved Them

### Problem 1: AWS to Alibaba Cloud Migration
**What happened:** Original architecture used AWS Cognito (auth), S3 (storage), Lambda (thumbnails). Mid-project decision to migrate to self-hosted Alibaba Cloud.
**Impact:** Required rewriting auth subsystem, file storage, and deployment infrastructure.
**Solution:** Phased migration in 3 sequential commits. Team paused merging during migration week. Swagger API contract unchanged so frontend code didn't need modification.
**Lesson:** Plan infrastructure changes before executing; communicate proactively.

### Problem 2: Team Members Developing Against Wrong Architecture Branch
**What happened:** After the AWS→Alibaba migration, some team members continued developing against the old AWS branch (PR #28). Their code imported `AwsS3Config`, `S3Presigner`, used `cognitoSub` authentication — none of which exist in current main.
**Impact:** PR #28 was completely unmergeable: compilation failures, deleted features from other PRs, wrong authentication method.
**Solution:** Detailed code review identified the root cause. PR was rejected with specific instructions to rebase on current main and only port business logic.
**Lesson:** After major infrastructure changes, verify all team members are working from the correct branch. A simple `git log --oneline -1 origin/main` check could have prevented this.

### Problem 3: Flyway Migration Version Conflicts
**What happened:** Multiple PRs independently created migrations with the same version number. PR #26 created V4, PR #30 also created V4.
**Impact:** Flyway refuses to start when duplicate version numbers exist.
**Solution:** Caught during code review. Instructed to rename to V6.
**Lesson:** Coordinate migration version numbers across parallel branches. Consider using timestamps instead of sequential numbers.

### Problem 4: Copy-Paste Bugs in Frontend
**What happened:** PR #27 had duplicate `<h1>` tags (title rendered twice) and duplicate `<p>` tags (copyright shown twice) in resource detail and review pages.
**Impact:** Visual duplication on the page.
**Solution:** Caught in code review, fixed by removing duplicates.
**Lesson:** Always visually verify UI changes, not just check that the code compiles.

### Problem 5: JWT Principal Identity Change Breaking All Controllers
**What happened:** PR #30 changed `JwtAuthFilter` to use `userId` instead of `email` as the authentication principal.
**Impact:** Every controller calls `principal.getName()` and passes it to `findByEmail()`. Changing to userId would break every single service call.
**Solution:** Caught in code review before merge. Instructed to keep email as principal and resolve userId inside services that need it.
**Lesson:** Understand the blast radius of infrastructure-level changes. A one-line change in an auth filter can break the entire application.

### Problem 6: Hardcoded Environment Configuration
**What happened:** PR #30 hardcoded `spring.profiles.active: local` in `application.yml` and changed the local DB password.
**Impact:** Production deployment would connect to localhost database. Other developers' local setups would break.
**Solution:** Caught in code review. Instructed to revert.
**Lesson:** Never commit personal local configuration. Use environment variables for profile activation.

---

## 5. Collaboration and Team Process

### Code Review Process
We established a structured PR review workflow:
1. Developer creates feature branch and opens PR with description
2. Reviewer (typically the architect/team lead) reviews the diff
3. If issues found: "Request Changes" with detailed comments listing specific problems
4. Developer fixes and pushes; reviewer re-reviews
5. When clean: "Approve" and merge to main

**Evidence from this session:**
- PR #26: Initial review found 9 issues (missing Flyway migration, SecurityConfig not updated, `.claude/` directory committed, JWT manual parsing). Developer fixed all issues. Approved and merged.
- PR #27: Initial review found 7 must-fix issues (duplicate rendering, Flyway syntax, null PasswordEncoder, ER diagram typo). Developer fixed 4/7. Reviewer fixed remaining 3 directly and merged.
- PR #28: Rejected entirely — wrong architecture base. Detailed explanation of all 7 incompatibilities provided.
- PR #29: Clean review, only 1 minor issue (duplicate endpoint). Developer fixed promptly. Approved and merged.
- PR #30: 8 critical/should-fix issues identified. Pending developer fixes.

### Issue Tracking
23 GitHub issues created covering:
- Feature PBIs (#1–#9, #15–#17, #20–#23)
- Infrastructure tasks (#2, #14)
- Documentation (#10, #12)
- Bug fixes (#19)
- Team setup (#11, #13)

Issues were closed with comments referencing the implementing PR, creating traceability from requirement to implementation.

### Branch Strategy
- `main`: Protected branch, requires PR review
- `feature/*`: Per-feature or per-team branches
- `archive/aws-version`: Preserved old AWS architecture for reference
- Branch naming convention: `feature/{TeamMember}-{feature}` or `feature/{description}`

### Communication
- Weekly team meetings for sprint planning
- Group chat for quick coordination (PR review notifications, merge requests)
- Migration plan documented in `docs/aliyun-migration-plan.md` before execution
- Code review comments served as async technical discussion

---

## 6. Software Testing

### Unit Testing
- **14 test classes** covering services, validation, and security configuration
- Mockito for dependency mocking; JUnit 5 as test framework
- Key test classes: `UserServiceTest`, `CommentServiceTest`, `ReviewServiceTest`, `CategoryServiceTest`, `AdminServiceTest`, `UserServicePasswordUpdateTests`, `UserResourceValidationTests`
- Property-based testing with JQwik for state machine verification (`ResourceStatusPropertyTest`)

### Integration Testing
- `SecurityConfigTest`: Verifies role-based access control for all endpoints across all 4 roles
- Spring `@WebMvcTest` for controller-level integration tests
- `TaskAllocationTest` (PR #30, pending fixes): Integration test for task lock workflow

### Defect Tracking and Improvement
Defects were primarily caught through code review:
- **PR #26**: Missing Flyway migration, SecurityConfig gaps, committed dev tool files
- **PR #27**: Duplicate HTML rendering, ER diagram typo, null mock in tests
- **PR #28**: Entire PR based on wrong architecture (AWS vs Alibaba)
- **PR #30**: Flyway version conflict, JWT principal change, hardcoded config

Resolution pattern: Review → Comment with specific issues → Developer fix → Re-review → Merge. For urgent fixes, reviewer fixed directly on the branch (PR #27).

---

## 7. Production Environment and Deployment

### Infrastructure
- **Server**: Alibaba Cloud ECS (single instance)
- **OS**: Linux
- **Web server**: Nginx (reverse proxy + static file serving)
- **Database**: MySQL 8
- **Process management**: systemd
- **CI/CD**: GitHub Actions → SSH deploy to ECS on push to main

### Deployment Process
1. Developer pushes to `main` (via merged PR)
2. GitHub Actions workflow triggers: build backend JAR, build frontend static files
3. SCP artifacts to ECS
4. Restart backend service via systemd
5. Nginx serves updated frontend

### Key Constraints
- Single server = no zero-downtime deployment
- No HTTPS in first release (noted as future improvement)
- File storage on local disk (not distributed storage)
- 100MB file upload limit enforced at both frontend and backend

---

---

## 8. Additional Problems & Stories from Git History

### Problem 7: Force-Push Incident and Branch Protection
**Timeline:** Early in the project, before branch protection was configured.
**What happened:** A team member accidentally ran `git push --force` on `main`, overwriting commit history and losing recent work.
**Impact:** Lost commits had to be recovered; team trust in the integration process was shaken.
**Solution:** Alex configured branch protection rules on GitHub:
- Require PR reviews before merging
- Disallow force pushes
- Require CI status checks to pass
**Evidence:** Documented in GitHub Issues; referenced in Appendix A of individual report.
**Lesson:** Branch protection should be configured from day one, not after an incident.

### Problem 8: Recurring LazyInitializationException (6 fix commits)
**Timeline:** Throughout Increment 2–3, this was the most persistent bug pattern.
**What happened:** JPA lazy-loaded associations (`@ManyToOne`, `@OneToMany`) threw `LazyInitializationException` when accessed outside a Hibernate session — typically when converting entities to DTOs in the controller layer.
**Commits tracking the progressive fix:**
1. `4001a74` — First fix: add `@Transactional(readOnly=true)` to read methods
2. `082cc16` — Force-initialize lazy associations inside `@Transactional`
3. `86dcd0b` — Use `saveAndInitialize` pattern for all resource save operations
4. `405844a` — Fix review queue specifically
5. `db34553` — Comprehensive sweep across AdminService, SearchService, CommentService
6. `5f7dc80` — Final fix: missing reviewFeedbacks lazy init in SearchService

**Solution pattern:** Created a `initializeLazyAssociations()` helper method that force-loads all lazy collections within the transaction boundary. Applied consistently across all services.
**Lesson:** Lazy loading is a common JPA pitfall. The team learned to always initialize lazy associations before returning entities from `@Transactional` methods. A DTO projection approach would have avoided this entirely.

### Problem 9: 401 Race Condition on Login
**Timeline:** Increment 3, after deploying JWT auth.
**What happened:** After login, stale in-flight API requests from the previous session triggered 401 responses, which cleared the freshly stored token — causing a login loop.
**Commits:**
- `536f68e` — fix(auth): resolve 401 race condition causing login loop and stale cache on account switch
- `daebe05` — fix(auth): prevent ProtectedRoute redirect race after login
**Solution:** Added an `isLoggingIn` ref guard in the auth context. During login, 401 responses from stale requests are ignored. Also added `queryClient.cancelQueries()` and `queryClient.clear()` before storing new tokens.
**Lesson:** Stateless JWT auth requires careful handling of the transition between sessions, especially with client-side caching (TanStack Query).

### Problem 10: CORS and Mixed Content Issues (AWS Phase)
**Timeline:** Increment 1, during initial AWS deployment.
**Commits:**
- `eb42c43` — Add CORS configuration for cross-origin frontend requests
- `b4356f3` — Fix CORS bean conflict - use Customizer.withDefaults()
- `c5b3748` — Add API rewrites proxy to fix mixed content
**What happened:** Frontend on HTTPS couldn't call backend on HTTP (mixed content blocked by browsers). CORS configuration had bean conflicts.
**Solution:** Configured Nginx as reverse proxy to serve both frontend and backend from the same origin, eliminating CORS issues entirely.

### Problem 11: Cognito Token Confusion
**Timeline:** Increment 1, AWS phase.
**Commits:**
- `c4c6798` — Fix: use idToken for API auth - access token lacks custom:role claim
- `6abd598` — Accept Cognito ID tokens (contain custom:role) in addition to access tokens
**What happened:** AWS Cognito access tokens don't contain custom attributes (like `role`). The team initially used access tokens for API auth, but role-based authorization failed because the role claim was missing.
**Solution:** Switched to using Cognito ID tokens which contain custom attributes. Later, the entire Cognito dependency was removed during the Alibaba migration.

---

## 9. Contribution Statistics

### Commit Distribution (all branches, 149 total commits)
| Author | Commits | Primary Focus |
|--------|---------|---------------|
| Jiang (Alex) | 88 | Architecture, infrastructure, admin module, CI/CD, migration, integration fixes |
| Kuluxy (Zekai) | 21 | Featured resources, image gallery, api-client refactor |
| wenwenwenlululu (Wenlu) | 10 | Task allocation, file size limit |
| Lois | 8 | Review history, predefined feedback, user profiles |
| qianxunzhou2-art (Qianxun) | 4 | Content engagement, review workflow |
| Yi.Niu | 3 | Password validation, draft save rules, URL validation |
| Others | 15 | Various contributions |

### PR Review Activity (PRs #24–#30)
| PR | Author | Reviewer Action | Issues Found | Outcome |
|----|--------|----------------|--------------|---------|
| #26 | Lois & Zekai | Request changes → Approve | 9 issues (Flyway, SecurityConfig, .claude dir, JWT parsing) | Merged after fixes |
| #27 | Yi Niu | Request changes → Fix by reviewer → Merge | 7 issues (duplicate rendering, ER typo, null mock) | Merged, reviewer fixed 3 remaining |
| #28 | Qianxun | Request changes (rejected) | 7 critical (wrong architecture base) | Not merged — must rebase |
| #29 | Zekai | Comment → Approve | 1 minor (duplicate endpoint) | Merged after fix |
| #30 | Qianxun & Wenlu | Request changes | 8 issues (Flyway conflict, JWT principal, hardcoded config) | Pending fixes |

### Sprint Timeline
| Phase | Weeks | Key Deliverables |
|-------|-------|-----------------|
| Increment 1 | 1–3 | Project scaffold, AWS deployment, Cognito auth, basic CRUD |
| Increment 2 | 4–6 | Review workflow, search, file upload, security config |
| Increment 3 | 7–9 | AWS→Alibaba migration, admin panel, comments, featured resources, task allocation |

---

## Appendix Material Available

- Git branch/merge graph showing parallel development
- PR review comments (detailed technical feedback)
- Issue tracker with requirement-to-PR traceability
- ER diagram (`docs/er-diagram.md`)
- Flyway migration scripts (V1–V6)
- SecurityConfig showing role-based endpoint protection
- State machine diagram for resource lifecycle
- CI/CD pipeline configuration (`.github/workflows/`)
- Docker Compose configuration for local development
