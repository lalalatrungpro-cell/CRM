import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { VietQRService, ChannelService } from '../utils/dataService';
import { getVietQRUrl } from '../utils/storage';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import { QrCode, Save, CreditCard, ShieldCheck, Check, Copy, Zap, Activity, Bell, Plus, Trash2, Layers } from 'lucide-react';

const BANKS_LIST = [
  { "code": "MB", "name": "MBBank (Ngân hàng Quân Đội)" },
  { "code": "VCB", "name": "Vietcombank (Ngân hàng Ngoại Thương)" },
  { "code": "TCB", "name": "Techcombank" },
  { "code": "VPB", "name": "VPBank" },
  { "code": "TPB", "name": "TPBank" },
  { "code": "ACB", "name": "ACB (Ngân hàng Á Châu)" },
  { "code": "BIDV", "name": "BIDV" },
  { "code": "ICB", "name": "VietinBank" },
  { "code": "VBA", "name": "Agribank" },
  { "code": "STB", "name": "Sacombank" },
  { "code": "MSB", "name": "MSB" },
  { "code": "OCB", "name": "OCB" },
  { "code": "HDB", "name": "HDBank" },
  { "code": "VIB", "name": "VIB" },
  { "code": "SHB", "name": "SHB" },
  { "code": "EIB", "name": "Eximbank" }
];

export default function Settings() {
  const toast = useToast();
  const { shopId } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState([]);
  const [newChannelType, setNewChannelType] = useState('Facebook Page');
  const [newChannelName, setNewChannelName] = useState('');
  const [confirmDeleteChannelId, setConfirmDeleteChannelId] = useState(null);

  const [vqr, setVqr] = useState({
    bank_id: 'MB',
    account_no: '0901234567',
    account_name: 'SHOP DROPSHIP CRM',
    template: 'compact2',
    memo_prefix: 'DON'
  });

  const loadSettings = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const [vqrData, chanList] = await Promise.all([
        VietQRService.get(shopId),
        ChannelService.list(shopId)
      ]);
      if (vqrData) {
        setVqr({
          bank_id: vqrData.bank_id || vqrData.bankId || 'MB',
          account_no: vqrData.account_no || vqrData.accountNo || '',
          account_name: vqrData.account_name || vqrData.accountName || '',
          template: vqrData.template || 'compact2',
          memo_prefix: vqrData.memo_prefix || vqrData.memoPrefix || 'DON'
        });
      }
      setChannels(chanList || []);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải cài đặt từ Supabase!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [shopId]);

  const handleSaveVietQR = async (e) => {
    e.preventDefault();
    if (!vqr.account_no.trim()) return toast.error('Vui lòng nhập Số Tài Khoản!');
    if (!vqr.account_name.trim()) return toast.error('Vui lòng nhập Tên Chủ Tài Khoản!');

    try {
      await VietQRService.save(shopId, {
        bank_id: vqr.bank_id,
        account_no: vqr.account_no.trim(),
        account_name: vqr.account_name.trim(),
        template: vqr.template,
        memo_prefix: (vqr.memo_prefix || 'DON').trim()
      });
      toast.success('Đã lưu cấu hình VietQR lên đám mây thành công!');
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi lưu cài đặt VietQR. Vui lòng thử lại.');
    }
  };

  const handleAddChannel = async (e) => {
    e.preventDefault();
    if (!newChannelName.trim()) return toast.error('Vui lòng nhập tên kênh bán!');

    try {
      const created = await ChannelService.create(shopId, {
        channel_type: newChannelType,
        name: newChannelName.trim()
      });
      setChannels(prev => [...prev, created]);
      setNewChannelName('');
      toast.success(`Đã thêm kênh bán "${created.name}"!`);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi thêm kênh bán hàng.');
    }
  };

  const handleDeleteChannel = async () => {
    const id = confirmDeleteChannelId;
    try {
      await ChannelService.remove(id);
      setChannels(prev => prev.filter(c => c.id !== id));
      setConfirmDeleteChannelId(null);
      toast.success('Đã xóa kênh bán hàng!');
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi xóa kênh.');
    }
  };

  const demoAmount = 150000;
  const demoMemo = `${vqr.memo_prefix || 'DON'} 99`;
  const qrDemoUrl = getVietQRUrl
    ? getVietQRUrl(vqr.bank_id, vqr.account_no, vqr.account_name, demoAmount, demoMemo, vqr.template)
    : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1000px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: '800' }}>Cấu Hình Ngân Hàng VietQR & Kênh Bán Hàng 360°</h1>
        <p style={{ color: '#64748b', marginTop: '4px', fontSize: '13px' }}>
          Thiết lập tài khoản ngân hàng VietQR và quản lý các Trang/Zalo sub-channels để đo lường doanh thu.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Đang tải cài đặt từ đám mây...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* VietQR Section */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            {/* Form */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                <CreditCard size={20} color="#6366f1" />
                <h2 style={{ fontSize: '16px', fontWeight: '700' }}>Thông Tin Ngân Hàng Thụ Hưởng</h2>
              </div>

              <form onSubmit={handleSaveVietQR} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="form-label">Chọn Ngân Hàng (Bank Name)</label>
                  <select
                    className="glass-input"
                    value={vqr.bank_id}
                    onChange={e => setVqr({ ...vqr, bank_id: e.target.value })}
                  >
                    {BANKS_LIST.map(b => (
                      <option key={b.code} value={b.code}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Số Tài Khoản Ngân Hàng</label>
                  <input
                    type="text" required className="glass-input" placeholder="VD: 0901234567"
                    value={vqr.account_no}
                    onChange={e => setVqr({ ...vqr, account_no: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">Tên Chủ Tài Khoản (In hoa không dấu)</label>
                  <input
                    type="text" required className="glass-input" placeholder="VD: NGUYEN VAN A"
                    value={vqr.account_name}
                    onChange={e => setVqr({ ...vqr, account_name: e.target.value.toUpperCase() })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label">Giao Diện Mã QR</label>
                    <select
                      className="glass-input"
                      value={vqr.template}
                      onChange={e => setVqr({ ...vqr, template: e.target.value })}
                    >
                      <option value="compact2">Compact (Nhỏ gọn)</option>
                      <option value="compact">Gọn nhẹ 1</option>
                      <option value="qr_only">Chỉ hiển thị QR</option>
                      <option value="print">Bản in A4 hóa đơn</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Tiền Tố Nội Dung CK</label>
                    <input
                      type="text" required className="glass-input" placeholder="VD: DON"
                      value={vqr.memo_prefix}
                      onChange={e => setVqr({ ...vqr, memo_prefix: e.target.value.toUpperCase() })}
                    />
                  </div>
                </div>

                <button type="submit" className="glass-button" style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Save size={16} /> Lưu Cấu Hình VietQR
                </button>
              </form>
            </div>

            {/* Preview */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#94a3b8' }}>Xem Trước Mã VietQR Tự Động</h3>
              {qrDemoUrl ? (
                <div style={{ background: '#fff', padding: '12px', borderRadius: '16px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
                  <img src={qrDemoUrl} alt="VietQR Demo" style={{ maxWidth: '240px', height: 'auto', display: 'block', borderRadius: '8px' }} />
                </div>
              ) : (
                <div style={{ color: '#ef4444', padding: '20px' }}>Chưa cấu hình đủ thông tin ngân hàng!</div>
              )}
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Nội dung CK chuyển mẫu: <strong style={{ color: '#10b981' }}>{demoMemo}</strong>
              </div>
            </div>
          </div>

          {/* Sub-Channels Management Section */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
              <Layers size={20} color="#10b981" />
              <h2 style={{ fontSize: '16px', fontWeight: '700' }}>Quản Lý Trang Phụ / Kênh Phụ (Sub-Channels)</h2>
            </div>

            <form onSubmit={handleAddChannel} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                className="glass-input" style={{ width: '200px' }}
                value={newChannelType} onChange={e => setNewChannelType(e.target.value)}
              >
                <option value="Facebook Page">Facebook Page</option>
                <option value="Zalo">Zalo</option>
                <option value="TikTok Shop">TikTok Shop</option>
                <option value="Telegram">Telegram</option>
                <option value="Website">Website</option>
              </select>

              <input
                type="text" required className="glass-input" style={{ flex: 1, minWidth: '220px' }} placeholder="Tên Trang Phụ (VD: Page Canva Pro Sỉ #02)"
                value={newChannelName} onChange={e => setNewChannelName(e.target.value)}
              />

              <button type="submit" className="glass-button" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={16} /> Thêm Kênh
              </button>
            </form>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px', marginTop: '10px' }}>
              {channels.map(ch => (
                <div key={ch.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span className="badge badge-info" style={{ fontSize: '10px' }}>{ch.channel_type}</span>
                    <p style={{ fontWeight: '600', color: '#fff', fontSize: '13.5px', marginTop: '2px' }}>{ch.name}</p>
                  </div>
                  <button onClick={() => setConfirmDeleteChannelId(ch.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmDeleteChannelId}
        title="Xóa Kênh Phụ?"
        message="Bạn có chắc muốn xóa kênh bán hàng phụ này?"
        onConfirm={handleDeleteChannel}
        onCancel={() => setConfirmDeleteChannelId(null)}
        confirmLabel="Xác Nhận Xóa"
      />
    </div>
  );
}
