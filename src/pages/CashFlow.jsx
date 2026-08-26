import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../utils/storage';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { CashTransactionService } from '../utils/dataService';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import DateFilterBar from '../components/DateFilterBar';
import {
  Wallet, ArrowDownRight, ArrowUpRight, Plus, Search,
  RefreshCw, X, Trash2, Landmark, DollarSign, Calendar
} from 'lucide-react';

export default function CashFlow() {
  const toast = useToast();
  const { shopId } = useAuth();

  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, netBalance: 0, cashBalance: 0, bankBalance: 0 });
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'INCOME' | 'EXPENSE'
  const [filterAccount, setFilterAccount] = useState('ALL'); // 'ALL' | 'BANK' | 'CASH'
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '', preset: 'ALL' });

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const emptyForm = {
    type: 'EXPENSE',
    category: 'Marketing/Ads',
    amount: '',
    accountType: 'BANK',
    counterpartName: '',
    notes: '',
    transactionDate: todayStr
  };

  const [formData, setFormData] = useState(emptyForm);

  const loadData = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const [txList, sum] = await Promise.all([
        CashTransactionService.list(shopId),
        CashTransactionService.getBalanceSummary(shopId)
      ]);
      setTransactions(txList || []);
      setSummary(sum || { totalIncome: 0, totalExpense: 0, netBalance: 0, cashBalance: 0, bankBalance: 0 });
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải dữ liệu sổ quỹ!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [shopId]);

  const closeModal = () => {
    setShowModal(false);
    setFormData(emptyForm);
  };

  const handleOpenModal = (defaultType = 'EXPENSE') => {
    setFormData({
      ...emptyForm,
      type: defaultType,
      category: defaultType === 'INCOME' ? 'Thu nợ khách' : 'Marketing/Ads'
    });
    setShowModal(true);
  };

  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    const amt = Number(formData.amount || 0);
    if (amt <= 0) return toast.error('Vui lòng nhập số tiền hợp lệ (> 0đ)!');

    const payload = {
      type: formData.type,
      category: formData.category,
      amount: amt,
      account_type: formData.accountType,
      counterpart_name: formData.counterpartName.trim(),
      notes: formData.notes.trim(),
      transaction_date: formData.transactionDate || todayStr,
      reference_type: 'MANUAL'
    };

    try {
      await CashTransactionService.create(shopId, payload);
      toast.success(`Đã lập phiếu ${formData.type === 'INCOME' ? 'thu' : 'chi'} ${amt.toLocaleString()}đ thành công!`);
      closeModal();
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi lưu giao dịch sổ quỹ.');
    }
  };

  const handleDelete = async () => {
    const id = confirmDeleteId;
    try {
      await CashTransactionService.remove(id);
      setTransactions(prev => prev.filter(t => String(t.id) !== String(id)));
      setConfirmDeleteId(null);
      toast.success('Đã xóa giao dịch sổ quỹ!');
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi xóa giao dịch.');
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const d = t.transaction_date || t.transactionDate || t.created_at;
    const ds = d ? String(d).split('T')[0] : '';
    if (dateRange.startDate && ds < dateRange.startDate) return false;
    if (dateRange.endDate && ds > dateRange.endDate) return false;

    const matchesTab = activeTab === 'ALL' || t.type === activeTab;
    const matchesAccount = filterAccount === 'ALL' || (t.account_type || 'BANK') === filterAccount;
    const matchesSearch = (t.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.counterpart_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesAccount && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Wallet size={26} color="#10b981" /> Sổ Quỹ Thu / Chi & Quản Trị Dòng Tiền
          </h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: '13px', margin: 0 }}>
            Giám sát thời gian thực toàn bộ dòng tiền vào (Thu bán hàng, thu nợ) và dòng tiền ra (Nhập hàng, Lương, Ads, Mặt bằng).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="glass-button" onClick={loadData} title="Tải lại dữ liệu" style={{ padding: '8px 12px' }}>
            <RefreshCw size={16} />
          </button>
          <button
            className="glass-button"
            onClick={() => handleOpenModal('INCOME')}
            style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', color: '#10b981', fontWeight: '700' }}
          >
            <ArrowDownRight size={16} /> + Lập Phiếu Thu
          </button>
          <button
            className="glass-button"
            onClick={() => handleOpenModal('EXPENSE')}
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#ef4444', fontWeight: '700' }}
          >
            <ArrowUpRight size={16} /> + Lập Phiếu Chi
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <DateFilterBar onFilterChange={setDateRange} label="Kỳ Sổ Quỹ:" />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '18px 20px', border: summary.netBalance >= 0 ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Tổng Quỹ Thực Tế</span>
            <Wallet size={20} color={summary.netBalance >= 0 ? '#10b981' : '#ef4444'} />
          </div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: summary.netBalance >= 0 ? '#10b981' : '#ef4444', marginTop: '6px' }}>
            {summary.netBalance >= 0 ? '+' : ''}{summary.netBalance.toLocaleString()}đ
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Số dư tiền ròng sẵn sàng sử dụng</div>
        </div>

        <div className="glass-panel" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Tài Khoản Ngân Hàng</span>
            <Landmark size={20} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#38bdf8', marginTop: '6px' }}>
            {summary.bankBalance.toLocaleString()}đ
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Quỹ chuyển khoản (MB/VCB)</div>
        </div>

        <div className="glass-panel" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Két Tiền Mặt</span>
            <DollarSign size={20} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#f59e0b', marginTop: '6px' }}>
            {summary.cashBalance.toLocaleString()}đ
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Quỹ tiền mặt trực tiếp tại shop</div>
        </div>

        <div className="glass-panel" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Thu - Chi Theo Kỳ</span>
            <Calendar size={20} color="#818cf8" />
          </div>
          <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '6px' }}>
            <span style={{ color: '#10b981', fontWeight: '700' }}>Thu: +{transactions.filter(t => {
              const d = t.transaction_date || t.transactionDate || t.created_at;
              const ds = d ? String(d).split('T')[0] : todayStr;
              if (dateRange.startDate && ds < dateRange.startDate) return false;
              if (dateRange.endDate && ds > dateRange.endDate) return false;
              return true;
            }).filter(t => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount || 0), 0).toLocaleString()}đ</span>
            <span style={{ color: '#ef4444', fontWeight: '700' }}>Chi: -{transactions.filter(t => {
              const d = t.transaction_date || t.transactionDate || t.created_at;
              const ds = d ? String(d).split('T')[0] : todayStr;
              if (dateRange.startDate && ds < dateRange.startDate) return false;
              if (dateRange.endDate && ds > dateRange.endDate) return false;
              return true;
            }).filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount || 0), 0).toLocaleString()}đ</span>
          </div>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'ALL', label: 'Tất Cả Sổ Quỹ' },
            { id: 'INCOME', label: '💰 Dòng Tiền Vào (Thu)' },
            { id: 'EXPENSE', label: '💸 Dòng Tiền Ra (Chi)' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: 'none',
                background: activeTab === tab.id ? (tab.id === 'INCOME' ? '#10b981' : tab.id === 'EXPENSE' ? '#ef4444' : '#6366f1') : 'rgba(255,255,255,0.04)',
                color: activeTab === tab.id ? '#fff' : '#94a3b8',
                fontSize: '12.5px', fontWeight: '700', cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '240px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '6px 12px' }}>
            <Search size={15} color="#475569" />
            <input
              type="text"
              placeholder="Tìm lý do, đối tượng..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ background: 'none', border: 'none', color: '#fff', outline: 'none', width: '100%', fontSize: '13px' }}
            />
            {searchTerm && <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}><X size={13} /></button>}
          </div>

          <select
            className="glass-input" style={{ width: 'auto', padding: '6px 10px', fontSize: '12.5px' }}
            value={filterAccount} onChange={e => setFilterAccount(e.target.value)}
          >
            <option value="ALL">Mọi Quỹ</option>
            <option value="BANK">Chỉ Ngân Hàng</option>
            <option value="CASH">Chỉ Tiền Mặt</option>
          </select>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Mã Phiếu', 'Ngày GD', 'Loại', 'Danh Mục', 'Đối Tác / Người GD', 'Số Tiền Thu / Chi', 'Tài Khoản Quỹ', 'Ghi Chú', 'Thao Tác'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Đang tải sổ quỹ thu chi...</td></tr>
              ) : filteredTransactions.length === 0 ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Chưa có giao dịch thu chi nào phù hợp bộ lọc.</td></tr>
              ) : (
                filteredTransactions.map(t => {
                  const isIncome = t.type === 'INCOME';
                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: isIncome ? 'rgba(16,185,129,0.02)' : 'rgba(239,68,68,0.02)' }}>
                      <td style={{ padding: '14px 16px', color: '#818cf8', fontWeight: '700' }}>#{t.id}</td>
                      <td style={{ padding: '14px 16px', color: '#cbd5e1' }}>{t.transaction_date || todayStr}</td>
                      <td style={{ padding: '14px 16px' }}>
                        {isIncome ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '11px', fontWeight: 'bold' }}>
                            <ArrowDownRight size={13} /> THU TIỀN
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '11px', fontWeight: 'bold' }}>
                            <ArrowUpRight size={13} /> CHI TIỀN
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: '700', color: '#fff' }}>
                        {t.category}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#38bdf8' }}>
                        {t.counterpart_name || 'N/A'}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: '800', fontSize: '14px', color: isIncome ? '#10b981' : '#ef4444' }}>
                        {isIncome ? '+' : '-'}{Number(t.amount || 0).toLocaleString()}đ
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '6px', background: t.account_type === 'CASH' ? 'rgba(245,158,11,0.15)' : 'rgba(56,189,248,0.15)', color: t.account_type === 'CASH' ? '#f59e0b' : '#38bdf8', fontSize: '11.5px', fontWeight: 'bold' }}>
                          {t.account_type === 'CASH' ? '💵 Tiền mặt' : '🏦 Ngân hàng'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '12px' }}>
                        {t.notes || '-'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(t.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                          title="Xóa giao dịch"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== POPUP MODAL: ADD TRANSACTION ==================== */}
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
                  background: 'linear-gradient(135deg, #10b981, #047857)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px', boxShadow: '0 4px 15px rgba(16,185,129,0.35)'
                }}>
                  💰
                </div>
                <div>
                  <h2 style={{ fontSize: '19px', fontWeight: '800', color: '#fff', margin: 0 }}>
                    TẠO PHIẾU THU / CHI SỔ QUỸ
                  </h2>
                  <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: '3px 0 0 0' }}>
                    Hạch toán dòng tiền vào/ra & đối soát quỹ tự động
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

            <form onSubmit={handleSaveTransaction} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Type Switcher */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'INCOME', category: 'Thu nợ khách' })}
                  style={{
                    padding: '10px', borderRadius: '8px', border: 'none',
                    background: formData.type === 'INCOME' ? '#10b981' : 'rgba(255,255,255,0.05)',
                    color: formData.type === 'INCOME' ? '#fff' : '#94a3b8',
                    fontWeight: '700', cursor: 'pointer'
                  }}
                >
                  💰 Dòng Tiền Vào (Thu)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'EXPENSE', category: 'Marketing/Ads' })}
                  style={{
                    padding: '10px', borderRadius: '8px', border: 'none',
                    background: formData.type === 'EXPENSE' ? '#ef4444' : 'rgba(255,255,255,0.05)',
                    color: formData.type === 'EXPENSE' ? '#fff' : '#94a3b8',
                    fontWeight: '700', cursor: 'pointer'
                  }}
                >
                  💸 Dòng Tiền Ra (Chi)
                </button>
              </div>

              {/* Category */}
              <div>
                <label className="form-label">Danh Mục Thu / Chi</label>
                <select
                  className="glass-input"
                  value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                >
                  {formData.type === 'INCOME' ? (
                    <>
                      <option value="Bán hàng">Bán hàng POS</option>
                      <option value="Thu nợ khách">Thu nợ khách hàng CTV/Sỉ</option>
                      <option value="Hoàn tiền bank">Hoàn tiền ngân hàng/NCC</option>
                      <option value="Thu khác">Thu nhập khác</option>
                    </>
                  ) : (
                    <>
                      <option value="Nhập hàng">Nhập hàng / Mua kho Team</option>
                      <option value="Trả nợ NCC">Thanh toán nợ Nhà Cung Cấp</option>
                      <option value="Lương nhân viên">Chi trả lương & hoa hồng</option>
                      <option value="Marketing/Ads">Chạy Facebook / TikTok / Google Ads</option>
                      <option value="Mặt bằng">Tiền thuê mặt bằng / văn phòng</option>
                      <option value="Tool/VPS">Tiền Server / VPS / Tool tự động</option>
                      <option value="Điện nước/Internet">Điện nước / Internet</option>
                      <option value="Chi khác">Chi phí vận hành khác</option>
                    </>
                  )}
                </select>
              </div>

              {/* Amount & Account */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ color: formData.type === 'INCOME' ? '#10b981' : '#ef4444' }}>
                    Số Tiền (VNĐ) *
                  </label>
                  <input
                    type="number" required className="glass-input" placeholder="VD: 500000"
                    value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Tài Khoản Quỹ</label>
                  <select
                    className="glass-input"
                    value={formData.accountType} onChange={e => setFormData({ ...formData, accountType: e.target.value })}
                  >
                    <option value="BANK">Tài khoản Ngân Hàng</option>
                    <option value="CASH">Quỹ Tiền Mặt</option>
                  </select>
                </div>
              </div>

              {/* Counterpart & Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">{formData.type === 'INCOME' ? 'Người Nộp Tiền' : 'Người / Đơn Vị Nhận Tiền'}</label>
                  <input
                    type="text" className="glass-input" placeholder="VD: Anh Nam (CTV), Facebook..."
                    value={formData.counterpartName} onChange={e => setFormData({ ...formData, counterpartName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Ngày Giao Dịch</label>
                  <input
                    type="date" className="glass-input"
                    value={formData.transactionDate} onChange={e => setFormData({ ...formData, transactionDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="form-label">Ghi Chú Nội Dung Thu / Chi</label>
                <input
                  type="text" className="glass-input" placeholder="Nội dung hạch toán chi tiết..."
                  value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', background: '#111827', marginTop: 'auto', display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                className="glass-button"
                style={{
                  flex: 1, height: '44px',
                  background: formData.type === 'INCOME' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: '#fff', fontWeight: '700'
                }}
              >
                💾 Xác Nhận Lưu Phiếu
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
        title="Xóa Giao Dịch Sổ Quỹ?"
        message="Bạn có chắc muốn xóa phiếu thu/chi này khỏi sổ quỹ?"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
        confirmLabel="Xác Nhận Xóa"
      />
    </div>
  );
}
