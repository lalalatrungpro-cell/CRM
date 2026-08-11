import * as XLSX from 'xlsx';
import { CustomerService, TeamService, OrderService, ProductService } from './dataService';
import { convertAllOldOrderIds } from './orderMigrator';

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

export async function parseAndImportCanvaExcel(arrayBuffer, shopId) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  
  // 1. Read Teams
  const teamSheet = wb.Sheets['Team_Canva'] || wb.Sheets[wb.SheetNames[1]] || wb.Sheets[wb.SheetNames[0]];
  const rawTeams = XLSX.utils.sheet_to_json(teamSheet);
  const validTeams = rawTeams.filter(t => t.Team_ID);

  // 2. Read Customers
  const custSheet = wb.Sheets['Khach_hang'] || wb.Sheets[wb.SheetNames[0]];
  const rawCust = XLSX.utils.sheet_to_json(custSheet);
  const validCust = rawCust.filter(c => c.KH_ID || c.Email || c['Tên KH']);

  const teamMap = {}; // T001 -> createdTeamId

  // Create Teams first
  for (const t of validTeams) {
    const teamIdStr = String(t.Team_ID || '').trim();
    const emailStr = t['Email đăng nhập'] || '';
    const name = emailStr ? `Team Canva (${emailStr})` : (t['Tên/ghi chú team']?.slice(0, 40) || `Team Canva ${teamIdStr}`);
    const infor = [emailStr, t['Mật khẩu'] || ''].filter(Boolean).join(' | ') || t['Tên/ghi chú team'] || '';
    const maxSlots = parseInt(t['Số slot tối đa'] || 49) || 49;
    const createdDate = excelDateToISO(t['Ngày tạo team']) || new Date().toISOString().split('T')[0];

    const teamPayload = {
      name,
      category: 'Canva Pro',
      type: 'Team Member',
      infor,
      max_slots: maxSlots,
      import_cost: 0,
      purchase_date: createdDate,
      expire_date: null,
      notes: t['Ghi chú'] || 'Imported from Data_cu_canva.xlsx'
    };

    try {
      const created = await TeamService.create(shopId, teamPayload);
      if (created) {
        teamMap[teamIdStr] = created.id;
      }
    } catch (err) {
      console.error('Error creating team:', err);
    }
  }

  // Ensure "Canva Pro (1 năm)" product exists
  try {
    const products = await ProductService.list(shopId);
    const existing = products.find(p => p.name.toLowerCase().includes('canva'));
    if (!existing) {
      await ProductService.create(shopId, {
        name: 'Canva Pro (1 năm)',
        category: 'Graphic Design',
        default_cost: 0,
        default_sell: 139000,
        default_duration_days: 365,
        max_slots: 49
      });
    }
  } catch (e) {}

  let importedCustCount = 0;
  let importedOrderCount = 0;

  // Create Customers + Orders
  for (const c of validCust) {
    const email = (c.Email || '').trim();
    const phone = String(c['SĐT'] || '').trim();
    let name = (c['Tên KH'] || '').trim();
    if (!name && email) name = email.split('@')[0];
    if (!name) name = 'Khách Canva ' + (c.KH_ID || '');

    const typeStr = c['Loại KH'] === 'Sỉ' ? 'Si' : c['Loại KH'] === 'CTV' ? 'CTV' : 'Le';
    const channel = (c['ĐẠI LÝ SỈ'] || c['Kênh'] || '').trim();

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
        importedCustCount++;
        const excelTeamId = String(c.Team_ID || '').trim();
        const mappedTeamId = teamMap[excelTeamId] || null;

        const purchaseDate = excelDateToISO(c['Ngày mua']) || new Date().toISOString().split('T')[0];
        const expireDate = excelDateToISO(c['Ngày hết hạn']);
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
          purchase_date: purchaseDate,
          expire_date: expireDate,
          duration_days: 365,
          source: channel || 'Facebook Page',
          channel: channel || 'Facebook Page'
        };

        await OrderService.create(shopId, orderPayload);
        importedOrderCount++;
      }
    } catch (err) {
      console.error('Error importing customer/order:', err);
    }
  }

  // Convert all old/imported order IDs to new clean YYMMDD+Seq format
  try {
    await convertAllOldOrderIds(shopId);
  } catch (e) {
    console.error('Error converting order IDs:', e);
  }

  return {
    teamsCount: Object.keys(teamMap).length,
    customersCount: importedCustCount,
    ordersCount: importedOrderCount
  };
}
