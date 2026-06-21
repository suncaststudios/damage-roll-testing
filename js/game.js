const runeSymbols = ['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛁ','ᛃ','ᛇ','ᛈ','ᛉ','ᛊ','ᛏ','ᛒ','ᛖ','ᛗ','ᛚ','ᛜ','ᛞ','ᛟ','✦','⚔','☽','★'];
const runeGrid = document.getElementById('rune-grid');
for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    el.className = 'rune-cell';
    el.textContent = runeSymbols[Math.floor(Math.random() * runeSymbols.length)];
    el.style.left = (Math.random() * 100) + '%';
    el.style.top = (Math.random() * 100) + '%';
    el.style.setProperty('--rd', (3 + Math.random() * 6) + 's');
    el.style.setProperty('--delay', -(Math.random() * 8) + 's');
    el.style.fontSize = (14 + Math.random() * 18) + 'px';
    runeGrid.appendChild(el);
}

let _graphicsQuality  = 'mid';      

let _gameOverFired = false;
let _forfeited     = false;
let _aiActTimer    = null;
let _pWasLow = false, _aWasLow = false;
let _cardDark      = 0;             

const emberCanvas = document.getElementById('embers');
const eCtx = emberCanvas.getContext('2d');
const embers = [];

function resizeEmberCanvas() {
    emberCanvas.width  = window.innerWidth;
    emberCanvas.height = window.innerHeight;
}
resizeEmberCanvas();
window.addEventListener('resize', resizeEmberCanvas);

function spawnEmber() {
    const hue = 20 + Math.random() * 30; // orange to gold
    return {
        x: Math.random() * window.innerWidth, y: window.innerHeight + 10,
        r: Math.random() * 2.5 + 0.8,
        dx: (Math.random() - 0.5) * 1.8,
        dy: -(Math.random() * 2.2 + 0.6),
        life: 1, decay: Math.random() * 0.003 + 0.0015,
        hue
    };
}
for (let i = 0; i < 60; i++) {
    const e = spawnEmber();
    e.y = Math.random() * window.innerHeight;
    e.life = Math.random();
    embers.push(e);
}
function animEmbers() {
    eCtx.clearRect(0, 0, emberCanvas.width, emberCanvas.height);
    
    const targetCount = _graphicsQuality === 'high' ? 120 : _graphicsQuality === 'low' ? 0 : 60;
    while (embers.length < targetCount) { const e = spawnEmber(); e.y = Math.random() * window.innerHeight; e.life = Math.random(); embers.push(e); }
    while (embers.length > targetCount) embers.pop();
    embers.forEach((e, idx) => {
        e.x += e.dx; e.y += e.dy; e.life -= e.decay;
        if (e.life <= 0) { embers[idx] = spawnEmber(); return; }
        const g = eCtx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 2.2);
        g.addColorStop(0, `hsla(${e.hue + 10}, 90%, 65%, ${e.life * 0.55})`);
        g.addColorStop(0.5, `hsla(${e.hue}, 80%, 35%, ${e.life * 0.3})`);
        g.addColorStop(1, 'transparent');
        eCtx.beginPath(); eCtx.arc(e.x, e.y, e.r * 2.2, 0, Math.PI * 2);
        eCtx.fillStyle = g; eCtx.fill();
    });
    requestAnimationFrame(animEmbers);
}
animEmbers();

/* ── CARD CURSOR TILT (tilts toward cursor within right panel) ── */
(function() {
    const card = document.getElementById('menu-float-card');
    if (!card) return;
    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;

    window.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const cx = rect.left + rect.width  / 2;
        const cy = rect.top  + rect.height / 2;
        const nx = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth  * 0.3)));
        const ny = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight * 0.3)));
        targetY =  nx * 22;
        targetX = -ny * 22;
    });

    function loop() {
        currentX += (targetX - currentX) * 0.08;
        currentY += (targetY - currentY) * 0.08;
        card.style.transform = `rotateX(${currentX}deg) rotateY(${currentY}deg)`;
        requestAnimationFrame(loop);
    }
    loop();
})();

const trailCanvas = document.getElementById('trail-canvas');
const tCtx = trailCanvas.getContext('2d');
let activeTrail = null;

function startTrail(sx, sy, ex, ey, color) {
    activeTrail = { sx, sy, ex, ey, color, t: 0 };
}
function animTrail() {
    tCtx.clearRect(0, 0, 980, 670);
    if (activeTrail) {
        const tr = activeTrail; tr.t = Math.min(tr.t + 0.07, 1);
        const cx = tr.sx + (tr.ex - tr.sx) * tr.t;
        const cy = tr.sy + (tr.ey - tr.sy) * tr.t;
        const g = tCtx.createLinearGradient(tr.sx, tr.sy, cx, cy);
        g.addColorStop(0, 'transparent');
        g.addColorStop(0.3, tr.color.replace('1)', '0.15)'));
        g.addColorStop(1, tr.color);
        tCtx.beginPath(); tCtx.moveTo(tr.sx, tr.sy); tCtx.lineTo(cx, cy);
        tCtx.strokeStyle = g; tCtx.lineWidth = 4;
        tCtx.shadowColor = tr.color; tCtx.shadowBlur = 14; tCtx.stroke(); tCtx.shadowBlur = 0;
        if (tr.t >= 1) setTimeout(() => { activeTrail = null; }, 150);
    }
    requestAnimationFrame(animTrail);
}
animTrail();

let AC = null, muted = false, musicVol = .4, sfxVol = .7;
let _musicNodes = null;

function getAC() {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    return AC;
}

function masterGain(vol) {
    const g = getAC().createGain();
    g.gain.setValueAtTime(muted ? 0 : vol, AC.currentTime);
    g.connect(AC.destination);
    return g;
}

function osc(type, freq, start, end, dur, gainVal, dest) {
    const ac = getAC(), now = ac.currentTime;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, now + start);
    if (end !== null) o.frequency.exponentialRampToValueAtTime(end, now + start + dur);
    g.gain.setValueAtTime(0, now + start);
    g.gain.linearRampToValueAtTime(gainVal, now + start + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
    o.connect(g); g.connect(dest);
    o.start(now + start); o.stop(now + start + dur + 0.01);
    return o;
}

function noise(dur, gainVal, filterFreq, dest) {
    const ac = getAC(), now = ac.currentTime;
    const bufLen = ac.sampleRate * dur;
    const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const filt = ac.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = filterFreq;
    filt.Q.value = 0.8;
    const g = ac.createGain();
    g.gain.setValueAtTime(gainVal, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(filt); filt.connect(g); g.connect(dest);
    src.start(now); src.stop(now + dur);
}

function punchDest(vol) {
    const ac = getAC();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.knee.value = 3;
    comp.ratio.value = 8;
    comp.attack.value = 0.001;
    comp.release.value = 0.08;
    const g = ac.createGain();
    g.gain.setValueAtTime(muted ? 0 : vol, ac.currentTime);
    comp.connect(g); g.connect(ac.destination);
    return comp;
}

const SFX = {

    cardHover() {
        const dest = masterGain(sfxVol * 0.3);
        osc('triangle', 1800, 0, 900, 0.06, 0.08, dest);
        noise(0.04, 0.12, 4000, dest);
    },

    play() {
        const dest = punchDest(sfxVol * 0.85);
        osc('triangle', 800,  0,    180, 0.14, 0.45, dest);
        osc('sine',     350,  0,    100, 0.14, 0.35, dest);
        osc('square',   220,  0,    60,  0.10, 0.3,  dest);
        noise(0.10, 0.55, 1800, dest);
        noise(0.05, 0.35, 600,  dest);
    },

    dice() {
        const dest = punchDest(sfxVol * 0.9);
        osc('square',   800, 0,    200, 0.04, 0.6, dest);
        osc('triangle', 400, 0,    80,  0.06, 0.4, dest);
        noise(0.09, 0.7, 3500, dest);
        noise(0.07, 0.5, 1200, dest);
        noise(0.12, 0.3, 400,  dest);
    },

    dieLand() {
        const dest = punchDest(sfxVol * 1.0);
        osc('sine',     90,  0,    30,  0.18, 0.8, dest); 
        osc('triangle', 180, 0,    50,  0.12, 0.5, dest);
        noise(0.12, 0.6, 800,  dest);
        noise(0.06, 0.4, 3000, dest);
    },

    attackSwing() {
        const dest = punchDest(sfxVol * 0.8);
        osc('sawtooth', 600, 0, 80, 0.16, 0.45, dest);
        osc('triangle', 400, 0, 60, 0.12, 0.35, dest);
        noise(0.10, 0.5, 2500, dest);
    },

    attack() {
        const dest = punchDest(sfxVol * 1.1);
        osc('sawtooth', 240, 0,    35,  0.26, 0.7, dest);
        osc('square',   120, 0,    30,  0.32, 0.6, dest);
        osc('triangle', 480, 0.01, 80,  0.18, 0.45,dest);
        osc('sine',     55,  0,    18,  0.22, 0.8, dest); 
        osc('sawtooth', 360, 0.02, 50,  0.14, 0.5, dest); 
        noise(0.22, 0.90, 1500, dest);
        noise(0.14, 0.70, 400,  dest);
        noise(0.08, 0.45, 6000, dest); 
    },

    mirror() {
        const dest = punchDest(sfxVol * 0.75);
        [2093, 2637, 3136, 1760].forEach((f, i) =>
            osc('sine', f, i * 0.03, f * 0.5, 0.3, 0.22, dest));
        noise(0.08, 0.4, 5000, dest);
        osc('triangle', 3500, 0, 800, 0.12, 0.18, dest);
    },

    mirrorTrigger() {
        const dest = punchDest(sfxVol * 0.9);
        osc('square',   1200, 0,    200, 0.08, 0.5, dest);
        osc('sawtooth', 600,  0,    2400,0.12, 0.25,dest); 
        [1047, 1319, 1568].forEach((f, i) =>
            osc('sine', f, 0.05 + i * 0.04, f * 1.8, 0.25, 0.18, dest));
        noise(0.1, 0.55, 4000, dest);
    },

    heal() {
        const dest = punchDest(sfxVol * 0.8);
        const notes = [523, 659, 784, 1047, 1319];
        notes.forEach((f, i) => {
            osc('sine',     f,     i * 0.06, f * 1.6, 0.4, 0.32, dest);
            osc('triangle', f * 2, i * 0.06, f * 3,   0.3, 0.10, dest);
        });
        noise(0.06, 0.2, 8000, dest); 
    },

    vampire() {
        const dest = punchDest(sfxVol * 0.85);
        osc('sawtooth', 600,  0,    80,  0.20, 0.5, dest);
        osc('sine',     300,  0,    40,  0.16, 0.6, dest);
        osc('triangle', 1200, 0,    200, 0.12, 0.4, dest);
        noise(0.18, 0.6, 900,  dest);
        osc('sine',     200,  0.15, 800, 0.25, 0.3, dest);
        osc('triangle', 400,  0.18, 1600,0.20, 0.2, dest);
    },

    tariff() {
        const dest = punchDest(sfxVol * 0.8);
        osc('square',   150, 0,    100, 0.22, 0.55,dest); 
        osc('sine',     80,  0,    60,  0.18, 0.6, dest); 
        noise(0.15, 0.5, 600,  dest); 
        noise(0.08, 0.3, 3000, dest); 
        osc('triangle', 300, 0.06, 200, 0.10, 0.35,dest);
    },

    plague() {
        const dest = punchDest(sfxVol * 0.8);
        noise(0.25, 0.6, 400,  dest); 
        noise(0.15, 0.4, 1200, dest);
        noise(0.08, 0.3, 200,  dest); 
        osc('sawtooth', 120, 0,    60,  0.14, 0.5, dest);
        osc('triangle', 240, 0.05, 80,  0.12, 0.4, dest);
        osc('sine',     80,  0,    40,  0.16, 0.55,dest);
    },

    poisonTick() {
        const dest = punchDest(sfxVol * 0.55);
        osc('sawtooth', 200, 0, 80,  0.12, 0.35, dest);
        noise(0.08, 0.35, 500, dest);
        osc('sine',     100, 0, 50,  0.10, 0.3,  dest);
    },

    pet() {
        const dest = punchDest(sfxVol * 1.0);
        osc('sawtooth', 110, 0,    55,  0.35, 0.7, dest);
        osc('sawtooth', 220, 0,    110, 0.28, 0.6, dest);
        osc('square',   165, 0,    82,  0.22, 0.55,dest);
        osc('sine',     55,  0,    30,  0.30, 0.8, dest); 
        noise(0.3,  0.7, 800,  dest);
        noise(0.15, 0.4, 3000, dest);
        osc('sawtooth', 180, 0.1, 90, 0.30, 0.6, dest);
    },

    petHit() {
        const dest = punchDest(sfxVol * 0.75);
        osc('sawtooth', 160, 0,    80,  0.18, 0.45, dest);
        noise(0.12, 0.55, 1000, dest);
        osc('sine',     60,  0,    30,  0.16, 0.5,  dest);
    },

    crit() {
        const dest = punchDest(sfxVol * 1.15);
        osc('sawtooth', 110, 0,    880,  0.42, 0.65, dest);
        osc('square',   165, 0,    1320, 0.36, 0.58, dest);
        osc('sawtooth', 220, 0,    1760, 0.34, 0.52, dest);
        osc('triangle', 440, 0,    3520, 0.26, 0.42, dest);
        osc('sawtooth', 330, 0.02, 2640, 0.20, 0.38, dest); 
        osc('sine',     880,  0.04, 3520, 0.24, 0.38, dest);
        osc('sine',     1760, 0.06, 7040, 0.20, 0.28, dest);
        osc('sine',     3520, 0.08, 7040, 0.12, 0.18, dest); 
        osc('sine',     50,  0,    18,   0.55, 0.45, dest);
        osc('sine',     38,  0,    14,   0.48, 0.40, dest);
        noise(0.22, 1.0, 5000, dest);
        noise(0.14, 0.8, 1200, dest);
        noise(0.10, 0.6, 300,  dest);
    },

    fail() {
        const dest = punchDest(sfxVol * 1.0);
        osc('sawtooth', 520, 0,    38,  0.34, 0.65, dest);
        osc('square',   260, 0,    28,  0.32, 0.58, dest);
        osc('sawtooth', 370, 0.03, 22,  0.28, 0.52, dest);
        osc('sawtooth', 180, 0.06, 18,  0.24, 0.48, dest);
        osc('sawtooth', 90,  0.08, 14,  0.20, 0.44, dest); 
        osc('sine',     75,  0,    22,  0.38, 0.65, dest); 
        noise(0.28, 0.85, 900,  dest);
        noise(0.18, 0.55, 250,  dest);
        noise(0.10, 0.45, 3500, dest);
    },

    selfHit() {
        const dest = punchDest(sfxVol * 0.9);
        osc('square',   300, 0,    50,  0.25, 0.6,  dest);
        osc('sine',     100, 0,    30,  0.22, 0.55, dest);
        noise(0.18, 0.7, 1000, dest);
        noise(0.10, 0.5, 300,  dest);
    },

    hpLow() {
        const dest = masterGain(sfxVol * 0.45);
        osc('sine',     220, 0,    200, 0.3, 0.3, dest);
        osc('triangle', 110, 0,    100, 0.3, 0.25,dest);
    },

    victory() {
        const dest = punchDest(sfxVol * 0.9);
        const melody = [523, 659, 784, 1047, 1319, 1047, 1319, 1568];
        melody.forEach((f, i) => {
            osc('triangle', f,     i * 0.11, f * 1.2,  0.32, 0.32, dest);
            osc('sine',     f * 2, i * 0.11, f * 2.4,  0.22, 0.14, dest);
            osc('square',   f * 0.5, i * 0.12, f * 0.6, 0.10, 0.22, dest); 
        });
        [261.6, 329.6, 392, 523].forEach((f, i) => {
            osc('sine', f, 0.05 + i * 0.04, f * 1.1, 0.18, 0.5, dest);
        });
        osc('sine', 55, 0, 28, 0.7, 0.6, dest);
        noise(0.12, 0.4, 6000, dest);
    },

    defeat() {
        const dest = punchDest(sfxVol * 0.9);
        [440, 349, 262, 196, 147, 110].forEach((f, i) => {
            osc('sawtooth', f,     i * 0.15, f * 0.45, 0.50, 0.30, dest);
            osc('sine',     f * 2, i * 0.17, f * 0.90, 0.20, 0.20, dest);
        });
        osc('sine', 220, 0.5,  218, 0.6, 1.2, dest);
        osc('sine', 110, 0.52, 108, 0.5, 1.0, dest);
        osc('sine', 55,  0,    18,  0.9, 0.7, dest);
        noise(0.35, 0.5, 400, dest);
    },

    menuHover() {
        const dest = masterGain(sfxVol * 0.28);
        osc('triangle', 1400, 0,    1000, 0.07, 0.14, dest);
        osc('sine',     2100, 0.01, 1500, 0.04, 0.10, dest);
        noise(0.03, 0.12, 5000, dest);
    },

    menuClick() {
        const dest = punchDest(sfxVol * 0.60);
        osc('square',   700, 0,    250, 0.10, 0.32, dest);
        osc('triangle', 1050,0,    500, 0.08, 0.22, dest);
        osc('sine',     350, 0,    150, 0.12, 0.28, dest);
        noise(0.07, 0.35, 3000, dest);
    },

    aiThink() {
        const dest = masterGain(sfxVol * 0.2);
        osc('triangle', 400, 0, 300, 0.05, 0.08, dest);
        noise(0.04, 0.1, 2000, dest);
    },

    aiReveal() {
        const dest = punchDest(sfxVol * 0.65);
        osc('triangle', 500, 0,    1200, 0.12, 0.25, dest);
        osc('sine',     800, 0.04, 1600, 0.10, 0.2,  dest);
        noise(0.08, 0.35, 3500, dest);
    },

    turnStart() {
        const dest = masterGain(sfxVol * 0.40);
        osc('sine',     880,  0,    1320, 0.18, 0.20, dest);
        osc('triangle', 1320, 0.05, 1760, 0.13, 0.17, dest);
        osc('sine',     440,  0,    660,  0.10, 0.22, dest); 
    },

    cardDeal() {
        const dest = masterGain(sfxVol * 0.32);
        osc('triangle', 1100, 0,    450, 0.09, 0.10, dest);
        osc('sine',     700,  0.01, 300, 0.06, 0.09, dest);
        noise(0.07, 0.18, 4000, dest);
        noise(0.04, 0.10, 800,  dest);
    },
};

let _customMusicUrl = '';
let _customAudioEl = null;   

function _getOrCreateAudioEl() {
    if (!_customAudioEl) {
        _customAudioEl = new Audio();
        _customAudioEl.loop = true;
        
        
    }
    return _customAudioEl;
}

function startCustomAudio() {
    if (muted || !_customMusicUrl) return;
    const el = _getOrCreateAudioEl();
    el.loop = true; 
    if (el.src !== _customMusicUrl) el.src = _customMusicUrl;
    el.volume = musicVol;
    el.play().catch(err => { console.warn('[CustomAudio] play() failed:', err); });
}

function stopCustomAudio(fade) {
    if (!_customAudioEl) return;
    if (fade) {
        const el = _customAudioEl;
        const step = () => {
            el.volume = Math.max(0, el.volume - 0.05);
            if (el.volume > 0) setTimeout(step, 40); else { el.pause(); el.volume = musicVol; }
        };
        step();
    } else {
        _customAudioEl.pause();
    }
}

function isCustomAudioPlaying() {
    return _customAudioEl && !_customAudioEl.paused;
}

function _setTestBtnState(playing) {
    const btnTest = document.getElementById('btn-test-audio');
    const btnStop = document.getElementById('btn-stop-audio');
    if (btnTest) btnTest.style.display = playing ? 'none' : '';
    if (btnStop) btnStop.style.display = playing ? '' : 'none';
}

function stopTestCustomMusic() {
    stopCustomAudio(false);
    _setTestBtnState(false);
    const status = document.getElementById('custom-music-status');
    if (status) { status.textContent = ''; }
    const onBattle = document.getElementById('board')?.style.display === 'block';
    try { if (onBattle) startBgAudio(); else startMenuAudio(); } catch(e) {}
}

function testCustomMusic() {
    const url = document.getElementById('opt-custom-music-url')?.value.trim();
    const status = document.getElementById('custom-music-status');
    if (!url) { if (status) { status.textContent = 'Paste a URL first.'; status.style.color = '#c62828'; } return; }

    stopMenuAudio();
    stopBgAudio();

    if (_customAudioEl) { _customAudioEl.pause(); _customAudioEl.src = ''; }
    _customAudioEl = null;
    const el = _getOrCreateAudioEl();

    el.volume = musicVol;
    if (status) { status.textContent = 'Loading\u2026'; status.style.color = '#a07840'; }

    el.onerror = () => {
        el.onerror = null;
        console.warn('[CustomAudio] onerror fired for URL:', url);
        if (status) { status.textContent = 'Could not load URL. Check it\'s a direct audio link.'; status.style.color = '#c62828'; }
        _setTestBtnState(false);
        try { startMenuAudio(); } catch(e) {}
    };

    el.src = url;

    el.play().then(() => {
        if (status) { status.textContent = '\u25b6 Playing \u2014 click Apply to save'; status.style.color = '#6b9a40'; }
        _setTestBtnState(true);
    }).catch(err => {
        console.warn('[CustomAudio] test play() failed:', err);
        if (status) { status.textContent = 'Blocked by browser. Try a different source.'; status.style.color = '#c62828'; }
        _setTestBtnState(false);
        try { startMenuAudio(); } catch(e) {}
    });
}

const _origSetMusicVol = window.setMusicVol;

let _menuMusicNodes = null;

function startMenuAudio() {
    if (typeof _menuTrack !== 'undefined' && _menuTrack === 99) return startCustomAudio();
    if (typeof _menuTrack !== 'undefined' && _menuTrack === 1) return startMenuAudioTrack1();
    if (typeof _menuTrack !== 'undefined' && _menuTrack === 2) return startMenuAudioTrack2();
    if (typeof _menuTrack !== 'undefined' && _menuTrack === 3) return startMenuAudioTrack3();
    if (muted) return;
    const ac = getAC();
    if (_menuMusicNodes) return;

    const master = ac.createGain();
    master.gain.setValueAtTime(0, ac.currentTime);
    master.gain.linearRampToValueAtTime(musicVol * 0.59, ac.currentTime + 2.0);
    master.connect(ac.destination);
    _menuMusicNodes = { master, oscs: [], intervals: [] };

    
    const subPad = ac.createOscillator(); const subG = ac.createGain();
    const subFilt = ac.createBiquadFilter(); subFilt.type = 'lowpass'; subFilt.frequency.value = 80;
    subPad.type = 'sine'; subPad.frequency.value = 36.7; subG.gain.value = 0.22;
    subPad.connect(subFilt); subFilt.connect(subG); subG.connect(master);
    subPad.start(); _menuMusicNodes.oscs.push(subPad);

    
    const padFreqs = [73.4, 110, 146.8, 220, 293.7, 184.9];
    padFreqs.forEach((freq, i) => {
        const o = ac.createOscillator();
        const g = ac.createGain();
        const f = ac.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = 500 + i * 100;
        o.type = i % 3 === 0 ? 'triangle' : (i % 3 === 1 ? 'sine' : 'sawtooth');
        o.frequency.value = freq;
        g.gain.value = [0.20, 0.14, 0.12, 0.09, 0.07, 0.05][i];
        o.connect(f); f.connect(g); g.connect(master);
        o.start(); _menuMusicNodes.oscs.push(o);
    });

    
    const lfo = ac.createOscillator();
    const lfoG = ac.createGain();
    lfo.frequency.value = 0.12; lfoG.gain.value = 0.07;
    lfo.connect(lfoG); lfoG.connect(master.gain);
    lfo.start(); _menuMusicNodes.oscs.push(lfo);

    
    const lfo2 = ac.createOscillator();
    const lfo2G = ac.createGain();
    lfo2.frequency.value = 0.07; lfo2G.gain.value = 0.4;
    lfo2.connect(lfo2G);
    padFreqs.slice(0,2).forEach((_, i) => {
        if (_menuMusicNodes.oscs[i]) lfo2G.connect(_menuMusicNodes.oscs[i].frequency);
    });
    lfo2.start(); _menuMusicNodes.oscs.push(lfo2);

    
    const harpPhrases = [
        [293.7, 0], [349.2, 0.9], [392.0, 1.7], [440.0, 2.8],
        [392.0, 4.2], [349.2, 5.1], [329.6, 6.3], [293.7, 7.8],
        [261.6, 9.0], [293.7, 10.5], [349.2, 12.0], [392.0, 13.2],
        [440.0, 15.0], [523.3, 16.5], [440.0, 18.0], [392.0, 19.8],
    ];
    const phraseDuration = 22;

    function playHarpPhrase() {
        if (!_menuMusicNodes) return;
        const now = ac.currentTime;
        harpPhrases.forEach(([freq, t]) => {
            const o = ac.createOscillator();
            const g = ac.createGain();
            const f = ac.createBiquadFilter();
            f.type = 'lowpass'; f.frequency.value = 2000;
            o.type = 'triangle'; o.frequency.value = freq;
            g.gain.setValueAtTime(0, now + t);
            g.gain.linearRampToValueAtTime(0.18, now + t + 0.025);
            g.gain.exponentialRampToValueAtTime(0.0001, now + t + 1.4);
            o.connect(f); f.connect(g); g.connect(master);
            o.start(now + t); o.stop(now + t + 1.5);
        });
        const tid = setTimeout(playHarpPhrase, phraseDuration * 1000);
        _menuMusicNodes.intervals.push(tid);
    }
    playHarpPhrase();

    function playBell() {
        if (!_menuMusicNodes) return;
        const now = ac.currentTime;
        [146.8, 220, 293.7].forEach((freq, i) => {
            const o = ac.createOscillator();
            const g = ac.createGain();
            o.type = 'sine'; o.frequency.value = freq;
            g.gain.setValueAtTime(0, now + i * 0.04);
            g.gain.linearRampToValueAtTime(0.12, now + i * 0.04 + 0.01);
            g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.04 + 3.5);
            o.connect(g); g.connect(master);
            o.start(now + i * 0.04); o.stop(now + i * 0.04 + 4);
        });
        const tid = setTimeout(playBell, 8000 + Math.random() * 4000);
        _menuMusicNodes.intervals.push(tid);
    }
    setTimeout(playBell, 3000);

    
    
    const celloNotes = [73.4, 55, 87.3, 65.4, 58.3, 87.3, 55, 73.4];
    let celloIdx = 0;
    function playCello() {
        if (!_menuMusicNodes) return;
        const freq = celloNotes[celloIdx % celloNotes.length];
        celloIdx++;
        const now = ac.currentTime;
        const o = ac.createOscillator(); const g = ac.createGain();
        const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600;
        o.type = 'sawtooth'; o.frequency.value = freq * (1 + (Math.random() * 0.004 - 0.002));
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.16, now + 0.12);
        g.gain.setValueAtTime(0.14, now + 1.2);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);
        o.connect(f); f.connect(g); g.connect(master);
        o.start(now); o.stop(now + 2.1);
        const tid = setTimeout(playCello, 1800 + Math.random() * 200);
        _menuMusicNodes.intervals.push(tid);
    }
    setTimeout(playCello, 1500);

    
    function playChoir() {
        if (!_menuMusicNodes) return;
        const now = ac.currentTime;
        [[146.8, 0.09], [220, 0.07], [293.7, 0.05], [176.0, 0.06]].forEach(([freq, vol], i) => {
            const o = ac.createOscillator(); const g = ac.createGain();
            o.type = 'sine'; o.frequency.value = freq * (1 + i * 0.003); 
            g.gain.setValueAtTime(0, now + i * 0.1);
            g.gain.linearRampToValueAtTime(vol, now + i * 0.1 + 1.5);
            g.gain.setValueAtTime(vol, now + i * 0.1 + 4.0);
            g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 7.5);
            o.connect(g); g.connect(master);
            o.start(now + i * 0.1); o.stop(now + i * 0.1 + 8);
        });
        const tid = setTimeout(playChoir, 12000 + Math.random() * 5000);
        _menuMusicNodes.intervals.push(tid);
    }
    setTimeout(playChoir, 6000);
}

function stopMenuAudio() {
    if (_customAudioEl) { _customAudioEl.pause(); }
    if (!_menuMusicNodes) return;
    const nodes = _menuMusicNodes;
    _menuMusicNodes = null;
    try {
        nodes.master.gain.linearRampToValueAtTime(0, AC.currentTime + 0.8);
        nodes.intervals.forEach(t => clearTimeout(t));
        setTimeout(() => {
            nodes.oscs.forEach(o => { try { o.stop(); } catch(e){} });
        }, 900);
    } catch(e) {}
}

function startBgAudio() {
    if (typeof _battleTrack !== 'undefined' && _battleTrack === 99) return startCustomAudio();
    if (typeof _battleTrack !== 'undefined' && _battleTrack === 1) return startBgAudioTrack1();
    if (typeof _battleTrack !== 'undefined' && _battleTrack === 2) return startBgAudioTrack2();
    if (typeof _battleTrack !== 'undefined' && _battleTrack === 3) return startBgAudioTrack3();
    if (muted) return;
    const ac = getAC();
    if (_musicNodes) return; 

    const master = ac.createGain();
    master.gain.setValueAtTime(musicVol * 0.72, ac.currentTime);
    master.connect(ac.destination);
    _musicNodes = { master, oscs: [], intervals: [] };

    
    const conv = ac.createConvolver();
    const iLen = ac.sampleRate * 1.2;
    const irBuf = ac.createBuffer(2, iLen, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const d = irBuf.getChannelData(ch);
        for (let i = 0; i < iLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / iLen, 2.5);
    }
    conv.buffer = irBuf;
    const convGain = ac.createGain(); convGain.gain.value = 0.18;
    conv.connect(convGain); convGain.connect(master);

    
    function makeDrone(freq, type, vol, toConv) {
        const o = ac.createOscillator();
        const g = ac.createGain();
        const filt = ac.createBiquadFilter();
        filt.type = 'lowpass'; filt.frequency.value = 900;
        o.type = type; o.frequency.value = freq;
        g.gain.value = vol;
        o.connect(filt); filt.connect(g); g.connect(master);
        if (toConv) g.connect(conv);
        o.start(); _musicNodes.oscs.push(o);
        return o;
    }
    makeDrone(55,  'sawtooth', 0.18, true);
    makeDrone(82.4,'sawtooth', 0.13, true);
    makeDrone(110, 'triangle', 0.10, false);
    makeDrone(55,  'sine',     0.22, false);
    makeDrone(165, 'sine',     0.06, false); 

    
    const lfo = ac.createOscillator();
    const lfoGain = ac.createGain();
    lfo.frequency.value = 0.25; lfoGain.gain.value = 0.06;
    lfo.connect(lfoGain); lfoGain.connect(master.gain);
    lfo.start(); _musicNodes.oscs.push(lfo);

    
    const lfo2 = ac.createOscillator();
    const lfo2G = ac.createGain();
    lfo2.frequency.value = 0.08; lfo2G.gain.value = 300;
    lfo2.connect(lfo2G);
    lfo2.start(); _musicNodes.oscs.push(lfo2);

    
    
    const melodyNotes = [110, 130.8, 146.8, 164.8, 196, 220, 261.6, 246.9, 220, 196, 164.8, 146.8, 130.8, 110, 130.8, 164.8];
    let noteIdx = 0;

    function playMelodyNote() {
        if (!_musicNodes) return;
        const freq = melodyNotes[noteIdx % melodyNotes.length];
        noteIdx++;

        const o  = ac.createOscillator();
        const g  = ac.createGain();
        const f  = ac.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = 1400;
        o.type = 'triangle'; o.frequency.value = freq;
        const now = ac.currentTime;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.13, now + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);
        o.connect(f); f.connect(g); g.connect(master); g.connect(conv);
        o.start(now); o.stop(now + 1.4);

        const o2 = ac.createOscillator();
        const g2 = ac.createGain();
        o2.type = 'sine'; o2.frequency.value = freq * 1.5;
        g2.gain.setValueAtTime(0, now + 0.02);
        g2.gain.linearRampToValueAtTime(0.05, now + 0.08);
        g2.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);
        o2.connect(g2); g2.connect(master);
        o2.start(now + 0.02); o2.stop(now + 1.1);

        const interval = noteIdx % 4 === 0 ? 1100 : (noteIdx % 2 === 0 ? 700 : 550);
        const tid = setTimeout(playMelodyNote, interval);
        _musicNodes.intervals.push(tid);
    }
    setTimeout(playMelodyNote, 400);

    const counterNotes = [73.4, 82.4, 55, 73.4, 98, 82.4, 65.4, 55];
    let cIdx = 0;
    function playCounter() {
        if (!_musicNodes) return;
        const freq = counterNotes[cIdx % counterNotes.length];
        cIdx++;
        const o = ac.createOscillator();
        const g = ac.createGain();
        const f = ac.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = 500;
        o.type = 'sawtooth'; o.frequency.value = freq;
        const now = ac.currentTime;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.09, now + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
        o.connect(f); f.connect(g); g.connect(master); g.connect(conv);
        o.start(now); o.stop(now + 1.0);
        const tid = setTimeout(playCounter, 950 + Math.random() * 300);
        _musicNodes.intervals.push(tid);
    }
    setTimeout(playCounter, 1400);

    
    const drumBeat = 60 / 70;
    const drumEighth = drumBeat / 2;

    function battleKick(t) {
        const o = ac.createOscillator(); const g = ac.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(140, t);
        o.frequency.exponentialRampToValueAtTime(35, t + 0.1);
        g.gain.setValueAtTime(musicVol * 0.72, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        o.connect(g); g.connect(ac.destination);
        o.start(t); o.stop(t + 0.25);
    }

    function battleSnare(t) {
        const bufLen = Math.floor(ac.sampleRate * 0.18);
        const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 1.2);
        const src = ac.createBufferSource(); src.buffer = buf;
        const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.7;
        const g = ac.createGain(); g.gain.setValueAtTime(musicVol * 0.36, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        src.connect(f); f.connect(g); g.connect(ac.destination);
        src.start(t); src.stop(t + 0.20);
    }

    function drumPattern() {
        if (!_musicNodes) return;
        const now = ac.currentTime;
        battleKick(now);
        battleKick(now + drumBeat * 2);
        battleSnare(now + drumBeat);
        battleSnare(now + drumBeat * 3);
        battleKick(now + drumBeat * 3 + drumEighth);
        const tid = setTimeout(drumPattern, drumBeat * 4 * 1000);
        _musicNodes.intervals.push(tid);
    }
    setTimeout(drumPattern, 600);
    function playPerc() {
        if (!_musicNodes) return;
        const now = ac.currentTime;
        const ob = ac.createOscillator();
        const gb = ac.createGain();
        ob.type = 'sine'; ob.frequency.setValueAtTime(100, now);
        ob.frequency.exponentialRampToValueAtTime(30, now + 0.12);
        gb.gain.setValueAtTime(0.28, now);
        gb.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        ob.connect(gb); gb.connect(master);
        ob.start(now); ob.stop(now + 0.25);

        const tid = setTimeout(playPerc, 1600 + Math.random() * 400);
        _musicNodes.intervals.push(tid);
    }
    setTimeout(playPerc, 800);

    function playHat() {
        if (!_musicNodes) return;
        const now = ac.currentTime;
        const buf = ac.createBuffer(1, ac.sampleRate * 0.06, ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const src = ac.createBufferSource();
        src.buffer = buf;
        const bp = ac.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 6000; bp.Q.value = 1.5;
        const gh = ac.createGain();
        gh.gain.setValueAtTime(0.12, now);
        gh.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
        src.connect(bp); bp.connect(gh); gh.connect(master);
        src.start(now); src.stop(now + 0.07);
        const tid = setTimeout(playHat, 800 + Math.random() * 200);
        _musicNodes.intervals.push(tid);
    }
    setTimeout(playHat, 1200);
}

function stopBgAudio() {
    if (_customAudioEl) { _customAudioEl.pause(); }
    if (_battleTrack !== 99 && false) { stopCustomAudio(true); return; } 
    if (!_musicNodes) return;
    try {
        _musicNodes.intervals.forEach(t => clearTimeout(t));
        _musicNodes.master.gain.setValueAtTime(_musicNodes.master.gain.value, AC.currentTime);
        _musicNodes.master.gain.linearRampToValueAtTime(0, AC.currentTime + 0.3);
        const nodes = _musicNodes;
        setTimeout(() => {
            nodes.oscs.forEach(o => { try { o.stop(); } catch(e){} });
        }, 320);
    } catch(e) {}
    _musicNodes = null;
}

function playSfx(key) {
    if (muted || !SFX[key] || _forfeited) return;
    try { SFX[key](); } catch(e) {}
}

function setMusicVol(v) {
    musicVol = Math.max(0, Math.min(1, v / 100));
    const t = AC ? AC.currentTime : 0;
    if (_musicNodes) {
        _musicNodes.master.gain.cancelScheduledValues(t);
        _musicNodes.master.gain.setValueAtTime(musicVol * 0.72, t);
    }
    if (_menuMusicNodes) {
        _menuMusicNodes.master.gain.cancelScheduledValues(t);
        _menuMusicNodes.master.gain.setValueAtTime(musicVol * 0.59, t);
    }
    if (_customAudioEl) _customAudioEl.volume = musicVol;
    saveSettings();
}
function setSfxVol(v) { sfxVol = Math.max(0, Math.min(1.3, (v / 100) * 1.3)); saveSettings(); }

let _difficulty       = 'normal';   
let _aiThink          = 'normal';   
let _critMult         = 2.2;        

const SETTINGS_KEY = 'dr_settings';

const THEMES = ['default','space','aero','cyberpunk','scourge','wiki'];
let _currentTheme  = 'default'; 
let _pendingTheme  = 'default'; 

function _syncThemeSwatches(theme) {
    document.querySelectorAll('#opt-theme-picker .theme-swatch').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
    const hint = document.getElementById('theme-hint');
    if (hint) hint.textContent = theme === 'default'
        ? 'Changes the main color palette — applies on click of Apply'
        : 'Theme: ' + theme.charAt(0).toUpperCase() + theme.slice(1) + ' — click Apply to confirm';
}

function selectTheme(theme) {
    
    _pendingTheme = theme;
    _syncThemeSwatches(theme);
}

function applyTheme(theme) {
    _currentTheme = theme || 'default';
    _pendingTheme = _currentTheme;
    THEMES.forEach(t => document.body.classList.remove('theme-' + t));
    if (_currentTheme !== 'default') document.body.classList.add('theme-' + _currentTheme);
    _syncThemeSwatches(_currentTheme);

    
    const urlInput = document.getElementById('opt-custom-music-url');
    const testBtn  = document.getElementById('btn-test-audio');
    const stopBtn  = document.getElementById('btn-stop-audio');

    const themeStyles = {
        default:   { inputBg:'rgba(10,5,0,0.85)',      inputBorder:'rgba(100,65,20,0.5)',    inputColor:'#e8c87a', btnBg:'rgba(30,15,3,0.9)',    btnBorder:'rgba(120,80,20,0.5)',   btnColor:'#c8a460' },
        space:     { inputBg:'rgba(2,4,18,0.9)',        inputBorder:'rgba(60,80,200,0.5)',    inputColor:'#a0b8f0', btnBg:'rgba(4,6,24,0.92)',    btnBorder:'rgba(60,80,200,0.5)',   btnColor:'#8090d0' },
        aero:      { inputBg:'rgba(200,230,255,0.55)',  inputBorder:'rgba(100,180,255,0.6)',  inputColor:'#004488', btnBg:'rgba(180,220,255,0.5)', btnBorder:'rgba(80,160,240,0.6)',  btnColor:'#0055aa' },
        cyberpunk: { inputBg:'rgba(5,0,18,0.9)',        inputBorder:'rgba(255,0,120,0.5)',    inputColor:'#ff80cc', btnBg:'rgba(8,0,22,0.92)',    btnBorder:'rgba(255,0,120,0.5)',   btnColor:'#ff40a0' },
        scourge:   { inputBg:'rgba(8,0,4,0.9)',         inputBorder:'rgba(160,20,80,0.5)',    inputColor:'#e060a0', btnBg:'rgba(12,0,6,0.92)',    btnBorder:'rgba(160,20,80,0.5)',   btnColor:'#c04080' },
        wiki:      { inputBg:'rgba(248,249,250,0.95)',  inputBorder:'rgba(162,169,177,0.7)',  inputColor:'#202122', btnBg:'rgba(240,241,242,0.95)',btnBorder:'rgba(162,169,177,0.7)', btnColor:'#202122' },
    };
    const ts = themeStyles[_currentTheme] || themeStyles.default;
    if (urlInput) {
        urlInput.style.background    = ts.inputBg;
        urlInput.style.borderColor   = ts.inputBorder;
        urlInput.style.color         = ts.inputColor;
    }
    if (testBtn) {
        testBtn.style.background   = ts.btnBg;
        testBtn.style.borderColor  = ts.btnBorder;
        testBtn.style.color        = ts.btnColor;
    }
    if (stopBtn) {
        stopBtn.style.background   = ts.btnBg;
    }
}

window.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('#opt-theme-picker .theme-swatch').forEach(btn => {
        btn.addEventListener('click', function() {
            playSfx('menuClick');
            selectTheme(this.dataset.theme);
        });
    });
});

window.addEventListener('DOMContentLoaded', function() {
    if (typeof loadSettings === 'function') loadSettings();
});

function saveSettings() {
    try {
        const s = {
            musicVol: Math.round(musicVol * 100),
            sfxVol:   Math.round(sfxVol * 100),
            shake:    document.getElementById('opt-shake')?.checked ?? true,
            critpop:  document.getElementById('opt-critpop')?.checked ?? true,
            particles:document.getElementById('opt-particles')?.checked ?? true,
            reduced:  document.getElementById('opt-reduced')?.checked ?? false,
            rarityGlow: document.getElementById('opt-rarity-glow')?.checked ?? true,
            speed:    parseFloat(document.getElementById('opt-speed')?.value ?? '1'),
            difficulty: _difficulty,
            aiThink:  _aiThink,
            menuTrack:   _menuTrack,
            battleTrack: _battleTrack,
            critMult:    Math.round(_critMult * 10),
            berserkerNerf: document.getElementById('opt-berserker-nerf')?.checked ?? false,
            muteBlur:    document.getElementById('opt-mute-blur')?.checked ?? false,
            colorblind:  document.getElementById('opt-colorblind')?.checked ?? false,
            skipForfeit: document.getElementById('opt-skip-forfeit')?.checked ?? false,
            combatLog:   document.getElementById('opt-combat-log')?.checked ?? false,
            uiScale:     parseInt(document.getElementById('opt-ui-scale')?.value ?? '10'),
            highContrast: document.getElementById('opt-high-contrast')?.checked ?? false,
            customMusicUrl: document.getElementById('opt-custom-music-url')?.value.trim() ?? '',
            graphicsQuality: _graphicsQuality,
            cardDark: _cardDark,
            updateLog: document.getElementById('opt-update-log')?.checked ?? true,
            skipIntro: document.getElementById('opt-skip-intro')?.checked ?? false,
            theme: _currentTheme,
};
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
        localStorage.setItem('dr_skip_intro', s.skipIntro ? 'true' : 'false');
    } catch(e) {}
}

function loadSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) return;
        const s = JSON.parse(raw);

        if (s.musicVol != null) {
            musicVol = s.musicVol / 100;
            const el = document.getElementById('v-m');
            if (el) el.value = s.musicVol;
        }
        if (s.sfxVol != null) {
            sfxVol = s.sfxVol / 100;
            const el = document.getElementById('v-s');
            if (el) el.value = s.sfxVol;
        }

        const boxes = { 'opt-shake': 'shake', 'opt-critpop': 'critpop', 'opt-particles': 'particles', 'opt-reduced': 'reduced', 'opt-rarity-glow': 'rarityGlow' };
        for (const [id, key] of Object.entries(boxes)) {
            const el = document.getElementById(id);
            if (el && s[key] != null) el.checked = s[key];
        }
        applyRarityGlow();

        if (s.speed != null) {
            const el = document.getElementById('opt-speed');
            if (el) {
                el.value = s.speed;
                const lbl = document.getElementById('speed-label');
                if (lbl) lbl.textContent = s.speed.toFixed(1) + '×';
            }
        }

        if (s.difficulty) setDifficulty(s.difficulty);
        if (s.aiThink)    setAiThink(s.aiThink);

        if (s.menuTrack   != null) setMenuTrack(s.menuTrack);
        if (s.battleTrack != null) setBattleTrack(s.battleTrack);

        if (s.critMult != null) {
            _critMult = s.critMult / 10;
            const el = document.getElementById('opt-crit-mult');
            if (el) el.value = s.critMult;
            const lbl = document.getElementById('crit-dmg-label');
            if (lbl) lbl.textContent = _critMult.toFixed(1) + '×';
        }

        
        if (s.berserkerNerf != null) {
            const el = document.getElementById('opt-berserker-nerf');
            if (el) el.checked = s.berserkerNerf;
        }

        const qolBoxes = { 'opt-mute-blur': 'muteBlur', 'opt-colorblind': 'colorblind', 'opt-skip-forfeit': 'skipForfeit', 'opt-combat-log': 'combatLog', 'opt-high-contrast': 'highContrast' };
        for (const [id, key] of Object.entries(qolBoxes)) {
            const el = document.getElementById(id);
            if (el && s[key] != null) el.checked = s[key];
        }
        if (s.colorblind) applyColorblind();
        if (s.highContrast) applyHighContrast();
        toggleCombatLog();

        if (s.customMusicUrl) {
            _customMusicUrl = s.customMusicUrl;
            const el = document.getElementById('opt-custom-music-url');
            if (el) el.value = s.customMusicUrl;
        }

        if (s.uiScale != null) {
            const el = document.getElementById('opt-ui-scale');
            if (el) { el.value = s.uiScale; applyUIScale(s.uiScale); }
        }

        if (s.graphicsQuality) applyGraphicsQuality(s.graphicsQuality);
        if (s.cardDark != null) applyCardDark(s.cardDark);

        if (s.theme) applyTheme(s.theme);
if (s.updateLog != null) {
            const el = document.getElementById('opt-update-log');
            if (el) el.checked = s.updateLog;
            applyUpdateLog(s.updateLog);
        }
        if (s.skipIntro != null) {
            const el = document.getElementById('opt-skip-intro');
            if (el) el.checked = s.skipIntro;
            localStorage.setItem('dr_skip_intro', s.skipIntro ? 'true' : 'false');
        }

    } catch(e) {}
}

function previewDifficulty(val) {
    document.querySelectorAll('#opt-difficulty .settings-opt-btn').forEach(b => b.classList.toggle('active', b.dataset.val === val));
    const hints = { easy: 'AI crits reduced ~70% · AI deals less damage', normal: 'AI crits reduced ~45%', hard: 'No AI crit penalty · AI deals full damage' };
    const el = document.getElementById('difficulty-hint');
    if (el) el.textContent = hints[val] || '';
}

function previewAiThink(val) {
    document.querySelectorAll('#opt-ai-think .settings-opt-btn').forEach(b => b.classList.toggle('active', b.dataset.val === val));
}

function previewGraphics(val) {
    document.querySelectorAll('#opt-graphics .settings-opt-btn').forEach(b => b.classList.toggle('active', b.dataset.val === val));
    const hints = {
        low:  'Fewer effects — better performance',
        mid:  'Balanced — default experience',
        high: 'More textures & animations — slight GPU cost'
    };
    const el = document.getElementById('graphics-hint');
    if (el) el.textContent = hints[val] || '';
}

const _texRegistry = new Map(); 

function _preloadTexture(url) {
    if (_texRegistry.has(url)) return;
    const img = new Image();
    img.src = url; 
    _texRegistry.set(url, img);
}

function _unloadTexture(url) {
    const img = _texRegistry.get(url);
    if (!img) return;
    img.src = ''; 
    _texRegistry.delete(url);
}

function _setTextures(urls) {
    const newSet = new Set(urls);
    for (const url of [..._texRegistry.keys()]) {
        if (!newSet.has(url)) _unloadTexture(url);
    }
    for (const url of urls) _preloadTexture(url);
}

const _TEX = {
    low:  [],
    mid:  [
        'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj4KICA8ZmlsdGVyIGlkPSJub2lzZSI+CiAgICA8ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC42NSIgbnVtT2N0YXZlcz0iMyIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPgogICAgPGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPgogICAgPGZlQmxlbmQgaW49IlNvdXJjZUdyYXBoaWMiIG1vZGU9Im11bHRpcGx5Ii8+CiAgPC9maWx0ZXI+CiAgPGZpbHRlciBpZD0iZ3JhaW4iPgogICAgPGZlVHVyYnVsZW5jZSB0eXBlPSJ0dXJidWxlbmNlIiBiYXNlRnJlcXVlbmN5PSIwLjkiIG51bU9jdGF2ZXM9IjQiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz4KICAgIDxmZUNvbG9yTWF0cml4IHR5cGU9Im1hdHJpeCIgdmFsdWVzPSIwIDAgMCAwIDAuNTUgIDAgMCAwIDAgMC40MiAgMCAwIDAgMCAwLjIyICAwIDAgMCAwLjE4IDAiLz4KICA8L2ZpbHRlcj4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0idHJhbnNwYXJlbnQiLz4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsdGVyPSJ1cmwoI2dyYWluKSIgb3BhY2l0eT0iMSIvPgo8L3N2Zz4=',
        'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj4KICA8ZmlsdGVyIGlkPSJ3b29kIj4KICAgIDxmZVR1cmJ1bGVuY2UgdHlwZT0iZnJhY3RhbE5vaXNlIiBiYXNlRnJlcXVlbmN5PSIwLjAxNSAwLjgiIG51bU9jdGF2ZXM9IjQiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz4KICAgIDxmZUNvbG9yTWF0cml4IHR5cGU9Im1hdHJpeCIgdmFsdWVzPSIwIDAgMCAwIDAuMDggIDAgMCAwIDAgMC4wNCAgMCAwIDAgMCAwLjAxICAwIDAgMCAwLjM1IDAiLz4KICA8L2ZpbHRlcj4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0idHJhbnNwYXJlbnQiLz4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsdGVyPSJ1cmwoI3dvb2QpIiBvcGFjaXR5PSIxIi8+Cjwvc3ZnPg==',
    ],
    high: [
        'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj4KICA8ZmlsdGVyIGlkPSJ3b29kIj4KICAgIDxmZVR1cmJ1bGVuY2UgdHlwZT0iZnJhY3RhbE5vaXNlIiBiYXNlRnJlcXVlbmN5PSIwLjAxNSAwLjgiIG51bU9jdGF2ZXM9IjQiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz4KICAgIDxmZUNvbG9yTWF0cml4IHR5cGU9Im1hdHJpeCIgdmFsdWVzPSIwIDAgMCAwIDAuMDggIDAgMCAwIDAgMC4wNCAgMCAwIDAgMCAwLjAxICAwIDAgMCAwLjM1IDAiLz4KICA8L2ZpbHRlcj4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0idHJhbnNwYXJlbnQiLz4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsdGVyPSJ1cmwoI3dvb2QpIiBvcGFjaXR5PSIxIi8+Cjwvc3ZnPg==',
        'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIj4KICA8ZmlsdGVyIGlkPSJhc2YiPgogICAgPGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuNCIgbnVtT2N0YXZlcz0iMyIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPgogICAgPGZlQ29sb3JNYXRyaXggdHlwZT0ibWF0cml4IiB2YWx1ZXM9IjAgMCAwIDAgMC4wICAwIDAgMCAwIDAuMCAgMCAwIDAgMCAwLjAgIDAgMCAwIDAuMjIgMCIvPgogIDwvZmlsdGVyPgogIDxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWxsPSJ0cmFuc3BhcmVudCIvPgogIDxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWx0ZXI9InVybCgjYXNmKSIgb3BhY2l0eT0iMSIvPgo8L3N2Zz4=',
        'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj4KICA8ZmlsdGVyIGlkPSJub2lzZSI+CiAgICA8ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC42NSIgbnVtT2N0YXZlcz0iMyIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPgogICAgPGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPgogICAgPGZlQmxlbmQgaW49IlNvdXJjZUdyYXBoaWMiIG1vZGU9Im11bHRpcGx5Ii8+CiAgPC9maWx0ZXI+CiAgPGZpbHRlciBpZD0iZ3JhaW4iPgogICAgPGZlVHVyYnVsZW5jZSB0eXBlPSJ0dXJidWxlbmNlIiBiYXNlRnJlcXVlbmN5PSIwLjkiIG51bU9jdGF2ZXM9IjQiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz4KICAgIDxmZUNvbG9yTWF0cml4IHR5cGU9Im1hdHJpeCIgdmFsdWVzPSIwIDAgMCAwIDAuNTUgIDAgMCAwIDAgMC40MiAgMCAwIDAgMCAwLjIyICAwIDAgMCAwLjE4IDAiLz4KICA8L2ZpbHRlcj4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0idHJhbnNwYXJlbnQiLz4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsdGVyPSJ1cmwoI2dyYWluKSIgb3BhY2l0eT0iMSIvPgo8L3N2Zz4=',
        'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIj4KICA8ZmlsdGVyIGlkPSJwYXBlciI+CiAgICA8ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44NSIgbnVtT2N0YXZlcz0iNiIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPgogICAgPGZlQ29sb3JNYXRyaXggdHlwZT0ibWF0cml4IiB2YWx1ZXM9IjAgMCAwIDAgMC41ICAwIDAgMCAwIDAuMzggIDAgMCAwIDAgMC4xOCAgMCAwIDAgMC4xMiAwIi8+CiAgPC9maWx0ZXI+CiAgPHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiIGZpbGw9InRyYW5zcGFyZW50Ii8+CiAgPHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiIGZpbHRlcj0idXJsKCNwYXBlcikiIG9wYWNpdHk9IjEiLz4KPC9zdmc+',
        'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIj4KICA8ZmlsdGVyIGlkPSJwYXBlciI+CiAgICA8ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44NSIgbnVtT2N0YXZlcz0iNiIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPgogICAgPGZlQ29sb3JNYXRyaXggdHlwZT0ibWF0cml4IiB2YWx1ZXM9IjAgMCAwIDAgMC41ICAwIDAgMCAwIDAuMzggIDAgMCAwIDAgMC4xOCAgMCAwIDAgMC4xMiAwIi8+CiAgPC9maWx0ZXI+CiAgPHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiIGZpbGw9InRyYW5zcGFyZW50Ii8+CiAgPHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiIGZpbHRlcj0idXJsKCNwYXBlcikiIG9wYWNpdHk9IjEiLz4KPC9zdmc+',
        'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIj4KICA8ZmlsdGVyIGlkPSJsZWF0aCI+CiAgICA8ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC41IiBudW1PY3RhdmVzPSI1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+CiAgICA8ZmVDb2xvck1hdHJpeCB0eXBlPSJtYXRyaXgiIHZhbHVlcz0iMCAwIDAgMCAwLjA2ICAwIDAgMCAwIDAuMDMgIDAgMCAwIDAgMC4wMSAgMCAwIDAgMC4yOCAwIi8+CiAgPC9maWx0ZXI+CiAgPHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiIGZpbGw9InRyYW5zcGFyZW50Ii8+CiAgPHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiIGZpbHRlcj0idXJsKCNsZWF0aCkiIG9wYWNpdHk9IjEiLz4KPC9zdmc+',
    ],
};

applyGraphicsQuality('mid');

function applyGraphicsQuality(val) {
    _graphicsQuality = val || 'mid';
    previewGraphics(_graphicsQuality);

    
    _setTextures(_TEX[_graphicsQuality] || []);

    
    document.body.classList.remove('gfx-low', 'gfx-mid', 'gfx-high');
    document.body.classList.add('gfx-' + _graphicsQuality);

    const embersEl     = document.getElementById('embers');
    const runeGridEl   = document.getElementById('rune-grid');
    const sigilEl      = document.getElementById('title-sigil');
    const sigilInnerEl = document.getElementById('title-sigil-inner');
    const candleEls    = document.querySelectorAll('.candle-glow');
    const fieldLineEl  = document.getElementById('field-line');
    const gc           = document.getElementById('game-container');

    if (_graphicsQuality === 'low') {
        if (embersEl)     embersEl.style.display     = 'none';
        if (runeGridEl)   runeGridEl.style.display   = 'none';
        if (sigilEl)      sigilEl.style.display      = 'none';
        if (sigilInnerEl) sigilInnerEl.style.display = 'none';
        candleEls.forEach(c => c.style.display = 'none');
        if (fieldLineEl)  fieldLineEl.style.opacity  = '0';
        if (gc) gc.style.filter = '';
        
        const glowStyle = document.getElementById('rarity-glow-style');
        if (glowStyle) glowStyle.disabled = true;
    } else if (_graphicsQuality === 'mid') {
        if (embersEl)     embersEl.style.display     = '';
        if (runeGridEl)   runeGridEl.style.display   = '';
        if (sigilEl)      sigilEl.style.display      = '';
        if (sigilInnerEl) sigilInnerEl.style.display = '';
        candleEls.forEach(c => c.style.display = '');
        if (fieldLineEl)  fieldLineEl.style.opacity  = '';
        if (gc) gc.style.filter = '';
        
        const glowStyle = document.getElementById('rarity-glow-style');
        const glowOn = document.getElementById('opt-rarity-glow')?.checked ?? true;
        if (glowStyle) glowStyle.disabled = !glowOn;
    } else if (_graphicsQuality === 'high') {
        if (embersEl)     embersEl.style.display     = '';
        if (runeGridEl)   runeGridEl.style.display   = '';
        if (sigilEl)      sigilEl.style.display      = '';
        if (sigilInnerEl) sigilInnerEl.style.display = '';
        candleEls.forEach(c => c.style.display = '');
        if (fieldLineEl)  fieldLineEl.style.opacity  = '';
        if (gc) gc.style.filter = ''; 
        const glowStyle = document.getElementById('rarity-glow-style');
        const glowOn = document.getElementById('opt-rarity-glow')?.checked ?? true;
        if (glowStyle) glowStyle.disabled = !glowOn;
        

    }
    saveSettings();
}

function setDifficulty(val) {
    _difficulty = val;
    previewDifficulty(val);
    saveSettings();
}

function setAiThink(val) {
    _aiThink = val;
    previewAiThink(val);
    saveSettings();
}

function setCritMult(v) {
    _critMult = parseFloat(v) / 10;
    const lbl = document.getElementById('crit-dmg-label');
    if (lbl) lbl.textContent = _critMult.toFixed(1) + '×';
    saveSettings();
}

function stackPoison(target, turns, dmg) {
    
    const kTurns = target === 'p' ? 'pPoison'    : 'aPoison';
    const kDmg   = target === 'p' ? 'pPoisonDmg' : 'aPoisonDmg';
    state[kTurns] = (state[kTurns] || 0) + turns;
    state[kDmg]   = Math.max(state[kDmg] || 0, dmg);
}
function stackBurn(target, turns, dmg) {
    const kTurns = target === 'p' ? 'pBurn'    : 'aBurn';
    const kDmg   = target === 'p' ? 'pBurnDmg' : 'aBurnDmg';
    state[kTurns] = (state[kTurns] || 0) + turns;
    state[kDmg]   = Math.max(state[kDmg] || 0, dmg);
}

function applyRarityGlow() {
    const show = document.getElementById('opt-rarity-glow')?.checked ?? true;
    const style = document.getElementById('rarity-glow-style');
    if (style) style.disabled = !show;
    saveSettings();
}

function applyHighContrast() {
    const on = document.getElementById('opt-high-contrast')?.checked ?? false;
    document.body.classList.toggle('high-contrast', on);
    saveSettings();
}

function applyCardDark(val) {
    _cardDark = parseInt(val) || 0;
    document.documentElement.style.setProperty('--card-dark', _cardDark);
    const lbl = document.getElementById('card-dark-label');
    if (lbl) lbl.textContent = _cardDark;
    const el = document.getElementById('opt-card-dark');
    if (el) el.value = _cardDark;
    saveSettings();
}

let _menuTrack   = 0;   
let _battleTrack = 0;   

function setMenuTrack(val) {
    _menuTrack = parseInt(val);
    const sel = document.getElementById('opt-menu-track');
    if (sel) sel.value = _menuTrack;
    saveSettings();
}

function setBattleTrack(val) {
    _battleTrack = parseInt(val);
    const sel = document.getElementById('opt-battle-track');
    if (sel) sel.value = _battleTrack;
    saveSettings();
}

function applyAndReloadSettings() {
    playSfx('menuClick');
    _applySkipIntroSetting();

    setMusicVol(document.getElementById('v-m')?.value ?? 40);
    setSfxVol(document.getElementById('v-s')?.value ?? 70);

    _customMusicUrl = document.getElementById('opt-custom-music-url')?.value.trim() ?? '';

    if (_customAudioEl) { _customAudioEl.pause(); _customAudioEl.src = ''; _customAudioEl = null; }
    if (_menuMusicNodes) { stopMenuAudio(); }
    if (_musicNodes) { stopBgAudio(); }
    const newMenuTrack = parseInt(document.getElementById('opt-menu-track')?.value ?? 0);
    const newBattleTrack = parseInt(document.getElementById('opt-battle-track')?.value ?? 0);
    const menuTrackChanged = newMenuTrack !== _menuTrack;
    const battleTrackChanged = newBattleTrack !== _battleTrack;
    _menuTrack = newMenuTrack;
    _battleTrack = newBattleTrack;

    const diffBtn = document.querySelector('#opt-difficulty .settings-opt-btn.active');
    if (diffBtn) _difficulty = diffBtn.dataset.val;
    const thinkBtn = document.querySelector('#opt-ai-think .settings-opt-btn.active');
    if (thinkBtn) _aiThink = thinkBtn.dataset.val;

    _critMult = parseFloat(document.getElementById('opt-crit-mult')?.value ?? 22) / 10;

    applyRarityGlow();

    applyHighContrast();

    applyColorblind();

    toggleCombatLog();

    applyUIScale(document.getElementById('opt-ui-scale')?.value ?? 10);

    const gfxBtn = document.querySelector('#opt-graphics .settings-opt-btn.active');
    if (gfxBtn) applyGraphicsQuality(gfxBtn.dataset.val);

    applyCardDark(document.getElementById('opt-card-dark')?.value ?? 0);

    if (typeof setDiscordRPC === 'function') setDiscordRPC(document.getElementById('opt-discord-rpc')?.checked ?? true);

    applyUpdateLog();

    applyTheme(_pendingTheme);

    saveSettings();

    if (_customAudioEl && !(_menuTrack === 99 || _battleTrack === 99)) {
        stopCustomAudio(false);
    }
    _setTestBtnState(false);
    const status = document.getElementById('custom-music-status');
    if (status) status.textContent = '';

    const onMenuScreen   = document.getElementById('menu-main')?.style.display !== 'none';
    const onBattleScreen = document.getElementById('board')?.style.display === 'block';
    if (onMenuScreen) {
        stopMenuAudio();
        stopCustomAudio(false);
        setTimeout(() => { try { startMenuAudio(); } catch(e){} }, 400);
    } else if (onBattleScreen) {
        stopBgAudio();
        stopCustomAudio(false);
        setTimeout(() => { try { startBgAudio(); } catch(e){} }, 400);
    }

    const flash = document.getElementById('flash-overlay');
    if (flash) { flash.style.opacity = '0.4'; setTimeout(() => { flash.style.opacity = '0'; }, 120); }

    const hint = document.getElementById('settings-apply-hint');
    if (hint) {
        hint.textContent = '✦ Applied!';
        hint.style.color = '#a8c87a';
        hint.style.opacity = '1';
        setTimeout(() => { hint.style.opacity = '0'; hint.textContent = ''; }, 800);
    }
    // Return to main menu after applying
    setTimeout(() => {
        toggle('menu-settings', false);
    }, 900);
}

function startMenuAudioTrack1() {
    if (muted) return;
    const ac = getAC();
    if (_menuMusicNodes) return;
    const master = ac.createGain();
    master.gain.setValueAtTime(0, ac.currentTime);
    master.gain.linearRampToValueAtTime(musicVol * 0.65, ac.currentTime + 0.8);
    master.connect(ac.destination);
    _menuMusicNodes = { master, oscs: [], intervals: [] };

    
    [[220, 0.11], [330, 0.07], [440, 0.05]].forEach(([freq, vol]) => {
        const o = ac.createOscillator(); const g = ac.createGain();
        const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800;
        o.type = 'sawtooth'; o.frequency.value = freq; g.gain.value = vol;
        o.connect(f); f.connect(g); g.connect(master);
        o.start(); _menuMusicNodes.oscs.push(o);
    });

    
    
    const beat = 60 / 140;
    const sixteenth = beat / 4;
    
    const accentPattern = [0.18, 0.07, 0.12, 0.07,  0.18, 0.07, 0.12, 0.07,
                            0.18, 0.07, 0.12, 0.07,  0.18, 0.07, 0.12, 0.07];
    const phraseLen = 16 * sixteenth; 

    function playOstinato() {
        if (!_menuMusicNodes) return;
        const now = ac.currentTime;
        accentPattern.forEach((vol, step) => {
            const t = now + step * sixteenth;
            const o = ac.createOscillator(); const g = ac.createGain();
            o.type = 'sawtooth'; o.frequency.value = 220; 
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(vol, t + 0.008);
            g.gain.exponentialRampToValueAtTime(0.0001, t + sixteenth * 0.85);
            o.connect(g); g.connect(master);
            o.start(t); o.stop(t + sixteenth);
        });
        const tid = setTimeout(playOstinato, phraseLen * 1000);
        _menuMusicNodes.intervals.push(tid);
    }
    playOstinato();

    
    
    const melNotes = [
        [440,0],[494,1],[523,2],[587,3],[659,4],[587,5],[523,6],[494,7],
        [440,8],[392,9],[349,10],[330,11],[294,12],[330,13],[349,14],[440,15]
    ];
    const eighth = beat / 2;
    const melLen = 16 * eighth;

    function playMelody() {
        if (!_menuMusicNodes) return;
        const now = ac.currentTime;
        melNotes.forEach(([freq, step]) => {
            const t = now + step * eighth;
            const o = ac.createOscillator(); const g = ac.createGain();
            const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 3000;
            o.type = 'triangle'; o.frequency.value = freq;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.13, t + 0.012);
            g.gain.exponentialRampToValueAtTime(0.0001, t + eighth * 0.9);
            o.connect(f); f.connect(g); g.connect(master);
            o.start(t); o.stop(t + eighth);
        });
        const tid = setTimeout(playMelody, melLen * 1000);
        _menuMusicNodes.intervals.push(tid);
    }
    playMelody();

    
    const bassNotes = [[110,0],[82.4,beat],[87.3,beat*2],[82.4,beat*3]];
    const bassLen = beat * 4;
    function playBass() {
        if (!_menuMusicNodes) return;
        const now = ac.currentTime;
        bassNotes.forEach(([freq, t]) => {
            const o = ac.createOscillator(); const g = ac.createGain();
            const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
            o.type = 'sawtooth'; o.frequency.value = freq;
            g.gain.setValueAtTime(0, now + t);
            g.gain.linearRampToValueAtTime(0.20, now + t + 0.015);
            g.gain.exponentialRampToValueAtTime(0.0001, now + t + beat * 0.8);
            o.connect(f); f.connect(g); g.connect(master);
            o.start(now + t); o.stop(now + t + beat);
        });
        const tid = setTimeout(playBass, bassLen * 1000);
        _menuMusicNodes.intervals.push(tid);
    }
    playBass();
}

function startMenuAudioTrack2() {
    if (muted) return;
    const ac = getAC();
    if (_menuMusicNodes) return;
    const master = ac.createGain();
    master.gain.setValueAtTime(0, ac.currentTime);
    master.gain.linearRampToValueAtTime(musicVol * 0.59, ac.currentTime + 1.2);
    master.connect(ac.destination);
    _menuMusicNodes = { master, oscs: [], intervals: [] };

    
    function pluck(freq, t, vol, dur) {
        const o = ac.createOscillator(); const g = ac.createGain();
        const f = ac.createBiquadFilter(); f.type = 'highshelf'; f.frequency.value = 2000; f.gain.value = 8;
        o.type = 'square'; o.frequency.value = freq;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(f); f.connect(g); g.connect(master);
        o.start(t); o.stop(t + dur + 0.01);
    }

    
    const beat = 60 / 96;
    const eighth = beat / 2;

    
    
    const soprano = [
        587, 659, 740, 784, 880, 784, 740, 659,
        587, 740, 880, 1175, 880, 740, 659, 587
    ];
    
    const alto = [
        494, 554, 622, 659, 740, 659, 622, 554,
        494, 622, 740, 988, 740, 622, 554, 494
    ];
    
    const bass = [
        [147, 0], [220, beat], [147, beat*2], [220, beat*3],
        [147, beat*4], [185, beat*5], [220, beat*6], [294, beat*7]
    ];
    const phraseLen = 16 * eighth;

    function playPhrase() {
        if (!_menuMusicNodes) return;
        const now = ac.currentTime;
        soprano.forEach((freq, i) => pluck(freq, now + i * eighth, 0.14, eighth * 0.85));
        alto.forEach((freq, i)    => pluck(freq, now + i * eighth, 0.09, eighth * 0.80));
        bass.forEach(([freq, t])  => pluck(freq, now + t,          0.18, beat * 0.75));
        const tid = setTimeout(playPhrase, phraseLen * 1000);
        _menuMusicNodes.intervals.push(tid);
    }
    playPhrase();

    function toll() {
        if (!_menuMusicNodes) return;
        const now = ac.currentTime;
        [[294, 0.30], [440, 0.18], [587, 0.10]].forEach(([freq, vol], i) => {
            const o = ac.createOscillator(); const g = ac.createGain();
            o.type = 'sine'; o.frequency.value = freq;
            g.gain.setValueAtTime(0, now + i * 0.06);
            g.gain.linearRampToValueAtTime(vol, now + i * 0.06 + 0.01);
            g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.06 + 5.0);
            o.connect(g); g.connect(master);
            o.start(now + i * 0.06); o.stop(now + i * 0.06 + 5.5);
        });
        const tid = setTimeout(toll, phraseLen * 8 * 1000);
        _menuMusicNodes.intervals.push(tid);
    }
    toll();
}

function startMenuAudioTrack3() {
    if (muted) return;
    const ac = getAC();
    if (_menuMusicNodes) return;
    const master = ac.createGain();
    master.gain.setValueAtTime(0, ac.currentTime);
    master.gain.linearRampToValueAtTime(musicVol * 0.62, ac.currentTime + 1.0);
    master.connect(ac.destination);
    _menuMusicNodes = { master, oscs: [], intervals: [] };

    const bpm = 90;
    const beat = 60 / bpm;
    const barLen = beat * 3; 

    
    [[73.4,0.12],[87.3,0.09],[110,0.08],[146.8,0.07]].forEach(([freq,vol]) => {
        const o = ac.createOscillator(); const g = ac.createGain();
        const f = ac.createBiquadFilter(); f.type='lowpass'; f.frequency.value=700;
        o.type='triangle'; o.frequency.value=freq; g.gain.value=vol;
        o.connect(f); f.connect(g); g.connect(master);
        o.start(); _menuMusicNodes.oscs.push(o);
    });

    
    
    const waltzBassPattern = [
        [73.4,0],[55,beat],[55,beat*2],
        [87.3,barLen],[65.4,barLen+beat],[65.4,barLen+beat*2],
        [58.3,barLen*2],[43.7,barLen*2+beat],[43.7,barLen*2+beat*2],
        [55,barLen*3],[82.4,barLen*3+beat],[82.4,barLen*3+beat*2],
    ];
    const bassPhaseLen = barLen * 4;
    function playWaltzBass() {
        if (!_menuMusicNodes) return;
        const now = ac.currentTime;
        waltzBassPattern.forEach(([freq,t]) => {
            const o = ac.createOscillator(); const g = ac.createGain();
            const f = ac.createBiquadFilter(); f.type='lowpass'; f.frequency.value=350;
            o.type='sawtooth'; o.frequency.value=freq;
            g.gain.setValueAtTime(0, now+t);
            g.gain.linearRampToValueAtTime(t % barLen === 0 ? 0.22 : 0.10, now+t+0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, now+t+beat*0.85);
            o.connect(f); f.connect(g); g.connect(master);
            o.start(now+t); o.stop(now+t+beat);
        });
        const tid = setTimeout(playWaltzBass, bassPhaseLen * 1000);
        _menuMusicNodes.intervals.push(tid);
    }
    playWaltzBass();

    
    
    const melPhrase = [
        [587,0],[523,beat],[466,beat*2],
        [440,barLen],[392,barLen+beat],[349,barLen+beat*2],
        [330,barLen*2],[349,barLen*2+beat],[392,barLen*2+beat*2],
        [440,barLen*3],[466,barLen*3+beat],[523,barLen*3+beat*2],
    ];
    function playWaltzMel() {
        if (!_menuMusicNodes) return;
        const now = ac.currentTime;
        melPhrase.forEach(([freq,t]) => {
            const o = ac.createOscillator(); const g = ac.createGain();
            const f = ac.createBiquadFilter(); f.type='lowpass'; f.frequency.value=2200;
            o.type='triangle'; o.frequency.value=freq;
            g.gain.setValueAtTime(0, now+t);
            g.gain.linearRampToValueAtTime(0.14, now+t+0.015);
            g.gain.exponentialRampToValueAtTime(0.0001, now+t+beat*0.9);
            o.connect(f); f.connect(g); g.connect(master);
            o.start(now+t); o.stop(now+t+beat);
        });
        const tid = setTimeout(playWaltzMel, bassPhaseLen * 1000);
        _menuMusicNodes.intervals.push(tid);
    }
    playWaltzMel();

    function waltzChordStab(t, freqs, vol) {
        freqs.forEach(freq => {
            const o = ac.createOscillator(); const g = ac.createGain();
            o.type='sawtooth'; o.frequency.value=freq;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(vol, t+0.006);
            g.gain.exponentialRampToValueAtTime(0.0001, t+0.18);
            o.connect(g); g.connect(master);
            o.start(t); o.stop(t+0.20);
        });
    }
    function playWaltzStabs() {
        if (!_menuMusicNodes) return;
        const now = ac.currentTime;
        
        waltzChordStab(now+beat,   [146.8,175,220], 0.08);
        waltzChordStab(now+beat*2, [146.8,175,220], 0.06);
        
        waltzChordStab(now+barLen+beat,   [174.6,220,261.6], 0.08);
        waltzChordStab(now+barLen+beat*2, [174.6,220,261.6], 0.06);
        
        waltzChordStab(now+barLen*2+beat,   [116.5,146.8,175], 0.08);
        waltzChordStab(now+barLen*2+beat*2, [116.5,146.8,175], 0.06);
        
        waltzChordStab(now+barLen*3+beat,   [110,130.8,165], 0.08);
        waltzChordStab(now+barLen*3+beat*2, [110,130.8,165], 0.06);
        const tid = setTimeout(playWaltzStabs, bassPhaseLen * 1000);
        _menuMusicNodes.intervals.push(tid);
    }
    playWaltzStabs();
}

function startBgAudioTrack3() {
    if (muted) return;
    const ac = getAC();
    if (_musicNodes) return;
    const master = ac.createGain();
    master.gain.setValueAtTime(musicVol * 0.68, ac.currentTime);
    master.connect(ac.destination);
    _musicNodes = { master, oscs: [], intervals: [] };

    const bpm = 80;
    const beat = 60 / bpm;
    const half = beat * 2;

    [[41.2,0.20],[82.4,0.13],[41.0,0.12]].forEach(([freq,vol],i) => {
        const o = ac.createOscillator(); const g = ac.createGain();
        const f = ac.createBiquadFilter(); f.type='lowpass'; f.frequency.value=300;
        o.type = i<2 ? 'sawtooth' : 'sine'; o.frequency.value=freq; g.gain.value=vol;
        o.connect(f); f.connect(g); g.connect(master);
        o.start(); _musicNodes.oscs.push(o);
    });

    function marchKick(t, vol) {
        const o = ac.createOscillator(); const g = ac.createGain();
        o.type='sine';
        o.frequency.setValueAtTime(180, t);
        o.frequency.exponentialRampToValueAtTime(38, t+0.1);
        g.gain.setValueAtTime(musicVol * vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t+0.24);
        o.connect(g); g.connect(ac.destination);
        o.start(t); o.stop(t+0.26);
    }
    function marchSnare(t, vol) {
        const bufLen = Math.floor(ac.sampleRate * 0.22);
        const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i=0; i<bufLen; i++) d[i] = (Math.random()*2-1) * Math.pow(1-i/bufLen, 1.1);
        const src = ac.createBufferSource(); src.buffer=buf;
        const f = ac.createBiquadFilter(); f.type='bandpass'; f.frequency.value=2000; f.Q.value=0.8;
        const g = ac.createGain(); g.gain.setValueAtTime(musicVol*vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t+0.22);
        src.connect(f); f.connect(g); g.connect(ac.destination);
        src.start(t); src.stop(t+0.24);
    }
    function marchPattern() {
        if (!_musicNodes) return;
        const now = ac.currentTime;
        marchKick(now, 0.9);          
        marchKick(now+beat, 0.55);    
        marchKick(now+beat*2, 0.70);  
        marchKick(now+beat*3, 0.55);  
        marchSnare(now+beat*0.5, 0.35); 
        marchSnare(now+beat*1.5, 0.45); 
        marchSnare(now+beat*2.5, 0.35); 
        marchSnare(now+beat*3.5, 0.50); 
        const tid = setTimeout(marchPattern, beat * 4 * 1000);
        _musicNodes.intervals.push(tid);
    }
    marchPattern();

    
    
    const brassPhrase = [
        [164.8,0],[146.8,half],[130.8,half*2],[123.5,half*3],
        [110,half*4],[98,half*5],[110,half*6],[82.4,half*7]
    ];
    const brassLen = half * 8;
    function playBrass() {
        if (!_musicNodes) return;
        const now = ac.currentTime;
        brassPhrase.forEach(([freq,t]) => {
            const o = ac.createOscillator(); const g = ac.createGain();
            const f = ac.createBiquadFilter(); f.type='lowpass'; f.frequency.value=900;
            o.type='sawtooth'; o.frequency.value=freq;
            g.gain.setValueAtTime(0, now+t);
            g.gain.linearRampToValueAtTime(0.20, now+t+0.06);
            g.gain.setValueAtTime(0.18, now+t+half*0.6);
            g.gain.exponentialRampToValueAtTime(0.0001, now+t+half*0.9);
            o.connect(f); f.connect(g); g.connect(master);
            o.start(now+t); o.stop(now+t+half);
            
            const o2 = ac.createOscillator(); const g2 = ac.createGain();
            o2.type='triangle'; o2.frequency.value=freq*1.5;
            g2.gain.setValueAtTime(0, now+t+0.03);
            g2.gain.linearRampToValueAtTime(0.09, now+t+0.09);
            g2.gain.exponentialRampToValueAtTime(0.0001, now+t+half*0.8);
            o2.connect(g2); g2.connect(master);
            o2.start(now+t+0.03); o2.stop(now+t+half);
        });
        const tid = setTimeout(playBrass, brassLen * 1000);
        _musicNodes.intervals.push(tid);
    }
    playBrass();

    function marchBell() {
        if (!_musicNodes) return;
        const now = ac.currentTime;
        [[82.4,0.35],[110,0.20],[164.8,0.12]].forEach(([freq,vol],i) => {
            const o = ac.createOscillator(); const g = ac.createGain();
            o.type='sine'; o.frequency.value=freq;
            g.gain.setValueAtTime(0, now+i*0.05);
            g.gain.linearRampToValueAtTime(vol*musicVol, now+i*0.05+0.01);
            g.gain.exponentialRampToValueAtTime(0.0001, now+i*0.05+4.5);
            o.connect(g); g.connect(master);
            o.start(now+i*0.05); o.stop(now+i*0.05+5);
        });
        const tid = setTimeout(marchBell, brassLen * 1000);
        _musicNodes.intervals.push(tid);
    }
    marchBell();
}
function startBgAudioTrack1() {
    if (muted) return;
    const ac = getAC();
    if (_musicNodes) return;
    const master = ac.createGain();
    master.gain.setValueAtTime(musicVol * 0.72, ac.currentTime);
    master.connect(ac.destination);
    _musicNodes = { master, oscs: [], intervals: [] };

    const bpm = 120;
    const beat = 60 / bpm;
    const eighth = beat / 2;
    const sixteenth = beat / 4;

    
    [[41.2, 0.18], [61.7, 0.10], [82.4, 0.07]].forEach(([freq, vol]) => {
        const o = ac.createOscillator(); const g = ac.createGain();
        const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 350;
        o.type = 'sawtooth'; o.frequency.value = freq; g.gain.value = vol;
        o.connect(f); f.connect(g); g.connect(master);
        o.start(); _musicNodes.oscs.push(o);
    });

    
    function kick(t, vol) {
        const o = ac.createOscillator(); const g = ac.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(160, t);
        o.frequency.exponentialRampToValueAtTime(40, t + 0.08);
        g.gain.setValueAtTime(muted ? 0 : vol * musicVol * 1.2, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.20);
        o.connect(g); g.connect(ac.destination);
        o.start(t); o.stop(t + 0.22);
    }

    
    function snare(t, vol) {
        const bufLen = Math.floor(ac.sampleRate * 0.15);
        const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 1.5);
        const src = ac.createBufferSource(); src.buffer = buf;
        const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 0.8;
        const g = ac.createGain(); g.gain.setValueAtTime(muted ? 0 : vol * musicVol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
        src.connect(f); f.connect(g); g.connect(ac.destination);
        src.start(t); src.stop(t + 0.16);
    }

    
    function hihat(t, vol) {
        const bufLen = Math.floor(ac.sampleRate * 0.06);
        const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
        const src = ac.createBufferSource(); src.buffer = buf;
        const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 8000;
        const g = ac.createGain(); g.gain.setValueAtTime(muted ? 0 : vol * musicVol * 0.5, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        src.connect(f); f.connect(g); g.connect(ac.destination);
        src.start(t); src.stop(t + 0.07);
    }

    
    function drumBar() {
        if (!_musicNodes) return;
        const now = ac.currentTime;
        kick(now,           0.9);
        kick(now + beat*2,  0.75);
        kick(now + beat*3 + eighth, 0.5);
        snare(now + beat,   0.7);
        snare(now + beat*3, 0.7);
        for (let i = 0; i < 8; i++) hihat(now + i * eighth, i % 2 === 0 ? 0.6 : 0.4);
        const tid = setTimeout(drumBar, beat * 4 * 1000);
        _musicNodes.intervals.push(tid);
    }
    drumBar();

    
    
    const hornPhrase = [
        [330,0],[349,1],[392,2],[330,3],
        [294,4],[330,5],[349,6],[294,7],
        [262,8],[294,9],[330,10],[262,11],
        [247,12],[262,13],[294,14],[330,15]
    ];
    const hornLen = 16 * beat;
    function playHorn() {
        if (!_musicNodes) return;
        const now = ac.currentTime;
        hornPhrase.forEach(([freq, step]) => {
            const t = now + step * beat;
            const o = ac.createOscillator(); const g = ac.createGain();
            const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1200;
            o.type = 'sawtooth'; o.frequency.value = freq;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.16, t + 0.04);
            g.gain.setValueAtTime(0.16, t + beat * 0.7);
            g.gain.exponentialRampToValueAtTime(0.0001, t + beat * 0.9);
            o.connect(f); f.connect(g); g.connect(master);
            o.start(t); o.stop(t + beat);
        });
        const tid = setTimeout(playHorn, hornLen * 1000);
        _musicNodes.intervals.push(tid);
    }
    playHorn();

    
    const counterPhrase = [
        [659,0],[622,2],[587,4],[622,6],
        [659,8],[698,10],[659,12],[587,14]
    ];
    const counterLen = 16 * beat;
    function playCounter() {
        if (!_musicNodes) return;
        const now = ac.currentTime;
        counterPhrase.forEach(([freq, step]) => {
            const t = now + step * beat;
            const o = ac.createOscillator(); const g = ac.createGain();
            o.type = 'triangle'; o.frequency.value = freq;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.07, t + 0.06);
            g.gain.exponentialRampToValueAtTime(0.0001, t + beat * 1.8);
            o.connect(g); g.connect(master);
            o.start(t); o.stop(t + beat * 2);
        });
        const tid = setTimeout(playCounter, counterLen * 1000);
        _musicNodes.intervals.push(tid);
    }
    playCounter();
}

function startBgAudioTrack2() {
    if (muted) return;
    const ac = getAC();
    if (_musicNodes) return;
    const master = ac.createGain();
    master.gain.setValueAtTime(musicVol * 0.65, ac.currentTime);
    master.connect(ac.destination);
    _musicNodes = { master, oscs: [], intervals: [] };

    const bpm = 100;
    const beat = 60 / bpm;
    const sixteenth = beat / 4;

    
    const sub = ac.createOscillator(); const subG = ac.createGain();
    sub.type = 'sine'; sub.frequency.value = 32.7; subG.gain.value = 0.28;
    sub.connect(subG); subG.connect(master);
    sub.start(); _musicNodes.oscs.push(sub);

    
    const pulseLfo = ac.createOscillator(); const pulseLfoG = ac.createGain();
    pulseLfo.type = 'sine'; pulseLfo.frequency.value = bpm / 60; 
    pulseLfoG.gain.value = 0.14;
    pulseLfo.connect(pulseLfoG); pulseLfoG.connect(subG.gain);
    pulseLfo.start(); _musicNodes.oscs.push(pulseLfo);

    
    [[65.4, 0.08, 0], [65.8, 0.06, 1]].forEach(([freq, vol]) => {
        const o = ac.createOscillator(); const g = ac.createGain();
        const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
        o.type = 'sawtooth'; o.frequency.value = freq; g.gain.value = vol;
        o.connect(f); f.connect(g); g.connect(master);
        o.start(); _musicNodes.oscs.push(o);
    });

    
    
    const arpPatterns = [
        [130.8, 155.6, 196.0, 233.1, 261.6, 233.1, 196.0, 155.6], 
        [116.5, 138.6, 174.6, 207.7, 233.1, 207.7, 174.6, 138.6], 
        [123.5, 146.8, 185.0, 220.0, 246.9, 220.0, 185.0, 146.8], 
        [130.8, 155.6, 196.0, 233.1, 261.6, 233.1, 196.0, 155.6], 
    ];
    let arpBar = 0;

    function playArp() {
        if (!_musicNodes) return;
        const now = ac.currentTime;
        const pattern = arpPatterns[arpBar % arpPatterns.length];
        arpBar++;
        for (let rep = 0; rep < 2; rep++) {
            pattern.forEach((freq, i) => {
                const t = now + (rep * 8 + i) * sixteenth;
                const o = ac.createOscillator(); const g = ac.createGain();
                const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq * 3; f.Q.value = 2;
                o.type = 'square'; o.frequency.value = freq;
                g.gain.setValueAtTime(0, t);
                g.gain.linearRampToValueAtTime(0.10, t + 0.008);
                g.gain.exponentialRampToValueAtTime(0.0001, t + sixteenth * 0.75);
                o.connect(f); f.connect(g); g.connect(master);
                o.start(t); o.stop(t + sixteenth);
            });
        }
        const tid = setTimeout(playArp, 16 * sixteenth * 1000);
        _musicNodes.intervals.push(tid);
    }
    playArp();

    
    const leadPhrase = [
        [523.3, 0], [493.9, beat*2], [466.2, beat*4], [440.0, beat*6],
        [415.3, beat*8], [392.0, beat*10], [369.9, beat*12], [349.2, beat*14]
    ];
    const leadLen = beat * 16;
    function playLead() {
        if (!_musicNodes) return;
        const now = ac.currentTime;
        leadPhrase.forEach(([freq, t]) => {
            const o = ac.createOscillator(); const g = ac.createGain();
            const lfo2 = ac.createOscillator(); const lfo2G = ac.createGain();
            lfo2.frequency.value = 5.2; lfo2G.gain.value = 1.5; 
            lfo2.connect(lfo2G); lfo2G.connect(o.frequency);
            lfo2.start(now + t); lfo2.stop(now + t + beat * 2.2);
            o.type = 'sine'; o.frequency.value = freq;
            g.gain.setValueAtTime(0, now + t);
            g.gain.linearRampToValueAtTime(0.12, now + t + 0.08);
            g.gain.setValueAtTime(0.12, now + t + beat * 1.6);
            g.gain.exponentialRampToValueAtTime(0.0001, now + t + beat * 2.0);
            o.connect(g); g.connect(master);
            o.start(now + t); o.stop(now + t + beat * 2.1);
        });
        const tid = setTimeout(playLead, leadLen * 1000);
        _musicNodes.intervals.push(tid);
    }
    playLead();

    
    function eKick(t, vol) {
        const o = ac.createOscillator(); const g = ac.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(200, t);
        o.frequency.exponentialRampToValueAtTime(30, t + 0.12);
        g.gain.setValueAtTime(muted ? 0 : vol * musicVol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        o.connect(g); g.connect(ac.destination);
        o.start(t); o.stop(t + 0.20);
    }
    function kickPattern() {
        if (!_musicNodes) return;
        const now = ac.currentTime;
        eKick(now,          0.85);
        eKick(now + beat,   0.45);
        eKick(now + beat*2, 0.75);
        eKick(now + beat*3, 0.40);
        const tid = setTimeout(kickPattern, beat * 4 * 1000);
        _musicNodes.intervals.push(tid);
    }
    kickPattern();
}

let _loadedMods = [];

function handleModDrop(event) {
    event.preventDefault();
    const zone = document.getElementById('mod-drop-zone');
    zone.style.borderColor = '';
    zone.style.background = '';
    const file = event.dataTransfer.files[0];
    if (file) loadModFile(file);
}

function handleModFileInput(input) {
    const file = input.files[0];
    if (file) loadModFile(file);
    input.value = '';
}

const MOD_CARD_CLASSES = {
    attack:   { label: 'Attack',   desc: 'Deals direct damage to the opponent.' },
    heal:     { label: 'Heal',     desc: 'Restores HP to the caster.' },
    drain:    { label: 'Drain',    desc: 'Steals HP from the opponent.' },
    debuff:   { label: 'Debuff',   desc: 'Applies a negative status to the opponent.' },
    buff:     { label: 'Buff',     desc: 'Grants a positive status to the caster.' },
    reflect:  { label: 'Reflect',  desc: 'Redirects or reflects incoming damage.' },
    poison:   { label: 'Poison',   desc: 'Applies damage-over-time poison to the opponent.' },
    burn:     { label: 'Burn',     desc: 'Applies damage-over-time burn to the opponent.' },
    freeze:   { label: 'Freeze',   desc: "Skips the opponent's turn." },
    curse:    { label: 'Curse',    desc: "Forces the opponent's next action to fail." },
    tariff:   { label: 'Tariff',   desc: 'Halves damage dealt by the opponent for a number of turns.' },
    chain:    { label: 'Chain',    desc: 'On crit, triggers an additional roll.' },
    pierce:   { label: 'Pierce',   desc: 'Bypasses shields and pets.' },
    multi:    { label: 'Multi',    desc: 'Hits multiple times per use.' },
    reroll:   { label: 'Reroll',   desc: 'Grants a free die reroll.' },
    utility:  { label: 'Utility',  desc: 'Does not fit into a single damage/heal category.' },
};

let BUILTIN_CARD_IDS = null;
function _getBuiltinIds() { if (!BUILTIN_CARD_IDS) BUILTIN_CARD_IDS = new Set(Object.values(ALL_CARDS).map(c => c.id)); return BUILTIN_CARD_IDS; }

function _sanitizeMod(mod) {
    const BLOCKED_KEYS = ['ai','difficulty','settings','aiThink','critMult','berserkerNerf','mechanics','weights'];
    const clean = {};
    for (const k of Object.keys(mod)) {
        if (!BLOCKED_KEYS.includes(k)) clean[k] = mod[k];
    }
    return clean;
}

function _applyModTheme(mod) {
    if (!mod.theme || typeof mod.theme !== 'object') return;
    const id = 'mod-theme-' + mod.name.replace(/[^a-z0-9]/gi, '_');
    const existing = document.getElementById(id);
    if (existing) existing.remove();
    const ALLOWED_VARS = [
        '--gold','--gold-dim','--gold-bright','--rare','--epic','--legendary','--common',
        '--bg-deep','--bg-mid','--bg-surface','--border-gold','--border-dim',
        '--text-primary','--text-secondary','--text-dim','--accent','--accent-dim',
        '--card-bg','--card-border','--card-text','--card-rarity-common','--card-rarity-uncommon',
        '--card-rarity-rare','--card-rarity-epic','--card-rarity-legendary',
        '--hp-bar-player','--hp-bar-enemy','--die-face','--die-text',
        '--btn-bg','--btn-border','--btn-text','--panel-bg','--panel-border',
    ];
    const varLines = [];
    for (const [k, v] of Object.entries(mod.theme)) {
        if (ALLOWED_VARS.includes(k) && typeof v === 'string' && v.length < 80) {
            varLines.push(`    ${k}: ${v};`);
        }
    }
    if (varLines.length === 0) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `body {\n${varLines.join('\n')}\n}`;
    document.head.appendChild(style);
    if (THEMES.indexOf(mod.name) === -1) THEMES.push(mod.name);
    if (!mod.theme._skipSwatch) {
        const picker = document.getElementById('opt-theme-picker');
        if (picker && !picker.querySelector(`[data-theme="${mod.name}"]`)) {
            const btn = document.createElement('button');
            btn.className = 'theme-swatch';
            btn.dataset.theme = mod.name;
            btn.title = mod.name;
            const bg = mod.theme['--accent'] || mod.theme['--gold'] || '#c8a460';
            btn.style.background = `linear-gradient(135deg, ${bg} 0%, #0d0400 100%)`;
            btn.innerHTML = `<span class="theme-swatch-label">${mod.name}</span>`;
            btn.addEventListener('click', function() { playSfx('menuClick'); selectTheme(mod.name); });
            picker.appendChild(btn);
        }
    }
}

function _removeModTheme(mod) {
    const id = 'mod-theme-' + mod.name.replace(/[^a-z0-9]/gi, '_');
    const el = document.getElementById(id);
    if (el) el.remove();
    const idx = THEMES.indexOf(mod.name);
    if (idx > -1) THEMES.splice(idx, 1);
    const picker = document.getElementById('opt-theme-picker');
    if (picker) { const btn = picker.querySelector(`[data-theme="${mod.name}"]`); if (btn) btn.remove(); }
    if (_currentTheme === mod.name) applyTheme('default');
}

function _applyModVisuals(mod) {
    if (!mod.visuals || typeof mod.visuals !== 'object') return;
    const id = 'mod-visuals-' + mod.name.replace(/[^a-z0-9]/gi, '_');
    const existing = document.getElementById(id);
    if (existing) existing.remove();
    const ALLOWED_SELECTORS = {
        'body-bg':        { sel: 'body',              props: ['background','background-color'] },
        'panel-bg':       { sel: '.panel',             props: ['background','border-color'] },
        'card-bg':        { sel: '.hand-card',         props: ['background','border-color','color'] },
        'btn-style':      { sel: '.btn',               props: ['background','border-color','color'] },
        'hp-bar-player':  { sel: '#hp-bar-p .hp-fill', props: ['background'] },
        'hp-bar-enemy':   { sel: '#hp-bar-a .hp-fill', props: ['background'] },
        'title-color':    { sel: '#game-title',        props: ['color','text-shadow'] },
        'overlay-bg':     { sel: '.overlay',           props: ['background'] },
        'tooltip-bg':     { sel: '.tooltip',           props: ['background','border-color','color'] },
    };
    const cssLines = [];
    for (const [key, val] of Object.entries(mod.visuals)) {
        const rule = ALLOWED_SELECTORS[key];
        if (!rule || typeof val !== 'object') continue;
        const decls = [];
        for (const [prop, v] of Object.entries(val)) {
            if (rule.props.includes(prop) && typeof v === 'string' && v.length < 120) {
                decls.push(`${prop}: ${v};`);
            }
        }
        if (decls.length) cssLines.push(`${rule.sel} { ${decls.join(' ')} }`);
    }
    if (cssLines.length === 0) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = cssLines.join('\n');
    document.head.appendChild(style);
}

function _removeModVisuals(mod) {
    const id = 'mod-visuals-' + mod.name.replace(/[^a-z0-9]/gi, '_');
    const el = document.getElementById(id);
    if (el) el.remove();
}

function loadModFile(file) {
    if (!file.name.endsWith('.json')) { showModError('Only .json mod files are supported.'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const rawMod = JSON.parse(e.target.result);
            if (!rawMod.name) { showModError('Invalid mod: missing "name" field.'); return; }
            if (_loadedMods.find(m => m.name === rawMod.name)) {
                showModError(`Mod "${rawMod.name}" is already loaded.`); return;
            }
            const mod = _sanitizeMod(rawMod);
            if (Array.isArray(mod.cards)) {
                for (const c of mod.cards) {
                    if (c.id == null) continue;
                    if (_getBuiltinIds().has(c.id)) {
                        showModError(`ID conflict: card ID ${c.id} ("${c.n || '?'}") collides with a built-in card.`);
                        return;
                    }
                    for (const loaded of _loadedMods) {
                        if (Array.isArray(loaded.cards) && loaded.cards.some(lc => lc.id === c.id)) {
                            showModError(`ID conflict: card ID ${c.id} ("${c.n || '?'}") already used by mod "${loaded.name}".`);
                            return;
                        }
                    }
                }
            }
            _loadedMods.push(mod);
            applyMod(mod);
            renderModList();
            try { const mk = 'dr_saved_mods'; localStorage.setItem(mk, JSON.stringify(_loadedMods)); } catch(e) {}
        } catch(err) {
            showModError('Failed to parse mod file: ' + err.message);
        }
    };
    reader.readAsText(file);
}

function applyMod(mod) {
    if (Array.isArray(mod.cards)) {
        mod.cards.forEach(c => {
            if (c.id != null && c.n && c.i && c.d) {
                const validClass = c.class && MOD_CARD_CLASSES[c.class] ? c.class : 'utility';
                const multiplier = (typeof c.multiplier === 'number' && c.multiplier > 0 && c.multiplier <= 5)
                    ? c.multiplier : 1.0;
                const card = { ...c, class: validClass, multiplier, _fromMod: mod.name };
                if (typeof ALL_CARDS !== 'undefined') ALL_CARDS['mod_' + c.id] = card;
                const existing = CARDS.find(x => x.id === c.id);
                if (!existing) CARDS.push(card);
            }
        });
    }
    if (Array.isArray(mod.decks)) {
        mod.decks.forEach(d => {
            if (d.id && d.name && Array.isArray(d.cards)) {
                const existing = DECKS.findIndex(x => x.id === d.id);
                const deck = { ...d, isCustom: true, _fromMod: mod.name };
                if (existing >= 0) DECKS[existing] = deck;
                else DECKS.push(deck);
            }
        });
        buildDeckUI();
    }
    _applyModTheme(mod);
    _applyModVisuals(mod);
}

function unloadMod(name) {
    playSfx('menuClick');
    const idx = _loadedMods.findIndex(m => m.name === name);
    if (idx < 0) return;
    const mod = _loadedMods[idx];
    if (Array.isArray(mod.cards)) {
        mod.cards.forEach(c => {
            delete ALL_CARDS['mod_' + c.id];
            const ci = CARDS.findIndex(x => x.id === c.id && x._fromMod === name);
            if (ci >= 0) CARDS.splice(ci, 1);
        });
    }
    if (Array.isArray(mod.decks)) {
        mod.decks.forEach(d => {
            const di = DECKS.findIndex(x => x.id === d.id && x._fromMod === name);
            if (di >= 0) DECKS.splice(di, 1);
        });
        buildDeckUI();
    }
    _removeModTheme(mod);
    _removeModVisuals(mod);
    _loadedMods.splice(idx, 1);
    renderModList();
}

function renderModList() {
    const list = document.getElementById('mod-list');
    if (!list) return;
    list.innerHTML = '';
    if (_loadedMods.length === 0) {
        list.innerHTML = '<div style="font-family:\'IM Fell English\',serif; font-size:11px; color:#4a3010; font-style:italic; text-align:center; padding:8px 0;">No mods loaded</div>';
        return;
    }
    _loadedMods.forEach(mod => {
        const el = document.createElement('div');
        el.style.cssText = 'display:flex; align-items:center; justify-content:space-between; background:rgba(20,10,2,0.85); border:1px solid rgba(100,65,20,0.5); border-radius:5px; padding:8px 12px;';
        const cardCount = Array.isArray(mod.cards) ? mod.cards.length : 0;
        const deckCount = Array.isArray(mod.decks) ? mod.decks.length : 0;
        const extras = [
            cardCount > 0 ? cardCount + ' card(s)' : null,
            deckCount > 0 ? deckCount + ' deck(s)' : null,
            mod.theme ? 'custom theme' : null,
            mod.visuals ? 'visuals' : null,
        ].filter(Boolean).join(' · ');
        el.innerHTML = `
            <div>
                <div style="font-family:'Cinzel',serif; font-size:11px; color:#c8a460; letter-spacing:1px;">${mod.name}</div>
                <div style="font-family:'IM Fell English',serif; font-size:10px; color:#5a3a10; font-style:italic; margin-top:2px;">
                    ${mod.version ? 'v' + mod.version + ' · ' : ''}${extras}
                </div>
            </div>
            <button onclick="unloadMod('${mod.name.replace(/'/g,"\'")}');" style="font-family:'Cinzel',serif; font-size:9px; letter-spacing:2px; background:rgba(40,10,5,0.9); border:1px solid rgba(120,40,30,0.5); color:rgba(200,70,50,0.8); padding:4px 10px; cursor:pointer; border-radius:3px; text-transform:uppercase;">Unload</button>`;
        list.appendChild(el);
    });
}

function showModError(msg) {
    const list = document.getElementById('mod-list');
    if (!list) return;
    const el = document.createElement('div');
    el.style.cssText = "font-family:'IM Fell English',serif; font-size:11px; color:#c62828; font-style:italic; text-align:center; padding:6px 0;";
    el.textContent = msg;
    list.prepend(el);
    setTimeout(() => { if (el.parentNode) el.remove(); }, 4000);
}

function aiThinkMult() {
    if (_aiThink === 'fast') return 0.3;
    if (_aiThink === 'slow') return 2.0;
    return 1.0;
}

function toggleMute() {
    muted = !muted;
    document.getElementById('mute-btn').textContent = muted ? '🔇' : '🔊';
    if (muted) {
        if (_musicNodes) _musicNodes.master.gain.setValueAtTime(0, AC.currentTime);
        if (_customAudioEl) _customAudioEl.pause();
    } else {
        if (_musicNodes) {
            
            _musicNodes.master.gain.setValueAtTime(musicVol * 0.72, AC.currentTime);
        } else if (_menuMusicNodes) {
            _menuMusicNodes.master.gain.setValueAtTime(musicVol * 0.5, AC.currentTime);
        } else if (_battleTrack === 99 || _menuTrack === 99) {
            
            startCustomAudio();
        } else {
            
            const onBattle = document.getElementById('board')?.style.display === 'block';
            if (onBattle) startBgAudio(); else startMenuAudio();
        }
    }
}
document.getElementById('mute-btn').addEventListener('click', toggleMute);

function _bootMenuMusic() {
    if (window._introMusicSuppressed) return; 
    document.removeEventListener('pointerdown', _bootMenuMusic);
    document.removeEventListener('keydown', _bootMenuMusic);
    if (_menuMusicNodes || _musicNodes) return; 
    try { startMenuAudio(); } catch(e) {}
}
document.addEventListener('pointerdown', _bootMenuMusic);
document.addEventListener('keydown', _bootMenuMusic);

const ALL_CARDS = {
    attack:  { id:0,  n:"Attack",   i:"⚔️",  rarity:"common",    d:"Deals damage. Crits chain into a free second roll.",           m:"CRIT: +Chain | FAIL: Self-Strike" },
    vampire: { id:5,  n:"Vampire",  i:"🦇",  rarity:"rare",      d:"Drains HP from the opponent and gives half to you.",       m:"CRIT: Mega-Drain | FAIL: Safe" },
    heal:    { id:2,  n:"Heal",     i:"🧪",  rarity:"uncommon",  d:"Restores your HP. Never backfires.",         m:"CRIT: Mega-Heal | FAIL: Safe" },
    tariff:  { id:3,  n:"Tariff",   i:"📜",  rarity:"epic",      d:"Halves all damage the opponent deals for 3 turns.",     m:"CRIT: 5R Length | FAIL: Self-Debuff" },
    mirror:  { id:6,  n:"Mirror",   i:"🪞",  rarity:"rare",      d:"Reflects the next physical hit back at the attacker.",  m:"CRIT: Full reflect | FAIL: Safe" },
    plague:  { id:7,  n:"Plague",   i:"☠️",  rarity:"uncommon",  d:"Poisons the opponent for 3 dmg/turn over 3 turns.",             m:"CRIT: +2 dmg/turn | FAIL: Self-inflict" },
    pet:     { id:4,  n:"Pet",      i:"🐉",  rarity:"legendary", d:"Summons a buffer that absorbs hits before your HP drops.",              m:"CRIT: 50% HP Tank | FAIL: Ghost Betrayal" },
    bomb:    { id:8,  n:"Bomb",     i:"💣",  rarity:"rare",      d:"Big burst damage. Blows up in your face on a fail.",         m:"CRIT: Double blast | FAIL: Self-destruct (8 dmg)" },
    shield:  { id:9,  n:"Shield",   i:"🛡️",  rarity:"uncommon",  d:"Cuts incoming damage by 60% until your next turn.",        m:"CRIT: Full block | FAIL: Guard Break" },
    storm:   { id:10, n:"Storm",    i:"⚡",  rarity:"epic",      d:"Strikes twice. Crits strike three times.",            m:"CRIT: Triple strike | FAIL: Self-struck" },
    curse:   { id:11, n:"Curse",    i:"🔮",  rarity:"epic",      d:"Forces the opponent's next card to automatically fail.",   m:"CRIT: Lasts 2 turns | FAIL: Curse self" },
    regen:   { id:12, n:"Regen",    i:"🌿",  rarity:"uncommon",  d:"Heals 3 HP at the start of each of your next 3 turns.",        m:"CRIT: 5 HP/turn | FAIL: Wither (lose HP)" },
    snipe:   { id:13, n:"Snipe",    i:"🏹",  rarity:"rare",      d:"Deals damage directly to HP — ignores pets and shields.",     m:"CRIT: +Chain | FAIL: Miss" },
    leech:   { id:14, n:"Leech",    i:"🩸",  rarity:"common",    d:"Small drain. Returns a portion of the damage as HP.",              m:"CRIT: Big drain | FAIL: Safe" },
    inferno: { id:15, n:"Inferno",  i:"🔥",  rarity:"legendary", d:"Immediate damage plus 3 dmg/turn burn for 3 turns.",             m:"CRIT: Inferno chain | FAIL: Self-burn" },
    frost:   { id:16, n:"Frost",    i:"❄️",  rarity:"rare",      d:"Freezes the opponent — they skip their next turn.",               m:"CRIT: Freeze 2 turns | FAIL: Self-freeze" },
    gold:    { id:17, n:"Gold",     i:"💰",  rarity:"epic",      d:"Lets you reroll the die once for free this turn.",            m:"CRIT: Reroll twice | FAIL: Bankrupt (-6 HP)" },
    bone:    { id:18, n:"Bone",     i:"🦴",  rarity:"common",    d:"Low damage but never fully misses. Always deals at least 1.",         m:"CRIT: Bone storm | FAIL: Safe (1 dmg)" },
    soul:    { id:19, n:"Soul",     i:"👻",  rarity:"legendary", d:"Massive damage. Backfires for 10 self-damage on a fail.",       m:"CRIT: Soul shatter | FAIL: Possess self (10 dmg)" },

    
    lullaby:  { id:20, n:"Lullaby",   i:"🎵",  rarity:"uncommon",  d:"Skips the opponent's next turn. Fails and you skip yours.",         m:"CRIT: Sleep 2 turns | FAIL: Self-daze (skip own turn)" },
    aria:     { id:21, n:"Aria",      i:"🎶",  rarity:"rare",      d:"Deals double damage on a crit. Costs 4 HP on a fail.",                      m:"CRIT: x2 dmg | FAIL: Voice crack (self 4 dmg)" },
    serenade: { id:22, n:"Serenade",  i:"🌊",  rarity:"common",    d:"Applies tariff — halves opponent damage for 2 turns.",                     m:"CRIT: Disarming charm (tariff debuff) | FAIL: Safe" },
    banshee:  { id:23, n:"Banshee",   i:"👄",  rarity:"epic",      d:"Heavy damage with chain potential. 8 self-damage on fail.",                                m:"CRIT: Deafening shockwave (chain) | FAIL: Rupture own throat (8 dmg)" },
    chorus:   { id:24, n:"Chorus",    i:"🎤",  rarity:"uncommon",  d:"Shields you this turn. Crit also adds 2 turns of regen.",                     m:"CRIT: Sonic barrier (shield + regen) | FAIL: Safe" },
    encore:   { id:25, n:"Encore",    i:"🌹",  rarity:"legendary", d:"Big drain and self-heal. Crits amplify both. Risky fail.",                                 m:"CRIT: Triple echo | FAIL: Encore fails twice (self 8 dmg)" },

    
    strum:     { id:26, n:"Strum",     i:"🎸",  rarity:"common",    d:"Standard attack. Crits chain into a free second roll.",                                            m:"CRIT: Power chord (chain) | FAIL: Break string (self 3 dmg)" },
    drumroll:  { id:27, n:"Drumroll",  i:"🥁",  rarity:"uncommon",  d:"Hits twice. Crits hit three times. Fails waste the turn.",                 m:"CRIT: Triple strike | FAIL: Miss the beat (wasted turn)" },
    shanty:    { id:28, n:"Shanty",    i:"⚓",  rarity:"rare",      d:"Applies regen — heals 3 HP/turn for 3 turns. Safe card.",                  m:"CRIT: 5 HP/turn for 3 turns | FAIL: Grim shanty (lose HP)" },
    lute:      { id:29, n:"Lute",      i:"🪕",  rarity:"uncommon",  d:"Drains HP from the opponent. You recover most of it.",                         m:"CRIT: Mega-drain | FAIL: Safe" },
    ballad:    { id:30, n:"Ballad",    i:"📯",  rarity:"epic",      d:"Curses the opponent. Crits also debuff damage. Risky fail.",                           m:"CRIT: Curse 2 turns + tariff | FAIL: Cursed by own verse" },
    crescendo: { id:31, n:"Crescendo", i:"🎺",  rarity:"legendary", d:"Damage scales up with each crit in the chain. Gamble it.",                             m:"CRIT: Escalating blast | FAIL: Anticlimactic (self 6 dmg)" },

    
    bulwark:   { id:32, n:"Bulwark",   i:"🏰",  rarity:"uncommon",  d:"Raise fortress walls — shield self and reduce tariff duration by 1.",           m:"CRIT: Also heal 4 HP | FAIL: Safe" },
    cleave:    { id:33, n:"Cleave",    i:"🪓",  rarity:"rare",      d:"Heavy swing — deals high melee damage. Crits chain.",                          m:"CRIT: Cleave chain | FAIL: Overswing (self 5 dmg)" },
    rally:     { id:34, n:"Rally",     i:"🚩",  rarity:"epic",      d:"Banner cry — cures poison/burn on self and grants 3 turns of regen.",          m:"CRIT: Regen 5 HP/turn | FAIL: Safe" },
    destrier:  { id:35, n:"Destrier",  i:"🐴",  rarity:"legendary", d:"Mounted charge — massive damage that ignores pet and shields. Risky fail.",    m:"CRIT: Crushing charge (chain) | FAIL: Unhorsed (self 10 dmg)" },

    
    volley:    { id:36, n:"Volley",    i:"🪃",  rarity:"common",    d:"Loose a volley — hits twice. Crits hit a third time.",                         m:"CRIT: Third arrow | FAIL: Self-nick (self 2 dmg)" },
    huntmark:  { id:37, n:"Huntmark",  i:"🦅",  rarity:"uncommon",  d:"Mark the quarry — opponent's next card deals 2 less damage.",                  m:"CRIT: Marked for 3 turns | FAIL: Safe" },
    bramble:   { id:38, n:"Bramble",   i:"🌿",  rarity:"rare",      d:"Entangle the foe — freeze them 1 turn and poison 2 dmg/turn for 2 turns.",     m:"CRIT: Freeze 2 turns + stronger poison | FAIL: Ensnared self (freeze 1)" },
    hawkstrike:{ id:39, n:"Hawkstrike",i:"🦆",  rarity:"epic",      d:"Dive-bomb strike — bypasses shields. Crits also poison 3 dmg/turn.",           m:"CRIT: Pierce + poison | FAIL: Miss (self 3 dmg)" },

    
    miasma:    { id:40, n:"Miasma",    i:"🫧",  rarity:"uncommon",  d:"Toxic cloud — poisons enemy 4 dmg/turn for 3 turns. Safe card.",               m:"CRIT: 6 dmg/turn poison | FAIL: Safe" },
    necrosis:  { id:41, n:"Necrosis",  i:"🦠",  rarity:"rare",      d:"Rotting wound — deals immediate damage and inflicts burn for 2 turns.",         m:"CRIT: Also poisons for 2 turns | FAIL: Infect self (self 4 dmg)" },
    contagion: { id:42, n:"Contagion", i:"💀",  rarity:"epic",      d:"Spreading sickness — applies both poison AND burn simultaneously.",             m:"CRIT: Extended duration | FAIL: Outbreak on self" },
    pandemic:  { id:43, n:"Pandemic",  i:"⚗️",  rarity:"legendary", d:"The Black Death — poisons 5 dmg/turn for 5 turns. Devastating fail.",          m:"CRIT: Immediate 10 dmg + pandemic | FAIL: Self-inflict pandemic" },

    
    decree:    { id:44, n:"Decree",    i:"📋",  rarity:"uncommon",  d:"Royal decree — applies tariff on the enemy for 3 turns. Safe card.",            m:"CRIT: Tariff 5 turns | FAIL: Safe" },
    tithe:     { id:45, n:"Tithe",     i:"💎",  rarity:"rare",      d:"Collect tribute — drains enemy HP and heals self for each turn of tariff active.",m:"CRIT: Mega-drain + regen | FAIL: Safe" },
    inquisitor:{ id:46, n:"Inquisitor",i:"⚖️",  rarity:"epic",      d:"Judgment — curses the enemy and halves their damage for 2 turns.",              m:"CRIT: Curse 2 turns + tariff 3 turns | FAIL: Condemned self" },
};

const DECKS = [
    {
        id: 'standard',
        name: 'Standard',
        icon: '⚔️',
        desc: 'The classic balanced deck. A bit of everything.',
        cards: ['attack','heal','vampire','tariff','mirror','plague','pet'],
        weights: [0.20, 0.43, 0.58, 0.71, 0.82, 0.92, 1.0],
    },
    {
        id: 'berserker',
        name: 'Berserker',
        icon: '💀',
        desc: 'Pure aggression. High risk, devastating payoff.',
        cards: ['attack','bomb','storm','snipe','inferno','soul','plague'],
        weights: [0.18, 0.40, 0.57, 0.68, 0.80, 0.92, 1.0],
    },
    {
        id: 'necromancer',
        name: 'Necromancer',
        icon: '🔮',
        desc: 'Dark magic, curses, and life-draining sorcery.',
        cards: ['vampire','curse','plague','leech','soul','mirror','heal'],
        weights: [0.25, 0.42, 0.57, 0.64, 0.75, 0.88, 1.0],
    },
    {
        id: 'guardian',
        name: 'Guardian',
        icon: '🛡️',
        desc: 'Outlast the opponent through defence and slow recovery.',
        cards: ['shield','heal','regen','mirror','pet','attack','frost'],
        weights: [0.28, 0.52, 0.66, 0.76, 0.84, 0.91, 1.0],
    },
    {
        id: 'trickster',
        name: 'Trickster',
        icon: '🃏',
        desc: 'Chaotic and unpredictable. Anything could happen.',
        cards: ['gold','curse','bomb','frost','tariff','bone','soul'],
        weights: [0.22, 0.40, 0.55, 0.68, 0.79, 0.86, 1.0],
    },
    {
        id: 'elemental',
        name: 'Elemental',
        icon: '⚡',
        desc: 'Harness storm, frost, and inferno in equal measure.',
        cards: ['storm','frost','inferno','attack','heal','snipe','regen'],
        weights: [0.24, 0.42, 0.56, 0.65, 0.77, 0.89, 1.0],
    },
    {
        id: 'siren',
        name: 'Siren',
        icon: '🎵',
        desc: 'Enchanting songs that freeze, drain, and shatter. Control the battlefield with voice alone.',
        cards: ['lullaby','aria','serenade','banshee','chorus','encore','lute'],
        weights: [0.18, 0.34, 0.50, 0.64, 0.76, 0.88, 1.0],
    },
    {
        id: 'bard',
        name: 'Bard',
        icon: '🎸',
        desc: 'Instruments as weapons. From healing shanties to skull-rattling crescendos.',
        cards: ['strum','drumroll','shanty','lute','ballad','crescendo','shanty'],
        weights: [0.20, 0.38, 0.52, 0.65, 0.78, 0.90, 1.0],
    },
    {
        id: 'iron_vanguard',
        name: 'Iron Vanguard',
        icon: '🏰',
        desc: 'Unyielding steel and unbreakable discipline. Shield the line, then crush the enemy.',
        cards: ['bulwark','cleave','shield','rally','attack','cleave','destrier'],
        weights: [0.18, 0.34, 0.48, 0.62, 0.74, 0.87, 1.0],
    },
    {
        id: 'forest_warden',
        name: 'Forest Warden',
        icon: '🏹',
        desc: 'Strike from the shadows, never seen. Arrows, traps, and nature\'s wrath.',
        cards: ['volley','huntmark','snipe','bramble','hawkstrike','volley','regen'],
        weights: [0.20, 0.38, 0.52, 0.64, 0.76, 0.88, 1.0],
    },
    {
        id: 'plague_herald',
        name: 'Plague Herald',
        icon: '⚗️',
        desc: 'The slow death. Poison, rot, and contagion consume everything.',
        cards: ['miasma','plague','necrosis','contagion','miasma','heal','pandemic'],
        weights: [0.22, 0.40, 0.56, 0.68, 0.78, 0.88, 1.0],
    },
    {
        id: 'gilded_throne',
        name: 'Gilded Throne',
        icon: '👑',
        desc: 'Rule by edict and tribute. Weaken your foe with decrees, then drain them dry.',
        cards: ['decree','tariff','tithe','inquisitor','decree','heal','tithe'],
        weights: [0.20, 0.38, 0.53, 0.66, 0.78, 0.89, 1.0],
    },
];

let selectedDeckId = 'standard';

let customDeckSelection = [];
let customDeckLogo = '⚔️';

const LOGO_EMOJIS = ['⚔️','🦇','🧪','📜','🪞','☠️','🐉','💣','🛡️','⚡','🔮','🌿','🏹','🩸','🔥','❄️','💰','🦴','👻','💀','🃏','👑','🌑','🎭','🎲','🔱','⚗️','🗡️','🌙','✦'];

let _editingDeckId = null; 

function openCustomDeckBuilder(existingDeck) {
    customDeckSelection = [];
    customDeckLogo = '⚔️';
    _editingDeckId = null;
    document.getElementById('cdb-name').value = '';
    document.getElementById('cdb-desc').value = '';
    document.getElementById('cdb-error').textContent = '';
    document.getElementById('cdb-export-str').value = '';
    document.getElementById('cdb-import-str').value = '';

    if (existingDeck) {
        _editingDeckId = existingDeck.id;
        document.getElementById('cdb-name').value = existingDeck.name;
        document.getElementById('cdb-desc').value = existingDeck.desc;
        customDeckLogo = existingDeck.icon || '⚔️';
        customDeckSelection = [...existingDeck.cards];
        document.getElementById('cdb-export-str').value = encodeDeck(existingDeck);
    }

    const h2 = document.querySelector('#menu-custom-deck h2');
    if (h2) h2.innerHTML = existingDeck ? '&#9998; Edit Deck' : '&#9997; Build Your Deck';

    buildLogoPickerGrid();
    buildCardPickerGrid();
    refreshDeckPreview();
    toggle('menu-decks', false);
    toggle('menu-custom-deck', true);
}

function buildLogoPickerGrid() {
    const grid = document.getElementById('logo-picker-grid');
    grid.innerHTML = '';
    LOGO_EMOJIS.forEach(emoji => {
        const el = document.createElement('div');
        el.className = 'logo-option' + (emoji === customDeckLogo ? ' selected' : '');
        el.textContent = emoji;
        el.title = emoji;
        el.addEventListener('mouseenter', () => playSfx('cardHover'));
        el.onclick = () => {
            playSfx('menuClick');
            customDeckLogo = emoji;
            document.querySelectorAll('.logo-option').forEach(o => o.classList.remove('selected'));
            el.classList.add('selected');
        };
        grid.appendChild(el);
    });
}

function buildCardPickerGrid() {
    const grid = document.getElementById('card-picker-grid');
    grid.innerHTML = '';
    const filterRarity = document.getElementById('cdb-filter-rarity')?.value || '';
    Object.keys(ALL_CARDS).forEach(key => {
        const card = ALL_CARDS[key];
        if (filterRarity && card.rarity !== filterRarity) return;
        const el = document.createElement('div');
        el.className = 'picker-card' + (customDeckSelection.includes(key) ? ' selected' : '');
        el.dataset.key = key;
        el.innerHTML = `
            <div class="picker-card-icon">${card.i}</div>
            <div class="picker-card-name">${card.n}</div>
            <div class="picker-card-rarity ${card.rarity}">${card.rarity}</div>`;
        el.title = card.d;
        el.addEventListener('mouseenter', () => playSfx('cardHover'));
        el.onclick = () => togglePickerCard(key);
        grid.appendChild(el);
    });
}

function togglePickerCard(key) {
    playSfx('menuClick');
    const idx = customDeckSelection.indexOf(key);
    if (idx >= 0) {
        customDeckSelection.splice(idx, 1);
    } else {
        if (customDeckSelection.length >= 9) {
            showCdbError('Max 9 cards allowed in a deck.');
            return;
        }
        customDeckSelection.push(key);
    }
    document.getElementById('cdb-error').textContent = '';
    const el = document.querySelector(`.picker-card[data-key="${key}"]`);
    if (el) el.classList.toggle('selected', customDeckSelection.includes(key));
    refreshDeckPreview();
}

function refreshDeckPreview() {
    const slots = document.getElementById('deck-preview-slots');
    const count = document.getElementById('deck-slot-count');
    slots.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const slot = document.createElement('div');
        if (i < customDeckSelection.length) {
            const key = customDeckSelection[i];
            const card = ALL_CARDS[key];
            slot.className = 'deck-preview-slot';
            slot.innerHTML = `
                <span class="deck-preview-slot-icon">${card.i}</span>
                <span class="deck-preview-slot-name">${card.n}</span>
                <span class="deck-preview-slot-remove" title="Remove" onclick="togglePickerCard('${key}')">&#10005;</span>`;
        } else {
            slot.className = 'deck-preview-slot empty';
            slot.innerHTML = `<span class="deck-preview-slot-icon" style="opacity:0.25">&#8212;</span><span class="deck-preview-slot-name" style="opacity:0.25">empty</span>`;
        }
        slots.appendChild(slot);
    }
    const n = customDeckSelection.length;
    count.textContent = n + ' / 9 card' + (n === 1 ? '' : 's');
    count.className = 'deck-slot-count ' + (n === 9 ? 'full' : n >= 3 ? 'ok' : 'low');
}

function showCdbError(msg) {
    const el = document.getElementById('cdb-error');
    el.textContent = msg;
}

function showShareMsg(msg, isError) {
    const el = document.getElementById('cdb-share-msg');
    el.textContent = msg;
    el.style.color = isError ? '#c62828' : '#6b9a40';
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 2200);
}

function encodeDeck(deck) {
    try {
        const payload = { v: 1, n: deck.name, d: deck.desc, i: deck.icon, c: deck.cards };
        return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    } catch(e) { return ''; }
}

function decodeDeck(str) {
    try {
        const json = decodeURIComponent(escape(atob(str.trim())));
        const p = JSON.parse(json);
        if (!p || !p.n || !p.d || !p.i || !Array.isArray(p.c)) return null;
        if (!p.c.every(k => ALL_CARDS[k])) return null;
        if (p.c.length < 1 || p.c.length > 9) return null;
        return p;
    } catch(e) { return null; }
}

function copyDeckCode() {
    const str = document.getElementById('cdb-export-str').value;
    if (!str) { showShareMsg('Save your deck first to generate a code.', true); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(str).then(() => {
            showShareMsg('Code copied to clipboard!', false);
        }).catch(() => { fallbackCopy(str); });
    } else { fallbackCopy(str); }
}

function fallbackCopy(str) {
    const input = document.getElementById('cdb-export-str');
    input.removeAttribute('readonly');
    input.select();
    try { document.execCommand('copy'); showShareMsg('Code copied!', false); } catch(e) { showShareMsg('Select the code and copy manually.', true); }
    input.setAttribute('readonly', '');
}

function importDeckCode() {
    const str = document.getElementById('cdb-import-str').value.trim();
    if (!str) { showShareMsg('Paste a deck code first.', true); return; }
    const p = decodeDeck(str);
    if (!p) { showShareMsg('Invalid or corrupted deck code.', true); return; }
    document.getElementById('cdb-name').value = p.n;
    document.getElementById('cdb-desc').value = p.d;
    customDeckLogo = LOGO_EMOJIS.includes(p.i) ? p.i : '⚔️';
    customDeckSelection = [...p.c];
    buildLogoPickerGrid();
    buildCardPickerGrid();
    refreshDeckPreview();
    document.getElementById('cdb-error').textContent = '';
    document.getElementById('cdb-export-str').value = str;
    showShareMsg('Deck imported! Hit Save to keep it.', false);
}

function saveCustomDeck() {
    const name = document.getElementById('cdb-name').value.trim();
    const desc = document.getElementById('cdb-desc').value.trim();
    if (!name) { showCdbError('Your deck needs a name.'); return; }
    if (!desc)  { showCdbError('Add a description for your deck.'); return; }
    if (customDeckSelection.length < 1) { showCdbError('Pick at least 1 card.'); return; }
    if (customDeckSelection.length > 9) { showCdbError('Max 9 cards allowed.'); return; }

    const n = customDeckSelection.length;
    const weights = customDeckSelection.map((_, i) => parseFloat(((i + 1) / n).toFixed(4)));
    weights[weights.length - 1] = 1.0;

    const targetId = _editingDeckId || 'custom';
    const existingIdx = DECKS.findIndex(d => d.id === targetId);
    if (existingIdx >= 0) DECKS.splice(existingIdx, 1);

    const newDeck = {
        id: targetId,
        name: name,
        icon: customDeckLogo,
        desc: desc,
        cards: [...customDeckSelection],
        weights: weights,
        isCustom: true,
    };
    DECKS.push(newDeck);
    selectedDeckId = targetId;
    _editingDeckId = null;

    document.getElementById('cdb-export-str').value = encodeDeck(newDeck);

    toggle('menu-custom-deck', false);
    toggle('menu-decks', true);
    buildDeckUI();
    saveDeckData();
}

function deleteCustomDeck(deckId) {
    deckId = deckId || 'custom';
    playSfx('menuClick');
    const idx = DECKS.findIndex(d => d.id === deckId);
    if (idx >= 0) DECKS.splice(idx, 1);
    if (selectedDeckId === deckId) selectedDeckId = 'standard';
    buildDeckUI();
    saveDeckData();
}

function openLoadDeckPanel() {
    const panel = document.getElementById('load-deck-panel');
    const input = document.getElementById('load-deck-input');
    const msg   = document.getElementById('load-deck-msg');
    if (!panel) return;
    panel.style.display = 'block';
    input.value = '';
    msg.style.opacity = '0';
    msg.textContent = '';
    setTimeout(() => input.focus(), 80);
    input.onkeydown = (e) => { if (e.key === 'Enter') confirmLoadDeck(); };
}

function closeLoadDeckPanel() {
    const panel = document.getElementById('load-deck-panel');
    if (panel) panel.style.display = 'none';
}

function showLoadMsg(txt, isError) {
    const msg = document.getElementById('load-deck-msg');
    if (!msg) return;
    msg.textContent = txt;
    msg.style.color = isError ? '#c62828' : '#6b9a40';
    msg.style.opacity = '1';
    if (!isError) setTimeout(() => { msg.style.opacity = '0'; }, 2200);
}

function confirmLoadDeck() {
    playSfx('menuClick');
    const str = document.getElementById('load-deck-input').value.trim();
    if (!str) { showLoadMsg('Paste a deck code first.', true); return; }

    const p = decodeDeck(str);
    if (!p) { showLoadMsg('Invalid or corrupted deck code.', true); return; }

    const existingIdx = DECKS.findIndex(d => d.id === 'custom');
    if (existingIdx >= 0) DECKS.splice(existingIdx, 1);

    const n = p.c.length;
    const weights = p.c.map((_, i) => parseFloat(((i + 1) / n).toFixed(4)));
    weights[weights.length - 1] = 1.0;

    const loadedDeck = {
        id: 'custom',
        name: p.n,
        icon: LOGO_EMOJIS.includes(p.i) ? p.i : '⚔️',
        desc: p.d,
        cards: p.c,
        weights: weights,
        isCustom: true,
    };
    DECKS.push(loadedDeck);
    selectedDeckId = 'custom';
    buildDeckUI();
    saveDeckData();
    showLoadMsg('Deck loaded: ' + p.n, false);
    setTimeout(closeLoadDeckPanel, 1800);
}

function buildDeckUI() {
    const grid = document.getElementById('deck-grid');
    grid.innerHTML = '';
    DECKS.forEach(deck => {
        const el = document.createElement('div');
        el.className = 'deck-card' + (deck.id === selectedDeckId ? ' selected' : '');

        let customExtras = '';
        if (deck.isCustom) {
            const code = encodeDeck(deck);
            customExtras = `
                <div style="font-family:Cinzel,serif;font-size:8px;letter-spacing:2px;color:#6b9a40;margin-top:2px;">&#9997; CUSTOM</div>
                <div class="deck-share-popup" id="share-popup-${deck.id}">
                    <div class="deck-share-popup-row">
                        <input class="deck-share-popup-input" id="share-code-${deck.id}" readonly value="${code}">
                        <button class="deck-share-popup-btn" onclick="event.stopPropagation(); copyCardCode('${deck.id}')">Copy</button>
                    </div>
                    <div class="deck-share-popup-msg" id="share-popup-msg-${deck.id}"></div>
                </div>
                <div class="deck-custom-actions">
                    <button class="deck-action-btn share" title="Share deck" onclick="event.stopPropagation(); toggleSharePopup('${deck.id}')">&#128279;</button>
                    <button class="deck-action-btn edit"  title="Edit deck"  onclick="event.stopPropagation(); editCustomDeck('${deck.id}')">&#9998;</button>
                    <button class="deck-action-btn"       title="Duplicate deck" onclick="event.stopPropagation(); duplicateCustomDeck('${deck.id}')" style="color:rgba(100,180,100,0.7);">&#10064;</button>
                    <button class="deck-action-btn del"   title="Delete deck" onclick="event.stopPropagation(); deleteCustomDeck('${deck.id}')">&#128465;</button>
                </div>`;
        }

        el.innerHTML = `
            <div class="deck-card-icon">${deck.icon}</div>
            <div class="deck-card-name">${deck.name}</div>
            <div class="deck-card-desc">${deck.desc}</div>
            <div class="deck-card-cards">${deck.cards.map(k => ALL_CARDS[k].i).join(' ')}</div>
            <div style="font-family:'Cinzel',serif;font-size:8px;letter-spacing:1px;color:#5a4a2a;margin-top:3px;">${getDeckWL(deck.id)}</div>
            ${customExtras}`;
        el.onclick = () => {
            playSfx('menuClick');
            document.querySelectorAll('.deck-share-popup').forEach(p => p.classList.remove('open'));
            selectedDeckId = deck.id;
            buildDeckUI();
            saveDeckData();
        };
        grid.appendChild(el);
    });
}

function toggleSharePopup(deckId) {
    playSfx('menuClick');
    const popup = document.getElementById('share-popup-' + deckId);
    if (!popup) return;
    const isOpen = popup.classList.contains('open');
    document.querySelectorAll('.deck-share-popup').forEach(p => p.classList.remove('open'));
    if (!isOpen) popup.classList.add('open');
}

function copyCardCode(deckId) {
    const input = document.getElementById('share-code-' + deckId);
    const msgEl = document.getElementById('share-popup-msg-' + deckId);
    if (!input || !input.value) return;
    const str = input.value;
    const showMsg = (txt, err) => {
        msgEl.textContent = txt;
        msgEl.style.color = err ? '#c62828' : '#6b9a40';
        msgEl.style.opacity = '1';
        setTimeout(() => { msgEl.style.opacity = '0'; }, 2000);
    };
    window._copyToClipboard
        ? window._copyToClipboard(str, () => showMsg('Copied!', false), () => showMsg('Select & copy manually', true))
        : (input.select(), document.execCommand('copy'), showMsg('Copied!', false));
}

function editCustomDeck(deckId) {
    playSfx('menuClick');
    const deck = DECKS.find(d => d.id === deckId);
    if (!deck) return;
    openCustomDeckBuilder(deck);
}

function getActiveDeck() {
    return DECKS.find(d => d.id === selectedDeckId) || DECKS[0];
}
const CARDS = [
    { id:0, n:"Attack",   i:"⚔️",  rarity:"common",    d:"Deals damage. Crits chain into a free second roll.", m:"CRIT: +Chain | FAIL: Self-Strike" },
    { id:5, n:"Vampire",  i:"🦇",  rarity:"rare",      d:"Drains HP from the opponent and gives half to you.", m:"CRIT: Mega-Drain | FAIL: Safe — 0 effect" },
    { id:2, n:"Heal",     i:"🧪",  rarity:"uncommon",  d:"Restores your HP. Never backfires.", m:"CRIT: Mega-Heal | FAIL: Safe Dose" },
    { id:3, n:"Tariff",   i:"📜",  rarity:"epic",      d:"Halves all damage the opponent deals for 3 turns.", m:"CRIT: 5R Length | FAIL: Self-Debuff" },
    { id:6, n:"Mirror",   i:"🪞",  rarity:"rare",      d:"Reflects the next physical hit back at the attacker.", m:"CRIT: Full reflect | FAIL: Safe — breaks early" },
    { id:7, n:"Plague",   i:"☠️",  rarity:"uncommon",  d:"Poisons the opponent for 3 dmg/turn over 3 turns.", m:"CRIT: +2 dmg/turn | FAIL: Self-inflict" },
    { id:4, n:"Pet",      i:"🐉",  rarity:"legendary", d:"Summons a buffer that absorbs hits before your HP drops.", m:"CRIT: 50% HP Tank | FAIL: Ghost Betrayal" },
    { id:20, n:"Lullaby",   i:"🎵",  rarity:"uncommon",  d:"Skips the opponent's next turn. Fails and you skip yours.", m:"CRIT: Sleep 2 turns | FAIL: Self-daze" },
    { id:21, n:"Aria",      i:"🎶",  rarity:"rare",      d:"Deals double damage on a crit. Costs 4 HP on a fail.", m:"CRIT: x2 dmg | FAIL: Voice crack (self 4 dmg)" },
    { id:22, n:"Serenade",  i:"🌊",  rarity:"common",    d:"Applies tariff — halves opponent damage for 2 turns.", m:"CRIT: Disarming charm | FAIL: Safe" },
    { id:23, n:"Banshee",   i:"👄",  rarity:"epic",      d:"Heavy damage with chain potential. 8 self-damage on fail.", m:"CRIT: Deafening shockwave (chain) | FAIL: Rupture own throat (8 dmg)" },
    { id:24, n:"Chorus",    i:"🎤",  rarity:"uncommon",  d:"Shields you this turn. Crit also adds 2 turns of regen.", m:"CRIT: Sonic barrier (shield + regen) | FAIL: Safe" },
    { id:25, n:"Encore",    i:"🌹",  rarity:"legendary", d:"Big drain and self-heal. Crits amplify both. Risky fail.", m:"CRIT: Triple echo | FAIL: Encore fails twice (self 8 dmg)" },
    { id:26, n:"Strum",     i:"🎸",  rarity:"common",    d:"Standard attack. Crits chain into a free second roll.", m:"CRIT: Power chord (chain) | FAIL: Break string (self 3 dmg)" },
    { id:27, n:"Drumroll",  i:"🥁",  rarity:"uncommon",  d:"Hits twice. Crits hit three times. Fails waste the turn.", m:"CRIT: Triple strike | FAIL: Miss the beat" },
    { id:28, n:"Shanty",    i:"⚓",  rarity:"rare",      d:"Applies regen — heals 3 HP/turn for 3 turns. Safe card.", m:"CRIT: 5 HP/turn for 3 turns | FAIL: Grim shanty (lose HP)" },
    { id:29, n:"Lute",      i:"🪕",  rarity:"uncommon",  d:"Drains HP from the opponent. You recover most of it.", m:"CRIT: Mega-drain | FAIL: Safe" },
    { id:30, n:"Ballad",    i:"📯",  rarity:"epic",      d:"Curses the opponent. Crits also debuff damage. Risky fail.", m:"CRIT: Curse 2 turns + tariff | FAIL: Cursed by own verse" },
    { id:31, n:"Crescendo", i:"🎺",  rarity:"legendary", d:"Damage scales up with each crit in the chain. Gamble it.", m:"CRIT: Escalating blast | FAIL: Anticlimactic (self 6 dmg)" },
    { id:32, n:"Bulwark",   i:"🏰",  rarity:"uncommon",  d:"Raise fortress walls — shield self and reduce tariff duration by 1.", m:"CRIT: Also heal 4 HP | FAIL: Safe" },
    { id:33, n:"Cleave",    i:"🪓",  rarity:"rare",      d:"Heavy swing — deals high melee damage. Crits chain.", m:"CRIT: Cleave chain | FAIL: Overswing (self 5 dmg)" },
    { id:34, n:"Rally",     i:"🚩",  rarity:"epic",      d:"Banner cry — cures poison/burn on self and grants 3 turns of regen.", m:"CRIT: Regen 5 HP/turn | FAIL: Safe" },
    { id:35, n:"Destrier",  i:"🐴",  rarity:"legendary", d:"Mounted charge — massive damage ignoring shields. Risky fail.", m:"CRIT: Crushing chain | FAIL: Unhorsed (self 10 dmg)" },
    { id:36, n:"Volley",    i:"🪃",  rarity:"common",    d:"Loose a volley — hits twice. Crits hit a third time.", m:"CRIT: Third arrow | FAIL: Self-nick (self 2 dmg)" },
    { id:37, n:"Huntmark",  i:"🦅",  rarity:"uncommon",  d:"Mark the quarry — opponent's next card deals 2 less damage.", m:"CRIT: Marked for 3 turns | FAIL: Safe" },
    { id:38, n:"Bramble",   i:"🌿",  rarity:"rare",      d:"Entangle the foe — freeze 1 turn and poison 2 dmg/turn for 2 turns.", m:"CRIT: Freeze 2 + stronger poison | FAIL: Ensnared self" },
    { id:39, n:"Hawkstrike",i:"🦆",  rarity:"epic",      d:"Dive-bomb strike — bypasses shields. Crits also poison 3 dmg/turn.", m:"CRIT: Pierce + poison | FAIL: Miss (self 3 dmg)" },
    { id:40, n:"Miasma",    i:"🫧",  rarity:"uncommon",  d:"Toxic cloud — poisons enemy 4 dmg/turn for 3 turns. Safe card.", m:"CRIT: 6 dmg/turn poison | FAIL: Safe" },
    { id:41, n:"Necrosis",  i:"🦠",  rarity:"rare",      d:"Rotting wound — immediate damage and burn for 2 turns.", m:"CRIT: Also poisons for 2 turns | FAIL: Infect self (self 4 dmg)" },
    { id:42, n:"Contagion", i:"💀",  rarity:"epic",      d:"Spreading sickness — applies both poison AND burn simultaneously.", m:"CRIT: Extended duration | FAIL: Outbreak on self" },
    { id:43, n:"Pandemic",  i:"⚗️",  rarity:"legendary", d:"The Black Death — poisons 5 dmg/turn for 5 turns. Devastating fail.", m:"CRIT: Immediate 10 dmg + pandemic | FAIL: Self-inflict pandemic" },
    { id:44, n:"Decree",    i:"📋",  rarity:"uncommon",  d:"Royal decree — applies tariff on the enemy for 3 turns. Safe card.", m:"CRIT: Tariff 5 turns | FAIL: Safe" },
    { id:45, n:"Tithe",     i:"💎",  rarity:"rare",      d:"Collect tribute — drains enemy HP, scales with active tariff turns.", m:"CRIT: Mega-drain + regen | FAIL: Safe" },
    { id:46, n:"Inquisitor",i:"⚖️",  rarity:"epic",      d:"Judgment — curses the enemy and halves their damage for 2 turns.", m:"CRIT: Curse 2 turns + tariff 3 turns | FAIL: Condemned self" },
];

let state = {
    pHP: 75, aHP: 75, pHand: [],
    turn: true,
    pPet: 0, aPet: 0,
    pTariff: 0, aTariff: 0,
    pMirror: false, aMirror: false,
    pPoison: 0, aPoison: 0,
    pRegen: 0, aRegen: 0, pRegenAmt: 3, aRegenAmt: 3,
    pBurn: 0, aBurn: 0, pBurnDmg: 3, aBurnDmg: 3,
    pFreeze: 0, aFreeze: 0,
    pCurse: 0, aCurse: 0,
    pShield: false, aShield: false,
    pGoldRerolls: 0, aGoldRerolls: 0,
};

const opt = id => document.getElementById(id)?.checked ?? true;
function animSpeed() {
    const v = parseFloat(document.getElementById('opt-speed')?.value ?? '1');
    return isNaN(v) ? 1 : v;
}
function delay(ms) { return new Promise(r => setTimeout(r, _skipRequested ? 0 : ms / animSpeed())); }
function toggle(id, show) {
    const el = document.getElementById(id);
    if (!el) return;
    const isSubMenu = id !== 'menu-main';
    const changelog = document.getElementById('changelog-panel');
    if (show) {
        el.style.display = 'flex';
        if (isSubMenu) {
            if (changelog) changelog.style.opacity = '0';
            el.classList.add('screen-animatable');
            el.offsetHeight;
            el.classList.remove('screen-closing');
            el.classList.add('screen-visible');
        }
    } else {
        if (isSubMenu && el.classList.contains('screen-animatable')) {
            el.classList.remove('screen-visible');
            el.classList.add('screen-closing');
            // Restore changelog immediately on close
            const anyOtherOpen = document.querySelector('.screen-visible');
            if (!anyOtherOpen && changelog) {
                const clEnabled = document.getElementById('opt-update-log')?.checked ?? true;
                changelog.style.visibility = '';
                changelog.style.pointerEvents = '';
                if (clEnabled) changelog.style.opacity = '1';
            }
            setTimeout(() => {
                if (el.classList.contains('screen-closing')) {
                    el.style.display = 'none';
                    el.classList.remove('screen-closing', 'screen-animatable');
                }
            }, 280);
        } else {
            el.style.display = 'none';
        }
    }
}
