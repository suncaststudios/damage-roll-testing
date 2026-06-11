
(function() {
    const MOD_KEY = 'dr_saved_mods';

    
    window.addEventListener('DOMContentLoaded', function() {
        try {
            const saved = localStorage.getItem(MOD_KEY);
            if (saved) {
                const mods = JSON.parse(saved);
                mods.forEach(rawMod => {
                    if (!_loadedMods.find(m => m.name === rawMod.name)) {
                        const mod = typeof _sanitizeMod === 'function' ? _sanitizeMod(rawMod) : rawMod;
                        _loadedMods.push(mod);
                        applyMod(mod);
                    }
                });
                if (mods.length > 0) renderModList();
            }
        } catch(e) { console.log('[Mods] Failed to restore saved mods:', e); }
    });

    
    const _origLoadModFile = window.loadModFile;
    window.loadModFile = function(file) {
        _origLoadModFile.apply(this, arguments);
        
    };

    
    const _origApplyMod = window.applyMod;
    window.applyMod = function(mod) {
        if (_origApplyMod) _origApplyMod.apply(this, arguments);
        try { localStorage.setItem(MOD_KEY, JSON.stringify(_loadedMods)); } catch(e) {}
    };

    
    const _origUnloadMod = window.unloadMod;
    window.unloadMod = function(name) {
        if (_origUnloadMod) _origUnloadMod.apply(this, arguments);
        try { localStorage.setItem(MOD_KEY, JSON.stringify(_loadedMods)); } catch(e) {}
    };

})();
