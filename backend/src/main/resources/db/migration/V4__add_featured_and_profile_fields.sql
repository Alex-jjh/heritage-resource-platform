-- 1. Update the Users table: Add avatar, privacy settings, and bio.
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255);
ALTER TABLE users ADD COLUMN profile_public BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN show_email BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN bio TEXT;

-- 2. Update the Resources table: Add a featured status
ALTER TABLE resources ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE resources ADD COLUMN featured_status VARCHAR(50);

-- 3. Update the Comments table: Add an anonymous option
ALTER TABLE comments ADD COLUMN anonymous BOOLEAN DEFAULT FALSE;