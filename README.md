# 🏛️ Heritage Resource Platform

A community-driven web platform for discovering, sharing, and preserving cultural heritage resources — including images, stories, traditions, historical sites, and educational materials.

**Live Demo:** https://main.d39jebtelw5xqu.amplifyapp.com

## Architecture

```
┌─────────────────────┐     rewrites /api/*     ┌──────────────────────┐
│   AWS Amplify        │ ──────────────────────► │   EC2 (t3.small)     │
│   Next.js 16 (SSR)   │                         │   Spring Boot 3.4    │
│   React 19           │                         │   Java 21 + MySQL 8  │
│   Tailwind + shadcn  │                         │                      │
└─────────────────────┘                         │   ┌──────────────┐   │
                                                │   │ AWS Cognito   │   │
                                                │   │ (JWT Auth)    │   │
                                                │   ├──────────────┤   │
                                                │   │ AWS S3        │   │
                                                │   │ (File Storage)│   │
                                                │   ├──────────────┤   │
                                                │   │ AWS Lambda    │   │
                                                │   │ (Thumbnails)  │   │
                                                │   └──────────────┘   │
                                                └──────────────────────┘
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
- **Resource Management** — Create resources with metadata, file attachments (via S3 pre-signed URLs), external links, and tags
- **Review System** — Reviewers can approve or reject with feedback; contributors can revise and resubmit
- **Admin Panel** — User management (role changes, add/delete users), category and tag CRUD, archived resource management
- **Authentication** — AWS Cognito with email/password, JWT-based API auth
- **Auto Thumbnails** — Lambda automatically generates thumbnails when images are uploaded to S3
- **API Documentation** — Interactive Swagger UI at `/swagger-ui.html` with OpenAPI 3.0 spec, JWT auth support
- **Idle Timeout** — 30-minute inactivity auto-logout for security

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Query |
| Backend | Spring Boot 3.4, Java 21, Spring Security, Spring Data JPA, Flyway, SpringDoc OpenAPI |
| Database | MySQL 8.0 |
| Auth | AWS Cognito (User Pool + JWT) |
| Storage | AWS S3 (pre-signed URLs) |
| Thumbnails | AWS Lambda (Node.js 20) |
| Hosting | AWS Amplify (frontend SSR), EC2 (backend) |
| IaC | Terraform |
| CI/CD | GitHub Actions (backend), Amplify auto-deploy (frontend) |

## Project Structure

```
heritage-resource-platform/
├── frontend/          # Next.js application
│   ├── src/app/       # App Router pages
│   ├── src/components/# Reusable UI components
│   └── src/lib/       # API client, auth context
├── backend/           # Spring Boot application
│   └── src/main/java/com/heritage/platform/
│       ├── config/    # Security, CORS, AWS configs, OpenAPI
│       ├── controller/# REST API endpoints
│       ├── service/   # Business logic
│       ├── repository/# JPA repositories
│       ├── model/     # Entity classes
│       └── dto/       # Request/Response DTOs
├── infra/             # Terraform IaC
│   ├── main.tf        # Cognito, S3, Lambda
│   ├── ec2.tf         # EC2 instance, security group, IAM
│   └── cloudfront.tf  # HTTPS proxy (pending verification)
├── lambda/            # Lambda function source
├── scripts/           # Deployment and utility scripts
└── .github/workflows/ # CI/CD pipeline
```

## Getting Started

### Local Development

1. **Backend** — Requires Java 21, Maven, MySQL:
   ```bash
   cd backend
   mvn spring-boot:run -Dspring-boot.run.profiles=local
   ```

2. **Frontend** — Requires Node.js 18+:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for full AWS deployment instructions including Terraform setup, EC2 configuration, and Amplify hosting.

### Sample Accounts

| Role | Email | Password |
|------|-------|----------|
| Viewer | viewer@heritage.demo | DemoPass123 |
| Contributor | contributor@heritage.demo | DemoPass123 |
| Reviewer | reviewer@heritage.demo | DemoPass123 |
| Admin | admin@heritage.demo | DemoPass123 |
