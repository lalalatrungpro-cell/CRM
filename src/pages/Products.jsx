import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { ProductService, SupplierPriceService } from '../utils/dataService';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  Package, Plus, Edit2, Trash2, X, Search, ChevronLeft, ChevronRight,
  LayoutGrid, Table, TrendingUp, FileText, AlertTriangle, CheckCircle, Zap, RefreshCw, Layers
} from 'lucide-react';

const PAGE_SIZE = 12;

export default function Products() {
  const toast = useToast();
  const { shopId } = useAuth();

  const [products, setProducts] = useState([]);
  const [pricingMatrix, setPricingMatrix] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('CARDS'); // 'CARDS' | 'MATRIX'

  // Modals & Forms
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const emptyForm = {
    name: '',
    category: 'Canva Pro',
    customCategory: '',
    defaultDurationDays: 30,
    defaultSell: 150000,
    priceCtv: 110000,
    priceSi: 80000,
    defaultCost: 50000,
    productType: 'SUBSCRIPTION',
    maxSlots: 5,
    description: ''
  };

  const [formData, setFormData] = useState(emptyForm);

  const loadData = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const [prodData, matrixData] = await Promise.all([
        ProductService.list(shopId),
        SupplierPriceService.getPricingMatrix(shopId)
      ]);
      setProducts(prodData || []);
      setPricingMatrix(matrixData || []);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải danh sách sản phẩm mẫu & ma trận giá!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [shopId]);

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setIsCustomCategory(false);
    setFormData(emptyForm);
  };

  const existingCategories = Array.from(new Set([
    'Canva Pro',
    'Netflix Premium',
    'Google AI Pro',
    'CapCut Pro',
    'Zoom Pro',
    'ChatGPT Plus',
    'Youtube Premium',
    'Spotify Premium',
    'Gói Khác',
    ...products.map(p => p.category).filter(Boolean)
  ]));

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setIsCustomCategory(false);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const handleOpenEditModal = (prod) => {
    setEditingProduct(prod);
    const isCustom = !existingCategories.includes(prod.category);
    setIsCustomCategory(isCustom);
    setFormData({
      name: prod.name || '',
      category: isCustom ? 'CUSTOM_NEW' : (prod.category || 'Canva Pro'),
      customCategory: isCustom ? prod.category : '',
      defaultDurationDays: prod.default_duration_days || prod.defaultDurationDays || 30,
      defaultSell: prod.default_sell || prod.defaultSell || 150000,
      priceCtv: prod.price_ctv || prod.priceCtv || (prod.default_sell ? Math.round(prod.default_sell * 0.75) : 110000),
      priceSi: prod.price_si || prod.priceSi || (prod.default_sell ? Math.round(prod.default_sell * 0.55) : 80000),
      defaultCost: prod.default_cost || prod.defaultCost || 50000,
  productType: prod.product_type || prod.productType || 'SUBSCRIPTION',
      maxSlots: prod.max_slots || prod.maxSlots || 5
    });
    setShowModal(true);
  };

  const handleCategorySelectChange = (val) => {
    if (val === 'CUSTOM_NEW') {
      setIsCustomCategory(true);
      setFormData(f => ({ ...f, category: 'CUSTOM_NEW' }));
    } else {
      setIsCustomCategory(false);
      setFormData(f => ({ ...f, category: val }));
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Vui lòng nhập tên sản phẩm!');

    const finalCategory = isCustomCategory
      ? (formData.customCategory.trim() || 'Gói Khác')
      : formData.category;

    const sellVal = parseFloat(formData.defaultSell) || 0;
    const ctvVal = parseFloat(formData.priceCtv) || (sellVal * 0.75);
    const siVal = parseFloat(formData.priceSi) || (sellVal * 0.55);
    const costVal = parseFloat(formData.defaultCost) || 0;

    const payload = {
      name: formData.name.trim(),
      category: finalCategory,
      default_duration_days: parseInt(formData.defaultDurationDays) || 30,
      default_sell: sellVal,
      price_ctv: ctvVal,
      price_si: siVal,
    product_type: formData.productType || 'SUBSCRIPTION',
      default_cost: costVal,
      max_slots: parseInt(formData.maxSlots) || 5
    };

    try {
      if (editingProduct) {
        const updated = await ProductService.update(editingProduct.id, payload);
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? updated : p));
        toast.success(`Đã cập nhật sản phẩm "${updated.name}"!`);
      } else {
        const created = await ProductService.create(shopId, payload);
        setProducts(prev => [created, ...prev]);
        toast.success(`Đã thêm sản phẩm "${created.name}" thành công!`);
      }
      closeModal();
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi lưu sản phẩm.');
    }
  };

  const handleDeleteProduct = async () => {
    const id = confirmDeleteId;
    try {
      await ProductService.remove(id);
      setProducts(prev => prev.filter(p => String(p.id) !== String(id)));
      setConfirmDeleteId(null);
      toast.success('Đã xóa sản phẩm mẫu!');
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi xóa sản phẩm.');
    }
  };

  const handleSyncBestCost = async (prodName, bestCost) => {
    if (!prodName || !bestCost) return;
    try {
      await SupplierPriceService.syncDailyPriceToProductCost(shopId, prodName, bestCost);
      toast.success(`Đã đồng bộ giá vốn ${Number(bestCost).toLocaleString()}đ cho "${prodName}"!`);
      loadData();
    } catch (err) {
      toast.error('Lỗi khi đồng bộ giá vốn.');
    }
  };

  // Helper matching product with its matrix item
  const getMatrixItem = (prodName) => {
    return pricingMatrix.find(m => m.product?.name === prodName);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'ALL' || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE) || 1;
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Live calculations for modal preview
  const previewSell = parseFloat(formData.defaultSell) || 0;
  const previewCtv = parseFloat(formData.priceCtv) || (previewSell * 0.75);
  const previewSi = parseFloat(formData.priceSi) || (previewSell * 0.55);
  const previewCost = parseFloat(formData.defaultCost) || 0;

  const previewProfitLe = previewSell - previewCost;
  const previewMarginLe = previewSell > 0 ? Math.round((previewProfitLe / previewSell) * 100) : 0;
  const previewProfitCtv = previewCtv - previewCost;
  const previewMarginCtv = previewCtv > 0 ? Math.round((previewProfitCtv / previewCtv) * 100) : 0;
  const previewProfitSi = previewSi - previewCost;
  const previewMarginSi = previewSi > 0 ? Math.round((previewProfitSi / previewSi) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.02em', margin: 0 }}>
            Bảng Giá 3 Tầng & Sản Phẩm POS 360°
          </h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: '13px', margin: 0 }}>
            Thiết lập giá bán 3 tầng (Lẻ - CTV - Sỉ), đối soát giá sỉ hôm nay và kiểm soát biên lợi nhuận ròng.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="glass-button" onClick={loadData} title="Tải lại dữ liệu" style={{ padding: '8px 12px' }}>
            <RefreshCw size={16} />
          </button>
          <button className="glass-button" onClick={handleOpenAddModal} style={{ background: 'linear-gradient(135deg, #6366f1, #10b981)', color: '#fff', fontWeight: '700' }}>
            <Plus size={18} /> Thêm Sản Phẩm Mới
          </button>
        </div>
      </div>

      {/* View Mode & Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        {/* Search & Filter Bar */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '260px', flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 14px' }}>
            <Search size={16} color="#475569" />
            <input
              type="text"
              placeholder="Tìm tên sản phẩm hoặc danh mục..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ background: 'none', border: 'none', color: '#fff', outline: 'none', width: '100%', fontSize: '13.5px' }}
            />
            {searchTerm && <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}><X size={14} /></button>}
          </div>

          <select
            className="glass-input" style={{ width: 'auto' }}
            value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setCurrentPage(1); }}
          >
            <option value="ALL">Tất cả danh mục ({existingCategories.length})</option>
            {existingCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* View Mode Switcher */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '3px' }}>
          <button
            type="button"
            onClick={() => setViewMode('CARDS')}
            style={{
              padding: '7px 14px', borderRadius: '7px', border: 'none',
              background: viewMode === 'CARDS' ? '#6366f1' : 'transparent',
              color: viewMode === 'CARDS' ? '#fff' : '#94a3b8',
              fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <LayoutGrid size={15} /> Thẻ POS
          </button>
          <button
            type="button"
            onClick={() => setViewMode('MATRIX')}
            style={{
              padding: '7px 14px', borderRadius: '7px', border: 'none',
              background: viewMode === 'MATRIX' ? '#10b981' : 'transparent',
              color: viewMode === 'MATRIX' ? '#fff' : '#94a3b8',
              fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <Table size={15} /> Ma Trận Lãi Ròng 3 Tầng
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>Đang tải bảng giá & phân tích biên lợi nhuận...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="glass-panel empty-state">
          <Package size={40} />
          <h3>Không tìm thấy sản phẩm nào</h3>
          <p>Tạo sản phẩm mẫu mới để tự động hóa khâu điền đơn hàng.</p>
        </div>
      ) : viewMode === 'CARDS' ? (
        /* ==================== VIEW MODE 1: GRID CARDS ==================== */
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {paginatedProducts.map(prod => {
              const matrix = getMatrixItem(prod.name);
              const sellP = prod.default_sell || prod.defaultSell || 0;
              const ctvP = prod.price_ctv || prod.priceCtv || (sellP ? Math.round(sellP * 0.75) : 0);
              const siP = prod.price_si || prod.priceSi || (sellP ? Math.round(sellP * 0.55) : 0);
              const costP = prod.default_cost || prod.defaultCost || 0;
              const durDays = prod.default_duration_days || prod.defaultDurationDays || 30;

              const bestSupp = matrix?.bestSupplier;
              const lowestCost = matrix?.lowestCost || costP;
              const isCostDifferent = bestSupp && bestSupp.price !== costP;

              return (
                <div
                  key={prod.id}
                  className="glass-panel"
                  style={{
                    display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative',
                    border: (matrix?.alertLevel === 'DANGER') ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.08)'
                  }}
                >
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span className="badge badge-info" style={{ fontSize: '10px' }}>{prod.category}</span>
                      <h3 style={{ fontSize: '16.5px', fontWeight: '800', color: '#fff', marginTop: '4px', margin: 0 }}>{prod.name}</h3>
                      <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0' }}>Hạn dùng chuẩn: {durDays} ngày • Max slots: {prod.max_slots || prod.maxSlots || 1}</p>
                      {prod.description && (
                        <div style={{ fontSize: '11.5px', color: '#94a3b8', background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '6px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                          <FileText size={13} color="#38bdf8" style={{ marginTop: '2px', flexShrink: 0 }} />
                          <span style={{ lineClamp: 2, WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {prod.description}
                          </span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => handleOpenEditModal(prod)} title="Chỉnh sửa sản phẩm" style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', padding: '4px' }}>
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => setConfirmDeleteId(prod.id)} title="Xóa sản phẩm" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* 3-Tier Selling Prices & Margins */}
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      🏷️ Giá Bán 3 Tầng & Lãi Thuần
                    </div>

                    {/* Lẻ */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                      <span style={{ color: '#cbd5e1' }}>🟢 Khách Lẻ:</span>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ color: '#10b981' }}>{sellP.toLocaleString()}đ</strong>
                        <span style={{ fontSize: '11px', color: '#6ee7b7', marginLeft: '6px' }}>
                          (+{(sellP - lowestCost).toLocaleString()}đ • {sellP > 0 ? Math.round(((sellP - lowestCost) / sellP) * 100) : 0}%)
                        </span>
                      </div>
                    </div>

                    {/* CTV */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                      <span style={{ color: '#cbd5e1' }}>🟡 Khách CTV:</span>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ color: '#f59e0b' }}>{ctvP.toLocaleString()}đ</strong>
                        <span style={{ fontSize: '11px', color: '#fde68a', marginLeft: '6px' }}>
                          (+{(ctvP - lowestCost).toLocaleString()}đ • {ctvP > 0 ? Math.round(((ctvP - lowestCost) / ctvP) * 100) : 0}%)
                        </span>
                      </div>
                    </div>

                    {/* Sỉ */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                      <span style={{ color: '#cbd5e1' }}>🟣 Khách Sỉ:</span>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ color: (siP - lowestCost <= 0) ? '#ef4444' : '#a855f7' }}>{siP.toLocaleString()}đ</strong>
                        <span style={{ fontSize: '11px', color: (siP - lowestCost <= 0) ? '#fca5a5' : '#d8b4fe', marginLeft: '6px' }}>
                          (+{(siP - lowestCost).toLocaleString()}đ • {siP > 0 ? Math.round(((siP - lowestCost) / siP) * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cost & Supplier Today Indicator */}
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 12px', borderRadius: '10px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#94a3b8' }}>Giá vốn chuẩn POS:</span>
                      <strong style={{ color: '#fff' }}>{costP.toLocaleString()}đ</strong>
                    </div>

                    {bestSupp ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '4px' }}>
                        <div>
                          <span style={{ color: '#38bdf8', fontWeight: '700' }}>⚡ Nguồn sỉ tốt nhất: </span>
                          <span style={{ color: '#e2e8f0' }}>{bestSupp.name} ({bestSupp.price.toLocaleString()}đ)</span>
                        </div>
                        {isCostDifferent && (
                          <button
                            type="button"
                            onClick={() => handleSyncBestCost(prod.name, bestSupp.price)}
                            title="Đồng bộ giá sỉ này làm giá vốn chuẩn cho POS"
                            style={{
                              padding: '2px 8px', borderRadius: '6px', border: '1px solid #38bdf8',
                              background: 'rgba(56,189,248,0.15)', color: '#38bdf8', fontSize: '10.5px', fontWeight: 'bold', cursor: 'pointer'
                            }}
                          >
                            Áp dụng
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ color: '#64748b', fontStyle: 'italic', fontSize: '11px' }}>Chưa có báo giá sỉ riêng từ NCC hôm nay.</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination" style={{ marginTop: '10px' }}>
              <button
                className="page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: '13px', color: '#94a3b8', padding: '0 8px' }}>
                Trang {currentPage} / {totalPages} (Tổng {filteredProducts.length} sản phẩm)
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
      ) : (
        /* ==================== VIEW MODE 2: PRICING MATRIX TABLE ==================== */
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(90deg, rgba(99,102,241,0.15), transparent)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Table size={18} color="#10b981" /> Bảng Ma Trận Định Giá Tập Trung & Giám Sát Biên Lãi 3 Tầng
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' }}>
              Tự động đối soát giá sỉ tốt nhất hôm nay với 3 mức giá bán để cảnh báo biên lợi nhuận thời gian thực.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Sản Phẩm (SKU)', 'Giá Vốn / NCC Tốt Nhất', 'Giá Lẻ (Lãi • Margin)', 'Giá CTV (Lãi • Margin)', 'Giá Sỉ (Lãi • Margin)', 'Biên Độ Lãi', 'Thao Tác'].map(h => (
                    <th key={h} style={{ padding: '14px 16px', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(prod => {
                  const m = getMatrixItem(prod.name);
                  const sellP = prod.default_sell || prod.defaultSell || 0;
                  const ctvP = prod.price_ctv || prod.priceCtv || (sellP ? Math.round(sellP * 0.75) : 0);
                  const siP = prod.price_si || prod.priceSi || (sellP ? Math.round(sellP * 0.55) : 0);
                  const costP = prod.default_cost || prod.defaultCost || 0;
                  const lowestCost = m?.lowestCost || costP;
                  const bestSupp = m?.bestSupplier;

                  const profitLe = sellP - lowestCost;
                  const marginLe = sellP > 0 ? Math.round((profitLe / sellP) * 100) : 0;
                  const profitCtv = ctvP - lowestCost;
                  const marginCtv = ctvP > 0 ? Math.round((profitCtv / ctvP) * 100) : 0;
                  const profitSi = siP - lowestCost;
                  const marginSi = siP > 0 ? Math.round((profitSi / siP) * 100) : 0;

                  const alertLvl = (profitSi <= 0 || profitCtv <= 0 || profitLe <= 0 || marginSi < 10)
                    ? 'DANGER'
                    : (marginSi < 20 || marginCtv < 30) ? 'WARNING' : 'SAFE';

                  return (
                    <tr key={prod.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: alertLvl === 'DANGER' ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                      {/* Product Name */}
                      <td style={{ padding: '14px 16px' }}>
                        <span className="badge badge-info" style={{ fontSize: '9px', marginBottom: '2px', display: 'inline-block' }}>{prod.category}</span>
                        <div style={{ fontWeight: '700', color: '#fff', fontSize: '14px' }}>{prod.name}</div>
                      </td>

                      {/* Best Cost & Supplier */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '700', color: '#f59e0b', fontSize: '14px' }}>{lowestCost.toLocaleString()}đ</div>
                        <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '2px' }}>
                          {bestSupp ? `Nguồn: ${bestSupp.name}` : 'Mặc định POS'}
                        </div>
                        {bestSupp && bestSupp.price !== costP && (
                          <button
                            type="button"
                            onClick={() => handleSyncBestCost(prod.name, bestSupp.price)}
                            style={{ marginTop: '4px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(56,189,248,0.2)', color: '#38bdf8', border: '1px solid #38bdf8', fontSize: '10px', cursor: 'pointer' }}
                          >
                            ⚡ Đồng bộ vốn
                          </button>
                        )}
                      </td>

                      {/* Retail Price */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '700', color: '#10b981', fontSize: '14px' }}>{sellP.toLocaleString()}đ</div>
                        <div style={{ fontSize: '11.5px', color: '#6ee7b7', marginTop: '2px' }}>
                          +{profitLe.toLocaleString()}đ • <strong>{marginLe}%</strong>
                        </div>
                      </td>

                      {/* CTV Price */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '700', color: '#f59e0b', fontSize: '14px' }}>{ctvP.toLocaleString()}đ</div>
                        <div style={{ fontSize: '11.5px', color: '#fde68a', marginTop: '2px' }}>
                          +{profitCtv.toLocaleString()}đ • <strong>{marginCtv}%</strong>
                        </div>
                      </td>

                      {/* Wholesale Price */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '700', color: profitSi <= 0 ? '#ef4444' : '#a855f7', fontSize: '14px' }}>{siP.toLocaleString()}đ</div>
                        <div style={{ fontSize: '11.5px', color: profitSi <= 0 ? '#fca5a5' : '#d8b4fe', marginTop: '2px' }}>
                          {profitSi <= 0 ? '⚠️ LỖ ' : '+'}{profitSi.toLocaleString()}đ • <strong>{marginSi}%</strong>
                        </div>
                      </td>

                      {/* Alert Status */}
                      <td style={{ padding: '14px 16px' }}>
                        {alertLvl === 'SAFE' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px', background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', fontSize: '11px', fontWeight: 'bold' }}>
                            <CheckCircle size={12} /> 🟢 An toàn
                          </span>
                        ) : alertLvl === 'WARNING' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', fontSize: '11px', fontWeight: 'bold' }}>
                            <AlertTriangle size={12} /> 🟡 Lãi cận biên
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px', background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: '1px solid #ef4444', fontSize: '11px', fontWeight: 'bold' }}>
                            <AlertTriangle size={12} /> 🔴 Báo động lỗ
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td style={{ padding: '14px 16px' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(prod)}
                          className="glass-button"
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                        >
                          <Edit2 size={13} /> Sửa giá
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== POPUP MODAL: ADD / EDIT PRODUCT ==================== */}
      {showModal && createPortal(
        <div className="global-modal-overlay" onClick={closeModal}>
          <div className="global-modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', padding: '24px' }}>
            <div className="modal-header" style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} color="#6366f1" />
                {editingProduct ? 'Chỉnh Sửa Sản Phẩm & Định Giá 3 Tầng' : 'Thêm Sản Phẩm Mới & Định Giá 3 Tầng'}
              </h2>
              <button className="modal-close-btn" onClick={closeModal}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Product Name */}
              <div>
                <label className="form-label">Tên Sản Phẩm / Dịch Vụ *</label>
                <input
                  type="text" required className="glass-input" placeholder="VD: Canva Pro (1 năm)"
                  value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Product Description */}
              <div>
                <label className="form-label">Mô Tả Sản Phẩm / Quy Cách Dịch Vụ & Bảo Hành</label>
                <textarea
                  className="glass-input"
                  rows={2}
                  placeholder="VD: Kích hoạt qua Email cá nhân. Bảo hành 1 đổi 1 trong 365 ngày..."
                  value={formData.description || ''}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  style={{ resize: 'vertical', fontSize: '13px' }}
                />
              </div>

              {/* Category */}
              <div>
                <label className="form-label">Danh Mục Dịch Vụ</label>
                <select
                  className="glass-input"
                  value={formData.category} onChange={e => handleCategorySelectChange(e.target.value)}
                >
                  {existingCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="CUSTOM_NEW">+ Thêm Danh Mục Mới...</option>
                </select>
              </div>

              {isCustomCategory && (
                <div>
                  <label className="form-label">Tên Danh Mục Mới</label>
                  <input
                    type="text" required className="glass-input" placeholder="VD: Adobe Creative Cloud"
                    value={formData.customCategory} onChange={e => setFormData({ ...formData, customCategory: e.target.value })}
                  />
                </div>
              )}

              {/* Row: Giá Vốn & Loại Sản Phẩm */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ color: '#f59e0b', fontWeight: '700' }}>Giá Vốn Mặc Định Nhập Hàng (VNĐ)</label>
                  <input
                    type="number" required className="glass-input" placeholder="VD: 50000"
                    value={formData.defaultCost} onChange={e => setFormData({ ...formData, defaultCost: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: '700' }}>Loại Sản Phẩm</label>
                  <select
                    className="glass-input"
                    value={formData.productType || 'SUBSCRIPTION'}
                    onChange={e => setFormData({ ...formData, productType: e.target.value })}
                  >
                    <option value="SUBSCRIPTION">📅 Có thời hạn (Subscription)</option>
                    <option value="TEAM_SLOT">👥 Team Slot (Dùng chung)</option>
                    <option value="ONE_TIME">🔑 Mua 1 lần (License)</option>
                    <option value="EVERGREEN">♾️ Vĩnh Viễn (Khóa học, Template)</option>
                  </select>
                </div>
              </div>

              {/* 3-Tier Selling Prices Container */}
              <div style={{
                background: 'linear-gradient(145deg, rgba(17, 24, 39, 0.8), rgba(30, 41, 59, 0.6))',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '12px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🏷️ THIẾT LẬP GIÁ BÁN 3 TẦNG (LẺ - CTV - SỈ)
                  </span>
                  <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                    Tự động tính biên lãi
                  </span>
                </div>

                {/* 3 Price Inputs Side-By-Side */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', padding: '8px' }}>
                    <label className="form-label" style={{ color: '#10b981', fontSize: '11.5px', fontWeight: '700', marginBottom: '4px', display: 'block' }}>
                      1. GIÁ BÁN LẺ
                    </label>
                    <input
                      type="number" required className="glass-input" style={{ fontSize: '13.5px', fontWeight: '700', color: '#10b981', background: 'rgba(0,0,0,0.25)' }}
                      placeholder="0"
                      value={formData.defaultSell} onChange={e => setFormData({ ...formData, defaultSell: e.target.value })}
                    />
                  </div>

                  <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', padding: '8px' }}>
                    <label className="form-label" style={{ color: '#f59e0b', fontSize: '11.5px', fontWeight: '700', marginBottom: '4px', display: 'block' }}>
                      2. GIÁ BÁN CTV
                    </label>
                    <input
                      type="number" required className="glass-input" style={{ fontSize: '13.5px', fontWeight: '700', color: '#f59e0b', background: 'rgba(0,0,0,0.25)' }}
                      placeholder="0"
                      value={formData.priceCtv} onChange={e => setFormData({ ...formData, priceCtv: e.target.value })}
                    />
                  </div>

                  <div style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '8px', padding: '8px' }}>
                    <label className="form-label" style={{ color: '#c084fc', fontSize: '11.5px', fontWeight: '700', marginBottom: '4px', display: 'block' }}>
                      3. GIÁ BÁN SỈ
                    </label>
                    <input
                      type="number" required className="glass-input" style={{ fontSize: '13.5px', fontWeight: '700', color: '#c084fc', background: 'rgba(0,0,0,0.25)' }}
                      placeholder="0"
                      value={formData.priceSi} onChange={e => setFormData({ ...formData, priceSi: e.target.value })}
                    />
                  </div>
                </div>

                {/* Live Profit & Margin Widget */}
                <div style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  fontSize: '11.5px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '10px',
                  textAlign: 'center'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <span style={{ color: '#64748b', fontSize: '10.5px', fontWeight: '600' }}>LÃI LẺ PROMISE</span>
                    <strong style={{ color: previewProfitLe > 0 ? '#10b981' : '#ef4444', fontSize: '12.5px' }}>
                      {previewProfitLe > 0 ? '+' : ''}{previewProfitLe.toLocaleString('vi-VN')}đ
                    </strong>
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: previewProfitLe > 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: previewProfitLe > 0 ? '#10b981' : '#ef4444', fontWeight: '700' }}>
                      {previewMarginLe}% Margin
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', borderLeft: '1px solid rgba(255,255,255,0.06)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ color: '#64748b', fontSize: '10.5px', fontWeight: '600' }}>LÃI CTV PROMISE</span>
                    <strong style={{ color: previewProfitCtv > 0 ? '#f59e0b' : '#ef4444', fontSize: '12.5px' }}>
                      {previewProfitCtv > 0 ? '+' : ''}{previewProfitCtv.toLocaleString('vi-VN')}đ
                    </strong>
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: previewProfitCtv > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)', color: previewProfitCtv > 0 ? '#f59e0b' : '#ef4444', fontWeight: '700' }}>
                      {previewMarginCtv}% Margin
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <span style={{ color: '#64748b', fontSize: '10.5px', fontWeight: '600' }}>LÃI SỈ PROMISE</span>
                    <strong style={{ color: previewProfitSi > 0 ? '#c084fc' : '#ef4444', fontSize: '12.5px' }}>
                      {previewProfitSi <= 0 ? '⚠️ LỖ ' : '+'}{previewProfitSi.toLocaleString('vi-VN')}đ
                    </strong>
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: previewProfitSi > 0 ? 'rgba(168,85,247,0.15)' : 'rgba(239,68,68,0.15)', color: previewProfitSi > 0 ? '#c084fc' : '#ef4444', fontWeight: '700' }}>
                      {previewMarginSi}% Margin
                    </span>
                  </div>
                </div>
              </div>

              {/* Duration & Max slots */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Hạn Dùng Mặc Định (Ngày)</label>
                  <input
                    type="number" required className="glass-input"
                    value={formData.defaultDurationDays} onChange={e => setFormData({ ...formData, defaultDurationDays: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Số Slot Tối Đa Mặc Định</label>
                  <input
                    type="number" required className="glass-input"
                    value={formData.maxSlots} onChange={e => setFormData({ ...formData, maxSlots: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="submit" className="glass-button" style={{ flex: 1, background: 'linear-gradient(135deg, #6366f1, #10b981)', color: '#fff', fontWeight: '700' }}>
                  {editingProduct ? '💾 Cập Nhật Sản Phẩm & Bảng Giá' : '✨ Hoàn Tất Thêm Mới'}
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
        title="Xóa Sản Phẩm Mẫu?"
        message="Bạn có chắc muốn xóa sản phẩm mẫu này?"
        onConfirm={handleDeleteProduct}
        onCancel={() => setConfirmDeleteId(null)}
        confirmLabel="Xác Nhận Xóa"
      />
    </div>
  );
}
