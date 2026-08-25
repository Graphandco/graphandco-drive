-- Favoris par fichier (scopés par space via files.space)
SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'files'
    AND COLUMN_NAME = 'is_favorite'
);

SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE files ADD COLUMN is_favorite TINYINT(1) NOT NULL DEFAULT 0 AFTER tags, ADD KEY idx_files_favorite (space, is_favorite)',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
