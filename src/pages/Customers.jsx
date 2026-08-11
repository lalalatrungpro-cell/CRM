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

  const totalSpentAll = orders.filter(o => o.status === 'Đã thanh toán').reduce((sum, o) => sum + (o.sell_price || o.sellPrice || 0), 0);
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid #6366f1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>Tổng Số Khách Hàng</span>
          <p style={{ fontSize: '24px', fontWeight: '800', color: '#fff', margin: 0 }}>{customers.length} khách</p>
        </div>
        <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid #10b981', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>Tổng Chi Tiêu (LTV)</span>
          <p style={{ fontSize: '24px', fontWeight: '800', color: '#10b981', margin: 0 }}>{totalSpentAll.toLocaleString()}đ</p>
        </div>
        <div className="glass-panel" style={{ padding: '16px', borderLeft: '4px solid #ef4444', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>Tổng Công Nợ Phải Thu</span>
          <p style={{ fontSize: '24px', fontWeight: '800', color: '#ef4444', margin: 0 }}>{totalDebtAll.toLocaleString()}đ</p>
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

        <select
          className="glass-input" style={{ width: 'auto' }}
          value={filterType} onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }}
        >
          <option value="ALL">Tất cả phân loại</option>
          <option value="Le">Khách Lẻ</option>
          <option value="CTV">Cộng Tác Viên</option>
          <option value="Si">Khách Sỉ / Đại Lý</option>
        </select>
      </div>

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
                    .filter(o => o.status === 'Đã thanh toán')
                    .reduce((sum, o) => sum + (o.sell_price || o.sellPrice || 0), 0);

                  return (
                    <tr key={customer.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '14px 16px' }}><strong>#{customer.id}</strong></td>
                      <td style={{ padding: '14px 16px' }}>
                        <strong style={{ color: '#fff' }}>{customer.name}</strong>
                        {customer.email && <div style={{ fontSize: '11.5px', color: '#64748b' }}>{customer.email}</div>}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#94a3b8' }}>{customer.phone || 'Chưa có SĐT'}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
                          {customer.source || 'Facebook Page'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span className="badge badge-info">{TYPE_MAP[customer.type] || customer.type || 'Khách Lẻ'}</span>
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
