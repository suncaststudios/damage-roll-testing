/* CLUBS SYSTEM  –  Supabase backend
   ---------------------------------------------------------------
   SQL (run in Supabase SQL Editor):

   create table clubs (
     id          uuid primary key default gen_random_uuid(),
     name        text unique not null,
     tag         text unique not null,
     badge       text default '⚔️',
     description text default '',
     owner_id    uuid references profiles(id) on delete set null,
     wins        int default 0,
     trophies    int default 0,
     win_streak  int default 0,
     created_at  timestamptz default now()
   );
   -- After profiles table exists:
   -- alter table profiles add column club_id uuid references clubs(id) on delete set null;
   alter table clubs enable row level security;
   create policy "read clubs"   on clubs for select using (true);
   create policy "insert clubs" on clubs for insert with check (auth.uid() is not null);
   create policy "update clubs" on clubs for update using (auth.uid() = owner_id);
   create policy "delete clubs" on clubs for delete using (auth.uid() = owner_id);
   ---------------------------------------------------------------
   Local state:
     _clubsState.myClub  — club object the user belongs to, or null
     _clubsState.myRole  — 'owner' | 'member' | null
================================================================ */

const _clubsState = { myClub: null, myRole: null, tab: 'my-club' };

function openClubs() {
    playSfx('menuClick');
    toggle('menu-clubs', true);
    _loadMyClub();
}

function switchClubsTab(id) {
    _clubsState.tab = id;
    const tabs = ['my-club','leaderboard','browse','create'];
    document.querySelectorAll('.clubs-tab').forEach((t, i) =>
        t.classList.toggle('active', tabs[i] === id));
    document.querySelectorAll('.clubs-panel').forEach(p =>
        p.classList.toggle('active', p.id === 'clubs-panel-' + id));
    if (id === 'leaderboard') _loadLeaderboard();
    if (id === 'create')      _refreshCreatePanel();
}

async function _loadMyClub() {
    const sb = window._supabase;
    if (!sb || !_syncedUid) { _renderMyClub(null); return; }
    try {
        const { data: profile } = await sb
            .from('profiles').select('club_id').eq('id', _syncedUid).maybeSingle();
        if (!profile?.club_id) { _renderMyClub(null); return; }
        const { data: club } = await sb
            .from('clubs').select('*').eq('id', profile.club_id).maybeSingle();
        _clubsState.myClub = club || null;
        _clubsState.myRole = club?.owner_id === _syncedUid ? 'owner' : 'member';
        _renderMyClub(club);
    } catch(e) {
        console.warn('[DR Clubs] _loadMyClub error', e);
        _renderMyClub(null);
    }
}

function _renderMyClub(club) {
    const noClub = document.getElementById('clubs-no-club');
    const myCard = document.getElementById('clubs-my-club-card');
    if (!club) {
        if (noClub) noClub.style.display = '';
        if (myCard) myCard.style.display = 'none';
        return;
    }
    if (noClub) noClub.style.display = 'none';
    if (myCard) myCard.style.display = '';
    _clubSetTxt('my-club-badge',    club.badge || '⚔️');
    _clubSetTxt('my-club-name',     club.name);
    _clubSetTxt('my-club-tag',      '#' + club.tag);
    _clubSetTxt('my-club-desc',     club.description || '');
    _clubSetTxt('my-club-wins',     club.wins       ?? 0);
    _clubSetTxt('my-club-trophies', club.trophies   ?? 0);
    _clubSetTxt('my-club-streak',   club.win_streak ?? 0);
}

async function _loadLeaderboard() {
    const sb   = window._supabase;
    const list = document.getElementById('clubs-lb-list');
    if (!sb || !list) return;
    try {
        const { data: clubs } = await sb
            .from('clubs').select('id,name,tag,badge,wins,trophies')
            .order('trophies', { ascending: false }).limit(20);
        if (!clubs || clubs.length === 0) return;
        const rc = ['gold','silver','bronze'];
        list.innerHTML = clubs.map((c, i) => `
            <div class="club-lb-row">
                <span class="club-lb-rank ${rc[i]||''}">${i+1}</span>
                <span class="club-lb-avatar">${c.badge||'⚔️'}</span>
                <span class="club-lb-name">${_clubEsc(c.name)}
                    <span style="color:#6b4f2a;font-size:8px;">#${_clubEsc(c.tag)}</span></span>
                <span class="club-lb-score">${c.trophies??0} ✦</span>
            </div>`).join('');
    } catch(e) { console.warn('[DR Clubs] _loadLeaderboard error', e); }
}

async function searchClubs() {
    const sb  = window._supabase;
    const q   = (document.getElementById('clubs-search-input')?.value||'').trim();
    const out = document.getElementById('clubs-browse-list');
    if (!sb || !out) return;
    try {
        let query = sb.from('clubs')
            .select('id,name,tag,badge,description,wins,trophies').limit(15);
        if (q) query = query.or(`name.ilike.%${q}%,tag.ilike.%${q}%`);
        else   query = query.order('trophies', { ascending: false });
        const { data: clubs } = await query;
        if (!clubs || clubs.length === 0) {
            out.innerHTML = '<div class="clubs-auth-notice" style="padding-top:12px;"><div class="clubs-auth-sub">No clubs found.</div></div>';
            return;
        }
        out.innerHTML = clubs.map(c => `
            <div class="club-card" style="cursor:pointer;" onclick="joinClubById('${_clubEsc(c.id)}')">
                <div class="club-card-header">
                    <div class="club-badge">${c.badge||'⚔️'}</div>
                    <div class="club-info">
                        <div class="club-name">${_clubEsc(c.name)}</div>
                        <div class="club-meta">${c.wins??0} wins · ${c.trophies??0} trophies</div>
                    </div>
                    <span class="club-tag">#${_clubEsc(c.tag)}</span>
                </div>
                ${c.description?`<div class="club-desc">${_clubEsc(c.description)}</div>`:''}
            </div>`).join('');
    } catch(e) { console.warn('[DR Clubs] searchClubs error', e); }
}

function _refreshCreatePanel() {
    const authed   = document.getElementById('clubs-create-authed');
    const unauthed = document.getElementById('clubs-create-unauthed');
    if (!authed || !unauthed) return;
    authed.style.display   = _syncedUid ? 'flex' : 'none';
    unauthed.style.display = _syncedUid ? 'none' : '';
}

async function createClub() {
    const sb       = window._supabase;
    const statusEl = document.getElementById('club-create-status');
    if (!sb || !_syncedUid) { if (statusEl) statusEl.textContent = 'Sign in first.'; return; }
    const name  = (document.getElementById('club-create-name')?.value  ||'').trim();
    const tag   = (document.getElementById('club-create-tag')?.value   ||'').trim().toUpperCase();
    const badge = (document.getElementById('club-create-badge')?.value ||'⚔️').trim();
    const desc  = (document.getElementById('club-create-desc')?.value  ||'').trim();
    if (!name)          { if (statusEl) statusEl.textContent = 'Club name required.';       return; }
    if (tag.length < 3) { if (statusEl) statusEl.textContent = 'Tag must be 3–5 chars.';   return; }
    if (_clubsState.myClub) { if (statusEl) statusEl.textContent = 'Leave current club first.'; return; }
    if (statusEl) statusEl.textContent = 'Creating…';
    try {
        const { data: club, error } = await sb.from('clubs')
            .insert({ name, tag, badge, description: desc, owner_id: _syncedUid })
            .select().single();
        if (error) { if (statusEl) statusEl.textContent = error.message; return; }
        // Fire-and-forget profile update
        sb.from('profiles').update({ club_id: club.id }).eq('id', _syncedUid).then(() => {});
        _clubsState.myClub = club;
        _clubsState.myRole = 'owner';
        if (statusEl) statusEl.textContent = 'Club founded!';
        setTimeout(() => switchClubsTab('my-club'), 1000);
    } catch(e) {
        if (statusEl) statusEl.textContent = 'Error — try again.';
        console.warn('[DR Clubs] createClub error', e);
    }
}

async function joinClubById(clubId) {
    const sb = window._supabase;
    if (!sb || !_syncedUid) { alert('Sign in to join a club.'); return; }
    if (_clubsState.myClub) { alert('Leave your current club first.'); return; }
    try {
        await sb.from('profiles').update({ club_id: clubId }).eq('id', _syncedUid);
        await _loadMyClub();
        switchClubsTab('my-club');
    } catch(e) { console.warn('[DR Clubs] joinClubById error', e); }
}

async function leaveClub() {
    const sb = window._supabase;
    if (!sb || !_syncedUid || !_clubsState.myClub) return;
    if (!confirm('Leave ' + _clubsState.myClub.name + '?')) return;
    try {
        await sb.from('profiles').update({ club_id: null }).eq('id', _syncedUid);
        _clubsState.myClub = null;
        _clubsState.myRole = null;
        _renderMyClub(null);
    } catch(e) { console.warn('[DR Clubs] leaveClub error', e); }
}

function _clubSetTxt(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function _clubEsc(s) {
    return String(s??'').replace(/[&<>"']/g,
        c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ===================== END CLUBS SYSTEM ===================== */
