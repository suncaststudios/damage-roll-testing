(function () {
    if (!window.electronAPI) return;

    
    const RPC_KEY = 'dr_discord_rpc_enabled';
    let rpcEnabled = localStorage.getItem(RPC_KEY) !== 'false'; 

    
    window.setDiscordRPC = function (enabled) {
        rpcEnabled = enabled;
        localStorage.setItem(RPC_KEY, enabled ? 'true' : 'false');

        const hint = document.getElementById('discord-rpc-hint');
        if (hint) hint.textContent = enabled
            ? 'Shows your game status on Discord'
            : 'Rich Presence is disabled';

        if (enabled) {
            const screens = [
                'menu-main', 'menu-decks', 'menu-custom-deck',
                'menu-settings', 'menu-credits', 'screen-game', 'screen-end'
            ];
            const active = screens.find(id => {
                const el = document.getElementById(id);
                return el && el.style.display !== 'none';
            });
            if (active) sendPresence(active === 'screen-end' ? getEndScreen() : active);
        } else {
            window.electronAPI.updatePresence({ screen: 'clear' });
        }
    };

    function getEndScreen() {
        const et = document.getElementById('end-title');
        return (et && et.textContent.includes('VICTORY')) ? 'screen-end-victory' : 'screen-end-defeat';
    }

    function sendPresence(screenOverride) {
        if (!rpcEnabled) return; 

        const deck = (typeof DECKS !== 'undefined' && typeof selectedDeckId !== 'undefined')
            ? DECKS.find(d => d.id === selectedDeckId)
            : null;

        window.electronAPI.updatePresence({
            screen:    screenOverride,
            deckName:  deck ? deck.name : null,
            deckIcon:  deck ? deck.icon : null,
            pHP:       (typeof state !== 'undefined') ? state.pHP : null,
            aHP:       (typeof state !== 'undefined') ? state.aHP : null,
            winStreak: (typeof achStats !== 'undefined') ? achStats.winStreak : 0,
            customMsg: (typeof getRpcCustomMsg === 'function') ? getRpcCustomMsg() : null,
        });
    }

    const _originalToggle = window.toggle;
    window.toggle = function (id, show) {
        if (_originalToggle) _originalToggle.apply(this, arguments);

        
        const cl = document.getElementById('changelog-panel');
        if (cl) {
            if (id === 'menu-main' && show) {
                const enabled = document.getElementById('opt-update-log')?.checked ?? true;
                cl.style.opacity = enabled ? '1' : '0';
            } else if (id === 'screen-game' && show) {
                cl.style.opacity = '0';
            }
        }

        if (!show) return;

        const presenceMap = {
            'menu-main':        'menu-main',
            'menu-decks':       'menu-decks',
            'menu-custom-deck': 'menu-custom-deck',
            'menu-settings':    'menu-settings',
            'menu-credits':     'menu-credits',
            'screen-game':      'screen-game',
        };

        if (presenceMap[id]) {
            sendPresence(presenceMap[id]);
            return;
        }

        if (id === 'screen-end') {
            setTimeout(() => {
                sendPresence(getEndScreen());
            }, 50);
        }
    };

    const _originalUpdateHUD = window.updateHUD;
    window.updateHUD = function () {
        if (_originalUpdateHUD) _originalUpdateHUD.apply(this, arguments);
        const gameScreen = document.getElementById('screen-game');
        if (gameScreen && gameScreen.style.display !== 'none' && gameScreen.style.zIndex !== '-1') {
            sendPresence('screen-game');
        }
    };

    window.addEventListener('DOMContentLoaded', () => {
        const checkbox = document.getElementById('opt-discord-rpc');
        if (checkbox) {
            checkbox.checked = rpcEnabled;
            const hint = document.getElementById('discord-rpc-hint');
            if (hint && !rpcEnabled) hint.textContent = 'Rich Presence is disabled';
        }

        sendPresence('menu-main');
    });

})();
