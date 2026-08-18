import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CustomerService, OrderService, clearAllSystemData } from '../utils/dataService';
import { exportToExcel } from '../utils/excelExport';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { parseAndImportCanvaExcel } from '../utils/canvaImporter';
import {
  Users, Plus, Download, Search, Eye, Edit2, Trash2, X, ChevronLeft, ChevronRight, Wallet, DollarSign, MapPin, Mail, MessageCircle, FileSpreadsheet
} from 'lucide-react';

const PAGE_SIZE = 15;

const TYPE_MAP = {
  'Le': 'Khách Lẻ',
  'CTV': 'Cộng Tác Viên',
  'Si': 'Khách Sỉ'
};

const SOURCE_OPTIONS = [
  'Facebook Page',
  'Zalo',
  'TikTok Shop',
  'Telegram',
  'Giới Thiệu',
  'Website',
  'Khác'
];

export default function Customers() {
  const navigate = useNavigate();
  const toast = useToast();
  const { shopId } = useAuth();

  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  // Modals & Forms
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const emptyForm = {
    name: '',
    phone: '',
    email: '',
    type: 'Le',
    source: 'Facebook Page',
    sub_channel: '',
    address: '',
    notes: ''
  };

  const [formData, setFormData] = useState(emptyForm);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [copiedZaloMsg, setCopiedZaloMsg] = useState('');

  const loadData = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const [custList, orderList] = await Promise.all([
        CustomerService.list(shopId),
        OrderService.list(shopId)
      ]);
      setCustomers(custList || []);
      setOrders(orderList || []);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải danh sách khách hàng từ Supabase!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [shopId]);

  const closeModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
    setFormData(emptyForm);
  };

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const handleOpenEditModal = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      type: customer.type || 'Le',
      source: customer.source || 'Facebook Page',
      sub_channel: customer.sub_channel || customer.subChannel || '',
      address: customer.address || '',
      notes: customer.notes || ''
    });
    setShowModal(true);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Vui lòng nhập tên khách hàng!');

    const payload = {
      name: formData.name.trim(),
      phone: formData.phone.trim() || '',
      email: formData.email.trim() || '',
      type: formData.type || 'Le',
      source: formData.source || 'Facebook Page',
      sub_channel: formData.sub_channel.trim() || '',
      address: formData.address.trim() || '',
      notes: formData.notes.trim() || '',
    };

    try {
      if (editingCustomer) {
        const updated = await CustomerService.update(editingCustomer.id, payload);
        setCustomers(prev => prev.map(c => c.id === editingCustomer.id ? updated : c));
        toast.success(`Đã cập nhật chi tiết khách hàng "${updated.name}"!`);
      } else {
        const created = await CustomerService.create(shopId, { ...payload, debt: 0 });
        setCustomers(prev => [created, ...prev]);
        toast.success(`Đã thêm hồ sơ khách hàng "${created.name}" thành công!`);
      }
      closeModal();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi lưu khách hàng.');
    }
  };

  const handleDeleteCustomer = async () => {
    const id = confirmDeleteId;
    const custOrders = orders.filter(o => String(o.customer_id || o.customerId) === String(id));
    if (custOrders.length > 0) {
      toast.error('Không thể xóa khách hàng đã có lịch sử đơn hàng!');
      setConfirmDeleteId(null);
      return;
    }

    try {
      await CustomerService.remove(id);
      setCustomers(prev => prev.filter(c => String(c.id) !== String(id)));
      setConfirmDeleteId(null);
      toast.success('Đã xóa khách hàng thành công!');
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi xóa khách hàng.');
    }
  };

  const handleExportExcel = () => {
    const exportData = customers.map(c => {
      const custOrders = orders.filter(o => String(o.customer_id || o.customerId) === String(c.id));
      const totalSpent = custOrders
        .filter(o => o.status === 'Đã thanh toán')
        .reduce((sum, o) => sum + (o.sell_price || o.sellPrice || 0), 0);

      return {
        'Mã KH': c.id,
        'Tên Khách Hàng': c.name,
        'Số Điện Thoại': c.phone || 'N/A',
        'Email': c.email || 'N/A',
        'Phân Loại': TYPE_MAP[c.type] || c.type || 'Khách Lẻ',
        'Kênh Nguồn': c.source || 'N/A',
        'Địa Chỉ': c.address || 'N/A',
        'Số Đơn Hàng': custOrders.length,
        'Tổng Chi Tiêu (VNĐ)': totalSpent,
        'Công Nợ (VNĐ)': c.debt || 0,
        'Ghi Chú': c.notes || ''
      };
    });

    exportToExcel(exportData, 'Danh_Sach_Khach_Hang', 'Khách Hàng');
  };

  const handleImportExcelFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    toast.info('Đang đọc và import file Excel Canva...');
    try {
      const buffer = await file.arrayBuffer();
      const res = await parseAndImportCanvaExcel(buffer, shopId);
      toast.success(`🎉 Import thành công: ${res.teamsCount} Kho Teams, ${res.customersCount} Khách Hàng, ${res.ordersCount} Đơn Hàng Canva!`);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi import file Excel: ' + (err.message || 'File không hợp lệ'));
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (c.phone || '').includes(searchTerm) ||
                          (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          String(c.id).includes(searchTerm);
    const matchesType = filterType === 'ALL' || (c.type || 'Le') === filterType;
    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filteredCustomers.length / PAGE_SIZE) || 1;
  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const totalSpentAll = orders
    .filter(o => {
      const s = String(o.status || '');
      return s === 'Đã thanh toán' || (s.includes('Hoàn tiền') && !s.includes('100%'));
    })
    .reduce((sum, o) => {
      const sellP = Number(o.sell_price || o.sellPrice || 0);
      const refP = Number(o.refund_amount || 0);
      return sum + Math.max(0, sellP - refP);
    }, 0);
  const totalDebtAll = customers.reduce((sum, c) => sum + (c.debt || 0), 0);

  const handleClearAllData = () => {
    if (window.confirm('🚨 BẠN CÓ CHẮC CHẮN MUỐN XÓA TRẮNG 100% DỮ LIỆU?\n\nThao tác này sẽ xóa sạch tất cả Đơn hàng, Khách hàng, Kho Teams và Sổ quỹ để bắt đầu sử dụng phần mềm mới tinh.')) {
      clearAllSystemData();
      toast.success('🎉 Đã xóa sạch 100% dữ liệu! Hệ thống đã hoàn toàn mới tinh.');
      setTimeout(() => window.location.reload(), 800);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Quản Lý Khách Hàng & CRM 360°</h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: '13px' }}>
            Hồ sơ khách hàng chi tiết, thông tin liên hệ, kênh nguồn mua và quản lý công nợ.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <label className="glass-button" style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', color: '#fff', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileSpreadsheet size={17} />
            {importing ? 'Đang Import...' : 'Import Canva Excel (.xlsx)'}
            <input type="file" accept=".xlsx,.xls" onChange={handleImportExcelFile} style={{ display: 'none' }} disabled={importing} />
          </label>
          <button className="glass-button" onClick={handleExportExcel} style={{ background: 'rgba(16,185,129,0.18)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
            <Download size={17} /> Xuất Excel (.xlsx)
          </button>
          <button className="glass-button" onClick={handleOpenAddModal}>
            <Plus size={18} /> Thêm Khách Hàng Mới
          </button>
        </div>
      </div>

      {/* Metrics Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid #6366f1' }}>
          <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tổng Khách Hàng</span>
          <p style={{ fontSize: '26px', fontWeight: '800', color: '#fff', margin: '6px 0 0' }}>{customers.length} khách</p>
          <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px', display: 'flex', gap: '8px' }}>
            <span>🔵 Lẻ: {customers.filter(c => (c.type||'Le')==='Le').length}</span>
            <span>🟡 CTV: {customers.filter(c => c.type==='CTV').length}</span>
            <span>🟣 Sỉ: {customers.filter(c => c.type==='Si').length}</span>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid #10b981' }}>
          <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tổng LTV (Chi Tiêu)</span>
          <p style={{ fontSize: '26px', fontWeight: '800', color: '#10b981', margin: '6px 0 0' }}>{totalSpentAll.toLocaleString()}đ</p>
          <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>Tổng doanh thu từ tất cả khách hàng</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid #a855f7' }}>
          <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Doanh Thu CTV/Sỉ</span>
          <p style={{ fontSize: '26px', fontWeight: '800', color: '#a855f7', margin: '6px 0 0' }}>
            {orders.filter(o => {
              const cust = customers.find(c => String(c.id) === String(o.customer_id || o.customerId));
              return cust && (cust.type === 'CTV' || cust.type === 'Si') && (String(o.status||'') === 'Đã thanh toán');
            }).reduce((sum, o) => sum + Number(o.sell_price || o.sellPrice || 0), 0).toLocaleString()}đ
          </p>
          <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>Tổng đơn của nhóm CTV + Đại Lý Sỉ</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid #ef4444' }}>
          <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Công Nợ Phải Thu</span>
          <p style={{ fontSize: '26px', fontWeight: '800', color: '#ef4444', margin: '6px 0 0' }}>{totalDebtAll.toLocaleString()}đ</p>
          <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', opacity: 0.7 }}>Từ {customers.filter(c => (c.debt||0)>0).length} khách có nợ</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '280px', flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 14px' }}>
          <Search size={16} color="#475569" />
          <input
            type="text"
            placeholder="Tìm tên khách hàng, SĐT, Email hoặc Mã KH..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{ background: 'none', border: 'none', color: '#fff', outline: 'none', width: '100%', fontSize: '13.5px' }}
          />
          {searchTerm && <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}><X size={14} /></button>}
        </div>

        {/* Visual Tab Filters */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { key: 'ALL', label: '🌐 Tất Cả', count: customers.length, color: '#6366f1', bg: 'rgba(99,102,241,0.18)' },
            { key: 'Le', label: '🔵 Khách Lẻ', count: customers.filter(c => (c.type||'Le')==='Le').length, color: '#06b6d4', bg: 'rgba(6,182,212,0.18)' },
            { key: 'CTV', label: '🟡 CTV', count: customers.filter(c => c.type==='CTV').length, color: '#f59e0b', bg: 'rgba(245,158,11,0.18)' },
            { key: 'Si', label: '🟣 Khách Sỉ', count: customers.filter(c => c.type==='Si').length, color: '#a855f7', bg: 'rgba(168,85,247,0.18)' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => { setFilterType(tab.key); setCurrentPage(1); }}
              style={{
                padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                border: filterType === tab.key ? `1.5px solid ${tab.color}` : '1px solid rgba(255,255,255,0.1)',
                background: filterType === tab.key ? tab.bg : 'rgba(255,255,255,0.03)',
                color: filterType === tab.key ? tab.color : '#64748b',
                transition: 'all 0.15s'
              }}
            >
              {tab.label} <span style={{ opacity: 0.7 }}>({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Leaderboard Toggle */}
        <button
          onClick={() => setShowLeaderboard(v => !v)}
          style={{
            padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
            border: showLeaderboard ? '1.5px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)',
            background: showLeaderboard ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.03)',
            color: showLeaderboard ? '#f59e0b' : '#64748b',
            display: 'flex', alignItems: 'center', gap: '5px'
          }}
          title="Xem bảng xếp hạng CTV/Sỉ theo doanh số"
        >
          🏆 Leaderboard CTV/Sỉ
        </button>
      </div>

      {/* CTV/Sỉ Leaderboard Panel */}
      {showLeaderboard && (() => {
        const ctvSiCustomers = customers.filter(c => c.type === 'CTV' || c.type === 'Si');
        const ranked = ctvSiCustomers.map(c => {
          const cOrders = orders.filter(o => String(o.customer_id || o.customerId) === String(c.id) && String(o.status||'') === 'Đã thanh toán');
          const ltv = cOrders.reduce((s, o) => s + Number(o.sell_price || o.sellPrice || 0), 0);
          const orderCount = cOrders.length;
          return { ...c, ltv, orderCount };
        }).sort((a, b) => b.ltv - a.ltv);

        return (
          <div className="glass-panel" style={{ padding: '20px', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🏆 Bảng Xếp Hạng CTV & Khách Sỉ Theo Doanh Số
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>{ranked.length} đối tác</span>
            </div>
            {ranked.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#475569', padding: '20px' }}>Chưa có Khách Sỉ / CTV nào trong hệ thống.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {ranked.map((c, idx) => {
                  const phone = (c.phone || '').replace(/[^0-9]/g, '');
                  const typeColor = c.type === 'Si' ? '#a855f7' : '#f59e0b';
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : ('#' + (idx+1));
                  const maxLtv = ranked[0]?.ltv || 1;
                  const barWidth = Math.round((c.ltv / maxLtv) * 100);
                  const zaloMsg = `Xin chào ${c.name}! Đây là báo giá sỉ từ shop mình gửi bạn. Bạn có thể đặt hàng hoặc liên hệ mình qua Zalo để được hỗ trợ tốt nhất nhé! 😊`;
                  return (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px', background: idx < 3 ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.02)', border: idx < 3 ? '1px solid rgba(245,158,11,0.15)' : '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ fontSize: idx < 3 ? '22px' : '14px', fontWeight: '800', minWidth: '32px', textAlign: 'center', color: '#f59e0b' }}>{medal}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '700', color: '#fff', fontSize: '13.5px' }}>{c.name}</span>
                          <span style={{ fontSize: '10px', fontWeight: '800', padding: '1px 6px', borderRadius: '4px', background: `${typeColor}20`, color: typeColor, border: `1px solid ${typeColor}40` }}>
                            {c.type === 'Si' ? '🟣 Sỉ' : '🟡 CTV'}
                          </span>
                        </div>
                        <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${barWidth}%`, height: '100%', background: `linear-gradient(90deg, ${typeColor}, ${typeColor}80)`, borderRadius: '3px', transition: 'width 0.3s' }} />
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>{c.orderCount} đơn · {c.phone || '—'}</div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: '110px' }}>
                        <div style={{ fontWeight: '800', fontSize: '15px', color: '#10b981' }}>{c.ltv.toLocaleString()}đ</div>
                        <div style={{ fontSize: '11px', color: '#475569' }}>Tổng LTV</div>
                      </div>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        {phone && (
                          <a
                            href={`https://zalo.me/${phone}`}
                            target="_blank" rel="noreferrer"
                            style={{ padding: '5px 10px', fontSize: '11px', fontWeight: '700', borderRadius: '6px', background: '#0068ff', color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
                          >💬 Zalo</a>
                        )}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(zaloMsg);
                            setCopiedZaloMsg(c.id);
                            setTimeout(() => setCopiedZaloMsg(''), 2000);
                          }}
                          title="Copy tin nhắn báo giá sỉ để gửi qua Zalo/Facebook"
                          style={{ padding: '5px 10px', fontSize: '11px', fontWeight: '700', borderRadius: '6px', background: copiedZaloMsg === c.id ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.06)', color: copiedZaloMsg === c.id ? '#10b981' : '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                        >
                          {copiedZaloMsg === c.id ? '✅ Đã Copy' : '📋 Copy Tin Nhắn'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Table */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Đang tải danh sách khách hàng...</div>
        ) : paginatedCustomers.length === 0 ? (
          <div className="empty-state">
            <Users size={40} />
            <h3>Không tìm thấy khách hàng nào</h3>
            <p>Thử tìm với từ khóa khác hoặc thêm khách hàng mới.</p>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Mã KH', 'Tên Khách Hàng', 'SĐT / Zalo', 'Kênh Nguồn', 'Phân Loại', 'Chi Tiêu (LTV)', 'Công Nợ', 'Thao Tác 360°'].map(h => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedCustomers.map(customer => {
                  const custOrders = orders.filter(o => String(o.customer_id || o.customerId) === String(customer.id));
                  const totalSpent = custOrders
                    .filter(o => {
                      const s = String(o.status || '');
                      return s === 'Đã thanh toán' || (s.includes('Hoàn tiền') && !s.includes('100%'));
                    })
                    .reduce((sum, o) => {
                      const sellP = Number(o.sell_price || o.sellPrice || 0);
                      const refP = Number(o.refund_amount || 0);
                      return sum + Math.max(0, sellP - refP);
                    }, 0);

                  return (
                    <tr key={customer.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '14px 16px' }}><strong>#{customer.id}</strong></td>
                      <td style={{ padding: '14px 16px' }}>
                        <strong style={{ color: '#fff' }}>{customer.name}</strong>
                        {customer.email && <div style={{ fontSize: '11.5px', color: '#64748b' }}>{customer.email}</div>}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {customer.phone ? (
                          <span
                            onClick={() => {
                              navigator.clipboard.writeText(customer.phone);
                              toast.success(`✅ Đã copy SĐT ${customer.phone}!`);
                            }}
                            title="Click 1-click copy SĐT"
                            style={{ color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline decoration-dotted' }}
                          >
                            {customer.phone}
                          </span>
                        ) : (
                          <span style={{ color: '#64748b' }}>Chưa có SĐT</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
                          {customer.source || 'Facebook Page'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {(() => {
                          const t = customer.type || 'Le';
                          const cfg = t === 'Si'
                            ? { label: '🟣 Khách Sỉ', color: '#a855f7', bg: 'rgba(168,85,247,0.18)', border: 'rgba(168,85,247,0.4)' }
                            : t === 'CTV'
                            ? { label: '🟡 CTV', color: '#f59e0b', bg: 'rgba(245,158,11,0.18)', border: 'rgba(245,158,11,0.4)' }
                            : { label: '🔵 Khách Lẻ', color: '#06b6d4', bg: 'rgba(6,182,212,0.15)', border: 'rgba(6,182,212,0.3)' };
                          return (
                            <span style={{ fontSize: '11px', fontWeight: '800', padding: '3px 9px', borderRadius: '5px', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                              {cfg.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#10b981', fontWeight: '700' }}>{totalSpent.toLocaleString()}đ</td>
                      <td style={{ padding: '14px 16px' }}>
                        {(customer.debt || 0) > 0 ? (
                          <span style={{ color: '#ef4444', fontWeight: '700' }}>{(customer.debt || 0).toLocaleString()}đ</span>
                        ) : (
                          <span style={{ color: '#475569', fontSize: '12px' }}>0đ</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            className="glass-button"
                            onClick={() => navigate(`/customers/${customer.id}`)}
                            title="Hồ sơ 360°"
                            style={{ padding: '5px 10px', fontSize: '11px', background: 'rgba(99,102,241,0.18)', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Eye size={13} /> Hồ sơ 360°
                          </button>
                          <button
                            className="glass-button"
                            onClick={() => handleOpenEditModal(customer)}
                            title="Chỉnh sửa chi tiết"
                            style={{ padding: '5px 8px', fontSize: '11px', background: 'rgba(245,158,11,0.18)', color: '#f59e0b' }}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(customer.id)}
                            title="Xóa"
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="page-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: '13px', color: '#94a3b8', padding: '0 8px' }}>
                  Trang {currentPage} / {totalPages} (Tổng {filteredCustomers.length} khách)
                </span>
                <button
                  className="page-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add / Edit Rich Detailed Customer Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>
                {editingCustomer ? 'Chỉnh Sửa Hồ Sơ Khách Hàng Chi Tiết' : 'Thêm Hồ Sơ Khách Hàng Mới 360°'}
              </h2>
              <button className="modal-close-btn" onClick={closeModal}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Tên Khách Hàng *</label>
                  <input
                    type="text" required className="glass-input" placeholder="VD: Nguyễn Văn A"
                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Số Điện Thoại / Zalo Hotline *</label>
                  <input
                    type="text" required className="glass-input" placeholder="VD: 0901234567"
                    value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Email Liên Hệ</label>
                  <input
                    type="email" className="glass-input" placeholder="VD: khachhang@gmail.com"
                    value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Phân Loại Khách Hàng</label>
                  <select
                    className="glass-input"
                    value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="Le">Khách Lẻ (Giá chuẩn)</option>
                    <option value="CTV">Cộng Tác Viên (Chiết khấu nhẹ)</option>
                    <option value="Si">Khách Sỉ / Đại Lý (Chiết khấu cao)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Kênh Nguồn Mua Hàng</label>
                  <select
                    className="glass-input"
                    value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })}
                  >
                    {SOURCE_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Kênh Phụ / Sub-Channel</label>
                  <input
                    type="text" className="glass-input" placeholder="VD: Page Canva Sỉ #01"
                    value={formData.sub_channel} onChange={e => setFormData({ ...formData, sub_channel: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Địa Chỉ Liên Hệ / Tỉnh Thành</label>
                <input
                  type="text" className="glass-input" placeholder="VD: Quận 1, TP. Hồ Chí Minh"
                  value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">Ghi Chú Đặc Biệt & Yêu Cầu Khách</label>
                <textarea
                  className="glass-input" style={{ minHeight: '65px', fontSize: '12.5px' }} placeholder="Ghi chú thói quen mua sắm, tài khoản ưu tiên..."
                  value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="submit" className="glass-button" style={{ flex: 1, background: '#6366f1', color: '#fff', fontWeight: '700' }}>
                  {editingCustomer ? 'Cập Nhật Hồ Sơ Khách' : 'Hoàn Tất Thêm Khách Hàng 360°'}
                </button>
                <button type="button" onClick={closeModal} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="Xóa Khách Hàng?"
        message="Bạn có chắc muốn xóa khách hàng này?"
        onConfirm={handleDeleteCustomer}
        onCancel={() => setConfirmDeleteId(null)}
        confirmLabel="Xác Nhận Xóa"
      />
    </div>
  );
}
