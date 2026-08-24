// BUG-01 FIX: Simple hash to avoid storing plaintext passwords
const hashPassword = (pwd) => btoa(unescape(encodeURIComponent(pwd)));
const verifyPassword = (plain, hashed) => hashPassword(plain) === hashed;

const MOCK_DATA = {
  customChannels: [
      { id: 1, channel: 'Facebook Page', name: 'Page Canva Pro Giá Sỉ' },
      { id: 2, channel: 'Facebook Page', name: 'Page Netflix & AI Store' },
      { id: 3, channel: 'Zalo', name: 'Zalo Hotline 0901234567' },
      { id: 4, channel: 'Zalo', name: 'Zalo CSKH 0987654321' },
      { id: 5, channel: 'TikTok Shop', name: 'TikTok Store Canva VN' }
    ],
    vietqr: {
    bankId: 'MB',
    accountNo: '0901234567',
    accountName: 'SHOP DROPSHIP CRM',
    template: 'compact2',
    memoPrefix: 'DON'
  },
  users: [{ id: 1, username: 'admin', passwordHash: hashPassword('123'), role: 'admin' }],
  products: [
    { id: 1, name: 'Canva Pro (1 nam)', category: 'Canva Pro', defaultCost: 50000, defaultSell: 150000, defaultDurationDays: 365, maxSlots: 49 },
    { id: 2, name: 'Canva Pro (1 thang)', category: 'Canva Pro', defaultCost: 15000, defaultSell: 35000, defaultDurationDays: 30, maxSlots: 49 },
    { id: 3, name: 'Google AI Pro (1 nam)', category: 'Google AI Pro', defaultCost: 80000, defaultSell: 220000, defaultDurationDays: 365, maxSlots: 5 },
    { id: 4, name: 'Netflix Premium 4K (1 thang)', category: 'Netflix', defaultCost: 40000, defaultSell: 75000, defaultDurationDays: 30, maxSlots: 5 },
    { id: 5, name: 'ChatGPT Plus (1 thang)', category: 'ChatGPT Plus', defaultCost: 150000, defaultSell: 250000, defaultDurationDays: 30, maxSlots: 1 },
    { id: 6, name: 'Spotify Family (1 thang)', category: 'Spotify', defaultCost: 20000, defaultSell: 45000, defaultDurationDays: 30, maxSlots: 5 },
    { id: 7, name: 'YouTube Premium (1 thang)', category: 'YouTube Premium', defaultCost: 18000, defaultSell: 40000, defaultDurationDays: 30, maxSlots: 5 },
  ],
  teams: [
    {
      id: 1,
      name: 'Canva Pro Team #01',
      category: 'Canva Pro',
      type: 'Team Member',
      infor: 'canvateam01@gmail.com | CanvaPass123! | 2FA: JBSWY3DPEHPK3PXP',
      maxSlots: 49,
      purchaseDate: '2026-01-01',
      expireDate: '2027-01-01',
      supplierId: 1,
      supplierName: 'Nguon Canva Si VIP',
      notes: 'Team dang on dinh, goi 1 nam'
    },
    {
      id: 2,
      name: 'Google AI Pro (Gemini Advanced) #01',
      category: 'Google AI Pro',
      type: 'Family Group',
      infor: 'googleaipro01@gmail.com | PassGoogle123! | 2FA: G789X23',
      maxSlots: 5,
      purchaseDate: '2026-06-01',
      expireDate: '2027-06-01',
      supplierId: 2,
      supplierName: 'Nguon Google Direct',
      notes: 'Goi gia dinh 5 slot cho khach'
    },
    {
      id: 3,
      name: 'Netflix Premium 4K (Kho Acc 5 Man)',
      category: 'Netflix',
      type: 'Shared Profile',
      infor: 'netflixpremium01@gmail.com | NetflixPass888!',
      maxSlots: 5,
      purchaseDate: '2026-07-10',
      expireDate: '2027-07-10',
      supplierId: 3,
      supplierName: 'Nguon Netflix US',
      notes: 'Moi slot tuong ung 1 Man hinh (Profile 1 -> 5)'
    }
  ],
  customers: [
    { id: 1, name: 'Nguyễn Văn A', phone: '0901234567', type: 'Le', debt: 0, source: 'Facebook Page' },
    { id: 2, name: 'Trần Thị B', phone: '0987654321', type: 'CTV', debt: 0, source: 'Zalo' },
    { id: 3, name: 'Đại lý C', phone: '0911222333', type: 'Si', debt: 5000000, source: 'TikTok Shop' },
  ],
  suppliers: [
    { id: 1, name: 'Nguon Canva Si VIP', phone: '0999888777', debt: 2000000 },
    { id: 2, name: 'Nguon Google Direct', phone: '0888777666', debt: 0 },
    { id: 3, name: 'Nguon Netflix US', phone: '0977666555', debt: 1500000 },
  ],
  orders: [
    {
      id: 1,
      date: '2026-08-01',
      customerId: 1,
      customerName: 'Nguyễn Văn A',
      phone: '0901234567',
      supplierId: 1,
      supplierName: 'Nguon Canva Si VIP',
      teamId: 1,
      productName: 'Canva Pro (1 nam)',
      infor: 'nguyenvana.design@gmail.com | AutoJoinLink',
      purchaseDate: '2026-08-01',
      expireDate: '2026-08-14',
      costPrice: 50000,
      sellPrice: 150000,
      status: 'Đã thanh toán',
      supplierPaid: true,
      warrantyCount: 0
    },
    {
      id: 2,
      date: '2026-08-05',
      customerId: 2,
      customerName: 'Trần Thị B',
      phone: '0987654321',
      supplierId: 2,
      supplierName: 'Nguon Google Direct',
      teamId: 2,
      productName: 'Google AI Pro (Gemini Advanced 1 nam)',
      infor: 'tranthib.ai@gmail.com | Slot #1 (Invite Family)',
      purchaseDate: '2026-08-05',
      expireDate: '2026-09-05',
      costPrice: 80000,
      sellPrice: 220000,
      status: 'Đã thanh toán',
      supplierPaid: true,
      warrantyCount: 0
    }
  ]
};

export const hashPwd = hashPassword;
export const verifyPwd = verifyPassword;

export const initData = () => {
  if (!localStorage.getItem('mini_crm_data')) {
    localStorage.setItem('mini_crm_data', JSON.stringify(MOCK_DATA));
  }
};

export const getData = () => {
  const data = localStorage.getItem('mini_crm_data');
  const parsed = data ? JSON.parse(data) : MOCK_DATA;
  
  // Migration: ensure products exist
  if (!parsed.careLogs) { parsed.careLogs = []; }
  if (!parsed.products) {
    parsed.products = MOCK_DATA.products;
  }
  
  // Migration: ensure teams have supplierId
  if (parsed.teams) {
    parsed.teams = parsed.teams.map(t => ({
      ...t,
      supplierId: t.supplierId || null
    }));
  }

  // Robust Migration: Normalize status/types/names to standard accented Vietnamese
  let migrated = false;
  
  if (parsed.orders) {
    parsed.orders = parsed.orders.map(o => {
      let updated = false;
      let newStatus = o.status;
      let newCustName = o.customerName;

      // Status translation mapping
      if (o.status === 'Da thanh toan' || o.status === 'Da TT' || o.status === 'da_thanh_toan') {
        newStatus = 'Đã thanh toán';
        updated = true;
      } else if (o.status === 'No' || o.status === 'no' || o.status === 'chua_thanh_toan') {
        newStatus = 'Nợ';
        updated = true;
      }

      // Customer name migration
      if (o.customerName === 'Nguyen Van A') { newCustName = 'Nguyễn Văn A'; updated = true; }
      else if (o.customerName === 'Tran Thi B') { newCustName = 'Trần Thị B'; updated = true; }
      else if (o.customerName === 'Dai ly C') { newCustName = 'Đại lý C'; updated = true; }

      if (updated) migrated = true;
      return { ...o, status: newStatus, customerName: newCustName };
    });
  }

  if (parsed.customers) {
    parsed.customers = parsed.customers.map(c => {
      let updated = false;
      let newName = c.name;
      
      if (c.name === 'Nguyen Van A') { newName = 'Nguyễn Văn A'; updated = true; }
      else if (c.name === 'Tran Thi B') { newName = 'Trần Thị B'; updated = true; }
      else if (c.name === 'Dai ly C') { newName = 'Đại lý C'; updated = true; }

      if (updated) migrated = true;
      return { ...c, name: newName };
    });
  }

  if (migrated) {
    localStorage.setItem('mini_crm_data', JSON.stringify(parsed));
  }

  return parsed;
};

export const saveData = (data) => {
  localStorage.setItem('mini_crm_data', JSON.stringify(data));
};



export const getVietQRUrl = (bankId, accountNo, accountName, amount, memo, template = 'compact2') => {
  if (!bankId || !accountNo) return null;
  const b = bankId.trim();
  const a = accountNo.trim().replace(/[^0-9a-zA-Z]/g, '');
  const n = encodeURIComponent((accountName || '').trim());
  const m = encodeURIComponent((memo || '').trim());
  const am = Math.round(parseFloat(amount) || 0);
  return `https://img.vietqr.io/image/${b}-${a}-${template}.png?amount=${am}&addInfo=${m}&accountName=${n}`;
};

export const getBankDisplayName = (code) => {
  if (!code) return 'MBBank';
  const c = String(code).toUpperCase().trim();
  if (c === 'VPB' || c === 'VPBANK') return 'VPBank';
  if (c === 'MB' || c === 'MBBANK') return 'MBBank';
  if (c === 'VCB' || c === 'VIETCOMBANK') return 'Vietcombank';
  if (c === 'TCB' || c === 'TECHCOMBANK') return 'Techcombank';
  if (c === 'ICB' || c === 'VIETINBANK') return 'VietinBank';
  if (c === 'ACB') return 'ACB';
  if (c === 'TPB' || c === 'TPBANK') return 'TPBank';
  if (c === 'VAB' || c === 'VIETABANK') return 'VietABank';
  if (c === 'STB' || c === 'SACOMBANK') return 'Sacombank';
  if (c === 'BIDV') return 'BIDV';
  if (c === 'VIB') return 'VIB';
  if (c === 'SHB') return 'SHB';
  if (c === 'MSB') return 'MSB';
  if (c === 'LPB' || c === 'LIENVIETPOSTBANK') return 'LPBank';
  if (c === 'HDB' || c === 'HDBANK') return 'HDBank';
  if (c === 'OCB') return 'OCB';
  if (c === 'SCB') return 'SCB';
  return code;
};
