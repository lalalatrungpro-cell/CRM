import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useToast } from '../components/Toast';
import { 
  Key, ShieldCheck, Plus, RefreshCw, Copy, Check, Lock, Unlock, 
  Calendar, Building, Phone, User, Clock, AlertTriangle, Trash2
} from 'lucide-react';

export default function Licenses() {
  const { addToast } = useToast();
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  const [formData, setFormData] = useState({
    key: '',
    school_name: '',
    contact_name: '',
    contact_phone: '',
    plan: 'basic',
    max_classes: 1,
    expiry_date: '',
    notes: ''
  });

  const generateRandomKey = (schoolName = '') => {
    const year = new Date().getFullYear();
    const cleanSchool = schoolName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 7)
      .toUpperCase() || 'TRUONG';
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `MNP-${year}-${cleanSchool}-${rand}`;
  };

  const loadLicenses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mamnonpro_licenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLicenses(data || []);
    } catch (err) {
      console.error('Lỗi tải danh sách license:', err);
      addToast('Không thể tải danh sách license từ Supabase', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLicenses();
  }, []);

  const openCreateModal = () => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const defaultExpiry = nextYear.toISOString().split('T')[0];

    setFormData({
      key: generateRandomKey(''),
      school_name: '',
      contact_name: '',
      contact_phone: '',
      plan: 'basic',
      max_classes: 1,
      expiry_date: defaultExpiry,
      notes: ''
    });
    setShowModal(true);
  };

  const handleCreateLicense = async (e) => {
    e.preventDefault();
    if (!formData.key.trim() || !formData.school_name.trim() || !formData.expiry_date) {
      addToast('Vui lòng điền đủ Tên trường, Key và Ngày hết hạn', 'warning');
      return;
    }

    try {
      const { error } = await supabase
        .from('mamnonpro_licenses')
        .insert([{
          key: formData.key.trim().toUpperCase(),
          school_name: formData.school_name.trim(),
          contact_name: formData.contact_name.trim(),
          contact_phone: formData.contact_phone.trim(),
          plan: formData.plan,
          max_classes: parseInt(formData.max_classes) || 1,
          expiry_date: formData.expiry_date,
          notes: formData.notes.trim(),
          is_active: true
        }]);

      if (error) throw error;

      addToast('✅ Cấp license mới thành công!', 'success');
      setShowModal(false);
      loadLicenses();
    } catch (err) {
      console.error('Lỗi tạo license:', err);
      addToast('Lỗi: ' + (err.message || 'Không thể tạo license'), 'error');
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('mamnonpro_licenses')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      addToast(currentStatus ? 'Đã tạm khóa license' : 'Đã mở khóa license', 'success');
      loadLicenses();
    } catch (err) {
      addToast('Lỗi thay đổi trạng thái license', 'error');
    }
  };

  const handleExtendOneYear = async (id, currentExpiry) => {
    const d = new Date(currentExpiry);
    d.setFullYear(d.getFullYear() + 1);
    const newExpiry = d.toISOString().split('T')[0];

    try {
      const { error } = await supabase
        .from('mamnonpro_licenses')
        .update({ expiry_date: newExpiry, is_active: true })
        .eq('id', id);

      if (error) throw error;
      addToast(`✅ Đã gia hạn thêm 1 năm (đến ${newExpiry})`, 'success');
      loadLicenses();
    } catch (err) {
      addToast('Lỗi khi gia hạn', 'error');
    }
  };

  const handleDeleteLicense = async (id, schoolName) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn license của "${schoolName}"?`)) return;
    try {
      const { error } = await supabase
        .from('mamnonpro_licenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      addToast('Đã xóa license', 'success');
      loadLicenses();
    } catch (err) {
      addToast('Lỗi khi xóa license', 'error');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    addToast('Đã sao chép License Key vào bộ nhớ tạm!', 'success');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const now = new Date();
  const activeCount = licenses.filter(l => l.is_active && new Date(l.expiry_date) >= now).length;
  const expiringSoonCount = licenses.filter(l => {
    if (!l.is_active) return false;
    const diffDays = Math.ceil((new Date(l.expiry_date) - now) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  }).length;
  const expiredCount = licenses.filter(l => new Date(l.expiry_date) < now || !l.is_active).length;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', spaceY: '24px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ padding: '6px', background: 'rgba(16,185,129,0.15)', color: '#10b981', borderRadius: '10px' }}>
              <Key size={22} />
            </span>
            Quản Lý License MamNonPro
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>
            Hệ thống cấp phép, kiểm soát thời hạn & phân phối webapp mầm non
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
          <button
            onClick={loadLicenses}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '10px',
              background: '#1e293b', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.08)',
              fontSize: '13px', fontWeight: '600', cursor: 'pointer'
            }}
          >
            <RefreshCw size={15} /> Làm Mới
          </button>
          <button
            onClick={openCreateModal}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none',
              fontSize: '13px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
            }}
          >
            <Plus size={16} /> Cấp License Mới
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#111528', padding: '18px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>TỔNG LICENSE ĐANG CHẠY</div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: '#10b981', marginTop: '6px' }}>{activeCount}</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Trường/lớp đang sử dụng bình thường</div>
        </div>
        <div style={{ background: '#111528', padding: '18px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>SẮP HẾT HẠN (≤ 30 NGÀY)</div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: '#f59e0b', marginTop: '6px' }}>{expiringSoonCount}</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Cần liên hệ gia hạn thu phí</div>
        </div>
        <div style={{ background: '#111528', padding: '18px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>HẾT HẠN / ĐÃ KHÓA</div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: '#ef4444', marginTop: '6px' }}>{expiredCount}</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Ứng dụng tự động bị khóa</div>
        </div>
      </div>

      {/* License Table */}
      <div style={{ background: '#111528', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#e2e8f0' }}>Danh Sách Trường Được Cấp Bản Quyền ({licenses.length})</span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu license...</div>
        ) : licenses.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Chưa có license nào được cấp. Bấm <strong>"Cấp License Mới"</strong> để tạo key đầu tiên!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: 'left', color: '#94a3b8', fontSize: '11.5px' }}>
                  <th style={{ padding: '12px 18px' }}>TRƯỜNG & KHÁCH HÀNG</th>
                  <th style={{ padding: '12px 18px' }}>LICENSE KEY</th>
                  <th style={{ padding: '12px 18px' }}>GÓI</th>
                  <th style={{ padding: '12px 18px' }}>HẠN DÙNG</th>
                  <th style={{ padding: '12px 18px' }}>TRẠNG THÁI</th>
                  <th style={{ padding: '12px 18px' }}>LẦN CUỐI CHECK</th>
                  <th style={{ padding: '12px 18px', textAlign: 'right' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {licenses.map(lic => {
                  const expiry = new Date(lic.expiry_date);
                  const isExp = expiry < now;
                  const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
                  const isNearExp = !isExp && daysLeft <= 30;

                  return (
                    <tr key={lic.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#f8fafc' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: '700', color: '#fff' }}>{lic.school_name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          {lic.contact_name} {lic.contact_phone ? `· ${lic.contact_phone}` : ''}
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <code style={{ background: '#1e293b', padding: '4px 8px', borderRadius: '6px', color: '#38bdf8', fontSize: '12px', fontWeight: '700' }}>
                            {lic.key}
                          </code>
                          <button
                            onClick={() => copyToClipboard(lic.key)}
                            title="Sao chép Key"
                            style={{ background: 'transparent', border: 'none', color: copiedKey === lic.key ? '#10b981' : '#64748b', cursor: 'pointer', padding: '4px' }}
                          >
                            {copiedKey === lic.key ? <Check size={15} /> : <Copy size={15} />}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
                          background: lic.plan === 'premium' ? 'rgba(168,85,247,0.15)' : lic.plan === 'school' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)',
                          color: lic.plan === 'premium' ? '#c084fc' : lic.plan === 'school' ? '#60a5fa' : '#34d399'
                        }}>
                          {lic.plan === 'premium' ? 'Premium' : lic.plan === 'school' ? 'Trường' : 'Cơ Bản'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: '600' }}>{lic.expiry_date}</div>
                        <div style={{
                          fontSize: '11px', fontWeight: '700', marginTop: '2px',
                          color: !lic.is_active ? '#ef4444' : isExp ? '#ef4444' : isNearExp ? '#f59e0b' : '#10b981'
                        }}>
                          {!lic.is_active ? 'Bị khóa' : isExp ? 'Đã hết hạn' : `Còn ${daysLeft} ngày`}
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
                          background: !lic.is_active ? 'rgba(239,68,68,0.15)' : isExp ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                          color: !lic.is_active ? '#f87171' : isExp ? '#f87171' : '#34d399'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }}></span>
                          {!lic.is_active ? 'Đã Khóa' : isExp ? 'Hết Hạn' : 'Hoạt Động'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '11px', color: '#64748b' }}>
                        {lic.last_validated_at ? new Date(lic.last_validated_at).toLocaleDateString('vi-VN') : 'Chưa kích hoạt'}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={() => handleExtendOneYear(lic.id, lic.expiry_date)}
                            title="Gia hạn thêm 1 năm"
                            style={{
                              padding: '5px 10px', borderRadius: '6px',
                              background: '#1e293b', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.2)',
                              fontSize: '11px', fontWeight: '700', cursor: 'pointer'
                            }}
                          >
                            +1 Năm
                          </button>
                          <button
                            onClick={() => handleToggleActive(lic.id, lic.is_active)}
                            title={lic.is_active ? 'Khóa license' : 'Mở khóa'}
                            style={{
                              padding: '6px', borderRadius: '6px',
                              background: '#1e293b', color: lic.is_active ? '#f59e0b' : '#10b981', border: 'none', cursor: 'pointer'
                            }}
                          >
                            {lic.is_active ? <Lock size={14} /> : <Unlock size={14} />}
                          </button>
                          <button
                            onClick={() => handleDeleteLicense(lic.id, lic.school_name)}
                            title="Xóa license"
                            style={{
                              padding: '6px', borderRadius: '6px',
                              background: '#1e293b', color: '#ef4444', border: 'none', cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px'
        }}>
          <div style={{
            background: '#111528', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px',
            maxWidth: '520px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 16px 0', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={18} color="#10b981" /> Cấp License MamNonPro Mới
            </h2>

            <form onSubmit={handleCreateLicense} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>TÊN TRƯỜNG MẦM NON *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Mầm Non Hoa Hồng (Q.1, TP.HCM)"
                  value={formData.school_name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setFormData({ ...formData, school_name: name, key: generateRandomKey(name) });
                  }}
                  style={{
                    width: '100%', padding: '10px 12px', background: '#0a0d18',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                    color: '#fff', fontSize: '13px', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: '700', color: '#94a3b8' }}>LICENSE KEY TỰ TẠO *</label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, key: generateRandomKey(formData.school_name) })}
                    style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    🎲 Tạo key khác
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value.toUpperCase() })}
                  style={{
                    width: '100%', padding: '10px 12px', background: '#0a0d18',
                    border: '1px solid #10b981', borderRadius: '10px',
                    color: '#34d399', fontSize: '13px', fontFamily: 'monospace', fontWeight: '700', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>GÓI DỊCH VỤ</label>
                  <select
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 12px', background: '#0a0d18',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                      color: '#fff', fontSize: '13px', boxSizing: 'border-box'
                    }}
                  >
                    <option value="basic">🌱 Gói Cơ Bản (1 lớp)</option>
                    <option value="school">🏫 Gói Toàn Trường</option>
                    <option value="premium">⭐ Gói Premium VIP</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>NGÀY HẾT HẠN *</label>
                  <input
                    type="date"
                    required
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 12px', background: '#0a0d18',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                      color: '#fff', fontSize: '13px', boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>NGƯỜI ĐẠI DIỆN / CÔ</label>
                  <input
                    type="text"
                    placeholder="Cô Lan"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 12px', background: '#0a0d18',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                      color: '#fff', fontSize: '13px', boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>SỐ ĐIỆN THOẠI / ZALO</label>
                  <input
                    type="text"
                    placeholder="0909xxxxxx"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 12px', background: '#0a0d18',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                      color: '#fff', fontSize: '13px', boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>GHI CHÚ NỘI BỘ</label>
                <textarea
                  rows="2"
                  placeholder="Ghi chú giá tiền đã thu, hình thức CK, ngày bàn giao..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={{
                    width: '100%', padding: '8px 12px', background: '#0a0d18',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                    color: '#fff', fontSize: '12px', boxSizing: 'border-box', resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '9px 16px', borderRadius: '10px',
                    background: '#1e293b', color: '#94a3b8', border: 'none',
                    fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                  }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '9px 20px', borderRadius: '10px',
                    background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none',
                    fontSize: '13px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
                  }}
                >
                  Tạo &amp; Cấp Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
