-- V3: Seed categories, tags, and sample user accounts
-- bcrypt hash for 'DemoPass123' (cost factor 10)
-- Generated via BCryptPasswordEncoder.encode("DemoPass123")

-- ============================================================
-- Sample Users (4 roles)
-- ============================================================
INSERT IGNORE INTO users (id, cognito_sub, email, password_hash, display_name, role, contributor_requested, created_at, updated_at)
VALUES
  (UNHEX(REPLACE('a0000001-0000-0000-0000-000000000001', '-', '')), NULL, 'viewer@heritage.demo',
   '$2a$10$JUqIqBD18gflw2QIR9NdReLgBGa8W83hLi6rTTVMr8cKFXrntd392',
   'Demo Viewer', 'REGISTERED_VIEWER', FALSE, NOW(), NOW()),

  (UNHEX(REPLACE('a0000002-0000-0000-0000-000000000002', '-', '')), NULL, 'contributor@heritage.demo',
   '$2a$10$JUqIqBD18gflw2QIR9NdReLgBGa8W83hLi6rTTVMr8cKFXrntd392',
   'Demo Contributor', 'CONTRIBUTOR', FALSE, NOW(), NOW()),

  (UNHEX(REPLACE('a0000003-0000-0000-0000-000000000003', '-', '')), NULL, 'reviewer@heritage.demo',
   '$2a$10$JUqIqBD18gflw2QIR9NdReLgBGa8W83hLi6rTTVMr8cKFXrntd392',
   'Demo Reviewer', 'REVIEWER', FALSE, NOW(), NOW()),

  (UNHEX(REPLACE('a0000004-0000-0000-0000-000000000004', '-', '')), NULL, 'admin@heritage.demo',
   '$2a$10$JUqIqBD18gflw2QIR9NdReLgBGa8W83hLi6rTTVMr8cKFXrntd392',
   'Demo Admin', 'ADMINISTRATOR', FALSE, NOW(), NOW());

-- ============================================================
-- Categories
-- ============================================================
INSERT IGNORE INTO categories (id, name, created_at) VALUES
  (UNHEX(REPLACE('c0000001-0000-0000-0000-000000000001', '-', '')), 'Historical Sites', NOW()),
  (UNHEX(REPLACE('c0000002-0000-0000-0000-000000000002', '-', '')), 'Traditional Crafts', NOW()),
  (UNHEX(REPLACE('c0000003-0000-0000-0000-000000000003', '-', '')), 'Oral Traditions', NOW()),
  (UNHEX(REPLACE('c0000004-0000-0000-0000-000000000004', '-', '')), 'Festivals & Ceremonies', NOW()),
  (UNHEX(REPLACE('c0000005-0000-0000-0000-000000000005', '-', '')), 'Traditional Music & Dance', NOW()),
  (UNHEX(REPLACE('c0000006-0000-0000-0000-000000000006', '-', '')), 'Architecture', NOW()),
  (UNHEX(REPLACE('c0000007-0000-0000-0000-000000000007', '-', '')), 'Cuisine & Food Culture', NOW()),
  (UNHEX(REPLACE('c0000008-0000-0000-0000-000000000008', '-', '')), 'Religious Heritage', NOW()),
  (UNHEX(REPLACE('c0000009-0000-0000-0000-000000000009', '-', '')), 'Natural Heritage', NOW()),
  (UNHEX(REPLACE('c000000a-0000-0000-0000-00000000000a', '-', '')), 'Educational Materials', NOW());

-- ============================================================
-- Tags
-- ============================================================
INSERT IGNORE INTO tags (id, name, created_at) VALUES
  (UNHEX(REPLACE('d0000001-0000-0000-0000-000000000001', '-', '')), 'UNESCO', NOW()),
  (UNHEX(REPLACE('d0000002-0000-0000-0000-000000000002', '-', '')), 'Endangered', NOW()),
  (UNHEX(REPLACE('d0000003-0000-0000-0000-000000000003', '-', '')), 'Asia', NOW()),
  (UNHEX(REPLACE('d0000004-0000-0000-0000-000000000004', '-', '')), 'Europe', NOW()),
  (UNHEX(REPLACE('d0000005-0000-0000-0000-000000000005', '-', '')), 'Africa', NOW()),
  (UNHEX(REPLACE('d0000006-0000-0000-0000-000000000006', '-', '')), 'Americas', NOW()),
  (UNHEX(REPLACE('d0000007-0000-0000-0000-000000000007', '-', '')), 'Indigenous', NOW()),
  (UNHEX(REPLACE('d0000008-0000-0000-0000-000000000008', '-', '')), 'Medieval', NOW()),
  (UNHEX(REPLACE('d0000009-0000-0000-0000-000000000009', '-', '')), 'Ancient', NOW()),
  (UNHEX(REPLACE('d000000a-0000-0000-0000-00000000000a', '-', '')), 'Modern Heritage', NOW()),
  (UNHEX(REPLACE('d000000b-0000-0000-0000-00000000000b', '-', '')), 'Intangible', NOW()),
  (UNHEX(REPLACE('d000000c-0000-0000-0000-00000000000c', '-', '')), 'Photography', NOW()),
  (UNHEX(REPLACE('d000000d-0000-0000-0000-00000000000d', '-', '')), 'Documentary', NOW()),
  (UNHEX(REPLACE('d000000e-0000-0000-0000-00000000000e', '-', '')), 'Community Project', NOW()),
  (UNHEX(REPLACE('d000000f-0000-0000-0000-00000000000f', '-', '')), 'Restoration', NOW());
