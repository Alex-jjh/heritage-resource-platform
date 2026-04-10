-- Insert test resources for task allocation testing
USE heritage;

-- Get a contributor user ID
SET @contributor_id = UNHEX(REPLACE('a0000002-0000-0000-0000-000000000002', '-', ''));
SET @category_id = UNHEX(REPLACE('c0000001-0000-0000-0000-000000000001', '-', ''));

-- Insert 3 pending review resources with different priorities
INSERT INTO resources (id, contributor_id, title, category_id, place, description, copyright_declaration, status, review_priority, created_at, updated_at)
VALUES 
  (UNHEX(REPLACE('f0000001-0000-0000-0000-000000000001', '-', '')), @contributor_id, 'High Priority Heritage Site', @category_id, 'Beijing', 'A very important site', 'Public Domain', 'PENDING_REVIEW', 10, NOW(), NOW()),
  (UNHEX(REPLACE('f0000002-0000-0000-0000-000000000002', '-', '')), @contributor_id, 'Medium Priority Craft', @category_id, 'Shanghai', 'Traditional craft documentation', 'CC-BY', 'PENDING_REVIEW', 5, DATE_SUB(NOW(), INTERVAL 1 HOUR), DATE_SUB(NOW(), INTERVAL 1 HOUR)),
  (UNHEX(REPLACE('f0000003-0000-0000-0000-000000000003', '-', '')), @contributor_id, 'Low Priority Festival', @category_id, 'Guangzhou', 'Local festival records', 'Public Domain', 'PENDING_REVIEW', 1, DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_SUB(NOW(), INTERVAL 2 HOUR));

SELECT 'Inserted 3 test resources' as result;
