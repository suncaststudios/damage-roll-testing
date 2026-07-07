/* ══════════════ IN-GAME CHAT ══════════════ */
(function() {
    const CHAT_SIZE_KEY = 'dr_chat_size';

    function getChatEl()   { return document.getElementById('game-chat'); }
    function getToggleEl() { return document.getElementById('chat-toggle-btn'); }
    function getMsgsEl()   { return document.getElementById('chat-messages'); }
    function getInputEl()  { return document.getElementById('chat-input'); }
    function getDotEl()    { return document.getElementById('chat-unread-dot'); }

    // Restore saved size
    function restoreSize() {
        try {
            const s = JSON.parse(localStorage.getItem(CHAT_SIZE_KEY));
            if (s && s.w && s.h) {
                const el = getChatEl();
                if (el) { el.style.width = s.w + 'px'; el.style.height = s.h + 'px'; }
            }
        } catch(e) {}
    }

    // Save size to localStorage
    function saveSize(w, h) {
        try { localStorage.setItem(CHAT_SIZE_KEY, JSON.stringify({w, h})); } catch(e) {}
    }

    // Add a message line
    function addMsg(name, text, type) {
        const el = getMsgsEl();
        if (!el) return;
        const div = document.createElement('div');
        div.className = 'chat-msg chat-' + type;
        div.innerHTML = `<span class="chat-name">${escHtml(name)}:</span> <span class="chat-text">${formatMsg(text)}</span>`;
        el.appendChild(div);
        el.scrollTop = el.scrollHeight;
    }

    function escHtml(s) {
        return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
    function formatMsg(s) {
        return escHtml(s).replace(/\n/g, '<br>');
    }

    // Show/hide chat
    window.toggleChat = function(open) {
        const chat = getChatEl();
        const btn  = getToggleEl();
        const dot  = getDotEl();
        if (!chat || !btn) return;
        if (open) {
            chat.classList.add('chat-open');
            btn.style.display = 'none';
            if (dot) dot.style.display = 'none';
            restoreSize();
            const input = getInputEl();
            if (input) input.focus();
        } else {
            chat.classList.remove('chat-open');
            btn.style.display = 'flex';
        }
    };

    // Send player message
    window.sendChatMessage = function() {
        const input = getInputEl();
        if (!input) return;
        const text = input.value.replace(/\n+$/, '').trim();
        if (!text) return;
        const name = (typeof _profileData !== 'undefined' && _profileData.username) ? _profileData.username : 'You';
        addMsg(name, text, 'player');
        input.value = '';
        input.style.height = '';
        // Online: send via broadcast channel. Offline: no reply.
        if (typeof _onlineMode !== 'undefined' && _onlineMode && typeof _broadcastChannel !== 'undefined' && _broadcastChannel) {
            try {
                _broadcastChannel.send({
                    by:   typeof _onlineUid !== 'undefined' ? _onlineUid : 'player',
                    type: 'chat',
                    name: name,
                    text: text,
                    ts:   Date.now(),
                });
            } catch(e) { console.warn('[DR Chat] send failed', e); }
        }
    };

    // Show/hide the chat toggle button when game starts/ends
    window.showChatBtn = function() {
        const btn = getToggleEl();
        if (btn) btn.classList.add('chat-btn-visible');
        // Open chat by default when battle starts
        toggleChat(true);
    };
    window.hideChatBtn = function() {
        const btn  = getToggleEl();
        const chat = getChatEl();
        if (btn)  { btn.classList.remove('chat-btn-visible'); btn.style.display = 'none'; }
        if (chat) { chat.classList.remove('chat-open'); }
        // Clear messages
        const msgs = getMsgsEl();
        if (msgs) msgs.innerHTML = '';
    };

    // Enter sends, Shift+Enter inserts newline
    document.addEventListener('keydown', e => {
        const input = getInputEl();
        if (e.key === 'Enter' && document.activeElement === input) {
            if (e.shiftKey) {
                // Allow default newline insertion
                return;
            }
            e.preventDefault();
            sendChatMessage();
        }
    });

    // Drag-to-resize handle (top-left corner — drag left/up to expand)
    document.addEventListener('mousedown', e => {
        const handle = document.getElementById('chat-resize-handle');
        if (!handle || e.target !== handle) return;
        e.preventDefault();
        const chat = getChatEl();
        const startX = e.clientX, startY = e.clientY;
        const startW = chat.offsetWidth, startH = chat.offsetHeight;

        function onMove(e) {
            // Moving left increases width; moving up increases height
            const newW = Math.max(180, Math.min(480, startW - (e.clientX - startX)));
            const newH = Math.max(140, Math.min(420, startH - (e.clientY - startY)));
            chat.style.width  = newW + 'px';
            chat.style.height = newH + 'px';
        }
        function onUp() {
            saveSize(chat.offsetWidth, chat.offsetHeight);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });
})();

function applyUIScale(val) {
    const scale = parseFloat(val) / 10;
    const lbl = document.getElementById('scale-label');
    if (lbl) lbl.textContent = scale.toFixed(1) + '×';
    /* UI scale no longer applies to the game container in fullscreen mode */
    saveSettings();
}

function getDeckWL(deckId) {
    try {
        const stats = JSON.parse(localStorage.getItem('dr_deck_stats') || '{}');
        const s = stats[deckId];
        if (!s) return 'W: 0 · L: 0';
        return `W: ${s.w || 0} · L: ${s.l || 0}`;
    } catch(e) { return ''; }
}
function recordDeckResult(won) {
    try {
        const stats = JSON.parse(localStorage.getItem('dr_deck_stats') || '{}');
        if (!stats[selectedDeckId]) stats[selectedDeckId] = { w: 0, l: 0 };
        if (won) stats[selectedDeckId].w++; else stats[selectedDeckId].l++;
        localStorage.setItem('dr_deck_stats', JSON.stringify(stats));
    } catch(e) {}
}

function saveLastDeck() {
    try { localStorage.setItem('dr_last_deck', selectedDeckId); } catch(e) {}
}
function loadLastDeck() {
    try {
        const last = localStorage.getItem('dr_last_deck');
        if (last && DECKS.find(d => d.id === last)) selectedDeckId = last;
    } catch(e) {}
}

function duplicateCustomDeck(deckId) {
    playSfx('menuClick');
    const src = DECKS.find(d => d.id === deckId);
    if (!src) return;
    const newId = 'custom_' + Date.now();
    const copy = { ...src, id: newId, name: src.name + ' (Copy)', isCustom: true };
    DECKS.push(copy);
    buildDeckUI();
    saveDeckData();
}

function showEndStats(won, snap) {
    const el = document.getElementById('end-stats');
    if (!el) return;
    const dmg   = snap ? snap.dmg   : 0;
    const crits  = snap ? snap.crits  : 0;
    const turns  = snap ? snap.turns  : 0;
    const cards  = snap ? snap.cards  : 0;
    const fails  = snap ? snap.fails  : 0;
    const lowHP  = snap ? snap.lowestHP : 75;
    const deckName = (typeof DECKS !== 'undefined' && typeof selectedDeckId !== 'undefined')
        ? (DECKS.find(d => d.id === selectedDeckId)?.name || '—') : '—';
    el.innerHTML = `
        <span style="color:#ffd700">⚔ ${dmg} dmg dealt</span> &nbsp;·&nbsp;
        <span style="color:#c8a460">🎲 ${crits} crits</span> &nbsp;·&nbsp;
        <span style="color:#c87070">✗ ${fails} fails</span><br>
        <span style="color:#a07840">${turns} turns &nbsp;·&nbsp; ${cards} unique card${cards !== 1 ? 's' : ''}</span><br>
        <span style="color:#7a5a30;font-size:11px;">Lowest HP: ${Math.max(0, Math.round(lowHP))} &nbsp;·&nbsp; Deck: ${deckName}</span>`;
}

window.addEventListener('blur', () => {
    if (!opt('opt-mute-blur')) return;
    if (AC && AC.state === 'running') AC.suspend();
});
window.addEventListener('focus', () => {
    if (!opt('opt-mute-blur')) return;
    if (AC && AC.state === 'suspended') AC.resume();
});

function updateHUD() {
    // Always keep changelog hidden while battle board is active
    const _boardVisible = document.getElementById('board')?.style.display === 'block';
    if (_boardVisible) {
        const _cl = document.getElementById('changelog-panel');
        if (_cl) { _cl.style.opacity = '0'; _cl.style.visibility = 'hidden'; _cl.style.pointerEvents = 'none'; }
    }
    const MAX_HP = 75;
    const pPct = Math.max(0, state.pHP / MAX_HP * 100);
    const aPct = Math.max(0, state.aHP / MAX_HP * 100);
    const pFill = document.getElementById('p-hp-f');
    const aFill = document.getElementById('a-hp-f');
    pFill.style.width = pPct + '%'; aFill.style.width = aPct + '%';

    const pLow = pPct < 30;
    const aLow = aPct < 30;
    if (pLow && !_pWasLow) { playSfx('hpLow'); _pWasLow = true; }
    if (!pLow) _pWasLow = false;
    if (aLow && !_aWasLow) { playSfx('hpLow'); _aWasLow = true; }
    if (!aLow) _aWasLow = false;

    pFill.classList.toggle('low', pLow);
    aFill.classList.toggle('low', aLow);
    document.getElementById('p-hp-val').textContent = Math.max(0, Math.round(state.pHP));
    document.getElementById('a-hp-val').textContent = Math.max(0, Math.round(state.aHP));

    const pt = document.getElementById('p-status'); pt.innerHTML = '';
    if (state.pPet > 0)    pt.innerHTML += `<div class="badge">🐉 ${state.pPet}HP</div>`;
    if (state.pTariff > 0) pt.innerHTML += `<div class="badge">📜 ${state.pTariff}R</div>`;
    if (state.pMirror)     pt.innerHTML += `<div class="badge">🪞 Ready</div>`;
    if (state.pPoison > 0) pt.innerHTML += `<div class="badge">☠️ ${state.pPoison}R</div>`;
    if (state.pBurn > 0)   pt.innerHTML += `<div class="badge">🔥 ${state.pBurn}R</div>`;
    if (state.pRegen > 0)  pt.innerHTML += `<div class="badge">🌿 ${state.pRegen}R</div>`;
    if (state.pFreeze > 0) pt.innerHTML += `<div class="badge">❄️ ${state.pFreeze}R</div>`;
    if (state.pCurse > 0)  pt.innerHTML += `<div class="badge">🔮 Cursed</div>`;
    if (state.pShield)     pt.innerHTML += `<div class="badge">🛡️ Block</div>`;
    if (state.pGoldRerolls > 0) pt.innerHTML += `<div class="badge">💰 ${state.pGoldRerolls} Reroll${state.pGoldRerolls > 1 ? 's' : ''}</div>`;

    const at = document.getElementById('a-status'); at.innerHTML = '';
    if (state.aPet > 0)    at.innerHTML += `<div class="badge">🐉 ${state.aPet}HP</div>`;
    if (state.aTariff > 0) at.innerHTML += `<div class="badge">📜 ${state.aTariff}R</div>`;
    if (state.aMirror)     at.innerHTML += `<div class="badge">🪞 Ready</div>`;
    if (state.aPoison > 0) at.innerHTML += `<div class="badge">☠️ ${state.aPoison}R</div>`;
    if (state.aBurn > 0)   at.innerHTML += `<div class="badge">🔥 ${state.aBurn}R</div>`;
    if (state.aRegen > 0)  at.innerHTML += `<div class="badge">🌿 ${state.aRegen}R</div>`;
    if (state.aFreeze > 0) at.innerHTML += `<div class="badge">❄️ ${state.aFreeze}R</div>`;
    if (state.aCurse > 0)  at.innerHTML += `<div class="badge">🔮 Cursed</div>`;
    if (state.aShield)     at.innerHTML += `<div class="badge">🛡️ Block</div>`;
    if (state.aGoldRerolls > 0) at.innerHTML += `<div class="badge">💰 ${state.aGoldRerolls} Reroll${state.aGoldRerolls > 1 ? 's' : ''}</div>`;

    const pi = document.getElementById('p-icons'); pi.innerHTML = '';
    const ai = document.getElementById('a-icons'); ai.innerHTML = '';
    if (state.pPet > 0)    pi.innerHTML += `<span class="status-icon">🐉</span>`;
    if (state.pTariff > 0) pi.innerHTML += `<span class="status-icon">📜</span>`;
    if (state.pMirror)     pi.innerHTML += `<span class="status-icon">🪞</span>`;
    if (state.pPoison > 0) pi.innerHTML += `<span class="status-icon">☠️</span>`;
    if (state.pBurn > 0)   pi.innerHTML += `<span class="status-icon">🔥</span>`;
    if (state.pRegen > 0)  pi.innerHTML += `<span class="status-icon">🌿</span>`;
    if (state.pFreeze > 0) pi.innerHTML += `<span class="status-icon">❄️</span>`;
    if (state.pCurse > 0)  pi.innerHTML += `<span class="status-icon">🔮</span>`;
    if (state.pShield)     pi.innerHTML += `<span class="status-icon">🛡️</span>`;
    if (state.pGoldRerolls > 0) pi.innerHTML += `<span class="status-icon">💰</span>`;
    if (state.aPet > 0)    ai.innerHTML += `<span class="status-icon">🐉</span>`;
    if (state.aTariff > 0) ai.innerHTML += `<span class="status-icon">📜</span>`;
    if (state.aMirror)     ai.innerHTML += `<span class="status-icon">🪞</span>`;
    if (state.aPoison > 0) ai.innerHTML += `<span class="status-icon">☠️</span>`;
    if (state.aBurn > 0)   ai.innerHTML += `<span class="status-icon">🔥</span>`;
    if (state.aRegen > 0)  ai.innerHTML += `<span class="status-icon">🌿</span>`;
    if (state.aFreeze > 0) ai.innerHTML += `<span class="status-icon">❄️</span>`;
    if (state.aCurse > 0)  ai.innerHTML += `<span class="status-icon">🔮</span>`;
    if (state.aShield)     ai.innerHTML += `<span class="status-icon">🛡️</span>`;
    if (state.aGoldRerolls > 0) ai.innerHTML += `<span class="status-icon">💰</span>`;

    if ((state.pHP <= 0 || state.aHP <= 0) && (!_gameOverFired || _forfeited)) {
        _gameOverFired = true;
        _forfeited = false;
        closeForfeitPopup(); 
        stopBgAudio();
        showSkipBtn(false);
        const won = state.aHP <= 0;
        const endSnapshot = {
            dmg:    achStats._battleDmgDealt || 0,
            crits:  achStats._battleCrits || 0,
            turns:  achStats._battleTurns || 0,
            cards:  achStats._battleCardsUsed ? achStats._battleCardsUsed.size : 0,
            fails:  achStats._battleFails || 0,
            lowestHP: achStats._battleLowestHP,
        };
        trackGameEnd(won);
        recordDeckResult(won);
        // Update rank score + win/loss stats in Supabase (online matches only)
        if (_onlineMode) _submitMatchResult(won);
        setTimeout(() => playSfx(won ? 'victory' : 'defeat'), 200);
        setTimeout(() => {
            toggle('screen-end', true);
            showEndStats(won, endSnapshot);
            const et = document.getElementById('end-title');
            if (!won) {
                et.textContent = 'DEFEAT';
                et.style.color = '#c62828';
                et.style.textShadow = '0 0 40px rgba(200,0,0,0.8), 0 4px 0 #000';
            } else {
                et.textContent = 'VICTORY';
                et.style.color = '#ffd700';
                et.style.textShadow = '0 0 40px rgba(255,180,0,0.8), 0 4px 0 #000';
            }
        }, 600);
    }
}
