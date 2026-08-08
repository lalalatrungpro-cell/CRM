-- =======================================================
-- UPDATE SAMPLE DATA DIACRITICS IN SUPABASE
-- Run this in Supabase -> SQL Editor -> New Query
-- =======================================================

-- 1. Cập nhật tên Nhà cung cấp
UPDATE suppliers SET name = 'Nguồn Netflix US' WHERE name = 'Nguon Netflix US';
UPDATE suppliers SET name = 'Nguồn Google Direct' WHERE name = 'Nguon Google Direct';
UPDATE suppliers SET name = 'Nguồn Canva Sỉ VIP' WHERE name = 'Nguon Canva Si VIP';

-- 2. Cập nhật tên Kho Teams
UPDATE teams SET name = 'Netflix Premium 4K (Kho Acc 5 Màn)' WHERE name = 'Netflix Premium 4K (Kho Acc 5 Man)';
UPDATE teams SET supplier_name = 'Nguồn Netflix US' WHERE supplier_name = 'Nguon Netflix US';
UPDATE teams SET supplier_name = 'Nguồn Google Direct' WHERE supplier_name = 'Nguon Google Direct';
UPDATE teams SET supplier_name = 'Nguồn Canva Sỉ VIP' WHERE supplier_name = 'Nguon Canva Si VIP';

-- 3. Cập nhật tên Sản phẩm mẫu
UPDATE products SET name = 'Google AI Pro (1 năm)' WHERE name = 'Google AI Pro (1 nam)';
UPDATE products SET name = 'Canva Pro (1 tháng)' WHERE name = 'Canva Pro (1 thang)';
UPDATE products SET name = 'Spotify Family (1 tháng)' WHERE name = 'Spotify Family (1 thang)';
UPDATE products SET name = 'YouTube Premium (1 tháng)' WHERE name = 'YouTube Premium (1 thang)';
UPDATE products SET name = 'ChatGPT Plus (1 tháng)' WHERE name = 'ChatGPT Plus (1 thang)';

-- 4. Cập nhật tên đơn hàng
UPDATE orders SET supplier_name = 'Nguồn Netflix US' WHERE supplier_name = 'Nguon Netflix US';
UPDATE orders SET supplier_name = 'Nguồn Google Direct' WHERE supplier_name = 'Nguon Google Direct';
UPDATE orders SET supplier_name = 'Nguồn Canva Sỉ VIP' WHERE supplier_name = 'Nguon Canva Si VIP';
UPDATE orders SET product_name = 'Google AI Pro (1 năm)' WHERE product_name = 'Google AI Pro (1 nam)';
UPDATE orders SET product_name = 'Canva Pro (1 tháng)' WHERE product_name = 'Canva Pro (1 thang)';
