# Future Improvements — Technology Roadmap

This document outlines potential technology upgrades for the Heritage Resource Platform, categorized by priority and impact. Each entry explains what the technology does, how it would integrate with the current architecture, and what problem it solves.

## Current Architecture Summary

| Layer | Current Technology |
|-------|-------------------|
| Frontend | Next.js 16 + React 19 (Amplify Hosting) |
| Backend | Spring Boot 3.4 + Java 21 (EC2) |
| Database | MySQL 8.0 (EC2 local) |
| Auth | AWS Cognito (JWT) |
| Storage | AWS S3 (pre-signed URLs) |
| Search | SQL LIKE query |
| API Style | REST (JSON) |
| CI/CD | GitHub Actions + Amplify auto-deploy |
| Deployment | JAR via SCP + systemd |
| HTTPS | CloudFront → EC2 proxy |

---

## Priority 1 — Quick Wins (days, not weeks)

### Docker + Docker Compose

**Problem:** Deploying to EC2 requires manually installing Java 21, MySQL 8, and configuring systemd. New instances need full setup from scratch.

**Solution:** Containerize the application. A `Dockerfile` for Spring Boot and a `docker-compose.yml` that bundles the app + MySQL.

**Impact:**
- `docker-compose up` starts the entire backend stack in seconds
- New EC2 instances only need Docker installed
- Local development environment matches production exactly
- Eliminates "works on my machine" issues

**Integration:** Replace the current `systemd` service with Docker containers. CI/CD pipeline builds a Docker image instead of a JAR.

```
Current:  mvn package → SCP JAR → systemctl restart
Future:   docker build → docker push → docker pull + docker-compose up
```

### Swagger / OpenAPI

**Problem:** API documentation only exists in code. Frontend developers must read Controller source files to understand endpoints, request/response formats, and error codes.

**Solution:** Add `springdoc-openapi` dependency to Spring Boot. Automatically generates interactive API documentation at `/swagger-ui.html`.

**Impact:**
- Auto-generated, always up-to-date API docs
- Interactive "Try it out" feature for testing endpoints
- Can export OpenAPI spec for client code generation
- One Maven dependency, zero code changes

**Integration:** Add to `pom.xml`:
```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.8.0</version>
</dependency>
```

### Nginx (Reverse Proxy)

**Problem:** CloudFront is used as an HTTPS proxy for the backend API, but it adds latency and complexity. No rate limiting or static file caching on the backend.

**Solution:** Install Nginx on EC2 as a reverse proxy in front of Spring Boot. Use Let's Encrypt (Certbot) for free HTTPS certificates.

**Impact:**
- Direct HTTPS termination on EC2, no CloudFront dependency
- Request rate limiting to prevent abuse
- Gzip compression for API responses
- Can serve static assets directly without hitting Spring Boot
- Free SSL certificates with auto-renewal

**Integration:**
```
Current:  Browser → CloudFront (HTTPS) → EC2:8080 (HTTP)
Future:   Browser → Nginx:443 (HTTPS) → localhost:8080 (HTTP)
```

---

## Priority 2 — Meaningful Upgrades (1–2 weeks each)

### Redis (Caching Layer)

**Problem:** Every page load queries MySQL directly. The browse page, featured resources, and category/tag lists are read-heavy and rarely change.

**Solution:** Add Redis as a caching layer between Service and Repository. Cache frequently accessed data with TTL-based expiration.

**What to cache:**
- Browse page results (TTL: 5 minutes)
- Category and tag lists (TTL: 1 hour, invalidate on CRUD)
- Featured resources on homepage (TTL: 10 minutes)
- Individual resource detail pages (TTL: 5 minutes, invalidate on update)

**Impact:**
- Significantly faster page loads for read-heavy pages
- Reduced MySQL load
- Spring Boot has first-class Redis support via `spring-boot-starter-data-redis`

**Integration:** Add `@Cacheable` annotations to Service methods:
```java
@Cacheable(value = "categories", key = "'all'")
public List<Category> getAllCategories() { ... }
```

### Elasticsearch (Full-Text Search)

**Problem:** Current search uses SQL `LIKE '%keyword%'` which is slow, case-sensitive, and cannot handle typos, synonyms, or relevance ranking.

**Solution:** Index approved resources into Elasticsearch. Search queries go to ES instead of MySQL.

**Impact:**
- Fuzzy matching: "traditon" matches "tradition"
- Relevance scoring: results ranked by match quality
- Multi-field search: search across title, description, place, tags simultaneously
- Autocomplete / search suggestions
- Much faster than SQL LIKE on large datasets

**Integration:**
```
Current:  SearchController → SearchService → MySQL (LIKE query)
Future:   SearchController → SearchService → Elasticsearch
          ResourceService (on approve) → sync to Elasticsearch index
```

### WebSocket (Real-Time Notifications)

**Problem:** Users must manually refresh to see status changes (e.g., resource approved, new comment, review feedback).

**Solution:** Add Spring WebSocket (STOMP over SockJS) for real-time push notifications.

**Use cases:**
- Contributor gets notified when resource is approved/rejected
- Admin gets notified when new resource is submitted for review
- Real-time comment updates on resource detail page

**Integration:** Add `spring-boot-starter-websocket`, create a notification topic per user. Frontend subscribes via SockJS client.

### GraphQL (API Optimization)

**Problem:** REST endpoints return fixed response shapes. The browse page receives full `ResourceResponse` objects but only needs title, thumbnail, and category. Over-fetching wastes bandwidth.

**Solution:** Add a GraphQL endpoint alongside REST. Frontend queries specify exactly which fields they need.

**Impact:**
- Reduced payload size (especially for list views)
- Single endpoint for complex queries that currently require multiple REST calls
- Frontend-driven data fetching — no backend changes needed for new UI requirements

**Integration:** Add `spring-boot-starter-graphql`. Can coexist with REST — migrate endpoints gradually.

```graphql
# Frontend query for browse page — only fetches what's needed
query {
  searchResources(query: "temple", page: 0) {
    content {
      id
      title
      thumbnailUrl
      category { name }
    }
    totalElements
  }
}
```

---

## Priority 3 — Production-Grade Infrastructure

### AWS SQS / RabbitMQ (Message Queue)

**Problem:** Some operations should be asynchronous but are currently synchronous (or handled by Lambda). No retry mechanism for failed operations.

**Solution:** Introduce a message queue for async task processing.

**Use cases:**
- Email notifications (resource approved, new comment)
- Audit log recording
- Batch operations (bulk archive, bulk export)
- Retry failed thumbnail generation

**Recommendation:** AWS SQS for simplicity (managed service, no infrastructure to maintain). RabbitMQ if you need more complex routing patterns.

### Prometheus + Grafana (Monitoring & Observability)

**Problem:** No visibility into application health, response times, error rates, or resource usage beyond basic CloudWatch metrics.

**Solution:** Spring Boot Actuator exposes metrics in Prometheus format. Grafana visualizes them in dashboards.

**What to monitor:**
- API response times (p50, p95, p99)
- Error rates by endpoint
- JVM memory and GC metrics
- MySQL connection pool usage
- Active user sessions
- Resource submission/approval rates

**Integration:** Add `spring-boot-starter-actuator` + `micrometer-registry-prometheus`. Run Prometheus + Grafana as Docker containers on the same EC2 or a separate monitoring instance.

### Kubernetes (Container Orchestration)

**Problem:** Single EC2 instance is a single point of failure. No auto-scaling, no zero-downtime deployments.

**Solution:** Deploy to AWS EKS (managed Kubernetes) or ECS (simpler container orchestration).

**Impact:**
- Auto-scaling based on CPU/memory/request count
- Zero-downtime rolling deployments
- Self-healing (crashed containers auto-restart)
- Service discovery and load balancing

**When to consider:** When the platform has consistent traffic that justifies multiple instances. For a course project, single EC2 is sufficient.

**Recommendation:** If scaling is needed, start with AWS ECS (Fargate) — much simpler than K8s, serverless containers, no cluster management.

---

## Not Recommended for This Project

| Technology | Reason |
|-----------|--------|
| Express.js | Backend is already Spring Boot; adding a second runtime increases complexity without benefit |
| MongoDB | Data model is strongly relational (resources ↔ categories ↔ tags ↔ users); MySQL is the right choice |
| Kafka | Designed for high-throughput event streaming (millions of messages/sec); SQS handles this project's async needs |
| gRPC | Optimized for microservice-to-microservice communication; this is a monolithic application using REST |
| Jenkins | GitHub Actions already provides CI/CD; Jenkins requires maintaining a separate server |

---

## Suggested Implementation Order

```
Phase 1 (Quick wins):
  ✅ Docker + Docker Compose
  ✅ Swagger / OpenAPI
  ✅ Nginx + Let's Encrypt HTTPS

Phase 2 (Performance & UX):
  ✅ Redis caching
  ✅ Elasticsearch (if search usage grows)
  ✅ WebSocket notifications

Phase 3 (Scale & Reliability):
  ✅ AWS RDS (replace local MySQL)
  ✅ SQS for async tasks
  ✅ Prometheus + Grafana monitoring
  ✅ ECS/Fargate (if traffic justifies)
```
