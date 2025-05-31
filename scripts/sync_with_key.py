#!/usr/bin/env python3
"""
MCP Server Sync Script with Embedded Key

This script invokes the sync-pulse-servers edge function to synchronize
MCP servers data with our database, including platform-specific installation
instructions and API documentation.

Usage:
    python sync_with_key.py YOUR_SERVICE_ROLE_KEY
"""

import os
import sys
import json
import time
import base64
from typing import Dict, Any, Optional
import requests
from requests.exceptions import RequestException


def get_token_role(token: str) -> str:
    """Extract the role from a JWT token."""
    try:
        # Split the token and get the payload (second part)
        parts = token.split('.')
        if len(parts) != 3:
            return "Invalid token format"
            
        # Decode the payload
        payload = parts[1]
        # Add padding if needed
        payload += '=' * (4 - len(payload) % 4) if len(payload) % 4 else ''
        decoded = base64.b64decode(payload).decode('utf-8')
        payload_data = json.loads(decoded)
        
        # Return the role
        return payload_data.get('role', 'No role found')
    except Exception as e:
        return f"Error parsing token: {str(e)}"


def sync_mcp_servers(service_role_key: str) -> Dict[str, Any]:
    """
    Invoke the sync-pulse-servers edge function to update MCP server data.
    
    Args:
        service_role_key: The Supabase service role key for authentication
    
    Returns:
        Dict[str, Any]: Response data from the sync operation
    
    Raises:
        ValueError: If the service role key is not set
        RequestException: If the request fails
    """
    if not service_role_key:
        raise ValueError("Service role key is required")
    
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
                print(f"Full error response: {json.dumps(error_data, indent=2)}")
            except json.JSONDecodeError:
                error_msg = f"Error {response.status_code}: {response.text}"
            
            # Print additional debug info
            print(f"\nDebug Information:")
            print(f"Endpoint: {endpoint}")
            print(f"Auth header: Bearer {service_role_key[:10]}...{service_role_key[-5:]}")
            print(f"Role in token: {get_token_role(service_role_key)}")
            
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
        # Check if we have a key from command line argument
        if len(sys.argv) > 1:
            service_role_key = sys.argv[1]
        else:
            print("No service role key provided as argument.")
            print("You can run this script with: python sync_with_key.py YOUR_SERVICE_ROLE_KEY")
            sys.exit(1)

        print("🔄 Starting MCP Server sync operation...")
        result = sync_mcp_servers(service_role_key)
        
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
