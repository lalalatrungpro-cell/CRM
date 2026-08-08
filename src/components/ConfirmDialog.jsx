import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

/**
 * ConfirmDialog - Replaces window.confirm() with a styled modal dialog
 */
export default function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, confirmLabel = 'Xác Nhận Xóa', confirmDanger = true }) {
  const cancelBtnRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    cancelBtnRef.current?.focus();
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return createPortal(
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 99990
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#1a1d2e',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '16px',
          padding: '28px',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          animation: 'toastSlideIn 0.2s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ background: 'rgba(239,68,68,0.15)', padding: '10px', borderRadius: '10px' }}>
            <AlertTriangle size={22} color="#ef4444" />
          </div>
          <h3 style={{ fontSize: '17px', fontWeight: 'bold', color: '#fff' }}>{title || 'Xác Nhận Hành Động'}</h3>
        </div>

        <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '24px', lineHeight: '1.6' }}>
          {message || 'Bạn có chắc chắn muốn thực hiện hành động này?'}
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            ref={cancelBtnRef}
            onClick={onCancel}
            style={{
              padding: '9px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '500'
            }}
          >
            Hủy Bỏ
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '9px 20px', borderRadius: '8px', border: 'none',
              background: confirmDanger ? '#ef4444' : '#6366f1',
              color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
              transition: 'opacity 0.2s'
            }}
            onMouseOver={e => e.target.style.opacity = '0.85'}
            onMouseOut={e => e.target.style.opacity = '1'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
