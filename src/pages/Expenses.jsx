import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../utils/storage';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { ExpenseService } from '../utils/dataService';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import DateFilterBar from '../components/DateFilterBar';
import {
  TrendingDown, Plus, Search, RefreshCw, X, Trash2, Edit2,
  Building, Megaphone, Server, Zap, CheckCircle2, Clock
} from 'lucide-react';

export default function Expenses() {
  const toast = useToast();
  const { shopId } = useAuth();

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'FIXED' | 'VARIABLE'
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '', preset: 'ALL' });

  // Modals & Form
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const emptyForm = {
    name: '',
    expenseType: 'FIXED', // 'FIXED' | 'VARIABLE'
    category: 'Mặt bằng',
    amount: '',
    recurrence: 'MONTHLY', // 'ONE_TIME' | 'MONTHLY' | 'YEARLY'
    expenseDate: todayStr,
    notes: '',
    isPaid: true
  };

  const [formData, setFormData] = useState(emptyForm);

  const loadData = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const data = await ExpenseService.list(shopId);
      setExpenses(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải danh sách chi phí!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [shopId]);

  const closeModal = () => {
    setShowModal(false);
    setEditingExpense(null);
    setFormData(emptyForm);
  };

  const handleOpenAddModal = () => {
    setEditingExpense(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const handleOpenEditModal = (exp) => {
    setEditingExpense(exp);
    setFormData({
      name: exp.name || '',
      expenseType: exp.expense_type || exp.expenseType || 'FIXED',
      category: exp.category || 'Mặt bằng',
      amount: exp.amount || '',
      recurrence: exp.recurrence || 'MONTHLY',
      expenseDate: exp.expense_date || exp.expenseDate || todayStr,
      notes: exp.notes || '',
      isPaid: exp.is_paid !== undefined ? exp.is_paid : true
    });
    setShowModal(true);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    const amt = Number(formData.amount || 0);
    if (amt <= 0) return toast.error('Vui lòng nhập số tiền hợp lệ (> 0đ)!');

    const payload = {
      name: formData.name.trim(),
      expense_type: formData.expenseType,
      category: formData.category,
      amount: amt,
      recurrence: formData.recurrence,
      expense_date: formData.expenseDate || todayStr,
      notes: formData.notes.trim(),
      is_paid: formData.isPaid
    };

    try {
      if (editingExpense) {
        await ExpenseService.update(editingExpense.id, payload);
        toast.success(`Đã cập nhật khoản chi "${formData.name}"!`);
      } else {
        await ExpenseService.create(shopId, payload);
        toast.success(`Đã thêm khoản chi phí mới ${amt.toLocaleString()}đ!`);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi lưu chi phí.');
    }
  };

  const handleDeleteExpense = async () => {
    const id = confirmDeleteId;
    try {
      await ExpenseService.remove(id);
      setExpenses(prev => prev.filter(e => String(e.id) !== String(id)));
      setConfirmDeleteId(null);
      toast.success('Đã xóa khoản chi phí!');
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi xóa chi phí.');
    }
  };

  // KPI Metrics & Date Filtering
  const isDateInRange = (dateStr) => {
    if (!dateRange.startDate && !dateRange.endDate) return true;
    if (!dateStr) return true;
    const d = String(dateStr).split('T')[0];
    if (dateRange.startDate && d < dateRange.startDate) return false;
    if (dateRange.endDate && d > dateRange.endDate) return false;
    return true;
  };

  const periodExpenses = expenses.filter(e => isDateInRange(e.expense_date || e.expenseDate || e.created_at));

  const totalFixed = periodExpenses.filter(e => (e.expense_type || e.expenseType) === 'FIXED').reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalVariable = periodExpenses.filter(e => (e.expense_type || e.expenseType) === 'VARIABLE').reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalOpex = totalFixed + totalVariable;

  const filteredExpenses = periodExpenses.filter(e => {
    const matchesTab = activeTab === 'ALL' || (e.expense_type || e.expenseType) === activeTab;
    const matchesSearch = (e.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (e.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (e.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TrendingDown size={26} color="#ef4444" /> Quản Lý Chi Phí Doanh Nghiệp (OPEX)
          </h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: '13px', margin: 0 }}>
            Kiểm soát chi phí cố định (Mặt bằng, VPS, Tool, Lương cứng) và chi phí biến động (Facebook/TikTok Ads, Tiếp khách) để tính Lãi Ròng chuẩn.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="glass-button" onClick={loadData} title="Tải lại dữ liệu" style={{ padding: '8px 12px' }}>
            <RefreshCw size={16} />
          </button>
          <button className="glass-button" onClick={handleOpenAddModal} style={{ background: 'linear-gradient(135deg, #ef4444, #f59e0b)', color: '#fff', fontWeight: '700' }}>
            <Plus size={18} /> Thêm Khoản Chi Phí Mới
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <DateFilterBar onFilterChange={setDateRange} label="Kỳ Chi Phí OPEX:" />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '18px 20px', border: '1px solid rgba(239,68,68,0.3)' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Tổng Chi Phí Hoạt Động (OPEX)</div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#ef4444', marginTop: '4px' }}>
            {totalOpex.toLocaleString()}đ
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Toàn bộ chi phí vận hành doanh nghiệp</div>
        </div>

        <div className="glass-panel" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Chi Phí Cố Định (Fixed)</span>
            <Building size={18} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#38bdf8', marginTop: '4px' }}>
            {totalFixed.toLocaleString()}đ
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Mặt bằng, VPS, Server, Internet</div>
        </div>

        <div className="glass-panel" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Chi Phí Biến Động (Variable)</span>
            <Megaphone size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#f59e0b', marginTop: '4px' }}>
            {totalVariable.toLocaleString()}đ
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Chạy Ads, Phí bank, Tiếp khách</div>
        </div>
      </div>

      {/* Filter & Tabs */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'ALL', label: 'Tất Cả Chi Phí' },
            { id: 'FIXED', label: '🏗️ Chi Phí Cố Định' },
            { id: 'VARIABLE', label: '📊 Chi Phí Biến Động' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: 'none',
                background: activeTab === tab.id ? '#6366f1' : 'rgba(255,255,255,0.04)',
                color: activeTab === tab.id ? '#fff' : '#94a3b8',
                fontSize: '12.5px', fontWeight: '700', cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '240px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '6px 12px' }}>
          <Search size={15} color="#475569" />
          <input
            type="text"
            placeholder="Tìm theo tên, danh mục..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ background: 'none', border: 'none', color: '#fff', outline: 'none', width: '100%', fontSize: '13px' }}
          />
          {searchTerm && <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}><X size={13} /></button>}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Mã Chi Phí', 'Ngày Chi', 'Tên Khoản Chi', 'Phân Loại', 'Danh Mục', 'Chu Kỳ Lặp', 'Số Tiền Chi', 'Trạng Thái', 'Thao Tác'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Đang tải danh sách chi phí...</td></tr>
              ) : filteredExpenses.length === 0 ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Chưa có khoản chi phí nào phù hợp bộ lọc.</td></tr>
              ) : (
                filteredExpenses.map(e => {
                  const isFixed = (e.expense_type || e.expenseType) === 'FIXED';
                  return (
                    <tr key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '14px 16px', color: '#818cf8', fontWeight: '700' }}>#{e.id}</td>
                      <td style={{ padding: '14px 16px', color: '#cbd5e1' }}>{e.expense_date || todayStr}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '700', color: '#fff' }}>{e.name}</div>
                        {e.notes && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{e.notes}</div>}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '6px', background: isFixed ? 'rgba(56,189,248,0.15)' : 'rgba(245,158,11,0.15)', color: isFixed ? '#38bdf8' : '#f59e0b', fontSize: '11.5px', fontWeight: 'bold' }}>
                          {isFixed ? '🏗️ Cố định' : '📊 Biến động'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#cbd5e1' }}>
                        {e.category}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#94a3b8' }}>
                        {e.recurrence === 'MONTHLY' ? 'Hằng tháng' : e.recurrence === 'YEARLY' ? 'Hằng năm' : '1 Lần'}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: '800', color: '#ef4444', fontSize: '14px' }}>
                        -{Number(e.amount || 0).toLocaleString()}đ
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {e.is_paid !== false ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '11px', fontWeight: 'bold' }}>
                            <CheckCircle2 size={12} /> Đã chi tiền
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '11px', fontWeight: 'bold' }}>
                            <Clock size={12} /> Chưa chi
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(e)}
                            style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', padding: '4px' }}
                            title="Sửa khoản chi"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(e.id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                            title="Xóa khoản chi"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== POPUP MODAL: ADD / EDIT EXPENSE ==================== */}
      {showModal && createPortal(
        <div
            className="drawer-overlay"
            onClick={closeModal}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
              display: 'flex', justifyContent: 'flex-end'
            }}
          >
            <div
              className="drawer-content animate-slide-in-right"
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: '560px', height: '100vh', background: '#0f172a', borderLeft: '1px solid rgba(255,255,255,0.1)', boxShadow: '-10px 0 35px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              background: 'linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95))',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px', boxShadow: '0 4px 15px rgba(239,68,68,0.35)'
                }}>
                  💸
                </div>
                <div>
                  <h2 style={{ fontSize: '19px', fontWeight: '800', color: '#fff', margin: 0 }}>
                    TẠO PHIẾU CHI PHÍ VẬN HÀNH (OPEX)
                  </h2>
                  <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: '3px 0 0 0' }}>
                    Ghi nhận chi phí quảng cáo, VPS, tool & chi phí kinh doanh
                  </p>
                </div>
              </div>
              <button
                type="button" onClick={closeModal}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8', cursor: 'pointer', padding: '7px', borderRadius: '10px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Expense Name */}
              <div>
                <label className="form-label">Tên Khoản Chi Phí *</label>
                <input
                  type="text" required className="glass-input" placeholder="VD: Chi phí Facebook Ads tuần 1, Thuê văn phòng..."
                  value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Expense Type & Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Phân Loại Chi Phí</label>
                  <select
                    className="glass-input"
                    value={formData.expenseType} onChange={e => setFormData({ ...formData, expenseType: e.target.value })}
                  >
                    <option value="FIXED">🏗️ Chi Phí Cố Định (Fixed)</option>
                    <option value="VARIABLE">📊 Chi Phí Biến Động (Variable)</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Danh Mục Chi Phí</label>
                  <select
                    className="glass-input"
                    value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="Mặt bằng">Thuê Mặt Bằng / Văn Phòng</option>
                    <option value="Marketing/Ads">Marketing / Quảng Cáo Ads</option>
                    <option value="Tool/VPS">Phần Mềm / VPS / Tool Nuôi Bot</option>
                    <option value="Điện nước/Internet">Điện Nước / Internet / Cáp Quang</option>
                    <option value="Vận hành">Chi Phí Vận Hành Khác</option>
                  </select>
                </div>
              </div>

              {/* Amount & Recurrence */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ color: '#ef4444' }}>Số Tiền Chi (VNĐ) *</label>
                  <input
                    type="number" required className="glass-input" placeholder="VD: 1500000"
                    value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Chu Kỳ Chi Trả</label>
                  <select
                    className="glass-input"
                    value={formData.recurrence} onChange={e => setFormData({ ...formData, recurrence: e.target.value })}
                  >
                    <option value="ONE_TIME">Chi 1 lần (One-time)</option>
                    <option value="MONTHLY">Định kỳ Hằng Tháng</option>
                    <option value="YEARLY">Định kỳ Hằng Năm</option>
                  </select>
                </div>
              </div>

              {/* Date & Paid status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Ngày Chi Tiền</label>
                  <input
                    type="date" className="glass-input"
                    value={formData.expenseDate} onChange={e => setFormData({ ...formData, expenseDate: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', paddingTop: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#fff' }}>
                    <input
                      type="checkbox"
                      checked={formData.isPaid}
                      onChange={e => setFormData({ ...formData, isPaid: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#ef4444' }}
                    />
                    ⚡ Đã chi (Ghi sổ quỹ)
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="form-label">Ghi Chú Chi Tiết</label>
                <input
                  type="text" className="glass-input" placeholder="Ghi chú chi tiết thêm..."
                  value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', background: '#111827', marginTop: 'auto', display: 'flex', gap: '12px' }}>
              <button type="submit" className="glass-button" style={{ flex: 1, height: '44px', background: 'linear-gradient(135deg, #ef4444, #f59e0b)', color: '#fff', fontWeight: '700' }}>
                {editingExpense ? '💾 Cập Nhật Chi Phí' : '✨ Hoàn Tất Thêm Chi Phí'}
              </button>
              <button type="button" onClick={closeModal} style={{ padding: '0 20px', height: '44px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>
                Hủy
              </button>
            </div>
          </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="Xóa Khoản Chi Phí?"
        message="Bạn có chắc muốn xóa khoản chi phí này khỏi sổ sách?"
        onConfirm={handleDeleteExpense}
        onCancel={() => setConfirmDeleteId(null)}
        confirmLabel="Xác Nhận Xóa"
      />
    </div>
  );
}
