/* ═══════════════════ SETTINGS TAB SWITCHER ═══════════════════ */
function switchSettingsTab(id) {
    document.querySelectorAll('.settings-tab').forEach(t =>
        t.classList.toggle('active', t.getAttribute('onclick').includes("'" + id + "'")));
    document.querySelectorAll('.settings-tab-panel').forEach(p =>
        p.classList.toggle('active', p.id === 'stab-' + id));
    playSfx('menuClick');
}

/* ── Skip intro preference ── */
function _applySkipIntroSetting() {
    const skip = document.getElementById('opt-skip-intro');
    if (skip && skip.checked) {
        try { localStorage.setItem('dr_intro_done','1'); } catch(e) {}
    } else {
        try { localStorage.removeItem('dr_intro_done'); } catch(e) {}
    }
}
(function() {
    if (localStorage.getItem('dr_intro_done') === '1') {
        // Skip the intro overlay immediately
        const introEl = document.getElementById('intro-overlay');
        if (introEl) introEl.style.display = 'none';
        const mainMenu = document.getElementById('menu-main');
        if (mainMenu) {
            mainMenu.style.display = 'flex';
            requestAnimationFrame(() => {
                mainMenu.classList.add('screen-visible-main');
            });
        }
    }
    document.addEventListener('DOMContentLoaded', () => {
        const cb = document.getElementById('opt-skip-intro');
        if (cb) cb.checked = (localStorage.getItem('dr_intro_done') === '1');
    });
})();

async function initGame() {
    
    const clPanel = document.getElementById('changelog-panel');
    if (clPanel) { clPanel.style.opacity = '0'; clPanel.style.pointerEvents = 'none'; clPanel.style.visibility = 'hidden'; }

    if (_customAudioEl) { _customAudioEl.pause(); }
    if (_menuMusicNodes) {
        const ac2 = getAC();
        const nodes = _menuMusicNodes;
        _menuMusicNodes = null; 
        nodes.master.gain.linearRampToValueAtTime(0, ac2.currentTime + 1.2);
        nodes.intervals.forEach(t => clearTimeout(t));
        setTimeout(() => {
            nodes.oscs.forEach(o => { try { o.stop(); } catch(e){} });
            if (!_musicNodes) { try { startBgAudio(); } catch(e) {} } 
        }, 1200);
    } else {
        if (!_musicNodes) { try { startBgAudio(); } catch(e) {} }
    }
    toggle('menu-main', false);
    toggle('menu-start', false);
    document.getElementById('board').style.display = 'block';
    document.getElementById('mute-btn').classList.add('visible');
    document.getElementById('forfeit-btn').classList.add('visible');
    // Only show chat toggle in online/lobby modes
    if (_onlineMode) {
        if (typeof showChatBtn === 'function') showChatBtn();
    } else {
        if (typeof window.hideChatBtn === 'function') window.hideChatBtn();
        // Also force-close the chat panel if it was open
        const gameChat = document.getElementById('game-chat');
        if (gameChat) gameChat.classList.remove('chat-open');
    }

    state = { pHP: 75, aHP: 75, pHand: [], turn: true,
              pPet: 0, aPet: 0, pTariff: 0, aTariff: 0,
              pMirror: false, aMirror: false, pPoison: 0, aPoison: 0, pPoisonDmg: 3, aPoisonDmg: 3,
              pRegen: 0, aRegen: 0, pRegenAmt: 3, aRegenAmt: 3,
              pBurn: 0, aBurn: 0, pBurnDmg: 3, aBurnDmg: 3,
              pFreeze: 0, aFreeze: 0, pCurse: 0, aCurse: 0,
              pShield: false, aShield: false, pGoldRerolls: 0, aGoldRerolls: 0 };
    resetBattleStats();
    _gameOverFired = false;
    _forfeited = false;
    _pWasLow = false;
    _aWasLow = false;
    for (let i = 0; i < 5; i++) state.pHand.push(drawCard(i === 4));
    render();
}

function returnToMenu() {
    // Online: clean up room and listeners when leaving
    if (typeof _onlineMode !== 'undefined' && _onlineMode) _cleanupOnline();
    if (_customAudioEl) { _customAudioEl.pause(); }
    if (_musicNodes) {
        const ac2 = getAC();
        const nodes = _musicNodes;
        _musicNodes = null; 
        nodes.master.gain.linearRampToValueAtTime(0, ac2.currentTime + 1.2);
        nodes.intervals.forEach(t => clearTimeout(t));
        setTimeout(() => {
            nodes.oscs.forEach(o => { try { o.stop(); } catch(e){} });
            if (!_menuMusicNodes) { try { startMenuAudio(); } catch(e) {} }
        }, 1200);
    } else {
        if (!_menuMusicNodes) { try { startMenuAudio(); } catch(e) {} }
    }
    toggle('screen-end', false);
    document.getElementById('board').style.display = 'none';
    document.getElementById('mute-btn').classList.remove('visible');
    document.getElementById('forfeit-btn').classList.remove('visible');
    if (typeof hideChatBtn === 'function') hideChatBtn();
    toggle('menu-main', true);
    // Trigger main menu entrance animation
    requestAnimationFrame(() => {
        const mm = document.getElementById('menu-main');
        if (mm) {
            mm.classList.remove('screen-visible-main');
            void mm.offsetWidth;
            mm.classList.add('screen-visible-main');
        }
    });
    
    applyGraphicsQuality(_graphicsQuality);
    applyCardDark(_cardDark);
    applyRarityGlow();
    applyHighContrast();
    
    const _clPanel = document.getElementById('changelog-panel');
    if (_clPanel) {
        const _clEnabled = document.getElementById('opt-update-log')?.checked ?? true;
        _clPanel.style.visibility = '';
        _clPanel.style.pointerEvents = '';
        _clPanel.style.opacity = _clEnabled ? '1' : '0';
    }
}

function rematch() {
    closeForfeitPopup(); 
    toggle('screen-end', false);

    stopBgAudio();
    if (_customAudioEl) { _customAudioEl.pause(); _customAudioEl.src = ''; _customAudioEl = null; }
    _musicNodes = null; 
    setTimeout(() => { try { startBgAudio(); } catch(e) {} }, 350);

    state = { pHP: 75, aHP: 75, pHand: [], turn: true,
              pPet: 0, aPet: 0, pTariff: 0, aTariff: 0,
              pMirror: false, aMirror: false, pPoison: 0, aPoison: 0, pPoisonDmg: 3, aPoisonDmg: 3,
              pRegen: 0, aRegen: 0, pRegenAmt: 3, aRegenAmt: 3,
              pBurn: 0, aBurn: 0, pBurnDmg: 3, aBurnDmg: 3,
              pFreeze: 0, aFreeze: 0, pCurse: 0, aCurse: 0,
              pShield: false, aShield: false, pGoldRerolls: 0, aGoldRerolls: 0 };
    resetBattleStats();
    _gameOverFired = false;
    _forfeited = false;
    if (_aiActTimer) { clearTimeout(_aiActTimer); _aiActTimer = null; }
    _pWasLow = false;
    _aWasLow = false;
    _forcedRoll = 0;

    const db = document.getElementById('die-box');
    if (db) { db.style.display = 'none'; db.classList.remove('show'); }
    document.getElementById('die-3d').classList.remove('crit', 'fail', 'settling');
    _dieSpinning = false;

    document.getElementById('game-container').querySelectorAll('.vfx, .crit-popup, .fail-popup, .dmg-number, .heal-number, .impact-ring, .particle, .crit-ring').forEach(el => el.remove());

    for (let i = 0; i < 5; i++) state.pHand.push(drawCard(i === 4));
    render();
    updateHUD();
}

function forfeit() {
    if (_gameOverFired) return;
    if (opt('opt-skip-forfeit')) { confirmForfeit(); return; }
    const popup = document.getElementById('forfeit-popup');
    if (popup) popup.classList.add('open');
}

function closeForfeitPopup() {
    const popup = document.getElementById('forfeit-popup');
    if (popup) popup.classList.remove('open');
}

function confirmForfeit() {
    closeForfeitPopup();
    if (_gameOverFired) return;
    _forfeited     = true;
    _gameOverFired = true;
    if (_aiActTimer) { clearTimeout(_aiActTimer); _aiActTimer = null; }
    // Stop the die spin immediately — playerAct may be mid-await
    _dieSpinning = false;
    const db = document.getElementById('die-box');
    if (db) { db.classList.remove('show'); setTimeout(() => { db.style.display = 'none'; }, 200); }
    const d3 = document.getElementById('die-3d');
    if (d3) d3.classList.remove('crit','fail','settling');

    state.pHP = -100;
    checkAchs({});
    stopBgAudio();
    showSkipBtn(false);
    const endSnapshot = {
        dmg:   achStats._battleDmgDealt || 0,
        crits: achStats._battleCrits || 0,
        turns: achStats._battleTurns || 0,
        cards: achStats._battleCardsUsed ? achStats._battleCardsUsed.size : 0,
        fails: achStats._battleFails || 0,
        lowestHP: achStats._battleLowestHP,
    };
    if (typeof trackGameEnd === 'function') trackGameEnd(false);
    if (typeof recordDeckResult === 'function') recordDeckResult(false);
    if (typeof _onlineMode !== 'undefined' && _onlineMode && typeof _submitMatchResult === 'function') _submitMatchResult(false);
    // XP penalty for forfeiting
    if (typeof _xpOnForfeit === 'function') {
        const isPrivate = typeof _privateMatch !== 'undefined' && _privateMatch;
        _xpOnForfeit(typeof _onlineMode !== 'undefined' && _onlineMode, isPrivate);
    }
    setTimeout(() => playSfx('defeat'), 200);
    setTimeout(() => {
        // Hide board BEFORE showing end screen so it never bleeds through
        const boardEl = document.getElementById('board');
        if (boardEl) boardEl.style.display = 'none';
        toggle('screen-end', true);
        if (typeof showEndStats === 'function') showEndStats(false, endSnapshot);
        const et = document.getElementById('end-title');
        if (et) {
            et.textContent = 'DEFEAT';
            et.style.color = '#c62828';
            et.style.textShadow = '0 0 40px rgba(200,0,0,0.8), 0 4px 0 #000';
        }
    }, 350);
}

function drawCard(forceAttack) {
    const deck = getActiveDeck();
    const cardKeys = deck.cards;
    let weights = [...deck.weights]; 

    
    
    const berserkerNerf = document.getElementById('opt-berserker-nerf')?.checked ?? false;
    if (berserkerNerf && deck.id === 'berserker') {
        const origWeights = [...weights];
        weights = origWeights.map((w, i) => {
            const prev = i === 0 ? 0 : origWeights[i-1];
            const span = w - prev;
            return prev + span * (i < 3 ? 1.35 : 0.75);
        });
        
        const last = weights[weights.length - 1];
        weights = weights.map(w => Math.min(w / last, 1.0));
    }

    const hasOffensive = state.pHand.some(c => [0,8,10,13,15,21,23,25,26,27,31].includes(c.id));
    if (forceAttack && !hasOffensive) {
        const aggro = cardKeys.find(k => [0,8,10,13,15,21,23,25,26,27,31].includes(ALL_CARDS[k].id));
        if (aggro) return ALL_CARDS[aggro];
    }
    
    
    if (weights.length > 0 && weights[weights.length - 1] !== 1.0) {
        const last = weights[weights.length - 1];
        if (last > 0) weights = weights.map(w => w / last);
        weights[weights.length - 1] = 1.0; 
    }
    const r = Math.random();
    for (let i = 0; i < weights.length; i++) {
        if (r < weights[i]) return ALL_CARDS[cardKeys[i]];
    }
    
    return ALL_CARDS[cardKeys[cardKeys.length - 1] ?? cardKeys[0]];
}

function render() {
    const ph = document.getElementById('p-hand');
    ph.innerHTML = '';
    if (state.turn) playSfx('turnStart');
    state.pHand.forEach((c, i) => {
        const el = document.createElement('div');
        el.className = 'card card-deal' + (i === 4 ? ' card-deal-fifth' : '');
        el.dataset.rarity = c.rarity;
        el.style.animationDelay = `${i === 4 ? i * 0.09 + 0.04 : i * 0.07}s`;
        setTimeout(() => playSfx('cardDeal'), i * 60);
        el.innerHTML = `
            <div class="c-name">${c.n}</div>
            <div class="c-icon">${c.i}</div>
            <div class="c-desc">${c.d}</div>`;
        el.onclick = () => { if (state.turn) playerAct(i); };
        el.addEventListener('mouseenter', () => { el.classList.add('hovered'); playSfx('cardHover'); });
        el.addEventListener('mousemove', e => {
          const r2 = el.getBoundingClientRect();
          const cx = r2.left + r2.width/2, cy = r2.top + r2.height/2;
          const rx = (e.clientY - cy) / 10, ry = (cx - e.clientX) / 10;
          el.style.transform = `translateY(-38px) scale(1.07) rotateX(${rx+6}deg) rotateY(${ry}deg)`;
        });
        el.addEventListener('mouseleave', () => {
            el.classList.remove('hovered');
            el.style.transform = '';
        });
        el.addEventListener('animationend', () => {
            el.classList.remove('card-deal');
            el.style.animation = '';
        }, { once: true });
        ph.appendChild(el);
    });

    const ah = document.getElementById('a-hand');
    ah.innerHTML = '';
    for (let i = 0; i < 5; i++) ah.innerHTML += `<div class="ai-back"></div>`;

    document.getElementById('turn-indicator').textContent = state.turn ? 'Your Turn' : "Opponent's Turn";
    updateHUD();
}

async function shake(intensity = 12) {
    if (!opt('opt-shake') || opt('opt-reduced')) return;
    const c = document.getElementById('game-container');
    for (let i = 0; i < 12; i++) {
        const s = intensity * (1 - i / 12);
        c.style.setProperty('--shakeX', (Math.random() * s * 2 - s) + 'px');
        c.style.setProperty('--shakeY', (Math.random() * s * 2 - s) + 'px');
        await delay(22);
    }
    c.style.setProperty('--shakeX', '0px');
    c.style.setProperty('--shakeY', '0px');
}

async function flashScreen(color = 'white', dur = 80) {
    if (!opt('opt-shake') || opt('opt-reduced')) return;
    const f = document.getElementById('flash-overlay');
    f.style.background = color;
    f.style.opacity = '0.55';
    await delay(dur);
    f.style.opacity = '0';
}

async function chromaImpact() {
    if (!opt('opt-shake') || opt('opt-reduced')) return;
    const gc = document.getElementById('game-container');
    gc.classList.add('chroma-impact');
    await delay(250);
    gc.classList.remove('chroma-impact');
}

function spawnCritRing() {
    const board = document.getElementById('board');
    if (!board) return;
    const r = document.createElement('div');
    r.className = 'crit-ring';
    board.appendChild(r);
    setTimeout(() => r.remove(), 700);
}

function spawnParticles(x, y, count, colors, spread = 80) {
    if (!opt('opt-particles') || opt('opt-reduced')) return;
    if (_graphicsQuality === 'low')  count = Math.floor(count * 0.4);
    if (_graphicsQuality === 'high') count = Math.floor(count * 1.6);
    if (count < 1) return;
    const board = document.getElementById('board');
    if (!board) return;
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const angle = (Math.random() * 360) * Math.PI / 180;
        const dist  = Math.random() * spread + 20;
        const size  = Math.random() * 8 + 3;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const dur   = Math.random() * 400 + 300;
        p.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${color};box-shadow:0 0 ${size}px ${color};transition:transform ${dur}ms cubic-bezier(0.2,1,0.4,1),opacity ${dur}ms ease;`;
        board.appendChild(p);
        requestAnimationFrame(() => {
            p.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px) scale(0.2)`;
            p.style.opacity = '0';
        });
        setTimeout(() => p.remove(), dur + 100);
    }
}

function spawnImpactRing(x, y, color = '#ffd700') {
    if (!opt('opt-particles') || opt('opt-reduced')) return;
    const board = document.getElementById('board');
    if (!board) return;
    const r = document.createElement('div');
    r.className = 'impact-ring';
    r.style.cssText = `left:${x}px;top:${y}px;width:60px;height:60px;border:3px solid ${color};box-shadow:0 0 20px ${color};`;
    board.appendChild(r);
    setTimeout(() => r.remove(), 600);
}

function showCritPopup(chainCount) {
    if (!opt('opt-critpop') || opt('opt-reduced')) return;
    const board = document.getElementById('board');
    if (!board) return;
    const el = document.createElement('div');
    el.className = 'crit-popup';
    el.innerHTML = `CRIT!${chainCount > 1 ? `<span class="chain-tag">CHAIN ×${chainCount}</span>` : ''}`;
    board.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

function showFailPopup() {
    if (!opt('opt-critpop') || opt('opt-reduced')) return;
    const board = document.getElementById('board');
    if (!board) return;
    const el = document.createElement('div');
    el.className = 'fail-popup';
    el.textContent = 'FAIL!';
    board.appendChild(el);
    setTimeout(() => el.remove(), 900);
}

function showNumber(value, isHeal, toP, isCrit = false) {
    if (_forfeited) { _dieSpinning = false; hideDie(); return; }
    const board = document.getElementById('board');
    if (!board) return;
    const el = document.createElement('div');
    let cls = isHeal ? 'heal-number' : 'dmg-number';
    if (isCrit && !isHeal) cls += ' crit';
    else if (!isHeal && value > 15) cls += ' big';
    el.className = cls;
    el.textContent = (isHeal ? '+' : '-') + Math.round(value);
    // Centre horizontally; offset slightly toward the affected player's HUD
    el.style.left = toP ? '38%' : '62%';
    el.style.top  = toP ? '62%' : '28%';
    board.appendChild(el);
    setTimeout(() => el.remove(), 1100);
}

let _dieSpinning = false;
let _dieRx = 0, _dieRy = 0, _dieRz = 0;
let _dieVx = 4.2, _dieVy = 5.7, _dieVz = 2.1;
let _forcedRoll = 0; 

function _spinLoop() {
    if (!_dieSpinning) return;
    _dieRx += _dieVx;
    _dieRy += _dieVy;
    _dieRz += _dieVz;
    const d3 = document.getElementById('die-3d');
    if (d3) d3.style.transform = `rotateX(${_dieRx}deg) rotateY(${_dieRy}deg) rotateZ(${_dieRz}deg)`;
    requestAnimationFrame(_spinLoop);
}

const FACE_RESTING = {
    1: 'rotateX(0deg) rotateY(0deg)',
    2: 'rotateX(-90deg) rotateY(0deg)',
    3: 'rotateX(0deg) rotateY(-90deg)',
    4: 'rotateX(0deg) rotateY(90deg)',
    5: 'rotateX(90deg) rotateY(0deg)',
    6: 'rotateX(0deg) rotateY(180deg)',
};

async function rollDie3D(isPlayerRolling = true) {
    // Guard: if game is already over (forfeit mid-roll), abort cleanly
    if (_gameOverFired && !_dieSpinning) return 1;
    const db  = document.getElementById('die-box');
    const d3  = document.getElementById('die-3d');
    const lbl = document.getElementById('die-result-label');

    // Reset any previous stuck state
    _dieSpinning = false;
    db.style.display = 'block';
    db.classList.add('show');
    d3.classList.remove('crit', 'fail', 'settling');
    lbl.classList.remove('show');
    lbl.textContent = '';

    _dieVx = 3.5 + Math.random() * 3;
    _dieVy = 4.5 + Math.random() * 4;
    _dieVz = 1.5 + Math.random() * 2;
    _dieSpinning = true;
    _spinLoop();

    playSfx('dice');
    await delay(900);

    _dieSpinning = false;
    let roll;
    if (_forcedRoll > 0) {
        roll = _forcedRoll;
        _forcedRoll = 0;
    } else {
        roll = Math.floor(Math.random() * 6) + 1;
        if (!isPlayerRolling && roll === 6) {
            const penalty = _difficulty === 'easy' ? 0.70 : _difficulty === 'hard' ? 0 : 0.45;
            if (Math.random() < penalty) roll = 5;
        }
        if (!isPlayerRolling && roll === 1 && _difficulty === 'hard' && Math.random() < 0.5) roll = Math.floor(Math.random() * 5) + 2;
        if (isPlayerRolling && state.pGoldRerolls > 0) {
            let rerolls = state.pGoldRerolls;
            state.pGoldRerolls = 0;
            for (let r = 0; r < rerolls; r++) {
                const alt = Math.floor(Math.random() * 6) + 1;
                if (alt > roll) roll = alt;
            }
            if (roll === 6) checkAchs({ goldCritReroll: true });
        } else if (!isPlayerRolling && state.aGoldRerolls > 0) {
            let rerolls = state.aGoldRerolls;
            state.aGoldRerolls = 0;
            for (let r = 0; r < rerolls; r++) {
                const alt = Math.floor(Math.random() * 6) + 1;
                if (alt > roll) roll = alt;
            }
        }
    }
    d3.classList.add('settling');
    d3.style.transform = FACE_RESTING[roll];
    playSfx('dieLand');

    const db2 = document.getElementById('die-box');
    const boardEl2 = document.getElementById('board');
    const dbR = db2.getBoundingClientRect();
    const boardR = boardEl2.getBoundingClientRect();
    const dieCX = dbR.left - boardR.left + dbR.width  / 2;
    const dieCY = dbR.top  - boardR.top  + dbR.height / 2;
    spawnImpactRing(dieCX, dieCY, '#c8a040');
    await Promise.all([shake(5), flashScreen('rgba(200,160,40,0.18)', 50)]);

    await delay(280);

    return roll;
}

async function showDieResult(roll, isCrit, isFail) {
    const d3  = document.getElementById('die-3d');
    const lbl = document.getElementById('die-result-label');

    if (isCrit) {
        d3.classList.add('crit');
        lbl.textContent = '✦ CRIT ✦';
        lbl.style.color = '#ffd700';
    } else if (isFail) {
        d3.classList.add('fail');
        lbl.textContent = '✗ FAIL ✗';
        lbl.style.color = '#ff4040';
    } else {
        lbl.textContent = 'Rolled ' + roll;
        lbl.style.color = 'rgba(200,160,60,0.8)';
    }
    lbl.classList.add('show');

    await delay(isCrit || isFail ? 500 : 350);
}

async function hideDie() {
    const db  = document.getElementById('die-box');
    const lbl = document.getElementById('die-result-label');
    lbl.classList.remove('show');
    db.classList.remove('show');
    await delay(200);
    db.style.display = 'none';
    document.getElementById('die-3d').classList.remove('crit','fail');
}

async function playerAct(i) {
    if (!state.turn) return;
    // Online: broadcast our move to opponent before resolving
    if (typeof _onlineMode !== 'undefined' && _onlineMode) await _broadcastMove(i);
    
    state.pGoldRerolls = 0;
    showSkipBtn(false);
    if (state.pFreeze > 0) {
        state.pFreeze--;
        logCombat(`❄️ You are frozen — turn skipped!`);
        playSfx('poisonTick');
        const ti = document.getElementById('turn-indicator');
        if (ti) { ti.textContent = '❄️ Frozen!'; ti.style.color = '#64b5f6'; }
        await delay(900);
        if (ti) { ti.style.color = ''; }
        state.turn = false;
        render();
        updateHUD();
        _aiActTimer = setTimeout(aiAct, 800);
        return;
    }
    state.turn = false;
    let c = state.pHand.splice(i, 1)[0];
    logCombat(`You played ${c.i} ${c.n}`);
    render();
    if (state.pCurse > 0) {
        state.pCurse--;
        _forcedRoll = 1;
    }
    await resolve(c, true);
    if (state.aTariff > 0) state.aTariff--;
    if (state.aHP > 0 && state.pHP > 0 && !_gameOverFired && !_onlineMode) _aiActTimer = setTimeout(aiAct, 1200);
    if (_onlineMode) { state.turn = false; render(); } // wait for opponent broadcast
    showSkipBtn(false);
    _skipRequested = false;
}

async function aiAct() {
    if (_forfeited || _gameOverFired) return;
    
    state.aGoldRerolls = 0;
    
    if (state.pPoison > 0) {
        const pd = state.pPoisonDmg || 3; state.pHP -= pd; state.pPoison--;
        achStats._totalPoisonBurnStacks = (achStats._totalPoisonBurnStacks || 0) + pd;
        if (state.pPoison === 0 && state.pPoisonDmg >= 5 && state.pHP > 0) achStats._survivedPandemic = true;
        playSfx('poisonTick'); showNumber(pd, false, true, false); updateHUD();
        if (state.pHP <= 0) { checkAchs({ poisonKill: false }); updateHUD(); return; }
    }
    if (state.aPoison > 0) {
        const pd = state.aPoisonDmg || 3; state.aHP -= pd; state.aPoison--;
        playSfx('poisonTick'); showNumber(pd, false, false, false); updateHUD();
        if (state.aHP <= 0) { checkAchs({ poisonKill: true }); updateHUD(); return; }
    }
    if (state.pBurn > 0) {
        const bd = state.pBurnDmg || 3; state.pHP -= bd; state.pBurn--;
        achStats._totalPoisonBurnStacks = (achStats._totalPoisonBurnStacks || 0) + bd;
        playSfx('poisonTick'); showNumber(bd, false, true, false); updateHUD();
        if (state.pHP <= 0) { checkAchs({ burnKill: false }); updateHUD(); return; }
    }
    if (state.aBurn > 0) {
        const bd = state.aBurnDmg || 3; state.aHP -= bd; state.aBurn--;
        playSfx('poisonTick'); showNumber(bd, false, false, false); updateHUD();
        if (state.aHP <= 0) { checkAchs({ burnKill: true }); updateHUD(); return; }
    }
    if (state.pRegen > 0) {
        const rg = state.pRegenAmt || 3; state.pHP = Math.min(75, state.pHP + rg); state.pRegen--;
        playSfx('heal'); showNumber(rg, true, true); updateHUD();
    }
    if (state.aRegen > 0) {
        const rg = state.aRegenAmt || 3; state.aHP = Math.min(75, state.aHP + rg); state.aRegen--;
        playSfx('heal'); showNumber(rg, true, false); updateHUD();
    }
    if (state.aFreeze > 0) {
        state.aFreeze--;
        while (state.pHand.length < 5) state.pHand.push(drawCard(state.pHand.length === 4));
        showSkipBtn(false); _skipRequested = false;
        state.turn = true; render(); return;
    }
    trackStatusStack();

    const backs = document.querySelectorAll('.ai-back');
    const thinkIters = _aiThink === 'fast' ? 1 : _aiThink === 'slow' ? 4 : 3;
    for (let i = 0; i < thinkIters; i++) {
        const r = Math.floor(Math.random() * 5);
        if (backs[r]) backs[r].style.transform = 'translateY(30px) scale(1.05)';
        playSfx('aiThink');
        await delay(320);
        if (backs[r]) backs[r].style.transform = '';
    }

    if (state.aCurse > 0) {
        state.aCurse--;
        _forcedRoll = 1;
    }
    const chosenIdx = (_forcedOnlineCard !== null && _forcedOnlineCard !== undefined) ? _forcedOnlineCard : Math.floor(Math.random() * 5);
    const chosenBack = backs[chosenIdx];
    const c = drawCard(false);
    const board = document.getElementById('board'); // needed for revealed card DOM

    if (chosenBack) {
        chosenBack.style.transition = 'transform 0.35s cubic-bezier(0.4,0,0.2,1)';
        chosenBack.style.transform = 'translateY(50px) scale(1.08)';
        await delay(200);

        const gc = document.getElementById('game-container');
        const backRect = chosenBack.getBoundingClientRect();
        const gcRect = gc.getBoundingClientRect();
        const revealX = backRect.left - gcRect.left;
        const revealY = backRect.top  - gcRect.top;

        const revealed = document.createElement('div');
        revealed.className = 'card';
        revealed.dataset.rarity = c.rarity;
        revealed.style.cssText = `
            position:absolute;
            left:${revealX}px; top:${revealY}px;
            width:${backRect.width}px; height:${backRect.height}px;
            z-index:200; pointer-events:none;
            transform: scale(0.9) rotateY(90deg);
            transition: transform 0.25s ease-in;
            font-size: 0.75em;
        `;
        revealed.innerHTML = `
            <div class="c-name" style="font-size:8px">${c.n}</div>
            <div class="c-icon" style="font-size:30px;margin:3px 0">${c.i}</div>
            <div class="c-desc" style="font-size:8px">${c.d}</div>`;
        board.appendChild(revealed);

        chosenBack.style.opacity = '0';

        await delay(30);
        playSfx('aiReveal');
        revealed.style.transform = 'scale(1.05) rotateY(0deg)';
        revealed.style.transition = 'transform 0.3s cubic-bezier(0.34,1.4,0.64,1)';
        await delay(700); 

        revealed.style.transition = 'transform 0.3s ease-in, opacity 0.3s ease-in';
        revealed.style.transform = 'translateY(-30px) scale(0.9)';
        revealed.style.opacity = '0';
        setTimeout(() => revealed.remove(), 400);
        await delay(250);
    }

    await resolve(c, false);
    if (state.pTariff > 0) state.pTariff--;
    while (state.pHand.length < 5) state.pHand.push(drawCard(state.pHand.length === 4));
    state.turn = true;
    render();
}

async function resolve(card, isP) {
    playSfx('play');
    if (isP) trackCardPlayed(card.id, true);

    let total = 0, chain = 0;
    const gc = document.getElementById('game-container'); // kept for gold-vfx class
    const board = document.getElementById('board');

    // Dynamic board-centre coords — correct regardless of window size
    function boardCX() { return board ? board.clientWidth  / 2 : 490; }
    function boardCY() { return board ? board.clientHeight / 2 : 335; }
    // Player card zone: lower-centre. AI card zone: upper-centre.
    function pZoneX() { return boardCX(); }
    function pZoneY() { return board ? board.clientHeight * 0.62 : 580; }
    function aZoneX() { return boardCX(); }
    function aZoneY() { return board ? board.clientHeight * 0.22 : 135; }
    function selfX(forP) { return board ? (forP ? board.clientWidth * 0.18 : board.clientWidth * 0.82) : (forP ? 160 : 810); }
    function selfY(forP) { return board ? (forP ? board.clientHeight * 0.65 : board.clientHeight * 0.18) : (forP ? 570 : 120); }

    const canFail = ![2, 9, 6, 4, 18, 22, 24, 28, 32, 34, 37, 40, 44, 45].includes(card.id); 

    do {
        const roll = await rollDie3D(isP);

        if (roll === 6) {
            playSfx('crit');
            const baseMult = typeof _critMult !== 'undefined' ? _critMult : 2.2;
            const critMult = chain === 0 ? baseMult : chain === 1 ? baseMult * 1.3 : baseMult * 1.6;
            total += Math.floor(6 * critMult); chain++;
            trackCrit(isP);
            await showDieResult(roll, true, false);
            document.getElementById('die-3d').classList.add('crit');
            gc.classList.add('gold-vfx');
            showCritPopup(chain);
            spawnCritRing();
            spawnParticles(boardCX(), boardCY(), 28, ['#ffd700','#ffb300','#fff7aa','#ff8800','#ffffff'], 120);
            spawnImpactRing(boardCX(), boardCY(), '#ffd700');
            spawnImpactRing(boardCX(), boardCY(), '#ffaa00');
            await Promise.all([flashScreen('rgba(255,200,0,0.5)', 80), shake(6)]);
            await delay(260);
            await hideDie();
        } else if (roll === 1 && chain === 0 && canFail) {
            playSfx('fail');
            total = 0;
            trackFail(isP);
            await showDieResult(roll, false, true);
            document.getElementById('die-3d').classList.add('fail');
            showFailPopup();
            spawnParticles(boardCX(), boardCY(), 18, ['#ff3030','#ff0000','#880000'], 80);
            spawnImpactRing(boardCX(), boardCY(), '#ff3030');
            await flashScreen('rgba(180,0,0,0.3)', 70);
            await delay(300);
            await hideDie();
            break;
        } else {
            total += (chain > 0 ? roll * 0.5 : roll);
            await showDieResult(roll, false, false);
            await hideDie();
            break;
        }
    } while (chain < 3);

    if (chain >= 3) trackChain(chain);
    gc.classList.remove('gold-vfx');

    const obj = document.createElement('div');
    obj.className = 'vfx';

    const impactX = selfX(!isP);  // impact lands on the opponent
    const impactY = selfY(!isP);
    const originX = isP ? pZoneX() : aZoneX();
    const originY = isP ? pZoneY() : aZoneY();

    if (total === 0) {
        
        const failDmgMap = { 8: 8, 19: 10, 10: 6, 5: 0, 2: 0, 14: 0, 11: 0, 20: 0, 21: 4, 22: 0, 23: 8, 24: 0, 25: 8, 26: 3, 27: 0, 28: 0, 29: 0, 30: 0, 31: 6, 32: 0, 33: 5, 34: 0, 35: 10, 36: 2, 37: 0, 38: 0, 39: 3, 40: 0, 41: 4, 42: 6, 43: 8, 44: 0, 45: 0, 46: 0, 12: 4, 3: 0, 16: 0, 17: 6 };
        const failDmg = failDmgMap.hasOwnProperty(card.id) ? failDmgMap[card.id] : 4;
        obj.textContent = card.i;
        obj.classList.add(isP ? 'f-fail-p' : 'f-fail-a');
        board.appendChild(obj);
        await delay(500);
        const sx = selfX(isP), sy = selfY(isP);
        if (failDmg > 0) {
            playSfx('selfHit');
            spawnImpactRing(sx, sy, '#ff3030');
            spawnParticles(sx, sy, 18, ['#ff3030','#880000','#ffaaaa'], 70);
            await Promise.all([chromaImpact(), shake(8), flashScreen('rgba(180,0,0,0.35)', 70)]);
            if (isP) { state.pHP -= failDmg; trackSelfFail(); achStats._battleLowestHP = Math.min(achStats._battleLowestHP, state.pHP); }
            else state.aHP -= failDmg;
            showNumber(failDmg, false, isP, false);
        } else {
            playSfx('selfHit');
            spawnParticles(sx, sy, 8, ['#888','#555','#333'], 40);
            await delay(300);
        }
        if (card.id === 11) {
            if (isP) state.pCurse = 1;
            else state.aCurse = 1;
            spawnParticles(sx, sy, 14, ['#7b1fa2','#e040fb','#ce93d8'], 70);
        }
        if (card.id === 20) {
            if (isP) state.pFreeze = 1;
            else state.aFreeze = 1;
            spawnParticles(sx, sy, 12, ['#b2ebf2','#80deea','#fff'], 50);
        }
        if (card.id === 30) {
            if (isP) state.pCurse = 1;
            else state.aCurse = 1;
            spawnParticles(sx, sy, 14, ['#7b1fa2','#ce93d8','#fff'], 60);
        }
        if (card.id === 38) {
            if (isP) state.pFreeze = 1;
            else state.aFreeze = 1;
            spawnParticles(sx, sy, 14, ['#66bb6a','#388e3c','#fff'], 55);
        }
        if (card.id === 12) {
            if (isP) { state.pRegen = 0; }
            else     { state.aRegen = 0; }
            spawnParticles(selfX(isP), selfY(isP), 12, ['#388e3c','#1b5e20','#555','#333'], 50);
            if (isP) checkAchs({ regenWither: true });
        }
        if (card.id === 3) {
            if (isP) state.pTariff = 2;
            else     state.aTariff = 2;
            spawnParticles(selfX(isP), selfY(isP), 14, ['#ce93d8','#6a1b9a','#fff'], 60);
            if (isP) checkAchs({ tariffSelf: true });
        }
        if (card.id === 16) {
            if (isP) state.pFreeze = 1;
            else     state.aFreeze = 1;
            spawnParticles(selfX(isP), selfY(isP), 16, ['#b3e5fc','#81d4fa','#e1f5fe','#fff'], 65);
            if (isP) checkAchs({ frostSelf: true });
        }
        if (card.id === 42) {
            if (isP) { stackPoison('p', 2, 3); stackBurn('p', 2, 2); }
            else     { stackPoison('a', 2, 3); stackBurn('a', 2, 2); }
            spawnParticles(selfX(isP), selfY(isP), 18, ['#558b2f','#ff6f00','#795548','#fff'], 70);
        }
        if (card.id === 43) {
            if (isP) { stackPoison('p', 5, 5); }
            else     { stackPoison('a', 5, 5); }
            spawnParticles(selfX(isP), selfY(isP), 20, ['#33691e','#558b2f','#1b5e20','#fff'], 80);
        }
        if (card.id === 46) {
            if (isP) state.pCurse = 1;
            else state.aCurse = 1;
            spawnParticles(selfX(isP), selfY(isP), 14, ['#b8860b','#ffd700','#fff8e1','#fff'], 60);
        }
        updateHUD();

    } else {
        switch (card.id) {

            case 0: { 
                playSfx('attackSwing');
                startTrail(originX, originY, impactX, impactY, 'rgba(255,100,30,1)');
                obj.textContent = '⚔️';
                obj.classList.add(isP ? 'f-p2a' : 'f-a2p');
                board.appendChild(obj);
                await delay(500);

                if (isP && state.aMirror) {
                    state.aMirror = false;
                    playSfx('mirrorTrigger');
                    achStats.mirrorTriggers++;
                    spawnImpactRing(impactX, impactY, '#90caf9');
                    spawnParticles(impactX, impactY, 18, ['#90caf9','#1565c0','#fff'], 80);
                    await Promise.all([chromaImpact(), shake(8)]);
                    let d = total + 5; if (state.pTariff > 0) d = Math.floor(d * 0.5);
                    const preMirrorHP = state.pHP; dmg(d, true); showNumber(d, false, true, chain > 0);
                    if (state.pHP <= 0 && preMirrorHP > 0) checkAchs({ mirrorKill: true });
                    updateHUD(); break;
                }
                if (!isP && state.pMirror) {
                    state.pMirror = false;
                    playSfx('mirrorTrigger');
                    achStats.mirrorTriggers++;
                    spawnImpactRing(impactX, impactY, '#90caf9');
                    spawnParticles(impactX, impactY, 18, ['#90caf9','#1565c0','#fff'], 80);
                    await Promise.all([chromaImpact(), shake(8)]);
                    let d = total + 5; if (state.aTariff > 0) d = Math.floor(d * 0.5);
                    const preMirrorHP2 = state.aHP; dmg(d, false); showNumber(d, false, false, chain > 0);
                    if (state.aHP <= 0 && preMirrorHP2 > 0) checkAchs({ mirrorKill: true });
                    updateHUD(); break;
                }

                playSfx('attack');
                spawnImpactRing(impactX, impactY, '#ff6020');
                spawnParticles(impactX, impactY, 24, ['#ff6020','#ff3000','#ffaa60','#fff'], 90);
                await Promise.all([chromaImpact(), shake(chain > 0 ? 16 : 10), flashScreen('rgba(255,80,20,0.4)', 75)]);
                let d = total + 5;
                if (isP) {
                    if (state.aTariff > 0) { trackTariffBlock(d); d = Math.floor(d * 0.5); }
                    if (state.aShield) { d = Math.floor(d * 0.4); state.aShield = false; }
                    const preHP = state.aHP;
                    dmg(d, false);
                    trackDamage(d, true); trackTurn();
                    showNumber(d, false, false, chain > 0);
                    if (state.aHP <= 0 && preHP > 0) checkAchs({ won: true });
                } else {
                    d = total + 3; 
                    if (state.pTariff > 0) d = Math.floor(d * 0.5);
                    if (state.pShield) { d = Math.floor(d * 0.4); state.pShield = false; }
                    dmg(d, true);
                    trackTurn();
                    showNumber(d, false, true, chain > 0);
                }
                if (state.pHP === 1 && state.aHP === 1) checkAchs({ bothAtOne: true });
                break;
            }

            case 5: { 
                playSfx('vampire');
                const drainAmt = Math.floor(total * 1.2 + 4);
                obj.textContent = '🦇';
                obj.classList.add(isP ? 'f-p2a' : 'f-a2p');
                board.appendChild(obj);
                await delay(500);
                spawnImpactRing(impactX, impactY, '#9c27b0');
                spawnParticles(impactX, impactY, 18, ['#9c27b0','#e040fb','#ce93d8','#fff'], 80);
                await Promise.all([chromaImpact(), shake(8), flashScreen('rgba(140,0,180,0.35)', 70)]);
                if (isP) { let vd = drainAmt; if (state.aShield) { vd = Math.floor(vd * 0.4); state.aShield = false; } dmg(vd, false); state.pHP = Math.min(75, state.pHP + Math.floor(vd * 0.5)); trackDamage(vd, true); trackTurn(); showNumber(vd, false, false, chain > 0); showNumber(Math.floor(vd * 0.5), true, true); }
                else     { let aiDrain = Math.floor(drainAmt * 0.75); if (state.pShield) { aiDrain = Math.floor(aiDrain * 0.4); state.pShield = false; } dmg(aiDrain, true);  state.aHP = Math.min(75, state.aHP + Math.floor(aiDrain * 0.35)); trackTurn(); showNumber(aiDrain, false, true, chain > 0);  showNumber(Math.floor(aiDrain * 0.35), true, false); }
                break;
            }

            case 2: { 
                playSfx('heal');
                if (isP && chain > 0) checkAchs({ critOnHeal: true });
                obj.textContent = '✨';
                obj.classList.add(isP ? 'f-heal-p' : 'f-heal-a');
                board.appendChild(obj);
                const hv = Math.floor(total + 6);
                const hx = isP ? 160 : 810, hy = isP ? 570 : 120;
                spawnParticles(hx, hy, 18, ['#81c784','#4caf50','#ffffff','#c8e6c9'], 70);
                if (isP) { trackHeal(hv); state.pHP = Math.min(75, state.pHP + hv); showNumber(hv, true, true); }
                else      { state.aHP = Math.min(75, state.aHP + hv); showNumber(hv, true, false); }
                break;
            }

            case 3: { 
                playSfx('tariff');
                obj.textContent = '📜';
                obj.style.cssText = 'position:absolute;font-size:60px;left:44%;top:40%;';
                board.appendChild(obj);
                if (isP) state.aTariff = (chain > 0 ? 5 : 3);
                else     state.pTariff = 3;
                spawnParticles(490, 335, 14, ['#ce93d8','#6a1b9a','#fff','#e1bee7'], 80);
                await impactFrame();
                break;
            }

            case 6: { 
                playSfx('mirror');
                obj.textContent = '🪞';
                obj.style.cssText = 'position:absolute;font-size:64px;left:' + (isP?'12%':'78%') + ';top:' + (isP?'55%':'10%') + ';transition:opacity 0.5s;opacity:1;';
                board.appendChild(obj);
                if (isP) state.pMirror = true;
                else     state.aMirror = true;
                const mx = isP ? 160 : 810, my = isP ? 570 : 120;
                spawnParticles(mx, my, 16, ['#90caf9','#42a5f5','#fff','#bbdefb'], 70);
                spawnImpactRing(mx, my, '#42a5f5');
                await impactFrame();
                setTimeout(() => { obj.style.opacity = '0'; }, 500);
                break;
            }

            case 7: { 
                playSfx('plague');
                obj.textContent = '☠️';
                obj.classList.add(isP ? 'f-p2a' : 'f-a2p');
                board.appendChild(obj);
                await delay(500);
                spawnImpactRing(impactX, impactY, '#66bb6a');
                spawnParticles(impactX, impactY, 16, ['#388e3c','#66bb6a','#1b5e20','#a5d6a7'], 80);
                await Promise.all([shake(6), flashScreen('rgba(30,90,30,0.3)', 60)]);
                const poisonTurns = 3;
                const poisonDmg = chain > 0 ? 5 : 3;
                if (isP) { stackPoison('a', poisonTurns, poisonDmg); }
                else     { stackPoison('p', poisonTurns, poisonDmg); }
                break;
            }

            case 4: { 
                playSfx('pet');
                obj.textContent = '🐉';
                obj.style.cssText = 'position:absolute;font-size:64px;left:' + (isP?'12%':'78%') + ';top:' + (isP?'55%':'10%') + ';transition:opacity 0.5s;opacity:1;';
                board.appendChild(obj);
                if (isP) state.pPet = Math.floor(state.pHP * (chain > 0 ? 0.5 : 0.25));
                else     state.aPet = Math.floor(state.aHP * 0.25);
                const px = isP ? 160 : 810, py = isP ? 570 : 120;
                spawnParticles(px, py, 22, ['#ff9800','#ff5722','#ffd700','#fff'], 100);
                spawnImpactRing(px, py, '#ff9800');
                await Promise.all([chromaImpact(), shake(6)]);
                setTimeout(() => { obj.style.opacity = '0'; }, 600);
                break;
            }

            case 8: { 
                playSfx('attack');
                startTrail(originX, originY, impactX, impactY, 'rgba(255,160,0,1)');
                obj.textContent = '💣';
                obj.classList.add(isP ? 'f-p2a' : 'f-a2p');
                board.appendChild(obj);
                await delay(500);
                const bombDmg = Math.floor((total + 4) * (chain > 0 ? 2 : 1));
                spawnImpactRing(impactX, impactY, '#ff8800');
                spawnImpactRing(impactX, impactY, '#ffcc00');
                spawnParticles(impactX, impactY, 32, ['#ff8800','#ffcc00','#ff3300','#fff','#ffaa00'], 110);
                await Promise.all([chromaImpact(), shake(chain > 0 ? 18 : 12), flashScreen('rgba(255,140,0,0.5)', 90)]);
                if (isP && state.aMirror) {
                    state.aMirror = false; playSfx('mirrorTrigger'); achStats.mirrorTriggers++;
                    spawnImpactRing(impactX, impactY, '#90caf9');
                    await Promise.all([chromaImpact(), shake(10)]);
                    let md = bombDmg; if (state.pTariff > 0) md = Math.floor(md * 0.5);
                    const preBombM = state.pHP; dmg(md, true); showNumber(md, false, true, chain > 0);
                    if (state.pHP <= 0 && preBombM > 0) checkAchs({ mirrorKill: true });
                    updateHUD(); break;
                }
                if (!isP && state.pMirror) {
                    state.pMirror = false; playSfx('mirrorTrigger'); achStats.mirrorTriggers++;
                    spawnImpactRing(impactX, impactY, '#90caf9');
                    await Promise.all([chromaImpact(), shake(10)]);
                    let md = bombDmg; if (state.aTariff > 0) md = Math.floor(md * 0.5);
                    const preBombM2 = state.aHP; dmg(md, false); showNumber(md, false, false, chain > 0);
                    if (state.aHP <= 0 && preBombM2 > 0) checkAchs({ mirrorKill: true });
                    updateHUD(); break;
                }
                if (isP) {
                    let v = bombDmg; if (state.aTariff > 0) { trackTariffBlock(v); v = Math.floor(v*0.5); }
                    const preHP = state.aHP; dmg(v, false); trackDamage(v, true); trackTurn(); showNumber(v, false, false, chain>0);
                    if (state.aHP <= 0 && preHP > 0) checkAchs({ bombKill: true });
                } else {
                    let v = state.pTariff > 0 ? Math.floor(bombDmg*0.5) : bombDmg;
                    dmg(v, true); trackTurn(); showNumber(v, false, true, chain>0);
                }
                break;
            }

            case 9: { 
                playSfx('mirror');
                obj.textContent = '🛡️';
                obj.style.cssText = 'position:absolute;font-size:64px;left:' + (isP?'12%':'78%') + ';top:' + (isP?'55%':'10%') + ';transition:opacity 0.5s;opacity:1;';
                board.appendChild(obj);
                if (isP) state.pShield = true;
                else     state.aShield = true;
                const shx = isP ? 160 : 810, shy = isP ? 570 : 120;
                spawnParticles(shx, shy, 16, ['#90caf9','#42a5f5','#1565c0','#fff'], 70);
                spawnImpactRing(shx, shy, '#1565c0');
                await impactFrame();
                setTimeout(() => { obj.style.opacity = '0'; }, 600);
                break;
            }

            case 10: { 
                playSfx('attackSwing');
                obj.textContent = '⚡';
                obj.classList.add(isP ? 'f-p2a' : 'f-a2p');
                board.appendChild(obj);
                await delay(400);
                if (isP && state.aMirror) {
                    state.aMirror = false; playSfx('mirrorTrigger'); achStats.mirrorTriggers++;
                    const msd = Math.floor(total + 3); let md = msd; if (state.pTariff > 0) md = Math.floor(md * 0.5);
                    spawnImpactRing(impactX, impactY, '#90caf9'); spawnParticles(impactX, impactY, 14, ['#90caf9','#1565c0','#fff'], 70);
                    await Promise.all([chromaImpact(), shake(8)]);
                    const preStormM = state.pHP; dmg(md, true); showNumber(md, false, true, chain > 0);
                    if (state.pHP <= 0 && preStormM > 0) checkAchs({ mirrorKill: true });
                    updateHUD(); break;
                }
                if (!isP && state.pMirror) {
                    state.pMirror = false; playSfx('mirrorTrigger'); achStats.mirrorTriggers++;
                    const msd = Math.floor(total + 3); let md = msd; if (state.aTariff > 0) md = Math.floor(md * 0.5);
                    spawnImpactRing(impactX, impactY, '#90caf9'); spawnParticles(impactX, impactY, 14, ['#90caf9','#1565c0','#fff'], 70);
                    await Promise.all([chromaImpact(), shake(8)]);
                    const preStormM2 = state.aHP; dmg(md, false); showNumber(md, false, false, chain > 0);
                    if (state.aHP <= 0 && preStormM2 > 0) checkAchs({ mirrorKill: true });
                    updateHUD(); break;
                }
                const stormHits = chain > 0 ? 3 : 2;
                const stormDmg  = Math.floor((total + 3));
                for (let s = 0; s < stormHits; s++) {
                    playSfx('attack');
                    spawnImpactRing(impactX, impactY + s * 12, '#ffe57a');
                    spawnParticles(impactX, impactY, 14, ['#ffe57a','#fff176','#fff','#ffee58'], 70);
                    await Promise.all([shake(8), flashScreen('rgba(255,230,80,0.35)', 55)]);
                    let sd = stormDmg; if (isP && state.aTariff > 0) sd = Math.floor(sd * 0.5); if (!isP && state.pTariff > 0) sd = Math.floor(sd * 0.5);
                    if (isP && state.aShield) { sd = Math.floor(sd * 0.4); state.aShield = false; }
                    if (!isP && state.pShield) { sd = Math.floor(sd * 0.4); state.pShield = false; }
                    dmg(sd, !isP);
                    if (isP) { trackDamage(sd, true); }
                    trackTurn();
                    showNumber(sd, false, !isP, chain>0);
                    await delay(200);
                }
                break;
            }

            case 11: { 
                playSfx('tariff');
                obj.textContent = '🔮';
                obj.style.cssText = 'position:absolute;font-size:60px;left:44%;top:40%;';
                board.appendChild(obj);
                if (isP) { state.aCurse = chain > 0 ? 2 : 1; }
                else     { state.pCurse = 1; }
                spawnParticles(490, 335, 18, ['#7b1fa2','#e040fb','#ce93d8','#fff'], 90);
                spawnImpactRing(490, 335, '#9c27b0');
                await Promise.all([shake(6), flashScreen('rgba(100,0,150,0.3)', 60)]);
                break;
            }

            case 12: { 
                playSfx('heal');
                obj.textContent = '🌿';
                obj.classList.add(isP ? 'f-heal-p' : 'f-heal-a');
                board.appendChild(obj);
                const regenAmt = chain > 0 ? 5 : 3;
                const rgx = isP ? 160 : 810, rgy = isP ? 570 : 120;
                spawnParticles(rgx, rgy, 14, ['#66bb6a','#a5d6a7','#fff','#c8e6c9'], 60);
                if (isP) { state.pRegen = 3; state.pRegenAmt = regenAmt; }
                else     { state.aRegen = 3; state.aRegenAmt = regenAmt; }
                break;
            }

            case 13: { 
                playSfx('attackSwing');
                startTrail(originX, originY, impactX, impactY, 'rgba(200,220,255,1)');
                obj.textContent = '🏹';
                obj.classList.add(isP ? 'f-p2a' : 'f-a2p');
                board.appendChild(obj);
                await delay(400);
                playSfx('attack');
                const snipeDmg = Math.floor(total + 6);
                spawnImpactRing(impactX, impactY, '#90caf9');
                spawnParticles(impactX, impactY, 16, ['#90caf9','#e3f2fd','#fff'], 70);
                await Promise.all([shake(9), flashScreen('rgba(150,200,255,0.3)', 60)]);
                if (isP) {
                    let sd = snipeDmg; if (state.aTariff > 0) { trackTariffBlock(sd); sd = Math.floor(sd * 0.5); }
                    const hadPet = state.aPet > 0;
                    const preHP = state.aHP; state.aHP -= sd;
                    trackDamage(sd, true); trackTurn(); showNumber(sd, false, false, chain>0);
                    if (hadPet && state.aHP <= 0 && preHP > 0) checkAchs({ snipeThroughPet: true });
                } else {
                    let sd = snipeDmg; if (state.pTariff > 0) sd = Math.floor(sd * 0.5);
                    state.pHP -= sd; trackTurn(); showNumber(sd, false, true, chain>0);
                }
                break;
            }

            case 14: { 
                playSfx('vampire');
                obj.textContent = '🩸';
                obj.classList.add(isP ? 'f-p2a' : 'f-a2p');
                board.appendChild(obj);
                await delay(500);
                const leechDmg  = Math.floor(total + 2);
                const leechHeal = Math.floor(leechDmg * 0.6);
                spawnImpactRing(impactX, impactY, '#e57373');
                spawnParticles(impactX, impactY, 14, ['#e57373','#ef9a9a','#fff'], 70);
                await Promise.all([shake(6), flashScreen('rgba(180,30,30,0.25)', 55)]);
                if (isP) { dmg(leechDmg, false); state.pHP = Math.min(75, state.pHP + leechHeal); trackDamage(leechDmg, true); trackTurn(); showNumber(leechDmg, false, false, chain>0); showNumber(leechHeal, true, true); }
                else     { dmg(leechDmg, true);  state.aHP = Math.min(75, state.aHP + leechHeal); trackTurn(); showNumber(leechDmg, false, true,  chain>0); showNumber(leechHeal, true, false); }
                break;
            }

            case 15: { 
                playSfx('attack');
                startTrail(originX, originY, impactX, impactY, 'rgba(255,80,0,1)');
                obj.textContent = '🔥';
                obj.classList.add(isP ? 'f-p2a' : 'f-a2p');
                board.appendChild(obj);
                await delay(500);
                const burnDmg  = chain > 0 ? 5 : 3;
                const burnInit = Math.floor(total + 4);
                spawnImpactRing(impactX, impactY, '#ff5722');
                spawnParticles(impactX, impactY, 26, ['#ff5722','#ff8a65','#ffccbc','#fff','#ff3d00'], 100);
                await Promise.all([chromaImpact(), shake(12), flashScreen('rgba(255,60,0,0.45)', 80)]);
                if (isP) { dmg(burnInit, false); state.aBurn = 3; state.aBurnDmg = burnDmg; trackDamage(burnInit, true); trackTurn(); showNumber(burnInit, false, false, chain>0); }
                else     { dmg(burnInit, true);  state.pBurn = 3; state.pBurnDmg = burnDmg; trackTurn(); showNumber(burnInit, false, true,  chain>0); }
                break;
            }

            case 16: { 
                playSfx('mirror');
                obj.textContent = '❄️';
                obj.classList.add(isP ? 'f-p2a' : 'f-a2p');
                board.appendChild(obj);
                await delay(500);
                spawnImpactRing(impactX, impactY, '#b3e5fc');
                spawnParticles(impactX, impactY, 20, ['#b3e5fc','#81d4fa','#e1f5fe','#fff'], 80);
                await Promise.all([shake(7), flashScreen('rgba(150,220,255,0.35)', 65)]);
                if (isP) { state.aFreeze = chain > 0 ? 2 : 1; }
                else     { state.pFreeze = 1; }
                break;
            }

            case 17: { 
                playSfx('crit');
                obj.textContent = '💰';
                obj.style.cssText = 'position:absolute;font-size:60px;left:44%;top:38%;';
                board.appendChild(obj);
                const goldRerolls = chain > 0 ? 2 : 1;
                if (isP) state.pGoldRerolls = goldRerolls;
                else     state.aGoldRerolls = goldRerolls;
                if (chain > 0 && isP) { achStats._battleGoldCrits++; checkAchs({ gold_double_reroll: true }); }
                const goldIconX = isP ? 160 : 810, goldIconY = isP ? 570 : 120;
                const goldBadge = document.createElement('div');
                goldBadge.style.cssText = `position:absolute;left:${goldIconX - 28}px;top:${goldIconY - 60}px;font-size:22px;z-index:300;pointer-events:none;animation:badge-pop 0.4s cubic-bezier(0.34,1.4,0.64,1) forwards;`;
                goldBadge.textContent = goldRerolls > 1 ? '💰×2' : '💰';
                board.appendChild(goldBadge);
                setTimeout(() => goldBadge.remove(), 1800);
                spawnParticles(490, 335, 24, ['#ffd700','#ffee58','#fff8e1','#fff','#ffb300'], 100);
                spawnImpactRing(490, 335, '#ffd700');
                gc.classList.add('gold-vfx');
                await Promise.all([shake(5), flashScreen('rgba(255,200,0,0.4)', 70)]);
                await delay(300);
                gc.classList.remove('gold-vfx');
                break;
            }

            case 18: { 
                playSfx('attackSwing');
                startTrail(originX, originY, impactX, impactY, 'rgba(220,200,160,1)');
                obj.textContent = '🦴';
                obj.classList.add(isP ? 'f-p2a' : 'f-a2p');
                board.appendChild(obj);
                await delay(450);
                playSfx('attack');
                const boneDmg = Math.floor(total * 0.8 + 2);
                spawnImpactRing(impactX, impactY, '#d7ccc8');
                spawnParticles(impactX, impactY, 12, ['#d7ccc8','#efebe9','#fff'], 60);
                await Promise.all([shake(6), flashScreen('rgba(200,180,140,0.25)', 50)]);
                if (isP) { let v = state.aTariff > 0 ? Math.floor(boneDmg*0.5) : boneDmg; dmg(v, false); trackDamage(v, true); trackTurn(); showNumber(v, false, false, chain>0); }
                else     { let v = state.pTariff > 0 ? Math.floor(boneDmg*0.5) : boneDmg; dmg(v, true); trackTurn(); showNumber(v, false, true, chain>0); }
                break;
            }

            case 19: { 
                playSfx('crit');
                startTrail(originX, originY, impactX, impactY, 'rgba(180,100,255,1)');
                obj.textContent = '👻';
                obj.classList.add(isP ? 'f-p2a' : 'f-a2p');
                board.appendChild(obj);
                await delay(500);
                const soulDmg = Math.floor((total + 8) * (chain > 0 ? 1.8 : 1));
                spawnImpactRing(impactX, impactY, '#ce93d8');
                spawnImpactRing(impactX, impactY, '#9c27b0');
                spawnParticles(impactX, impactY, 30, ['#ce93d8','#9c27b0','#e1bee7','#fff','#7b1fa2'], 120);
                await Promise.all([chromaImpact(), shake(16), flashScreen('rgba(120,0,180,0.5)', 90)]);
                if (isP) {
                    let v = soulDmg; if (state.aTariff > 0) { trackTariffBlock(v); v = Math.floor(v*0.5); }
                    const preHP = state.aHP; dmg(v, false); trackDamage(v, true); trackTurn(); showNumber(v, false, false, chain>0);
                    if (state.aHP <= 0 && preHP > 0) checkAchs({ soulKill: true });
                } else {
                    let v = state.pTariff > 0 ? Math.floor(soulDmg*0.5) : soulDmg;
                    dmg(v, true); trackTurn(); showNumber(v, false, true, chain>0);
                }
                break;
            }

            

            case 20: { 
                playSfx('mirror');
                obj.textContent = '🎵';
                obj.classList.add(isP ? 'f-p2a' : 'f-a2p');
                board.appendChild(obj);
                await delay(500);
                spawnImpactRing(impactX, impactY, '#b2ebf2');
                spawnParticles(impactX, impactY, 18, ['#b2ebf2','#80deea','#e0f7fa','#fff'], 80);
                await Promise.all([shake(5), flashScreen('rgba(120,220,240,0.3)', 55)]);
                if (isP) { state.aFreeze = chain > 0 ? 2 : 1; }
                else     { state.pFreeze = 1; }
                break;
            }

            case 21: { 
                playSfx('attackSwing');
                startTrail(originX, originY, impactX, impactY, 'rgba(255,180,220,1)');
                obj.textContent = '🎶';
                obj.classList.add(isP ? 'f-p2a' : 'f-a2p');
                board.appendChild(obj);
                await delay(450);
                playSfx('attack');
                const ariaDmg = Math.floor((total + 5) * (chain > 0 ? 2.0 : 1));
                spawnImpactRing(impactX, impactY, '#f48fb1');
                spawnParticles(impactX, impactY, 22, ['#f48fb1','#f06292','#fff','#fce4ec'], 95);
                await Promise.all([chromaImpact(), shake(chain > 0 ? 14 : 9), flashScreen('rgba(240,100,160,0.4)', 70)]);
                if (isP) {
                    let v = ariaDmg; if (state.aTariff > 0) { trackTariffBlock(v); v = Math.floor(v*0.5); }
                    if (state.aShield) { v = Math.floor(v * 0.4); state.aShield = false; }
                    const preHP = state.aHP; dmg(v, false); trackDamage(v, true); trackTurn(); showNumber(v, false, false, chain>0);
                } else {
                    let v = ariaDmg; if (state.pTariff > 0) v = Math.floor(v*0.5);
                    if (state.pShield) { v = Math.floor(v * 0.4); state.pShield = false; }
                    dmg(v, true); trackTurn(); showNumber(v, false, true, chain>0);
                }
                break;
            }

            case 22: { 
                playSfx('tariff');
                obj.textContent = '🌊';
                obj.style.cssText = 'position:absolute;font-size:60px;left:44%;top:40%;';
                board.appendChild(obj);
                if (isP) state.aTariff = (chain > 0 ? 4 : 2);
                else     state.pTariff = 2;
                spawnParticles(490, 335, 16, ['#80cbc4','#b2dfdb','#e0f2f1','#fff'], 80);
                spawnImpactRing(490, 335, '#80cbc4');
                await impactFrame();
                break;
            }

            case 23: { 
                playSfx('attack');
                startTrail(originX, originY, impactX, impactY, 'rgba(255,100,180,1)');
                obj.textContent = '👄';
                obj.classList.add(isP ? 'f-p2a' : 'f-a2p');
                board.appendChild(obj);
                await delay(400);
                const bansheeDmg = Math.floor(total + 6);
                spawnImpactRing(impactX, impactY, '#ec407a');
                spawnImpactRing(impactX, impactY, '#f48fb1');
                spawnParticles(impactX, impactY, 26, ['#ec407a','#f48fb1','#fff','#fce4ec','#ad1457'], 110);
                await Promise.all([chromaImpact(), shake(chain > 0 ? 16 : 11), flashScreen('rgba(220,60,130,0.45)', 80)]);
                if (isP) {
                    let v = bansheeDmg; if (state.aTariff > 0) { trackTariffBlock(v); v = Math.floor(v*0.5); }
                    if (state.aShield) { v = Math.floor(v * 0.4); state.aShield = false; }
                    dmg(v, false); trackDamage(v, true); trackTurn(); showNumber(v, false, false, chain>0);
                } else {
                    let v = bansheeDmg; if (state.pTariff > 0) v = Math.floor(v*0.5);
                    if (state.pShield) { v = Math.floor(v * 0.4); state.pShield = false; }
                    dmg(v, true); trackTurn(); showNumber(v, false, true, chain>0);
                }
                break;
            }

            case 24: { 
                playSfx('mirror');
                obj.textContent = '🎤';
                obj.style.cssText = 'position:absolute;font-size:64px;left:' + (isP?'12%':'78%') + ';top:' + (isP?'55%':'10%') + ';transition:opacity 0.5s;opacity:1;';
                board.appendChild(obj);
                if (isP) {
                    state.pShield = true;
                    if (chain > 0) { state.pRegen = 2; state.pRegenAmt = 4; }
                } else {
                    state.aShield = true;
                    if (chain > 0) { state.aRegen = 2; state.aRegenAmt = 4; }
                }
                const chx = isP ? 160 : 810, chy = isP ? 570 : 120;
                spawnParticles(chx, chy, 18, ['#b2ebf2','#80deea','#e0f7fa','#fff'], 70);
                spawnImpactRing(chx, chy, '#80deea');
                await impactFrame();
                setTimeout(() => { obj.style.opacity = '0'; }, 600);
                break;
            }

            case 25: { 
                playSfx('vampire');
                startTrail(originX, originY, impactX, impactY, 'rgba(255,160,210,1)');
                obj.textContent = '🌹';
                obj.classList.add(isP ? 'f-p2a' : 'f-a2p');
                board.appendChild(obj);
                await delay(500);
                const encoreDmg = Math.floor((total + 7) * (chain > 0 ? 1.5 : 1));
                spawnImpactRing(impactX, impactY, '#e91e63');
                spawnImpactRing(impactX, impactY, '#fce4ec');
                spawnParticles(impactX, impactY, 28, ['#e91e63','#f48fb1','#fce4ec','#fff','#c2185b'], 110);
                await Promise.all([chromaImpact(), shake(chain > 0 ? 15 : 10), flashScreen('rgba(220,30,100,0.45)', 80)]);
                if (isP) {
                    let v = encoreDmg; if (state.aTariff > 0) { trackTariffBlock(v); v = Math.floor(v*0.5); }
                    if (state.aShield) { v = Math.floor(v * 0.4); state.aShield = false; }
                    dmg(v, false); state.pHP = Math.min(75, state.pHP + Math.floor(v * 0.4));
                    trackDamage(v, true); trackTurn(); showNumber(v, false, false, chain>0); showNumber(Math.floor(v*0.4), true, true);
                } else {
                    let v = encoreDmg * 0.8; if (state.pTariff > 0) v = Math.floor(v*0.5);
                    if (state.pShield) { v = Math.floor(v * 0.4); state.pShield = false; }
                    dmg(Math.floor(v), true); state.aHP = Math.min(75, state.aHP + Math.floor(v*0.3));
                    trackTurn(); showNumber(Math.floor(v), false, true, chain>0); showNumber(Math.floor(v*0.3), true, false);
                }
                break;
            }

            

            case 26: { 
                playSfx('attackSwing');
                startTrail(originX, originY, impactX, impactY, 'rgba(255,140,50,1)');
                obj.textContent = '🎸';
                obj.classList.add(isP ? 'f-p2a' : 'f-a2p');
                board.appendChild(obj);
                await delay(450);
                playSfx('attack');
                const strumDmg = Math.floor(total + 4);
                spawnImpactRing(impactX, impactY, '#ff8f00');
                spawnParticles(impactX, impactY, 20, ['#ff8f00','#ffca28','#fff','#ffe082'], 85);
                await Promise.all([shake(chain > 0 ? 13 : 9), flashScreen('rgba(255,130,0,0.35)', 65)]);
                if (isP) {
                    let v = strumDmg; if (state.aTariff > 0) { trackTariffBlock(v); v = Math.floor(v*0.5); }
                    if (state.aShield) { v = Math.floor(v * 0.4); state.aShield = false; }
                    dmg(v, false); trackDamage(v, true); trackTurn(); showNumber(v, false, false, chain>0);
                } else {
                    let v = strumDmg; if (state.pTariff > 0) v = Math.floor(v*0.5);
                    if (state.pShield) { v = Math.floor(v * 0.4); state.pShield = false; }
                    dmg(v, true); trackTurn(); showNumber(v, false, true, chain>0);
                }
                break;
            }

            case 27: { 
                playSfx('attackSwing');
                obj.textContent = '🥁';
                obj.classList.add(isP ? 'f-p2a' : 'f-a2p');
                board.appendChild(obj);
                await delay(400);
                const drumHits = chain > 0 ? 3 : 2;
                const drumDmg  = Math.floor(total + 2);
                for (let d2 = 0; d2 < drumHits; d2++) {
                    playSfx('attack');
                    spawnImpactRing(impactX + (d2 * 10 - 10), impactY, '#ffa726');
                    spawnParticles(impactX, impactY, 10, ['#ffa726','#ff8f00','#fff'], 60);
                    await Promise.all([shake(7), flashScreen('rgba(255,150,30,0.28)', 45)]);
                    let sd = drumDmg;
                    if (isP && state.aTariff > 0) sd = Math.floor(sd * 0.5);
                    if (!isP && state.pTariff > 0) sd = Math.floor(sd * 0.5);
                    if (isP && state.aShield) { sd = Math.floor(sd * 0.4); state.aShield = false; }
                    if (!isP && state.pShield) { sd = Math.floor(sd * 0.4); state.pShield = false; }
                    dmg(sd, !isP);
                    if (isP) trackDamage(sd, true);
                    trackTurn();
                    showNumber(sd, false, !isP, chain>0);
                    await delay(180);
                }
                break;
            }

            case 28: { 
                playSfx('heal');
                obj.textContent = '⚓';
                obj.classList.add(isP ? 'f-heal-p' : 'f-heal-a');
                board.appendChild(obj);
                const shantyAmt = chain > 0 ? 5 : 3;
                const shantyTurns = 3;
                const shx2 = isP ? 160 : 810, shy2 = isP ? 570 : 120;
                spawnParticles(shx2, shy2, 16, ['#80deea','#b2ebf2','#fff','#e0f7fa'], 65);
                if (isP) { state.pRegen = shantyTurns; state.pRegenAmt = shantyAmt; }
                else     { state.aRegen = shantyTurns; state.aRegenAmt = shantyAmt; }
                break;
            }

            case 29: { 
                playSfx('vampire');
                obj.textContent = '🪕';
                obj.classList.add(isP ? 'f-p2a' : 'f-a2p');
                board.appendChild(obj);
                await delay(500);
                const luteDmg  = Math.floor((total + 3) * (chain > 0 ? 1.4 : 1));
                const luteHeal = Math.floor(luteDmg * 0.55);
                spawnImpactRing(impactX, impactY, '#a5d6a7');
                spawnParticles(impactX, impactY, 16, ['#a5d6a7','#81c784','#fff','#c8e6c9'], 75);
                await Promise.all([shake(7), flashScreen('rgba(100,200,120,0.25)', 55)]);
                if (isP) { dmg(luteDmg, false); state.pHP = Math.min(75, state.pHP + luteHeal); trackDamage(luteDmg, true); trackTurn(); showNumber(luteDmg, false, false, chain>0); showNumber(luteHeal, true, true); }
                else     { dmg(luteDmg, true);  state.aHP = Math.min(75, state.aHP + luteHeal); trackTurn(); showNumber(luteDmg, false, true, chain>0); showNumber(luteHeal, true, false); }
                break;
            }

            case 30: { 
                playSfx('tariff');
                obj.textContent = '📯';
                obj.style.cssText = 'position:absolute;font-size:60px;left:44%;top:40%;';
                board.appendChild(obj);
                if (isP) {
                    state.aCurse = chain > 0 ? 2 : 1;
                    if (chain > 0) state.aTariff = Math.max(state.aTariff, 2);
                } else {
                    state.pCurse = 1;
                }
                spawnParticles(490, 335, 20, ['#7b1fa2','#ce93d8','#e040fb','#fff','#ba68c8'], 90);
                spawnImpactRing(490, 335, '#9c27b0');
                await Promise.all([shake(7), flashScreen('rgba(100,0,150,0.32)', 65)]);
                break;
            }

            case 31: { 
                playSfx('crit');
                startTrail(originX, originY, impactX, impactY, 'rgba(255,200,50,1)');
                obj.textContent = '🎺';
                obj.classList.add(isP ? 'f-p2a' : 'f-a2p');
                board.appendChild(obj);
                await delay(500);
                const baseCrescendo = Math.floor(total + 5);
                const crescendoDmg = chain === 0 ? baseCrescendo : chain === 1 ? Math.floor(baseCrescendo * 1.6) : Math.floor(baseCrescendo * 2.4);
                spawnImpactRing(impactX, impactY, '#ffd54f');
                spawnImpactRing(impactX, impactY, '#ff8f00');
                spawnParticles(impactX, impactY, 30, ['#ffd54f','#ff8f00','#fff','#ffe57a','#ffab00'], 115);
                await Promise.all([chromaImpact(), shake(chain > 0 ? 18 : 12), flashScreen('rgba(255,180,0,0.5)', 85)]);
                if (isP) {
                    let v = crescendoDmg; if (state.aTariff > 0) { trackTariffBlock(v); v = Math.floor(v*0.5); }
                    if (state.aShield) { v = Math.floor(v * 0.4); state.aShield = false; }
                    const preHP = state.aHP; dmg(v, false); trackDamage(v, true); trackTurn(); showNumber(v, false, false, chain>0);
                } else {
                    let v = crescendoDmg; if (state.pTariff > 0) v = Math.floor(v*0.5);
                    if (state.pShield) { v = Math.floor(v * 0.4); state.pShield = false; }
                    dmg(v, true); trackTurn(); showNumber(v, false, true, chain>0);
                }
                break;
            }

            

            case 32: { 
                playSfx('mirror');
                obj.textContent = '🏰';
                obj.style.cssText = 'position:absolute;font-size:64px;left:' + (isP?'12%':'78%') + ';top:' + (isP?'55%':'10%') + ';transition:opacity 0.5s;opacity:1;';
                board.appendChild(obj);
                if (isP) {
                    state.pShield = true;
                    if (state.pTariff > 0) state.pTariff = Math.max(0, state.pTariff - 1);
                    if (chain > 0) { state.pHP = Math.min(75, state.pHP + 4); showNumber(4, true, true); }
                } else {
                    state.aShield = true;
                    if (state.aTariff > 0) state.aTariff = Math.max(0, state.aTariff - 1);
                    if (chain > 0) { state.aHP = Math.min(75, state.aHP + 4); showNumber(4, true, false); }
                }
                const bwx = isP ? 160 : 810, bwy = isP ? 570 : 120;
                spawnParticles(bwx, bwy, 16, ['#b0bec5','#78909c','#cfd8dc','#fff'], 70);
                spawnImpactRing(bwx, bwy, '#90a4ae');
                await impactFrame();
                setTimeout(() => { obj.style.opacity = '0'; }, 600);
                break;
            }

            case 33: { 
                playSfx('attackSwing');
                startTrail(originX, originY, impactX, impactY, 'rgba(200,80,20,1)');
                obj.textContent = '🪓';
                obj.classList.add(isP ? 'f-p2a' : 'f-a2p');
                board.appendChild(obj);
                await delay(450);
                playSfx('attack');
                const cleaveDmg = Math.floor((total + 5) * (chain > 0 ? 1.4 : 1));
                spawnImpactRing(impactX, impactY, '#d84315');
                spawnParticles(impactX, impactY, 24, ['#d84315','#ff7043','#bf360c','#fff','#ffab91'], 100);
                await Promise.all([chromaImpact(), shake(chain > 0 ? 15 : 10), flashScreen('rgba(200,60,10,0.4)', 75)]);
                if (isP) {
                    let v = cleaveDmg; if (state.aTariff > 0) { trackTariffBlock(v); v = Math.floor(v*0.5); }
                    if (state.aShield) { v = Math.floor(v * 0.4); state.aShield = false; }
                    dmg(v, false); trackDamage(v, true); trackTurn(); showNumber(v, false, false, chain>0);
                } else {
                    let v = cleaveDmg; if (state.pTariff > 0) v = Math.floor(v*0.5);
                    if (state.pShield) { v = Math.floor(v * 0.4); state.pShield = false; }
                    dmg(v, true); trackTurn(); showNumber(v, false, true, chain>0);
                }
                break;
            }

            case 34: { 
                playSfx('heal');
                obj.textContent = '🚩';
                obj.style.cssText = 'position:absolute;font-size:60px;left:44%;top:38%;';
                board.appendChild(obj);
                const rallyAmt = chain > 0 ? 5 : 3;
                const hadPoison = isP ? state.pPoison > 0 : state.aPoison > 0;
                const hadBurn   = isP ? state.pBurn > 0   : state.aBurn > 0;
                if (isP) {
                    state.pPoison = 0; state.pBurn = 0;
                    state.pRegen = 3; state.pRegenAmt = rallyAmt;
                } else {
                    state.aPoison = 0; state.aBurn = 0;
                    state.aRegen = 3; state.aRegenAmt = rallyAmt;
                }
                if (isP && hadPoison && hadBurn) checkAchs({ rallyCleanse: true });
                const rlx = isP ? 160 : 810, rly = isP ? 570 : 120;
                spawnParticles(rlx, rly, 20, ['#ef5350','#e53935','#ffcdd2','#fff','#ffeb3b'], 80);
                spawnImpactRing(rlx, rly, '#ef5350');
                await Promise.all([shake(5), flashScreen('rgba(220,30,30,0.2)', 50)]);
                break;
            }

            case 35: { 
                playSfx('crit');
                startTrail(originX, originY, impactX, impactY, 'rgba(160,120,60,1)');
                obj.textContent = '🐴';
                obj.classList.add(isP ? 'f-p2a' : 'f-a2p');
                board.appendChild(obj);
                await delay(500);
                const destrierDmg = Math.floor((total + 9) * (chain > 0 ? 1.6 : 1));
                spawnImpactRing(impactX, impactY, '#a1887f');
                spawnImpactRing(impactX, impactY, '#6d4c41');
                spawnParticles(impactX, impactY, 30, ['#a1887f','#8d6e63','#d7ccc8','#fff','#4e342e'], 120);
                await Promise.all([chromaImpact(), shake(chain > 0 ? 20 : 14), flashScreen('rgba(120,80,30,0.45)', 85)]);
                if (isP) {
                    let v = destrierDmg; if (state.aTariff > 0) { trackTariffBlock(v); v = Math.floor(v*0.5); }
                    const preHP = state.aHP;
                    if (state.aPet > 0) { state.aPet -= v; if (state.aPet < 0) state.aPet = 0; }
                    else state.aHP -= v;
                    trackDamage(v, true); trackTurn(); showNumber(v, false, false, chain>0);
                    if (state.aHP <= 0 && preHP > 0) checkAchs({ destrierKill: true });
                } else {
                    let v = state.pTariff > 0 ? Math.floor(destrierDmg*0.5) : destrierDmg;
                    if (state.pPet > 0) { state.pPet -= v; if (state.pPet < 0) state.pPet = 0; }
                    else state.pHP -= v;
                    trackTurn(); showNumber(v, false, true, chain>0);
                }
                break;
            }

            

            case 36: { 
                playSfx('attackSwing');
                obj.textContent = '🪃';
                obj.classList.add(isP ? 'f-p2a' : 'f-a2p');
                board.appendChild(obj);
                await delay(400);
                const volleyHits = chain > 0 ? 3 : 2;
                const volleyDmg  = Math.floor(total + 2);
                for (let vv = 0; vv < volleyHits; vv++) {
                    playSfx('attack');
                    spawnImpactRing(impactX + (vv * 10 - 10), impactY, '#a5d6a7');
                    spawnParticles(impactX, impactY, 10, ['#a5d6a7','#66bb6a','#fff'], 55);
                    await Promise.all([shake(6), flashScreen('rgba(100,180,100,0.22)', 40)]);
                    let vd = volleyDmg;
                    if (isP && state.aTariff > 0) vd = Math.floor(vd * 0.5);
                    if (!isP && state.pTariff > 0) vd = Math.floor(vd * 0.5);
                    if (isP && state.aShield) { vd = Math.floor(vd * 0.4); state.aShield = false; }
                    if (!isP && state.pShield) { vd = Math.floor(vd * 0.4); state.pShield = false; }
                    dmg(vd, !isP);
                    if (isP) trackDamage(vd, true);
                    trackTurn();
                    showNumber(vd, false, !isP, chain>0);
                    await delay(160);
                }
                break;
            }

            case 37: { 
                playSfx('tariff');
                obj.textContent = '🦅';
                obj.style.cssText = 'position:absolute;font-size:60px;left:44%;top:40%;';
                board.appendChild(obj);
                if (isP) state.aTariff = chain > 0 ? 3 : 1;
                else     state.pTariff = 1;
                spawnParticles(490, 335, 16, ['#6d4c41','#a1887f','#d7ccc8','#fff'], 75);
                spawnImpactRing(490, 335, '#8d6e63');
                await impactFrame();
                break;
            }

            case 38: { 
                playSfx('mirror');
                obj.textContent = '🌿';
                obj.classList.add(isP ? 'f-p2a' : 'f-a2p');
                board.appendChild(obj);
                await delay(450);
                spawnImpactRing(impactX, impactY, '#66bb6a');
                spawnParticles(impactX, impactY, 20, ['#33691e','#558b2f','#a5d6a7','#fff','#1b5e20'], 85);
                await Promise.all([shake(7), flashScreen('rgba(50,150,50,0.3)', 55)]);
                const bramblePoisDmg = chain > 0 ? 4 : 2;
                const bramblePoisTurns = chain > 0 ? 3 : 2;
                if (isP) { state.aFreeze = chain > 0 ? 2 : 1; stackPoison('a', bramblePoisTurns, bramblePoisDmg); }
                else     { state.pFreeze = 1; stackPoison('p', 2, 2); }
                break;
            }

            case 39: { 
                playSfx('attackSwing');
                startTrail(originX, originY, impactX, impactY, 'rgba(150,200,100,1)');
                obj.textContent = '🦆';
                obj.classList.add(isP ? 'f-p2a' : 'f-a2p');
                board.appendChild(obj);
                await delay(400);
                playSfx('attack');
                const hawkDmg = Math.floor(total + 5);
                spawnImpactRing(impactX, impactY, '#aed581');
                spawnParticles(impactX, impactY, 20, ['#aed581','#7cb342','#dcedc8','#fff','#33691e'], 85);
                await Promise.all([shake(9), flashScreen('rgba(120,180,60,0.3)', 60)]);
                if (isP) {
                    let v = hawkDmg; if (state.aTariff > 0) { trackTariffBlock(v); v = Math.floor(v*0.5); }
                    if (state.aPet > 0) { state.aPet -= v; if (state.aPet < 0) state.aPet = 0; }
                    else state.aHP -= v;
                    if (chain > 0) { stackPoison('a', 3, 3); }
                    trackDamage(v, true); trackTurn(); showNumber(v, false, false, chain>0);
                } else {
                    let v = hawkDmg; if (state.pTariff > 0) v = Math.floor(v*0.5);
                    if (state.pPet > 0) { state.pPet -= v; if (state.pPet < 0) state.pPet = 0; }
                    else state.pHP -= v;
                    if (chain > 0) { stackPoison('p', 3, 3); }
                    trackTurn(); showNumber(v, false, true, chain>0);
                }
                break;
            }

            

            case 40: { 
                playSfx('poisonTick');
                obj.textContent = '🫧';
                obj.style.cssText = 'position:absolute;font-size:60px;left:44%;top:38%;';
                board.appendChild(obj);
                const miasmaDmg = chain > 0 ? 6 : 4;
                if (isP) { stackPoison('a', 3, miasmaDmg); }
                else     { stackPoison('p', 3, miasmaDmg); }
                spawnParticles(490, 335, 20, ['#558b2f','#33691e','#aed581','#ccff90','#fff'], 90);
                spawnImpactRing(490, 335, '#558b2f');
                await Promise.all([shake(5), flashScreen('rgba(60,140,30,0.3)', 55)]);
                break;
            }

            case 41: { 
                playSfx('attack');
                startTrail(originX, originY, impactX, impactY, 'rgba(80,150,40,1)');
                obj.textContent = '🦠';
                obj.classList.add(isP ? 'f-p2a' : 'f-a2p');
                board.appendChild(obj);
                await delay(450);
                const necroInit = Math.floor(total + 4);
                const necroBurn = 3;
                spawnImpactRing(impactX, impactY, '#795548');
                spawnParticles(impactX, impactY, 22, ['#795548','#4e342e','#a1887f','#fff','#d7ccc8'], 90);
                await Promise.all([shake(9), flashScreen('rgba(80,40,10,0.35)', 65)]);
                if (isP) {
                    let v = necroInit; if (state.aTariff > 0) { trackTariffBlock(v); v = Math.floor(v*0.5); }
                    if (state.aShield) { v = Math.floor(v*0.4); state.aShield = false; }
                    dmg(v, false); state.aBurn = 2; state.aBurnDmg = necroBurn;
                    if (chain > 0) { stackPoison('a', 2, 3); }
                    trackDamage(v, true); trackTurn(); showNumber(v, false, false, chain>0);
                } else {
                    let v = necroInit; if (state.pTariff > 0) v = Math.floor(v*0.5);
                    if (state.pShield) { v = Math.floor(v*0.4); state.pShield = false; }
                    dmg(v, true); state.pBurn = 2; state.pBurnDmg = necroBurn;
                    if (chain > 0) { stackPoison('p', 2, 3); }
                    trackTurn(); showNumber(v, false, true, chain>0);
                }
                break;
            }

            case 42: { 
                playSfx('poisonTick');
                obj.textContent = '💀';
                obj.style.cssText = 'position:absolute;font-size:60px;left:44%;top:38%;';
                board.appendChild(obj);
                const contagTurns = chain > 0 ? 4 : 2;
                if (isP) { stackPoison('a', contagTurns, 3); stackBurn('a', contagTurns, 2); }
                else     { stackPoison('p', contagTurns, 3); stackBurn('p', contagTurns, 2); }
                spawnParticles(490, 335, 24, ['#33691e','#ff6f00','#795548','#ccff90','#fff'], 95);
                spawnImpactRing(490, 335, '#33691e');
                spawnImpactRing(490, 335, '#ff6f00');
                await Promise.all([chromaImpact(), shake(8), flashScreen('rgba(60,100,20,0.35)', 65)]);
                break;
            }

            case 43: { 
                playSfx('poisonTick');
                startTrail(originX, originY, impactX, impactY, 'rgba(40,120,20,1)');
                obj.textContent = '⚗️';
                obj.style.cssText = 'position:absolute;font-size:60px;left:44%;top:38%;';
                board.appendChild(obj);
                if (isP) { stackPoison('a', 5, 5); }
                else     { stackPoison('p', 5, 5); }
                if (chain > 0) {
                    const pandInit = Math.floor(total + 10);
                    spawnImpactRing(impactX, impactY, '#1b5e20');
                    spawnImpactRing(impactX, impactY, '#69f0ae');
                    spawnParticles(impactX, impactY, 32, ['#1b5e20','#33691e','#69f0ae','#ccff90','#fff'], 120);
                    await Promise.all([chromaImpact(), shake(16), flashScreen('rgba(20,120,30,0.5)', 85)]);
                    if (isP) { let v = pandInit; if (state.aTariff > 0) { trackTariffBlock(v); v = Math.floor(v*0.5); } dmg(v, false); trackDamage(v, true); trackTurn(); showNumber(v, false, false, true); }
                    else     { let v = state.pTariff > 0 ? Math.floor(pandInit*0.5) : pandInit; dmg(v, true); trackTurn(); showNumber(v, false, true, true); }
                } else {
                    spawnParticles(490, 335, 26, ['#1b5e20','#33691e','#ccff90','#fff'], 100);
                    spawnImpactRing(490, 335, '#1b5e20');
                    await Promise.all([shake(9), flashScreen('rgba(20,100,20,0.38)', 70)]);
                }
                break;
            }

            

            case 44: { 
                playSfx('tariff');
                obj.textContent = '📋';
                obj.style.cssText = 'position:absolute;font-size:60px;left:44%;top:40%;';
                board.appendChild(obj);
                if (isP) state.aTariff = chain > 0 ? 5 : 3;
                else     state.pTariff = 3;
                spawnParticles(490, 335, 16, ['#b8860b','#ffd700','#fff8e1','#fff'], 80);
                spawnImpactRing(490, 335, '#b8860b');
                await Promise.all([shake(5), flashScreen('rgba(180,130,0,0.25)', 50)]);
                break;
            }

            case 45: { 
                playSfx('vampire');
                obj.textContent = '💎';
                obj.classList.add(isP ? 'f-p2a' : 'f-a2p');
                board.appendChild(obj);
                await delay(500);
                const titheTariff = isP ? state.aTariff : state.pTariff;
                const titheDmg  = Math.floor((total + 4) * (chain > 0 ? 1.4 : 1)) + titheTariff * 2;
                const titheHeal = Math.floor(titheDmg * 0.5);
                spawnImpactRing(impactX, impactY, '#ffd700');
                spawnParticles(impactX, impactY, 20, ['#ffd700','#ffb300','#fff8e1','#fff'], 85);
                await Promise.all([shake(8), flashScreen('rgba(200,160,0,0.3)', 60)]);
                if (isP) {
                    dmg(titheDmg, false); state.pHP = Math.min(75, state.pHP + titheHeal);
                    trackDamage(titheDmg, true); trackTurn();
                    if (chain > 0) { state.pRegen = 2; state.pRegenAmt = 3; }
                    showNumber(titheDmg, false, false, chain>0); showNumber(titheHeal, true, true);
                    if (titheDmg >= 15) checkAchs({ titheHit: titheDmg });
                } else {
                    dmg(titheDmg, true); state.aHP = Math.min(75, state.aHP + titheHeal);
                    trackTurn();
                    if (chain > 0) { state.aRegen = 2; state.aRegenAmt = 3; }
                    showNumber(titheDmg, false, true, chain>0); showNumber(titheHeal, true, false);
                }
                break;
            }

            case 46: { 
                playSfx('tariff');
                obj.textContent = '⚖️';
                obj.style.cssText = 'position:absolute;font-size:60px;left:44%;top:40%;';
                board.appendChild(obj);
                if (isP) {
                    state.aCurse = chain > 0 ? 2 : 1;
                    state.aTariff = Math.max(state.aTariff, chain > 0 ? 3 : 2);
                } else {
                    state.pCurse = 1;
                    state.pTariff = Math.max(state.pTariff, 2);
                }
                spawnParticles(490, 335, 20, ['#b8860b','#ffd700','#7b1fa2','#fff8e1','#fff'], 90);
                spawnImpactRing(490, 335, '#b8860b');
                spawnImpactRing(490, 335, '#9c27b0');
                await Promise.all([shake(8), flashScreen('rgba(160,100,0,0.35)', 65)]);
                break;
            }
        }
    }

    setTimeout(() => obj.remove(), 700);
    trackStatusStack();
    updateHUD();
}

async function impactFrame() {
    if (!opt('opt-shake') || opt('opt-reduced')) return;
    await flashScreen('rgba(255,255,255,0.4)', 60);
}

function dmg(a, toP) {
    if (toP) {
        if (state.pPet > 0) {
            playSfx('petHit');
            
            if (state.pHP <= a) checkAchs({ petSavedLife: true });
            state.pPet -= a;
            if (state.pPet < 0) state.pPet = 0;
        } else state.pHP -= a;
    } else {
        if (state.aPet > 0) { playSfx('petHit'); state.aPet -= a; if (state.aPet < 0) state.aPet = 0; }
        else state.aHP -= a;
    }
}


/* ═══════════════════════════════════════════════════════════════════════
   STREAMER MODE + LANGUAGE SETTING
======================================================================= */

/* ── Global flags ── */
window._streamerMode = false;
window._currentLang  = 'en';

const SUPPORTED_LANGS = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'pt', label: 'Português' },
    { code: 'it', label: 'Italiano' },
    { code: 'ru', label: 'Русский' },
    { code: 'ja', label: '日本語' },
    { code: 'ko', label: '한국어' },
    { code: 'zh', label: '中文' },
    { code: 'ar', label: 'العربية' },
    { code: 'nl', label: 'Nederlands' },
    { code: 'pl', label: 'Polski' },
    { code: 'sv', label: 'Svenska' },
    { code: 'tr', label: 'Türkçe' },
];

/* ── Apply streamer mode ── */
function applyStreamerMode(on) {
    window._streamerMode = on;
    // Tighten profanity filter
    if (typeof LeoProfanity !== 'undefined') {
        if (on) {
            LeoProfanity.loadDictionary();     // reset to full strict list
        } else {
            _applyRelaxedProfanityFilter();    // restore relaxed list
        }
    }
    // Hide/show usernames beyond 3 chars in lobby
    document.querySelectorAll('.lobby-player-name').forEach(el => {
        _applyStreamerName(el);
    });
}

/* ── Mask a display name for streamer mode ── */
function _applyStreamerName(el) {
    if (!el) return;
    const full = el.dataset.fullName || el.textContent.replace(' (you)','').trim();
    el.dataset.fullName = full;
    if (window._streamerMode && full.length > 3) {
        el.textContent = full.slice(0, 3) + '***' + (el.dataset.isSelf === 'true' ? ' (you)' : '');
    } else {
        el.textContent = full + (el.dataset.isSelf === 'true' ? ' (you)' : '');
    }
}

/* ── Apply language preference ── */
function applyLanguage(code) {
    window._currentLang = code;
    document.documentElement.lang = code;
    localStorage.setItem('dr_lang', code);
    // Placeholder — actual string translations go here when the translation
    // system is built. For now we just store the preference.
    console.log('[DR] Language set to:', code);
}

/* ── Load language setting on startup ── */
(function _loadLangSetting() {
    const saved = localStorage.getItem('dr_lang') || 'en';
    window._currentLang = saved;
    document.documentElement.lang = saved;
    // Populate any language dropdown that exists in the DOM
    window.addEventListener('DOMContentLoaded', () => {
        const sel = document.getElementById('opt-language');
        if (!sel) return;
        // Build options if not already built
        if (sel.options.length === 0) {
            SUPPORTED_LANGS.forEach(l => {
                const opt = document.createElement('option');
                opt.value = l.code;
                opt.textContent = l.label;
                sel.appendChild(opt);
            });
        }
        sel.value = saved;
    });
})();

/* ─────────────────────────────────────────────────────────────────────────
   Hook streamer mode + language into saveSettings / loadSettings.
   We patch them here so game.js doesn't need to know about these settings.
─────────────────────────────────────────────────────────────────────────── */
/* Global auto-translate flag */
window._autoTranslateChat = false;

(function _patchSettingsSave() {
    const _origSave = window.saveSettings;
    window.saveSettings = function() {
        if (_origSave) _origSave.apply(this, arguments);
        try {
            const raw = localStorage.getItem(window.SETTINGS_KEY || 'dr_settings');
            const s   = raw ? JSON.parse(raw) : {};
            s.streamerMode     = window._streamerMode;
            s.language         = window._currentLang;
            s.autoTranslate    = window._autoTranslateChat;
            localStorage.setItem(window.SETTINGS_KEY || 'dr_settings', JSON.stringify(s));
        } catch(e) {}
    };

    const _origLoad = window.loadSettings;
    window.loadSettings = function() {
        if (_origLoad) _origLoad.apply(this, arguments);
        try {
            const raw = localStorage.getItem(window.SETTINGS_KEY || 'dr_settings');
            if (!raw) return;
            const s = JSON.parse(raw);
            if (s.streamerMode != null) {
                window._streamerMode = s.streamerMode;
                const el = document.getElementById('opt-streamer-mode');
                if (el) el.checked = s.streamerMode;
                if (s.streamerMode) applyStreamerMode(true);
            }
            if (s.language) {
                applyLanguage(s.language);
                const el = document.getElementById('opt-language');
                if (el) el.value = s.language;
            }
            if (s.autoTranslate != null) {
                window._autoTranslateChat = s.autoTranslate;
                const el = document.getElementById('opt-auto-translate');
                if (el) el.checked = s.autoTranslate;
            }
        } catch(e) {}
    };
})();
