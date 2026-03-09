-- Heritage Resource Platform - Initial Schema

CREATE TABLE users (
    id BINARY(16) NOT NULL PRIMARY KEY,
    cognito_sub VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    contributor_requested BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP(6) NULL,
    updated_at TIMESTAMP(6) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE categories (
    id BINARY(16) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP(6) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tags (
    id BINARY(16) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP(6) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE resources (
    id BINARY(16) NOT NULL PRIMARY KEY,
    contributor_id BINARY(16) NOT NULL,
    title VARCHAR(255) NOT NULL,
    category_id BINARY(16) NOT NULL,
    place VARCHAR(255) NULL,
    description TEXT NULL,
    copyright_declaration VARCHAR(1000) NOT NULL,
    status VARCHAR(50) NOT NULL,
    thumbnail_s3_key VARCHAR(500) NULL,
    created_at TIMESTAMP(6) NULL,
    updated_at TIMESTAMP(6) NULL,
    approved_at TIMESTAMP(6) NULL,
    archived_at TIMESTAMP(6) NULL,
    CONSTRAINT fk_resources_contributor FOREIGN KEY (contributor_id) REFERENCES users(id),
    CONSTRAINT fk_resources_category FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE resource_tags (
    resource_id BINARY(16) NOT NULL,
    tag_id BINARY(16) NOT NULL,
    PRIMARY KEY (resource_id, tag_id),
    CONSTRAINT fk_resource_tags_resource FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
    CONSTRAINT fk_resource_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE file_references (
    id BINARY(16) NOT NULL PRIMARY KEY,
    resource_id BINARY(16) NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NULL,
    file_size BIGINT NULL,
    created_at TIMESTAMP(6) NULL,
    CONSTRAINT fk_file_references_resource FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE external_links (
    id BINARY(16) NOT NULL PRIMARY KEY,
    resource_id BINARY(16) NOT NULL,
    url VARCHAR(2000) NOT NULL,
    label VARCHAR(255) NULL,
    created_at TIMESTAMP(6) NULL,
    CONSTRAINT fk_external_links_resource FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE comments (
    id BINARY(16) NOT NULL PRIMARY KEY,
    resource_id BINARY(16) NOT NULL,
    author_id BINARY(16) NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP(6) NULL,
    CONSTRAINT fk_comments_resource FOREIGN KEY (resource_id) REFERENCES resources(id),
    CONSTRAINT fk_comments_author FOREIGN KEY (author_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE status_transitions (
    id BINARY(16) NOT NULL PRIMARY KEY,
    resource_id BINARY(16) NOT NULL,
    actor_id BINARY(16) NOT NULL,
    from_status VARCHAR(50) NOT NULL,
    to_status VARCHAR(50) NOT NULL,
    transitioned_at TIMESTAMP(6) NULL,
    CONSTRAINT fk_status_transitions_resource FOREIGN KEY (resource_id) REFERENCES resources(id),
    CONSTRAINT fk_status_transitions_actor FOREIGN KEY (actor_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE review_feedback (
    id BINARY(16) NOT NULL PRIMARY KEY,
    resource_id BINARY(16) NOT NULL,
    reviewer_id BINARY(16) NOT NULL,
    comments TEXT NOT NULL,
    decision VARCHAR(50) NOT NULL,
    created_at TIMESTAMP(6) NULL,
    CONSTRAINT fk_review_feedback_resource FOREIGN KEY (resource_id) REFERENCES resources(id),
    CONSTRAINT fk_review_feedback_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes on frequently queried columns
CREATE INDEX idx_resources_status ON resources(status);
CREATE INDEX idx_resources_contributor_id ON resources(contributor_id);
CREATE INDEX idx_resources_category_id ON resources(category_id);
CREATE INDEX idx_comments_resource_id ON comments(resource_id);
CREATE INDEX idx_file_references_resource_id ON file_references(resource_id);
CREATE INDEX idx_status_transitions_resource_id ON status_transitions(resource_id);
CREATE INDEX idx_review_feedback_resource_id ON review_feedback(resource_id);
