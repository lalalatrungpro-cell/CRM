import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

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

export function parseAllOldExcelData(baseDir = '.') {
  const result = {
    products: [],
    suppliers: [],
    teams: [],
    customers: [],
    orders: []
  };

  const productMap = new Map();
  const supplierMap = new Map();
  const teamMap = new Map();
  const customerMap = new Map();

  // 1. Read Quản lý bán ACC.xlsx (Products, Suppliers)
  const accFile = path.join(baseDir, 'Quản lý bán ACC.xlsx');
  if (fs.existsSync(accFile)) {
    console.log('Parsing Quản lý bán ACC.xlsx...');
    const wbAcc = XLSX.readFile(accFile);

    // Products (DM_SAN_PHAM)
    if (wbAcc.Sheets['DM_SAN_PHAM']) {
      const raw = XLSX.utils.sheet_to_json(wbAcc.Sheets['DM_SAN_PHAM'], { header: 1 });
      const rows = raw.slice(5).filter(r => r && r.length > 1 && r[1]);
      let pid = 1;
      rows.forEach(r => {
        const name = String(r[1] || '').trim();
        if (name && !productMap.has(name.toLowerCase())) {
          const cat = String(r[2] || 'Phần mềm').trim();
          const months = parseInt(r[4] || 1) || 1;
          const pObj = {
            id: pid++,
            name,
            category: cat,
            default_cost: 0,
            default_sell: 100000,
            price_ctv: 80000,
            price_si: 60000,
            default_duration_days: months * 30,
            max_slots: 1
          };
          productMap.set(name.toLowerCase(), pObj);
          result.products.push(pObj);
        }
      });
    }

    // Suppliers (DM_NCC)
    if (wbAcc.Sheets['DM_NCC']) {
      const raw = XLSX.utils.sheet_to_json(wbAcc.Sheets['DM_NCC'], { header: 1 });
      const rows = raw.slice(5).filter(r => r && r.length > 1 && r[1]);
      let sid = 1;
      rows.forEach(r => {
        const name = String(r[1] || r[0] || '').trim();
        if (name && !supplierMap.has(name.toLowerCase())) {
          const sObj = {
            id: sid++,
            name,
            phone: String(r[3] || '').trim(),
            zalo: String(r[3] || '').trim(),
            telegram: '',
            notes: String(r[4] || '').trim(),
            debt: 0
          };
          supplierMap.set(name.toLowerCase(), sObj);
          result.suppliers.push(sObj);
        }
      });
    }
  }

  // 2. Read Data_cu_canva.xlsx (Canva Teams & Customers/Orders)
  const canvaFile = path.join(baseDir, 'Data_cu_canva.xlsx');
  if (fs.existsSync(canvaFile)) {
    console.log('Parsing Data_cu_canva.xlsx...');
    const wbCanva = XLSX.readFile(canvaFile);

    // Canva Pro Product check
    if (!productMap.has('canva pro (1 năm)')) {
      const pObj = {
        id: result.products.length + 1,
        name: 'Canva Pro (1 năm)',
        category: 'Graphic Design',
        default_cost: 0,
        default_sell: 139000,
        price_ctv: 110000,
        price_si: 90000,
        default_duration_days: 365,
        max_slots: 49
      };
      productMap.set('canva pro (1 năm)', pObj);
      result.products.push(pObj);
    }

    // Teams (Team_Canva sheet)
    if (wbCanva.Sheets['Team_Canva']) {
      const teamsData = XLSX.utils.sheet_to_json(wbCanva.Sheets['Team_Canva']);
      const validTeams = teamsData.filter(t => t.Team_ID && String(t.Team_ID).trim() !== '');
      let tid = 1;
      validTeams.forEach(t => {
        const teamCode = String(t.Team_ID || '').trim();
        const email = String(t['Email đăng nhập'] || '').trim();
        const pass = String(t['Mật khẩu'] || '').trim();
        const name = email ? `Team Canva (${email})` : `Team Canva ${teamCode}`;
        
        let fullNote = String(t['Tên/ghi chú team'] || '').trim();
        let infor = [email, pass].filter(Boolean).join(' | ');
        
        // Clean infor & warranty policy split
        let warrantyPolicy = '';
        if (!infor && fullNote) {
          const parts = fullNote.split(/\r?\n/);
          infor = parts[0].trim();
          if (parts.length > 1) {
            warrantyPolicy = parts.slice(1).join('\n').trim();
          }
        } else if (fullNote) {
          warrantyPolicy = fullNote;
        }

        const maxSlots = parseInt(t['Số slot tối đa'] || 49) || 49;
        const pDate = excelDateToISO(t['Ngày tạo team']) || new Date().toISOString().split('T')[0];
        
        // Calculate 1 year expire date from purchase date
        const d = new Date(pDate);
        d.setFullYear(d.getFullYear() + 1);
        const expDate = d.toISOString().split('T')[0];

        const tObj = {
          id: tid++,
          team_code: teamCode,
          name,
          category: 'Canva Pro',
          type: 'Team Member',
          infor: infor || 'Chưa cập nhật tài khoản gốc',
          max_slots: maxSlots,
          import_cost: 1700000,
          purchase_date: pDate,
          expire_date: expDate,
          warranty_policy: warrantyPolicy || 'Bảo hành full thời hạn mua.',
          status: 'ACTIVE',
          supplier_name: 'Hoàng',
          notes: t['Ghi chú'] || 'Imported from Data_cu_canva.xlsx'
        };
        teamMap.set(teamCode, tObj);
        result.teams.push(tObj);
      });
    }

    // Customers & Orders (Khach_hang sheet)
    if (wbCanva.Sheets['Khach_hang']) {
      const custData = XLSX.utils.sheet_to_json(wbCanva.Sheets['Khach_hang']);
      const validRows = custData.filter(c => (c.Email && String(c.Email).trim() !== '') || (c['SĐT'] && String(c['SĐT']).trim() !== '') || (c['Tên KH'] && String(c['Tên KH']).trim() !== '') || (c['Giá'] !== '' && c['Giá'] !== undefined && c['Giá'] !== null));
      
      let cid = 1;
      let oid = 1;

      validRows.forEach(c => {
        const email = String(c.Email || '').trim();
        const phone = String(c['SĐT'] || '').trim();
        let name = String(c['Tên KH'] || '').trim();
        if (!name && email) name = email.split('@')[0];
        if (!name) name = 'Khách Canva ' + (c.KH_ID || cid);

        const typeStr = c['Loại KH'] === 'Sỉ' ? 'Si' : c['Loại KH'] === 'CTV' ? 'CTV' : 'Le';
        const channel = String(c['ĐẠI LÝ SỈ'] || c['Kênh'] || '').trim();
        const custKey = (phone || email || name).toLowerCase();

        let custObj = customerMap.get(custKey);
        if (!custObj) {
          custObj = {
            id: cid++,
            name,
            phone,
            email,
            type: typeStr,
            source: channel || 'Facebook Page',
            sub_channel: channel,
            notes: c['Ghi chú'] || `Mã cũ: ${c.KH_ID || ''}`,
            debt: 0
          };
          customerMap.set(custKey, custObj);
          result.customers.push(custObj);
        }

        const teamCode = String(c.Team_ID || '').trim();
        const mappedTeam = teamMap.get(teamCode);
        const pDate = excelDateToISO(c['Ngày mua']) || new Date().toISOString().split('T')[0];
        const expDate = excelDateToISO(c['Ngày hết hạn']);
        const price = Number(c['Giá'] || 0);

        let cleanStatus = 'Đã thanh toán';
        if (c['Trạng thái (AUTO)'] === 'HẾT HẠN') cleanStatus = 'Hết hạn';

        const orderObj = {
          id: oid++,
          customer_id: custObj.id,
          customer_name: custObj.name,
          phone: custObj.phone,
          team_id: mappedTeam ? mappedTeam.id : null,
          product_name: 'Canva Pro (1 năm)',
          infor: email,
          cost_price: 0,
          sell_price: price,
          status: cleanStatus,
          purchase_date: pDate,
          expire_date: expDate,
          duration_days: 365,
          source: channel || 'Facebook Page',
          channel: channel || 'Facebook Page'
        };
        result.orders.push(orderObj);
      });
    }
  }

  console.log(`Parsed Exact Summary: ${result.products.length} Products, ${result.suppliers.length} Suppliers, ${result.teams.length} Teams, ${result.customers.length} Unique Customers, ${result.orders.length} Real Orders.`);
  return result;
}

if (process.argv[1] && process.argv[1].endsWith('import_excel_data.js')) {
  const data = parseAllOldExcelData('.');
  fs.writeFileSync('scripts/parsed_demo_data.json', JSON.stringify(data, null, 2), 'utf8');
  if (fs.existsSync('public')) {
    fs.writeFileSync('public/parsed_demo_data.json', JSON.stringify(data, null, 2), 'utf8');
  }
  console.log('Saved exact clean parsed data with Warranty Policy to JSON successfully!');
}
