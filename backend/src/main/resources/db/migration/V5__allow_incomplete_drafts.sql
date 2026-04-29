-- V5: Allow incomplete resource drafts
-- Draft resources may be saved before all metadata is complete.
-- Submission for review still validates title, category, and copyright declaration in ResourceService.

ALTER TABLE resources MODIFY title VARCHAR(255) NULL;
ALTER TABLE resources MODIFY category_id BINARY(16) NULL;
ALTER TABLE resources MODIFY copyright_declaration VARCHAR(1000) NULL;
