/*
# Gaming Shop v2 - Extended Schema (fix)

Fixes CREATE POLICY IF EXISTS syntax errors from previous attempt.
All policies use DROP POLICY IF EXISTS then CREATE POLICY.
*/

-- ============================================================
-- ADD COLUMNS TO PROFILES (already done if previous partial ran)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'total_deposited') THEN
    ALTER TABLE profiles ADD COLUMN total_deposited numeric NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'total_spent') THEN
    ALTER TABLE profiles ADD COLUMN total_spent numeric NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'reward_points') THEN
    ALTER TABLE profiles ADD COLUMN reward_points int NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'referral_code') THEN
    ALTER TABLE profiles ADD COLUMN referral_code text UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'referred_by') THEN
    ALTER TABLE profiles ADD COLUMN referred_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'rank') THEN
    ALTER TABLE profiles ADD COLUMN rank text NOT NULL DEFAULT 'member';
  END IF;
END $$;

-- ============================================================
-- MEMBERSHIP RANKS
-- ============================================================
CREATE TABLE IF NOT EXISTS membership_ranks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rank_key text UNIQUE NOT NULL,
  name text NOT NULL,
  min_amount numeric NOT NULL DEFAULT 0,
  discount_percent numeric NOT NULL DEFAULT 0,
  cashback_percent numeric NOT NULL DEFAULT 0,
  icon text,
  color text NOT NULL DEFAULT '#ffffff',
  gradient text,
  sort_order int NOT NULL DEFAULT 0,
  benefits jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE membership_ranks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ranks_public_select" ON membership_ranks;
CREATE POLICY "ranks_public_select" ON membership_ranks FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "ranks_admin_all" ON membership_ranks;
CREATE POLICY "ranks_admin_all" ON membership_ranks FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (true);

-- ============================================================
-- PRODUCT REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  is_verified boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_public_select" ON product_reviews;
CREATE POLICY "reviews_public_select" ON product_reviews FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "reviews_insert_own" ON product_reviews;
CREATE POLICY "reviews_insert_own" ON product_reviews FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "reviews_delete_own" ON product_reviews;
CREATE POLICY "reviews_delete_own" ON product_reviews FOR DELETE
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "reviews_admin_delete" ON product_reviews;
CREATE POLICY "reviews_admin_delete" ON product_reviews FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- REFERRALS
-- ============================================================
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  commission numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'paid')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(referrer_id, referred_id)
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referrals_select_own" ON referrals;
CREATE POLICY "referrals_select_own" ON referrals FOR SELECT
  TO authenticated USING (referrer_id = auth.uid() OR referred_id = auth.uid());

DROP POLICY IF EXISTS "referrals_admin_all" ON referrals;
CREATE POLICY "referrals_admin_all" ON referrals FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (true);

-- ============================================================
-- REWARD POINTS LEDGER
-- ============================================================
CREATE TABLE IF NOT EXISTS reward_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points int NOT NULL,
  reason text NOT NULL,
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reward_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reward_select_own" ON reward_points;
CREATE POLICY "reward_select_own" ON reward_points FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "reward_insert_own" ON reward_points;
CREATE POLICY "reward_insert_own" ON reward_points FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "reward_admin_all" ON reward_points;
CREATE POLICY "reward_admin_all" ON reward_points FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (true);

-- ============================================================
-- SUPPORT TICKETS
-- ============================================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'payment', 'product', 'account', 'bug', 'other')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed', 'waiting')),
  attachment_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets_select_own" ON support_tickets;
CREATE POLICY "tickets_select_own" ON support_tickets FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "tickets_insert_own" ON support_tickets;
CREATE POLICY "tickets_insert_own" ON support_tickets FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "tickets_update_own" ON support_tickets;
CREATE POLICY "tickets_update_own" ON support_tickets FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (true);

DROP POLICY IF EXISTS "tickets_admin_all" ON support_tickets;
CREATE POLICY "tickets_admin_all" ON support_tickets FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (true);

-- ============================================================
-- TICKET MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ticket_msgs_select" ON ticket_messages;
CREATE POLICY "ticket_msgs_select" ON ticket_messages FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM support_tickets t WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')))
  );

DROP POLICY IF EXISTS "ticket_msgs_insert" ON ticket_messages;
CREATE POLICY "ticket_msgs_insert" ON ticket_messages FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "ticket_msgs_admin_all" ON ticket_messages;
CREATE POLICY "ticket_msgs_admin_all" ON ticket_messages FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (true);

-- ============================================================
-- FLASH SALES
-- ============================================================
CREATE TABLE IF NOT EXISTS flash_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE flash_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flash_public_select" ON flash_sales;
CREATE POLICY "flash_public_select" ON flash_sales FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "flash_admin_all" ON flash_sales;
CREATE POLICY "flash_admin_all" ON flash_sales FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS flash_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flash_sale_id uuid NOT NULL REFERENCES flash_sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sale_price numeric NOT NULL,
  max_quantity int,
  sold_count int NOT NULL DEFAULT 0,
  UNIQUE(flash_sale_id, product_id)
);

ALTER TABLE flash_sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flash_items_public_select" ON flash_sale_items;
CREATE POLICY "flash_items_public_select" ON flash_sale_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "flash_items_admin_all" ON flash_sale_items;
CREATE POLICY "flash_items_admin_all" ON flash_sale_items FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (true);

-- ============================================================
-- BANNERS
-- ============================================================
CREATE TABLE IF NOT EXISTS banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  image_url text,
  link_url text,
  button_text text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "banners_public_select" ON banners;
CREATE POLICY "banners_public_select" ON banners FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "banners_admin_all" ON banners;
CREATE POLICY "banners_admin_all" ON banners FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (true);

-- ============================================================
-- ADMIN LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  data_before jsonb,
  data_after jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "logs_admin_select" ON admin_logs;
CREATE POLICY "logs_admin_select" ON admin_logs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "logs_admin_insert" ON admin_logs;
CREATE POLICY "logs_admin_insert" ON admin_logs FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- SITE SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS site_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  site_name text NOT NULL DEFAULT 'GameShop',
  logo_url text,
  favicon_url text,
  primary_color text NOT NULL DEFAULT '#7c3aed',
  bank_id text NOT NULL DEFAULT 'MB',
  bank_account text NOT NULL DEFAULT '0123456789',
  bank_name text NOT NULL DEFAULT 'GAMESHOP VN',
  sepay_api_key text,
  sepay_webhook_secret text,
  maintenance_mode boolean NOT NULL DEFAULT false,
  registration_enabled boolean NOT NULL DEFAULT true,
  deposit_enabled boolean NOT NULL DEFAULT true,
  referral_reward numeric NOT NULL DEFAULT 50000,
  daily_checkin_points int NOT NULL DEFAULT 100,
  referral_commission_percent numeric NOT NULL DEFAULT 5,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_public_select" ON site_settings;
CREATE POLICY "settings_public_select" ON site_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "settings_admin_update" ON site_settings;
CREATE POLICY "settings_admin_update" ON site_settings FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (true);

-- ============================================================
-- DAILY CHECK-INS
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points_awarded int NOT NULL,
  streak_count int NOT NULL DEFAULT 1,
  checkin_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, checkin_date)
);

ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checkin_select_own" ON daily_checkins;
CREATE POLICY "checkin_select_own" ON daily_checkins FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "checkin_insert_own" ON daily_checkins;
CREATE POLICY "checkin_insert_own" ON daily_checkins FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "checkin_admin_all" ON daily_checkins;
CREATE POLICY "checkin_admin_all" ON daily_checkins FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (true);

-- ============================================================
-- FAQS
-- ============================================================
CREATE TABLE IF NOT EXISTS faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "faq_public_select" ON faqs;
CREATE POLICY "faq_public_select" ON faqs FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "faq_admin_all" ON faqs;
CREATE POLICY "faq_admin_all" ON faqs FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (true);

-- ============================================================
-- PRODUCT VIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS product_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "views_insert" ON product_views;
CREATE POLICY "views_insert" ON product_views FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "views_admin_select" ON product_views;
CREATE POLICY "views_admin_select" ON product_views FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_reviews_product ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_reward_user ON reward_points(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_msgs_ticket ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_flash_items_sale ON flash_sale_items(flash_sale_id);
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_checkin_user_date ON daily_checkins(user_id, checkin_date);
CREATE INDEX IF NOT EXISTS idx_faqs_active ON faqs(is_active);

-- ============================================================
-- SEED: MEMBERSHIP RANKS
-- ============================================================
INSERT INTO membership_ranks (rank_key, name, min_amount, discount_percent, cashback_percent, icon, color, gradient, sort_order, benefits) VALUES
  ('member', 'Thành Viên', 0, 0, 0, 'LuUser', '#94a3b8', null, 1, '["Đăng ký tài khoản miễn phí","Mua hàng tự động 24/7","Tích điểm thưởng"]'::jsonb),
  ('dong', 'Đồng', 100000, 2, 1, 'LuMedal', '#cd7f32', 'linear-gradient(90deg,#cd7f32,#e8a951)', 2, '["Giảm 2% mọi đơn hàng","Hoàn tiền 1%","Ưu tiên hỗ trợ"]'::jsonb),
  ('bac', 'Bạc', 500000, 5, 2, 'LuAward', '#c0c0c0', 'linear-gradient(90deg,#c0c0c0,#e8e8e8)', 3, '["Giảm 5% mọi đơn hàng","Hoàn tiền 2%","Mã giảm giá riêng","Quà sinh nhật"]'::jsonb),
  ('vang', 'Vàng', 2000000, 8, 3, 'LuCrown', '#ffd700', 'linear-gradient(90deg,#ffd700,#ffed4e)', 4, '["Giảm 8% mọi đơn hàng","Hoàn tiền 3%","Hỗ trợ ưu tiên cao","Quà nâng hạng"]'::jsonb),
  ('bachkim', 'Bạch Kim', 5000000, 10, 5, 'LuGem', '#e5e4e2', 'linear-gradient(90deg,#e5e4e2,#00e5ff,#ffffff)', 5, '["Giảm 10% mọi đơn hàng","Hoàn tiền 5%","Hỗ trợ VIP 24/7","Quà tặng hàng tháng"]'::jsonb),
  ('kimcuong', 'Kim Cương', 10000000, 12, 7, 'LuDiamond', '#3b82f6', 'linear-gradient(90deg,#3b82f6,#a855f7,#06b6d4)', 6, '["Giảm 12% mọi đơn hàng","Hoàn tiền 7%","Manager riêng","Sản phẩm độc quyền"]'::jsonb),
  ('vip', 'VIP', 20000000, 15, 10, 'LuStar', '#a855f7', 'linear-gradient(90deg,#a855f7,#ec4899,#3b82f6)', 7, '["Giảm 15% mọi đơn hàng","Hoàn tiền 10%","Giao hàng ưu tiên","Sản phẩm giới hạn"]'::jsonb),
  ('supervip', 'Siêu VIP', 50000000, 20, 15, 'LuZap', '#ec4899', 'linear-gradient(90deg,#ec4899,#a855f7,#3b82f6,#06b6d4,#10b981)', 8, '["Giảm 20% mọi đơn hàng","Hoàn tiền 15%","Tất cả quyền hạn cao nhất","Hỗ trợ tức thì","Quà tặng cao cấp"]'::jsonb)
ON CONFLICT (rank_key) DO NOTHING;

-- ============================================================
-- SEED: SITE SETTINGS
-- ============================================================
INSERT INTO site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SEED: FAQS
-- ============================================================
INSERT INTO faqs (question, answer, category, sort_order) VALUES
  ('Làm thế nào để mua hàng?', 'Đăng nhập tài khoản, nạp tiền vào ví, chọn sản phẩm và nhấn Mua Ngay. Hệ thống sẽ tự động giao hàng ngay sau khi thanh toán thành công.', 'general', 1),
  ('Làm thế nào để nạp tiền?', 'Vào trang Nạp Tiền, chọn mệnh giá hoặc nhập số tiền, quét mã QR VietQR và chuyển khoản với đúng nội dung. Hệ thống tự động cộng tiền trong 1-5 phút.', 'payment', 2),
  ('Sản phẩm mua xong có bảo hành không?', 'Có. Mỗi sản phẩm đều có thông tin bảo hành. Nếu có lỗi, bạn có thể báo lỗi hoặc tạo ticket hỗ trợ.', 'product', 3),
  ('Làm sao để lên hạng thành viên?', 'Hạng được tính dựa trên tổng tiền đã nạp hoặc chi tiêu. Nạp tiền và mua hàng để tích lũy và lên hạng, nhận nhiều ưu đãi hơn.', 'account', 4),
  ('Mã giới thiệu hoạt động thế nào?', 'Chia sẻ mã giới thiệu của bạn. Khi bạn bè đăng ký và nạp tiền lần đầu, cả hai đều nhận hoa hồng.', 'account', 5),
  ('Tôi có thể đổi mật khẩu không?', 'Có. Vào Hồ Sơ > Bảo Mật để đổi mật khẩu bất cứ lúc nào.', 'account', 6)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED: BANNERS
-- ============================================================
INSERT INTO banners (title, subtitle, image_url, link_url, button_text, sort_order) VALUES
  ('Flash Sale Cực Sốc', 'Giảm đến 50% acc game hot nhất', null, '/products?featured=true', 'Mua Ngay', 1),
  ('Nạp Tiền Tự Động', 'QR VietQR - Cộng tiền trong 1 phút', null, '/deposit', 'Nạp Tiền', 2),
  ('Random Acc May Mắn', 'Thử vận may - Trúng acc cực phẩm', null, '/products?category=random-acc', 'Thử Ngay', 3)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED: PRODUCTS
-- ============================================================
INSERT INTO products (category_id, name, slug, type, price, original_price, stock, is_featured, is_new, short_description, description, images) 
SELECT c.id, 'Acc LMHT Rank Kim Cương', 'acc-lmht-kim-cuong', 'acc', 99000, 150000, 10, true, false, 'Acc LMHT rank Kim Cương, đầy đủ tướng, skin', 'Tài khoản Liên Minh Huyền Thoại Rank Kim Cương:
- Full tướng
- 50+ skin
- Rank Kim Cương
- Bảo hành 30 ngày', '[]'::jsonb
FROM categories c WHERE c.slug = 'acc-game'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (category_id, name, slug, type, price, original_price, stock, is_featured, is_new, short_description, description, images) 
SELECT c.id, 'Random Acc Valorant', 'random-acc-valorant', 'random_acc', 19000, 39000, -1, true, true, 'Random acc Valorant - Cơ hội trúng acc cực phẩm', 'Random Account Valorant:
- Mỗi lần random là 1 acc
- Có thể trúng từ Iron đến Radiant
- Tỷ lệ trúng acc cao: 10%
- Full agent', '[]'::jsonb
FROM categories c WHERE c.slug = 'random-acc'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (category_id, name, slug, type, price, original_price, stock, is_featured, is_new, short_description, description, images) 
SELECT c.id, 'Tool Auto Cày Thuê Genshin', 'tool-auto-cay-thue-genshin', 'tool', 299000, 499000, 50, true, true, 'Tool tự động cày nhiệm vụ, farm nguyên liệu Genshin', 'Tool Auto Genshin Impact:
- Tự động cày nhiệm vụ hàng ngày
- Farm nguyên liệu tự động
- Đồ họa mượt, không lag
- Hỗ trợ update miễn phí 6 tháng
- Bảo hành 1 năm', '[]'::jsonb
FROM categories c WHERE c.slug = 'tool-hack'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (category_id, name, slug, type, price, original_price, stock, is_featured, is_new, short_description, description, images) 
SELECT c.id, 'Skin AWM Dragon Lore', 'skin-awm-dragon-lore', 'item', 1500000, 2500000, 1, true, false, 'Skin AWM Dragon Lore cực hiếm CS:GO', 'Skin AWM Dragon Lore:
- Factory New
- Full stickers
- Có trade lock 7 ngày
- Giao dịch an toàn qua API', '[]'::jsonb
FROM categories c WHERE c.slug = 'vat-pham'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (category_id, name, slug, type, price, original_price, stock, is_featured, is_new, short_description, description, images) 
SELECT c.id, 'Cày Thuê Rank Tướng Tập', 'cay-thue-rank-tuong-tap', 'service', 500000, 800000, -1, false, true, 'Dịch vụ cày rank Tướng Tập LMHT nhanh chóng', 'Dịch vụ cày thuê rank Tướng Tập:
- Từ Bạc đến Bạch Kim
- Thời gian: 3-7 ngày
- Bảo mật tài khoản 100%
- Hoàn tiền nếu không đạt', '[]'::jsonb
FROM categories c WHERE c.slug = 'cay-thue'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (category_id, name, slug, type, price, original_price, stock, is_featured, is_new, short_description, description, images) 
SELECT c.id, 'File Mod Skin LMHT Mới Nhất', 'file-mod-skin-lmht', 'file', 49000, 99000, -1, false, true, 'File mod skin LMHT 2024, 200+ skin mới nhất', 'File Mod Skin LMHT:
- 200+ skin mới nhất 2024
- Cài đặt dễ dàng
- Không bị ban
- Update miễn phí trọn đời
- Hướng dẫn chi tiết', '[]'::jsonb
FROM categories c WHERE c.slug = 'file-mod'
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- SEED: INVENTORY
-- ============================================================
INSERT INTO product_inventory (product_id, content) 
SELECT id, 'user' || (1000 + floor(random() * 9000)) || '@gmail.com|Pass' || (100 + floor(random() * 900))
FROM products WHERE slug = 'acc-lmht-kim-cuong' 
AND NOT EXISTS (SELECT 1 FROM product_inventory WHERE product_id = products.id);

INSERT INTO product_inventory (product_id, content) 
SELECT id, 'val_user' || (1000 + floor(random() * 9000)) || '|val_pass' || (100 + floor(random() * 900))
FROM products WHERE slug = 'random-acc-valorant' 
AND NOT EXISTS (SELECT 1 FROM product_inventory WHERE product_id = products.id LIMIT 1);

-- ============================================================
-- SEED: COUPONS
-- ============================================================
INSERT INTO discount_codes (code, type, value, min_order, max_uses, is_active) VALUES
  ('WELCOME10', 'percent', 10, 0, 1000, true),
  ('GAMESHOP50K', 'fixed', 50000, 200000, 500, true),
  ('VIP20', 'percent', 20, 500000, 100, true)
ON CONFLICT (code) DO NOTHING;
