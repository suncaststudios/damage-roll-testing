/* ═══════════════════════════════════════════════════════════════════════
   CONTROLLER SUPPORT  v2
   ─────────────────────────────────────────────────────────────────────
   Modes
   ─────
   • controller  – any gamepad axis / button input detected
   • mk          – any mouse / keyboard input detected (default)

   Switching is automatic with a popup notification.

   Left-stick  → drives a custom virtual mouse cursor
   RB / LB     → cycle cards during a match
   A           → play selected card / confirm
   B           → deselect / back
   X           → skip (when skip button visible)
   Y           → open settings
   D-pad       → menu focus navigation
   Start       → forfeit prompt
   LT / RT     → scroll active list

   Virtual keyboard pops up whenever a text <input> or <textarea>
   receives focus while in controller mode.
======================================================================= */

/* ─────────────────────────────────────────────────────────────────────
   STATE
───────────────────────────────────────────────────────────────────── */
const CONTROLLER = {
    connected:   false,
    index:       null,
    prevButtons: [],
    focusIndex:  0,
    cardIndex:   -1,
    pollTimer:   null,
    repeatDelay: 400,
    repeatRate:  120,
    _heldBtn:    null,
    _heldStart:  0,
    _lastRepeat: 0,
    _lastAnalog: 0,
    mode: 'mk',          // 'controller' | 'mk'
};

/* ─────────────────────────────────────────────────────────────────────
   BUTTON MAP  (standard / Xbox layout)
───────────────────────────────────────────────────────────────────── */
const BTN = {
    A:0, B:1, X:2, Y:3,
    LB:4, RB:5, LT:6, RT:7,
    SELECT:8, START:9, L3:10, R3:11,
    DUP:12, DDOWN:13, DLEFT:14, DRIGHT:15,
};

/* ─────────────────────────────────────────────────────────────────────
   MODE SWITCHING
───────────────────────────────────────────────────────────────────── */
function _setMode(mode) {
    if (CONTROLLER.mode === mode) return;
    CONTROLLER.mode = mode;
    const cursor = document.getElementById('dr-virtual-cursor');
    if (cursor) cursor.style.display = mode === 'controller' ? 'block' : 'none';
    _showModePopup(mode);
    // Hide virtual keyboard when leaving controller mode
    if (mode === 'mk') _vkbHide();
}

function _onMKInput() { _setMode('mk'); }
function _onCtrlInput() { _setMode('controller'); }

// Listen for mouse / keyboard → switch to mk
document.addEventListener('mousemove', _onMKInput, { passive: true });
document.addEventListener('keydown',   _onMKInput, { passive: true });

/* ─────────────────────────────────────────────────────────────────────
   MODE POPUP
───────────────────────────────────────────────────────────────────── */
let _modePopupTimer = null;
function _showModePopup(mode) {
    let popup = document.getElementById('dr-mode-popup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'dr-mode-popup';
        document.body.appendChild(popup);
    }
    popup.textContent = mode === 'controller' ? '🎮 Controller Mode Active' : '🖱 Mouse / Keyboard Mode Active';
    popup.classList.remove('dr-mode-popup-hide');
    popup.classList.add('dr-mode-popup-show');
    clearTimeout(_modePopupTimer);
    _modePopupTimer = setTimeout(() => {
        popup.classList.remove('dr-mode-popup-show');
        popup.classList.add('dr-mode-popup-hide');
    }, 2200);
}

/* ─────────────────────────────────────────────────────────────────────
   VIRTUAL CURSOR
───────────────────────────────────────────────────────────────────── */
let _vCursorX = window.innerWidth  / 2;
let _vCursorY = window.innerHeight / 2;
let _vCursorSpeed = 8; // px per frame at full-stick deflection

function _initVirtualCursor() {
    if (document.getElementById('dr-virtual-cursor')) return;
    const c = document.createElement('div');
    c.id = 'dr-virtual-cursor';
    document.body.appendChild(c);
    _positionCursor();
}

function _positionCursor() {
    const c = document.getElementById('dr-virtual-cursor');
    if (!c) return;
    c.style.left = _vCursorX + 'px';
    c.style.top  = _vCursorY + 'px';
}

function _moveCursor(dx, dy) {
    _vCursorX = Math.max(0, Math.min(window.innerWidth  - 1, _vCursorX + dx));
    _vCursorY = Math.max(0, Math.min(window.innerHeight - 1, _vCursorY + dy));
    _positionCursor();
}

function _cursorClick(which = 0) {
    // Fire synthetic pointer / mouse events on whatever element is under cursor
    const el = document.elementFromPoint(_vCursorX, _vCursorY);
    if (!el) return;
    const opts = { bubbles: true, cancelable: true, clientX: _vCursorX, clientY: _vCursorY };
    el.dispatchEvent(new PointerEvent('pointerdown', opts));
    el.dispatchEvent(new MouseEvent('mousedown',     opts));
    el.dispatchEvent(new PointerEvent('pointerup',   opts));
    el.dispatchEvent(new MouseEvent('mouseup',       opts));
    el.dispatchEvent(new MouseEvent('click',         opts));
    // If it's a text field and we're in controller mode, show VKB
    if (CONTROLLER.mode === 'controller' &&
        (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') &&
        !el.disabled && !el.readOnly) {
        el.focus();
        _vkbShow(el);
    }
}

/* ─────────────────────────────────────────────────────────────────────
   GAMEPAD CONNECT / DISCONNECT
───────────────────────────────────────────────────────────────────── */
window.addEventListener('gamepadconnected', e => {
    CONTROLLER.connected = true;
    CONTROLLER.index     = e.gamepad.index;
    _initVirtualCursor();
    if (!CONTROLLER.pollTimer) _startPoll();
    console.log('[DR Controller] Connected:', e.gamepad.id);
});

window.addEventListener('gamepaddisconnected', e => {
    if (e.gamepad.index !== CONTROLLER.index) return;
    CONTROLLER.connected = false;
    CONTROLLER.index     = null;
    if (CONTROLLER.pollTimer) { clearInterval(CONTROLLER.pollTimer); CONTROLLER.pollTimer = null; }
    _vkbHide();
    console.log('[DR Controller] Disconnected');
});

/* ─────────────────────────────────────────────────────────────────────
   POLL LOOP
───────────────────────────────────────────────────────────────────── */
function _startPoll() {
    CONTROLLER.pollTimer = setInterval(_pollGamepad, 16);
}

function _pollGamepad() {
    if (!CONTROLLER.connected || CONTROLLER.index === null) return;
    const gp = navigator.getGamepads?.()?.[CONTROLLER.index];
    if (!gp) return;

    const now = Date.now();
    let anyInput = false;

    /* ── Left stick → virtual cursor ── */
    const ax = gp.axes[0];
    const ay = gp.axes[1];
    const DEAD = 0.15;
    if (Math.abs(ax) > DEAD || Math.abs(ay) > DEAD) {
        anyInput = true;
        // Quadratic curve for fine control
        const sx = Math.sign(ax) * Math.pow(Math.abs(ax), 1.6);
        const sy = Math.sign(ay) * Math.pow(Math.abs(ay), 1.6);
        _moveCursor(sx * _vCursorSpeed, sy * _vCursorSpeed);
    }

    /* ── Right stick → scroll ── */
    const rax = gp.axes[2] || 0;
    const ray = gp.axes[3] || 0;
    if (Math.abs(ray) > 0.3) {
        anyInput = true;
        if (now - (CONTROLLER._lastRightStick || 0) > 60) {
            CONTROLLER._lastRightStick = now;
            const target = document.elementFromPoint(_vCursorX, _vCursorY);
            const scrollEl = _findScrollable(target);
            if (scrollEl) scrollEl.scrollTop += ray * 25;
        }
    }

    /* ── Buttons ── */
    gp.buttons.forEach((btn, i) => {
        const wasDown = CONTROLLER.prevButtons[i] || false;
        const isDown  = btn.pressed;
        if (isDown) anyInput = true;

        if (isDown && !wasDown) {
            CONTROLLER._heldBtn    = i;
            CONTROLLER._heldStart  = now;
            CONTROLLER._lastRepeat = now;
            _handleButton(i, gp);
        } else if (!isDown && wasDown && CONTROLLER._heldBtn === i) {
            CONTROLLER._heldBtn = null;
            // LT / RT – handle button-up for click release
        } else if (isDown && wasDown && CONTROLLER._heldBtn === i) {
            if (now - CONTROLLER._heldStart > CONTROLLER.repeatDelay &&
                now - CONTROLLER._lastRepeat > CONTROLLER.repeatRate) {
                CONTROLLER._lastRepeat = now;
                _handleButton(i, gp, true);
            }
        }
        CONTROLLER.prevButtons[i] = isDown;
    });

    /* ── D-pad → menu navigation (only when NOT in-game) ── */
    // (handled inside _handleButton → _handleInMenu)

    if (anyInput) _onCtrlInput();
}

function _findScrollable(el) {
    while (el && el !== document.body) {
        if (el.scrollHeight > el.clientHeight + 4) return el;
        el = el.parentElement;
    }
    return null;
}

/* ─────────────────────────────────────────────────────────────────────
   BUTTON DISPATCH
───────────────────────────────────────────────────────────────────── */
function _handleButton(btn, gp, isRepeat = false) {
    const inGame = document.getElementById('board')?.style.display !== 'none';
    if (inGame) {
        _handleInGame(btn, isRepeat);
    } else {
        _handleInMenu(btn, isRepeat);
    }
}

/* ─────────────────────────────────────────────────────────────────────
   IN-GAME CONTROLS
───────────────────────────────────────────────────────────────────── */
function _handleInGame(btn, isRepeat) {
    const handSize = typeof state !== 'undefined' ? (state.pHand?.length || 0) : 0;

    switch (btn) {
        case BTN.LB:
            // Cycle left through cards
            if (handSize > 0) {
                CONTROLLER.cardIndex = CONTROLLER.cardIndex <= 0
                    ? handSize - 1
                    : CONTROLLER.cardIndex - 1;
                _highlightCard(CONTROLLER.cardIndex);
            }
            break;

        case BTN.RB:
            // Cycle right through cards
            if (handSize > 0) {
                CONTROLLER.cardIndex = CONTROLLER.cardIndex >= handSize - 1
                    ? 0
                    : CONTROLLER.cardIndex + 1;
                _highlightCard(CONTROLLER.cardIndex);
            }
            break;

        case BTN.A:
            if (CONTROLLER.cardIndex >= 0 && CONTROLLER.cardIndex < handSize) {
                // Play the highlighted card
                if (typeof state !== 'undefined' && state.turn) {
                    typeof playerAct === 'function' && playerAct(CONTROLLER.cardIndex);
                    CONTROLLER.cardIndex = -1;
                    _clearCardHighlight();
                }
            } else {
                // No card selected — act as left-click at cursor position
                _cursorClick(0);
            }
            break;

        case BTN.B:
            CONTROLLER.cardIndex = -1;
            _clearCardHighlight();
            break;

        case BTN.X: {
            const skipBtn = document.getElementById('skip-btn');
            if (skipBtn && skipBtn.style.display !== 'none') skipBtn.click();
            break;
        }

        case BTN.START: {
            const forfeitBtn = document.getElementById('forfeit-btn');
            if (forfeitBtn) forfeitBtn.click();
            break;
        }

        case BTN.DUP:
        case BTN.LT: {
            const log = document.querySelector('.combat-log');
            if (log) log.scrollTop -= 60;
            break;
        }

        case BTN.DDOWN:
        case BTN.RT: {
            const log = document.querySelector('.combat-log');
            if (log) log.scrollTop += 60;
            break;
        }

        case BTN.DLEFT:
            if (handSize > 0) {
                CONTROLLER.cardIndex = CONTROLLER.cardIndex <= 0
                    ? handSize - 1
                    : CONTROLLER.cardIndex - 1;
                _highlightCard(CONTROLLER.cardIndex);
            }
            break;

        case BTN.DRIGHT:
            if (handSize > 0) {
                CONTROLLER.cardIndex = CONTROLLER.cardIndex >= handSize - 1
                    ? 0
                    : CONTROLLER.cardIndex + 1;
                _highlightCard(CONTROLLER.cardIndex);
            }
            break;
    }
}

/* ─────────────────────────────────────────────────────────────────────
   IN-MENU CONTROLS  (D-pad focuses elements, A clicks)
───────────────────────────────────────────────────────────────────── */
function _handleInMenu(btn, isRepeat) {
    switch (btn) {
        case BTN.A:
            // Primary click at cursor position
            _cursorClick(0);
            break;

        case BTN.B: {
            const backBtn = document.querySelector('.screen[style*="flex"] .back-btn');
            if (backBtn) backBtn.click();
            break;
        }

        case BTN.Y:
            typeof toggle === 'function' && toggle('menu-settings', true);
            break;

        case BTN.DUP: {
            const el = _dpadNavUp();
            if (el) { _setMenuFocus([el], 0); }
            break;
        }
        case BTN.DDOWN: {
            const el = _dpadNavDown();
            if (el) { _setMenuFocus([el], 0); }
            break;
        }
        case BTN.DLEFT: {
            const focusable = _getFocusable();
            CONTROLLER.focusIndex = (CONTROLLER.focusIndex - 1 + focusable.length) % focusable.length;
            _setMenuFocus(focusable);
            break;
        }
        case BTN.DRIGHT: {
            const focusable = _getFocusable();
            CONTROLLER.focusIndex = (CONTROLLER.focusIndex + 1) % focusable.length;
            _setMenuFocus(focusable);
            break;
        }

        case BTN.LT: {
            const scr = _activeScreen();
            if (scr) scr.scrollTop -= 100;
            break;
        }
        case BTN.RT: {
            const scr = _activeScreen();
            if (scr) scr.scrollTop += 100;
            break;
        }

        case BTN.LB: {
            const tabs = _activeTabs();
            const active = tabs.findIndex(t => t.classList.contains('active'));
            if (active > 0) tabs[active - 1]?.click();
            break;
        }
        case BTN.RB: {
            const tabs = _activeTabs();
            const active = tabs.findIndex(t => t.classList.contains('active'));
            if (active < tabs.length - 1) tabs[active + 1]?.click();
            break;
        }

        case BTN.START: {
            const mmain = document.getElementById('menu-main');
            if (mmain && mmain.style.display !== 'none') {
                typeof toggle === 'function' && toggle('menu-settings', true);
            }
            break;
        }
    }
}

function _activeScreen() {
    return document.querySelector('.screen[style*="flex"]');
}

function _activeTabs() {
    const scr = _activeScreen();
    if (!scr) return [];
    return [...scr.querySelectorAll('.clubs-tab, .lb-tab, .settings-tab')];
}

/* ─────────────────────────────────────────────────────────────────────
   D-PAD SPATIAL NAV  (up/down uses cursor Y to pick nearest element)
───────────────────────────────────────────────────────────────────── */
function _dpadNavUp() {
    const all = _getFocusable();
    const candidates = all.filter(el => {
        const r = el.getBoundingClientRect();
        return (r.top + r.height / 2) < _vCursorY - 5;
    });
    if (!candidates.length) return null;
    candidates.sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top);
    const el = candidates[0];
    const r = el.getBoundingClientRect();
    _vCursorY = r.top + r.height / 2;
    _vCursorX = r.left + r.width  / 2;
    _positionCursor();
    return el;
}

function _dpadNavDown() {
    const all = _getFocusable();
    const candidates = all.filter(el => {
        const r = el.getBoundingClientRect();
        return (r.top + r.height / 2) > _vCursorY + 5;
    });
    if (!candidates.length) return null;
    candidates.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    const el = candidates[0];
    const r = el.getBoundingClientRect();
    _vCursorY = r.top + r.height / 2;
    _vCursorX = r.left + r.width  / 2;
    _positionCursor();
    return el;
}

/* ─────────────────────────────────────────────────────────────────────
   CARD HIGHLIGHT
───────────────────────────────────────────────────────────────────── */
function _highlightCard(idx) {
    _clearCardHighlight();
    const cards = document.querySelectorAll('#p-hand .card');
    if (cards[idx]) {
        cards[idx].classList.add('controller-focused');
        cards[idx].scrollIntoView({ block: 'nearest', inline: 'center' });
    }
}
function _clearCardHighlight() {
    document.querySelectorAll('.controller-focused')
        .forEach(el => el.classList.remove('controller-focused'));
}

/* ─────────────────────────────────────────────────────────────────────
   FOCUSABLE ELEMENTS
───────────────────────────────────────────────────────────────────── */
function _getFocusable() {
    const screen = document.querySelector('.screen[style*="flex"], #board[style*="block"]');
    if (!screen) return [];
    return [...screen.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )].filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
    });
}

function _setMenuFocus(focusable, forceIdx) {
    document.querySelectorAll('.controller-menu-focus')
        .forEach(el => el.classList.remove('controller-menu-focus'));
    const idx = forceIdx !== undefined ? forceIdx : CONTROLLER.focusIndex;
    const el  = focusable[idx];
    if (el) {
        el.classList.add('controller-menu-focus');
        el.scrollIntoView({ block: 'nearest' });
    }
}

/* ─────────────────────────────────────────────────────────────────────
   VIRTUAL KEYBOARD
───────────────────────────────────────────────────────────────────── */
let _vkbTarget  = null;   // the input/textarea the KB is bound to
let _vkbShift   = false;
let _vkbCaps    = false;
let _vkbVisible = false;

const _VKB_ROWS = [
    ['`','1','2','3','4','5','6','7','8','9','0','-','=','⌫'],
    ['Tab','q','w','e','r','t','y','u','i','o','p','[',']','\\'],
    ['Caps','a','s','d','f','g','h','j','k','l',';',"'",'↵'],
    ['⇧','z','x','c','v','b','n','m',',','.','/','⇧'],
    ['✕','🌐','Space','◀','▶'],
];

const _VKB_SHIFT_MAP = {
    '`':'~','1':'!','2':'@','3':'#','4':'$','5':'%','6':'^','7':'&','8':'*','9':'(','0':')',
    '-':'_','=':'+','[':'{',']':'}','\\':'|',';':':','\'':'"',',':'<','.':'>','/':'?',
};

function _vkbShow(targetEl) {
    if (_vkbVisible && _vkbTarget === targetEl) return;
    _vkbTarget  = targetEl;
    _vkbVisible = true;

    let kb = document.getElementById('dr-vkb');
    if (!kb) {
        kb = document.createElement('div');
        kb.id = 'dr-vkb';
        document.body.appendChild(kb);
        _vkbBuild(kb);
    }
    kb.style.display = 'flex';
    _vkbRender();
    // Drag support
    _vkbInitDrag(kb);
}

function _vkbHide() {
    _vkbVisible = false;
    _vkbTarget  = null;
    const kb = document.getElementById('dr-vkb');
    if (kb) kb.style.display = 'none';
}

function _vkbBuild(kb) {
    // Header row (title + util buttons)
    const header = document.createElement('div');
    header.className = 'vkb-header';
    header.innerHTML = `
        <span class="vkb-title">⌨ Keyboard</span>
        <div class="vkb-utils">
            <button class="vkb-util-btn" onclick="_vkbDo('cut')"   title="Cut">✂</button>
            <button class="vkb-util-btn" onclick="_vkbDo('copy')"  title="Copy">⎘</button>
            <button class="vkb-util-btn" onclick="_vkbDo('paste')" title="Paste">📋</button>
        </div>
        <button class="vkb-hide-btn" onclick="_vkbHide()" title="Hide keyboard">▼ Hide</button>
    `;
    kb.appendChild(header);

    // Key rows
    const body = document.createElement('div');
    body.className = 'vkb-body';
    body.id = 'vkb-body';
    kb.appendChild(body);
}

function _vkbRender() {
    const body = document.getElementById('vkb-body');
    if (!body) return;
    body.innerHTML = '';

    _VKB_ROWS.forEach(row => {
        const rowEl = document.createElement('div');
        rowEl.className = 'vkb-row';

        row.forEach(key => {
            const btn = document.createElement('button');
            btn.className = 'vkb-key';

            // Display label
            let label = key;
            if (key.length === 1 && /[a-z]/.test(key)) {
                label = (_vkbShift !== _vkbCaps) ? key.toUpperCase() : key;
            } else if (_VKB_SHIFT_MAP[key] && _vkbShift) {
                label = _VKB_SHIFT_MAP[key];
            }

            // Special key classes
            if (key === 'Space')    { btn.classList.add('vkb-space'); label = ' '; }
            if (key === '⌫')       btn.classList.add('vkb-wide');
            if (key === '↵')       btn.classList.add('vkb-enter');
            if (key === '⇧')       { btn.classList.add('vkb-shift'); if (_vkbShift) btn.classList.add('vkb-active'); }
            if (key === 'Caps')     { btn.classList.add('vkb-caps');  if (_vkbCaps)  btn.classList.add('vkb-active'); }
            if (key === 'Tab')      btn.classList.add('vkb-wide');
            if (key === '✕')       btn.classList.add('vkb-fn');
            if (key === '🌐')      btn.classList.add('vkb-fn');
            if (key === '◀' || key === '▶') btn.classList.add('vkb-arrow');

            btn.textContent = label;
            btn.addEventListener('pointerdown', e => { e.preventDefault(); _vkbKey(key); });
            rowEl.appendChild(btn);
        });

        body.appendChild(rowEl);
    });
}

function _vkbKey(key) {
    if (!_vkbTarget) return;

    switch (key) {
        case '✕':   _vkbHide(); return;
        case '⇧':   _vkbShift = !_vkbShift; _vkbRender(); return;
        case 'Caps': _vkbCaps = !_vkbCaps;  _vkbRender(); return;
        case 'Tab':  _vkbInsert('\t'); break;
        case '↵':   _vkbInsert('\n'); break;
        case '⌫':   _vkbBackspace(); break;
        case 'Space': _vkbInsert(' '); break;
        case '🌐':  return; // language switch — no-op for now
        case '◀':   _vkbMoveCaret(-1); return;
        case '▶':   _vkbMoveCaret(1);  return;
        default: {
            let char = key;
            if (key.length === 1 && /[a-z]/.test(key)) {
                char = (_vkbShift !== _vkbCaps) ? key.toUpperCase() : key;
            } else if (_VKB_SHIFT_MAP[key] && _vkbShift) {
                char = _VKB_SHIFT_MAP[key];
            }
            _vkbInsert(char);
            if (_vkbShift) { _vkbShift = false; _vkbRender(); }
        }
    }
    _vkbTarget.dispatchEvent(new Event('input', { bubbles: true }));
}

function _vkbInsert(char) {
    const el = _vkbTarget;
    if (!el) return;
    const s = el.selectionStart ?? el.value.length;
    const e = el.selectionEnd   ?? el.value.length;
    el.value = el.value.slice(0, s) + char + el.value.slice(e);
    const newPos = s + char.length;
    el.setSelectionRange(newPos, newPos);
}

function _vkbBackspace() {
    const el = _vkbTarget;
    if (!el) return;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    if (s !== e) {
        el.value = el.value.slice(0, s) + el.value.slice(e);
        el.setSelectionRange(s, s);
    } else if (s > 0) {
        el.value = el.value.slice(0, s - 1) + el.value.slice(s);
        el.setSelectionRange(s - 1, s - 1);
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
}

function _vkbMoveCaret(dir) {
    const el = _vkbTarget;
    if (!el) return;
    const pos = (el.selectionStart ?? 0) + dir;
    const clamped = Math.max(0, Math.min(el.value.length, pos));
    el.setSelectionRange(clamped, clamped);
}

function _vkbDo(action) {
    const el = _vkbTarget;
    if (!el) return;
    const s = el.selectionStart ?? 0;
    const e = el.selectionEnd   ?? el.value.length;
    const selected = el.value.slice(s, e);

    if (action === 'copy' || action === 'cut') {
        if (selected && navigator.clipboard) {
            navigator.clipboard.writeText(selected).catch(() => {});
        }
        if (action === 'cut') {
            el.value = el.value.slice(0, s) + el.value.slice(e);
            el.setSelectionRange(s, s);
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }
    } else if (action === 'paste') {
        if (navigator.clipboard) {
            navigator.clipboard.readText().then(text => {
                _vkbInsert(text);
                el.dispatchEvent(new Event('input', { bubbles: true }));
            }).catch(() => {});
        }
    }
}

/* ── VKB drag to reposition ── */
function _vkbInitDrag(kb) {
    if (kb._dragInit) return;
    kb._dragInit = true;
    const header = kb.querySelector('.vkb-header');
    if (!header) return;
    let ox = 0, oy = 0, startX = 0, startY = 0, dragging = false;

    header.addEventListener('pointerdown', e => {
        if (e.target.tagName === 'BUTTON') return;
        dragging = true;
        const rect = kb.getBoundingClientRect();
        ox = rect.left; oy = rect.top;
        startX = e.clientX; startY = e.clientY;
        header.setPointerCapture(e.pointerId);
    });
    header.addEventListener('pointermove', e => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        kb.style.left   = Math.max(0, ox + dx) + 'px';
        kb.style.top    = Math.max(0, oy + dy) + 'px';
        kb.style.bottom = 'auto';
        kb.style.right  = 'auto';
    });
    header.addEventListener('pointerup', () => { dragging = false; });
}

/* ── Auto-show VKB when any input/textarea is focused while in ctrl mode ── */
document.addEventListener('focusin', e => {
    if (CONTROLLER.mode !== 'controller') return;
    const el = e.target;
    if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && !el.disabled && !el.readOnly) {
        _vkbShow(el);
    }
});
document.addEventListener('focusout', e => {
    // Small delay so VKB button clicks don't dismiss before firing
    setTimeout(() => {
        const active = document.activeElement;
        if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA' &&
                        !active.closest('#dr-vkb'))) {
            if (_vkbVisible) _vkbHide();
        }
    }, 120);
});

/* ─────────────────────────────────────────────────────────────────────
   STARTUP — detect already-connected gamepads
───────────────────────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
    const gps = navigator.getGamepads?.() || [];
    for (const gp of gps) {
        if (gp) {
            CONTROLLER.connected = true;
            CONTROLLER.index     = gp.index;
            _initVirtualCursor();
            _startPoll();
            break;
        }
    }
});

/* ─────────────────────────────────────────────────────────────────────
   CSS — injected at runtime
───────────────────────────────────────────────────────────────────── */
(function _injectControllerCSS() {
    if (document.getElementById('controller-style')) return;
    const s = document.createElement('style');
    s.id = 'controller-style';
    s.textContent = `
/* ── Virtual cursor ── */
#dr-virtual-cursor {
    position: fixed;
    width: 22px;
    height: 22px;
    pointer-events: none;
    z-index: 99999;
    transform: translate(-2px, -2px);
    display: none;
}
#dr-virtual-cursor::before {
    content: '';
    position: absolute;
    left: 0; top: 0;
    width: 0; height: 0;
    border-style: solid;
    border-width: 0 8px 20px 0;
    border-color: transparent rgba(0,0,0,0.75) transparent transparent;
    transform: rotate(0deg);
    filter: drop-shadow(0 1px 3px rgba(0,0,0,0.7));
}
#dr-virtual-cursor::after {
    content: '';
    position: absolute;
    left: 2px; top: 2px;
    width: 0; height: 0;
    border-style: solid;
    border-width: 0 6px 16px 0;
    border-color: transparent #f0e0a0 transparent transparent;
}

/* ── Mode popup ── */
#dr-mode-popup {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 99998;
    background: rgba(10,5,0,0.92);
    border: 1px solid rgba(140,95,25,0.5);
    border-radius: 999px;
    padding: 7px 20px;
    font-family: 'Cinzel', serif;
    font-size: 11px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #c8a460;
    white-space: nowrap;
    box-shadow: 0 4px 20px rgba(0,0,0,0.7);
    opacity: 0;
    transition: opacity 0.25s;
    pointer-events: none;
}
#dr-mode-popup.dr-mode-popup-show { opacity: 1; }
#dr-mode-popup.dr-mode-popup-hide { opacity: 0; }

/* ── Card / menu focus rings ── */
.controller-focused {
    outline: 3px solid rgba(200,160,40,0.9) !important;
    outline-offset: 3px;
    box-shadow: 0 0 18px rgba(200,160,40,0.4) !important;
    z-index: 10; position: relative;
}
.controller-menu-focus {
    outline: 2px solid rgba(200,160,40,0.8) !important;
    outline-offset: 2px;
    box-shadow: 0 0 12px rgba(200,160,40,0.3) !important;
}

/* ── Virtual keyboard ── */
#dr-vkb {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    z-index: 99997;
    background: rgba(10,6,2,0.97);
    border-top: 1px solid rgba(140,95,25,0.45);
    flex-direction: column;
    gap: 0;
    user-select: none;
    touch-action: none;
    box-shadow: 0 -6px 32px rgba(0,0,0,0.7);
    display: none;
}
.vkb-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 10px;
    border-bottom: 1px solid rgba(140,95,25,0.25);
    cursor: grab;
}
.vkb-header:active { cursor: grabbing; }
.vkb-title {
    font-family: 'Cinzel', serif;
    font-size: 9px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(200,160,80,0.7);
    flex: 1;
}
.vkb-utils {
    display: flex;
    gap: 4px;
}
.vkb-util-btn {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(200,160,40,0.2);
    border-radius: 4px;
    color: #c8a460;
    font-size: 14px;
    padding: 2px 7px;
    cursor: pointer;
    transition: background 0.15s;
}
.vkb-util-btn:hover { background: rgba(200,160,40,0.15); }
.vkb-hide-btn {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(200,160,40,0.25);
    border-radius: 4px;
    color: rgba(200,160,80,0.8);
    font-family: 'Cinzel', serif;
    font-size: 8px;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 3px 9px;
    cursor: pointer;
    transition: background 0.15s;
}
.vkb-hide-btn:hover { background: rgba(200,160,40,0.1); }
.vkb-body {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 5px 6px 7px;
}
.vkb-row {
    display: flex;
    gap: 3px;
    justify-content: center;
}
.vkb-key {
    background: rgba(40,28,12,0.9);
    border: 1px solid rgba(140,95,25,0.35);
    border-radius: 5px;
    color: #d4b878;
    font-family: 'Cinzel', serif;
    font-size: 11px;
    min-width: 32px;
    height: 34px;
    padding: 0 5px;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.1s, transform 0.08s;
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
}
.vkb-key:active, .vkb-key:hover {
    background: rgba(140,95,25,0.35);
    transform: translateY(-1px);
}
.vkb-key.vkb-active {
    background: rgba(200,160,40,0.3);
    border-color: rgba(200,160,40,0.7);
    color: #ffe080;
}
.vkb-key.vkb-space  { flex: 4; min-width: 120px; }
.vkb-key.vkb-wide   { min-width: 52px; }
.vkb-key.vkb-enter  { min-width: 60px; background: rgba(80,50,15,0.9); }
.vkb-key.vkb-fn     { min-width: 40px; color: rgba(200,160,80,0.6); font-size: 13px; }
.vkb-key.vkb-arrow  { min-width: 36px; }
    `;
    document.head.appendChild(s);
})();
