import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CustomerService, OrderService, SupplierService, VietQRService, CashTransactionService } from '../utils/dataService';
import { getVietQRUrl } from '../utils/storage';
import { useToast } from '../components/Toast';
import { Wallet, ArrowDownLeft, ArrowUpRight, FileText, Printer, Copy, X } from 'lucide-react';

function numberToVietnameseWords(amount) {
  if (!amount || isNaN(amount) || amount === 0) return "Không đồng chẵn.";
  const num = Math.abs(Math.round(amount));
  const defaultNumbers = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

  function readGroup(n, isLeadingGroup) {
    let hundred = Math.floor(n / 100);
    let ten = Math.floor((n % 100) / 10);
    let unit = n % 10;
    let res = "";

    if (hundred > 0 || !isLeadingGroup) {
      res += defaultNumbers[hundred] + " trăm ";
    }

    if (ten > 1) {
      res += defaultNumbers[ten] + " mươi ";
      if (unit === 1) res += "mốt ";
      else if (unit === 5) res += "lăm ";
      else if (unit > 0) res += defaultNumbers[unit] + " ";
    } else if (ten === 1) {
      res += "mười ";
      if (unit === 1) res += "một ";
      else if (unit === 5) res += "lăm ";
      else if (unit > 0) res += defaultNumbers[unit] + " ";
    } else {
      if (unit > 0) {
        if (hundred > 0 || !isLeadingGroup) res += "lẻ ";
        res += defaultNumbers[unit] + " ";
      }
    }
    return res;
  }

  let total = num;
  let billion = Math.floor(total / 1000000000);
  total %= 1000000000;
  let million = Math.floor(total / 1000000);
  total %= 1000000;
  let thousand = Math.floor(total / 1000);
  let remain = total % 1000;

  let resultStr = "";
  let isLeading = true;

  if (billion > 0) {
    resultStr += readGroup(billion, isLeading) + "tỷ ";
    isLeading = false;
  }
  if (million > 0) {
    resultStr += readGroup(million, isLeading) + "triệu ";
    isLeading = false;
  }
  if (thousand > 0) {
    resultStr += readGroup(thousand, isLeading) + "nghìn ";
    isLeading = false;
  }
  if (remain > 0) {
    resultStr += readGroup(remain, isLeading);
  }

  resultStr = resultStr.trim();
  if (resultStr.length > 0) {
    resultStr = resultStr.charAt(0).toUpperCase() + resultStr.slice(1) + " đồng chẵn.";
  } else {
    resultStr = "Không đồng chẵn.";
  }
  return resultStr;
}

const isUnpaid = (status) => {
  if (!status) return false;
  const s = String(status).toLowerCase().trim();
  return s === 'nợ' || s === 'no' || s === 'chưa thanh toán';
};

export default function Debt() {
  const toast = useToast();
  const { shopId } = useAuth();

  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [vietqr, setVietqr] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedInvoiceCust, setSelectedInvoiceCust] = useState(null);
  const [selectedInvoiceSupp, setSelectedInvoiceSupp] = useState(null);

  const loadData = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const [custList, orderList, suppList, vqrData] = await Promise.all([
        CustomerService.list(shopId),
        OrderService.list(shopId),
        SupplierService.list(shopId),
        VietQRService.get(shopId)
      ]);
      setCustomers(custList || []);
      setOrders(orderList || []);
      setSuppliers(suppList || []);
      setVietqr(vqrData || { bank_id: 'MB', account_no: '0901234567', account_name: 'SHOP DROPSHIP CRM', memo_prefix: 'DON' });
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải dữ liệu Công nợ từ Supabase!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [shopId]);

  const customerDebts = customers.map(c => {
    const custOrders = orders.filter(o => String(o.customer_id || o.customerId) === String(c.id));
    const unpaidOrders = custOrders.filter(o => isUnpaid(o.status));
    const calculatedDebt = unpaidOrders.reduce((sum, o) => sum + (o.sell_price || o.sellPrice || 0), 0);
    const finalDebt = calculatedDebt > 0 ? calculatedDebt : (c.debt || 0);

    return {
      ...c,
      debt: finalDebt,
      unpaidOrdersCount: unpaidOrders.length,
      unpaidOrdersList: unpaidOrders
    };
  }).filter(c => c.debt > 0);

  const supplierDebts = suppliers.map(s => {
    const suppOrders = orders.filter(o => String(o.supplier_id || o.supplierId) === String(s.id));
    const unpaidSuppOrders = suppOrders.filter(o => o.supplier_paid === false || o.supplierPaid === false);
    const calculatedDebt = unpaidSuppOrders.reduce((sum, o) => sum + (o.cost_price || o.costPrice || 0), 0);
    const finalDebt = calculatedDebt > 0 ? calculatedDebt : (s.debt || 0);

    return {
      ...s,
      debt: finalDebt,
      unpaidOrdersCount: unpaidSuppOrders.length,
      unpaidOrdersList: unpaidSuppOrders
    };
  }).filter(s => s.debt > 0);

  const totalCustomerDebt = customerDebts.reduce((sum, c) => sum + (c.debt || 0), 0);
  const totalSupplierDebt = supplierDebts.reduce((sum, s) => sum + (s.debt || 0), 0);

  const handlePayCustomerDebt = async (customer) => {
    try {
      const debtAmount = Number(customer.debt || 0);
      const unpaidOrders = customer.unpaidOrdersList || [];
      for (const order of unpaidOrders) {
        await OrderService.update(order.id, { status: 'Đã thanh toán' });
      }
      await CustomerService.update(customer.id, { debt: 0 });

      // Auto record in Cash Ledger
      if (debtAmount > 0) {
        await CashTransactionService.create(shopId, {
          type: 'INCOME',
          category: 'Thu nợ khách',
          amount: debtAmount,
          account_type: 'BANK',
          counterpart_name: customer.name,
          notes: `Thu hồi công nợ từ khách hàng "${customer.name}"`
        });
      }

      toast.success(`Đã thu xong nợ ${debtAmount.toLocaleString()}đ từ khách hàng "${customer.name}" & ghi sổ quỹ!`);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi thu nợ. Vui lòng thử lại.');
    }
  };

  const handlePaySupplierDebt = async (supplier) => {
    try {
      const debtAmount = Number(supplier.debt || 0);
      const unpaidOrders = supplier.unpaidOrdersList || [];
      for (const order of unpaidOrders) {
        await OrderService.update(order.id, { supplier_paid: true, supplierPaid: true });
      }
      await SupplierService.update(supplier.id, { debt: 0 });

      // Auto record in Cash Ledger
      if (debtAmount > 0) {
        await CashTransactionService.create(shopId, {
          type: 'EXPENSE',
          category: 'Trả nợ NCC',
          amount: debtAmount,
          account_type: 'BANK',
          counterpart_name: supplier.name,
          notes: `Thanh toán công nợ cho Nhà Cung Cấp "${supplier.name}"`
        });
      }

      toast.success(`Đã thanh toán xong nợ ${debtAmount.toLocaleString()}đ cho Nguồn sỉ "${supplier.name}" & ghi sổ quỹ!`);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi thanh toán nợ nguồn sỉ. Vui lòng thử lại.');
    }
  };

  const handleCopyCustomerInvoiceText = (c) => {
    const vqr = vietqr || {};
    const memo = `${vqr.memo_prefix || vqr.memoPrefix || 'DON'} NO KH ${c.id}`;
    const qrUrl = getVietQRUrl ? getVietQRUrl(vqr.bank_id || vqr.bankId, vqr.account_no || vqr.accountNo, vqr.account_name || vqr.accountName, c.debt || 0, memo) : '';

    let t = '📄 BẢNG KÊ CÔNG NỢ & HÓA ĐƠN CHỐT SỔ\n';
    t += '🏢 Bên Bán: DROPSHIP CRM - DỊCH VỤ TÀI KHOẢN SỐ\n';
    t += '------------------------------------------\n';
    t += `👤 Khách Hàng: ${c.name} (SĐT: ${c.phone || 'N/A'})\n`;
    t += `🗓️ Ngày chốt: ${new Date().toLocaleDateString('vi-VN')}\n\n`;
    t += '📦 DANH SÁCH ĐƠN HÀNG CHƯA THANH TOÁN:\n';

    (c.unpaidOrdersList || []).forEach((o, index) => {
      const pName = o.product_name || o.productName;
      const sPrice = o.sell_price || o.sellPrice || 0;
      t += ` ${index + 1}. Đơn #${o.id} - ${pName}: ${sPrice.toLocaleString()}đ\n`;
    });

    t += '------------------------------------------\n';
    t += `💰 TỔNG CỘNG CÔNG NỢ: ${(c.debt || 0).toLocaleString()} VNĐ\n`;
    t += `✍️ Bằng chữ: ${numberToVietnameseWords(c.debt)}\n\n`;
    t += '💳 THÔNG TIN CHUYỂN KHOẢN THANH TOÁN:\n';
    t += ` 🏦 Ngân hàng: ${vqr.bank_id || vqr.bankId || 'MB'}\n`;
    t += ` 🔢 Số tài khoản: ${vqr.account_no || vqr.accountNo || ''}\n`;
    t += ` 👤 Chủ tài khoản: ${vqr.account_name || vqr.accountName || ''}\n`;
    t += ` 📝 Nội dung CK: ${memo}\n`;
    if (qrUrl) t += ` 📲 Link quét QR: ${qrUrl}\n`;
    t += '------------------------------------------\n';
    t += 'Cảm ơn Quý khách đã tin tưởng và ủng hộ Dịch Vụ!';

    navigator.clipboard.writeText(t);
    toast.success('Đã copy bảng kê công nợ kèm QR chuyển khoản!');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Quản Lý Công Nợ & Bảng Kê Thu/Chi 360°</h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: '13px' }}>
            Theo dõi khoản phải thu từ khách hàng, khoản phải trả cho nguồn sỉ và tạo hóa đơn chốt sổ.
          </p>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #ef4444', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ color: '#94a3b8', fontSize: '13.5px', fontWeight: '600' }}>Phải Thu Từ Khách Hàng (Phải Thu)</span>
            <div style={{ background: 'rgba(239,68,68,0.15)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
              <ArrowDownLeft size={20} color="#ef4444" />
            </div>
          </div>
          <p style={{ fontSize: '26px', fontWeight: '800', color: '#ef4444', margin: '4px 0' }}>
            {totalCustomerDebt.toLocaleString()}đ
          </p>
          <p style={{ color: '#64748b', fontSize: '12.5px' }}>
            Từ {customerDebts.length} khách hàng có công nợ
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #f59e0b', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ color: '#94a3b8', fontSize: '13.5px', fontWeight: '600' }}>Phải Trả Cho Nguồn Sỉ (Phải Trả)</span>
            <div style={{ background: 'rgba(245,158,11,0.15)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
              <ArrowUpRight size={20} color="#f59e0b" />
            </div>
          </div>
          <p style={{ fontSize: '26px', fontWeight: '800', color: '#f59e0b', margin: '4px 0' }}>
            {totalSupplierDebt.toLocaleString()}đ
          </p>
          <p style={{ color: '#64748b', fontSize: '12.5px' }}>
            Nợ {supplierDebts.length} nhà cung cấp
          </p>
        </div>
      </div>

      {/* Customer Debts List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700' }}>🔴 Công Nợ Phải Thu Khách Hàng ({customerDebts.length})</h2>
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Đang kiểm tra công nợ từ đám mây...</div>
          ) : customerDebts.length === 0 ? (
            <div className="empty-state">
              <Wallet size={40} />
              <h3>Không có khách hàng nào đang nợ tiền</h3>
              <p>Tất cả các đơn hàng bán ra hiện đã được thanh toán đầy đủ.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Mã KH', 'Tên Khách Hàng', 'SĐT', 'Số Đơn Nợ', 'Tổng Nợ Phải Thu', 'Thao Tác'].map(h => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customerDebts.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '14px 16px' }}><strong>#{c.id}</strong></td>
                    <td style={{ padding: '14px 16px', fontWeight: '700', color: '#fff' }}>{c.name}</td>
                    <td style={{ padding: '14px 16px', color: '#94a3b8' }}>{c.phone || 'N/A'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className="badge badge-warning">{c.unpaidOrdersCount} đơn nợ</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <strong style={{ color: '#ef4444', fontSize: '15px' }}>{(c.debt || 0).toLocaleString()}đ</strong>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          className="glass-button"
                          onClick={() => setSelectedInvoiceCust(c)}
                          style={{ padding: '5px 10px', fontSize: '11px', background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <FileText size={12} /> Xem Hóa Đơn Nợ
                        </button>
                        <button
                          className="glass-button"
                          onClick={() => handleCopyCustomerInvoiceText(c)}
                          style={{ padding: '5px 10px', fontSize: '11px', background: 'rgba(59,130,246,0.18)', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Copy size={12} /> Bảng Kê & QR
                        </button>
                        <button
                          className="glass-button"
                          onClick={() => handlePayCustomerDebt(c)}
                          style={{ padding: '5px 10px', fontSize: '11px', background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981' }}
                        >
                          Thu Xong Nợ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Supplier Debts List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700' }}>🟡 Công Nợ Phải Trả Nguồn Sỉ ({supplierDebts.length})</h2>
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Đang tải công nợ nhà cung cấp...</div>
          ) : supplierDebts.length === 0 ? (
            <div className="empty-state">
              <Wallet size={40} />
              <h3>Không có công nợ nhà cung cấp nào</h3>
              <p>Tất cả tiền hàng nhập sỉ từ các nguồn hiện đã thanh toán sỉ hoàn tất.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Mã Nguồn', 'Tên Nhà Cung Cấp', 'SĐT', 'Đơn Chưa TT Sỉ', 'Tổng Nợ Phải Trả', 'Thao Tác'].map(h => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {supplierDebts.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '14px 16px' }}><strong>#{s.id}</strong></td>
                    <td style={{ padding: '14px 16px', fontWeight: '700', color: '#fff' }}>{s.name}</td>
                    <td style={{ padding: '14px 16px', color: '#94a3b8' }}>{s.phone || 'N/A'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className="badge badge-warning">{s.unpaidOrdersCount} đơn chưa TT</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <strong style={{ color: '#f59e0b', fontSize: '15px' }}>{(s.debt || 0).toLocaleString()}đ</strong>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          className="glass-button"
                          onClick={() => setSelectedInvoiceSupp(s)}
                          style={{ padding: '5px 10px', fontSize: '11px', background: 'rgba(245,158,11,0.18)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <FileText size={12} /> Bảng Kê Trả Sỉ
                        </button>
                        <button
                          className="glass-button"
                          onClick={() => handlePaySupplierDebt(s)}
                          style={{ padding: '5px 10px', fontSize: '11px', background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981' }}
                        >
                          Thanh Toán Xong Sỉ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Printable Debt Statement Modal - Customer */}
      {selectedInvoiceCust && (
        <div className="modal-overlay" onClick={() => setSelectedInvoiceCust(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '780px', background: '#fff', color: '#0f172a' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>BẢNG KÊ CÔNG NỢ KHÁCH HÀNG</h2>
              <button className="modal-close-btn" style={{ color: '#000' }} onClick={() => setSelectedInvoiceCust(null)}><X size={18} /></button>
            </div>

            <div id="printable-invoice" style={{ padding: '12px 4px', fontSize: '12.5px', color: '#0f172a', lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #ef4444', paddingBottom: '10px', marginBottom: '14px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#ef4444', margin: 0 }}>DROPSHIP CRM STORE</h2>
                  <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0' }}>Chuyên Dịch Vụ & Tài Khoản Bản Quyền Số</p>
                  <p style={{ fontSize: '11.5px', color: '#64748b', margin: 0 }}>Hotline / Zalo CSKH: <strong>0901234567</strong></p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0, textTransform: 'uppercase' }}>BẢNG KÊ CÔNG NỢ THU TIỀN</h3>
                  <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0' }}>
                    Số chứng từ: <strong>BKCN-{new Date().getFullYear()}/{(new Date().getMonth() + 1).toString().padStart(2, '0')}/{selectedInvoiceCust.id}</strong>
                  </p>
                  <p style={{ fontSize: '11.5px', color: '#64748b', margin: 0 }}>
                    Ngày xuất: {new Date().toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>

              {/* Customer Info Box */}
              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px' }}>
                  <div><strong>Tên Khách Hàng (Bên Nợ):</strong> {selectedInvoiceCust.name}</div>
                  <div><strong>SĐT / Zalo:</strong> {selectedInvoiceCust.phone || 'N/A'}</div>
                  <div><strong>Mã Khách Hàng:</strong> KH-{selectedInvoiceCust.id}</div>
                  <div><strong>Phân Loại:</strong> {selectedInvoiceCust.type === 'Si' ? 'Khách Sỉ / Đại lý' : selectedInvoiceCust.type === 'CTV' ? 'Cộng Tác Viên' : 'Khách Lẻ'}</div>
                </div>
              </div>

              {/* Detailed Orders Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '8px', textAlign: 'center', width: '40px', border: '1px solid #cbd5e1' }}>STT</th>
                    <th style={{ padding: '8px', textAlign: 'center', width: '70px', border: '1px solid #cbd5e1' }}>Mã Đơn</th>
                    <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Tên SP</th>
                    <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Infor SP</th>
                    <th style={{ padding: '8px', textAlign: 'right', width: '100px', border: '1px solid #cbd5e1' }}>Đơn Giá</th>
                    <th style={{ padding: '8px', textAlign: 'center', width: '40px', border: '1px solid #cbd5e1' }}>SL</th>
                    <th style={{ padding: '8px', textAlign: 'right', width: '110px', border: '1px solid #cbd5e1' }}>Thành Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedInvoiceCust.unpaidOrdersList || []).length > 0 ? (
                    (selectedInvoiceCust.unpaidOrdersList || []).map((o, idx) => (
                      <tr key={o.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{idx + 1}</td>
                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700', border: '1px solid #cbd5e1' }}>#{o.id}</td>
                        <td style={{ padding: '8px', fontWeight: '700', color: '#0f172a', border: '1px solid #cbd5e1' }}>{o.product_name || o.productName}</td>
                        <td style={{ padding: '8px', fontSize: '11px', color: '#475569', fontFamily: 'monospace', wordBreak: 'break-all', border: '1px solid #cbd5e1' }}>
                          {o.infor || 'Chưa cấp infor'}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #cbd5e1' }}>{(o.sell_price || o.sellPrice || 0).toLocaleString()}đ</td>
                        <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>1</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: '700', color: '#ef4444', border: '1px solid #cbd5e1' }}>
                          {(o.sell_price || o.sellPrice || 0).toLocaleString()}đ
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>1</td>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700', border: '1px solid #cbd5e1' }}>---</td>
                      <td style={{ padding: '8px', fontWeight: '700', border: '1px solid #cbd5e1' }}>Dư nợ công nợ dịch vụ tích lũy chốt sổ</td>
                      <td style={{ padding: '8px', fontSize: '11px', color: '#475569', fontFamily: 'monospace', border: '1px solid #cbd5e1' }}>Tích lũy chốt sổ</td>
                      <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #cbd5e1' }}>{(selectedInvoiceCust.debt || 0).toLocaleString()}đ</td>
                      <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>1</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: '700', color: '#ef4444', border: '1px solid #cbd5e1' }}>
                        {(selectedInvoiceCust.debt || 0).toLocaleString()}đ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* VietQR & Total Box */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {getVietQRUrl && (
                    <img
                      src={getVietQRUrl(
                        (vietqr?.bank_id || vietqr?.bankId || 'MB'),
                        (vietqr?.account_no || vietqr?.accountNo || '0901234567'),
                        (vietqr?.account_name || vietqr?.accountName || 'SHOP DROPSHIP CRM'),
                        (selectedInvoiceCust.debt || 0),
                        `${vietqr?.memo_prefix || vietqr?.memoPrefix || 'DON'} NO KH ${selectedInvoiceCust.id}`,
                        'compact2'
                      )}
                      alt="VietQR Chuyển Khoản"
                      style={{ width: '135px', height: 'auto', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  )}
                  <div style={{ fontSize: '11.5px', color: '#334155', lineHeight: 1.5 }}>
                    <p style={{ margin: 0, fontWeight: '700', color: '#0f172a' }}>💳 THÔNG TIN CHUYỂN KHOẢN:</p>
                    <p style={{ margin: 0 }}>🏦 Ngân hàng: <strong>{vietqr?.bank_id || vietqr?.bankId || 'MB'}</strong></p>
                    <p style={{ margin: 0 }}>🔢 Số tài khoản: <strong style={{ color: '#10b981' }}>{vietqr?.account_no || vietqr?.accountNo || '0901234567'}</strong></p>
                    <p style={{ margin: 0 }}>👤 Chủ TK: <strong>{vietqr?.account_name || vietqr?.accountName || 'SHOP DROPSHIP CRM'}</strong></p>
                    <p style={{ margin: 0 }}>📝 Nội dung CK: <strong style={{ color: '#ef4444' }}>{(vietqr?.memo_prefix || vietqr?.memoPrefix || 'DON') + ' NO KH ' + selectedInvoiceCust.id}</strong></p>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0, fontWeight: '600' }}>TỔNG CỘNG CÔNG NỢ PHẢI THU:</p>
                  <p style={{ fontSize: '22px', fontWeight: '800', color: '#ef4444', margin: '4px 0' }}>
                    {(selectedInvoiceCust.debt || 0).toLocaleString()} VNĐ
                  </p>
                  <p style={{ fontSize: '12px', color: '#334155', fontStyle: 'italic', margin: 0 }}>
                    (Bằng chữ: <strong>{numberToVietnameseWords(selectedInvoiceCust.debt)}</strong>)
                  </p>
                </div>
              </div>

              {/* Signatures */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', textAlign: 'center', marginTop: '20px', fontSize: '11.5px' }}>
                <div>
                  <p style={{ fontWeight: '700', margin: 0 }}>NGƯỜI LẬP BẢNG KÊ</p>
                  <p style={{ fontSize: '10.5px', color: '#64748b', fontStyle: 'italic', margin: '2px 0 45px 0' }}>(Ký, ghi rõ họ tên)</p>
                  <p style={{ fontWeight: '600', color: '#334155' }}>Nhân Viên Kế Toán</p>
                </div>
                <div>
                  <p style={{ fontWeight: '700', margin: 0 }}>KHÁCH HÀNG / BÊN NỢ</p>
                  <p style={{ fontSize: '10.5px', color: '#64748b', fontStyle: 'italic', margin: '2px 0 45px 0' }}>(Ký, xác nhận đối chiếu)</p>
                  <p style={{ fontWeight: '600', color: '#334155' }}>{selectedInvoiceCust.name}</p>
                </div>
                <div>
                  <p style={{ fontWeight: '700', margin: 0 }}>ĐẠI DIỆN CỬA HÀNG</p>
                  <p style={{ fontSize: '10.5px', color: '#64748b', fontStyle: 'italic', margin: '2px 0 45px 0' }}>(Ký, đóng dấu nếu có)</p>
                  <p style={{ fontWeight: '600', color: '#334155' }}>Chủ Shop CRM</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
              <button onClick={handlePrint} className="glass-button" style={{ flex: 1, background: '#ef4444', color: '#fff', fontWeight: '700' }}>
                <Printer size={16} /> In Bảng Kê Công Nợ (Print A4)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Debt Statement Modal - Supplier */}
      {selectedInvoiceSupp && (
        <div className="modal-overlay" onClick={() => setSelectedInvoiceSupp(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '780px', background: '#fff', color: '#0f172a' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#0f172a' }}>BẢNG KÊ CÔNG NỢ NGUỒN SỈ</h2>
              <button className="modal-close-btn" style={{ color: '#000' }} onClick={() => setSelectedInvoiceSupp(null)}><X size={18} /></button>
            </div>

            <div id="printable-invoice" style={{ padding: '12px 4px', fontSize: '12.5px', color: '#0f172a', lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #f59e0b', paddingBottom: '10px', marginBottom: '14px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#f59e0b', margin: 0 }}>BẢNG KÊ THANH TOÁN TIỀN SỈ</h2>
                  <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0' }}>Nhà Cung Cấp: <strong>{selectedInvoiceSupp.name}</strong></p>
                  <p style={{ fontSize: '11.5px', color: '#64748b', margin: 0 }}>SĐT Hotline: <strong>{selectedInvoiceSupp.phone || 'N/A'}</strong></p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '11.5px', color: '#64748b', margin: 0 }}>Ngày xuất: {new Date().toLocaleDateString('vi-VN')}</p>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '8px', textAlign: 'center', width: '40px', border: '1px solid #cbd5e1' }}>STT</th>
                    <th style={{ padding: '8px', textAlign: 'center', width: '70px', border: '1px solid #cbd5e1' }}>Mã Đơn</th>
                    <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Sản Phẩm Nhập</th>
                    <th style={{ padding: '8px', textAlign: 'center', width: '45px', border: '1px solid #cbd5e1' }}>SL</th>
                    <th style={{ padding: '8px', textAlign: 'right', width: '120px', border: '1px solid #cbd5e1' }}>Giá Vốn (VNĐ)</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedInvoiceSupp.unpaidOrdersList || []).map((o, idx) => (
                    <tr key={o.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{idx + 1}</td>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700', border: '1px solid #cbd5e1' }}>#{o.id}</td>
                      <td style={{ padding: '8px', fontWeight: '700', border: '1px solid #cbd5e1' }}>{o.product_name || o.productName}</td>
                      <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>1</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: '700', color: '#f59e0b', border: '1px solid #cbd5e1' }}>
                        {(o.cost_price || o.costPrice || 0).toLocaleString()}đ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', textAlign: 'right', border: '1px solid #cbd5e1' }}>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>TỔNG CỘNG CÔNG NỢ PHẢI TRẢ SỈ:</p>
                <p style={{ fontSize: '22px', fontWeight: '800', color: '#f59e0b', margin: '4px 0' }}>
                  {(selectedInvoiceSupp.debt || 0).toLocaleString()} VNĐ
                </p>
                <p style={{ fontSize: '12px', color: '#334155', fontStyle: 'italic', margin: 0 }}>
                  (Bằng chữ: <strong>{numberToVietnameseWords(selectedInvoiceSupp.debt)}</strong>)
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
              <button onClick={handlePrint} className="glass-button" style={{ flex: 1, background: '#f59e0b', color: '#fff', fontWeight: '700' }}>
                <Printer size={16} /> In Bảng Kê Trả Sỉ (Print A4)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
