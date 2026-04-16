# Vercel Deployment with Supabase

## Deployment Instructions

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Set Environment Variables in Vercel
Add the variables from `.env.production` in the Vercel dashboard:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_APP_URL`
- `APP_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`
- `ADMIN_NOTIFICATION_EMAIL`

### 3. Deploy to Vercel
```bash
vercel login
npm run deploy:vercel
```

### 4. Alternative: Vercel Web Dashboard
1. Push code to GitHub.
2. Connect the repository to Vercel.
3. Add the environment variables in the project settings.
4. Deploy automatically from the `main` branch.

## Pre-Deployment Checklist

- Supabase database is reachable with the same `DATABASE_URL` you use locally.
- `npm run build` succeeds locally.
- Vercel project settings include the production environment variables.
- `NEXT_PUBLIC_APP_URL` and `APP_URL` match the deployed site URL.

## Notes

1. Keep real credentials in local env files or the Vercel dashboard, not in committed docs.
2. Vercel will use dashboard environment variables directly; `vercel.json` does not need secret aliases.
3. Prisma generation already runs during install and build, so no extra Vercel hook is needed.
