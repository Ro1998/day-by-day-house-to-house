# Day by Day, House to House

A meal planner website with expense tracking, menu planning, user authentication, and dashboard.

## Setup Database

1. Create a Neon database at neon.tech.
2. Copy the connection string.
3. Create .env.local with DATABASE_URL="your_connection_string"
4. Run `npm run db:push` to create tables.
5. Run `npm run db:seed` to add initial users.

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
3. Add DATABASE_URL environment variable in Vercel dashboard.
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