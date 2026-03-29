# Project Structure

Root: `heritage-resource-platform/`

```
heritage-resource-platform/
├── backend/                          # Spring Boot REST API
│   ├── pom.xml                       # Maven build config
│   ├── Dockerfile
│   └── src/
│       ├── main/java/com/heritage/platform/
│       │   ├── HeritagePlatformApplication.java
│       │   ├── config/               # Security, CORS, JWT filter, OpenAPI config
│       │   ├── controller/           # REST controllers (Auth, Resource, Search, Admin, etc.)
│       │   ├── service/              # Business logic layer
│       │   ├── repository/           # Spring Data JPA repositories
│       │   ├── model/                # JPA entity classes + enums (User, Resource, ResourceStatus, etc.)
│       │   ├── dto/                  # Request/Response DTOs (no Lombok — manual getters/setters)
│       │   └── exception/            # Custom exceptions + GlobalExceptionHandler
│       ├── main/resources/
│       │   ├── application.yml       # Base config
│       │   ├── application-{local,dev,prod}.yml
│       │   └── db/migration/         # Flyway SQL migrations (V1__, V2__, ...)
│       └── test/
│           ├── java/.../platform/
│           │   ├── config/           # Config/filter tests
│           │   ├── model/            # Model/enum tests
│           │   └── service/          # Service unit tests + jqwik property tests
│           └── resources/
│               └── application-test.yml  # H2 in-memory test config
│
├── frontend/                         # Next.js 16 application
│   ├── package.json
│   ├── next.config.ts                # Standalone output mode
│   ├── tsconfig.json                 # Strict mode, @/* path alias
│   ├── components.json               # shadcn/ui config (base-nova style)
│   └── src/
│       ├── app/                      # App Router pages
│       │   ├── layout.tsx            # Root layout
│       │   ├── page.tsx              # Home page
│       │   ├── providers.tsx         # TanStack Query + Auth providers
│       │   ├── globals.css           # Tailwind CSS
│       │   ├── admin/                # Admin panel pages (users, categories, tags)
│       │   ├── browse/               # Browse/search page
│       │   ├── contribute/           # Resource creation/editing (new, [id]/edit)
│       │   ├── login/, register/     # Auth pages
│       │   ├── profile/              # User profile
│       │   ├── resources/[id]/       # Resource detail view
│       │   └── review/[id]/          # Review workflow page
│       ├── components/               # Reusable components
│       │   ├── ui/                   # shadcn/ui primitives
│       │   └── *.tsx                 # App-specific components (navbar, resource-card, etc.)
│       ├── lib/
│       │   ├── api-client.ts         # Typed fetch wrapper with JWT auth
│       │   ├── auth-context.tsx      # Auth state via React Context
│       │   └── utils.ts             # Utility functions (cn helper)
│       └── types/
│           └── index.ts              # Shared TypeScript type definitions
│
├── scripts/                          # Deployment scripts
│   ├── ecs-setup.sh                  # Alibaba Cloud ECS provisioning
│   └── nginx-heritage.conf           # Nginx reverse proxy config
├── infra/                            # Terraform IaC
├── lambda/                           # Legacy Lambda (thumbnail-generator)
├── docs/                             # Architecture docs, diagrams, migration plans
└── .github/workflows/                # CI/CD pipeline (build + deploy to ECS)
```

## Architecture Pattern

- Backend follows a layered architecture: Controller → Service → Repository
- Controllers handle HTTP concerns and delegate to services
- Services contain business logic and call repositories
- DTOs separate API contracts from JPA entities
- Custom exceptions are caught by `GlobalExceptionHandler` and mapped to consistent error responses
- Frontend uses Next.js App Router with server components where possible
- Client-side data fetching via TanStack Query through a centralized `apiClient`
- Auth state managed via React Context with JWT stored in localStorage
- All entity IDs are UUIDs (`BINARY(16)` in MySQL)
