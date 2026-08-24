-- Liaison many-to-many fichiers ↔ dossiers (arborescence app-only)
CREATE TABLE IF NOT EXISTS file_folders (
  file_id BIGINT UNSIGNED NOT NULL,
  folder_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (file_id, folder_id),
  KEY idx_file_folders_folder (folder_id),
  CONSTRAINT fk_file_folders_file
    FOREIGN KEY (file_id) REFERENCES files (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_file_folders_folder
    FOREIGN KEY (folder_id) REFERENCES folders (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Backfill depuis files.folder_id (médiathèque vierge → no-op)
INSERT IGNORE INTO file_folders (file_id, folder_id)
SELECT id, folder_id
FROM files
WHERE folder_id IS NOT NULL;
