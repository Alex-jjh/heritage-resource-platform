# Tech Stack & Build Commands

## Backend (Java / Spring Boot)

| Concern | Technology |
|---------|-----------|
| Framework | Spring Boot 3.4.1, Java 21 |
| Build | Maven (wrapper not included — use system `mvn`) |
| ORM | Spring Data JPA (Hibernate) |
| Database | MySQL 8.0 (H2 in-memory for tests) |
| Migrations | Flyway (`src/main/resources/db/migration/V*__*.sql`) |
| Auth | Self-hosted JWT via JJWT 0.12.6, bcrypt passwords |
| Security | Spring Security with custom `JwtAuthFilter` |
| Validation | Spring Boot Starter Validation (Jakarta) |
| API Docs | SpringDoc OpenAPI 2.8.4 (Swagger UI) |
| Thumbnails | Thumbnailator 0.4.20 |
| Lombok | Used for model/DTO boilerplate |
| Testing | JUnit 5, Mockito, AssertJ, Spring Security Test |
| PBT | jqwik 1.9.2 for property-based tests |
| Coverage | JaCoCo 0.8.12 |

### Backend Commands

```bash
# Run locally (requires MySQL on localhost:3306)
cd heritage-resource-platform/backend
mvn spring-boot:run -Dspring-boot.run.profiles=local

# Run tests
cd heritage-resource-platform/backend
mvn test

# Build JAR (skip tests)
cd heritage-resource-platform/backend
mvn clean package -DskipTests

# Maven surefire is configured with: -XX:+EnableDynamicAgentLoading -Xshare:off
```

### Spring Profiles

- `local` — local MySQL, CORS for localhost:3000, local file storage
- `dev` — development environment
- `prod` — production settings
- `test` — H2 in-memory DB, Flyway disabled

## Frontend (Next.js / React)

| Concern | Technology |
|---------|-----------|
| Framework | Next.js 16.1.6 (App Router, standalone output) |
| UI Library | React 19, TypeScript 5 |
| Styling | Tailwind CSS v4, tw-animate-css |
| Components | shadcn/ui (base-nova style), Lucide icons |
| Data Fetching | TanStack Query (React Query) v5 |
| HTTP Client | Custom `apiClient` wrapper around `fetch` (`src/lib/api-client.ts`) |
| Auth State | React Context (`src/lib/auth-context.tsx`), JWT in localStorage |
| Path Aliases | `@/*` maps to `./src/*` |

### Frontend Commands

```bash
# Install dependencies
cd heritage-resource-platform/frontend
npm install

# Run dev server
cd heritage-resource-platform/frontend
npm run dev

# Production build
cd heritage-resource-platform/frontend
npm run build

# Lint
cd heritage-resource-platform/frontend
npm run lint
```

## Infrastructure & Deployment

- Hosted on Alibaba Cloud ECS (single server)
- Nginx reverse proxy: `/api/*` → Spring Boot :8080, `/files/*` → local disk, `/*` → Next.js :3000
- CI/CD via GitHub Actions: build → SCP → restart systemd services
- Terraform config in `infra/` (state files present)
- Lambda function in `lambda/thumbnail-generator/` (legacy, thumbnails now handled in-process)
