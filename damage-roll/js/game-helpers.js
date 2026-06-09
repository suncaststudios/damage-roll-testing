(function () {

    
    
    
    window.quitGame = function () {
        
        if (window.electronAPI && window.electronAPI.updatePresence) {
            try { window.electronAPI.updatePresence({ screen: 'clear' }); } catch(e) {}
        }
        if (window.electronAPI && window.electronAPI.quit) {
            window.electronAPI.quit();
        } else {
            window.close();
        }
    };

    
    window.addEventListener('beforeunload', function () {
        if (window.electronAPI && window.electronAPI.updatePresence) {
            try { window.electronAPI.updatePresence({ screen: 'clear' }); } catch(e) {}
        }
    });

    
    
    
    function unlockAudio() {
        if (window.AC && window.AC.state === 'suspended') {
            window.AC.resume().catch(() => {});
        }
        document.removeEventListener('click',   unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
    }
    document.addEventListener('click',   unlockAudio);
    document.addEventListener('keydown', unlockAudio);

    
    
    
    
    
    
    

    
    
    
    
    
    window._copyToClipboard = function (text, onSuccess, onFail) {
        if (window.electronAPI && window.electronAPI.copyToClipboard) {
            window.electronAPI.copyToClipboard(text);
            if (onSuccess) onSuccess();
            return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(onSuccess).catch(onFail || (() => {}));
        } else {
            
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); if (onSuccess) onSuccess(); }
            catch(e) { if (onFail) onFail(e); }
            document.body.removeChild(ta);
        }
    };

    
    window._origCopyDeckCode = window.copyDeckCode;
    window.copyDeckCode = function () {
        const str = document.getElementById('cdb-export-str')?.value;
        if (!str) { showShareMsg('Save your deck first to generate a code.', true); return; }
        window._copyToClipboard(str,
            () => showShareMsg('Code copied to clipboard!', false),
            () => showShareMsg('Select the code and copy manually.', true)
        );
    };

    
    
    document.addEventListener('dragover',  e => e.preventDefault());
    document.addEventListener('drop',      e => {
        if (!e.target.closest('#mod-drop-zone')) e.preventDefault();
    });

    
    
    document.addEventListener('contextmenu', e => e.preventDefault());

    
    
    document.querySelectorAll('#embers, #rune-grid, #menu-bg, #menu-frame, .corner-rune, .candle-glow').forEach(el => {
        el.style.pointerEvents = 'none';
    });

})();
