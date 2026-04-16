# Day by Day, House to House

A meal planner website with expense tracking, menu planning, user authentication, and dashboard.

## Database Setup (Supabase)

1. Create a new project at supabase.com.
2. Go to **Project Settings > Database** and copy the connection string.
3. Create `.env.local` from `.env.example` and set `DATABASE_URL` to your pooled Supabase connection string.
4. Set `DIRECT_URL` to the direct Supabase Postgres connection string for Prisma schema changes.
5. Run `npm run db:push` to create tables.
6. Run `npm run db:seed` to add initial users.

### Migrating from Neon to Supabase
1. Set `NEON_DATABASE_URL` for the source database, `DATABASE_URL` for Supabase runtime access, and `DIRECT_URL` for Prisma schema changes.
2. **Export Data**: `pg_dump -d "$NEON_DATABASE_URL" --clean --if-exists -f neon_backup.sql`
3. **Restore to Supabase**: Import the cleaned SQL into Supabase, or use the migration scripts after confirming both environment variables are set.

## Performance Optimization

### 1. Server-Side Pagination (Prisma)
In your API routes, fetch data in chunks to reduce DB load:
```typescript
const activities = await prisma.activity.findMany({
  take: 10,
  skip: page * 10,
  orderBy: { timestamp: 'desc' },
});
```

### 2. Caching (Next.js unstable_cache)
Cache expensive aggregate queries (like monthly balances):
```typescript
import { unstable_cache } from 'next/cache';

const getCachedBalance = unstable_cache(
  async () => prisma.expense.aggregate({ ... }),
  ['monthly-balance'],
  { revalidate: 3600, tags: ['expenses'] }
);
```

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

To build for production:

```bash
npm run build
npm start
```

## Deployment to Vercel

1. Push code to GitHub.
2. Connect repo to Vercel.
3. Add the environment variables from `.env.production` in the Vercel dashboard.
4. Deploy.

## Features

- Expense tracking with categories and undo
- Monthly food money tracking
- Weekly menu planning with assignments
- Dashboard with charts and warnings
- User authentication with activity logging
- Export functionality (PNG for menu, PDF/XLS for expenses)
- Responsive design
- Light/Dark theme
