-- HMS Row Level Security Policies
-- Run this AFTER schema.sql in Supabase SQL Editor

-- ============================================
-- Helper function: get current user's role
-- ============================================
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- Auto-create profile on signup trigger
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'cashier'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PROFILES RLS
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (auth.user_role() = 'admin');

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (auth.user_role() = 'admin');

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (auth.user_role() = 'admin');

-- ============================================
-- CATEGORIES RLS
-- ============================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert categories"
  ON categories FOR INSERT
  WITH CHECK (auth.user_role() = 'admin');

CREATE POLICY "Admins can update categories"
  ON categories FOR UPDATE
  USING (auth.user_role() = 'admin');

CREATE POLICY "Admins can delete categories"
  ON categories FOR DELETE
  USING (auth.user_role() = 'admin');

-- ============================================
-- PRODUCTS RLS
-- ============================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read active products"
  ON products FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can read all products"
  ON products FOR SELECT
  USING (auth.user_role() = 'admin');

CREATE POLICY "Admins can insert products"
  ON products FOR INSERT
  WITH CHECK (auth.user_role() = 'admin');

CREATE POLICY "Admins can update products"
  ON products FOR UPDATE
  USING (auth.user_role() = 'admin');

CREATE POLICY "Admins can delete products"
  ON products FOR DELETE
  USING (auth.user_role() = 'admin');

-- ============================================
-- ORDERS RLS
-- ============================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cashiers can insert own orders"
  ON orders FOR INSERT
  WITH CHECK (cashier_id = auth.uid());

CREATE POLICY "Cashiers can read own orders"
  ON orders FOR SELECT
  USING (cashier_id = auth.uid());

CREATE POLICY "Storekeepers can read all orders"
  ON orders FOR SELECT
  USING (auth.user_role() = 'storekeeper');

CREATE POLICY "Storekeepers can update order status"
  ON orders FOR UPDATE
  USING (auth.user_role() = 'storekeeper');

CREATE POLICY "Admins can do everything with orders"
  ON orders FOR ALL
  USING (auth.user_role() = 'admin');

-- ============================================
-- ORDER_ITEMS RLS
-- ============================================
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cashiers can insert items for own orders"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = order_id AND orders.cashier_id = auth.uid()
    )
  );

CREATE POLICY "Cashiers can read items for own orders"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = order_id AND orders.cashier_id = auth.uid()
    )
  );

CREATE POLICY "Storekeepers can read all order items"
  ON order_items FOR SELECT
  USING (auth.user_role() = 'storekeeper');

CREATE POLICY "Admins can do everything with order items"
  ON order_items FOR ALL
  USING (auth.user_role() = 'admin');

-- ============================================
-- Enable Realtime for orders table
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
