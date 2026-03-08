# HMS — Hardware Store Management System

A web-based Point-of-Sale and store management system for hardware businesses. Enables cashiers to create orders, gives storekeepers a real-time order queue, and provides owners with financial reporting.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth with role-based access control
- **Real-time:** Supabase Realtime (storekeeper order queue)
- **Charts:** Recharts
- **Deployment:** Vercel

## User Roles

| Role | Access |
|------|--------|
| Cashier | Create orders, print invoices, view own order history |
| Storekeeper | Real-time order queue, mark orders as fulfilled |
| Admin | Product management, dashboard analytics, sales history, user management, settings |

## Local Development

### Prerequisites
- Node.js 18.17+
- A Supabase project

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env.local` and fill in your Supabase credentials:
   ```bash
   cp .env.example .env.local
   ```
4. Set up the database — follow instructions in `supabase/README.md`
5. Start the dev server:
   ```bash
   npm run dev
   ```
6. Open http://localhost:3000

### Creating Your First Admin User

1. In Supabase Dashboard → Authentication → Users → Add User
2. Enter email and a temporary password
3. In Table Editor → profiles → find that user's row → set `role` to `admin`
4. Log in at http://localhost:3000 with those credentials

## Deployment (Vercel)

1. Push to GitHub
2. Go to https://vercel.com → Add New Project → import your repo
3. Add all environment variables from `.env.local` to Vercel's Environment Variables
4. Click Deploy
5. Your live URL will be ready in ~2 minutes
