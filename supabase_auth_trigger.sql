-- =======================================================
-- SUPABASE AUTOMATIC ONBOARDING TRIGGER
-- Run this in Supabase -> SQL Editor -> New Query
-- =======================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_shop_id UUID;
BEGIN
  -- 1. Create a shop for the new owner
  INSERT INTO public.shops (name, owner_id)
  VALUES ('Cửa hàng của ' || COALESCE(new.raw_user_meta_data->>'full_name', new.email), new.id)
  RETURNING id INTO new_shop_id;

  -- 2. Create the owner profile linking to that shop as admin
  INSERT INTO public.profiles (id, shop_id, full_name, role)
  VALUES (
    new.id,
    new_shop_id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'admin'
  );

  -- 3. Create default channels for the shop
  INSERT INTO public.channels (shop_id, channel_type, name)
  VALUES 
    (new_shop_id, 'Facebook Page', 'Page Canva Pro Giá Sỉ'),
    (new_shop_id, 'Facebook Page', 'Page Netflix & AI Store'),
    (new_shop_id, 'Zalo', 'Zalo Hotline 0901234567'),
    (new_shop_id, 'Zalo', 'Zalo CSKH 0987654321'),
    (new_shop_id, 'TikTok Shop', 'TikTok Store Canva VN');

  -- 4. Create default VietQR setting
  INSERT INTO public.vietqr_settings (shop_id, bank_id, account_no, account_name, template, memo_prefix)
  VALUES (new_shop_id, 'MB', '0901234567', 'SHOP DROPSHIP CRM', 'compact2', 'DON');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: chạy sau khi insert vào auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
