import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { Database, AlertCircle, CheckCircle } from 'lucide-react';

export default function MigratePage() {
  const { shopId } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [success, setSuccess] = useState(false);

  const isUuid = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  const runMigration = async () => {
    setLoading(true);
    setStatus('Đang kiểm tra quyền và shop...');

    try {
      // 0. Ensure targetShopId is a valid UUID for Supabase
      let targetShopId = shopId;
      if (!isUuid(targetShopId)) {
        try {
          const { data: prof } = await supabase.from('profiles').select('shop_id').single();
          if (prof?.shop_id && isUuid(prof.shop_id)) {
            targetShopId = prof.shop_id;
          }
        } catch (e) {
          // ignore
        }
      }
      if (!isUuid(targetShopId)) {
        try {
          const { data: shops } = await supabase.from('shops').select('id').limit(1);
          if (shops && shops.length > 0 && isUuid(shops[0].id)) {
            targetShopId = shops[0].id;
          }
        } catch (e) {
          // ignore
        }
      }
      if (!isUuid(targetShopId)) {
        targetShopId = '00000000-0000-0000-0000-000000000001';
      }

      setStatus('Đang đọc dữ liệu từ LocalStorage...');
      let localData = null;
      const raw = localStorage.getItem('mini_crm_data');
      if (raw) {
        try { localData = JSON.parse(raw); } catch (e) {}
      }
      if (!localData) {
        localData = {
          products: JSON.parse(localStorage.getItem('crm_demo_products') || '[]'),
          suppliers: JSON.parse(localStorage.getItem('crm_demo_suppliers') || '[]'),
          teams: JSON.parse(localStorage.getItem('crm_demo_teams') || '[]'),
          customers: JSON.parse(localStorage.getItem('crm_demo_customers') || '[]'),
          orders: JSON.parse(localStorage.getItem('crm_demo_orders') || '[]'),
          careLogs: JSON.parse(localStorage.getItem('crm_demo_care_logs') || '[]'),
          customChannels: JSON.parse(localStorage.getItem('crm_demo_customChannels') || '[]'),
          vietqr: JSON.parse(localStorage.getItem('crm_demo_vietqr') || 'null')
        };
      }

      const hasData = (localData.products?.length || 0) + (localData.customers?.length || 0) + (localData.orders?.length || 0) > 0;
      if (!hasData) {
        throw new Error('Không tìm thấy dữ liệu cũ (Sản phẩm, Khách hàng hoặc Đơn hàng) trong LocalStorage.');
      }

      // 1. Migrate customChannels
      setStatus('Đang đồng bộ Kênh bán hàng custom...');
      if (localData.customChannels && localData.customChannels.length > 0) {
        const channelsToInsert = localData.customChannels.map(c => ({
          shop_id: targetShopId,
          channel_type: c.channel || 'Facebook Page',
          name: c.name
        }));
        await supabase.from('channels').insert(channelsToInsert);
      }

      // 2. Migrate vietqr settings
      setStatus('Đang đồng bộ cấu hình VietQR...');
      if (localData.vietqr) {
        const vqr = localData.vietqr;
        await supabase.from('vietqr_settings').upsert({
          shop_id: targetShopId,
          bank_id: vqr.bankId || 'MB',
          account_no: vqr.accountNo || '',
          account_name: vqr.accountName || '',
          template: vqr.template || 'compact2',
          memo_prefix: vqr.memoPrefix || 'DON'
        });
      }

      // 3. Migrate Products
      setStatus('Đang đồng bộ danh mục Sản phẩm...');
      const productMap = {};
      if (localData.products && localData.products.length > 0) {
        for (const p of localData.products) {
          const { data, error } = await supabase.from('products').insert({
            shop_id: targetShopId,
            name: p.name,
            category: p.category,
            default_cost: p.defaultCost || 0,
            default_sell: p.defaultSell || 0,
            default_duration_days: p.defaultDurationDays || 30,
            max_slots: p.maxSlots || 1
          }).select().single();

          if (!error && data) {
            productMap[p.id] = data.id;
          }
        }
      }

      // 4. Migrate Suppliers
      setStatus('Đang đồng bộ danh sách Nhà cung cấp...');
      const supplierMap = {};
      if (localData.suppliers && localData.suppliers.length > 0) {
        for (const s of localData.suppliers) {
          const { data, error } = await supabase.from('suppliers').insert({
            shop_id: targetShopId,
            name: s.name,
            phone: s.phone || '',
            zalo: s.zalo || '',
            telegram: s.telegram || '',
            social: s.social || '',
            notes: s.notes || '',
            debt: s.debt || 0
          }).select().single();

          if (!error && data) {
            supplierMap[s.id] = data.id;
          }
        }
      }

      // 5. Migrate Teams
      setStatus('Đang đồng bộ danh sách Teams...');
      const teamMap = {};
      if (localData.teams && localData.teams.length > 0) {
        for (const t of localData.teams) {
          const newSuppId = supplierMap[t.supplierId] || null;
          const { data, error } = await supabase.from('teams').insert({
            shop_id: targetShopId,
            supplier_id: newSuppId,
            supplier_name: t.supplierName || '',
            name: t.name,
            category: t.category,
            type: t.type || 'Team Member',
            infor: t.infor || '',
            max_slots: t.maxSlots || 1,
            purchase_date: t.purchaseDate || null,
            expire_date: t.expireDate || null,
            notes: t.notes || ''
          }).select().single();

          if (!error && data) {
            teamMap[t.id] = data.id;
          }
        }
      }

      // 6. Migrate Customers
      setStatus('Đang đồng bộ danh sách Khách hàng...');
      const customerMap = {};
      if (localData.customers && localData.customers.length > 0) {
        for (const c of localData.customers) {
          const { data, error } = await supabase.from('customers').insert({
            shop_id: targetShopId,
            name: c.name,
            phone: c.phone || '',
            email: c.email || '',
            type: c.type || 'Le',
            source: c.source || '',
            notes: c.notes || '',
            debt: c.debt || 0
          }).select().single();

          if (!error && data) {
            customerMap[c.id] = data.id;
          }
        }
      }

      // 7. Migrate Orders
      setStatus('Đang đồng bộ danh sách Đơn hàng...');
      const orderMap = {};
      if (localData.orders && localData.orders.length > 0) {
        for (const o of localData.orders) {
          const newCustId = customerMap[o.customerId] || null;
          const newSuppId = supplierMap[o.supplierId] || null;
          const newTeamId = teamMap[o.teamId] || null;
          
          let cleanStatus = 'Đã thanh toán';
          if (o.status === 'No' || o.status === 'no' || o.status === 'Nợ') {
            cleanStatus = 'Nợ';
          }

          const { data, error } = await supabase.from('orders').insert({
            shop_id: targetShopId,
            customer_id: newCustId,
            customer_name: o.customerName || '',
            phone: o.phone || '',
            supplier_id: newSuppId,
            supplier_name: o.supplierName || '',
            team_id: newTeamId,
            product_name: o.productName || '',
            infor: o.infor || '',
            cost_price: o.costPrice || 0,
            sell_price: o.sellPrice || 0,
            status: cleanStatus,
            purchase_date: o.purchaseDate || o.date || null,
            expire_date: o.expireDate || null,
            duration_days: o.durationDays || 30,
            supplier_paid: !!o.supplierPaid,
            warranty_count: o.warrantyCount || 0,
            source: o.source || '',
            channel: o.channel || ''
          }).select().single();

          if (!error && data) {
            orderMap[o.id] = data.id;
          }
        }

        // 7.2 Update renewed_from references in orders
        setStatus('Đang cập nhật liên kết gia hạn đơn hàng...');
        for (const o of localData.orders) {
          if (o.renewedFrom && orderMap[o.renewedFrom]) {
            const newOrderId = orderMap[o.id];
            const newRenewedFromId = orderMap[o.renewedFrom];
            if (newOrderId && newRenewedFromId) {
              await supabase.from('orders')
                .update({ renewed_from: newRenewedFromId })
                .eq('id', newOrderId);
            }
          }
        }
      }

      // 8. Migrate Care Logs
      setStatus('Đang đồng bộ Nhật ký chăm sóc...');
      if (localData.careLogs && localData.careLogs.length > 0) {
        const careLogsToInsert = localData.careLogs.map(l => ({
          shop_id: targetShopId,
          customer_id: customerMap[l.customerId],
          type: l.type || 'Khác',
          content: l.content || '',
          created_at: l.date ? new Date(l.date).toISOString() : new Date().toISOString()
        })).filter(l => l.customer_id !== undefined);
        
        if (careLogsToInsert.length > 0) {
          await supabase.from('care_logs').insert(careLogsToInsert);
        }
      }

      setStatus('Hoàn tất!');
      setSuccess(true);
      toast.success('Di chuyển toàn bộ dữ liệu lên đám mây Supabase thành công!');
    } catch (err) {
      console.error(err);
      setStatus(`Lỗi: ${err.message}`);
      toast.error(`Di chuyển thất bại: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div className="glass-panel" style={{ padding: '40px', width: '100%', maxWidth: '500px', textAlign: 'center' }}>
        <div style={{ 
          width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px'
        }}>
          <Database size={30} color="#6366f1" />
        </div>
        
        <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '10px' }}>Di chuyển Dữ liệu cũ lên Đám mây</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.5 }}>
          Trang này giúp đồng bộ toàn bộ dữ liệu lịch sử (Khách hàng, Đơn hàng, Nguồn sỉ, Teams, Nhật ký chăm sóc) từ trình duyệt máy tính này lên database Supabase của bạn.
        </p>

        {status && (
          <div style={{ 
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '10px', padding: '12px', marginBottom: '24px', fontSize: '13.5px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            color: success ? '#10b981' : '#f59e0b'
          }}>
            {success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{status}</span>
          </div>
        )}

        <button 
          onClick={runMigration} 
          className="glass-button" 
          style={{ width: '100%', padding: '12px', fontWeight: '700' }}
          disabled={loading || success}
        >
          {loading ? 'Đang thực hiện đồng bộ...' : success ? 'Đã đồng bộ xong' : 'Bắt đầu di chuyển dữ liệu'}
        </button>
      </div>
    </div>
  );
}
