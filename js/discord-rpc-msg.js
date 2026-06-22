(function () {
    const RPC_MSG_KEY = 'dr_rpc_custom_msg';

    function cleanRpcMsg(raw) {
        if (!raw || !raw.trim()) return '';
        if (typeof LeoProfanity !== 'undefined') {
            return LeoProfanity.clean(raw.trim());
        }
        return raw.trim();
    }

    window.previewRpcMsg = function (raw) {
        const preview = document.getElementById('rpc-msg-preview');
        if (!preview) return;
        const cleaned = cleanRpcMsg(raw);
        if (!cleaned) { preview.textContent = ''; return; }
        const wasCleaned = cleaned !== raw.trim();
        preview.textContent = '→ ' + cleaned + (wasCleaned ? '  (profanity filtered)' : '');
        preview.style.color = wasCleaned ? '#b87040' : '#6b8a3a';
    };

    window.getRpcCustomMsg = function () {
        return cleanRpcMsg(localStorage.getItem(RPC_MSG_KEY) || '');
    };

    const _origApply = window.applyAndReloadSettings;
    window.applyAndReloadSettings = function () {
        const input = document.getElementById('opt-rpc-custom-msg');
        if (input) {
            const cleaned = cleanRpcMsg(input.value);
            input.value = cleaned;
            try { localStorage.setItem(RPC_MSG_KEY, cleaned); } catch(e) {}
        }
        if (_origApply) _origApply.apply(this, arguments);
    };

    window.addEventListener('DOMContentLoaded', () => {
        const saved = localStorage.getItem(RPC_MSG_KEY) || '';
        const input = document.getElementById('opt-rpc-custom-msg');
        if (input && saved) {
            input.value = saved;
            window.previewRpcMsg(saved);
        }
    });
})();
