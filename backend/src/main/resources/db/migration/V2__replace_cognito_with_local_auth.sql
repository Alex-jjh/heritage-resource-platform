-- V2: Replace Cognito authentication with local JWT auth
-- Add password_hash column for bcrypt-hashed passwords
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL;

-- Make cognito_sub nullable (can't drop yet — Hibernate still maps it)
ALTER TABLE users MODIFY COLUMN cognito_sub VARCHAR(255) NULL;
