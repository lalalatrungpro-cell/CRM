import React, { useState } from 'react';
import { Calendar, X } from 'lucide-react';

// Safe local-timezone date formatter — avoids UTC conversion losing last day of month (UTC+7 issue)
const toLocalDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function DateFilterBar({ onFilterChange, initialPreset = 'ALL', label = 'Khoảng Thời Gian:' }) {
  const [datePreset, setDatePreset] = useState(initialPreset);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleApplyDatePreset = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    let start = '';
    let end = '';

    if (preset === 'ALL') {
      start = '';
      end = '';
    } else if (preset === 'THIS_MONTH') {
      start = toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
      end = toLocalDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    } else if (preset === 'LAST_MONTH') {
      start = toLocalDateStr(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      end = toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), 0));
    } else if (preset === 'THIS_QUARTER') {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      start = toLocalDateStr(new Date(now.getFullYear(), qMonth, 1));
      end = toLocalDateStr(new Date(now.getFullYear(), qMonth + 3, 0));
    } else if (preset === 'THIS_YEAR') {
      start = `${now.getFullYear()}-01-01`;
      end = `${now.getFullYear()}-12-31`;
    }

    setStartDate(start);
    setEndDate(end);
    if (onFilterChange) {
      onFilterChange({ startDate: start, endDate: end, preset });
    }
  };

  const handleCustomDateChange = (newStart, newEnd) => {
    setStartDate(newStart);
    setEndDate(newEnd);
    setDatePreset('CUSTOM');
    if (onFilterChange) {
      onFilterChange({ startDate: newStart, endDate: newEnd, preset: 'CUSTOM' });
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', background: 'rgba(17,21,40,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginRight: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={15} color="#818cf8" /> {label}
        </span>

        <button
          type="button"
          onClick={() => handleApplyDatePreset('ALL')}
          style={{
            padding: '5px 11px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
            background: datePreset === 'ALL' ? '#6366f1' : 'rgba(255,255,255,0.05)',
            color: datePreset === 'ALL' ? '#fff' : '#94a3b8',
            border: datePreset === 'ALL' ? '1px solid #818cf8' : '1px solid rgba(255,255,255,0.08)'
          }}
        >
          🗓️ Tất Cả
        </button>

        <button
          type="button"
          onClick={() => handleApplyDatePreset('THIS_MONTH')}
          style={{
            padding: '5px 11px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
            background: datePreset === 'THIS_MONTH' ? '#10b981' : 'rgba(255,255,255,0.05)',
            color: datePreset === 'THIS_MONTH' ? '#fff' : '#94a3b8',
            border: datePreset === 'THIS_MONTH' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.08)'
          }}
        >
          📅 Tháng Này
        </button>

        <button
          type="button"
          onClick={() => handleApplyDatePreset('LAST_MONTH')}
          style={{
            padding: '5px 11px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
            background: datePreset === 'LAST_MONTH' ? '#38bdf8' : 'rgba(255,255,255,0.05)',
            color: datePreset === 'LAST_MONTH' ? '#fff' : '#94a3b8',
            border: datePreset === 'LAST_MONTH' ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)'
          }}
        >
          ⏪ Tháng Trước
        </button>

        <button
          type="button"
          onClick={() => handleApplyDatePreset('THIS_QUARTER')}
          style={{
            padding: '5px 11px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
            background: datePreset === 'THIS_QUARTER' ? '#f59e0b' : 'rgba(255,255,255,0.05)',
            color: datePreset === 'THIS_QUARTER' ? '#fff' : '#94a3b8',
            border: datePreset === 'THIS_QUARTER' ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)'
          }}
        >
          📊 Quý Này
        </button>

        <button
          type="button"
          onClick={() => handleApplyDatePreset('THIS_YEAR')}
          style={{
            padding: '5px 11px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
            background: datePreset === 'THIS_YEAR' ? '#a855f7' : 'rgba(255,255,255,0.05)',
            color: datePreset === 'THIS_YEAR' ? '#fff' : '#94a3b8',
            border: datePreset === 'THIS_YEAR' ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.08)'
          }}
        >
          📆 Năm Nay
        </button>
      </div>

      {/* Date Pickers */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '12px', color: '#64748b' }}>Từ:</span>
        <input
          type="date"
          value={startDate}
          onChange={e => handleCustomDateChange(e.target.value, endDate)}
          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', padding: '4px 8px', color: '#fff', fontSize: '12px' }}
        />
        <span style={{ fontSize: '12px', color: '#64748b' }}>Đến:</span>
        <input
          type="date"
          value={endDate}
          onChange={e => handleCustomDateChange(startDate, e.target.value)}
          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', padding: '4px 8px', color: '#fff', fontSize: '12px' }}
        />
        {(startDate || endDate) && (
          <button
            type="button"
            onClick={() => handleApplyDatePreset('ALL')}
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Xóa bộ lọc ngày"
          >
            <X size={13} /> Xóa Lọc
          </button>
        )}
      </div>
    </div>
  );
}
