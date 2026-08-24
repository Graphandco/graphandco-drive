-- Miniatures Sharp (idempotent si la colonne existe déjà)
SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'files'
    AND COLUMN_NAME = 'thumbnail_key'
);

SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE files ADD COLUMN thumbnail_key VARCHAR(512) NULL AFTER storage_key',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
