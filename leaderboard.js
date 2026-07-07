/* LEADERBOARD SYSTEM  –  Supabase backend
   ---------------------------------------------------------------
   Reads from profiles and clubs tables.
   Add these columns to `profiles` if not already present:
     alter table profiles add column if not exists xp              int default 0;
     alter table profiles add column if not exists level           int default 1;
     alter table profiles add column if not exists wins            int default 0;
     alter table profiles add column if not exists losses          int default 0;
     alter table profiles add column if not exists tournaments_won int default 0;
   rank_score column is no longer used — level/xp replaced it.
================================================================ */

const _lbState = { tab: 'top-rank', loaded: {} };

function openLeaderboard() {
    playSfx('menuClick');
    toggle('menu-leaderboard', true);
    _fetchLbTab('top-rank');
}

function switchLbTab(id) {
    _lbState.tab = id;
    const tabs = ['top-rank','most-wins','most-losses','club-rank','tournaments'];
    document.querySelectorAll('.lb-tab').forEach((t, i) =>
        t.classList.toggle('active', tabs[i] === id));
    document.querySelectorAll('.lb-panel').forEach(p =>
        p.classList.toggle('active', p.id === 'lb-panel-' + id));
    _fetchLbTab(id);
}

async function _fetchLbTab(id) {
    if (_lbState.loaded[id]) return; // already loaded this session
    const sb  = window._supabase;
    const panel = document.getElementById('lb-panel-' + id);
    if (!panel) return;
    if (!sb) {
        panel.innerHTML = '<div class="lb-loading">Connect Supabase to load rankings.</div>';
        return;
    }
    panel.innerHTML = '<div class="lb-loading">Loading\u2026</div>';
    try {
        let rows = [];
        if (id === 'top-rank') {
            const { data } = await sb.from('profiles')
                .select('id,username,avatar,level,xp')
                .order('level', { ascending: false })
                .order('xp',    { ascending: false })
                .limit(20);
            rows = (data||[]).map((r,i) => {
                const tier = typeof levelTier === 'function' ? levelTier(r.level||1) : { label:'Iron', icon:'⚙️' };
                return _lbRow(i, r.avatar||'⚔️', r.username||'Wanderer',
                    `${tier.icon} Lv.${r.level||1} ${tier.label}`, r.xp??0, 'XP', r.id);
            });
        } else if (id === 'most-wins') {
            const { data } = await sb.from('profiles')
                .select('id,username,avatar,wins')
                .order('wins', { ascending: false }).limit(20);
            rows = (data||[]).map((r,i) => _lbRow(i, r.avatar||'\u2694\uFE0F', r.username||'Wanderer',
                null, r.wins??0, 'wins', r.id));
        } else if (id === 'most-losses') {
            const { data } = await sb.from('profiles')
                .select('id,username,avatar,losses')
                .order('losses', { ascending: false }).limit(20);
            rows = (data||[]).map((r,i) => _lbRow(i, r.avatar||'\u2694\uFE0F', r.username||'Wanderer',
                null, r.losses??0, 'losses', r.id));
        } else if (id === 'club-rank') {
            const { data } = await sb.from('clubs')
                .select('id,name,tag,badge,trophies')
                .order('trophies', { ascending: false }).limit(20);
            rows = (data||[]).map((r,i) => _lbRow(i, r.badge||'\u2694\uFE0F', r.name||'Unknown',
                '#'+r.tag, r.trophies??0, 'trophies', null));
        } else if (id === 'tournaments') {
            const { data } = await sb.from('profiles')
                .select('id,username,avatar,tournaments_won')
                .order('tournaments_won', { ascending: false }).limit(20);
            rows = (data||[]).map((r,i) => _lbRow(i, r.avatar||'\u2694\uFE0F', r.username||'Wanderer',
                null, r.tournaments_won??0, 'won', r.id));
        }

        if (rows.length === 0) {
            panel.innerHTML = '<div class="lb-loading">No data yet \u2014 be the first!</div>';
        } else {
            panel.innerHTML = rows.join('');
        }
        _lbState.loaded[id] = true;
    } catch(e) {
        panel.innerHTML = '<div class="lb-loading">Failed to load \u2014 check connection.</div>';
        console.warn('[DR LB] fetch error', e);
    }
}

function _lbRow(index, avatar, name, sub, value, unit, uid) {
    const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
    const isSelf = uid && uid === _syncedUid;
    return `<div class="lb-row${isSelf?' is-self':''}">
        <span class="lb-rank ${rankClass}">${index+1}</span>
        <span class="lb-avatar">${avatar}</span>
        <span class="lb-name-col">
            <span class="lb-name">${_clubEsc(name)}${isSelf?' <span style="color:#c8a460;font-size:7px;">(you)</span>':''}</span>
            ${sub ? `<span class="lb-sub">${_clubEsc(sub)}</span>` : ''}
        </span>
        <span class="lb-value">${value}<span>${unit}</span></span>
    </div>`;
}

/* ===================== END LEADERBOARD SYSTEM ===================== */
