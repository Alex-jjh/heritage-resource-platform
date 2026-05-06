-- V7: Seed the approved Shibuya Crossing resource for the KULUXY account.
-- Password hash is for the existing demo password "DemoPass123".

INSERT IGNORE INTO users (
    id,
    cognito_sub,
    email,
    password_hash,
    display_name,
    role,
    contributor_requested,
    created_at,
    updated_at
)
VALUES (
    UNHEX(REPLACE('a0000005-0000-0000-0000-000000000005', '-', '')),
    NULL,
    'kuluxy@126.com',
    '$2a$10$JUqIqBD18gflw2QIR9NdReLgBGa8W83hLi6rTTVMr8cKFXrntd392',
    'KULUXY',
    'ADMINISTRATOR',
    FALSE,
    NOW(6),
    NOW(6)
);

UPDATE users
SET display_name = 'KULUXY',
    role = 'ADMINISTRATOR',
    contributor_requested = FALSE,
    updated_at = NOW(6)
WHERE email = 'kuluxy@126.com';

INSERT IGNORE INTO categories (id, name, created_at)
VALUES (
    UNHEX(REPLACE('c0000010-0000-0000-0000-000000000010', '-', '')),
    'Modern Heritage',
    NOW(6)
);

INSERT IGNORE INTO tags (id, name, created_at)
VALUES (
    UNHEX(REPLACE('d0000010-0000-0000-0000-000000000010', '-', '')),
    'Urban',
    NOW(6)
);

INSERT INTO resources (
    id,
    contributor_id,
    title,
    category_id,
    place,
    description,
    copyright_declaration,
    status,
    thumbnail_s3_key,
    created_at,
    updated_at,
    approved_at,
    archived_at,
    is_featured,
    featured_status,
    review_priority
)
SELECT
    UNHEX(REPLACE('b0000007-0000-0000-0000-000000000007', '-', '')),
    u.id,
    'Shibuya Crossing',
    c.id,
    'Tokyo, Japan',
    'An aerial study of the world''s busiest intersection, a living archive of post-war urbanism, ritual, and the choreography of the everyday.',
    'Educational and archival use. Contributor confirms source permission or public-domain eligibility for submitted descriptive metadata.',
    'APPROVED',
    NULL,
    TIMESTAMP('2026-05-06 00:00:00.000000'),
    TIMESTAMP('2026-05-06 00:00:00.000000'),
    TIMESTAMP('2026-05-06 00:00:00.000000'),
    NULL,
    TRUE,
    'APPROVED',
    0
FROM users u
JOIN categories c ON c.name = 'Modern Heritage'
WHERE u.email = 'kuluxy@126.com'
  AND NOT EXISTS (
      SELECT 1
      FROM resources existing
      WHERE existing.title = 'Shibuya Crossing'
        AND existing.contributor_id = u.id
  );

INSERT IGNORE INTO resource_tags (resource_id, tag_id)
SELECT r.id, t.id
FROM resources r
JOIN users u ON u.id = r.contributor_id
JOIN tags t ON t.name IN ('Urban', 'Asia')
WHERE r.title = 'Shibuya Crossing'
  AND u.email = 'kuluxy@126.com';

INSERT INTO status_transitions (
    id,
    resource_id,
    actor_id,
    from_status,
    to_status,
    transitioned_at
)
SELECT
    UNHEX(REPLACE('e0000007-0000-0000-0000-000000000701', '-', '')),
    r.id,
    u.id,
    'PENDING_REVIEW',
    'APPROVED',
    TIMESTAMP('2026-05-06 00:00:00.000000')
FROM resources r
JOIN users u ON u.email = 'kuluxy@126.com'
WHERE r.title = 'Shibuya Crossing'
  AND r.contributor_id = u.id
  AND NOT EXISTS (
      SELECT 1
      FROM status_transitions existing
      WHERE existing.resource_id = r.id
        AND existing.to_status = 'APPROVED'
  );

INSERT INTO review_feedback (
    id,
    resource_id,
    reviewer_id,
    comments,
    decision,
    created_at
)
SELECT
    UNHEX(REPLACE('f0000007-0000-0000-0000-000000000701', '-', '')),
    r.id,
    u.id,
    'Approved',
    'APPROVED',
    TIMESTAMP('2026-05-06 00:00:00.000000')
FROM resources r
JOIN users u ON u.email = 'kuluxy@126.com'
WHERE r.title = 'Shibuya Crossing'
  AND r.contributor_id = u.id
  AND NOT EXISTS (
      SELECT 1
      FROM review_feedback existing
      WHERE existing.resource_id = r.id
        AND existing.decision = 'APPROVED'
  );
