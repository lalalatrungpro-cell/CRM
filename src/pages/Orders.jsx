import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  OrderService, CustomerService, ProductService, SupplierService,
  TeamService, ChannelService, VietQRService
} from '../utils/dataService';
import { supabase } from '../utils/supabaseClient';
import { getVietQRUrl } from '../utils/storage';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  Plus, Users, Copy, Check, ShieldAlert, FileText, UserPlus, Search,
  Filter, Eye, EyeOff, ChevronLeft, ChevronRight, X, QrCode, CreditCard,
  Trash2, Printer, RefreshCw, Edit3, Edit, AlertTriangle, ShieldCheck
} from 'lucide-react';

const PAGE_SIZE = 15;

const SOURCE_CONFIG = {
  'Facebook Page': { label: 'FB Page', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', icon: '🌐' },
  'Zalo': { label: 'Zalo', color: '#10b981', bg: 'rgba(16,185,129,0.15)', icon: '💬' },
  'TikTok Shop': { label: 'TikTok', color: '#ec4899', bg: 'rgba(236,72,153,0.15)', icon: '🎵' },
  'Telegram': { label: 'Telegram', color: '#0ea5e9', bg: 'rgba(14,165,233,0.15)', icon: '✈️' },
  'Giới Thiệu': { label: 'Giới Thiệu', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: '🤝' },
  'Website': { label: 'Website', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', icon: '💻' },
  'Khác': { label: 'Khác', color: '#64748b', bg: 'rgba(100,116,139,0.15)', icon: '📌' }
};

export default function Orders() {
  const toast = useToast();
  const { shopId } = useAuth();

  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [channels, setChannels] = useState([]);
  const [vietqr, setVietqr] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(null);
  const [showWarrantyModal, setShowWarrantyModal] = useState(null);
  const [showEditModal, setShowEditModal] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState('');
  const [revealedInfors, setRevealedInfors] = useState({});

  // Warranty form
  const [warrantyReason, setWarrantyReason] = useState('');
  const [warrantyNewInfor, setWarrantyNewInfor] = useState('');
  const [warrantyNewTeamId, setWarrantyNewTeamId] = useState('');

  
  const [editFormData, setEditFormData] = useState({
    id: '',
    infor: '',
    sellPrice: 0,
    costPrice: 0,
    supplierId: '',
    status: 'Đã thanh toán',
    expireDate: ''
  });

  const handleOpenEditModal = (order) => {
    setEditFormData({
      id: order.id,
      infor: order.infor || '',
      sellPrice: order.sell_price || 0,
      costPrice: order.cost_price || 0,
      supplierId: order.supplier_id || '',
      status: order.status || 'Đã thanh toán',
      expireDate: order.expire_date || ''
    });
    setShowEditModal(order);
  };

  const handleSaveEditOrder = async (e) => {
    e.preventDefault();
    if (!editFormData.id) return;

    const payload = {
      infor: editFormData.infor,
      sell_price: Number(editFormData.sellPrice),
      cost_price: Number(editFormData.costPrice),
      supplier_id: editFormData.supplierId,
      status: editFormData.status,
      expire_date: editFormData.expireDate
    };

    try {
      await OrderService.update(editFormData.id, payload);
      toast.success('Đã cập nhật thông tin tài khoản & đơn hàng!');
      setShowEditModal(null);
      if (showDetailModal && String(showDetailModal.id) === String(editFormData.id)) {
        setShowDetailModal({ ...showDetailModal, ...payload });
      }
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Có lỗi khi cập nhật đơn hàng.');
    }
  };

  const loadData = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const [oList, cList, pList, sList, tList, chanList, vqrData] = await Promise.all([
        OrderService.list(shopId),
        CustomerService.list(shopId),
        ProductService.list(shopId),
        SupplierService.list(shopId),
        TeamService.list(shopId),
        ChannelService.list(shopId),
        VietQRService.get(shopId)
      ]);
      setOrders(oList || []);
      setCustomers(cList || []);
      setProducts(pList || []);
      setSuppliers(sList || []);
      setTeams(tList || []);
      setChannels(chanList || []);
      setVietqr(vqrData || { bank_id: 'MB', account_no: '0901234567', account_name: 'SHOP DROPSHIP CRM', memo_prefix: 'DON' });
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải dữ liệu Đơn hàng từ Supabase!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [shopId]);

  const todayStr = new Date().toISOString().split('T')[0];
  const nextMonthStr = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const emptyForm = {
    customerId: '',
    newCustomerName: '',
    newCustomerPhone: '',
    newCustomerEmail: '',
    newCustomerType: 'Le',
    newCustomerSource: 'Facebook Page',
    newCustomerSubChannel: '',
    newCustomerNotes: '',
    productName: 'Canva Pro (1 tháng)',
    teamId: '',
    supplierId: '',
    infor: '',
    sellPrice: 150000,
    costPrice: 50000,
    status: 'Đã thanh toán',
    purchaseDate: todayStr,
    expireDate: nextMonthStr,
    durationDays: 30,
    source: 'Facebook Page',
    subChannelName: '',
  };

  const [formData, setFormData] = useState(emptyForm);

  // ESC modal close
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        setShowQrModal(null);
        setShowDetailModal(null);
        setShowInvoiceModal(null);
        setShowWarrantyModal(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const closeModal = () => { setShowModal(false); setFormData(emptyForm); };

  const handleProductSelect = (pName) => {
    const prod = products.find(p => p.name === pName);
    if (prod) {
      const dur = prod.default_duration_days || prod.defaultDurationDays || 30;
      const sellP = prod.default_sell || prod.defaultSell || 100000;
      const costP = prod.default_cost || prod.defaultCost || 50000;
      const exp = new Date(Date.now() + dur * 86400000).toISOString().split('T')[0];

      const availTeam = teams.find(t => {
        if (t.category !== prod.category) return false;
        const used = orders.filter(o => String(o.team_id || o.teamId) === String(t.id)).length;
        return (t.max_slots || t.maxSlots || 1) - used > 0;
      });

      setFormData(f => ({
        ...f,
        productName: pName,
        durationDays: dur,
        sellPrice: sellP,
        costPrice: costP,
        expireDate: exp,
        teamId: availTeam ? availTeam.id : f.teamId,
        infor: availTeam ? (availTeam.infor || f.infor) : f.infor,
        supplierId: availTeam ? (availTeam.supplier_id || availTeam.supplierId || f.supplierId) : f.supplierId
      }));
    }
  };

  const handleTeamSelect = (tId) => {
    const team = teams.find(t => String(t.id) === String(tId));
    if (team) {
      setFormData(f => ({
        ...f,
        teamId: tId,
        infor: team.infor || f.infor,
        supplierId: team.supplier_id || team.supplierId || f.supplierId
      }));
    } else {
      setFormData(f => ({ ...f, teamId: tId }));
    }
  };

  const handleDurationChange = (dur) => {
    const days = parseInt(dur) || 30;
    const pDate = formData.purchaseDate ? new Date(formData.purchaseDate) : new Date();
    const exp = new Date(pDate.getTime() + days * 86400000).toISOString().split('T')[0];
    setFormData(f => ({ ...f, durationDays: days, expireDate: exp }));
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();

    let finalCustId = formData.customerId;
    let finalCustName = '';
    let finalCustPhone = '';

    try {
      if (formData.customerId === 'NEW') {
        if (!formData.newCustomerName.trim()) return toast.error('Vui lòng nhập tên khách hàng mới!');
        const createdCust = await CustomerService.create(shopId, {
          name: formData.newCustomerName.trim(),
          phone: formData.newCustomerPhone.trim() || '',
          email: (formData.newCustomerEmail || '').trim(),
          type: formData.newCustomerType || 'Le',
          source: formData.newCustomerSource || formData.source || 'Facebook Page',
          sub_channel: (formData.newCustomerSubChannel || '').trim(),
          notes: (formData.newCustomerNotes || '').trim(),
          debt: 0
        });
        finalCustId = createdCust.id;
        finalCustName = createdCust.name;
        finalCustPhone = createdCust.phone;
        setCustomers(prev => [createdCust, ...prev]);
      } else {
        const cust = customers.find(c => String(c.id) === String(formData.customerId));
        if (!cust) return toast.error('Vui lòng chọn khách hàng!');
        finalCustId = cust.id;
        finalCustName = cust.name;
        finalCustPhone = cust.phone || '';
      }

      const supp = suppliers.find(s => String(s.id) === String(formData.supplierId));
      const suppName = supp ? supp.name : '';

      let channelVal = formData.source;
      if (formData.subChannelName) {
        channelVal = `${formData.source} - ${formData.subChannelName}`;
      }

      const payload = {
        customer_id: finalCustId,
        customer_name: finalCustName,
        phone: finalCustPhone,
        supplier_id: formData.supplierId ? parseInt(formData.supplierId) : null,
        supplier_name: suppName,
        team_id: formData.teamId ? parseInt(formData.teamId) : null,
        product_name: formData.productName,
        infor: formData.infor.trim() || '',
        cost_price: parseFloat(formData.costPrice) || 0,
        sell_price: parseFloat(formData.sellPrice) || 0,
        status: formData.status || 'Đã thanh toán',
        purchase_date: formData.purchaseDate || todayStr,
        expire_date: formData.expireDate || nextMonthStr,
        duration_days: parseInt(formData.durationDays) || 30,
        supplier_paid: false,
        warranty_count: 0,
        source: formData.source,
        channel: channelVal
      };

      const newOrder = await OrderService.create(shopId, payload);
      setOrders(prev => [newOrder, ...prev]);
      closeModal();
      toast.success(`Đã tạo đơn hàng POS thành công cho ${finalCustName}!`);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tạo đơn hàng. Vui lòng thử lại.');
    }
  };

  const handleDeleteOrder = async () => {
    const id = confirmDeleteId;
    try {
      await OrderService.remove(id);
      setOrders(prev => prev.filter(o => String(o.id) !== String(id)));
      setConfirmDeleteId(null);
      toast.success('Đã xóa đơn hàng thành công!');
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi xóa đơn hàng. Vui lòng thử lại.');
    }
  };

  const handleProcessWarranty = async (e) => {
    e.preventDefault();
    if (!warrantyReason.trim()) return toast.error('Vui lòng nhập lý do bảo hành!');

    const order = showWarrantyModal;
    const newWarrantyCount = (order.warranty_count || order.warrantyCount || 0) + 1;

    try {
      await supabase.from('warranty_logs').insert({
        shop_id: shopId,
        order_id: order.id,
        reason: warrantyReason.trim(),
        new_infor: warrantyNewInfor.trim() || order.infor,
        new_team_id: warrantyNewTeamId ? parseInt(warrantyNewTeamId) : order.team_id,
        note: 'Bảo hành đổi tài khoản'
      });

      const updatePayload = {
        warranty_count: newWarrantyCount,
        infor: warrantyNewInfor.trim() || order.infor
      };
      if (warrantyNewTeamId) {
        updatePayload.team_id = parseInt(warrantyNewTeamId);
      }

      const updatedOrder = await OrderService.update(order.id, updatePayload);
      setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));

      setShowWarrantyModal(null);
      setWarrantyReason('');
      setWarrantyNewInfor('');
      setWarrantyNewTeamId('');
      toast.success(`Đã ghi nhận bảo hành thành công (Lần ${newWarrantyCount})!`);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi xử lý bảo hành. Vui lòng thử lại.');
    }
  };

  const handleCopyInfor = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(`infor-${id}`);
    toast.success('Đã copy thông tin kích hoạt!');
    setTimeout(() => setCopiedId(''), 2000);
  };

  const toggleRevealInfor = (id) => {
    setRevealedInfors(prev => ({ ...prev, [id]: !prev[id] }));
  };

        const handleCopyZaloText = (order) => {
    const vqr = vietqr || { bank_id: 'MB', account_no: '0901234567', account_name: 'SHOP DROPSHIP CRM', memo_prefix: 'DON' };
    const bankId = vqr.bank_id || vqr.bankId || 'MB';
    const accountNo = vqr.account_no || vqr.accountNo || '0901234567';
    const accountName = vqr.account_name || vqr.accountName || 'SHOP DROPSHIP CRM';
    const memo = `${vqr.memo_prefix || vqr.memoPrefix || 'DON'} ${order.id}`;

    const custName = order.customer_name || order.customerName || 'Khách Hàng';
    const prodName = order.product_name || order.productName || 'Sản Phẩm';
    const infor = order.infor || 'Đã kích hoạt';
    const expDate = order.expire_date || order.expireDate || '---';
    const price = (order.sell_price || order.sellPrice || 0).toLocaleString();

    let text = `🎉 XÁC NHẬN ĐƠN HÀNG #${order.id}\n`;
    text += `👤 Khách hàng: ${custName}\n`;
    text += `📦 Sản phẩm: ${prodName}\n`;
    text += `🔑 Account / Info: ${infor}\n`;
    text += `⏳ Ngày hết hạn: ${expDate}\n`;
    text += `💰 Giá thanh toán: ${price} VNĐ\n\n`;
    text += `💳 THÔNG TIN CHUYỂN KHOẢN:\n`;
    text += `🏦 Ngân hàng: ${bankId}\n`;
    text += `🔢 Số tài khoản: ${accountNo}\n`;
    text += `👤 Chủ TK: ${accountName}\n`;
    text += `📝 Nội dung CK: ${memo}\n\n`;
    text += `Cảm ơn Quý khách đã ủng hộ shop! ❤️🎁`;

    navigator.clipboard.writeText(text);
    toast.success('Đã copy văn bản thông tin đơn hàng! Dán (Ctrl+V) sang Zalo ngay.');
  };

  const handleCopyQRImageOnly = async (order, qrUrl) => {
    if (!qrUrl) return toast.error('Không có hình ảnh VietQR!');
    try {
      toast.info('Đang tạo ảnh QR kèm thông tin chuyển khoản...');
      
      const vqr = vietqr || { bank_id: 'MB', account_no: '0901234567', account_name: 'SHOP DROPSHIP CRM', memo_prefix: 'DON' };
      const bankId = vqr.bank_id || vqr.bankId || 'MB';
      const accountNo = vqr.account_no || vqr.accountNo || '0901234567';
      const accountName = vqr.account_name || vqr.accountName || 'SHOP DROPSHIP CRM';
      const memo = `${vqr.memo_prefix || vqr.memoPrefix || 'DON'} ${order ? order.id : ''}`;
      const amount = order ? ((order.sell_price || order.sellPrice || 0).toLocaleString() + ' VNĐ') : '';

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 340;
        const ctx = canvas.getContext('2d');

        // Card Background (White with subtle shadow/border)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Header Top Accent Bar
        ctx.fillStyle = '#6366f1';
        ctx.fillRect(0, 0, canvas.width, 8);

        // Draw VietQR Image on left
        const qrWidth = 290;
        const qrHeight = 310;
        ctx.drawImage(img, 15, 15, qrWidth, qrHeight);

        // Vertical Separator Line
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(320, 25);
        ctx.lineTo(320, 315);
        ctx.stroke();

        // Right Text Section
        let startX = 340;
        let startY = 45;

        // Title
        ctx.font = 'bold 16px "Inter", sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText('THÔNG TIN CHUYỂN KHOẢN', startX, startY);

        startY += 25;
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + 180, startY);
        ctx.stroke();

        startY += 30;

        // Bank Name
        ctx.font = '14px "Inter", sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText('🏦 Ngân hàng:', startX, startY);
        ctx.font = 'bold 15px "Inter", sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(bankId, startX + 115, startY);

        // Account Number
        startY += 32;
        ctx.font = '14px "Inter", sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText('🔢 Số tài khoản:', startX, startY);
        ctx.font = 'bold 16px "Inter", sans-serif';
        ctx.fillStyle = '#10b981';
        ctx.fillText(accountNo, startX + 120, startY);

        // Account Owner
        startY += 32;
        ctx.font = '14px "Inter", sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText('👤 Chủ TK:', startX, startY);
        ctx.font = 'bold 14px "Inter", sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(accountName, startX + 85, startY);

        // Amount
        if (amount) {
          startY += 32;
          ctx.font = '14px "Inter", sans-serif';
          ctx.fillStyle = '#475569';
          ctx.fillText('💰 Số tiền:', startX, startY);
          ctx.font = 'bold 16px "Inter", sans-serif';
          ctx.fillStyle = '#ef4444';
          ctx.fillText(amount, startX + 85, startY);
        }

        // Transfer Memo
        startY += 34;
        ctx.font = '14px "Inter", sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText('📝 Nội dung CK:', startX, startY);
        ctx.font = 'bold 17px "Inter", sans-serif';
        ctx.fillStyle = '#ef4444';
        ctx.fillText(memo, startX + 125, startY);

        // Bottom Footer note
        startY += 38;
        ctx.font = 'italic 11.5px "Inter", sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Vui lòng giữ nguyên nội dung CK để duyệt tự động 24/7', startX, startY);

        canvas.toBlob(async (pngBlob) => {
          if (pngBlob) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': pngBlob })
              ]);
              toast.success('Đã copy THẺ ẢNH QR KÈM THÔNG TIN STK! Dán (Ctrl+V) sang Zalo ngay.');
            } catch (clipErr) {
              console.error(clipErr);
              toast.error('Trình duyệt chặn tự động copy ảnh. Vui lòng nhấp chuột phải vào ảnh QR chọn Sao chép hình ảnh!');
            }
          }
        }, 'image/png');
      };

      img.onerror = () => {
        toast.error('Lỗi khi tải ảnh VietQR!');
      };
      img.src = qrUrl;
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi ghép ảnh QR.');
    }
  };

  const handleCopyRichTextAndQR = async (order, qrUrl) => {
    try {
      toast.info('Đang copy Văn bản + Hình VietQR...');
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64DataUrl = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });

      const vqr = vietqr || { bank_id: 'MB', account_no: '0901234567', account_name: 'SHOP DROPSHIP CRM', memo_prefix: 'DON' };
      const memo = `${vqr.memo_prefix || vqr.memoPrefix || 'DON'} ${order.id}`;

      const custName = order.customer_name || order.customerName;
      const prodName = order.product_name || order.productName;
      const sellP = order.sell_price || order.sellPrice || 0;
      const expDate = order.expire_date || order.expireDate || '---';
      const bName = vqr.bank_id || vqr.bankId || 'MB';
      const accNo = vqr.account_no || vqr.accountNo || '';
      const accName = vqr.account_name || vqr.accountName || '';

      const htmlString = `
        <div style="font-family: Arial, sans-serif; font-size: 14px; color: #000; line-height: 1.5;">
          <p style="font-size: 16px; font-weight: bold; color: #6366f1;">🎉 HOÀN TẤT ĐƠN HÀNG #${order.id}</p>
          <p>👤 <strong>Khách hàng:</strong> ${custName} ${order.phone ? '(' + order.phone + ')' : ''}</p>
          <p>📦 <strong>Sản phẩm:</strong> ${prodName}</p>
          <p>🔑 <strong>Infor:</strong> <code>${order.infor || 'Đã kích hoạt'}</code></p>
          <p>⏳ <strong>Hạn dùng:</strong> ${expDate}</p>
          <p>💰 <strong>Giá thanh toán:</strong> <strong style="color: #10b981; font-size: 16px;">${sellP.toLocaleString()}đ</strong></p>
          <br/>
          <p style="font-weight: bold; color: #000;">💳 THÔNG TIN CHUYỂN KHOẢN VIETQR:</p>
          <p>🔹 Ngân hàng: <strong>${bName}</strong></p>
          <p>🔹 Số tài khoản: <strong style="color: #10b981; font-size: 15px;">${accNo}</strong></p>
          <p>🔹 Chủ tài khoản: <strong>${accName}</strong></p>
          <p>🔹 Nội dung CK: <strong style="color: #2563eb; font-size: 15px;">${memo}</strong></p>
          <br/>
          <p><img src="${base64DataUrl}" width="260" alt="VietQR Code" style="border-radius: 8px; border: 1px solid #ccc;" /></p>
          <p style="color: #64748b; font-style: italic;">Cảm ơn bạn đã ủng hộ shop! ❤️🎁</p>
        </div>
      `;

      const plainText = `🎉 HOÀN TẤT ĐƠN HÀNG #${order.id}\n👤 Khách hàng: ${custName}\n📦 Sản phẩm: ${prodName}\n🔑 Infor: ${order.infor || 'Đã kích hoạt'}\n⏳ Hạn dùng: ${expDate}\n💰 Giá thanh toán: ${sellP.toLocaleString()}đ\n\n💳 THÔNG TIN CHUYỂN KHOẢN VIETQR:\n🔹 Ngân hàng: ${bName}\n🔹 Số tài khoản: ${accNo}\n🔹 Chủ tài khoản: ${accName}\n🔹 Nội dung CK: ${memo}\n🔹 Link QR: ${qrUrl}\n\nCảm ơn bạn đã ủng hộ shop! ❤️🎁`;

      const htmlBlob = new Blob([htmlString], { type: 'text/html' });
      const textBlob = new Blob([plainText], { type: 'text/plain' });

      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob
        })
      ]);

      toast.success('Đã copy cả VĂN BẢN + ẢNH QR! Mở Zalo dán Ctrl+V ngay!');
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi copy ảnh QR. Hãy chụp màn hình hoặc tải ảnh về.');
    }
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const filteredOrders = orders.filter(o => {
    const custName = o.customer_name || o.customerName || '';
    const prodName = o.product_name || o.productName || '';
    const matchesSearch = custName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (o.phone || '').includes(searchTerm) ||
                          prodName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          String(o.id).includes(searchTerm);

    const matchesStatus = filterStatus === 'ALL' || o.status === filterStatus;
    const matchesCategory = filterCategory === 'ALL' || prodName.toLowerCase().includes(filterCategory.toLowerCase());

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE) || 1;
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const filterChannels = channels.filter(c => c.channel_type === formData.source);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Quản Lý Đơn Hàng & POS Bán Hàng 360°</h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: '13px' }}>
            Tạo đơn nhanh, tự động gán slot team, xuất hóa đơn in ấn, bảo hành và tạo mã VietQR Zalo.
          </p>
        </div>

        <button className="glass-button" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Tạo Đơn POS Mới
        </button>
      </div>

      {/* Filters Bar */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '280px', flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 14px' }}>
          <Search size={16} color="#475569" />
          <input
            type="text"
            placeholder="Tìm tên KH, SĐT, Tên sản phẩm hoặc Mã đơn..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{ background: 'none', border: 'none', color: '#fff', outline: 'none', width: '100%', fontSize: '13.5px' }}
          />
          {searchTerm && <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}><X size={14} /></button>}
        </div>

        <select
          className="glass-input" style={{ width: 'auto' }}
          value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="Đã thanh toán">Đã thanh toán</option>
          <option value="Nợ">Nợ</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Đang tải danh sách đơn hàng từ đám mây...</div>
        ) : paginatedOrders.length === 0 ? (
          <div className="empty-state">
            <Users size={40} />
            <h3>Không tìm thấy đơn hàng nào</h3>
            <p>Thử tìm với từ khóa khác hoặc tạo đơn hàng mới.</p>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Mã Đơn', 'Khách Hàng', 'Sản Phẩm & Acc', 'Nguồn / Kênh', 'Giá Bán', 'Bảo Hành', 'Trạng Thái', 'Thao Tác 360°'].map(h => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map(order => {
                  const custName = order.customer_name || order.customerName;
                  const prodName = order.product_name || order.productName;
                  const sellP = order.sell_price || order.sellPrice || 0;
                  const expDate = order.expire_date || order.expireDate || '---';
                  const isRevealed = revealedInfors[order.id];
                  const isCopied = copiedId === `infor-${order.id}`;
                  const wCount = order.warranty_count || order.warrantyCount || 0;

                  const srcCfg = SOURCE_CONFIG[order.source] || SOURCE_CONFIG['Facebook Page'];
                  const vqr = vietqr || { bank_id: 'MB', account_no: '0901234567', account_name: 'SHOP DROPSHIP CRM', memo_prefix: 'DON' };
                  const memo = `${vqr.memo_prefix || vqr.memoPrefix || 'DON'} ${order.id}`;
                  const qrUrl = getVietQRUrl ? getVietQRUrl(vqr.bank_id || vqr.bankId, vqr.account_no || vqr.accountNo, vqr.account_name || vqr.accountName, sellP, memo, vqr.template) : '';

                  return (
                    <tr key={order.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '14px 16px' }}><strong>#{order.id}</strong></td>
                      <td style={{ padding: '14px 16px' }}>
                        <strong style={{ fontSize: '14px', color: '#fff' }}>{custName}</strong>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{order.phone || 'N/A'}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <strong style={{ color: '#818cf8' }}>{prodName}</strong>
                        {order.infor && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                            <code style={{ fontSize: '11px', color: isRevealed ? '#fff' : '#64748b', background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px' }}>
                              {isRevealed ? order.infor : '••••••••••••••••'}
                            </code>
                            <button onClick={() => toggleRevealInfor(order.id)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                              {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                            <button onClick={() => handleCopyInfor(order.infor, order.id)} style={{ background: 'none', border: 'none', color: isCopied ? '#10b981' : '#94a3b8', cursor: 'pointer' }}>
                              {isCopied ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span className="badge" style={{ background: srcCfg.bg, color: srcCfg.color }}>
                          {srcCfg.icon} {order.channel || order.source || 'FB Page'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <strong style={{ color: '#10b981' }}>{sellP.toLocaleString()}đ</strong>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {wCount > 0 ? (
                          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <AlertTriangle size={11} /> {wCount} lần đổi
                          </span>
                        ) : (
                          <span style={{ color: '#475569', fontSize: '12px' }}>Chưa bảo hành</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span className={`badge ${order.status === 'Đã thanh toán' ? 'badge-success' : 'badge-warning'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            className="glass-button"
                            onClick={() => setShowDetailModal({ order, qrUrl })}
                            title="Xem Chi Tiết 360°"
                            style={{ padding: '5px 8px', fontSize: '11px', background: 'rgba(99,102,241,0.18)', color: '#818cf8' }}
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            className="glass-button"
                            onClick={() => setShowInvoiceModal({ order, qrUrl })}
                            title="In Hóa Đơn Bán Hàng"
                            style={{ padding: '5px 8px', fontSize: '11px', background: 'rgba(16,185,129,0.18)', color: '#10b981' }}
                          >
                            <Printer size={13} />
                          </button>
                          <button
                            className="glass-button"
                            onClick={() => setShowWarrantyModal(order)}
                            title="Bảo Hành / Đổi Tài Khoản"
                            style={{ padding: '5px 8px', fontSize: '11px', background: 'rgba(245,158,11,0.18)', color: '#f59e0b' }}
                          >
                            <RefreshCw size={13} />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(order.id)}
                            title="Xóa Đơn"
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
                  Trang {currentPage} / {totalPages} (Tổng {filteredOrders.length} đơn)
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

      {/* MODAL 1: Detail Order 360° */}
      {showDetailModal && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px', background: '#111625' }}>
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>Chi Tiết Đơn Hàng 360° #{showDetailModal.order.id}</h2>
                  <span className={`badge ${showDetailModal.order.status === 'Đã thanh toán' ? 'badge-success' : 'badge-warning'}`}>
                    {showDetailModal.order.status}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Kênh bán: <strong style={{ color: '#818cf8' }}>{showDetailModal.order.channel || showDetailModal.order.source || 'FB Page'}</strong>
                </p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowDetailModal(null)}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Customer & Product Information Grid */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>Khách Hàng:</span>
                  <p style={{ fontWeight: '700', color: '#fff', margin: '2px 0' }}>
                    {showDetailModal.order.customer_name || showDetailModal.order.customerName}
                  </p>
                  <span style={{ color: '#10b981', fontSize: '12px' }}>SĐT: {showDetailModal.order.phone || 'Chưa cập nhật'}</span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>Sản Phẩm Dịch Vụ:</span>
                  <p style={{ fontWeight: '700', color: '#818cf8', margin: '2px 0' }}>
                    {showDetailModal.order.product_name || showDetailModal.order.productName}
                  </p>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>Nguồn Sỉ: {showDetailModal.order.supplier_name || showDetailModal.order.supplierName || 'Tự nhập'}</span>
                </div>
              </div>

              {/* Account Credentials Box */}
              {showDetailModal.order.infor && (
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.25)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      🔑 Thông Tin Tài Khoản / Invite Link Giao Khách
                    </span>
                    <button
                      className="glass-button"
                      onClick={() => handleCopyInfor(showDetailModal.order.infor, showDetailModal.order.id)}
                      style={{ padding: '3px 8px', fontSize: '11px', background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}
                    >
                      {copiedId === `infor-${showDetailModal.order.id}` ? <Check size={12} /> : <Copy size={12} />} Copy Acc
                    </button>
                  </div>
                  <code style={{ fontSize: '12.5px', color: '#fff', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                    {showDetailModal.order.infor}
                  </code>
                </div>
              )}

              {/* Financial & Expiry Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '12.5px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '8px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '11.5px' }}>Giá Bán Khách</span>
                  <p style={{ fontSize: '15px', fontWeight: '800', color: '#10b981', margin: '2px 0' }}>
                    {(showDetailModal.order.sell_price || showDetailModal.order.sellPrice || 0).toLocaleString()}đ
                  </p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '8px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '11.5px' }}>Giá Vốn Nhập</span>
                  <p style={{ fontSize: '15px', fontWeight: '800', color: '#f59e0b', margin: '2px 0' }}>
                    {(showDetailModal.order.cost_price || showDetailModal.order.costPrice || 0).toLocaleString()}đ
                  </p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '8px' }}>
                  <span style={{ color: '#94a3b8', fontSize: '11.5px' }}>Lợi Nhuận Thuần</span>
                  <p style={{ fontSize: '15px', fontWeight: '800', color: '#6366f1', margin: '2px 0' }}>
                    {((showDetailModal.order.sell_price || showDetailModal.order.sellPrice || 0) - (showDetailModal.order.cost_price || showDetailModal.order.costPrice || 0)).toLocaleString()}đ
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12.5px', background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: '8px' }}>
                <div>
                  <span style={{ color: '#94a3b8' }}>Ngày Mua:</span> <strong>{showDetailModal.order.purchase_date || showDetailModal.order.date || '---'}</strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Ngày Hết Hạn:</span> <strong style={{ color: '#ec4899' }}>{showDetailModal.order.expire_date || showDetailModal.order.expireDate || '---'}</strong>
                </div>
              </div>

              {/* VietQR Code & Bank Details */}
              {showDetailModal.qrUrl && (
                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <img src={showDetailModal.qrUrl} alt="VietQR" style={{ width: '140px', height: 'auto', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <div style={{ flex: 1, fontSize: '12px', color: '#cbd5e1', lineHeight: 1.6 }}>
                    <p style={{ margin: 0, fontWeight: '700', color: '#fff' }}>💳 THÔNG TIN CHUYỂN KHOẢN VIETQR:</p>
                    <p style={{ margin: 0 }}>🏦 Ngân hàng: <strong>{vietqr?.bank_id || vietqr?.bankId || 'MB'}</strong></p>
                    <p style={{ margin: 0 }}>🔢 STK: <strong style={{ color: '#10b981' }}>{vietqr?.account_no || vietqr?.accountNo || '0901234567'}</strong></p>
                    <p style={{ margin: 0 }}>👤 Chủ TK: <strong>{vietqr?.account_name || vietqr?.accountName || 'SHOP DROPSHIP CRM'}</strong></p>
                    <p style={{ margin: 0 }}>📝 Nội dung: <strong style={{ color: '#ef4444' }}>{(vietqr?.memo_prefix || vietqr?.memoPrefix || 'DON') + ' ' + showDetailModal.order.id}</strong></p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '8px' }}>
                <button
                  className="glass-button"
                  onClick={() => handleCopyZaloText(showDetailModal.order)}
                  style={{ background: '#0068ff', color: '#fff', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                >
                  <Copy size={15} /> Copy Văn Bản Zalo
                </button>
                <button
                  className="glass-button"
                  onClick={() => handleCopyQRImageOnly(showDetailModal.order, showDetailModal.qrUrl)}
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                >
                  <QrCode size={15} /> Copy Thẻ Ảnh QR
                </button>
                <button
                  className="glass-button"
                  onClick={() => {
                    const orderToPrint = showDetailModal.order;
                    setShowDetailModal(null);
                    setShowInvoiceModal({ order: orderToPrint, qrUrl: showDetailModal.qrUrl });
                  }}
                  style={{ background: 'rgba(16,185,129,0.18)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                >
                  <Printer size={15} /> In Hóa Đơn A4
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Printable Commercial Invoice */}
      {showInvoiceModal && (
        <div className="modal-overlay" onClick={() => setShowInvoiceModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', background: '#fff', color: '#000' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>HÓA ĐƠN BÁN HÀNG #${showInvoiceModal.order.id}</h2>
              <button className="modal-close-btn" style={{ color: '#000' }} onClick={() => setShowInvoiceModal(null)}><X size={18} /></button>
            </div>
            
            <div id="printable-invoice" style={{ padding: '16px 0', fontSize: '13.5px', color: '#0f172a', lineHeight: 1.6 }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #6366f1', paddingBottom: '12px', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#6366f1', margin: 0 }}>DROPSHIP CRM STORE</h2>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0' }}>Chuyên Dịch Vụ & Tài Khoản Bản Quyền Số</p>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Hotline / Zalo CSKH: 0901234567</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: '700', fontSize: '14px', margin: 0 }}>MÃ HÓA ĐƠN: #${showInvoiceModal.order.id}</p>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0' }}>Ngày: ${showInvoiceModal.order.purchase_date || showInvoiceModal.order.purchaseDate || todayStr}</p>
                </div>
              </div>

              {/* Customer Info */}
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                <p style={{ margin: 0 }}><strong>Khách Hàng:</strong> ${showInvoiceModal.order.customer_name || showInvoiceModal.order.customerName}</p>
                <p style={{ margin: '4px 0 0' }}><strong>Số Điện Thoại / Zalo:</strong> ${showInvoiceModal.order.phone || 'N/A'}</p>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Sản Phẩm Dịch Vụ</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Thông Tin Infor</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Hạn Dùng</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Thành Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 8px', fontWeight: '700' }}>${showInvoiceModal.order.product_name || showInvoiceModal.order.productName}</td>
                    <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontSize: '12px' }}>${showInvoiceModal.order.infor || 'Đã kích hoạt'}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>${showInvoiceModal.order.expire_date || showInvoiceModal.order.expireDate}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '700', color: '#10b981' }}>
                      {(showInvoiceModal.order.sell_price || showInvoiceModal.order.sellPrice || 0).toLocaleString()}đ
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Total & QR */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                <div>
                  {showInvoiceModal.qrUrl && (
                    <img src={showInvoiceModal.qrUrl} alt="VietQR" style={{ width: '160px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Tổng Tiền Thanh Toán:</p>
                  <p style={{ fontSize: '22px', fontWeight: '800', color: '#10b981', margin: '4px 0' }}>
                    {(showInvoiceModal.order.sell_price || showInvoiceModal.order.sellPrice || 0).toLocaleString()} VNĐ
                  </p>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Trạng thái: <strong>${showInvoiceModal.order.status}</strong></p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
              <button onClick={handlePrintInvoice} className="glass-button" style={{ flex: 1, background: '#6366f1', color: '#fff', fontWeight: '700' }}>
                <Printer size={16} /> In Hóa Đơn (Print PDF/A4)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Warranty / Change Account */}
      {showWarrantyModal && (
        <div className="modal-overlay" onClick={() => setShowWarrantyModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Đổi Acc Bảo Hành Đơn #{showWarrantyModal.id}</h2>
              <button className="modal-close-btn" onClick={() => setShowWarrantyModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleProcessWarranty} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label">Lý Do Bảo Hành / Lỗi</label>
                <input
                  type="text" required className="glass-input" placeholder="VD: Tài khoản bị uất slot, sai mật khẩu..."
                  value={warrantyReason} onChange={e => setWarrantyReason(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Thông Tin Tài Khoản / Invite Link Mới</label>
                <textarea
                  className="glass-input" style={{ minHeight: '60px', fontFamily: 'monospace', fontSize: '12.5px' }} placeholder="VD: pass_moi_123 | link_join_moi"
                  value={warrantyNewInfor} onChange={e => setWarrantyNewInfor(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Chuyển Sang Kho Team Mới (Tùy chọn)</label>
                <select
                  className="glass-input"
                  value={warrantyNewTeamId} onChange={e => setWarrantyNewTeamId(e.target.value)}
                >
                  <option value="">-- Giữ nguyên kho team cũ --</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button type="submit" className="glass-button" style={{ flex: 1, background: '#f59e0b', color: '#fff', fontWeight: '700' }}>
                  Xác Nhận Bảo Hành
                </button>
                <button type="button" onClick={() => setShowWarrantyModal(null)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL POS Add Order */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Tạo Đơn Hàng Mới (POS)</h2>
              <button className="modal-close-btn" onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label">Chọn Khách Hàng</label>
                <select
                  className="glass-input"
                  value={formData.customerId} onChange={e => setFormData({ ...formData, customerId: e.target.value })}
                  required
                >
                  <option value="">-- Chọn Khách Hàng --</option>
                  <option value="NEW">+ Thêm Khách Hàng Mới...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone || 'N/A'})</option>
                  ))}
                </select>
              </div>

              {formData.customerId === 'NEW' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(99,102,241,0.06)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.25)' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>👤 Hồ Sơ Khách Hàng Mới Chi Tiết 360°</span>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label className="form-label">Tên Khách Mới *</label>
                      <input
                        type="text" required className="glass-input" placeholder="VD: Nguyễn Văn B"
                        value={formData.newCustomerName} onChange={e => setFormData({ ...formData, newCustomerName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="form-label">SĐT / Zalo Hotline *</label>
                      <input
                        type="text" required className="glass-input" placeholder="0987654321"
                        value={formData.newCustomerPhone} onChange={e => setFormData({ ...formData, newCustomerPhone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label className="form-label">Email Liên Hệ</label>
                      <input
                        type="email" className="glass-input" placeholder="VD: khach@gmail.com"
                        value={formData.newCustomerEmail || ''} onChange={e => setFormData({ ...formData, newCustomerEmail: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="form-label">Phân Loại Khách Hàng</label>
                      <select
                        className="glass-input"
                        value={formData.newCustomerType || 'Le'} onChange={e => setFormData({ ...formData, newCustomerType: e.target.value })}
                      >
                        <option value="Le">Khách Lẻ (Giá chuẩn)</option>
                        <option value="CTV">Cộng Tác Viên (Chiết khấu nhẹ)</option>
                        <option value="Si">Khách Sỉ / Đại Lý (Chiết khấu cao)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label className="form-label">Kênh Nguồn Khách</label>
                      <select
                        className="glass-input"
                        value={formData.newCustomerSource || 'Facebook Page'} onChange={e => setFormData({ ...formData, newCustomerSource: e.target.value })}
                      >
                        <option value="Facebook Page">Facebook Page</option>
                        <option value="Zalo">Zalo</option>
                        <option value="TikTok Shop">TikTok Shop</option>
                        <option value="Telegram">Telegram</option>
                        <option value="Giới Thiệu">Giới Thiệu</option>
                        <option value="Website">Website</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Sub-Channel / Trang Phụ</label>
                      <input
                        type="text" className="glass-input" placeholder="VD: Page Canva Sỉ #01"
                        value={formData.newCustomerSubChannel || ''} onChange={e => setFormData({ ...formData, newCustomerSubChannel: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Ghi Chú Khách Mới & Yêu Cầu</label>
                    <input
                      type="text" className="glass-input" placeholder="Thói quen mua sắm, tài khoản ưu tiên..."
                      value={formData.newCustomerNotes || ''} onChange={e => setFormData({ ...formData, newCustomerNotes: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="form-label">Chọn Sản Phẩm Dịch Vụ</label>
                <select
                  className="glass-input"
                  value={formData.productName} onChange={e => handleProductSelect(e.target.value)}
                >
                  {products.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Nguồn / Kênh Bán Hàng Main</label>
                  <select
                    className="glass-input"
                    value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value, subChannelName: '' })}
                  >
                    {Object.keys(SOURCE_CONFIG).map(src => (
                      <option key={src} value={src}>{src}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Kênh Bán Phụ (Trang/Zalo)</label>
                  <select
                    className="glass-input"
                    value={formData.subChannelName} onChange={e => setFormData({ ...formData, subChannelName: e.target.value })}
                  >
                    <option value="">-- Mặc định --</option>
                    {filterChannels.map(ch => (
                      <option key={ch.id} value={ch.name}>{ch.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Gán Kho Team Slot (Tùy chọn)</label>
                <select
                  className="glass-input"
                  value={formData.teamId} onChange={e => handleTeamSelect(e.target.value)}
                >
                  <option value="">-- Tự động chọn team trống --</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Thông Tin Tài Khoản / Invite Link Gửi Khách</label>
                <textarea
                  className="glass-input" style={{ minHeight: '50px', fontFamily: 'monospace', fontSize: '12px' }} placeholder="VD: user@gmail.com | InviteLinkJoin"
                  value={formData.infor} onChange={e => setFormData({ ...formData, infor: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label">Thời Hạn (Ngày)</label>
                  <input
                    type="number" required className="glass-input"
                    value={formData.durationDays} onChange={e => handleDurationChange(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Giá Bán Khách (VNĐ)</label>
                  <input
                    type="number" required className="glass-input"
                    value={formData.sellPrice} onChange={e => setFormData({ ...formData, sellPrice: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Giá Vốn Nhập (VNĐ)</label>
                  <input
                    type="number" required className="glass-input"
                    value={formData.costPrice} onChange={e => setFormData({ ...formData, costPrice: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Trạng Thái Thanh Toán</label>
                  <select
                    className="glass-input"
                    value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Đã thanh toán">Đã thanh toán</option>
                    <option value="Nợ">Nợ</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Ngày Hết Hạn Đơn</label>
                  <input
                    type="date" className="glass-input"
                    value={formData.expireDate} onChange={e => setFormData({ ...formData, expireDate: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px', paddingBottom: '6px' }}>
                <button type="submit" className="glass-button" style={{ flex: 1, background: 'linear-gradient(135deg, #6366f1, #10b981)', color: '#fff', fontWeight: '700' }}>
                  Hoàn Tất Tạo Đơn POS
                </button>
                <button type="button" onClick={closeModal} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}

      
      {/* EDIT ACCOUNT & ORDER MODAL */}
      {showEditModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div className="glass-panel animate-scale-in" style={{ width: '100%', maxWidth: '520px', padding: '24px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>
                  ✏️ Điền / Cập Nhật Tài Khoản Đơn #{showEditModal.id}
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '12.5px', marginTop: '2px' }}>
                  Khách hàng: {showEditModal.customer_name} | SP: {showEditModal.product_name}
                </p>
              </div>
              <button onClick={() => setShowEditModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditOrder} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label" style={{ color: '#60a5fa', fontWeight: 'bold' }}>
                  🔑 Thông Tin Tài Khoản / Invite Link Giao Khách:
                </label>
                <textarea
                  className="glass-input"
                  style={{ minHeight: '80px', fontFamily: 'monospace', fontSize: '13px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid #3b82f6' }}
                  placeholder="VD: email@gmail.com | pass123 | https://link_join_slot..."
                  value={editFormData.infor}
                  onChange={e => setEditFormData({ ...editFormData, infor: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label" style={{ color: '#f59e0b', fontWeight: 'bold' }}>
                  🏢 Chọn Nhà Cung Cấp / Nguồn Nhập Sỉ:
                </label>
                <select
                  className="glass-input"
                  style={{ border: '1px solid rgba(245, 158, 11, 0.4)' }}
                  value={editFormData.supplierId}
                  onChange={e => setEditFormData({ ...editFormData, supplierId: e.target.value })}
                >
                  <option value="">-- Chọn Nhà Cung Cấp nhập acc --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (SĐT: {s.phone || 'N/A'})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Giá Bán Khách (VNĐ)</label>
                  <input
                    type="number" className="glass-input"
                    value={editFormData.sellPrice}
                    onChange={e => setEditFormData({ ...editFormData, sellPrice: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">Giá Vốn Nhập Sỉ (VNĐ)</label>
                  <input
                    type="number" className="glass-input"
                    value={editFormData.costPrice}
                    onChange={e => setEditFormData({ ...editFormData, costPrice: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Trạng Thái Thanh Toán</label>
                  <select
                    className="glass-input"
                    value={editFormData.status}
                    onChange={e => setEditFormData({ ...editFormData, status: e.target.value })}
                  >
                    <option value="Đã thanh toán">Đã thanh toán</option>
                    <option value="Nợ">Nợ</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Ngày Hết Hạn Acc</label>
                  <input
                    type="date" className="glass-input"
                    value={editFormData.expireDate}
                    onChange={e => setEditFormData({ ...editFormData, expireDate: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="submit" className="glass-button"
                  style={{ flex: 1, background: 'linear-gradient(135deg, #3b82f6, #10b981)', color: '#fff', fontWeight: 'bold' }}
                >
                  💾 Lưu Thông Tin Tài Khoản
                </button>
                <button
                  type="button" onClick={() => setShowEditModal(null)}
                  style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
  
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="Xóa Đơn Hàng?"
        message="Bạn có chắc muốn xóa đơn hàng này? Hành động này không thể hoàn tác."
        onConfirm={handleDeleteOrder}
        onCancel={() => setConfirmDeleteId(null)}
        confirmLabel="Xác Nhận Xóa"
      />
    </div>
  );
}
