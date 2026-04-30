-- V6: Add task lock fields for review task allocation

-- Add lock fields to resources table
ALTER TABLE resources
    ADD COLUMN locked_by BINARY(16) NULL,
    ADD COLUMN locked_at TIMESTAMP(6) NULL,
    ADD COLUMN review_priority INT NOT NULL DEFAULT 0,
    ADD CONSTRAINT fk_resources_locked_by FOREIGN KEY (locked_by) REFERENCES users(id);

-- Create index for efficient task pool queries
CREATE INDEX idx_resources_status_priority_created
    ON resources(status, review_priority DESC, created_at ASC);

CREATE INDEX idx_resources_locked_by
    ON resources(locked_by);
