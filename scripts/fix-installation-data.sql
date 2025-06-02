-- Script to fix malformed installation data in the servers table
-- Created as part of XOM-80: Data Quality Audit

-- Part 1: Fix install_code_blocks with array format issues
-- This converts string arrays like '["pip install x"]' to JSONB objects like '{"pip": "pip install x"}'
UPDATE servers
SET install_code_blocks = jsonb_build_object(
  'pip', jsonb_array_elements_text(install_code_blocks::jsonb)->>0
)
WHERE jsonb_typeof(install_code_blocks) = 'array';

-- Part 2: Create a function to normalize install_instructions
CREATE OR REPLACE FUNCTION normalize_install_instructions() RETURNS void AS $$
DECLARE
  server_record RECORD;
  normalized_instructions JSONB;
BEGIN
  -- Process servers with text-based install_instructions
  FOR server_record IN 
    SELECT id, name, install_instructions, install_code_blocks
    FROM servers
    WHERE install_instructions IS NOT NULL 
    AND install_instructions NOT LIKE '{%}'
  LOOP
    -- Create normalized install_instructions with platform-specific keys
    normalized_instructions = jsonb_build_object(
      'linux', 'Install ' || server_record.name || ' on Linux:' || E'\n\n' || 
        COALESCE(server_record.install_instructions, 'No specific installation instructions available.'),
      'macos', 'Install ' || server_record.name || ' on macOS:' || E'\n\n' || 
        COALESCE(server_record.install_instructions, 'No specific installation instructions available.'),
      'windows', 'Install ' || server_record.name || ' on Windows:' || E'\n\n' || 
        COALESCE(server_record.install_instructions, 'No specific installation instructions available.')
    );
    
    -- Update the server record with normalized instructions
    UPDATE servers
    SET install_instructions = normalized_instructions
    WHERE id = server_record.id;
  END LOOP;
  
  -- Process servers with JSON-like install_instructions
  FOR server_record IN 
    SELECT id, install_instructions
    FROM servers
    WHERE install_instructions LIKE '{%}'
  LOOP
    BEGIN
      -- Try to parse the JSON string and update as JSONB
      UPDATE servers
      SET install_instructions = install_instructions::jsonb
      WHERE id = server_record.id;
    EXCEPTION WHEN OTHERS THEN
      -- If parsing fails, create default structure
      normalized_instructions = jsonb_build_object(
        'linux', 'Install instructions could not be formatted correctly. Please check documentation.',
        'macos', 'Install instructions could not be formatted correctly. Please check documentation.',
        'windows', 'Install instructions could not be formatted correctly. Please check documentation.'
      );
      
      UPDATE servers
      SET install_instructions = normalized_instructions
      WHERE id = server_record.id;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to normalize install_instructions
SELECT normalize_install_instructions();

-- Part 3: Fix any empty install_code_blocks with default values
UPDATE servers
SET install_code_blocks = jsonb_build_object('pip', 'pip install ' || lower(regexp_replace(name, '[^a-zA-Z0-9]', '-', 'g')))
WHERE install_code_blocks IS NULL
AND install_instructions IS NOT NULL;

-- Part 4: Update the data type of install_instructions to JSONB for consistency
ALTER TABLE servers 
ALTER COLUMN install_instructions TYPE JSONB USING install_instructions::jsonb;

-- Part 5: Add documentation in the code
COMMENT ON COLUMN servers.install_instructions IS 'JSON object with platform-specific installation instructions. Expected format: {"linux": "...", "macos": "...", "windows": "..."}';
COMMENT ON COLUMN servers.install_code_blocks IS 'JSON object with language-specific installation commands. Expected format: {"pip": "pip install x", "npm": "npm install y"}';
