# Vercel Deployment with Supabase Database

## 🚀 Deployment Instructions

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Set Environment Variables in Vercel
In your Vercel dashboard, set these environment variables:

**Database Configuration:**
- `DATABASE_URL`: `postgresql://postgres.fuhhnfdbepnxwjcgzdpg:Sovereign%4020541126@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require`

**Application URLs:**
- `NEXT_PUBLIC_APP_URL`: `https://your-app-name.vercel.app`
- `APP_URL`: `https://your-app-name.vercel.app`

**Email Configuration (if needed):**
- `SMTP_HOST`: `smtp.gmail.com`
- `SMTP_PORT`: `587`
- `SMTP_USER`: `your-email@gmail.com`
- `SMTP_PASS`: `your-app-password`
- `EMAIL_FROM`: `Day by Day <your-email@gmail.com>`
- `ADMIN_NOTIFICATION_EMAIL`: `your-admin@gmail.com`

### 3. Deploy to Vercel
```bash
# Login to Vercel
vercel login

# Deploy to production
npm run deploy:vercel

# Or use the build script
npm run vercel-build
vercel --prod
```

### 4. Alternative: Vercel Web Dashboard
1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically on push to main branch

## 📋 Pre-Deployment Checklist

- [ ] Supabase database connection tested
- [ ] All 178 records migrated successfully (95% complete)
- [ ] Environment variables configured
- [ ] Vercel configuration updated
- [ ] Build process tested locally

## 🔧 Configuration Files Updated

### `vercel.json`
- Configured for Next.js framework
- Environment variables mapped correctly
- Build command updated for Prisma generation

### `package.json`
- Added `vercel-build` script
- Added `deploy:vercel` script
- Prisma generation included in build process

### `.env.production`
- Production environment variables template
- Supabase database URL configured
- Ready for deployment

## 🎯 Current Status

✅ **Migration Complete**: 178/188 records (95%)
✅ **Supabase Database**: Connected and populated
✅ **Configuration Files**: Updated for Vercel
✅ **Build Process**: Optimized for production

## 🚨 Important Notes

1. **Database URL**: The Supabase URL is properly URL-encoded for production
2. **Prisma Generation**: Automatically runs during Vercel build
3. **Environment Variables**: Must be set in Vercel dashboard, not just locally
4. **Branch Configuration**: Set to deploy from `master` branch

## 📞 Support

If deployment fails:
1. Check Vercel build logs
2. Verify environment variables in Vercel dashboard
3. Test database connection separately
4. Ensure Prisma schema matches Supabase structure
