-- Espace Régis (bucket NAS Unraid)
ALTER TABLE folders
  MODIFY COLUMN space ENUM('sixmyk', 'public', 'regis') NOT NULL DEFAULT 'sixmyk';

ALTER TABLE files
  MODIFY COLUMN space ENUM('sixmyk', 'public', 'regis') NOT NULL DEFAULT 'sixmyk';

INSERT INTO folders (id, parent_id, space, name)
SELECT 3, NULL, 'regis', CONVERT(UNHEX('52C3A9676973') USING utf8mb4)
WHERE NOT EXISTS (SELECT 1 FROM folders WHERE id = 3);

-- Corrige un éventuel double-encodage (RÃ©gis → Régis)
UPDATE folders
SET name = CONVERT(UNHEX('52C3A9676973') USING utf8mb4)
WHERE id = 3
  AND space = 'regis';
