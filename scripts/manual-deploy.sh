#!/bin/bash

echo "Manual Vercel Deployment Script"
echo "================================"

# Option 1: Using Vercel CLI
echo "Option 1: Deploy using Vercel CLI"
echo "Run these commands:"
echo "1. vercel login"
echo "2. vercel --prod"
echo ""

# Option 2: Force redeploy from dashboard
echo "Option 2: Force redeploy from Vercel Dashboard"
echo "1. Go to https://vercel.com/dashboard"
echo "2. Find your project: day-by-day-house-to-house"
echo "3. Click on the project"
echo "4. Click 'Deployments' tab"
echo "5. Click 'Redeploy' button or 'View Build Log' to check status"
echo ""

# Option 3: Check GitHub integration
echo "Option 3: Check GitHub-Vercel Integration"
echo "1. Go to your GitHub repository"
echo "2. Click 'Settings' tab"
echo "3. Click 'Integrations & services'"
echo "4. Check if Vercel is connected"
echo "5. If not, reconnect it"
echo ""

# Option 4: Manual build and deploy
echo "Option 4: Manual build and deploy"
echo "Run these commands:"
echo "1. npm run build"
echo "2. vercel --prod"
echo ""

echo "Current git status:"
git status
echo ""
echo "Latest commits:"
git log --oneline -5
