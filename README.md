# 🏛️ Heritage Resource Platform

A community-driven web platform for discovering, sharing, and preserving cultural heritage resources — including images, stories, traditions, historical sites, and educational materials.

**Live Demo:** http://116.62.231.99 (Alibaba Cloud ECS)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Alibaba Cloud ECS (ecs.c9i.large)           │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Nginx :80                                        │  │
│  │  /api/*  → Spring Boot :8080                      │  │
│  │  /files/* → local disk                            │  │
│  │  /*      → Next.js :3000                          │  │
│  └─────────────┬─────────────────┬───────────────────┘  │
│                │                 │                       │
│  ┌─────────────▼──────┐  ┌──────▼──────────────────┐   │
│  │  Spring Boot :8080  │  │  Next.js :3000          │   │
│  │  REST API           │  │  React 19 (standalone)  │   │
│  │  Local JWT Auth     │  └─────────────────────────┘   │
│  │  Local File Storage │                                │
│  │  Thumbnailator      │                                │
│  └─────────┬───────────┘                                │
│            │                                            │
│  ┌─────────▼───────────┐                                │
│  │  MySQL 8.0           │                                │
│  │  heritage_db         │                                │
│  └─────────────────────┘                                │
└─────────────────────────────────────────────────────────┘
```

## Features

### Role-Based Access Control
Four user roles with progressive permissions:

| Role | Capabilities |
|------|-------------|
| Registered Viewer | Browse and search approved resources, comment |
| Contributor | Create, edit, and submit resources for review |
| Reviewer | Review submitted resources, approve or reject with feedback |
| Administrator | Full user management, category/tag management, all reviewer capabilities |

### Resource Lifecycle
Resources follow a structured workflow:
```
DRAFT → PENDING_REVIEW → APPROVED (published)
                       → REJECTED → DRAFT (revise and resubmit)
```

### Core Functionality
- **Browse & Search** — Full-text search with category and tag filters, paginated results
- **Resource Management** — Create resources with metadata, file attachments, external links, and tags
- **Review System** — Reviewers can approve or reject with feedback; contributors can revise and resubmit
- **Admin Panel** — User management (role changes, add/delete users), category and tag CRUD, archived resource management
- **Authentication** — Self-hosted JWT auth with bcrypt password hashing
- **Auto Thumbnails** — Thumbnailator generates thumbnails on upload
- **API Documentation** — Interactive Swagger UI at `/swagger-ui.html` with OpenAPI 3.0 spec
- **Idle Timeout** — 30-minute inactivity auto-logout for security

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Query |
| Backend | Spring Boot 3.4, Java 21, Spring Security, Spring Data JPA, Flyway, JJWT, SpringDoc OpenAPI |
| Database | MySQL 8.0 |
| Auth | Self-hosted (bcrypt + JJWT HMAC-SHA256) |
| Storage | Local disk + Nginx static serving |
| Thumbnails | Thumbnailator (Java, in-process) |
| Hosting | Alibaba Cloud ECS (single server) |
| Reverse Proxy | Nginx |
| CI/CD | GitHub Actions (build + SCP + restart) |

## Project Structure

```
heritage-resource-platform/
├── frontend/          # Next.js application
│   ├── src/app/       # App Router pages
│   ├── src/components/# Reusable UI components
│   └── src/lib/       # API client, auth context
├── backend/           # Spring Boot application
│   └── src/main/java/com/heritage/platform/
│       ├── config/    # Security, CORS, JWT, OpenAPI
│       ├── controller/# REST API endpoints
│       ├── service/   # Business logic + JwtService
│       ├── repository/# JPA repositories
│       ├── model/     # Entity classes
│       └── dto/       # Request/Response DTOs
├── scripts/           # Deployment and utility scripts
│   ├── ecs-setup.sh   # Alibaba Cloud ECS setup
│   └── nginx-heritage.conf
├── docs/              # Architecture diagrams and docs
└── .github/workflows/ # CI/CD pipeline
```

## Getting Started

### Local Development

1. **Backend** — Requires Java 21, Maven, MySQL:
   ```bash
   cd backend
   mvn spring-boot:run -Dspring-boot.run.profiles=local
   ```

2. **Frontend** — Requires Node.js 20+:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Deployment

See [docs/aliyun-migration-plan.md](docs/aliyun-migration-plan.md) for Alibaba Cloud ECS deployment guide.

### Sample Accounts

| Role | Email | Password |
|------|-------|----------|
| Viewer | viewer@heritage.demo | DemoPass123 |
| Contributor | contributor@heritage.demo | DemoPass123 |
| Reviewer | reviewer@heritage.demo | DemoPass123 |
| Admin | admin@heritage.demo | DemoPass123 |
