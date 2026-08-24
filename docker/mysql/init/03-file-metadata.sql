-- Métadonnées fichiers (tags, date de prise)
SET @col_tags := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'files'
    AND COLUMN_NAME = 'tags'
);

SET @sql_tags := IF(
  @col_tags = 0,
  'ALTER TABLE files ADD COLUMN tags VARCHAR(512) NULL AFTER thumbnail_key',
  'SELECT 1'
);

PREPARE stmt FROM @sql_tags;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_captured := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'files'
    AND COLUMN_NAME = 'captured_at'
);

SET @sql_captured := IF(
  @col_captured = 0,
  'ALTER TABLE files ADD COLUMN captured_at DATETIME NULL AFTER tags',
  'SELECT 1'
);

PREPARE stmt FROM @sql_captured;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
