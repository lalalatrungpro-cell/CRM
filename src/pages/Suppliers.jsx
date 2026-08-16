import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SupplierService, OrderService, ProductService, SupplierPriceService, TeamService, PurchaseService } from '../utils/dataService';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { Truck, Plus, Eye, Edit2, ShieldCheck, AlertTriangle, CheckCircle, X, Trash2, Search, BarChart2, Award, MessageCircle, Send, Bot, Phone } from 'lucide-react';

export default function Suppliers() {
  const navigate = useNavigate();
  const toast = useToast();
  const { shopId } = useAuth();

  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [teams, setTeams] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [todayPrices, setTodayPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('LIST');
  const [selectedCompareProduct, setSelectedCompareProduct] = useState('');
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceFormData, setPriceFormData] = useState({ supplierId: '', productName: '', price: '', notes: '', syncToProduct: false });

  // Modals & Forms
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', zalo: '', telegram: '', bot_link: '', notes: '', warranty_policy: 'FULL_WARRANTY', warranty_duration_days: 30, warranty_note: '' });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');

    const handleOpenPriceModal = (prodName = '') => {
    setPriceFormData({
      supplierId: suppliers.length > 0 ? String(suppliers[0].id) : '',
      productName: prodName || selectedCompareProduct || (products.length > 0 ? products[0].name : ''),
      price: '',
      notes: '',
      syncToProduct: false
    });
    setShowPriceModal(true);
  };

  const handleSavePriceModal = async (e) => {
    e.preventDefault();
    if (!priceFormData.supplierId || !priceFormData.productName || !priceFormData.price) {
      return toast.error('Vui lòng chọn Nhà Cung Cấp, Sản Phẩm và Nhập Giá Sỉ!');
    }
    try {
      await SupplierPriceService.saveDailyPrice(shopId, {
        supplierId: priceFormData.supplierId,
        productName: priceFormData.productName,
        price: Number(priceFormData.price),
        notes: priceFormData.notes,
        syncToProduct: priceFormData.syncToProduct
      });
      toast.success('Đã nạp báo giá sỉ hôm nay thành công!');
      setShowPriceModal(false);
      const updatedPrices = await SupplierPriceService.listTodayPrices(shopId);
      setTodayPrices(updatedPrices || []);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi lưu báo giá sỉ.');
    }
  };

  const loadData = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const [suppList, orderList, teamList, purchaseList, prodList, priceList] = await Promise.all([
        SupplierService.list(shopId),
        OrderService.list(shopId),
        TeamService.list(shopId),
        PurchaseService.list(shopId),
        ProductService.list(shopId),
        SupplierPriceService.listTodayPrices(shopId)
      ]);
      setSuppliers(suppList || []);
      setOrders(orderList || []);
      setTeams(teamList || []);
      setPurchases(purchaseList || []);
      setProducts(prodList || []);
      setTodayPrices(priceList || []);
      if ((prodList || []).length > 0) setSelectedCompareProduct(prodList[0].name);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải nhà cung cấp!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [shopId]);

  const closeModal = () => {
    setShowModal(false);
    setEditingSupplier(null);
    setFormData({ name: '', phone: '', zalo: '', telegram: '', bot_link: '', notes: '' });
  };

  const handleOpenAddModal = () => {
    setEditingSupplier(null);
    setFormData({ name: '', phone: '', zalo: '', telegram: '', bot_link: '', notes: '' });
    setShowModal(true);
  };

  const handleOpenEditModal = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name || '',
      phone: supplier.phone || '',
      zalo: supplier.zalo || '',
      telegram: supplier.telegram || '',
      bot_link: supplier.bot_link || supplier.botLink || '',
      notes: supplier.notes || ''
    });
    setShowModal(true);
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    if (!formData.name) return toast.error('Vui lòng nhập tên nhà cung cấp.');

    try {
      if (editingSupplier) {
        await SupplierService.update(editingSupplier.id, formData);
        setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? { ...s, ...formData } : s));
        toast.success(`Đã cập nhật nhà cung cấp "${formData.name}"!`);
      } else {
        const created = await SupplierService.create(shopId, {
          ...formData,
          debt: 0
        });
        setSuppliers(prev => [created, ...prev]);
        toast.success(`Đã thêm nhà cung cấp "${created.name}" thành công!`);
      }
      closeModal();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi lưu nhà cung cấp.');
    }
  };

  const handleDeleteSupplier = async () => {
    const id = confirmDeleteId;
    const hasOrders = orders.some(o => String(o.supplier_id || o.supplierId) === String(id));
    if (hasOrders) {
      toast.error('Không thể xóa nhà cung cấp đang có đơn hàng liên kết!');
      setConfirmDeleteId(null);
      return;
    }

    try {
      await SupplierService.remove(id);
      setSuppliers(prev => prev.filter(s => String(s.id) !== String(id)));
      setConfirmDeleteId(null);
      toast.success('Đã xóa nhà cung cấp!');
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi xóa nhà cung cấp.');
    }
  };

  const getReliabilityMetric = (supplierId) => {
    const suppOrders = orders.filter(o => String(o.supplier_id || o.supplierId) === String(supplierId));
    const suppTeams = teams.filter(t => String(t.supplier_id || t.supplierId) === String(supplierId));
    const suppPurchases = purchases.filter(p => String(p.supplier_id || p.supplierId) === String(supplierId));

    const totalOrders = suppOrders.length;
    const totalCount = totalOrders + suppTeams.length + suppPurchases.length;

    if (totalCount === 0) {
      return { label: 'CHƯA CÓ KHO / ĐƠN', color: '#64748b', bg: 'rgba(100,116,139,0.15)', icon: ShieldCheck, totalCount, suppOrdersCount: totalOrders, suppTeamsCount: suppTeams.length, suppPurchasesCount: suppPurchases.length };
    }

    if (totalOrders === 0) {
      return { label: `ĐÃ NHẬP KHO (${suppTeams.length + suppPurchases.length} KHO/PHIẾU)`, color: '#38bdf8', bg: 'rgba(56,189,248,0.15)', icon: CheckCircle, totalCount, suppOrdersCount: totalOrders, suppTeamsCount: suppTeams.length, suppPurchasesCount: suppPurchases.length };
    }

    const warrantyOrders = suppOrders.filter(o => o.status === 'Bảo hành' || o.status?.includes('Hoàn tiền') || o.status?.includes('Từ chối'));
    const errRate = (warrantyOrders.length / totalOrders) * 100;

    if (errRate === 0) return { label: 'UY TÍN CAO (0% LỖI)', color: '#10b981', bg: 'rgba(16,185,129,0.15)', icon: CheckCircle, totalCount, suppOrdersCount: totalOrders, suppTeamsCount: suppTeams.length, suppPurchasesCount: suppPurchases.length };
    if (errRate <= 15) return { label: `TRUNG BÌNH (${errRate.toFixed(0)}% LỖI)`, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: AlertTriangle, totalCount, suppOrdersCount: totalOrders, suppTeamsCount: suppTeams.length, suppPurchasesCount: suppPurchases.length };
    return { label: `RỦI RO CAO (${errRate.toFixed(0)}% LỖI)`, color: '#ef4444', bg: 'rgba(239,68,68,0.15)', icon: AlertTriangle, totalCount, suppOrdersCount: totalOrders, suppTeamsCount: suppTeams.length, suppPurchasesCount: suppPurchases.length };
  };

  const filteredSuppliers = suppliers.filter(s => {
    return (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
           (s.phone || '').includes(searchTerm) ||
           (s.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Quản Lý Nhà Cung Cấp & Nguồn Sỉ 360°</h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: '13px' }}>
            Theo dõi uy tín nguồn sỉ, công nợ nhập sỉ và đa kênh liên lạc Hotline / Zalo / Telegram / Bot.
          </p>
        </div>

        <button className="glass-button" onClick={handleOpenAddModal} style={{ background: '#38bdf8', color: '#fff', fontWeight: 'bold' }}>
          <Plus size={18} /> Thêm Nhà Cung Cấp Mới
        </button>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('LIST')}
          style={{
            padding: '10px 18px', borderRadius: '10px',
            border: activeTab === 'LIST' ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
            background: activeTab === 'LIST' ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
            color: '#fff', fontWeight: 'bold', fontSize: '13.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <Truck size={18} color="#6366f1" /> 🚚 Danh Sách Nguồn Sỉ ({suppliers.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('COMPARE')}
          style={{
            padding: '10px 18px', borderRadius: '10px',
            border: activeTab === 'COMPARE' ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
            background: activeTab === 'COMPARE' ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.04)',
            color: '#fff', fontWeight: 'bold', fontSize: '13.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <BarChart2 size={18} color="#10b981" /> 📊 So Sánh Giá Sỉ Hôm Nay
        </button>
      </div>

      {/* TAB 1: SUPPLIERS LIST */}
      {activeTab === 'LIST' && (
        <>
          {/* Search Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '400px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 14px' }}>
            <Search size={16} color="#475569" />
            <input
              type="text"
              placeholder="Tìm nhà cung cấp theo tên, SĐT hoặc ghi chú..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ background: 'none', border: 'none', color: '#fff', outline: 'none', width: '100%', fontSize: '13.5px' }}
            />
            {searchTerm && <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}><X size={14} /></button>}
          </div>

          {/* Grid List */}
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Đang tải danh sách nguồn sỉ...</div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="glass-panel empty-state">
              <Truck size={40} />
              <h3>Không tìm thấy nhà cung cấp nào</h3>
              <p>Tạo nhà cung cấp mới để quản lý nguồn hàng nhập sỉ.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
              {filteredSuppliers.map(s => {
                const rel = getReliabilityMetric(s.id);
                const RelIcon = rel.icon;

                return (
                  <div key={s.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', padding: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#fff' }}>{s.name}</h3>
                        <p style={{ fontSize: '12.5px', color: '#94a3b8', marginTop: '2px' }}>SĐT: {s.phone || 'Chưa cập nhật'}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => handleOpenEditModal(s)} style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', padding: '4px' }}>
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => setConfirmDeleteId(s.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span className="badge" style={{ background: rel.bg, color: rel.color, padding: '4px 10px', fontSize: '11px' }}>
                        <RelIcon size={12} /> {rel.label}
                      </span>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>({rel.suppTeamsCount} Kho Team / {rel.suppOrdersCount} Đơn POS)</span>
                    </div>

                    {/* Multi-Channel Interactive Contact Badges */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {(s.phone || '').split(',').map(p => p.trim()).filter(Boolean).slice(0, 2).map((phoneNo, idx) => (
                        <a key={'p-' + idx} href={"tel:" + phoneNo} className="glass-button" style={{ padding: '3px 8px', fontSize: '11px', background: 'rgba(245,158,11,0.18)', color: '#f59e0b', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={11} /> {phoneNo}
                        </a>
                      ))}

                      {(s.zalo || s.phone || '').split(',').map(z => z.trim()).filter(Boolean).slice(0, 2).map((zaloVal, idx) => (
                        <a key={'z-' + idx} href={"https://zalo.me/" + zaloVal.replace(/[^0-9]/g, '')} target="_blank" rel="noreferrer" className="glass-button" style={{ padding: '3px 8px', fontSize: '11px', background: 'rgba(59,130,246,0.18)', color: '#3b82f6', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <MessageCircle size={11} /> Zalo
                        </a>
                      ))}

                      {(s.telegram || '').split(',').map(t => t.trim()).filter(Boolean).slice(0, 2).map((teleVal, idx) => (
                        <a key={'t-' + idx} href={"https://t.me/" + teleVal.replace('@','')} target="_blank" rel="noreferrer" className="glass-button" style={{ padding: '3px 8px', fontSize: '11px', background: 'rgba(56,189,248,0.18)', color: '#38bdf8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Send size={11} /> Telegram
                        </a>
                      ))}

                      {(s.bot_link || s.botLink || '').split(',').map(b => b.trim()).filter(Boolean).slice(0, 1).map((botVal, idx) => (
                        <a key={'b-' + idx} href={botVal.startsWith('http') ? botVal : ('https://' + botVal)} target="_blank" rel="noreferrer" className="glass-button" style={{ padding: '3px 8px', fontSize: '11px', background: 'rgba(168,85,247,0.18)', color: '#a855f7', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Bot size={11} /> Bot Auto
                        </a>
                      ))}
                    </div>

                    {s.notes && (
                      <p style={{ fontSize: '12px', color: '#cbd5e1', background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '6px', fontStyle: 'italic', margin: 0 }}>
                        "{s.notes}"
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                      <button
                        className="glass-button"
                        onClick={() => navigate(`/suppliers/${s.id}`)}
                        style={{ flex: 1, padding: '8px', fontSize: '12px', background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <Eye size={14} /> Xem Chi Tiết 360°
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2: PRICE COMPARISON MATRIX */}
      {activeTab === 'COMPARE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart2 size={20} /> Ma Trận So Sánh Giá Nhập Sỉ Giữa Các Nguồn Sỉ
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>
                Chọn sản phẩm để xem bảng so sánh giá nhập sỉ từ Thấp nhất đến Cao nhất hôm nay.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label className="form-label" style={{ margin: 0, fontWeight: 'bold', color: '#38bdf8' }}>Sản Phẩm Cần So Sánh:</label>
              <select
                className="glass-input"
                style={{ width: '220px', border: '1px solid #38bdf8' }}
                value={selectedCompareProduct} onChange={e => setSelectedCompareProduct(e.target.value)}
              >
                {products.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleOpenPriceModal(selectedCompareProduct)}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                <Plus size={15} /> Nạp Báo Giá Sỉ Mới
              </button>
            </div>
          </div>

          {/* Comparison Matrix Table */}
          {(() => {
            const matchedPrices = todayPrices.filter(p => (p.product_name || p.productName) === selectedCompareProduct);
            matchedPrices.sort((a, b) => Number(a.price) - Number(b.price));
            const lowestPrice = matchedPrices.length > 0 ? Number(matchedPrices[0].price) : 0;

            return (
              <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['Thứ Hạng', 'Tên Nhà Cung Cấp / Nguồn Sỉ', 'Số Điện Thoại', 'Giá Nhập Sỉ Hôm Nay', 'Ghi Chú Giá', 'Khuyên Dùng'].map(h => (
                        <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: '#64748b', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matchedPrices.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '40px 20px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <div style={{ color: '#94a3b8', fontSize: '13.5px' }}>
                              Chưa có báo giá sỉ hôm nay cho sản phẩm <strong style={{ color: '#38bdf8' }}>"{selectedCompareProduct}"</strong> từ bất kỳ NCC nào.
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenPriceModal(selectedCompareProduct)}
                              style={{
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '9px 18px',
                                fontSize: '13px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <Plus size={16} /> Nạp Báo Giá Sỉ Cho "{selectedCompareProduct}" Ngay
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      matchedPrices.map((pItem, idx) => {
                        const supp = suppliers.find(s => String(s.id) === String(pItem.supplier_id || pItem.supplierId));
                        const isLowest = Number(pItem.price) === lowestPrice;

                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: isLowest ? 'rgba(16,185,129,0.08)' : 'transparent' }}>
                            <td style={{ padding: '14px 16px', fontWeight: 'bold' }}>
                              {idx === 0 ? '🥇 Hạng 1' : idx === 1 ? '🥈 Hạng 2' : '🥉 Hạng ' + (idx + 1)}
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <strong style={{ color: '#fff', fontSize: '14px' }}>{supp ? supp.name : ('Nguồn Sỉ #' + (pItem.supplier_id || pItem.supplierId))}</strong>
                            </td>
                            <td style={{ padding: '14px 16px', color: '#94a3b8' }}>{supp?.phone || '---'}</td>
                            <td style={{ padding: '14px 16px', fontSize: '15px', fontWeight: '800', color: isLowest ? '#10b981' : '#f59e0b' }}>
                              {Number(pItem.price).toLocaleString()}đ
                            </td>
                            <td style={{ padding: '14px 16px', color: '#cbd5e1', fontSize: '12.5px' }}>{pItem.notes || '---'}</td>
                            <td style={{ padding: '14px 16px' }}>
                              {isLowest ? (
                                <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 10px', fontSize: '11px', background: 'rgba(16,185,129,0.2)', border: '1px solid #10b981', color: '#10b981', fontWeight: 'bold' }}>
                                  <Award size={14} /> 🟢 RẺ NHẤT HÔM NAY (ĐỀ XUẤT NHẬP)
                                </span>
                              ) : (
                                <span style={{ color: '#64748b', fontSize: '12px' }}>Giá tiêu chuẩn</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* Modal Quick Add Supplier Price */}
      {showPriceModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }} onClick={() => setShowPriceModal(false)}>
          <div style={{ background: '#111528', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#10b981', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                📋 Cập Nhật Báo Giá Sỉ Hôm Nay
              </h3>
              <button onClick={() => setShowPriceModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleSavePriceModal} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label">1. Chọn Nhà Cung Cấp (NCC) *</label>
                <select
                  className="glass-input" required
                  value={priceFormData.supplierId}
                  onChange={e => setPriceFormData({ ...priceFormData, supplierId: e.target.value })}
                >
                  <option value="">-- Chọn Nhà Cung Cấp --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.phone || 'N/A'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">2. Chọn Sản Phẩm Sỉ *</label>
                <select
                  className="glass-input" required
                  value={priceFormData.productName}
                  onChange={e => setPriceFormData({ ...priceFormData, productName: e.target.value })}
                >
                  <option value="">-- Chọn Sản Phẩm --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">3. Giá Nhập Sỉ Hôm Nay (VNĐ) *</label>
                <input
                  type="number" required min="1" className="glass-input"
                  placeholder="VD: 45000"
                  value={priceFormData.price}
                  onChange={e => setPriceFormData({ ...priceFormData, price: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">4. Ghi Chú Báo Giá (Tùy chọn)</label>
                <input
                  type="text" className="glass-input"
                  placeholder="VD: Đang khuyến mãi xả kho 10%"
                  value={priceFormData.notes}
                  onChange={e => setPriceFormData({ ...priceFormData, notes: e.target.value })}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#38bdf8', cursor: 'pointer', background: 'rgba(56,189,248,0.08)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(56,189,248,0.2)' }}>
                <input
                  type="checkbox"
                  checked={priceFormData.syncToProduct}
                  onChange={e => setPriceFormData({ ...priceFormData, syncToProduct: e.target.checked })}
                  style={{ accentColor: '#38bdf8', cursor: 'pointer' }}
                />
                <span>⚡ Đồng bộ làm Giá vốn mặc định cho POS</span>
              </label>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="glass-button" onClick={() => setShowPriceModal(false)} style={{ flex: 1, padding: '10px' }}>
                  Hủy
                </button>
                <button type="submit" className="glass-button" style={{ flex: 1.5, background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: '800', padding: '10px' }}>
                  💾 Lưu Báo Giá Sỉ
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', padding: '24px' }}>
            <div className="modal-header" style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>
                {editingSupplier ? 'Chỉnh Sửa Nhà Cung Cấp' : 'Thêm Nhà Cung Cấp Mới'}
              </h2>
              <button className="modal-close-btn" onClick={closeModal}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveSupplier} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label">Tên Nhà Cung Cấp / Tên Nguồn Sỉ</label>
                <input
                  type="text" required className="glass-input" placeholder="VD: Kho Canva Sỉ VIP 01"
                  value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">Số Điện Thoại Hotline (Nhập nhiều SĐT cách bằng dấu phẩy)</label>
                <input
                  type="text" className="glass-input" placeholder="VD: 0977666555, 0988111222"
                  value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label" style={{ color: '#3b82f6' }}>Zalo Chat / SĐT Zalo (Cách bằng dấu phẩy)</label>
                <input
                  type="text" className="glass-input" placeholder="VD: 0977666555, 0911222333"
                  value={formData.zalo} onChange={e => setFormData({ ...formData, zalo: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label" style={{ color: '#38bdf8' }}>Telegram Username</label>
                  <input
                    type="text" className="glass-input" placeholder="VD: @kho_canva_pro"
                    value={formData.telegram} onChange={e => setFormData({ ...formData, telegram: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ color: '#a855f7' }}>Link Bot Tự Động Mua Acc</label>
                  <input
                    type="text" className="glass-input" placeholder="VD: https://t.me/autobot_seller"
                    value={formData.bot_link} onChange={e => setFormData({ ...formData, bot_link: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Ghi Chú Về Nhà Cung Cấp</label>
                <textarea
                  className="glass-input" style={{ minHeight: '60px', fontSize: '12.5px' }}
                  placeholder="VD: Chuyên sỉ Canva/Office, hỗ trợ 24/7..."
                  value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              
              {/* [Phase 4] Chính Sách Bảo Hành NCC */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px', marginTop: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '10px' }}>
                  🛡️ Chính Sách Bảo Hành NCC Cho Shop
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label className="form-label">Chính Sách BH</label>
                    <select
                      className="glass-input"
                      value={formData.warranty_policy} onChange={e => setFormData({ ...formData, warranty_policy: e.target.value })}
                    >
                      <option value="FULL_WARRANTY">✅ Bảo hành 100%</option>
                      <option value="PARTIAL_WARRANTY">⚡ Bảo hành 1 phần</option>
                      <option value="EXCHANGE_ONLY">🔄 Đổi acc (không hoàn tiền)</option>
                      <option value="NO_WARRANTY">❌ Không bảo hành</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Thời Hạn BH (ngày)</label>
                    <input
                      type="number" className="glass-input" min="0" placeholder="VD: 30"
                      value={formData.warranty_duration_days} onChange={e => setFormData({ ...formData, warranty_duration_days: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">Ghi Chú BH NCC</label>
                  <input
                    type="text" className="glass-input" placeholder="VD: Đổi acc trong 7 ngày, claim qua Zalo 0977..."
                    value={formData.warranty_note} onChange={e => setFormData({ ...formData, warranty_note: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="submit" className="glass-button" style={{ flex: 1, background: '#38bdf8', color: '#fff', fontWeight: 'bold' }}>
                  Lưu Nhà Cung Cấp
                </button>
                <button type="button" onClick={closeModal} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="Xóa Nhà Cung Cấp"
        message="Bạn có chắc chắn muốn xóa nhà cung cấp này? Thao tác này không thể hoàn tác."
        onConfirm={handleDeleteSupplier}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
