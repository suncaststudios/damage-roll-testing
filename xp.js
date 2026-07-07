/* ═══════════════════════════════════════════════════════════════════
   XP & LEVEL SYSTEM  —  xp.js
   ─────────────────────────────────────────────────────────────────
   Replaces the old rank_score / getRankTier system entirely.

   XP gains / losses:
     Online win        +30 XP
     Online loss       -15 XP
     Online forfeit    -25 XP
     Offline win       +10 XP
     Offline loss       -5 XP
     Private match       0 XP (no XP either way — prevents win-trading)
     Achievement unlock  varies by rarity (see XP_ACH_REWARD)

   Leveling:
     Each level threshold = Math.floor(100 * (level ^ 1.4))
     Players CAN de-level if XP drops below the previous threshold.
     Level is displayed on profile, leaderboard, lobby, forum headers.

   Storage:
     Local:    _profileData.xp / _profileData.level (via saveProfileData)
     Supabase: profiles.xp  /  profiles.level  (synced on change)
═══════════════════════════════════════════════════════════════════ */

/* ─── XP reward table ─────────────────────────────────────────── */
const XP_ONLINE_WIN      =  30;
const XP_ONLINE_LOSS     = -15;
const XP_ONLINE_FORFEIT  = -25;
const XP_OFFLINE_WIN     =  10;
const XP_OFFLINE_LOSS    =  -5;

const XP_ACH_REWARD = {
    common:    20,
    uncommon:  40,
    rare:      80,
    epic:     150,
    legendary:300,
};

/* ─── Level threshold formula ─────────────────────────────────── */
function xpForLevel(level) {
    // XP needed to reach `level` from 0
    if (level <= 1) return 0;
    let total = 0;
    for (let l = 2; l <= level; l++) {
        total += Math.floor(100 * Math.pow(l - 1, 1.4));
    }
    return total;
}

function xpToNextLevel(level) {
    // XP needed to go from `level` to `level+1`
    return Math.floor(100 * Math.pow(level, 1.4));
}

/* ─── Calculate level from raw XP total ─────────────────────────── */
function levelFromXP(xp) {
    if (xp < 0) xp = 0;
    let level = 1;
    while (xp >= xpForLevel(level + 1)) level++;
    return level;
}

/* ─── XP progress within current level (0–1) ─────────────────── */
function xpProgress(xp) {
    if (xp < 0) xp = 0;
    const level      = levelFromXP(xp);
    const levelStart = xpForLevel(level);
    const levelEnd   = xpForLevel(level + 1);
    return (xp - levelStart) / (levelEnd - levelStart);
}

/* ─── Tier label from level (purely cosmetic) ─────────────────── */
function levelTier(level) {
    if (level >= 100) return { label: 'Mythic',    color: '#ff80ff', icon: '✦' };
    if (level >= 75)  return { label: 'Legendary', color: '#ffd700', icon: '👑' };
    if (level >= 50)  return { label: 'Diamond',   color: '#a8d8f0', icon: '💎' };
    if (level >= 35)  return { label: 'Platinum',  color: '#a0c8e0', icon: '🔷' };
    if (level >= 20)  return { label: 'Gold',      color: '#ffd700', icon: '🥇' };
    if (level >= 10)  return { label: 'Silver',    color: '#c0c0c0', icon: '🥈' };
    if (level >= 5)   return { label: 'Bronze',    color: '#cd7f32', icon: '🥉' };
    return                   { label: 'Iron',      color: '#8a8a8a', icon: '⚙️' };
}

/* ─── Award / deduct XP ────────────────────────────────────────── */
function awardXP(amount, reason) {
    const prev    = _profileData.xp    || 0;
    const newXP   = Math.max(0, prev + amount);
    const prevLvl = levelFromXP(prev);
    const newLvl  = levelFromXP(newXP);

    _profileData.xp    = newXP;
    _profileData.level = newLvl;
    saveProfileData();
    _xpSyncToSupabase();

    // Show XP toast
    _xpToast(amount, reason, newLvl, prevLvl !== newLvl);

    // Update all displays
    _xpUpdateDisplays();
}

/* ─── Called by trackGameEnd in achievements.js ─────────────────── */
function _xpOnMatchEnd(won, isOnline, isPrivate, isOffline) {
    if (isPrivate) return; // no XP for private matches
    let delta = 0;
    if (isOnline) {
        delta = won ? XP_ONLINE_WIN : XP_ONLINE_LOSS;
    } else {
        // Offline (vs AI)
        delta = won ? XP_OFFLINE_WIN : XP_OFFLINE_LOSS;
    }
    if (delta !== 0) awardXP(delta, won ? 'Victory' : 'Defeat');
}

/* ─── Called by confirmForfeit ──────────────────────────────────── */
function _xpOnForfeit(isOnline, isPrivate) {
    if (isPrivate) return;
    if (isOnline) awardXP(XP_ONLINE_FORFEIT, 'Forfeit');
    // Offline forfeit: no XP change (no reward or penalty for quitting AI)
}

/* ─── Called by unlockAch in achievements.js ────────────────────── */
function _xpOnAchievement(rarity) {
    const reward = XP_ACH_REWARD[rarity] || XP_ACH_REWARD.common;
    awardXP(reward, 'Achievement');
}

/* ─── Sync to Supabase (debounced, fire-and-forget) ─────────────── */
let _xpSyncTimer = null;
function _xpSyncToSupabase() {
    clearTimeout(_xpSyncTimer);
    _xpSyncTimer = setTimeout(async () => {
        const sb  = window._supabase;
        const uid = window._syncedUid;
        if (!sb || !uid) return;
        try {
            await sb.from('profiles').update({
                xp:    _profileData.xp    || 0,
                level: _profileData.level || 1,
            }).eq('id', uid);
        } catch(e) { console.warn('[DR XP] sync error', e); }
    }, 2000);
}

/* ─── Load XP from Supabase (merged into _fetchProfileByUid) ───── */
// Called from auth.js _fetchProfileByUid — just reads data.xp / data.level
// The hook is in auth.js; this function is a no-op but documents the contract.
function _xpLoadFromProfile(data) {
    if (!data) return;
    _profileData.xp    = data.xp    || 0;
    _profileData.level = data.level || levelFromXP(_profileData.xp || 0);
    _xpUpdateDisplays();
}

/* ─── Update all level/XP displays on screen ──────────────────── */
function _xpUpdateDisplays() {
    const xp    = _profileData.xp    || 0;
    const level = _profileData.level || 1;
    const tier  = levelTier(level);
    const prog  = xpProgress(xp);
    const toNext = xpToNextLevel(level) - (xp - xpForLevel(level));

    // Profile screen badge
    const tierEl  = document.getElementById('prf-rank-tier-label');
    const scoreEl = document.getElementById('prf-rank-score-label');
    const lvlEl   = document.getElementById('prf-level-num');
    const progEl  = document.getElementById('prf-xp-bar-fill');
    const toNextEl= document.getElementById('prf-xp-to-next');

    if (tierEl)   { tierEl.textContent  = tier.label; tierEl.style.color = tier.color; }
    if (scoreEl)  { scoreEl.textContent = `Level ${level}`; }
    if (lvlEl)    { lvlEl.textContent   = level; }
    if (progEl)   { progEl.style.width  = Math.round(prog * 100) + '%'; }
    if (toNextEl) { toNextEl.textContent= `${toNext} XP to next level`; }

    // Corner pill
    const cornerLvl = document.getElementById('corner-level-badge');
    if (cornerLvl) { cornerLvl.textContent = `Lv.${level}`; }

    // Lobby / leaderboard — handled when those screens open
}

/* ─── XP + level-up toast ─────────────────────────────────────── */
let _xpToastTimer = null;
function _xpToast(delta, reason, newLevel, leveledUp) {
    let toast = document.getElementById('xp-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'xp-toast';
        toast.style.cssText = `
            position:fixed; bottom:80px; right:24px; z-index:9999;
            background:rgba(10,5,0,.96);
            border:1px solid rgba(140,95,25,.5);
            border-radius:10px; padding:12px 18px;
            font-family:'Cinzel',serif;
            display:flex; flex-direction:column; align-items:center; gap:4px;
            box-shadow:0 8px 30px rgba(0,0,0,.8);
            opacity:0; transition:opacity .3s;
            pointer-events:none;
        `;
        document.body.appendChild(toast);
    }

    const sign  = delta >= 0 ? '+' : '';
    const color = delta >= 0 ? '#7ae87a' : '#e87a7a';
    const tier  = levelTier(newLevel);

    toast.innerHTML = `
        <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#6b4f2a;">${reason}</div>
        <div style="font-size:22px;font-weight:700;color:${color};">${sign}${delta} XP</div>
        ${leveledUp ? `
        <div style="font-size:11px;color:#ffd700;letter-spacing:1px;">
            ⬆ Level Up! → Lv.${newLevel}
        </div>
        <div style="font-size:10px;color:${tier.color};">${tier.icon} ${tier.label}</div>
        ` : `
        <div style="font-size:10px;color:#7a5a30;">Level ${newLevel}</div>
        `}
    `;
    toast.style.opacity = '1';
    clearTimeout(_xpToastTimer);
    _xpToastTimer = setTimeout(() => {
        toast.style.opacity = '0';
    }, leveledUp ? 4000 : 2800);
}

/* ─── Init on DOMContentLoaded ──────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
    _xpUpdateDisplays();
});
