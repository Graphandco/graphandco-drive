-- Suppression de is_shared (jamais utilisé en UI)
ALTER TABLE folders
  DROP INDEX idx_folders_shared,
  DROP COLUMN is_shared;

ALTER TABLE files
  DROP INDEX idx_files_shared,
  DROP COLUMN is_shared;
