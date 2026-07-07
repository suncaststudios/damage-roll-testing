/* ═══════════════════════════════════ PROFILE SYSTEM (local) ════════════════════════════════════
   No external account required. Profile lives in localStorage.
   Players set everything up and edit it directly inside the game.
════════════════════════════════════════════════════════════════════════════════════════════════ */

const PROFILE_KEY = 'dr_profile';

const PROFILE_AVATARS = [
    '⚔️','🦇','🧪','📜','🪞','☠️','🐉','💣','🛡️','⚡',
    '🔮','🌿','🏹','🩸','🔥','❄️','💰','🦴','👻','💀',
    '🃏','👑','🌑','🎭','🎲','🔱','⚗️','🗡️','🌙','✦',
    '🎵','🎶','🎤','🌹','🥁','🎸','🦅','🐺','🕷️','🌊',
];

// Banner presets — gradient strings used as CSS background
const PROFILE_BANNERS = [
    'linear-gradient(135deg,#2a0e00,#5a2200,#2a1000)',
    'linear-gradient(135deg,#0a1a2e,#0d3060,#0a1020)',
    'linear-gradient(135deg,#1a0a2e,#3d1060,#180828)',
    'linear-gradient(135deg,#0e1a0a,#1e4010,#0a1206)',
    'linear-gradient(135deg,#1a0a0a,#501010,#200808)',
    'linear-gradient(135deg,#0a1818,#104040,#081010)',
    'linear-gradient(135deg,#18100a,#50300a,#100800)',
    'linear-gradient(135deg,#0c0c18,#201040,#080810)',
    'linear-gradient(135deg,#1a1a1a,#383838,#101010)',
    'linear-gradient(135deg,#1a0e10,#40101a,#0e0810)',
    'linear-gradient(135deg,#0a180a,#103818,#081008)',
    'linear-gradient(135deg,#180a18,#381038,#100810)',
];

// Random name generator
const _NAME_ADJ = [
    'Iron','Shadow','Crimson','Silver','Cursed','Ancient','Blazing','Storm',
    'Hollow','Dread','Ashen','Frost','Gilded','Vile','Broken','Dire',
    'Fallen','Sacred','Arcane','Grim','Savage','Wicked','Twisted','Dark',
    'Phantom','Runed','Sunken','Bitter','Lone','Blood',
];
const _NAME_NOUN = [
    'Knight','Serpent','Oracle','Wanderer','Rogue','Sage','Berserker','Warden',
    'Specter','Blade','Herald','Revenant','Hunter','Wraith','Sentinel','Arbiter',
    'Duelist','Champion','Exile','Seeker','Cultist','Marauder','Sorcerer','Templar',
    'Phantom','Invoker','Reaper','Harbinger','Outcast','Warlord',
];
function _genRandomUsername() {
    const adj  = _NAME_ADJ[Math.floor(Math.random() * _NAME_ADJ.length)];
    const noun = _NAME_NOUN[Math.floor(Math.random() * _NAME_NOUN.length)];
    const nums = String(Math.floor(Math.random() * 900) + 100);
    return adj + noun + nums;
}

let _profileData = {
    username: _genRandomUsername(),
    avatar:   '⚔️',
    banner:   PROFILE_BANNERS[0],
    avatarImg: null,   // base64 custom image, or null
    bannerImg: null,   // base64 custom image, or null
    bio:'', discord:'', twitter:'', youtube:'', itch:'',
    pinnedAch:null, memberSince:null,
    xp:    0,
    level: 1,
    wins:  0,
    losses:0,
    _isSetup: false,   // true once user has deliberately saved a profile
};
let _pinnedAchSelection = null;

// _syncedUid and _fetchProfileByUid are defined in auth.js (the real implementations).
// profile.js only handles local storage and rendering.
let _syncedUid  = null;  // set by auth.js _authOnLogin
let _syncedCode = null;  // Short display/room code tied to the account

function loadProfile() {
    try {
        const raw = localStorage.getItem(PROFILE_KEY);
        if (raw) {
            const saved = JSON.parse(raw);
            Object.assign(_profileData, saved);
            // If old save didn't have a banner, keep default
            if (!_profileData.banner) _profileData.banner = PROFILE_BANNERS[0];
        }
    } catch(e) {}
    if (!_profileData.memberSince) {
        _profileData.memberSince = new Date().toLocaleDateString('en-US',{year:'numeric',month:'long'});
        saveProfileData();
    }
}

function saveProfileData() {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(_profileData)); } catch(e) {}
}

function _updateCornerBtn() {
    const btn = document.getElementById('profile-corner-btn');
    if (!btn) return;
    if (!_syncedUid) {
        btn.innerHTML = '👤 Login';
        btn.title = 'Login / Create Account';
        return;
    }
    const av = _profileData.avatarImg
        ? `<img src="${_profileData.avatarImg}" style="width:18px;height:18px;border-radius:50%;object-fit:cover;">`
        : (_profileData.avatar || '⚔️');
    btn.innerHTML = av + ' ' + (_profileData.username || 'Profile');
    btn.title = _profileData.username || 'Profile';
}

function openProfile() {
    playSfx('menuClick');
    if (!_syncedUid) {
        _showAuthWall();
        return;
    }
    loadProfile();
    _renderProfileView();
    const modal = document.getElementById('profile-edit-modal');
    if (modal) { modal.style.display = 'none'; modal.classList.remove('open'); }
    toggle('menu-profile', true);
    _updateCornerBtn();
}

function _renderProfileView() {
    const el = id => document.getElementById(id);
    if (!el('profile-view-username')) return;
    el('profile-view-username').textContent     = _profileData.username || 'Wanderer';
    el('profile-view-discord-text').textContent = _profileData.discord  || '—';
    // Avatar — custom image takes priority over emoji
    const avEl = el('profile-avatar-display');
    if (avEl) {
        if (_profileData.avatarImg) {
            avEl.innerHTML = `<img src="${_profileData.avatarImg}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
            avEl.textContent = _profileData.avatar || '⚔️';
        }
    }
    // Banner
    const coverEl = document.getElementById('profile-cover-banner');
    if (coverEl) {
        if (_profileData.bannerImg) {
            coverEl.style.background = 'none';
            coverEl.style.backgroundImage = `url(${_profileData.bannerImg})`;
            coverEl.style.backgroundSize = 'cover';
            coverEl.style.backgroundPosition = 'center';
        } else {
            coverEl.style.backgroundImage = '';
            coverEl.style.background = _profileData.banner || PROFILE_BANNERS[0];
        }
    }
    const bioEl = el('profile-view-bio');
    if (bioEl) bioEl.textContent = _profileData.bio || 'No bio set.';
    const socialsEl = el('profile-view-socials');
    if (socialsEl) {
        const links = [
            { icon:`<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`, val:_profileData.twitter },
            { icon:`<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M23.5 6.2s-.3-2-1.2-2.8c-1.1-1.2-2.4-1.2-3-1.3C16.8 2 12 2 12 2s-4.8 0-7.3.2c-.6 0-1.9.1-3 1.3C.8 4.3.5 6.2.5 6.2S.2 8.4.2 10.6v2.1c0 2.2.3 4.4.3 4.4s.3 2 1.2 2.8c1.1 1.2 2.6 1.1 3.3 1.2C7 21.2 12 21.2 12 21.2s4.8 0 7.3-.2c.6-.1 1.9-.1 3-1.3.9-.8 1.2-2.8 1.2-2.8s.3-2.2.3-4.4v-2c0-2.2-.3-4.3-.3-4.3zM9.7 15.5V8.4l8.1 3.6-8.1 3.5z"/></svg>`, val:_profileData.youtube },
            { icon:'🎮', val:_profileData.itch },
        ].filter(l => l.val);
        socialsEl.innerHTML = links.length
            ? links.map(l=>`<div class="profile-social-row"><span class="profile-social-icon">${l.icon}</span><span style="font-family:'Cinzel',serif;font-size:10px;color:#7a5a30;letter-spacing:1px;">${l.val}</span></div>`).join('')
            : '';
        socialsEl.style.display = links.length ? 'flex' : 'none';
    }
    if (el('pstat-wins'))   el('pstat-wins').textContent   = achStats.wins         || 0;
    if (el('pstat-losses')) el('pstat-losses').textContent = achStats.losses       || 0;
    if (el('pstat-streak')) el('pstat-streak').textContent = achStats.maxWinStreak || 0;
    if (el('pstat-achs'))   el('pstat-achs').textContent   = (typeof unlockedAchs !== 'undefined') ? unlockedAchs.size : 0;
    const favDeck = (typeof DECKS !== 'undefined')
        ? DECKS.reduce((b,d)=>{ const w=(achStats.deckWins&&achStats.deckWins[d.id])||0; return w>(b.w||0)?{d,w}:b; },{d:DECKS[0],w:0}).d
        : null;
    if (favDeck) {
        if (el('profile-fav-deck-icon')) el('profile-fav-deck-icon').textContent = favDeck.icon || '⚔️';
        if (el('profile-fav-deck-name')) el('profile-fav-deck-name').textContent = favDeck.name || 'Standard';
    }
    if (el('profile-member-since'))
        el('profile-member-since').textContent = 'Member since: ' + (_profileData.memberSince || '—');
    _pinnedAchSelection = _profileData.pinnedAch || null;
    if (typeof renderPinnedAch  === 'function') renderPinnedAch();
    if (typeof updateClubTitle  === 'function') updateClubTitle();
    const bsc = el('bio-socials-content');
    const bsa = el('bio-socials-arrow');
    if (bsc) bsc.classList.remove('open');
    if (bsa) bsa.classList.remove('open');
}

function openProfileEdit() {
    playSfx('menuClick');
    const el = id => document.getElementById(id);
    if (el('profile-username')) el('profile-username').value = _profileData.username || '';
    if (el('profile-bio'))      el('profile-bio').value      = _profileData.bio      || '';
    if (el('profile-discord'))  el('profile-discord').value  = _profileData.discord  || '';
    if (el('profile-twitter'))  el('profile-twitter').value  = _profileData.twitter  || '';
    if (el('profile-youtube'))  el('profile-youtube').value  = _profileData.youtube  || '';
    if (el('profile-itch'))     el('profile-itch').value     = _profileData.itch     || '';
    // Avatar display in edit modal
    const avEditEl = el('profile-edit-avatar-display');
    if (avEditEl) {
        if (_profileData.avatarImg) {
            avEditEl.innerHTML = `<img src="${_profileData.avatarImg}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
            avEditEl.textContent = _profileData.avatar || '⚔️';
        }
    }
    // Banner preview in edit modal
    _refreshBannerPreview();
    if (el('profile-save-msg')) el('profile-save-msg').style.opacity = '0';
    if (el('profile-avatar-picker'))  el('profile-avatar-picker').style.display  = 'none';
    if (el('profile-banner-picker'))  el('profile-banner-picker').style.display  = 'none';
    const modal = el('profile-edit-modal');
    if (modal) { modal.style.display = 'flex'; modal.classList.add('open'); }
}

function closeProfileEdit() {
    playSfx('menuClick');
    const modal = document.getElementById('profile-edit-modal');
    if (modal) { modal.style.display = 'none'; modal.classList.remove('open'); }
}

function saveProfile() {
    playSfx('menuClick');
    const el = id => document.getElementById(id);
    const rawName = (el('profile-username')?.value||'').trim();
    _profileData.username  = rawName || _genRandomUsername();
    _profileData.bio       = (el('profile-bio')?.value||'').trim();
    _profileData.discord   = (el('profile-discord')?.value||'').trim();
    _profileData.twitter   = (el('profile-twitter')?.value||'').trim();
    _profileData.youtube   = (el('profile-youtube')?.value||'').trim();
    _profileData.itch      = (el('profile-itch')?.value||'').trim();
    _profileData.pinnedAch = _pinnedAchSelection;
    _profileData._isSetup  = true;
    // Always save locally first (instant, no network)
    saveProfileData();
    _renderProfileView();
    _updateCornerBtn();
    if (typeof updateClubTitle === 'function') updateClubTitle();
    // ONE batched DB write — only if logged in
    if (window._supabase && _syncedUid) {
        window._supabase.from('profiles').update({
            username:   _profileData.username,
            avatar:     _profileData.avatar,
            avatar_img: _profileData.avatarImg || '',
            banner_img: _profileData.bannerImg || '',
            bio:        _profileData.bio,
        }).eq('id', _syncedUid).then(() => {});
        // ^ fire-and-forget, no await — UI doesn't need to wait
    }
    const msg = el('profile-save-msg');
    if (msg) { msg.textContent = '✦ Saved!'; msg.style.opacity = '1'; }
    const pending = window._afterProfileFn;
    window._afterProfileFn = null;
    setTimeout(() => {
        if (msg) msg.style.opacity = '0';
        closeProfileEdit();
        const gate = document.getElementById('profile-gate-overlay');
        if (gate) gate.style.display = 'none';
        if (window._profileGateActive) {
            window._profileGateActive = false;
            toggle('menu-profile', false);
        }
        if (pending) pending();
    }, 1000);
}

// Wire online display name to profile username
window._getDisplayName = () => _profileData.username || 'Wanderer';

// Startup
loadProfile();
_updateCornerBtn();

/* ─────────────────────────────────────────────────────────────────────────
   PROFILE GATE — blocks multiplayer until username has been set
───────────────────────────────────────────────────────────────────────── */

function _isProfileComplete() {
    // True if they have ANY username that isn't blank.
    const name = _profileData.username || '';
    return name.trim().length > 0;
}

/* ── Online card click handler — checks login, grays out if not logged in ── */
function _startOnlineBtn(fn) {
    if (!_syncedUid) {
        // Not logged in — show notice, don't navigate
        _updateStartScreen();
        return;
    }
    if (!window._dbReady) {
        // Supabase still initialising — show a brief toast and do NOT close the menu
        _startScreenToast('Connecting to server…');
        // Retry once ready
        const check = setInterval(() => {
            if (window._dbReady) { clearInterval(check); _startOnlineBtn(fn); }
        }, 300);
        return;
    }
    playSfx('menuClick');
    fn();
}

function _startScreenToast(msg) {
    let t = document.getElementById('start-toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'start-toast';
        t.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);z-index:9990;background:rgba(10,6,2,.95);border:1px solid rgba(140,95,25,.5);border-radius:999px;padding:7px 20px;font-family:Cinzel,serif;font-size:10px;letter-spacing:2px;color:#c8a460;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .2s;';
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t._hide);
    t._hide = setTimeout(() => { t.style.opacity = '0'; }, 2200);
}

/* ── Hover helper — only glows if logged in ── */
function _startCardHover(el, on) {
    if (!_syncedUid) return; // no hover effect when locked
    el.style.borderColor = on ? 'rgba(220,170,60,0.85)' : 'rgba(180,130,40,0.55)';
    el.style.boxShadow   = on
        ? '0 6px 28px rgba(0,0,0,0.8),0 0 18px rgba(180,120,0,0.18)'
        : '0 4px 20px rgba(0,0,0,0.6)';
}

/* ── Why account toggle ── */
function _toggleWhyAccount() {
    const el  = document.getElementById('start-why-account');
    const btn = el?.previousElementSibling?.querySelector('button');
    if (!el) return;
    const open = el.style.display === 'none';
    el.style.display = open ? 'block' : 'none';
    if (btn) btn.textContent = (open ? 'Why do these require an account? ▴' : 'Why do these require an account? ▾');
}

/* ── Update the start screen state based on login ── */
function _updateStartScreen() {
    const loggedIn = !!_syncedUid;
    const notice   = document.getElementById('start-login-notice');
    const ids      = ['start-btn-private', 'start-btn-match'];

    // Notice below grid
    if (notice) notice.style.display = loggedIn ? 'none' : 'block';

    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (loggedIn) {
            el.style.opacity      = '1';
            el.style.cursor       = 'pointer';
            el.style.borderColor  = 'rgba(180,130,40,0.55)';
            el.style.filter       = '';
        } else {
            el.style.opacity      = '0.4';
            el.style.cursor       = 'not-allowed';
            el.style.borderColor  = 'rgba(80,55,20,0.3)';
            el.style.filter       = 'grayscale(0.4)';
        }
    });
}

// Call before any multiplayer action. If profile not set up, shows gate then calls fn after.
function _requireProfile(fn) {
    if (_isProfileComplete()) { fn(); return; }
    window._afterProfileFn   = fn;
    window._profileGateActive = true;
    _showProfileGate();
}

function _showProfileGate() {
    const gate = document.getElementById('profile-gate-overlay');
    if (gate) { gate.style.display = 'flex'; return; }
    // Build it once
    const el = document.createElement('div');
    el.id = 'profile-gate-overlay';
    el.innerHTML = `
        <div class="prf-gate-box">
            <div class="prf-gate-icon">⚔️</div>
            <div class="prf-gate-title">Profile Required</div>
            <div class="prf-gate-msg">You need to set up your profile before playing online.<br>Choose a name and avatar to represent yourself in battle.</div>
            <div class="prf-gate-btns">
                <button class="btn primary" onclick="_gateGoToProfile()">✦ Set Up Profile</button>
                <button class="btn" onclick="_gateDismiss()">Cancel</button>
            </div>
        </div>`;
    document.getElementById('game-root')?.appendChild(el) || document.body.appendChild(el);
    el.style.display = 'flex';
}

function _gateGoToProfile() {
    const gate = document.getElementById('profile-gate-overlay');
    if (gate) gate.style.display = 'none';
    // Open profile screen then immediately open the edit modal
    toggle('menu-profile', true);
    setTimeout(() => openProfileEdit(), 80);
}

function _gateDismiss() {
    window._afterProfileFn    = null;
    window._profileGateActive = false;
    const gate = document.getElementById('profile-gate-overlay');
    if (gate) gate.style.display = 'none';
}

/* ─────────────────────────────────────────────────────────────────────────
   AVATAR PICKER — emoji grid
───────────────────────────────────────────────────────────────────────── */

function openAvatarPicker() {
    const picker = document.getElementById('profile-avatar-picker');
    const grid   = document.getElementById('profile-avatar-grid');
    if (!picker || !grid) return;
    grid.innerHTML = PROFILE_AVATARS.map(a =>
        `<button class="profile-avatar-option${_profileData.avatar===a?' selected':''}"
            onclick="_pickAvatar('${a}')">${a}</button>`
    ).join('');
    picker.style.display = 'block';
}

function _pickAvatar(emoji) {
    _profileData.avatar    = emoji;
    _profileData.avatarImg = null; // clear custom image if switching to emoji
    const avEl = document.getElementById('profile-edit-avatar-display');
    if (avEl) avEl.textContent = emoji;
    // Highlight selected
    document.querySelectorAll('.profile-avatar-option').forEach(b =>
        b.classList.toggle('selected', b.textContent === emoji));
}

function closeAvatarPicker() {
    const picker = document.getElementById('profile-avatar-picker');
    if (picker) picker.style.display = 'none';
}

// Upload custom avatar image
function triggerAvatarUpload() {
    const input = document.getElementById('avatar-file-input');
    if (input) input.click();
}

function _onAvatarFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please choose an image file.'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
        _profileData.avatarImg = ev.target.result;
        const avEl = document.getElementById('profile-edit-avatar-display');
        if (avEl) avEl.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        closeAvatarPicker();
    };
    reader.readAsDataURL(file);
}

/* ─────────────────────────────────────────────────────────────────────────
   BANNER PICKER — gradient presets + custom upload
───────────────────────────────────────────────────────────────────────── */

function openBannerPicker() {
    const picker = document.getElementById('profile-banner-picker');
    if (!picker) return;
    const grid = document.getElementById('profile-banner-grid');
    if (grid) {
        grid.innerHTML = PROFILE_BANNERS.map((b, i) =>
            `<button class="profile-banner-option${_profileData.banner===b&&!_profileData.bannerImg?' selected':''}"
                style="background:${b};"
                onclick="_pickBanner(${i})"></button>`
        ).join('');
    }
    picker.style.display = 'block';
    _refreshBannerPreview();
}

function _pickBanner(index) {
    _profileData.banner    = PROFILE_BANNERS[index];
    _profileData.bannerImg = null;
    _refreshBannerPreview();
    document.querySelectorAll('.profile-banner-option').forEach((b, i) =>
        b.classList.toggle('selected', i === index));
}

function closeBannerPicker() {
    const picker = document.getElementById('profile-banner-picker');
    if (picker) picker.style.display = 'none';
}

function _refreshBannerPreview() {
    const prev = document.getElementById('profile-banner-preview');
    if (!prev) return;
    if (_profileData.bannerImg) {
        prev.style.background = 'none';
        prev.style.backgroundImage = `url(${_profileData.bannerImg})`;
        prev.style.backgroundSize = 'cover';
        prev.style.backgroundPosition = 'center';
    } else {
        prev.style.backgroundImage = '';
        prev.style.background = _profileData.banner || PROFILE_BANNERS[0];
    }
}

function triggerBannerUpload() {
    const input = document.getElementById('banner-file-input');
    if (input) input.click();
}

function _onBannerFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please choose an image file.'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
        _profileData.bannerImg = ev.target.result;
        _profileData.banner    = PROFILE_BANNERS[0];
        _refreshBannerPreview();
        // Deselect all gradient swatches
        document.querySelectorAll('.profile-banner-option').forEach(b => b.classList.remove('selected'));
        closeBannerPicker();
    };
    reader.readAsDataURL(file);
}

/* ═══════════════════════════════════ END PROFILE SYSTEM ════════════════════════════════════ */

/* ── updateClubTitle — updates the club badge shown on the profile screen ── */
function updateClubTitle() {
    const el = document.getElementById('profile-club-title');
    if (!el) return;
    const club = _clubsState?.myClub;
    el.textContent = club ? (club.badge || '⚔️') + ' ' + club.name : '⚔ Wanderer';
}

/* ── renderPinnedAch — renders the pinned achievement on the profile card ── */
function renderPinnedAch() {
    const wrap = document.getElementById('profile-pinned-ach');
    if (!wrap) return;
    const ach = _pinnedAchSelection
        ? (typeof ACHIEVEMENTS !== 'undefined' ? ACHIEVEMENTS.find(a => a.id === _pinnedAchSelection) : null)
        : null;
    const iconEl  = document.getElementById('profile-pinned-icon');
    const nameEl  = document.getElementById('profile-pinned-name');
    const rarEl   = document.getElementById('profile-pinned-rarity');
    if (!ach) {
        if (iconEl)  iconEl.textContent  = '🏆';
        if (nameEl)  nameEl.textContent  = 'No achievement pinned';
        if (rarEl)   rarEl.textContent   = '';
        wrap.parentElement.style.display = 'none';
        return;
    }
    wrap.parentElement.style.display = '';
    if (iconEl)  iconEl.textContent  = ach.icon  || '🏆';
    if (nameEl)  nameEl.textContent  = ach.name  || '';
    if (rarEl)   rarEl.textContent   = ach.rarity || '';
}

/* ── Pin picker — lets player choose which achievement to display on profile ── */
function openPinPicker() {
    const picker = document.getElementById('profile-pin-picker');
    const grid   = document.getElementById('profile-pin-grid');
    if (!picker || !grid) return;

    if (typeof ACHIEVEMENTS === 'undefined' || typeof unlockedAchs === 'undefined') {
        grid.innerHTML = '<div style="font-family:Cinzel,serif;font-size:9px;color:#6b4f2a;">No achievements unlocked yet.</div>';
        picker.style.display = 'block';
        return;
    }

    const unlocked = ACHIEVEMENTS.filter(a => unlockedAchs.has(a.id));
    if (unlocked.length === 0) {
        grid.innerHTML = '<div style="font-family:Cinzel,serif;font-size:9px;color:#6b4f2a;">No achievements unlocked yet.</div>';
        picker.style.display = 'block';
        return;
    }

    grid.innerHTML = unlocked.map(a => `
        <div class="profile-pin-option${_pinnedAchSelection === a.id ? ' selected' : ''}"
             onclick="_selectPinnedAch('${a.id}')">
            <span class="profile-pin-option-icon">${a.icon || '🏆'}</span>
            <span class="profile-pin-option-name">${a.name || ''}</span>
            <span class="profile-pin-option-rarity">${a.rarity || ''}</span>
        </div>`).join('');

    picker.style.display = 'block';
}

function closePinPicker() {
    const picker = document.getElementById('profile-pin-picker');
    if (picker) picker.style.display = 'none';
    renderPinnedAch();
}

function _selectPinnedAch(id) {
    _pinnedAchSelection = id;
    // Highlight selected
    document.querySelectorAll('.profile-pin-option').forEach(el => {
        el.classList.toggle('selected', el.getAttribute('onclick')?.includes(id));
    });
}
