-- Dimensions originales des images (masonry)
SET @col_width := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'files'
    AND COLUMN_NAME = 'width_px'
);

SET @sql_width := IF(
  @col_width = 0,
  'ALTER TABLE files ADD COLUMN width_px INT UNSIGNED NULL AFTER captured_at',
  'SELECT 1'
);

PREPARE stmt FROM @sql_width;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_height := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'files'
    AND COLUMN_NAME = 'height_px'
);

SET @sql_height := IF(
  @col_height = 0,
  'ALTER TABLE files ADD COLUMN height_px INT UNSIGNED NULL AFTER width_px',
  'SELECT 1'
);

PREPARE stmt FROM @sql_height;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
