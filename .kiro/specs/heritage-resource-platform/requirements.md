# Requirements Document

## Introduction

A web-based community heritage resource sharing and curation platform that enables contributors to submit cultural heritage resources (images, stories, traditions, places, objects, educational materials) for review and publication. Administrators and reviewers moderate submissions before they become publicly visible. Registered users can browse, search, and interact with approved entries. The platform is built on Java 21 + Spring Boot 3.x with MySQL, AWS Cognito for authentication, and Amazon S3 for file storage.

## Glossary

- **Platform**: The Community Heritage Resource Sharing and Curation Platform web application
- **Administrator**: A user with full system privileges including user management, content moderation, and master data management
- **Reviewer**: A user authorized to approve or reject submitted resources
- **Contributor**: A registered user who has been approved by an Administrator to submit heritage resources
- **Registered_Viewer**: A registered user who can browse, search, and view approved resources and leave comments
- **Resource**: A heritage entry consisting of metadata (title, category, place, description, tags, copyright declaration) and optional file attachments or external links
- **Resource_Status**: The lifecycle state of a Resource, one of: Draft, Pending_Review, Approved, Rejected, or Archived
- **Category**: A classification label managed by Administrators used to organize Resources by topic (e.g., places, traditions, stories, objects, educational materials)
- **Tag**: A keyword managed by Administrators used to further describe and discover Resources
- **Cognito_Token**: A JSON Web Token (JWT) issued by AWS Cognito upon successful authentication
- **Pre_Signed_URL**: A time-limited Amazon S3 URL that grants temporary permission to upload or download a file
- **Auth_Service**: The authentication and authorization subsystem backed by AWS Cognito
- **Resource_Service**: The backend subsystem responsible for Resource CRUD operations and status transitions
- **Review_Service**: The backend subsystem responsible for the review workflow including approval and rejection
- **Search_Service**: The backend subsystem responsible for browsing, searching, and filtering approved Resources
- **File_Service**: The backend subsystem responsible for generating Pre_Signed_URLs and managing file references in Amazon S3

## Requirements

### Requirement 1: User Registration and Authentication

**User Story:** As a visitor, I want to register an account and authenticate, so that I can access the platform features appropriate to my role.

#### Acceptance Criteria

1. WHEN a visitor submits a valid registration form, THE Auth_Service SHALL create a new user account with the Registered_Viewer role in AWS Cognito and return a confirmation response within 3 seconds
2. WHEN a registered user submits valid login credentials, THE Auth_Service SHALL issue a Cognito_Token and return it to the client
3. WHEN a registered user requests logout, THE Auth_Service SHALL invalidate the current session and revoke the Cognito_Token
4. IF a visitor submits a registration form with an email that already exists, THEN THE Auth_Service SHALL return an error indicating the email is already registered
5. IF a user submits invalid login credentials, THEN THE Auth_Service SHALL return an authentication error without revealing whether the email or password was incorrect
6. WHEN a request is received without a valid Cognito_Token, THE Platform SHALL reject the request with a 401 Unauthorized status code

### Requirement 2: User Profile Management

**User Story:** As a registered user, I want to maintain my profile information, so that my account details remain accurate.

#### Acceptance Criteria

1. WHEN a registered user requests their profile, THE Auth_Service SHALL return the user profile including display name, email, and assigned role
2. WHEN a registered user submits updated profile information, THE Auth_Service SHALL persist the changes and return the updated profile
3. IF a registered user submits a profile update with invalid data, THEN THE Auth_Service SHALL return a validation error describing each invalid field

### Requirement 3: Contributor Approval

**User Story:** As an Administrator, I want to approve registered users as Contributors, so that only vetted users can submit heritage resources.

#### Acceptance Criteria

1. WHEN an Administrator grants Contributor status to a Registered_Viewer, THE Auth_Service SHALL update the user role to Contributor and notify the user
2. WHEN an Administrator revokes Contributor status from a Contributor, THE Auth_Service SHALL update the user role back to Registered_Viewer
3. THE Platform SHALL restrict resource submission endpoints to users with the Contributor role
4. WHEN an Administrator requests a list of users pending Contributor approval, THE Auth_Service SHALL return all Registered_Viewers who have requested Contributor status

### Requirement 4: Resource Creation and Editing

**User Story:** As a Contributor, I want to create and edit heritage resource entries with metadata and file attachments, so that I can share cultural heritage content with the community.

#### Acceptance Criteria

1. WHEN a Contributor submits a new Resource with valid metadata (title, category, place, description, tags, and copyright declaration), THE Resource_Service SHALL create the Resource with Resource_Status set to Draft and return the created Resource
2. WHEN a Contributor updates an existing Draft Resource with valid metadata, THE Resource_Service SHALL persist the changes and return the updated Resource
3. IF a Contributor submits a Resource with missing required fields (title, category, or copyright declaration), THEN THE Resource_Service SHALL return a validation error listing each missing field
4. WHEN a Contributor requests a file upload for a Resource, THE File_Service SHALL generate a Pre_Signed_URL for Amazon S3 with a validity period of 15 minutes
5. WHEN a Contributor attaches an external link to a Resource, THE Resource_Service SHALL validate the URL format and store the link reference
6. THE Resource_Service SHALL allow a Resource to contain one or more file attachments, one or more external links, or a combination of both
7. WHILE a Resource has Resource_Status of Draft, THE Resource_Service SHALL allow the owning Contributor to edit the Resource metadata and attachments
8. WHILE a Resource has Resource_Status of Draft, THE Resource_Service SHALL allow the owning Contributor to permanently delete the Resource and its associated file references

### Requirement 5: Resource Submission for Review

**User Story:** As a Contributor, I want to submit my draft resources for review, so that they can be evaluated and published.

#### Acceptance Criteria

1. WHEN a Contributor submits a Draft Resource for review, THE Resource_Service SHALL change the Resource_Status from Draft to Pending_Review
2. IF a Contributor attempts to submit a Resource that is missing required metadata (title, category, or copyright declaration), THEN THE Resource_Service SHALL reject the submission and return a validation error
3. WHILE a Resource has Resource_Status of Pending_Review, THE Resource_Service SHALL prevent the owning Contributor from editing the Resource
4. WHEN a Contributor requests a list of their submitted Resources, THE Resource_Service SHALL return all Resources owned by that Contributor with their current Resource_Status

### Requirement 6: Resource Review and Publication

**User Story:** As a Reviewer, I want to review submitted resources and approve or reject them with feedback, so that only quality content is published.

#### Acceptance Criteria

1. WHEN a Reviewer requests the review queue, THE Review_Service SHALL return all Resources with Resource_Status of Pending_Review ordered by submission date ascending
2. WHEN a Reviewer approves a Pending_Review Resource, THE Review_Service SHALL change the Resource_Status to Approved and record the Reviewer identity and approval timestamp
3. WHEN a Reviewer rejects a Pending_Review Resource with feedback comments, THE Review_Service SHALL change the Resource_Status to Rejected and store the feedback comments linked to the Resource
4. IF a Reviewer attempts to approve or reject a Resource that is not in Pending_Review status, THEN THE Review_Service SHALL return an error indicating the invalid status transition
5. THE Review_Service SHALL require feedback comments when rejecting a Resource

### Requirement 7: Resource Revision and Resubmission

**User Story:** As a Contributor, I want to revise and resubmit rejected resources, so that I can address reviewer feedback and get my content published.

#### Acceptance Criteria

1. WHEN a Contributor requests to revise a Rejected Resource, THE Resource_Service SHALL change the Resource_Status from Rejected to Draft
2. WHILE a Resource has Resource_Status of Rejected, THE Resource_Service SHALL display the reviewer feedback comments to the owning Contributor
3. WHEN a Contributor resubmits a revised Resource, THE Resource_Service SHALL change the Resource_Status from Draft to Pending_Review and preserve the revision history

### Requirement 8: Resource Discovery and Browsing

**User Story:** As a Registered_Viewer, I want to browse and search approved heritage resources, so that I can discover cultural heritage content.

#### Acceptance Criteria

1. WHEN a user requests the resource listing, THE Search_Service SHALL return only Resources with Resource_Status of Approved
2. WHEN a user searches with a text query, THE Search_Service SHALL return Approved Resources where the title, description, or tags match the query
3. WHEN a user filters by Category, THE Search_Service SHALL return only Approved Resources belonging to the specified Category
4. WHEN a user filters by Tag, THE Search_Service SHALL return only Approved Resources associated with the specified Tag
5. WHEN a user applies multiple filters simultaneously, THE Search_Service SHALL return only Approved Resources matching all specified filter criteria
6. THE Search_Service SHALL return search results in a paginated format with a configurable page size defaulting to 20 items per page
7. THE Search_Service SHALL exclude Resources with Resource_Status of Archived from all query results

### Requirement 9: Resource Detail View

**User Story:** As a Registered_Viewer, I want to view the full details of an approved resource, so that I can learn about the heritage content.

#### Acceptance Criteria

1. WHEN a user requests a specific Approved Resource by identifier, THE Resource_Service SHALL return the complete Resource metadata including title, category, place, description, tags, copyright declaration, contributor name, and approval date
2. WHEN a Resource includes file attachments, THE File_Service SHALL generate read-only Pre_Signed_URLs for each attachment with a validity period of 60 minutes
3. IF a user requests a Resource that does not have Resource_Status of Approved, THEN THE Resource_Service SHALL return a 404 Not Found response to non-Administrator users

### Requirement 10: Resource Commenting

**User Story:** As a Registered_Viewer, I want to leave comments on approved resources, so that I can provide feedback and engage with the community.

#### Acceptance Criteria

1. WHEN a Registered_Viewer submits a comment on an Approved Resource, THE Resource_Service SHALL store the comment with the author identity and timestamp and return the created comment
2. WHEN a user requests comments for an Approved Resource, THE Resource_Service SHALL return comments for that Resource in a paginated format ordered by creation timestamp descending
3. IF a user attempts to comment on a Resource that is not Approved, THEN THE Resource_Service SHALL reject the comment and return an error
4. IF a Registered_Viewer submits an empty comment, THEN THE Resource_Service SHALL return a validation error

### Requirement 11: Category and Tag Management

**User Story:** As an Administrator, I want to manage categories and tags, so that resources are organized consistently.

#### Acceptance Criteria

1. WHEN an Administrator creates a new Category with a unique name, THE Platform SHALL persist the Category and return the created Category
2. WHEN an Administrator updates an existing Category name, THE Platform SHALL persist the change and update all associated Resource references
3. WHEN an Administrator creates a new Tag with a unique name, THE Platform SHALL persist the Tag and return the created Tag
4. IF an Administrator attempts to create a Category or Tag with a name that already exists, THEN THE Platform SHALL return a duplicate error
5. THE Platform SHALL prevent deletion of a Category or Tag that is currently associated with one or more Resources

### Requirement 12: Resource Archival and Unpublishing

**User Story:** As an Administrator, I want to archive or unpublish resources, so that outdated or inappropriate content is hidden from general users.

#### Acceptance Criteria

1. WHEN an Administrator archives an Approved Resource, THE Resource_Service SHALL change the Resource_Status to Archived and record the archive timestamp
2. WHEN an Administrator unpublishes a Resource by changing its status from Approved to Draft, THE Resource_Service SHALL update the Resource_Status and notify the owning Contributor
3. WHILE a Resource has Resource_Status of Archived, THE Search_Service SHALL exclude the Resource from all public query results
4. WHEN an Administrator requests a list of Archived Resources, THE Resource_Service SHALL return all Resources with Resource_Status of Archived

### Requirement 13: Role-Based Access Control

**User Story:** As the Platform, I want to enforce role-based access control on all API endpoints, so that users can only perform actions permitted by their role.

#### Acceptance Criteria

1. THE Platform SHALL validate the Cognito_Token on every authenticated API request and extract the user role from the token claims
2. THE Platform SHALL restrict Administrator endpoints (user management, category/tag management, archival) to users with the Administrator role
3. THE Platform SHALL restrict Reviewer endpoints (review queue, approve, reject) to users with the Reviewer or Administrator role
4. THE Platform SHALL restrict resource submission and editing endpoints to users with the Contributor role
5. IF a user attempts to access an endpoint without the required role, THEN THE Platform SHALL return a 403 Forbidden response
6. WHEN the Platform is running with the local Spring profile, THE Auth_Service SHALL support a mocked authentication mechanism (e.g., bypassing Cognito validation using Spring Security @WithMockUser or accepting a dummy Bearer token) to enable offline development and API testing

### Requirement 14: File Storage Integration

**User Story:** As a Contributor, I want to upload files directly to cloud storage, so that large files are handled efficiently without passing through the backend.

#### Acceptance Criteria

1. WHEN a Contributor requests a file upload URL, THE File_Service SHALL generate a Pre_Signed_URL for Amazon S3 scoped to the specific Resource and file name
2. THE File_Service SHALL enforce a maximum file size of 50 MB per upload via the Pre_Signed_URL policy
3. WHEN a file upload completes, THE Resource_Service SHALL store the S3 object key as a file reference on the Resource
4. IF the File_Service fails to generate a Pre_Signed_URL due to an S3 connectivity error, THEN THE File_Service SHALL return a 503 Service Unavailable response with a retry-after header
5. THE File_Service SHALL support local development using LocalStack S3 when the local Spring Boot profile is active

### Requirement 15: Resource Status Transition Integrity

**User Story:** As the Platform, I want to enforce valid resource status transitions, so that the review workflow remains consistent.

#### Acceptance Criteria

1. THE Resource_Service SHALL allow only the following Resource_Status transitions: Draft to Pending_Review, Pending_Review to Approved, Pending_Review to Rejected, Rejected to Draft, Approved to Archived, and Approved to Draft
2. IF a request attempts an invalid Resource_Status transition, THEN THE Resource_Service SHALL reject the request and return an error describing the allowed transitions from the current status
3. THE Resource_Service SHALL record the actor identity, previous status, new status, and timestamp for every Resource_Status transition

### Requirement 16: Asynchronous Media Processing

**User Story:** As the Platform, I want to automatically process uploaded media files asynchronously, so that the web interface remains fast and optimized thumbnails are generated.

#### Acceptance Criteria

1. WHEN a Contributor successfully uploads an image file to Amazon S3 via the Pre_Signed_URL, THE Platform SHALL trigger an asynchronous AWS Lambda function
2. THE Lambda function SHALL generate a web-optimized thumbnail of the uploaded image and store it in a designated S3 prefix
3. THE Resource_Service SHALL update the Resource metadata with the thumbnail file reference once processing is complete
