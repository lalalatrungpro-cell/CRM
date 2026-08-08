window.ui = {
    init() {
        if(document.getElementById('ui-styles')) return;
        const style = document.createElement('style');
        style.id = 'ui-styles';
        style.innerHTML = `
            /* Toast */
            #toast-container { position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; gap: 10px; pointer-events: none;}
            .ui-toast { background: #1e293b; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 16px 20px; border-radius: 12px; display: flex; align-items: center; gap: 12px; font-family: 'Outfit', sans-serif; font-size: 14px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); transform: translateX(120%); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
            .ui-toast.show { transform: translateX(0); }
            .ui-toast.success i { color: #10b981; font-size: 18px;}
            .ui-toast.error i { color: #ef4444; font-size: 18px;}
            .ui-toast.warning i { color: #f59e0b; font-size: 18px;}
            
            /* Custom Modal for Confirm/Prompt */
            .ui-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(4px); opacity: 0; transition: opacity 0.2s; }
            .ui-modal-overlay.show { opacity: 1; }
            .ui-modal { background: #0f1524; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 24px; width: 400px; color: white; transform: scale(0.9); transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow: 0 20px 40px rgba(0,0,0,0.5); font-family: 'Outfit', sans-serif;}
            .ui-modal-overlay.show .ui-modal { transform: scale(1); }
            .ui-modal-title { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
            .ui-modal-desc { font-size: 14px; color: #94a3b8; margin-bottom: 20px; line-height: 1.5; }
            .ui-modal-input { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: white; margin-bottom: 20px; font-family: 'Outfit'; font-size: 16px; outline: none;}
            .ui-modal-input:focus { border-color: #6366f1; }
            .ui-modal-actions { display: flex; justify-content: flex-end; gap: 12px; }
            .ui-btn { padding: 10px 16px; border-radius: 8px; font-weight: 500; font-size: 14px; cursor: pointer; border: none; font-family: 'Outfit'; transition: 0.2s; }
            .ui-btn-cancel { background: transparent; color: #94a3b8; }
            .ui-btn-cancel:hover { background: rgba(255,255,255,0.05); color: white; }
            .ui-btn-confirm { background: #6366f1; color: white; }
            .ui-btn-confirm.danger { background: #ef4444; }
            .ui-btn-confirm:hover { filter: brightness(1.1); }
            [data-copy] { cursor: copy; transition: 0.2s; }
            [data-copy]:hover { filter: brightness(1.2); opacity: 0.8; }
            
            /* Custom Scrollbar */
            ::-webkit-scrollbar { width: 8px; height: 8px; }
            ::-webkit-scrollbar-track { background: transparent; }
            ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 10px; }
            ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }

        `;
        document.head.appendChild(style);
        
        let container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    },

    toast(msg, type = 'success') {
        if(!document.getElementById('toast-container')) this.init();
        let t = document.createElement('div');
        t.className = `ui-toast ${type}`;
        let icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info');
        t.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${msg}</span>`;
        document.getElementById('toast-container').appendChild(t);
        t.offsetHeight;
        t.classList.add('show');
        setTimeout(() => {
            t.classList.remove('show');
            setTimeout(() => t.remove(), 300);
        }, 3000);
    },

    _createModal(title, desc, isPrompt, defaultValue, confirmText, isDanger, onConfirm) {
        if(!document.getElementById('ui-styles')) this.init();
        let overlay = document.createElement('div');
        overlay.className = 'ui-modal-overlay';
        let inputHtml = isPrompt ? `<input type="number" class="ui-modal-input" value="${defaultValue || ''}" placeholder="Nhập số..." id="uiPromptInput">` : '';
        overlay.innerHTML = `
            <div class="ui-modal">
                <div class="ui-modal-title">${title}</div>
                <div class="ui-modal-desc">${desc}</div>
                ${inputHtml}
                <div class="ui-modal-actions">
                    <button class="ui-btn ui-btn-cancel" id="uiBtnCancel">Hủy</button>
                    <button class="ui-btn ui-btn-confirm ${isDanger ? 'danger' : ''}" id="uiBtnConfirm">${confirmText}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.offsetHeight;
        overlay.classList.add('show');
        let close = () => {
            overlay.classList.remove('show');
            setTimeout(() => overlay.remove(), 200);
        };
        if(isPrompt) setTimeout(() => document.getElementById('uiPromptInput').focus(), 100);
        document.getElementById('uiBtnCancel').onclick = close;
        let confirmBtn = document.getElementById('uiBtnConfirm');
        confirmBtn.onclick = () => {
            let val = isPrompt ? document.getElementById('uiPromptInput').value : true;
            if(isPrompt && val === '') return;
            onConfirm(val);
            close();
        };
        if (isPrompt) {
            document.getElementById('uiPromptInput').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') confirmBtn.click();
            });
        }
    },

    confirm(title, desc, onConfirm, isDanger = false) {
        this._createModal(title, desc, false, null, "Xác nhận", isDanger, onConfirm);
    },

    prompt(title, desc, defaultValue, onConfirm) {
        this._createModal(title, desc, true, defaultValue, "Xác nhận", false, onConfirm);
    }
};

document.addEventListener('dblclick', function(e) {
    let target = e.target.closest('[data-copy]');
    if (target) {
        let text = target.getAttribute('data-copy');
        if(!text) return;
        navigator.clipboard.writeText(text).then(() => {
            if(window.ui && window.ui.toast) {
                window.ui.toast('Đã copy: ' + text, 'success');
            }
        }).catch(err => console.error('Copy failed', err));
        window.getSelection().removeAllRanges();
    }
});
