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

// 1. Teams
const teamSheet = wb.Sheets['Team_Canva'];
const rawTeams = XLSX.utils.sheet_to_json(teamSheet);
const validTeams = rawTeams.filter(t => t.Team_ID);
console.log('📊 TOTAL VALID TEAMS IN EXCEL:', validTeams.length);

// 2. Customers
const custSheet = wb.Sheets['Khach_hang'];
const rawCust = XLSX.utils.sheet_to_json(custSheet);
const validCust = rawCust.filter(c => c.KH_ID || c.Email || c['Tên KH']);
console.log('📊 TOTAL VALID CUSTOMERS IN EXCEL:', validCust.length);

console.log('\n--- SAMPLE TEAMS (FIRST 3) ---');
validTeams.slice(0, 3).forEach((t, i) => {
  console.log(`Team ${i + 1}:`, {
    team_id: t.Team_ID,
    name: t['Email đăng nhập'] ? `Team ${t['Email đăng nhập']}` : (t['Tên/ghi chú team']?.slice(0, 30) || t.Team_ID),
    email: t['Email đăng nhập'] || '',
    pass: t['Mật khẩu'] || '',
    max_slots: t['Số slot tối đa'] || 49,
    created: excelDateToISO(t['Ngày tạo team']),
    notes: t['Ghi chú'] || ''
  });
});

console.log('\n--- SAMPLE CUSTOMERS (FIRST 3) ---');
validCust.slice(0, 3).forEach((c, i) => {
  console.log(`Customer ${i + 1}:`, {
    kh_id: c.KH_ID,
    name: c['Tên KH'] || (c.Email ? c.Email.split('@')[0] : 'Khách Canva'),
    phone: String(c['SĐT'] || ''),
    email: c.Email || '',
    purchaseDate: excelDateToISO(c['Ngày mua']),
    expireDate: excelDateToISO(c['Ngày hết hạn']),
    price: Number(c['Giá'] || 0),
    team_id: c.Team_ID || '',
    type: c['Loại KH'] === 'Sỉ' ? 'Si' : c['Loại KH'] === 'CTV' ? 'CTV' : 'Le',
    channel: c['ĐẠI LÝ SỈ'] || ''
  });
});
