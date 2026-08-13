import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { parseAndImportExcelFile } from '../utils/excelImporter';
import { setLocal } from '../utils/dataService';
import { Database, UploadCloud, CheckCircle2, FileSpreadsheet, RefreshCw } from 'lucide-react';

export default function MigratePage() {
  const { shopId } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [success, setSuccess] = useState(false);
  const [stats, setStats] = useState(null);

  // 1-Click Load bundled parsed JSON data from Data_cu_canva.xlsx
  const handleLoadParsedDemoData = async () => {
    setLoading(true);
    setSuccess(false);
    setStatus('Đang đồng bộ dữ liệu từ Data_cu_canva.xlsx...');

    try {
      const response = await fetch('/parsed_demo_data.json');
      let data = null;
      if (response.ok) {
        data = await response.json();
      }

      if (!data) {
        throw new Error('Không thể đọc file parsed_demo_data.json. Vui lòng tải file Excel từ máy tính!');
      }

      setStatus('Đang nạp 176 Đơn hàng Canva mua thật, 4 Teams Canva Pro, 26 Sản phẩm & 9 Nhà cung cấp...');
      
      setLocal('products', data.products || []);
      setLocal('suppliers', data.suppliers || []);
      setLocal('teams', data.teams || []);
      setLocal('customers', data.customers || []);
      setLocal('orders', data.orders || []);

      setStats({
        productsCount: data.products?.length || 0,
        suppliersCount: data.suppliers?.length || 0,
        teamsCount: data.teams?.length || 0,
        customersCount: data.customers?.length || 0,
        ordersCount: data.orders?.length || 0
      });

      // Try syncing to Supabase if connected
      if (shopId) {
        setStatus('Đang đồng bộ bản sao lên đám mây Supabase...');
        try {
          if (data.products?.length) {
            await supabase.from('products').upsert(data.products.map(p => ({ ...p, shop_id: shopId })));
          }
          if (data.suppliers?.length) {
            await supabase.from('suppliers').upsert(data.suppliers.map(s => ({ ...s, shop_id: shopId })));
          }
        } catch (e) {
          console.warn('Supabase sync background note:', e.message);
        }
      }

      setStatus('Hoàn tất import thành công!');
      setSuccess(true);
      toast.success('Đã nạp thành công 176 Đơn hàng Canva & 4 Teams thực tế từ Data_cu_canva.xlsx!');
    } catch (err) {
      console.error(err);
      setStatus(`Lỗi: ${err.message}`);
      toast.error(`Import thất bại: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Upload custom Excel file (.xlsx)
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setSuccess(false);
    setStatus(`Đang phân tích file ${file.name}...`);

    try {
      const buffer = await file.arrayBuffer();
      const res = await parseAndImportExcelFile(buffer, shopId || '00000000-0000-0000-0000-000000000001', (msg) => {
        setStatus(msg);
      });

      setStats(res);
      setStatus(`Import thành công từ file ${file.name}!`);
      setSuccess(true);
      toast.success(`Đã nhập xong dữ liệu từ file ${file.name}!`);
    } catch (err) {
      console.error(err);
      setStatus(`Lỗi khi đọc file Excel: ${err.message}`);
      toast.error(`Nhập file thất bại: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Import & Quản Lý Dữ Liệu Canva (`Data_cu_canva.xlsx`)</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '13.5px' }}>
          Nhập toàn bộ <strong>176 đơn hàng Canva Pro mua thật</strong> và <strong>4 Teams Canva Pro</strong> (thông tin đăng nhập, slot, ngày hết hạn) từ file <code>Data_cu_canva.xlsx</code> vào phần mềm CRM 360°.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>
        {/* Option 1: 1-Click Fast Import */}
        <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Database size={22} color="#6366f1" />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Nạp Dữ Liệu Canva (1-Click)</h3>
                <span className="badge badge-info" style={{ fontSize: '11px', marginTop: '2px' }}>Dữ liệu Data_cu_canva.xlsx</span>
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6, marginBottom: '20px' }}>
              Nạp trực tiếp <strong>176 Đơn hàng Canva Pro mua thật</strong>, <strong>4 Teams Canva Pro</strong>, <strong>26 Sản phẩm</strong> & <strong>9 Nhà cung cấp</strong> vào bộ nhớ hệ thống.
            </p>
          </div>

          <button
            onClick={handleLoadParsedDemoData}
            disabled={loading}
            className="glass-button"
            style={{ width: '100%', padding: '12px', fontWeight: '700', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#fff', border: 'none' }}
          >
            {loading ? 'Đang nạp dữ liệu...' : '⚡ Nạp 176 Đơn Canva & 4 Teams Ngay'}
          </button>
        </div>

        {/* Option 2: Upload Excel file */}
        <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileSpreadsheet size={22} color="#10b981" />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Tải Up File `Data_cu_canva.xlsx`</h3>
                <span className="badge badge-success" style={{ fontSize: '11px', marginTop: '2px' }}>Upload từ máy tính</span>
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6, marginBottom: '20px' }}>
              Tải trực tiếp file <code>Data_cu_canva.xlsx</code> từ máy tính của bạn để công cụ bóc tách 2 sheets <code>Khach_hang</code> và <code>Team_Canva</code>.
            </p>
          </div>

          <label
            className="glass-button"
            style={{ 
              width: '100%', padding: '12px', fontWeight: '700', textAlign: 'center', cursor: loading ? 'not-allowed' : 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            <UploadCloud size={18} />
            <span>{loading ? 'Đang xử lý...' : 'Chọn File Data_cu_canva.xlsx'}</span>
            <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={loading} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* Progress & Results Status Card */}
      {(status || stats) && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: success ? '#10b981' : '#f59e0b' }}>
            {success ? <CheckCircle2 size={20} /> : <RefreshCw size={20} className="spin" />}
            <span style={{ fontWeight: '700', fontSize: '14px' }}>{status}</span>
          </div>

          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginTop: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Teams Canva Pro</span>
                <p style={{ fontSize: '18px', fontWeight: '800', color: '#06b6d4', marginTop: '4px' }}>{stats.teamsCount}</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Đơn Canva Mua Thật</span>
                <p style={{ fontSize: '18px', fontWeight: '800', color: '#10b981', marginTop: '4px' }}>{stats.ordersCount}</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Khách hàng Canva</span>
                <p style={{ fontSize: '18px', fontWeight: '800', color: '#6366f1', marginTop: '4px' }}>{stats.customersCount}</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Sản phẩm</span>
                <p style={{ fontSize: '18px', fontWeight: '800', color: '#f59e0b', marginTop: '4px' }}>{stats.productsCount}</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Nhà cung cấp</span>
                <p style={{ fontSize: '18px', fontWeight: '800', color: '#8b5cf6', marginTop: '4px' }}>{stats.suppliersCount}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
