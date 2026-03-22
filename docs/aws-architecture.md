# AWS Architecture & CI/CD Pipeline

## AWS Architecture Topology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              End Users (Browser)                            │
└──────────────┬──────────────────────────────────┬───────────────────────────┘
               │                                  │
               │ HTTPS                            │ HTTPS
               ▼                                  ▼
┌──────────────────────────┐       ┌──────────────────────────────┐
│    AWS Amplify Hosting    │       │    AWS CloudFront (CDN)      │
│                          │       │                              │
│  Next.js Frontend (SSR)  │       │  HTTPS termination proxy     │
│  - Static assets         │       │  viewer-protocol: https-only │
│  - Server-side rendering │       │  cache: disabled (API)       │
│  - Auto-deploy from Git  │       │  PriceClass_100 (US/EU)      │
│                          │       │                              │
│  Origin: GitHub main     │       │  Origin: EC2 Elastic IP:8080 │
│  branch (auto-build)     │       │  protocol: http-only         │
└──────────────────────────┘       └──────────────┬───────────────┘
                                                  │
                                                  │ HTTP :8080
                                                  ▼
                                   ┌──────────────────────────────┐
                                   │    AWS EC2 (t3.small)        │
                                   │    Ubuntu 22.04 LTS          │
                                   │                              │
                                   │  ┌────────────────────────┐  │
                                   │  │  Spring Boot App        │  │
                                   │  │  (Java 21, port 8080)   │  │
                                   │  │  - REST API             │  │
                                   │  │  - JWT validation       │  │
                                   │  │  - S3 pre-signed URLs   │  │
                                   │  └────────────┬───────────┘  │
                                   │               │              │
                                   │  ┌────────────▼───────────┐  │
                                   │  │  MySQL 8.0 (local)     │  │
                                   │  │  - heritage_db          │  │
                                   │  │  - Flyway migrations    │  │
                                   │  └────────────────────────┘  │
                                   │                              │
                                   │  Elastic IP (static)         │
                                   │  IAM Role: S3 + Cognito      │
                                   │  Security Group:              │
                                   │    - 22 (SSH)                 │
                                   │    - 8080 (API)               │
                                   └──────────┬──────┬────────────┘
                                              │      │
                              ┌───────────────┘      └───────────────┐
                              │                                      │
                              ▼                                      ▼
               ┌──────────────────────────┐       ┌──────────────────────────┐
               │    AWS Cognito            │       │    AWS S3                 │
               │                          │       │                          │
               │  User Pool:              │       │  Bucket:                 │
               │  - Email sign-in         │       │  heritage-resources-dev  │
               │  - Password policy       │       │                          │
               │  - Custom "role" attr    │       │  /uploads/*              │
               │                          │       │    Raw file uploads      │
               │  App Client:             │       │  /thumbnails/*           │
               │  - USER_PASSWORD_AUTH    │       │    Generated thumbnails  │
               │  - Access token: 1hr     │       │                          │
               │  - Refresh token: 30d    │       │  Access: Private only    │
               │  - No client secret      │       │  (pre-signed URLs)       │
               │                          │       │  CORS: frontend origin   │
               └──────────────────────────┘       │  Lifecycle: 30d cleanup  │
                                                  └────────────┬─────────────┘
                                                               │
                                                               │ S3 Event:
                                                               │ s3:ObjectCreated
                                                               │ (uploads/*)
                                                               ▼
                                                  ┌──────────────────────────┐
                                                  │    AWS Lambda             │
                                                  │                          │
                                                  │  thumbnail-generator     │
                                                  │  - Node.js 20.x         │
                                                  │  - 512MB / 30s timeout   │
                                                  │                          │
                                                  │  Flow:                   │
                                                  │  1. S3 trigger on upload │
                                                  │  2. Read original image  │
                                                  │  3. Generate thumbnail   │
                                                  │  4. Save to /thumbnails/ │
                                                  │  5. Callback to EC2 API  │
                                                  │     (internal API key)   │
                                                  └──────────────────────────┘
```

## Data Flow Summary

```
User Browser
  │
  ├── Frontend requests ──► Amplify (Next.js SSR)
  │
  ├── API requests ──► CloudFront (HTTPS) ──► EC2:8080 (HTTP)
  │                                              │
  │                                              ├──► Cognito (auth)
  │                                              ├──► S3 (pre-signed URLs)
  │                                              └──► MySQL (data)
  │
  └── File uploads ──► S3 (pre-signed URL, direct upload)
                         │
                         └──► Lambda (thumbnail) ──► S3 + EC2 callback
```

## CI/CD Pipeline

```
┌─────────────┐     ┌──────────────────────────────────────────────────────┐
│  Developer   │     │              GitHub Repository                       │
│              │     │              (main branch)                           │
│  git push    ├────►│                                                      │
│              │     │  ┌─────────────────┐    ┌─────────────────────────┐  │
└─────────────┘     │  │ backend/**       │    │ frontend/**             │  │
                    │  │ changed?         │    │ changed?                │  │
                    │  └────────┬─────────┘    └───────────┬─────────────┘  │
                    └───────────┼───────────────────────────┼───────────────┘
                                │                           │
                    ┌───────────▼───────────┐   ┌───────────▼───────────────┐
                    │  GitHub Actions        │   │  AWS Amplify Auto-Build   │
                    │  deploy-backend.yml    │   │                           │
                    │                        │   │  Trigger: Git push to     │
                    │  Trigger: push to main │   │  main branch              │
                    │  Path: backend/**      │   │                           │
                    │                        │   │  Steps:                   │
                    │  Steps:                │   │  1. Install dependencies  │
                    │  1. Checkout code      │   │  2. next build            │
                    │  2. Setup Java 21      │   │  3. Deploy to Amplify CDN │
                    │  3. mvn clean package  │   │  4. Invalidate cache      │
                    │  4. SCP JAR to EC2     │   │                           │
                    │  5. SSH restart service│   │  URL: main.d39jeb...      │
                    │                        │   │       .amplifyapp.com     │
                    └───────────┬────────────┘   └───────────┬──────────────┘
                                │                             │
                                ▼                             ▼
                    ┌────────────────────────┐   ┌──────────────────────────┐
                    │  EC2 Instance           │   │  Amplify Hosting         │
                    │                        │   │                          │
                    │  /home/ubuntu/app/     │   │  Next.js SSR deployed    │
                    │    heritage-platform-  │   │  Global CDN              │
                    │    0.0.1-SNAPSHOT.jar  │   │  Auto HTTPS              │
                    │                        │   │                          │
                    │  systemd service:      │   └──────────────────────────┘
                    │  heritage-backend      │
                    │  (auto-restart)        │
                    └────────────────────────┘
```

## Infrastructure as Code

All AWS resources are managed by Terraform (`infra/` directory):

| Resource | Terraform File | Purpose |
|----------|---------------|---------|
| EC2 + Security Group + EIP | `ec2.tf` | Backend server with static IP |
| IAM Roles & Policies | `ec2.tf` | EC2 access to S3 and Cognito |
| CloudFront Distribution | `cloudfront.tf` | HTTPS proxy for backend API |
| Cognito User Pool + Client | `main.tf` | User authentication |
| S3 Bucket + CORS + Lifecycle | `main.tf` | File storage |
| Lambda + S3 Trigger | `main.tf` | Thumbnail generation |

## Security Architecture

```
Internet ──► CloudFront (HTTPS/TLS) ──► EC2 (HTTP, internal)
                                          │
                                          ├── JWT validation (Cognito tokens)
                                          ├── API Key auth (Lambda → EC2 internal endpoint)
                                          ├── IAM Role (EC2 → S3, Cognito)
                                          └── Security Group (ports 22, 8080 only)

S3 Bucket: All public access blocked, pre-signed URLs only
Cognito: Password policy enforced, email verification required
```
