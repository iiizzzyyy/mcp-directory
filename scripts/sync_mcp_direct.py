#!/usr/bin/env python3
"""
MCP Server Sync Script Using Supabase MCP API

This script synchronizes MCP server data with our database using
the Supabase MCP API directly, eliminating the need for service role keys.

Features:
- Updates server data in the database
- Adds platform-specific installation instructions
- Enhances API documentation with structured data
- Provides detailed statistics on sync operations
"""

import json
import os
import subprocess
import sys
import time
from typing import Dict, Any, List, Optional

# Project constants
PROJECT_ID = "nryytfezkmptcmpawlva"
TABLE_NAMES = ["servers", "server_install_instructions"]

def print_header():
    """Print a stylish header for the script."""
    print("\n" + "="*60)
    print("🔄  MCP SERVER SYNC OPERATION")
    print("    Using Supabase MCP API")
    print("="*60 + "\n")

def run_mcp_command(command_args: List[str]) -> Dict[str, Any]:
    """
    Run a Supabase MCP command and return the results.
    
    Args:
        command_args: List of command line arguments
        
    Returns:
        Dict containing the command output or error
    """
    try:
        print(f"Executing: {' '.join(command_args)}")
        
        # Execute the command and capture output
        result = subprocess.run(
            command_args,
            capture_output=True,
            text=True,
            check=True
        )
        
        # Parse the JSON output
        if result.stdout.strip():
            try:
                return {"success": True, "data": json.loads(result.stdout)}
            except json.JSONDecodeError:
                return {"success": True, "data": result.stdout.strip()}
        else:
            return {"success": True, "data": None}
    
    except subprocess.CalledProcessError as e:
        error_message = e.stderr if e.stderr else "Unknown error"
        print(f"❌ Command failed: {error_message}")
        return {"success": False, "error": error_message, "exit_code": e.returncode}
    
    except Exception as e:
        print(f"❌ Error executing command: {str(e)}")
        return {"success": False, "error": str(e)}

def create_sync_functions():
    """Create SQL functions to sync MCP servers in the database."""
    print("📦 Creating sync function in the database...")
    
    # SQL for functions to handle MCP server data
    sync_sql = """
    -- Function to generate server IDs from GitHub URLs or names
    CREATE OR REPLACE FUNCTION generate_server_id(name text, github_url text) RETURNS text AS $$
    DECLARE
        github_parts text[];
        github_owner text;
        github_repo text;
        server_id text;
    BEGIN
        -- Try to extract GitHub owner/repo from URL
        IF github_url IS NOT NULL THEN
            github_parts := regexp_matches(github_url, 'github\\.com[/:]([\\w.-]+)/([\\w.-]+)');
            
            IF array_length(github_parts, 1) = 2 THEN
                github_owner := github_parts[1];
                github_repo := regexp_replace(github_parts[2], '\\.git$', '');
                
                -- Use GitHub owner/repo as ID
                server_id := lower(github_owner || '/' || github_repo);
                server_id := regexp_replace(server_id, '[^a-z0-9-/]', '-', 'g');
                RETURN server_id;
            END IF;
        END IF;
        
        -- Fallback to using name
        server_id := lower(regexp_replace(name, '[^a-z0-9]+', '-', 'g'));
        RETURN server_id;
    END;
    $$ LANGUAGE plpgsql;

    -- Function to extract tags from server name and description
    CREATE OR REPLACE FUNCTION extract_tags(name text, description text) RETURNS text[] AS $$
    DECLARE
        all_words text[];
        name_parts text[];
        desc_parts text[];
        common_words text[] := ARRAY['the', 'and', 'for', 'with', 'that', 'this', 'has', 'are', 'from'];
        tags text[];
    BEGIN
        -- Split name into words
        IF name IS NOT NULL THEN
            name_parts := regexp_split_to_array(lower(name), '[^a-z0-9]+');
        ELSE
            name_parts := '{}';
        END IF;
        
        -- Split description into words
        IF description IS NOT NULL THEN
            desc_parts := regexp_split_to_array(lower(description), '[^a-z0-9]+');
        ELSE
            desc_parts := '{}';
        END IF;
        
        -- Combine all words
        all_words := array_cat(name_parts, desc_parts);
        
        -- Filter words: remove empty, short, and common words
        SELECT array_agg(word) INTO tags
        FROM (
            SELECT DISTINCT unnest(all_words) AS word
            WHERE length(unnest) > 2 
            AND unnest NOT IN (SELECT unnest(common_words))
        ) t;
        
        -- Limit to 10 tags
        IF array_length(tags, 1) > 10 THEN
            tags := tags[1:10];
        END IF;
        
        RETURN tags;
    END;
    $$ LANGUAGE plpgsql;

    -- Function to determine category from name and description
    CREATE OR REPLACE FUNCTION determine_category(name text, description text) RETURNS text AS $$
    DECLARE
        lc_name text;
        lc_desc text;
    BEGIN
        -- Convert to lowercase
        lc_name := lower(name);
        lc_desc := lower(COALESCE(description, ''));
        
        -- Determine category based on keywords
        IF lc_name LIKE '%auth%' OR lc_desc LIKE '%auth%' OR lc_desc LIKE '%login%' THEN
            RETURN 'auth';
        ELSIF lc_desc LIKE '%database%' OR lc_desc LIKE '%storage%' OR lc_name LIKE '%db%' THEN
            RETURN 'database';
        ELSIF lc_desc LIKE '%ai%' OR lc_desc LIKE '%llm%' OR lc_desc LIKE '%language model%' THEN
            RETURN 'ai';
        ELSIF lc_desc LIKE '%file%' OR lc_desc LIKE '%document%' THEN
            RETURN 'files';
        ELSIF lc_desc LIKE '%web%' OR lc_desc LIKE '%http%' THEN
            RETURN 'web';
        ELSE
            RETURN 'other';
        END IF;
    END;
    $$ LANGUAGE plpgsql;

    -- Main function to sync all MCP servers 
    CREATE OR REPLACE FUNCTION sync_mcp_servers_from_pulsemcp() RETURNS jsonb AS $$
    DECLARE
        server_count integer := 0;
        added_count integer := 0;
        updated_count integer := 0;
        skipped_count integer := 0;
        error_count integer := 0;
        error_messages text[] := '{}';
        api_url text := 'https://api.pulsemcp.com/v0beta/servers?count_per_page=100';
        next_url text := api_url;
        response jsonb;
        server jsonb;
        server_id text;
        server_data jsonb;
        api_documentation jsonb;
        existing_server record;
        install_record record;
        package_registry text;
        package_name text;
        update_result record;
        insert_result record;
    BEGIN
        RAISE NOTICE 'Starting MCP servers sync from PulseMCP API...';
        
        -- Process each page of results
        WHILE next_url IS NOT NULL LOOP
            -- Fetch data from PulseMCP API
            BEGIN
                SELECT content::jsonb INTO response
                FROM http((
                    'GET',
                    next_url,
                    ARRAY[('Content-Type', 'application/json')],
                    '',
                    10
                ));
                
                -- Process each server in the response
                FOR server IN SELECT * FROM jsonb_array_elements(response->'servers')
                LOOP
                    server_count := server_count + 1;
                    
                    -- Extract server information
                    BEGIN
                        -- Generate ID based on GitHub URL or name
                        server_id := generate_server_id(
                            server->>'name', 
                            server->>'source_code_url'
                        );
                        
                        -- Generate API documentation object
                        api_documentation := jsonb_build_object(
                            'description', COALESCE(server->>'EXPERIMENTAL_ai_generated_description', server->>'short_description', ''),
                            'endpoints', COALESCE(server->'api_documentation'->'endpoints', '[]'::jsonb),
                            'examples', COALESCE(server->'api_documentation'->'examples', '[]'::jsonb),
                            'methods', '{}'::jsonb,
                            'meta', jsonb_build_object(
                                'generated_at', now(),
                                'source', 'pulsemcp',
                                'version', '1.0'
                            )
                        );
                        
                        -- Check if server already exists
                        SELECT * INTO existing_server 
                        FROM servers 
                        WHERE id = server_id;
                        
                        -- Prepare server data
                        server_data := jsonb_build_object(
                            'id', server_id,
                            'name', server->>'name',
                            'description', server->>'short_description',
                            'category', determine_category(server->>'name', server->>'short_description'),
                            'tags', extract_tags(server->>'name', server->>'short_description'),
                            'package_registry', server->>'package_registry',
                            'package_name', server->>'package_name',
                            'package_download_count', server->>'package_download_count',
                            'github_url', server->>'source_code_url',
                            'github_stars', server->>'github_stars',
                            'external_url', server->>'external_url',
                            'updated_at', now(),
                            'api_documentation', api_documentation
                        );
                        
                        -- Insert or update server
                        IF existing_server IS NULL THEN
                            -- Insert new server
                            INSERT INTO servers 
                            SELECT * FROM jsonb_populate_record(null::servers, 
                                jsonb_set(server_data, '{created_at}', to_jsonb(now()))
                            )
                            RETURNING * INTO insert_result;
                            
                            IF insert_result IS NOT NULL THEN
                                added_count := added_count + 1;
                            ELSE
                                skipped_count := skipped_count + 1;
                                error_messages := array_append(error_messages, 
                                    format('Failed to insert server %s', server_id));
                                CONTINUE;
                            END IF;
                        ELSE
                            -- Update existing server
                            UPDATE servers
                            SET 
                                name = server_data->>'name',
                                description = server_data->>'description',
                                category = server_data->>'category',
                                tags = server_data->'tags',
                                package_registry = server_data->>'package_registry',
                                package_name = server_data->>'package_name',
                                package_download_count = (server_data->>'package_download_count')::bigint,
                                github_url = server_data->>'github_url',
                                github_stars = (server_data->>'github_stars')::bigint,
                                external_url = server_data->>'external_url',
                                updated_at = now(),
                                api_documentation = server_data->'api_documentation'
                            WHERE id = server_id
                            RETURNING * INTO update_result;
                            
                            IF update_result IS NOT NULL THEN
                                updated_count := updated_count + 1;
                            ELSE
                                skipped_count := skipped_count + 1;
                                error_messages := array_append(error_messages, 
                                    format('Failed to update server %s', server_id));
                                CONTINUE;
                            END IF;
                        END IF;
                        
                        -- Remove existing installation instructions
                        DELETE FROM server_install_instructions 
                        WHERE server_id = server_id;
                        
                        -- Process installation instructions
                        IF server->'install_instructions' IS NOT NULL AND 
                           jsonb_array_length(server->'install_instructions') > 0 THEN
                            
                            -- Insert platform-specific instructions from PulseMCP
                            FOR install_record IN 
                                SELECT * FROM jsonb_to_recordset(server->'install_instructions') 
                                AS x(platform text, icon_url text, install_command text)
                            LOOP
                                INSERT INTO server_install_instructions(
                                    server_id, platform, icon_url, install_command, sort_order
                                )
                                VALUES (
                                    server_id, 
                                    install_record.platform, 
                                    install_record.icon_url, 
                                    install_record.install_command,
                                    (SELECT COALESCE(MAX(sort_order), -1) + 1 
                                     FROM server_install_instructions 
                                     WHERE server_id = server_id)
                                );
                            END LOOP;
                        ELSE
                            -- Add default instructions based on package registry
                            package_registry := server->>'package_registry';
                            package_name := server->>'package_name';
                            
                            IF package_registry IS NOT NULL AND package_name IS NOT NULL THEN
                                IF package_registry = 'npm' THEN
                                    -- Add npm instruction
                                    INSERT INTO server_install_instructions(
                                        server_id, platform, icon_url, install_command, sort_order
                                    ) VALUES (
                                        server_id,
                                        'Node.js',
                                        'https://nodejs.org/static/images/logos/nodejs-new-pantone-black.svg',
                                        format('npm install %s', package_name),
                                        0
                                    );
                                    
                                    -- Add yarn alternative
                                    INSERT INTO server_install_instructions(
                                        server_id, platform, icon_url, install_command, sort_order
                                    ) VALUES (
                                        server_id,
                                        'Yarn',
                                        'https://yarnpkg.com/favicon.svg',
                                        format('yarn add %s', package_name),
                                        1
                                    );
                                ELSIF package_registry = 'pip' OR package_registry = 'pypi' THEN
                                    -- Add pip instruction
                                    INSERT INTO server_install_instructions(
                                        server_id, platform, icon_url, install_command, sort_order
                                    ) VALUES (
                                        server_id,
                                        'Python',
                                        'https://www.python.org/static/favicon.ico',
                                        format('pip install %s', package_name),
                                        0
                                    );
                                ELSIF package_registry = 'cargo' THEN
                                    -- Add cargo instruction
                                    INSERT INTO server_install_instructions(
                                        server_id, platform, icon_url, install_command, sort_order
                                    ) VALUES (
                                        server_id,
                                        'Rust',
                                        'https://www.rust-lang.org/favicon.ico',
                                        format('cargo add %s', package_name),
                                        0
                                    );
                                ELSIF package_registry = 'go' THEN
                                    -- Add go instruction
                                    INSERT INTO server_install_instructions(
                                        server_id, platform, icon_url, install_command, sort_order
                                    ) VALUES (
                                        server_id,
                                        'Go',
                                        'https://go.dev/favicon.ico',
                                        format('go get %s', package_name),
                                        0
                                    );
                                END IF;
                            END IF;
                        END IF;
                        
                        -- Log progress every 10 servers
                        IF server_count % 10 = 0 THEN
                            RAISE NOTICE 'Processed % servers. Added: %, Updated: %, Skipped: %',
                                server_count, added_count, updated_count, skipped_count;
                        END IF;
                        
                    EXCEPTION WHEN OTHERS THEN
                        -- Handle errors for individual servers
                        skipped_count := skipped_count + 1;
                        error_count := error_count + 1;
                        error_messages := array_append(error_messages, 
                            format('Error processing server %s: %s', 
                                   server->>'name', SQLERRM));
                        RAISE NOTICE 'Error processing server %: %', 
                            server->>'name', SQLERRM;
                    END;
                END LOOP;
                
                -- Get next page URL
                next_url := response->>'next';
                
                -- Add a small delay to avoid rate limiting
                IF next_url IS NOT NULL THEN
                    PERFORM pg_sleep(0.5);
                END IF;
                
            EXCEPTION WHEN OTHERS THEN
                -- Handle errors for entire page
                error_count := error_count + 1;
                error_messages := array_append(error_messages, 
                    format('Error fetching page: %s', SQLERRM));
                RAISE NOTICE 'Error fetching page: %', SQLERRM;
                next_url := NULL; -- Stop processing
            END;
        END LOOP;
        
        RAISE NOTICE 'MCP servers sync completed.';
        RAISE NOTICE 'Total: %, Added: %, Updated: %, Skipped: %, Errors: %',
            server_count, added_count, updated_count, skipped_count, error_count;
        
        -- Return stats as jsonb
        RETURN jsonb_build_object(
            'success', TRUE,
            'message', 'MCP servers sync completed',
            'stats', jsonb_build_object(
                'total', server_count,
                'added', added_count,
                'updated', updated_count,
                'skipped', skipped_count,
                'errors', error_messages
            )
        );
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Sync process failed: %', SQLERRM;
        
        -- Return error as jsonb
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', format('Sync process failed: %s', SQLERRM),
            'error', SQLERRM
        );
    END;
    $$ LANGUAGE plpgsql;
    
    -- Create extension if not exists (needed for HTTP requests)
    CREATE EXTENSION IF NOT EXISTS pg_net;
    """
    
    # Execute SQL script to create sync functions
    result = run_mcp_command([
        "mcp9_execute_sql",
        "--project_id", PROJECT_ID,
        "--query", sync_sql
    ])
    
    if result.get("success"):
        print("✅ Sync functions created successfully\n")
        return True
    else:
        print(f"❌ Failed to create sync functions: {result.get('error', 'Unknown error')}")
        return False

def check_table_contents():
    """Check the contents of the tables before syncing."""
    results = {}
    
    for table in TABLE_NAMES:
        print(f"📊 Checking {table} table content...")
        
        query = f"SELECT COUNT(*) FROM {table};"
        result = run_mcp_command([
            "mcp9_execute_sql",
            "--project_id", PROJECT_ID,
            "--query", query
        ])
        
        if result.get("success"):
            count = result.get("data", [{}])[0].get("count", 0)
            results[table] = count
            print(f"   Current {table} count: {count}")
        else:
            print(f"❌ Failed to check {table} table: {result.get('error', 'Unknown error')}")
    
    return results

def run_sync_operation():
    """Run the MCP server sync operation using database functions."""
    print("\n🔄 Running MCP server sync operation...")
    
    # Execute the sync function
    result = run_mcp_command([
        "mcp9_execute_sql",
        "--project_id", PROJECT_ID,
        "--query", "SELECT sync_mcp_servers_from_pulsemcp();"
    ])
    
    if not result.get("success"):
        print(f"❌ Sync operation failed: {result.get('error', 'Unknown error')}")
        return None
    
    # Extract sync results
    sync_result = result.get("data", [{}])[0].get("sync_mcp_servers_from_pulsemcp", {})
    
    # Check for success
    if isinstance(sync_result, dict) and sync_result.get("success"):
        print(f"✅ {sync_result.get('message', 'Sync completed successfully')}")
        return sync_result
    else:
        print(f"❌ {sync_result.get('message', 'Sync failed')}")
        return None

def print_sync_stats(sync_result: Dict[str, Any], before_counts: Dict[str, int]):
    """Print formatted statistics from the sync operation."""
    if not sync_result or not sync_result.get("stats"):
        print("❌ No statistics available")
        return
    
    stats = sync_result.get("stats", {})
    
    print("\n📊 Sync Statistics:")
    print(f"  • Total servers processed: {stats.get('total', 0)}")
    print(f"  • New servers added: {stats.get('added', 0)}")
    print(f"  • Existing servers updated: {stats.get('updated', 0)}")
    print(f"  • Skipped servers: {stats.get('skipped', 0)}")
    
    # Verify table contents after sync
    after_counts = {}
    for table in TABLE_NAMES:
        query = f"SELECT COUNT(*) FROM {table};"
        result = run_mcp_command([
            "mcp9_execute_sql",
            "--project_id", PROJECT_ID,
            "--query", query
        ])
        
        if result.get("success"):
            count = result.get("data", [{}])[0].get("count", 0)
            after_counts[table] = count
    
    # Print table change stats
    print("\n📈 Table Changes:")
    for table in TABLE_NAMES:
        before = before_counts.get(table, 0)
        after = after_counts.get(table, 0)
        diff = after - before
        
        if diff > 0:
            print(f"  • {table}: {before} → {after} (+{diff} new records)")
        elif diff < 0:
            print(f"  • {table}: {before} → {after} ({diff} records removed)")
        else:
            print(f"  • {table}: {before} → {after} (no change)")
    
    # Print errors if any
    errors = stats.get('errors', [])
    if errors and len(errors) > 0:
        print(f"\n⚠️ Errors ({len(errors)}):")
        for i, error in enumerate(errors[:5], 1):  # Show first 5 errors
            print(f"  {i}. {error}")
        
        if len(errors) > 5:
            print(f"  ... and {len(errors) - 5} more errors")

def main():
    """Main entry point for the script."""
    try:
        print_header()
        
        # Create sync functions
        if not create_sync_functions():
            sys.exit(1)
        
        # Check table contents before sync
        before_counts = check_table_contents()
        
        # Run sync operation
        start_time = time.time()
        sync_result = run_sync_operation()
        elapsed = time.time() - start_time
        
        if sync_result:
            print(f"\n✅ Sync operation completed in {elapsed:.2f} seconds")
            print_sync_stats(sync_result, before_counts)
        else:
            print(f"\n❌ Sync operation failed after {elapsed:.2f} seconds")
            sys.exit(1)
        
    except KeyboardInterrupt:
        print("\n🛑 Sync operation interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
