import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { Database, AlertCircle, CheckCircle } from 'lucide-react';

export default function MigratePage() {
  const { shopId, user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [success, setSuccess] = useState(false);

  const runMigration = async () => {
    if (!shopId) {
      return toast.error('Vui lòng tạo Shop và Profile trước khi thực hiện di chuyển dữ liệu!');
    }

    setLoading(true);
    setStatus('Đang đọc dữ liệu từ LocalStorage...');
    
    try {
      const raw = localStorage.getItem('mini_crm_data');
      if (!raw) {
        throw new Error('Không tìm thấy dữ liệu mini_crm_data trong trình duyệt hiện tại.');
      }
      
      const localData = JSON.parse(raw);
      
      // 1. Migrate customChannels
      setStatus('Đang đồng bộ Kênh bán hàng custom...');
      if (localData.customChannels && localData.customChannels.length > 0) {
        const channelsToInsert = localData.customChannels.map(c => ({
          shop_id: shopId,
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
          shop_id: shopId,
          bank_id: vqr.bankId || 'MB',
          account_no: vqr.accountNo || '',
          account_name: vqr.accountName || '',
          template: vqr.template || 'compact2',
          memo_prefix: vqr.memoPrefix || 'DON'
        });
      }

      // 3. Migrate Products
      setStatus('Đang đồng bộ danh mục Sản phẩm...');
      const productMap = {}; // oldId -> newId
      if (localData.products && localData.products.length > 0) {
        for (const p of localData.products) {
          const { data, error } = await supabase.from('products').insert({
            shop_id: shopId,
            name: p.name,
            category: p.category,
            default_cost: p.defaultCost || 0,
            default_sell: p.defaultSell || 0,
            default_duration_days: p.defaultDurationDays || 30,
            max_slots: p.maxSlots || 1
          }).select().single();

          if (error) throw error;
          productMap[p.id] = data.id;
        }
      }

      // 4. Migrate Suppliers
      setStatus('Đang đồng bộ danh sách Nhà cung cấp...');
      const supplierMap = {}; // oldId -> newId
      if (localData.suppliers && localData.suppliers.length > 0) {
        for (const s of localData.suppliers) {
          const { data, error } = await supabase.from('suppliers').insert({
            shop_id: shopId,
            name: s.name,
            phone: s.phone || '',
            zalo: s.zalo || '',
            telegram: s.telegram || '',
            social: s.social || '',
            notes: s.notes || '',
            debt: s.debt || 0
          }).select().single();

          if (error) throw error;
          supplierMap[s.id] = data.id;
        }
      }

      // 5. Migrate Teams
      setStatus('Đang đồng bộ danh sách Teams...');
      const teamMap = {}; // oldId -> newId
      if (localData.teams && localData.teams.length > 0) {
        for (const t of localData.teams) {
          const newSuppId = supplierMap[t.supplierId] || null;
          const { data, error } = await supabase.from('teams').insert({
            shop_id: shopId,
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

          if (error) throw error;
          teamMap[t.id] = data.id;
        }
      }

      // 6. Migrate Customers
      setStatus('Đang đồng bộ danh sách Khách hàng...');
      const customerMap = {}; // oldId -> newId
      if (localData.customers && localData.customers.length > 0) {
        for (const c of localData.customers) {
          const { data, error } = await supabase.from('customers').insert({
            shop_id: shopId,
            name: c.name,
            phone: c.phone || '',
            email: c.email || '',
            type: c.type || 'Le',
            source: c.source || '',
            notes: c.notes || '',
            debt: c.debt || 0
          }).select().single();

          if (error) throw error;
          customerMap[c.id] = data.id;
        }
      }

      // 7. Migrate Orders
      setStatus('Đang đồng bộ danh sách Đơn hàng...');
      const orderMap = {}; // oldId -> newId
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
            shop_id: shopId,
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

          if (error) throw error;
          orderMap[o.id] = data.id;
        }

        // 7.2 Update renewed_from references in orders
        setStatus('Đang cập nhật liên kết gia hạn đơn hàng...');
        for (const o of localData.orders) {
          if (o.renewedFrom && orderMap[o.renewedFrom]) {
            const newOrderId = orderMap[o.id];
            const newRenewedFromId = orderMap[o.renewedFrom];
            await supabase.from('orders')
              .update({ renewed_from: newRenewedFromId })
              .eq('id', newOrderId);
          }
        }
      }

      // 8. Migrate Care Logs
      setStatus('Đang đồng bộ Nhật ký chăm sóc...');
      if (localData.careLogs && localData.careLogs.length > 0) {
        const careLogsToInsert = localData.careLogs.map(l => ({
          shop_id: shopId,
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
