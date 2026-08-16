import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SupplierService, TeamService, OrderService, ProductService, SupplierPriceService, SupplierCatalogService } from '../utils/dataService';
import { useToast } from '../components/Toast';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ArrowLeft, Phone, MessageCircle, Send, Bot, ShieldCheck, Trash2, Plus, Edit2, Layers, ShoppingBag, X } from 'lucide-react';

export default function SupplierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { shopId } = useAuth();

  const [supplier, setSupplier] = useState(null);
  const [teams, setTeams] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Catalog Modal
  const [showAddCatalogModal, setShowAddCatalogModal] = useState(false);
  const [catProductName, setCatProductName] = useState('');
  const [catPrice, setCatPrice] = useState('');
  const [catWarrantyPolicy, setCatWarrantyPolicy] = useState('FULL_WARRANTY');
  const [catDescription, setCatDescription] = useState('');

  // Edit Supplier Profile Modal
  const [showEditSuppModal, setShowEditSuppModal] = useState(false);
  const [suppFormData, setSuppFormData] = useState({ name: '', phone: '', zalo: '', telegram: '', bot_link: '', notes: '' });

  // Daily Price
  const [dailyProductName, setDailyProductName] = useState('');
  const [dailyPrice, setDailyPrice] = useState('');
  const [dailyNotes, setDailyNotes] = useState('');
  const [dailySyncToProduct, setDailySyncToProduct] = useState(true);

  const loadData = async () => {
    if (!shopId || !id) return;
    setLoading(true);
    try {
      const [suppList, teamList, orderList, prodList, priceList] = await Promise.all([
        SupplierService.list(shopId),
        TeamService.list(shopId),
        OrderService.list(shopId),
        ProductService.list(shopId),
        SupplierPriceService.listBySupplier(shopId, id)
      ]);

      const foundSupp = (suppList || []).find(s => String(s.id) === String(id));
      if (!foundSupp) {
        toast.error('Không tìm thấy nhà cung cấp!');
        navigate('/suppliers');
        return;
      }

      const suppTeams = (teamList || []).filter(t => String(t.supplier_id || t.supplierId) === String(id));
      const suppOrders = (orderList || []).filter(o => String(o.supplier_id || o.supplierId) === String(id));

      setSupplier(foundSupp);
      setTeams(suppTeams);
      setOrders(suppOrders);
      setProducts(prodList || []);
      setPriceHistory(priceList || []);
      const catList = await SupplierCatalogService.listBySupplier(shopId, id);
      setCatalogItems(catList || []);
      if ((catList || []).length > 0) {
        const firstCat = catList[0];
        const firstName = firstCat.product_name || firstCat.productName;
        setDailyProductName(firstName);
        setDailyPrice(String(firstCat.wholesale_price || firstCat.wholesalePrice || ''));
      } else if ((prodList || []).length > 0) {
        setDailyProductName(prodList[0].name);
      }
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải thông tin nhà cung cấp!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [shopId, id]);

  const handleSaveCatalogItem = async (e) => {
    e.preventDefault();
    if (!catProductName || !catPrice) {
      return toast.error('Vui lòng chọn sản phẩm và nhập giá sỉ chuẩn.');
    }
    try {
      await SupplierCatalogService.saveCatalogItem(shopId, {
        supplierId: id,
        productName: catProductName,
        wholesalePrice: Number(catPrice),
        warrantyPolicy: catWarrantyPolicy,
        productDescription: catDescription
      });
      toast.success('Đã lưu sản phẩm vào danh mục NCC & đồng bộ form nạp giá!');
      const newPriceStr = String(catPrice);
      setCatPrice('');
      setCatDescription('');
      setShowAddCatalogModal(false);
      const updatedCat = await SupplierCatalogService.listBySupplier(shopId, id);
      setCatalogItems(updatedCat || []);
      setDailyProductName(catProductName);
      setDailyPrice(newPriceStr);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi lưu danh mục sản phẩm.');
    }
  };

  const handleDeleteCatalogItem = async (catId) => {
    try {
      await SupplierCatalogService.deleteCatalogItem(catId);
      toast.success('Đã xóa sản phẩm khỏi danh mục NCC!');
      setCatalogItems(prev => prev.filter(c => String(c.id) !== String(catId)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEditSupplierModal = () => {
    if (!supplier) return;
    setSuppFormData({
      name: supplier.name || '',
      phone: supplier.phone || '',
      zalo: supplier.zalo || '',
      telegram: supplier.telegram || '',
      bot_link: supplier.bot_link || supplier.botLink || '',
      notes: supplier.notes || ''
    });
    setShowEditSuppModal(true);
  };

  const handleSaveSupplierProfile = async (e) => {
    e.preventDefault();
    try {
      await SupplierService.update(id, suppFormData);
      toast.success('Đã cập nhật hồ sơ & liên hệ NCC thành công!');
      setShowEditSuppModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi cập nhật nhà cung cấp.');
    }
  };

  const handleSaveDailyPrice = async (e) => {
    e.preventDefault();
    if (!dailyProductName || !dailyPrice) {
      return toast.error('Vui lòng chọn sản phẩm và nhập giá sỉ.');
    }
    try {
      await SupplierPriceService.saveDailyPrice(shopId, {
        supplierId: id,
        productName: dailyProductName,
        price: Number(dailyPrice),
        notes: dailyNotes,
        syncToProduct: dailySyncToProduct
      });
      toast.success(dailySyncToProduct ? 'Đã lưu giá sỉ & đồng bộ giá vốn POS!' : 'Đã cập nhật bảng giá sỉ hôm nay!');
      setDailyPrice('');
      setDailyNotes('');
      const updatedPrices = await SupplierPriceService.listBySupplier(shopId, id);
      setPriceHistory(updatedPrices || []);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi lưu giá sỉ.');
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Đang tải hồ sơ nguồn sỉ 360°...</div>;
  }

  if (!supplier) return null;

  const totalImportCost = orders.reduce((sum, o) => sum + (o.cost_price || o.costPrice || 0), 0);
  const unpaidOrders = orders.filter(o => o.supplier_paid === false || o.supplierPaid === false);
  const totalDebtToSupplier = unpaidOrders.reduce((sum, o) => sum + (o.cost_price || o.costPrice || 0), 0);

  // Helper: split comma-separated contact info
  const parseContacts = (str) => (str || '').split(',').map(s => s.trim()).filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Back & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button className="glass-button" onClick={() => navigate('/suppliers')} style={{ padding: '8px 12px' }}>
          <ArrowLeft size={16} /> Quay lại
        </button>
        <h1 style={{ fontSize: '22px', fontWeight: '800' }}>Hồ Sơ Nguồn Sỉ 360°: {supplier.name}</h1>
      </div>

      {/* ============ SUPPLIER PROFILE HEADER ============ */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(99,102,241,0.05))', border: '1px solid rgba(245,158,11,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          {/* Name & Notes */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', margin: 0 }}>{supplier.name}</h2>
              <button
                onClick={handleOpenEditSupplierModal}
                className="glass-button"
                style={{ padding: '4px 10px', fontSize: '11px', background: 'rgba(59,130,246,0.2)', color: '#3b82f6', border: '1px solid #3b82f6', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <Edit2 size={12} /> ✏️ Sửa Hồ Sơ & Đa Liên Hệ
              </button>
            </div>
            {supplier.notes && (
              <p style={{ color: '#cbd5e1', fontSize: '13px', marginTop: '6px', fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '8px' }}>
                "{supplier.notes}"
              </p>
            )}
          </div>

          {/* Multi-Channel Contact Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxWidth: '520px', justifyContent: 'flex-end' }}>
            {parseContacts(supplier.phone).map((phoneNo, idx) => (
              <a key={'p-' + idx} href={"tel:" + phoneNo} className="glass-button" style={{ background: 'rgba(245,158,11,0.18)', color: '#f59e0b', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '12px' }}>
                <Phone size={14} /> Hotline{idx > 0 ? ' ' + (idx + 1) : ''}: {phoneNo}
              </a>
            ))}
            {parseContacts(supplier.zalo || supplier.phone).map((zaloVal, idx) => (
              <a key={'z-' + idx} href={"https://zalo.me/" + zaloVal.replace(/[^0-9]/g, '')} target="_blank" rel="noreferrer" className="glass-button" style={{ background: '#0068ff', color: '#fff', fontWeight: 'bold', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                <MessageCircle size={14} /> Zalo{idx > 0 ? ' ' + (idx + 1) : ''}: {zaloVal}
              </a>
            ))}
            {parseContacts(supplier.telegram).map((teleVal, idx) => (
              <a key={'t-' + idx} href={"https://t.me/" + teleVal.replace('@', '')} target="_blank" rel="noreferrer" className="glass-button" style={{ background: '#38bdf8', color: '#fff', fontWeight: 'bold', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                <Send size={14} /> Telegram{idx > 0 ? ' ' + (idx + 1) : ''}: {teleVal}
              </a>
            ))}
            {parseContacts(supplier.bot_link || supplier.botLink).map((botVal, idx) => (
              <a key={'b-' + idx} href={botVal.startsWith('http') ? botVal : ('https://' + botVal)} target="_blank" rel="noreferrer" className="glass-button" style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', color: '#fff', fontWeight: 'bold', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                <Bot size={14} /> Bot Auto{idx > 0 ? ' ' + (idx + 1) : ''}
              </a>
            ))}
          </div>
        </div>

        {/* KPI Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '10px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '12px' }}>
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>Tổng Tiền Nhập Hàng</span>
            <p style={{ fontSize: '20px', fontWeight: '800', color: '#6366f1', margin: '4px 0' }}>{totalImportCost.toLocaleString()}đ</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '12px' }}>
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>Số Đơn Đã Nhập</span>
            <p style={{ fontSize: '20px', fontWeight: '800', color: '#fff', margin: '4px 0' }}>{orders.length} đơn</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '12px' }}>
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>Công Nợ Chưa Thanh Toán Sỉ</span>
            <p style={{ fontSize: '20px', fontWeight: '800', color: totalDebtToSupplier > 0 ? '#f59e0b' : '#10b981', margin: '4px 0' }}>
              {totalDebtToSupplier.toLocaleString()}đ
            </p>
          </div>
        </div>
      </div>

      {/* ============ SECTION 1: SUPPLIER PRODUCT CATALOG ============ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <ShoppingBag size={18} color="#38bdf8" /> Danh Mục Sản Phẩm & Chính Sách Bảo Hành Sỉ ({catalogItems.length})
          </h3>
          <button
            type="button"
            onClick={() => setShowAddCatalogModal(true)}
            className="glass-button"
            style={{ background: '#38bdf8', color: '#fff', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> Thêm SP Vào Danh Mục
          </button>
        </div>

        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Sản Phẩm', 'Giá Sỉ Chuẩn', 'Chính Sách Bảo Hành', 'Mô Tả Quy Cách', 'Thao Tác'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: '#64748b', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {catalogItems.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                    Chưa có sản phẩm nào. Bấm "Thêm SP Vào Danh Mục" để tạo mới!
                  </td>
                </tr>
              ) : (
                catalogItems.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '14px 16px' }}><strong style={{ color: '#fff', fontSize: '14px' }}>{c.product_name || c.productName}</strong></td>
                    <td style={{ padding: '14px 16px', color: '#10b981', fontWeight: 'bold', fontSize: '14px' }}>{Number(c.wholesale_price || c.wholesalePrice || 0).toLocaleString()}đ</td>
                    <td style={{ padding: '14px 16px' }}>
                      {(c.warranty_policy || c.warrantyPolicy) === 'FULL_WARRANTY' ? (
                        <span style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', border: '1px solid #10b981', fontSize: '11px', padding: '4px 8px', borderRadius: '6px' }}>🟢 BH FULL THỜI HẠN</span>
                      ) : (c.warranty_policy || c.warrantyPolicy) === 'SEVEN_DAYS' ? (
                        <span style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b', border: '1px solid #f59e0b', fontSize: '11px', padding: '4px 8px', borderRadius: '6px' }}>🟡 BH 7 NGÀY ĐẦU</span>
                      ) : (
                        <span style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: '1px solid #ef4444', fontSize: '11px', padding: '4px 8px', borderRadius: '6px' }}>🔴 KHÔNG BẢO HÀNH</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#cbd5e1', fontSize: '12.5px' }}>{c.product_description || c.productDescription || '---'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <button onClick={() => handleDeleteCatalogItem(c.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============ SECTION 2: DAILY PRICE SHEET & TREND CHART ============ */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '20px' }}>
        {/* Entry Form */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📋 Cập Nhật Bảng Giá Sỉ Hôm Nay
          </h4>
          <form onSubmit={handleSaveDailyPrice} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label className="form-label" style={{ color: '#f59e0b', fontWeight: '700' }}>1. Chọn Sản Phẩm Sỉ *</label>
              <select
                className="glass-input" required
                value={dailyProductName}
                onChange={e => {
                  const selectedName = e.target.value;
                  setDailyProductName(selectedName);
                  const matchedCat = catalogItems.find(c => (c.product_name || c.productName) === selectedName);
                  if (matchedCat) {
                    setDailyPrice(String(matchedCat.wholesale_price || matchedCat.wholesalePrice || ''));
                  }
                }}
              >
                {catalogItems.length > 0 && (
                  <optgroup label={`📦 Danh Mục SP Của NCC ${supplier?.name || ''} (${catalogItems.length})`}>
                    {catalogItems.map(c => {
                      const pName = c.product_name || c.productName;
                      const pPrice = Number(c.wholesale_price || c.wholesalePrice || 0).toLocaleString();
                      return (
                        <option key={'cat-' + c.id} value={pName}>
                          {pName} (Giá sỉ chuẩn: {pPrice}đ)
                        </option>
                      );
                    })}
                  </optgroup>
                )}
                <optgroup label="🌐 Tất Cả Sản Phẩm Khác Trên Hệ Thống">
                  {products
                    .filter(p => !catalogItems.some(c => (c.product_name || c.productName) === p.name))
                    .map(p => (
                      <option key={'prod-' + p.id} value={p.name}>{p.name}</option>
                    ))}
                </optgroup>
              </select>

              {/* Live Catalog & Warranty Info Badge */}
              {(() => {
                const matchedCat = catalogItems.find(c => (c.product_name || c.productName) === dailyProductName);
                if (!matchedCat) return null;
                const pol = matchedCat.warranty_policy || matchedCat.warrantyPolicy;
                const stdPrice = Number(matchedCat.wholesale_price || matchedCat.wholesalePrice || 0).toLocaleString();
                return (
                  <div style={{ marginTop: '8px', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', padding: '8px 12px', borderRadius: '8px', fontSize: '11.5px', color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                    <div>
                      <span style={{ color: '#94a3b8' }}>Chính sách BH: </span>
                      {pol === 'FULL_WARRANTY' ? <strong style={{ color: '#10b981' }}>🟢 BH FULL THỜI HẠN</strong> : pol === 'SEVEN_DAYS' ? <strong style={{ color: '#f59e0b' }}>🟡 BH 7 NGÀY ĐẦU</strong> : <strong style={{ color: '#ef4444' }}>🔴 KHÔNG BẢO HÀNH</strong>}
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8' }}>Giá chuẩn danh mục: </span>
                      <strong style={{ color: '#10b981' }}>{stdPrice}đ</strong>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div>
              <label className="form-label">Giá Nhập Sỉ Hôm Nay (VND)</label>
              <input type="number" required className="glass-input" placeholder="VD: 45000" value={dailyPrice} onChange={e => setDailyPrice(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Ghi Chú Giá (Tùy chọn)</label>
              <input type="text" className="glass-input" placeholder="VD: Đang xả kho sale 10%" value={dailyNotes} onChange={e => setDailyNotes(e.target.value)} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#38bdf8', cursor: 'pointer', background: 'rgba(56,189,248,0.08)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(56,189,248,0.2)' }}>
              <input
                type="checkbox"
                checked={dailySyncToProduct}
                onChange={e => setDailySyncToProduct(e.target.checked)}
                style={{ accentColor: '#38bdf8', cursor: 'pointer' }}
              />
              <span>⚡ Đồng bộ làm Giá vốn mặc định cho POS</span>
            </label>
            <button type="submit" className="glass-button" style={{ background: 'linear-gradient(135deg, #f59e0b, #10b981)', color: '#fff', fontWeight: 'bold', marginTop: '4px' }}>
              💾 Lưu Giá Sỉ Hôm Nay
            </button>
          </form>
        </div>

        {/* 30-Day Trend Chart */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 'bold', color: '#38bdf8', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📈 Lịch Sử & Biến Động Giá Sỉ (30 Ngày Gần Nhất)
          </h4>
          {priceHistory.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '13px', fontStyle: 'italic' }}>
              Chưa có lịch sử cập nhật giá sỉ cho nhà cung cấp này.
            </div>
          ) : (
            <div style={{ width: '100%', height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...priceHistory].reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="price_date" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => v.toLocaleString() + 'đ'} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #38bdf8', borderRadius: '8px', fontSize: '12px', color: '#fff' }} formatter={v => [Number(v).toLocaleString() + 'đ', 'Giá sỉ']} />
                  <Line type="monotone" dataKey="price" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ============ SECTION 3: LINKED TEAMS ============ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h3 style={{ fontSize: '17px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={18} color="#6366f1" /> Kho Team Do Nguồn Cung Cấp ({teams.length})
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
          {teams.length === 0 ? (
            <div style={{ color: '#64748b', fontStyle: 'italic', fontSize: '13px' }}>Chưa có team nào được gán từ nguồn sỉ này.</div>
          ) : (
            teams.map(t => (
              <div key={t.id} className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <strong style={{ color: '#fff', fontSize: '14.5px' }}>{t.name}</strong>
                <span className="badge badge-info" style={{ width: 'fit-content', fontSize: '10px' }}>{t.category}</span>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Hạn nguồn: {t.expire_date || t.expireDate || '---'}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ============ SECTION 4: ORDERS FROM SUPPLIER ============ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h3 style={{ fontSize: '17px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingBag size={18} color="#10b981" /> Danh Sách Đơn Hàng Từ Nguồn Sỉ Này ({orders.length})
        </h3>
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Mã Đơn', 'Khách Hàng', 'Sản Phẩm', 'Giá Vốn Nhập', 'Thanh Toán Sỉ'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>Chưa có đơn hàng nào từ nguồn sỉ này.</td>
                </tr>
              ) : (
                orders.map(o => (
                  <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 16px' }}><strong>#{o.id}</strong></td>
                    <td style={{ padding: '12px 16px', color: '#fff' }}>{o.customer_name || o.customerName}</td>
                    <td style={{ padding: '12px 16px', color: '#818cf8' }}>{o.product_name || o.productName}</td>
                    <td style={{ padding: '12px 16px', color: '#f59e0b', fontWeight: '700' }}>{(o.cost_price || o.costPrice || 0).toLocaleString()}đ</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${(o.supplier_paid || o.supplierPaid) ? 'badge-success' : 'badge-warning'}`}>
                        {(o.supplier_paid || o.supplierPaid) ? '✅ Đã TT Sỉ' : '⏳ Chưa TT Sỉ'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============ POP-UP MODAL: ADD CATALOG PRODUCT ============ */}
      {showAddCatalogModal && (
        <div className="modal-overlay" onClick={() => setShowAddCatalogModal(false)}>
          <div className="modal-box animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', padding: '24px' }}>
            <div className="modal-header" style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={18} color="#38bdf8" /> Thêm SP Vào Danh Mục NCC
              </h2>
              <button className="modal-close-btn" onClick={() => setShowAddCatalogModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveCatalogItem} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label">Tên Sản Phẩm Sỉ</label>
                <select className="glass-input" required value={catProductName} onChange={e => setCatProductName(e.target.value)}>
                  <option value="">-- Chọn sản phẩm --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Giá Bán Sỉ Chuẩn (VND)</label>
                <input type="number" required className="glass-input" placeholder="VD: 45000" value={catPrice} onChange={e => setCatPrice(e.target.value)} />
              </div>

              <div>
                <label className="form-label">Chính Sách Bảo Hành Sỉ</label>
                <select className="glass-input" required value={catWarrantyPolicy} onChange={e => setCatWarrantyPolicy(e.target.value)}>
                  <option value="FULL_WARRANTY">🟢 Bảo Hành Full Thời Hạn (1 Đổi 1)</option>
                  <option value="SEVEN_DAYS">🟡 Bảo Hành 7 Ngày Đầu</option>
                  <option value="NO_WARRANTY">🔴 Không Bảo Hành (Acc Thanh Lý)</option>
                </select>
              </div>

              <div>
                <label className="form-label">Mô Tả Quy Cách Sản Phẩm</label>
                <textarea
                  className="glass-input" style={{ minHeight: '65px', fontSize: '12.5px' }}
                  placeholder="VD: Mail chính chủ, invite link, max 5 thiết bị..."
                  value={catDescription} onChange={e => setCatDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="submit" className="glass-button" style={{ flex: 1, background: '#38bdf8', color: '#fff', fontWeight: 'bold' }}>
                  💾 Lưu Vào Danh Mục
                </button>
                <button type="button" onClick={() => setShowAddCatalogModal(false)} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ POP-UP MODAL: EDIT SUPPLIER PROFILE & MULTI-CONTACTS ============ */}
      {showEditSuppModal && (
        <div className="modal-overlay" onClick={() => setShowEditSuppModal(false)}>
          <div className="modal-box animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', padding: '24px' }}>
            <div className="modal-header" style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={18} color="#3b82f6" /> Sửa Hồ Sơ & Đa Liên Hệ NCC
              </h2>
              <button className="modal-close-btn" onClick={() => setShowEditSuppModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveSupplierProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label">Tên Nhà Cung Cấp / Nguồn Sỉ</label>
                <input type="text" required className="glass-input" value={suppFormData.name} onChange={e => setSuppFormData({ ...suppFormData, name: e.target.value })} />
              </div>

              <div>
                <label className="form-label">Số Điện Thoại Hotline (Nhiều SĐT cách bằng dấu phẩy)</label>
                <input type="text" className="glass-input" placeholder="VD: 0977666555, 0988111222" value={suppFormData.phone} onChange={e => setSuppFormData({ ...suppFormData, phone: e.target.value })} />
              </div>

              <div>
                <label className="form-label" style={{ color: '#3b82f6' }}>Zalo Chat / SĐT Zalo (Cách bằng dấu phẩy)</label>
                <input type="text" className="glass-input" placeholder="VD: 0977666555, 0911222333" value={suppFormData.zalo} onChange={e => setSuppFormData({ ...suppFormData, zalo: e.target.value })} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label" style={{ color: '#38bdf8' }}>Telegram (Cách bằng dấu phẩy)</label>
                  <input type="text" className="glass-input" placeholder="VD: @tele_sale, @tele_tech" value={suppFormData.telegram} onChange={e => setSuppFormData({ ...suppFormData, telegram: e.target.value })} />
                </div>
                <div>
                  <label className="form-label" style={{ color: '#a855f7' }}>Link Bot Tự Động Mua Acc</label>
                  <input type="text" className="glass-input" placeholder="VD: https://t.me/autobot1" value={suppFormData.bot_link} onChange={e => setSuppFormData({ ...suppFormData, bot_link: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="form-label">Ghi Chú Về Nhà Cung Cấp</label>
                <textarea className="glass-input" style={{ minHeight: '60px', fontSize: '12.5px' }} value={suppFormData.notes} onChange={e => setSuppFormData({ ...suppFormData, notes: e.target.value })} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="submit" className="glass-button" style={{ flex: 1, background: '#3b82f6', color: '#fff', fontWeight: 'bold' }}>
                  💾 Lưu Thay Đổi Hồ Sơ
                </button>
                <button type="button" onClick={() => setShowEditSuppModal(false)} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

