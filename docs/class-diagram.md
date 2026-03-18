# Class Diagram — Heritage Resource Platform

## Entity Relationship Diagram

```mermaid
classDiagram
    direction TB

    class User {
        <<Entity>>
        -UUID id
        -String cognitoSub
        -String email
        -String displayName
        -UserRole role
        -boolean contributorRequested
        -Instant createdAt
        -Instant updatedAt
    }

    class Resource {
        <<Entity>>
        -UUID id
        -String title
        -String place
        -String description
        -String copyrightDeclaration
        -ResourceStatus status
        -String thumbnailS3Key
        -Instant createdAt
        -Instant updatedAt
        -Instant approvedAt
        -Instant archivedAt
    }

    class Category {
        <<Entity>>
        -UUID id
        -String name
        -Instant createdAt
    }

    class Tag {
        <<Entity>>
        -UUID id
        -String name
        -Instant createdAt
    }

    class FileReference {
        <<Entity>>
        -UUID id
        -String s3Key
        -String originalFileName
        -String contentType
        -Long fileSize
        -Instant createdAt
    }

    class ExternalLink {
        <<Entity>>
        -UUID id
        -String url
        -String label
        -Instant createdAt
    }

    class Comment {
        <<Entity>>
        -UUID id
        -String body
        -Instant createdAt
    }

    class ReviewFeedback {
        <<Entity>>
        -UUID id
        -String comments
        -String decision
        -Instant createdAt
    }

    class StatusTransition {
        <<Entity>>
        -UUID id
        -ResourceStatus fromStatus
        -ResourceStatus toStatus
        -Instant transitionedAt
    }

    class UserRole {
        <<Enumeration>>
        REGISTERED_VIEWER
        CONTRIBUTOR
        REVIEWER
        ADMINISTRATOR
    }

    class ResourceStatus {
        <<Enumeration>>
        DRAFT
        PENDING_REVIEW
        APPROVED
        REJECTED
        ARCHIVED
        +canTransitionTo(ResourceStatus) boolean
    }

    User --> UserRole : role
    Resource --> ResourceStatus : status
    Resource --> User : contributor *
    Resource --> Category : category *
    Resource "1" --> "*" Tag : tags
    Resource "1" --> "*" FileReference : fileReferences
    Resource "1" --> "*" ExternalLink : externalLinks
    Resource "1" --> "*" Comment : comments
    Resource "1" --> "*" StatusTransition : statusTransitions
    Resource "1" --> "*" ReviewFeedback : reviewFeedbacks
    Comment --> User : author *
    ReviewFeedback --> User : reviewer *
    StatusTransition --> User : actor *
```

## Service Layer

```mermaid
classDiagram
    direction LR

    class AuthService {
        +register(RegisterRequest) User
        +login(LoginRequest) AuthResponse
        +logout(String) void
    }

    class ResourceService {
        +createResource(String, CreateResourceRequest) Resource
        +getResourceById(UUID, String) Resource
        +updateResource(UUID, String, UpdateResourceRequest) Resource
        +deleteResource(UUID, String) void
        +listContributorResources(String) List~Resource~
        +submitForReview(UUID, String) Resource
        +revise(UUID, String) Resource
        +transitionStatus(UUID, ResourceStatus, User) Resource
    }

    class UserService {
        +getUserByCognitoSub(String) User
        +updateProfile(String, UpdateProfileRequest) User
        +getAllUsers() List~User~
        +getPendingContributorRequests() List~User~
        +grantContributorStatus(UUID) User
        +revokeContributorStatus(UUID) User
        +changeUserRole(UUID, String) void
        +deleteUser(UUID) void
    }

    class SearchService {
        +searchResources(String, UUID, UUID, int, int) Page~Resource~
    }

    class FileService {
        +generateUploadUrl(UploadUrlRequest) UploadUrlResponse
        +generateDownloadUrl(String) String
        +registerFileReference(UUID, FileReferenceRequest) FileReference
    }

    class CategoryService {
        +listAll() List~Category~
        +create(String) Category
        +update(UUID, String) Category
        +delete(UUID) void
    }

    class TagService {
        +listAll() List~Tag~
        +create(String) Tag
        +update(UUID, String) Tag
        +delete(UUID) void
    }

    AuthService ..> CognitoIdentityProviderClient : uses
    AuthService ..> UserRepository : uses
    ResourceService ..> ResourceRepository : uses
    ResourceService ..> CategoryRepository : uses
    ResourceService ..> TagRepository : uses
    ResourceService ..> UserRepository : uses
    UserService ..> UserRepository : uses
    UserService ..> CognitoIdentityProviderClient : uses
    SearchService ..> ResourceRepository : uses
    FileService ..> S3Client : uses
```

## Controller Layer (REST API)

```mermaid
classDiagram
    direction LR

    class AuthController {
        <<RestController /api/auth>>
        +POST /register
        +POST /login
        +POST /logout
    }

    class ResourceController {
        <<RestController /api/resources>>
        +POST /
        +GET /{id}
        +PUT /{id}
        +DELETE /{id}
        +POST /{id}/submit
        +POST /{id}/revise
        +GET /mine
    }

    class UserController {
        <<RestController /api/users>>
        +GET /me
        +PUT /me
        +GET /all
        +GET /pending-contributors
        +POST /{id}/grant-contributor
        +POST /{id}/revoke-contributor
        +PUT /{id}/role
        +DELETE /{id}
    }

    class SearchController {
        <<RestController /api/search>>
        +GET /resources
    }

    class FileController {
        <<RestController /api/files>>
        +POST /upload-url
        +POST /{resourceId}/references
    }

    class CategoryController {
        <<RestController /api/categories>>
        +GET /
        +POST /
        +PUT /{id}
        +DELETE /{id}
    }

    class TagController {
        <<RestController /api/tags>>
        +GET /
        +POST /
        +PUT /{id}
        +DELETE /{id}
    }

    AuthController ..> AuthService
    ResourceController ..> ResourceService
    ResourceController ..> FileService
    UserController ..> UserService
    SearchController ..> SearchService
    FileController ..> FileService
    CategoryController ..> CategoryService
    TagController ..> TagService
```

## Resource Status State Machine

```mermaid
stateDiagram-v2
    [*] --> DRAFT : Create
    DRAFT --> PENDING_REVIEW : Submit for Review
    PENDING_REVIEW --> APPROVED : Approve
    PENDING_REVIEW --> REJECTED : Reject
    REJECTED --> DRAFT : Revise
    APPROVED --> ARCHIVED : Archive
    APPROVED --> DRAFT : Unpublish
    ARCHIVED --> [*]
```
