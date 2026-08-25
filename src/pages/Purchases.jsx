import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { PurchaseService, SupplierService, TeamService, ProductService } from '../utils/dataService';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  PackagePlus, Plus, Search, RefreshCw, X, Trash2,
  Building2, Layers, CheckCircle2, Clock, DollarSign, Wallet
} from 'lucide-react';

export default function Purchases() {
  const toast = useToast();
  const { shopId } = useAuth();

  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals & Forms
  const [showModal, setShowModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPayment, setFilterPayment] = useState('ALL'); // 'ALL' | 'PAID' | 'DEBT'

  const todayStr = new Date().toISOString().split('T')[0];

  const emptyForm = {
    supplierId: '',
    productName: 'Canva Pro (1 năm)',
    teamId: '',
    importCost: 2000000,
    quantity: 49,
    paymentStatus: 'PAID',
    purchaseDate: todayStr,
    notes: ''
  };

  const [formData, setFormData] = useState(emptyForm);

  const loadData = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const [purList, suppList, teamList, prodList] = await Promise.all([
        PurchaseService.list(shopId),
        SupplierService.list(shopId),
        TeamService.list(shopId),
        ProductService.list(shopId)
      ]);
      setPurchases(purList || []);
      setSuppliers(suppList || []);
      setTeams(teamList || []);
      setProducts(prodList || []);
      if ((suppList || []).length > 0 && !formData.supplierId) {
        setFormData(f => ({ ...f, supplierId: suppList[0].id }));
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải danh sách phiếu nhập hàng!');
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

  const handleOpenAddModal = () => {
    setFormData({
      ...emptyForm,
      supplierId: suppliers.length > 0 ? suppliers[0].id : '',
      productName: products.length > 0 ? products[0].name : 'Canva Pro (1 năm)'
    });
    setShowModal(true);
  };

  const handleSavePurchase = async (e) => {
    e.preventDefault();
    const cost = Number(formData.importCost || 0);
    const qty = parseInt(formData.quantity || 1) || 1;

    if (cost <= 0) return toast.error('Vui lòng nhập tổng tiền vốn nhập hàng > 0!');
    if (qty <= 0) return toast.error('Vui lòng nhập số lượng slot/key > 0!');

    const supp = suppliers.find(s => String(s.id) === String(formData.supplierId));
    const suppName = supp ? supp.name : '';

    const payload = {
      supplier_id: formData.supplierId ? parseInt(formData.supplierId) : null,
      supplier_name: suppName,
      team_id: formData.teamId ? parseInt(formData.teamId) : null,
      product_name: formData.productName,
      import_cost: cost,
      quantity: qty,
      payment_status: formData.paymentStatus,
      purchase_date: formData.purchaseDate || todayStr,
      notes: formData.notes.trim()
    };

    try {
      const created = await PurchaseService.create(shopId, payload);
      setPurchases(prev => [created, ...prev]);
      toast.success(`Đã lập phiếu nhập hàng "${created.product_name}" (${cost.toLocaleString()}đ) thành công!`);
      closeModal();
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi lập phiếu nhập hàng.');
    }
  };

  const handleDeletePurchase = async () => {
    const id = confirmDeleteId;
    try {
      await PurchaseService.remove(id);
      setPurchases(prev => prev.filter(p => String(p.id) !== String(id)));
      setConfirmDeleteId(null);
      toast.success('Đã xóa phiếu nhập hàng!');
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi xóa phiếu nhập hàng.');
    }
  };

  // Live Unit Cost calculation
  const liveCost = Number(formData.importCost || 0);
  const liveQty = parseInt(formData.quantity || 1) || 1;
  const liveUnitCost = liveQty > 0 ? Math.round(liveCost / liveQty) : 0;

  // KPI Metrics
  const totalImportCost = purchases.reduce((sum, p) => sum + Number(p.import_cost || 0), 0);
  const paidCost = purchases.filter(p => p.payment_status === 'PAID').reduce((sum, p) => sum + Number(p.import_cost || 0), 0);
  const debtCost = purchases.filter(p => p.payment_status === 'DEBT').reduce((sum, p) => sum + Number(p.import_cost || 0), 0);
  const totalSlots = purchases.reduce((sum, p) => sum + parseInt(p.quantity || 0), 0);

  const filteredPurchases = purchases.filter(p => {
    const matchesSearch = (p.product_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.supplier_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPayment = filterPayment === 'ALL' || p.payment_status === filterPayment;
    return matchesSearch && matchesPayment;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <PackagePlus size={26} color="#6366f1" /> Quản Lý Nhập Hàng & Mua Kho Trọn Gói
          </h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: '13px', margin: 0 }}>
            Quản lý vốn mua Team/Lô (VD: 2 triệu/49 slot), phân bổ giá vốn tự động và hạch toán dòng tiền/công nợ NCC.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="glass-button" onClick={loadData} title="Tải lại dữ liệu" style={{ padding: '8px 12px' }}>
            <RefreshCw size={16} />
          </button>
          <button className="glass-button" onClick={handleOpenAddModal} style={{ background: 'linear-gradient(135deg, #6366f1, #10b981)', color: '#fff', fontWeight: '700' }}>
            <Plus size={18} /> Lập Phiếu Nhập Hàng Mới
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(99,102,241,0.15)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Tổng Vốn Nhập Kho</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>{totalImportCost.toLocaleString()}đ</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(16,185,129,0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Đã Thanh Toán NCC</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981', marginTop: '2px' }}>{paidCost.toLocaleString()}đ</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Nợ NCC Chưa Trả</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#ef4444', marginTop: '2px' }}>{debtCost.toLocaleString()}đ</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(56,189,248,0.15)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Tổng Slot / Key Nhập</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#38bdf8', marginTop: '2px' }}>{totalSlots.toLocaleString()} slots</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '280px', flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 14px' }}>
          <Search size={16} color="#475569" />
          <input
            type="text"
            placeholder="Tìm theo tên sản phẩm, NCC, ghi chú..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ background: 'none', border: 'none', color: '#fff', outline: 'none', width: '100%', fontSize: '13.5px' }}
          />
          {searchTerm && <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}><X size={14} /></button>}
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {['ALL', 'PAID', 'DEBT'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilterPayment(tab)}
              style={{
                padding: '8px 14px', borderRadius: '8px', border: 'none',
                background: filterPayment === tab ? '#6366f1' : 'rgba(255,255,255,0.04)',
                color: filterPayment === tab ? '#fff' : '#94a3b8',
                fontSize: '12.5px', fontWeight: '600', cursor: 'pointer'
              }}
            >
              {tab === 'ALL' ? 'Tất cả phiếu' : tab === 'PAID' ? 'Đã thanh toán' : 'Nợ NCC'}
            </button>
          ))}
        </div>
      </div>

      {/* Table Data */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Mã Phiếu', 'Ngày Nhập', 'Nhà Cung Cấp', 'Sản Phẩm / Dịch Vụ', 'Tổng Tiền Vốn', 'Số Slot', 'Giá Vốn/Slot', 'Thanh Toán NCC', 'Thao Tác'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Đang tải danh sách phiếu nhập hàng...</td></tr>
              ) : filteredPurchases.length === 0 ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Chưa có phiếu nhập hàng nào. Bấm "+ Lập Phiếu Nhập Hàng Mới" để tạo.</td></tr>
              ) : (
                filteredPurchases.map((p) => {
                  const unitCost = Number(p.unit_cost || (p.quantity ? Math.round(p.import_cost / p.quantity) : 0));
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '14px 16px', color: '#818cf8', fontWeight: '700' }}>#{p.id}</td>
                      <td style={{ padding: '14px 16px', color: '#cbd5e1' }}>{p.purchase_date || todayStr}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '700', color: '#fff' }}>{p.supplier_name || 'Nguồn Sỉ #' + p.supplier_id}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '600', color: '#38bdf8' }}>{p.product_name}</div>
                        {p.notes && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{p.notes}</div>}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: '800', color: '#f59e0b', fontSize: '14px' }}>
                        {Number(p.import_cost || 0).toLocaleString()}đ
                      </td>
                      <td style={{ padding: '14px 16px', color: '#fff', fontWeight: '700' }}>
                        {p.quantity} slots
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '6px', background: 'rgba(16,185,129,0.12)', color: '#10b981', fontWeight: '700', fontSize: '12px' }}>
                          ~{unitCost.toLocaleString()}đ/slot
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {p.payment_status === 'PAID' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '11.5px', fontWeight: 'bold' }}>
                            <CheckCircle2 size={12} /> Đã thanh toán
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '11.5px', fontWeight: 'bold' }}>
                            <Clock size={12} /> Nợ NCC
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(p.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                          title="Xóa phiếu nhập hàng"
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

      {/* ==================== POPUP MODAL: ADD PURCHASE ==================== */}
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
              style={{
                width: '100%', maxWidth: '680px', height: '100vh',
                background: '#0f172a', borderLeft: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '-10px 0 35px rgba(0,0,0,0.7)',
                display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto'
              }}
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
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px', boxShadow: '0 4px 15px rgba(245,158,11,0.35)'
                }}>
                  📦
                </div>
                <div>
                  <h2 style={{ fontSize: '19px', fontWeight: '800', color: '#fff', margin: 0 }}>
                    TẠO ĐƠN NHẬP SỈ MỚI (PURCHASE ORDER)
                  </h2>
                  <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: '3px 0 0 0' }}>
                    Quản lý đơn nhập từ nhà cung cấp & hạch toán vốn kho
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

            <form onSubmit={handleSavePurchase} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Supplier Select */}
              <div>
                <label className="form-label">Chọn Nhà Cung Cấp / Nguồn Sỉ</label>
                <select
                  className="glass-input"
                  value={formData.supplierId} onChange={e => setFormData({ ...formData, supplierId: e.target.value })}
                  required
                >
                  <option value="">-- Chọn Nhà Cung Cấp --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.phone || 'N/A'})</option>
                  ))}
                </select>
              </div>

              {/* Product Name */}
              <div>
                <label className="form-label">Tên Sản Phẩm / Dịch Vụ Nhập Về</label>
                <input
                  type="text" required className="glass-input" placeholder="VD: Canva Pro (1 năm)"
                  value={formData.productName} onChange={e => setFormData({ ...formData, productName: e.target.value })}
                />
              </div>

              {/* Link to Team Slot (Optional) */}
              <div>
                <label className="form-label">Gán Trực Tiếp Vào Kho Team (Tùy chọn)</label>
                <select
                  className="glass-input"
                  value={formData.teamId} onChange={e => setFormData({ ...formData, teamId: e.target.value })}
                >
                  <option value="">-- Không liên kết team (Nhập ngoài) --</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                  ))}
                </select>
              </div>

              {/* Cost & Quantity Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ color: '#f59e0b' }}>Tổng Tiền Vốn Mua (VNĐ) *</label>
                  <input
                    type="number" required className="glass-input" placeholder="2000000"
                    value={formData.importCost} onChange={e => setFormData({ ...formData, importCost: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ color: '#38bdf8' }}>Số Lượng Slot / Key *</label>
                  <input
                    type="number" required className="glass-input" placeholder="49"
                    value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                  />
                </div>
              </div>

              {/* Live Unit Cost Calculation Box */}
              <div style={{
                background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)',
                borderRadius: '10px', padding: '12px 14px', fontSize: '13px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ color: '#cbd5e1' }}>📊 Giá Vốn Phân Bổ Cho 1 Slot Bán Ra:</span>
                <strong style={{ color: '#10b981', fontSize: '15px' }}>
                  {liveUnitCost.toLocaleString()}đ / slot
                </strong>
              </div>

              {/* Payment Status & Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Trạng Thái Thanh Toán Cho NCC</label>
                  <select
                    className="glass-input"
                    value={formData.paymentStatus} onChange={e => setFormData({ ...formData, paymentStatus: e.target.value })}
                  >
                    <option value="PAID">Đã Thanh Toán (Sinh Phiếu Chi Sổ Quỹ)</option>
                    <option value="DEBT">Nợ NCC (Ghi Nhận Công Nợ Phải Trả)</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Ngày Nhập Hàng</label>
                  <input
                    type="date" className="glass-input"
                    value={formData.purchaseDate} onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="form-label">Ghi Chú Nhập Hàng</label>
                <input
                  type="text" className="glass-input" placeholder="VD: Mua gói Canva Pro Edu 49 slots giá sỉ chiết khấu..."
                  value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="glass-button" style={{ flex: 1, background: 'linear-gradient(135deg, #6366f1, #10b981)', color: '#fff', fontWeight: '700' }}>
                  💾 Xác Nhận Lập Phiếu Nhập Hàng
                </button>
                <button type="button" onClick={closeModal} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>
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
        title="Xóa Phiếu Nhập Hàng?"
        message="Bạn có chắc muốn xóa phiếu nhập hàng này khỏi sổ sách?"
        onConfirm={handleDeletePurchase}
        onCancel={() => setConfirmDeleteId(null)}
        confirmLabel="Xác Nhận Xóa"
      />
    </div>
  );
}
