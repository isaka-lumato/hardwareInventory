# Supabase Setup

Follow these steps to set up the database from scratch.

## Prerequisites
- A Supabase project (create one at https://supabase.com)

## Steps

1. Go to your Supabase Dashboard → **SQL Editor**

2. Run the schema file:
   - Open `schema.sql`
   - Copy and paste the entire contents into the SQL Editor
   - Click **Run**
   - Verify: all 5 tables appear in Table Editor (profiles, categories, products, orders, order_items)

3. Run the RLS policies:
   - Open `rls.sql`
   - Copy and paste into SQL Editor
   - Click **Run**

4. Run the seed data:
   - Open `seed.sql`
   - Copy and paste into SQL Editor
   - Click **Run**
   - Verify: 3 categories and 5 products appear in Table Editor

5. Run the settings table:
   - Open `settings.sql`
   - Copy and paste into SQL Editor
   - Click **Run**

6. Verify the order number function:
   - In SQL Editor, run: `SELECT next_order_number();`
   - Should return: `ORD-0001`

## Creating Your First Admin User

1. Go to **Authentication** → **Users** → **Add User**
2. Enter an email and password
3. Go to **Table Editor** → **profiles**
4. Find the user's row and change `role` to `admin`
5. Log in with those credentials
