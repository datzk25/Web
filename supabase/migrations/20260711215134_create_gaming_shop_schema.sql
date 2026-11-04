/*
# Gaming Shop - Complete Database Schema

## Overview
Full schema for a premium gaming shop with accounts, products, orders, wallet system, and payment integration.

## New Tables
1. profiles - User accounts with wallet balance and roles
2. categories - Product categories
3. products - All product types (acc, random, file, tool, item, service)
4. product_inventory - Individual items in stock
5. orders - Purchase history
6. deposit_transactions - Payment/top-up records
7. wallet_transactions - All balance changes
8. discount_codes - Coupon codes
9. notifications - System/user notifications
10. site_stats - Cached statistics

## Security
- RLS on all tables
- Users see only their own data
- Products/categories are public read
- Admin role gets full access
*/

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id text UNIQUE NOT NULL,
  username text NOT NULL,
  email text,
  avatar_url text,
  balance numeric NOT NULL DEFAULT 0 CHECK (balance >= 0),
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_banned boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_admin_select" ON profiles;
CREATE POLICY "profiles_admin_select" ON profiles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "profiles_admin_update" ON profiles;
CREATE POLICY "profiles_admin_update" ON profiles FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (true);

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  icon text,
  image_url text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_public_select" ON categories;
CREATE POLICY "categories_public_select" ON categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "categories_admin_insert" ON categories;
CREATE POLICY "categories_admin_insert" ON categories FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "categories_admin_update" ON categories;
CREATE POLICY "categories_admin_update" ON categories FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (true);

DROP POLICY IF EXISTS "categories_admin_delete" ON categories;
CREATE POLICY "categories_admin_delete" ON categories FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  short_description text,
  type text NOT NULL DEFAULT 'acc' CHECK (type IN ('acc', 'random_acc', 'file', 'tool', 'item', 'service')),
  price numeric NOT NULL CHECK (price >= 0),
  original_price numeric,
  stock int NOT NULL DEFAULT -1,
  sold_count int NOT NULL DEFAULT 0,
  images jsonb DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  is_new boolean NOT NULL DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_public_select" ON products;
CREATE POLICY "products_public_select" ON products FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "products_admin_insert" ON products;
CREATE POLICY "products_admin_insert" ON products FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "products_admin_update" ON products;
CREATE POLICY "products_admin_update" ON products FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (true);

DROP POLICY IF EXISTS "products_admin_delete" ON products;
CREATE POLICY "products_admin_delete" ON products FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- PRODUCT INVENTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS product_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_sold boolean NOT NULL DEFAULT false,
  sold_at timestamptz,
  sold_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  order_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_admin_all" ON product_inventory;
CREATE POLICY "inventory_admin_all" ON product_inventory FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (true);

DROP POLICY IF EXISTS "inventory_user_select_own" ON product_inventory;
CREATE POLICY "inventory_user_select_own" ON product_inventory FOR SELECT
  TO authenticated USING (sold_to = auth.uid());

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code text UNIQUE NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE RESTRICT,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  discount_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
  delivery_data jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_own" ON orders;
CREATE POLICY "orders_select_own" ON orders FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "orders_insert_own" ON orders;
CREATE POLICY "orders_insert_own" ON orders FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "orders_update_own" ON orders;
CREATE POLICY "orders_update_own" ON orders FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (true);

DROP POLICY IF EXISTS "orders_admin_select" ON orders;
CREATE POLICY "orders_admin_select" ON orders FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "orders_admin_update" ON orders;
CREATE POLICY "orders_admin_update" ON orders FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (true);

-- ============================================================
-- DEPOSIT TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS deposit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE RESTRICT,
  transaction_code text UNIQUE NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  bank_name text,
  bank_account text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
  payment_method text NOT NULL DEFAULT 'sepay',
  qr_url text,
  webhook_data jsonb,
  expires_at timestamptz DEFAULT (now() + interval '30 minutes'),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE deposit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deposit_select_own" ON deposit_transactions;
CREATE POLICY "deposit_select_own" ON deposit_transactions FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "deposit_insert_own" ON deposit_transactions;
CREATE POLICY "deposit_insert_own" ON deposit_transactions FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "deposit_update_anon" ON deposit_transactions;
CREATE POLICY "deposit_update_anon" ON deposit_transactions FOR UPDATE
  TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "deposit_admin_select" ON deposit_transactions;
CREATE POLICY "deposit_admin_select" ON deposit_transactions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "deposit_admin_update" ON deposit_transactions;
CREATE POLICY "deposit_admin_update" ON deposit_transactions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (true);

-- ============================================================
-- WALLET TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('deposit', 'purchase', 'refund', 'admin_adjust')),
  amount numeric NOT NULL,
  balance_before numeric NOT NULL,
  balance_after numeric NOT NULL,
  reference_id uuid,
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallet_select_own" ON wallet_transactions;
CREATE POLICY "wallet_select_own" ON wallet_transactions FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "wallet_insert_own" ON wallet_transactions;
CREATE POLICY "wallet_insert_own" ON wallet_transactions FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "wallet_admin_select" ON wallet_transactions;
CREATE POLICY "wallet_admin_select" ON wallet_transactions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "wallet_admin_insert" ON wallet_transactions;
CREATE POLICY "wallet_admin_insert" ON wallet_transactions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- DISCOUNT CODES
-- ============================================================
CREATE TABLE IF NOT EXISTS discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  type text NOT NULL DEFAULT 'percent' CHECK (type IN ('percent', 'fixed')),
  value numeric NOT NULL CHECK (value > 0),
  min_order numeric NOT NULL DEFAULT 0,
  max_uses int,
  used_count int NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "discount_public_select" ON discount_codes;
CREATE POLICY "discount_public_select" ON discount_codes FOR SELECT
  TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS "discount_admin_insert" ON discount_codes;
CREATE POLICY "discount_admin_insert" ON discount_codes FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "discount_admin_update" ON discount_codes;
CREATE POLICY "discount_admin_update" ON discount_codes FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (true);

DROP POLICY IF EXISTS "discount_admin_delete" ON discount_codes;
CREATE POLICY "discount_admin_delete" ON discount_codes FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_admin_all" ON notifications;
CREATE POLICY "notifications_admin_all" ON notifications FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (true);

-- ============================================================
-- SITE STATS
-- ============================================================
CREATE TABLE IF NOT EXISTS site_stats (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  total_users bigint NOT NULL DEFAULT 0,
  total_orders bigint NOT NULL DEFAULT 0,
  total_revenue numeric NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE site_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stats_public_select" ON site_stats;
CREATE POLICY "stats_public_select" ON site_stats FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "stats_admin_update" ON site_stats;
CREATE POLICY "stats_admin_update" ON site_stats FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (true);

DROP POLICY IF EXISTS "stats_admin_insert" ON site_stats;
CREATE POLICY "stats_admin_insert" ON site_stats FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_customer_id ON profiles(customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_code ON orders(order_code);
CREATE INDEX IF NOT EXISTS idx_deposit_user ON deposit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_code ON deposit_transactions(transaction_code);
CREATE INDEX IF NOT EXISTS idx_wallet_user ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON product_inventory(product_id);

-- ============================================================
-- SEED DATA
-- ============================================================
INSERT INTO site_stats (id, total_users, total_orders, total_revenue)
VALUES (1, 1250, 8430, 125600000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO categories (name, slug, description, icon, sort_order) VALUES
  ('Acc Game', 'acc-game', 'Tài khoản game các loại', 'LuGamepad2', 1),
  ('Random Acc', 'random-acc', 'Tài khoản ngẫu nhiên giá rẻ', 'LuShuffle', 2),
  ('Tool & Hack', 'tool-hack', 'Công cụ hỗ trợ gaming', 'LuWrench', 3),
  ('File & Mod', 'file-mod', 'File mod game, skin', 'LuFileArchive', 4),
  ('Vật Phẩm', 'vat-pham', 'Vật phẩm trong game', 'LuGem', 5),
  ('Cày Thuê', 'cay-thue', 'Dịch vụ cày rank, quest', 'LuTrophy', 6)
ON CONFLICT (slug) DO NOTHING;
