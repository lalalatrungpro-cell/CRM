const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const file = 'C:/Users/Admin/Downloads/Phần Mềm Quả Lý Bán Hàng/Data_cu_canva.xlsx';
const wb = XLSX.readFile(file);

// Load Supabase credentials if present in env or fallback
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xyz.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'anon-key';

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

// 1. Read Teams
const teamSheet = wb.Sheets['Team_Canva'];
const rawTeams = XLSX.utils.sheet_to_json(teamSheet);
const validTeams = rawTeams.filter(t => t.Team_ID);

// 2. Read Customers
const custSheet = wb.Sheets['Khach_hang'];
const rawCust = XLSX.utils.sheet_to_json(custSheet);
const validCust = rawCust.filter(c => c.KH_ID || c.Email || c['Tên KH']);

console.log(`🚀 Found ${validTeams.length} Teams and ${validCust.length} Customers in Data_cu_canva.xlsx`);

// Helper to get local data array
function getLocal(key) {
  try {
    return JSON.parse(localStorage?.getItem('crm_demo_' + key) || '[]');
  } catch (e) {
    return [];
  }
}

console.log('✅ Ready to import into system.');
