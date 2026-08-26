-- Schéma Graph & Photos
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS files;
DROP TABLE IF EXISTS folders;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE folders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_id BIGINT UNSIGNED NULL,
  space ENUM('sixmyk', 'public', 'regis') NOT NULL DEFAULT 'sixmyk',
  name VARCHAR(255) NOT NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_folders_parent (parent_id),
  KEY idx_folders_space (space),
  KEY idx_folders_deleted (deleted_at),
  CONSTRAINT fk_folders_parent
    FOREIGN KEY (parent_id) REFERENCES folders (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE files (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  folder_id BIGINT UNSIGNED NULL,
  space ENUM('sixmyk', 'public', 'regis') NOT NULL DEFAULT 'sixmyk',
  name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(128) NULL,
  size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  storage_location VARCHAR(64) NOT NULL DEFAULT 'sixmyk',
  storage_key VARCHAR(512) NULL,
  thumbnail_key VARCHAR(512) NULL,
  tags VARCHAR(512) NULL,
  captured_at DATETIME NULL,
  width_px INT UNSIGNED NULL,
  height_px INT UNSIGNED NULL,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_files_folder (folder_id),
  KEY idx_files_space (space),
  KEY idx_files_deleted (deleted_at),
  CONSTRAINT fk_files_folder
    FOREIGN KEY (folder_id) REFERENCES folders (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE file_folders (
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

-- Racines stables : 1 = Six-MyK, 2 = Public, 3 = Régis (NAS)
INSERT INTO folders (id, parent_id, space, name) VALUES
  (1, NULL, 'sixmyk', 'Six-MyK'),
  (2, NULL, 'public', 'Public'),
  (3, NULL, 'regis', CONVERT(UNHEX('52C3A9676973') USING utf8mb4));
