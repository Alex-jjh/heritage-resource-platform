# Heritage Resource Platform — Product Overview

A community-driven web platform for discovering, sharing, and preserving cultural heritage resources (images, stories, traditions, historical sites, educational materials).

## Core Concepts

- **Resources** are the central entity — user-submitted heritage items with metadata, file attachments, external links, and tags.
- **Resource Lifecycle**: `DRAFT → PENDING_REVIEW → APPROVED` (published) or `→ REJECTED → DRAFT` (revise). Approved resources can be archived; archived can be restored.
- **Role-Based Access Control** with four roles:
  - Registered Viewer — browse, search, comment on approved resources
  - Contributor — create, edit, submit resources for review
  - Reviewer — approve or reject submitted resources with feedback
  - Administrator — full user/category/tag management, all reviewer capabilities

## Key Features

- Full-text search with category and tag filtering, paginated results
- File upload with automatic thumbnail generation
- Review workflow with feedback loop (reject → revise → resubmit)
- Admin panel for user management, category/tag CRUD, archived resource management
- Self-hosted JWT authentication with bcrypt password hashing
- 30-minute idle timeout auto-logout
- Interactive API docs via Swagger UI at `/swagger-ui.html`
