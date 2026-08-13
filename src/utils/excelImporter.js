import * as XLSX from 'xlsx';
import { CustomerService, TeamService, OrderService, ProductService, SupplierService } from './dataService';

export function excelDateToISO(val) {
  if (!val) return null;
  if (typeof val === 'number') {
    const d = new Date((val - 25569) * 86400 * 1000);
    return d.toISOString().split('T')[0];
  }
  if (typeof val === 'string') {
    val = val.trim();
    if (val.includes('-')) {
      const parts = val.split('-').map(s => s.trim());
      if (parts[0].length === 4) return parts[0] + '-' + parts[1].padStart(2, '0') + '-' + parts[2].padStart(2, '0');
      if (parts[0].includes('/')) {
        const dParts = parts[0].split('/');
        if (dParts.length === 3) {
          const yr = dParts[2].length === 4 ? dParts[2] : '20' + dParts[2];
          return `${yr}-${dParts[1].padStart(2, '0')}-${dParts[0].padStart(2, '0')}`;
        }
      }
    }
    if (val.includes('/')) {
      const dParts = val.split('/');
      if (dParts.length === 3) {
        const yr = dParts[2].length === 4 ? dParts[2] : '20' + dParts[2];
        return `${yr}-${dParts[1].padStart(2, '0')}-${dParts[0].padStart(2, '0')}`;
      }
    }
  }
  return null;
}

export async function parseAndImportExcelFile(arrayBuffer, shopId, onProgress) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetNames = wb.SheetNames;

  const stats = {
    productsCount: 0,
    suppliersCount: 0,
    teamsCount: 0,
    customersCount: 0,
    ordersCount: 0
  };

  const productMap = new Map();
  const supplierMap = new Map();
  const teamMap = new Map();

  // 1. If contains DM_SAN_PHAM (Quản lý bán ACC.xlsx)
  if (sheetNames.includes('DM_SAN_PHAM')) {
    if (onProgress) onProgress('Đang đọc danh mục sản phẩm từ DM_SAN_PHAM...');
    const raw = XLSX.utils.sheet_to_json(wb.Sheets['DM_SAN_PHAM'], { header: 1 });
    const rows = raw.slice(5).filter(r => r && r.length > 1 && r[1]);
    for (const r of rows) {
      const name = String(r[1] || '').trim();
      if (name && !productMap.has(name.toLowerCase())) {
        const cat = String(r[2] || 'Phần mềm').trim();
        const months = parseInt(r[4] || 1) || 1;
        const pObj = {
          name,
          category: cat,
          default_cost: 0,
          default_sell: 100000,
          price_ctv: 80000,
          price_si: 60000,
          default_duration_days: months * 30,
          max_slots: 1
        };
        try {
          const created = await ProductService.create(shopId, pObj);
          if (created) {
            productMap.set(name.toLowerCase(), created.id);
            stats.productsCount++;
          }
        } catch (e) {}
      }
    }
  }

  // 2. If contains DM_NCC (Suppliers)
  if (sheetNames.includes('DM_NCC')) {
    if (onProgress) onProgress('Đang đọc danh mục Nhà cung cấp từ DM_NCC...');
    const raw = XLSX.utils.sheet_to_json(wb.Sheets['DM_NCC'], { header: 1 });
    const rows = raw.slice(5).filter(r => r && r.length > 1 && r[1]);
    for (const r of rows) {
      const name = String(r[1] || r[0] || '').trim();
      if (name && !supplierMap.has(name.toLowerCase())) {
        const sObj = {
          name,
          phone: String(r[3] || '').trim(),
          zalo: String(r[3] || '').trim(),
          telegram: '',
          notes: String(r[4] || '').trim(),
          debt: 0
        };
        try {
          const created = await SupplierService.create(shopId, sObj);
          if (created) {
            supplierMap.set(name.toLowerCase(), created.id);
            stats.suppliersCount++;
          }
        } catch (e) {}
      }
    }
  }

  // 3. Canva Teams (Team_Canva or TEAM_CANVA)
  const teamSheetName = sheetNames.find(s => s === 'Team_Canva' || s === 'TEAM_CANVA');
  if (teamSheetName) {
    if (onProgress) onProgress(`Đang đọc danh sách Teams từ sheet ${teamSheetName}...`);
    const rawTeams = XLSX.utils.sheet_to_json(wb.Sheets[teamSheetName]);
    for (const t of rawTeams) {
      const teamCode = String(t.Team_ID || t['Mã Team'] || '').trim();
      const email = String(t['Email đăng nhập'] || t.Infor || '').trim();
      const pass = String(t['Mật khẩu'] || '').trim();
      const name = email ? `Team Canva (${email})` : (t['Tên/ghi chú team']?.slice(0, 40) || `Team Canva ${teamCode}`);
      const infor = [email, pass].filter(Boolean).join(' | ');
      const maxSlots = parseInt(t['Số slot tối đa'] || t['Tổng slot'] || 49) || 49;
      const pDate = excelDateToISO(t['Ngày tạo team'] || t['Ngày mua']) || new Date().toISOString().split('T')[0];

      const tObj = {
        name,
        category: 'Canva Pro',
        type: 'Team Member',
        infor,
        max_slots: maxSlots,
        purchase_date: pDate,
        expire_date: null,
        notes: t['Ghi chú'] || 'Imported from Excel'
      };

      try {
        const created = await TeamService.create(shopId, tObj);
        if (created) {
          if (teamCode) teamMap.set(teamCode, created.id);
          stats.teamsCount++;
        }
      } catch (e) {}
    }
  }

  // Ensure Canva product exists
  if (!productMap.has('canva pro (1 năm)')) {
    try {
      const pList = await ProductService.list(shopId);
      const exist = pList.find(p => p.name.toLowerCase().includes('canva'));
      if (!exist) {
        const createdP = await ProductService.create(shopId, {
          name: 'Canva Pro (1 năm)',
          category: 'Graphic Design',
          default_cost: 0,
          default_sell: 139000,
          price_ctv: 110000,
          price_si: 90000,
          default_duration_days: 365,
          max_slots: 49
        });
        if (createdP) productMap.set('canva pro (1 năm)', createdP.id);
      } else {
        productMap.set('canva pro (1 năm)', exist.id);
      }
    } catch (e) {}
  }

  // 4. Customers & Orders (Khach_hang sheet or DM_KHACH_HANG)
  const custSheetName = sheetNames.find(s => s === 'Khach_hang' || s === 'DM_KHACH_HANG');
  if (custSheetName) {
    if (onProgress) onProgress(`Đang nhập danh sách Khách hàng & Đơn hàng từ ${custSheetName}...`);
    const rawCust = XLSX.utils.sheet_to_json(wb.Sheets[custSheetName]);
    const validCust = rawCust.filter(c => (c.Email && String(c.Email).trim()) || (c['SĐT'] && String(c['SĐT']).trim()) || (c['Tên KH'] && String(c['Tên KH']).trim()) || c['Giá']);
    
    let count = 0;
    for (const c of validCust) {
      count++;
      if (onProgress && count % 50 === 0) {
        onProgress(`Đã nhập ${count}/${validCust.length} đơn hàng...`);
      }
      const email = String(c.Email || '').trim();
      const phone = String(c['SĐT'] || '').trim();
      let name = String(c['Tên KH'] || '').trim();
      if (!name && email) name = email.split('@')[0];
      if (!name) name = 'Khách Canva ' + (c.KH_ID || count);

      const typeStr = c['Loại KH'] === 'Sỉ' ? 'Si' : c['Loại KH'] === 'CTV' ? 'CTV' : 'Le';
      const channel = String(c['ĐẠI LÝ SỈ'] || c['Kênh'] || '').trim();

      const custPayload = {
        name,
        phone,
        email,
        type: typeStr,
        source: channel || 'Facebook Page',
        sub_channel: channel,
        notes: c['Ghi chú'] || `Mã cũ: ${c.KH_ID || ''}`
      };

      try {
        const createdCust = await CustomerService.create(shopId, custPayload);
        if (createdCust) {
          stats.customersCount++;
          const teamCode = String(c.Team_ID || '').trim();
          const mappedTeamId = teamMap.get(teamCode) || null;
          const pDate = excelDateToISO(c['Ngày mua']) || new Date().toISOString().split('T')[0];
          const expDate = excelDateToISO(c['Ngày hết hạn']);
          const sellPrice = Number(c['Giá'] || 0);

          const orderPayload = {
            customer_id: createdCust.id,
            customer_name: createdCust.name,
            phone: createdCust.phone,
            team_id: mappedTeamId,
            product_name: 'Canva Pro (1 năm)',
            infor: email,
            cost_price: 0,
            sell_price: sellPrice,
            status: 'Đã thanh toán',
            purchase_date: pDate,
            expire_date: expDate,
            duration_days: 365,
            source: channel || 'Facebook Page',
            channel: channel || 'Facebook Page'
          };

          await OrderService.create(shopId, orderPayload);
          stats.ordersCount++;
        }
      } catch (e) {}
    }
  }

  return stats;
}
