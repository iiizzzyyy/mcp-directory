#!/bin/bash

# Deploy script for MCP Directory project
# This script deploys the Supabase edge function and then deploys to Vercel

echo "🚀 Starting deployment process..."

# Step 1: Deploy Supabase edge function
echo "📦 Deploying Supabase edge function..."
cd /Users/izzy.aly/Documents/mcp-directory-final

# Login to Supabase if needed
echo "🔐 Checking Supabase login status..."
npx supabase login

# Deploy the edge function
echo "📤 Deploying servers-install edge function..."
npx supabase functions deploy servers-install --project-ref nryytfezkmptcmpawlva
if [ $? -ne 0 ]; then
  echo "❌ Failed to deploy Supabase edge function"
  exit 1
fi
echo "✅ Edge function deployed successfully"

# Step 2: Deploy to Vercel production
echo "🌐 Deploying to Vercel production..."
cd /Users/izzy.aly/Documents/mcp-directory-final/frontend

# Login to Vercel if needed
echo "🔐 Checking Vercel login status..."
npx vercel login

# Deploy to Vercel
echo "📤 Deploying to Vercel production..."
npx vercel deploy --prod
if [ $? -ne 0 ]; then
  echo "❌ Failed to deploy to Vercel"
  exit 1
fi
echo "✅ Vercel deployment completed successfully"

echo "🎉 Deployment completed!"
