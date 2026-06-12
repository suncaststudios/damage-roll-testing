/* ═══════════════════════════════════════════════════════════════════════
   CONTROLLER SUPPORT
   Supports standard gamepad layout (Xbox / PS / generic USB):
     Left stick / D-pad  → navigate UI focus
     A / Cross           → confirm / select
     B / Circle          → back / cancel
     Y / Triangle        → open settings
     X / Square          → skip / action
     LB / L1             → previous tab
     RB / R1             → next tab
     Start / Options     → pause / forfeit prompt
     LT/RT               → scroll lists

   In-game card selection:
     D-pad left/right    → select card (highlights card)
     A                   → play selected card
     B                   → deselect

   Visual feedback:
     A glowing border appears on the focused element.
     A small controller icon appears in the corner when gamepad detected.
======================================================================= */

const CONTROLLER = {
    connected:    false,
    index:        null,
    prevButtons:  [],
    focusIndex:   0,
    cardIndex:    -1,   // -1 = no card selected
    pollTimer:    null,
    // Repeat delay for held buttons (ms)
    repeatDelay:  400,
    repeatRate:   120,
    _heldBtn:     null,
    _heldStart:   0,
    _lastRepeat:  0,
};

/* ── Button indices (standard mapping) ── */
const BTN = {
    A:      0,   // confirm
    B:      1,   // back
    X:      2,   // action / skip
    Y:      3,   // settings
    LB:     4,   // prev tab
    RB:     5,   // next tab
    LT:     6,   // scroll up
    RT:     7,   // scroll down
    SELECT: 8,
    START:  9,
    L3:     10,
    R3:     11,
    DUP:    12,  // d-pad up
    DDOWN:  13,
    DLEFT:  14,
    DRIGHT: 15,
};

/* ── Connect / disconnect ── */
window.addEventListener('gamepadconnected', e => {
    CONTROLLER.connected = true;
    CONTROLLER.index     = e.gamepad.index;
    _showControllerHUD(true);
    if (!CONTROLLER.pollTimer) _startPoll();
    console.log('[DR Controller] Connected:', e.gamepad.id);
});

window.addEventListener('gamepaddisconnected', e => {
    if (e.gamepad.index !== CONTROLLER.index) return;
    CONTROLLER.connected = false;
    CONTROLLER.index     = null;
    _showControllerHUD(false);
    if (CONTROLLER.pollTimer) { clearInterval(CONTROLLER.pollTimer); CONTROLLER.pollTimer = null; }
    console.log('[DR Controller] Disconnected');
});

/* ── Poll loop ── */
function _startPoll() {
    CONTROLLER.pollTimer = setInterval(_pollGamepad, 16); // ~60fps
}

function _pollGamepad() {
    if (!CONTROLLER.connected || CONTROLLER.index === null) return;
    const gp = navigator.getGamepads?.()?.[CONTROLLER.index];
    if (!gp) return;

    const now = Date.now();

    gp.buttons.forEach((btn, i) => {
        const wasDown = CONTROLLER.prevButtons[i] || false;
        const isDown  = btn.pressed;

        if (isDown && !wasDown) {
            // Fresh press
            CONTROLLER._heldBtn   = i;
            CONTROLLER._heldStart = now;
            CONTROLLER._lastRepeat= now;
            _handleButton(i, gp);
        } else if (!isDown && wasDown && CONTROLLER._heldBtn === i) {
            CONTROLLER._heldBtn = null;
        } else if (isDown && wasDown && CONTROLLER._heldBtn === i) {
            // Held — check repeat
            if (now - CONTROLLER._heldStart > CONTROLLER.repeatDelay) {
                if (now - CONTROLLER._lastRepeat > CONTROLLER.repeatRate) {
                    CONTROLLER._lastRepeat = now;
                    _handleButton(i, gp, true); // repeat flag
                }
            }
        }
        CONTROLLER.prevButtons[i] = isDown;
    });

    // Analog stick navigation (left stick)
    const ax = gp.axes[0]; // horizontal
    const ay = gp.axes[1]; // vertical
    const DEAD = 0.5;
    if (Math.abs(ax) > DEAD || Math.abs(ay) > DEAD) {
        // Throttle analog to repeat rate
        if (now - (CONTROLLER._lastAnalog || 0) > 180) {
            CONTROLLER._lastAnalog = now;
            if (ax < -DEAD)     _handleButton(BTN.DLEFT,  gp, true);
            else if (ax > DEAD) _handleButton(BTN.DRIGHT, gp, true);
            if (ay < -DEAD)     _handleButton(BTN.DUP,    gp, true);
            else if (ay > DEAD) _handleButton(BTN.DDOWN,  gp, true);
        }
    }
}

/* ── Handle a single button press ── */
function _handleButton(btn, gp, isRepeat = false) {
    const inGame    = document.getElementById('board')?.style.display !== 'none';
    const inMenu    = document.getElementById('menu-main')?.style.display !== 'none';

    if (inGame) {
        _handleInGame(btn);
    } else if (inMenu) {
        _handleInMenu(btn);
    }
}

/* ── In-game controls ── */
function _handleInGame(btn) {
    const handSize = typeof state !== 'undefined' ? (state.pHand?.length || 0) : 0;

    switch(btn) {
        case BTN.DLEFT:
        case BTN.LB:
            if (handSize > 0) {
                CONTROLLER.cardIndex = CONTROLLER.cardIndex <= 0
                    ? handSize - 1
                    : CONTROLLER.cardIndex - 1;
                _highlightCard(CONTROLLER.cardIndex);
            }
            break;
        case BTN.DRIGHT:
        case BTN.RB:
            if (handSize > 0) {
                CONTROLLER.cardIndex = CONTROLLER.cardIndex >= handSize - 1
                    ? 0
                    : CONTROLLER.cardIndex + 1;
                _highlightCard(CONTROLLER.cardIndex);
            }
            break;
        case BTN.A:
            if (CONTROLLER.cardIndex >= 0 && CONTROLLER.cardIndex < handSize) {
                if (typeof state !== 'undefined' && state.turn) {
                    typeof playerAct === 'function' && playerAct(CONTROLLER.cardIndex);
                    CONTROLLER.cardIndex = -1;
                    _clearCardHighlight();
                }
            }
            break;
        case BTN.B:
            CONTROLLER.cardIndex = -1;
            _clearCardHighlight();
            break;
        case BTN.X:
            // Skip / end turn if available
            const skipBtn = document.getElementById('skip-btn');
            if (skipBtn && skipBtn.style.display !== 'none') skipBtn.click();
            break;
        case BTN.START:
            // Open forfeit prompt
            const forfeitBtn = document.getElementById('forfeit-btn');
            if (forfeitBtn) forfeitBtn.click();
            break;
        case BTN.DUP:
            // Scroll combat log up
            const log = document.querySelector('.combat-log');
            if (log) log.scrollTop -= 60;
            break;
        case BTN.DDOWN:
            const logD = document.querySelector('.combat-log');
            if (logD) logD.scrollTop += 60;
            break;
    }
}

/* ── Highlight a card in hand ── */
function _highlightCard(idx) {
    _clearCardHighlight();
    const cards = document.querySelectorAll('#p-hand .card');
    if (cards[idx]) {
        cards[idx].classList.add('controller-focused');
        cards[idx].scrollIntoView({ block: 'nearest', inline: 'center' });
    }
}
function _clearCardHighlight() {
    document.querySelectorAll('.controller-focused').forEach(el => el.classList.remove('controller-focused'));
}

/* ── In-menu navigation ── */
function _handleInMenu(btn) {
    const focusable = _getFocusable();
    if (!focusable.length) return;

    switch(btn) {
        case BTN.DUP:
        case BTN.DLEFT:
            CONTROLLER.focusIndex = (CONTROLLER.focusIndex - 1 + focusable.length) % focusable.length;
            _setMenuFocus(focusable);
            break;
        case BTN.DDOWN:
        case BTN.DRIGHT:
            CONTROLLER.focusIndex = (CONTROLLER.focusIndex + 1) % focusable.length;
            _setMenuFocus(focusable);
            break;
        case BTN.A:
            focusable[CONTROLLER.focusIndex]?.click();
            break;
        case BTN.B: {
            // Find and click the back button of the visible screen
            const backBtn = document.querySelector('.screen[style*="flex"] .back-btn');
            if (backBtn) backBtn.click();
            break;
        }
        case BTN.Y:
            typeof toggle === 'function' && toggle('menu-settings', true);
            break;
        case BTN.LT:
            // Scroll active screen up
            const scr = document.querySelector('.screen[style*="flex"]');
            if (scr) scr.scrollTop -= 100;
            break;
        case BTN.RT:
            const scrD = document.querySelector('.screen[style*="flex"]');
            if (scrD) scrD.scrollTop += 100;
            break;
        case BTN.LB: {
            // Previous tab
            const tabs = [...document.querySelectorAll('.screen[style*="flex"] .clubs-tab, .screen[style*="flex"] .lb-tab, .screen[style*="flex"] .settings-tab')];
            const active = tabs.findIndex(t => t.classList.contains('active'));
            if (active > 0) tabs[active - 1]?.click();
            break;
        }
        case BTN.RB: {
            // Next tab
            const tabsR = [...document.querySelectorAll('.screen[style*="flex"] .clubs-tab, .screen[style*="flex"] .lb-tab, .screen[style*="flex"] .settings-tab')];
            const activeR = tabsR.findIndex(t => t.classList.contains('active'));
            if (activeR < tabsR.length - 1) tabsR[activeR + 1]?.click();
            break;
        }
    }
}

/* ── Get all focusable elements in the current visible screen ── */
function _getFocusable() {
    const screen = document.querySelector('.screen[style*="flex"], #board[style*="block"]');
    if (!screen) return [];
    return [...screen.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
    });
}

function _setMenuFocus(focusable) {
    document.querySelectorAll('.controller-menu-focus').forEach(el => el.classList.remove('controller-menu-focus'));
    const el = focusable[CONTROLLER.focusIndex];
    if (el) {
        el.classList.add('controller-menu-focus');
        el.scrollIntoView({ block: 'nearest' });
    }
}

/* ── Controller HUD indicator ── */
function _showControllerHUD(show) {
    let hud = document.getElementById('controller-hud');
    if (!hud) {
        hud = document.createElement('div');
        hud.id = 'controller-hud';
        hud.style.cssText = `
            position:fixed; bottom:16px; left:16px; z-index:9999;
            background:rgba(10,5,0,0.85); border:1px solid rgba(140,95,25,0.4);
            border-radius:999px; padding:5px 12px;
            font-family:'Cinzel',serif; font-size:8px; letter-spacing:2px;
            text-transform:uppercase; color:#c8a460;
            display:none; align-items:center; gap:6px;
            box-shadow:0 4px 16px rgba(0,0,0,0.6);
            transition:opacity 0.3s;
        `;
        hud.innerHTML = '🎮 Controller Active';
        document.body.appendChild(hud);
    }
    hud.style.display = show ? 'flex' : 'none';
}

/* ── CSS for controller focus states ── */
(function _injectControllerCSS() {
    if (document.getElementById('controller-style')) return;
    const s = document.createElement('style');
    s.id = 'controller-style';
    s.textContent = `
        .controller-focused {
            outline: 3px solid rgba(200,160,40,0.9) !important;
            outline-offset: 3px;
            box-shadow: 0 0 18px rgba(200,160,40,0.4) !important;
            z-index: 10;
            position: relative;
        }
        .controller-menu-focus {
            outline: 2px solid rgba(200,160,40,0.8) !important;
            outline-offset: 2px;
            box-shadow: 0 0 12px rgba(200,160,40,0.3) !important;
        }
    `;
    document.head.appendChild(s);
})();

/* ── Show controller hint in settings if gamepad available ── */
window.addEventListener('DOMContentLoaded', () => {
    // Check if any gamepads already connected (page reload case)
    const gps = navigator.getGamepads?.() || [];
    for (const gp of gps) {
        if (gp) {
            CONTROLLER.connected = true;
            CONTROLLER.index     = gp.index;
            _showControllerHUD(true);
            _startPoll();
            break;
        }
    }
});
