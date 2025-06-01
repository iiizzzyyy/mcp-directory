#!/bin/bash

# setup-supabase-token.sh
# This script helps set up the Supabase access token for deploying edge functions

# Check if a token was provided
if [ -z "$1" ]; then
  echo "Please provide your Supabase access token as an argument"
  echo "Usage: ./setup-supabase-token.sh YOUR_TOKEN"
  echo ""
  echo "To get a token:"
  echo "1. Go to app.supabase.com"
  echo "2. Navigate to your account settings"
  echo "3. Select 'Access Tokens'"
  echo "4. Generate a new token with appropriate permissions"
  exit 1
fi

# Set the token temporarily for this session
export SUPABASE_ACCESS_TOKEN="$1"
echo "SUPABASE_ACCESS_TOKEN has been set for this terminal session"

# Update or create .env file with the token
if grep -q "SUPABASE_ACCESS_TOKEN" .env 2>/dev/null; then
  # Update existing entry
  sed -i '' "s/SUPABASE_ACCESS_TOKEN=.*/SUPABASE_ACCESS_TOKEN=$1/" .env
  echo "Updated SUPABASE_ACCESS_TOKEN in .env file"
else
  # Add new entry
  echo "SUPABASE_ACCESS_TOKEN=$1" >> .env
  echo "Added SUPABASE_ACCESS_TOKEN to .env file"
fi

# Provide instructions for linking the project
echo ""
echo "To link your Supabase project, run:"
echo "supabase link --project-ref YOUR_PROJECT_ID"
echo ""
echo "To deploy the apply-migration function, run:"
echo "supabase functions deploy apply-migration"
echo ""
echo "To verify your functions, run:"
echo "supabase functions list"

# For convenience, attempt to find the project ID
if grep -q "SUPABASE_PROJECT_ID" .env 2>/dev/null; then
  PROJECT_ID=$(grep "SUPABASE_PROJECT_ID" .env | cut -d '=' -f2)
  echo "Found project ID: $PROJECT_ID"
  echo "You can link your project with:"
  echo "supabase link --project-ref $PROJECT_ID"
fi
