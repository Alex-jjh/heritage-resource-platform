-- V4: Add user profile, featured resource, and anonymous comment fields
-- Support public contributor profiles, homepage featured resources, and anonymous comments

-- Add user profile customization fields
-- avatar_url stores an optional user avatar image URL
-- profile_public controls whether other users can open the contributor profile page
-- show_email controls whether the email is shown on the public profile
-- bio stores an optional short public profile description
ALTER TABLE users
    ADD COLUMN avatar_url VARCHAR(2048) NULL,
    ADD COLUMN profile_public BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN show_email BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN bio TEXT NULL;

-- Add featured resource fields
-- is_featured marks resources that should be prioritized on the homepage
-- featured_status tracks the featured application state: NONE, PENDING, APPROVED, REJECTED
ALTER TABLE resources
    ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN featured_status VARCHAR(20) NOT NULL DEFAULT 'NONE';

-- Add anonymous comment field
-- anonymous controls whether a comment hides the author's public identity
ALTER TABLE comments
    ADD COLUMN anonymous BOOLEAN NOT NULL DEFAULT FALSE;