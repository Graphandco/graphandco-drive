CREATE TABLE IF NOT EXISTS smart_folders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  space ENUM('sixmyk', 'public', 'regis') NOT NULL,
  name VARCHAR(255) NOT NULL,
  tag VARCHAR(100) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_smart_folder_space_tag (space, tag)
);
