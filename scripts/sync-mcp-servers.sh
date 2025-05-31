#!/bin/bash
# MCP Server Sync Shell Script
# This script provides an easy way to invoke the sync-pulse-servers edge function

# Set terminal colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        MCP Server Sync Operation       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is required but not installed.${NC}"
    exit 1
fi

# Check if requests library is installed
if ! python3 -c "import requests" &> /dev/null; then
    echo -e "${YELLOW}Installing required Python packages...${NC}"
    pip install requests
fi

# Check if service role key is already set
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${YELLOW}SUPABASE_SERVICE_ROLE_KEY environment variable is not set.${NC}"
    
    # Prompt for service role key
    echo -e "${CYAN}Enter your Supabase service role key:${NC}"
    read -s service_role_key
    
    if [ -z "$service_role_key" ]; then
        echo -e "${RED}Error: Service role key is required.${NC}"
        exit 1
    fi
    
    # Export key for this session
    export SUPABASE_SERVICE_ROLE_KEY="$service_role_key"
    echo -e "${GREEN}Service role key set for this session.${NC}"
else
    echo -e "${GREEN}Using existing SUPABASE_SERVICE_ROLE_KEY environment variable.${NC}"
fi

# Make the script executable if it's not already
if [ ! -x "$(dirname "$0")/sync_mcp_servers.py" ]; then
    chmod +x "$(dirname "$0")/sync_mcp_servers.py"
fi

echo -e "${CYAN}Starting sync operation...${NC}"
python3 "$(dirname "$0")/sync_mcp_servers.py"

# Check exit status
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}Sync operation completed successfully!${NC}"
else
    echo -e "\n${RED}Sync operation failed. See above for details.${NC}"
    exit 1
fi
