# Vercel Environment Variable Setup Guide

## Problem

Your Vercel deployment will fail if the required environment variables are missing.

## Recommended Setup

1. Go to the Vercel dashboard.
2. Open your project settings.
3. Add the production environment variables from `.env.production`.
4. Redeploy the latest commit.

## Required Variables

- `DATABASE_URL`: your Supabase Postgres connection string
- `DIRECT_URL`: your direct Supabase Postgres connection string for Prisma schema changes
- `NEXT_PUBLIC_APP_URL`: your deployed Vercel URL
- `APP_URL`: your deployed Vercel URL
- `SMTP_HOST`: your SMTP host
- `SMTP_PORT`: your SMTP port
- `SMTP_USER`: your sending email address
- `SMTP_PASS`: your Gmail app password or SMTP password
- `EMAIL_FROM`: the from address used in outgoing mail
- `ADMIN_NOTIFICATION_EMAIL`: the inbox that should receive admin alerts

## CLI Option

```bash
vercel login
vercel env add DATABASE_URL
vercel env add DIRECT_URL
vercel env add NEXT_PUBLIC_APP_URL
vercel env add APP_URL
vercel env add SMTP_HOST
vercel env add SMTP_PORT
vercel env add SMTP_USER
vercel env add SMTP_PASS
vercel env add EMAIL_FROM
vercel env add ADMIN_NOTIFICATION_EMAIL
vercel --prod
```

## Notes

1. Keep `vercel.json` minimal and manage secrets in the dashboard or with `vercel env add`.
2. Update `NEXT_PUBLIC_APP_URL` and `APP_URL` after the production URL is known.
3. Use a Gmail app password if you send mail through Gmail.
