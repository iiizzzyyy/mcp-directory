#!/usr/bin/env python3
"""
MCP Server Sync Script

This script invokes the sync-pulse-servers edge function to synchronize
MCP servers data with our database, including platform-specific installation
instructions and API documentation.

Usage:
    export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
    python sync_mcp_servers.py
"""

import os
import sys
import json
import time
from typing import Dict, Any, Optional
import requests
from requests.exceptions import RequestException


def sync_mcp_servers() -> Dict[str, Any]:
    """
    Invoke the sync-pulse-servers edge function to update MCP server data.
    
    This function:
    1. Calls the Supabase edge function with the service role key
    2. Handles authentication and connection errors
    3. Returns the response from the sync operation
    
    Returns:
        Dict[str, Any]: Response data from the sync operation
    
    Raises:
        ValueError: If the service role key is not set
        RequestException: If the request fails
    """
    # Get Supabase service role key from environment
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not service_role_key:
        raise ValueError(
            "SUPABASE_SERVICE_ROLE_KEY environment variable is not set. "
            "Please set it using: export SUPABASE_SERVICE_ROLE_KEY='your-key'"
        )
    
    # Supabase project URL
    supabase_url = "https://nryytfezkmptcmpawlva.supabase.co"
    
    # Function endpoint
    endpoint = f"{supabase_url}/functions/v1/sync-pulse-servers"
    
    # Set up headers with authentication
    headers = {
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json"
    }
    
    print(f"⏳ Invoking sync-pulse-servers function...")
    start_time = time.time()
    
    try:
        # Make the request to the edge function
        response = requests.post(endpoint, headers=headers, timeout=300)  # 5-minute timeout
        
        # Check if the request was successful
        if response.status_code == 200:
            result = response.json()
            elapsed = time.time() - start_time
            print(f"✅ Sync completed in {elapsed:.2f} seconds")
            return result
        else:
            # Handle error responses
            error_msg = f"Error: {response.status_code}"
            try:
                error_data = response.json()
                error_msg = f"Error {response.status_code}: {error_data.get('message', 'Unknown error')}"
            except json.JSONDecodeError:
                error_msg = f"Error {response.status_code}: {response.text}"
            
            print(f"❌ {error_msg}")
            return {"success": False, "message": error_msg}
    
    except RequestException as e:
        print(f"❌ Connection error: {str(e)}")
        return {"success": False, "message": f"Connection error: {str(e)}"}


def print_stats(stats: Optional[Dict[str, Any]]) -> None:
    """
    Print formatted statistics from the sync operation.
    
    Args:
        stats: Dictionary containing sync statistics
    """
    if not stats:
        print("No statistics available")
        return
    
    print("\n📊 Sync Statistics:")
    print(f"  • Total servers processed: {stats.get('total', 0)}")
    print(f"  • New servers added: {stats.get('added', 0)}")
    print(f"  • Existing servers updated: {stats.get('updated', 0)}")
    print(f"  • Skipped servers: {stats.get('skipped', 0)}")
    
    # Print errors if any
    errors = stats.get('errors', [])
    if errors:
        print(f"\n⚠️ Errors ({len(errors)}):")
        for i, error in enumerate(errors[:5], 1):  # Show first 5 errors
            print(f"  {i}. {error}")
        
        if len(errors) > 5:
            print(f"  ... and {len(errors) - 5} more errors")


def main():
    """Main entry point for the script."""
    try:
        print("🔄 Starting MCP Server sync operation...")
        result = sync_mcp_servers()
        
        if result.get("success", False):
            print(f"✅ {result.get('message', 'Sync completed successfully')}")
            print_stats(result.get("stats"))
        else:
            print(f"❌ {result.get('message', 'Sync failed')}")
            sys.exit(1)
    
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
