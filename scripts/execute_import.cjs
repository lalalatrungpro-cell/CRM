const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const file = 'C:/Users/Admin/Downloads/Phần Mềm Quả Lý Bán Hàng/Data_cu_canva.xlsx';
const wb = XLSX.readFile(file);

function excelDateToISO(val) {
  if (!val) return null;
  if (typeof val === 'number') {
    const d = new Date((val - 25569) * 86400 * 1000);
    return d.toISOString().split('T')[0];
  }
  if (typeof val === 'string') {
    val = val.trim();
    if (val.includes('-')) {
      const parts = val.split('-').map(s => s.trim());
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

const shopId = 1;

// 1. Teams
const teamSheet = wb.Sheets['Team_Canva'];
const rawTeams = XLSX.utils.sheet_to_json(teamSheet);
const validTeams = rawTeams.filter(t => t.Team_ID);

// 2. Customers
const custSheet = wb.Sheets['Khach_hang'];
const rawCust = XLSX.utils.sheet_to_json(custSheet);
const validCust = rawCust.filter(c => c.KH_ID || c.Email || c['Tên KH']);

const teamsToSave = [];
const teamMap = {};

validTeams.forEach((t, idx) => {
  const teamIdStr = String(t.Team_ID || '').trim();
  const emailStr = t['Email đăng nhập'] || '';
  const name = emailStr ? `Team Canva (${emailStr})` : (t['Tên/ghi chú team']?.slice(0, 40) || `Team Canva ${teamIdStr}`);
  const infor = [emailStr, t['Mật khẩu'] || ''].filter(Boolean).join(' | ') || t['Tên/ghi chú team'] || '';
  const maxSlots = parseInt(t['Số slot tối đa'] || 49) || 49;
  const createdDate = excelDateToISO(t['Ngày tạo team']) || '2025-06-17';

  const newTeam = {
    id: 1000 + idx + 1,
    shop_id: shopId,
    name,
    category: 'Canva Pro',
    type: 'Team Member',
    infor,
    max_slots: maxSlots,
    import_cost: 0,
    purchase_date: createdDate,
    expire_date: null,
    notes: t['Ghi chú'] || 'Imported from Data_cu_canva.xlsx',
    created_at: new Date().toISOString()
  };

  teamsToSave.push(newTeam);
  teamMap[teamIdStr] = newTeam.id;
});

const customersToSave = [];
const ordersToSave = [];

validCust.forEach((c, idx) => {
  const email = (c.Email || '').trim();
  const phone = String(c['SĐT'] || '').trim();
  let name = (c['Tên KH'] || '').trim();
  if (!name && email) name = email.split('@')[0];
  if (!name) name = 'Khách Canva ' + (c.KH_ID || '');

  const typeStr = c['Loại KH'] === 'Sỉ' ? 'Si' : c['Loại KH'] === 'CTV' ? 'CTV' : 'Le';
  const channel = (c['ĐẠI LÝ SỈ'] || c['Kênh'] || '').trim();
  const custId = 2000 + idx + 1;

  const newCust = {
    id: custId,
    shop_id: shopId,
    name,
    phone,
    email,
    type: typeStr,
    source: channel || 'Facebook Page',
    sub_channel: channel,
    debt: 0,
    notes: c['Ghi chú'] || `Mã cũ: ${c.KH_ID || ''}`,
    created_at: new Date().toISOString()
  };

  customersToSave.push(newCust);

  const excelTeamId = String(c.Team_ID || '').trim();
  const mappedTeamId = teamMap[excelTeamId] || null;

  const purchaseDate = excelDateToISO(c['Ngày mua']) || '2025-06-17';
  const expireDate = excelDateToISO(c['Ngày hết hạn']) || '2026-06-17';
  const sellPrice = Number(c['Giá'] || 0);

  const newOrder = {
    id: 5000 + idx + 1,
    shop_id: shopId,
    customer_id: custId,
    customer_name: name,
    phone,
    team_id: mappedTeamId,
    product_name: 'Canva Pro (1 năm)',
    infor: email,
    cost_price: 0,
    sell_price: sellPrice,
    status: 'Đã thanh toán',
    purchase_date: purchaseDate,
    expire_date: expireDate,
    duration_days: 365,
    source: channel || 'Facebook Page',
    channel: channel || 'Facebook Page',
    created_at: new Date().toISOString()
  };

  ordersToSave.push(newOrder);
});

console.log(`✅ Prepped ${teamsToSave.length} teams, ${customersToSave.length} customers, ${ordersToSave.length} orders.`);

// Update mini_crm_data / LocalStorage demo file if present
console.log('Done script preparation.');
