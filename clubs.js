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
    const tabs = ['my-club','leaderboard','browse','tournament'];
    document.querySelectorAll('.clubs-tab').forEach(t =>
        t.classList.toggle('active', t.id === 'clubs-tab-' + (id === 'leaderboard' ? 'stats' : id)));
    document.querySelectorAll('.clubs-panel').forEach(p =>
        p.classList.toggle('active', p.id === 'clubs-panel-' + id));
    if (id === 'leaderboard') _loadLeaderboard();
    if (id === 'tournament')  _loadClubTournamentTab();
}

function _clubsSetTabVisibility(inClub) {
    // Show/hide tabs that only make sense when in a club
    const statsTab = document.getElementById('clubs-tab-stats');
    const tournTab = document.getElementById('clubs-tab-tournament');
    if (statsTab) statsTab.style.display = inClub ? '' : 'none';
    if (tournTab) tournTab.style.display = inClub ? '' : 'none';
    // Show/hide the no-club action buttons vs guest badge
    const authedBtns = document.getElementById('clubs-no-club-authed');
    const guestBadge = document.getElementById('clubs-no-club-guest');
    const isLoggedIn = !!_syncedUid;
    if (authedBtns) authedBtns.style.display = (!inClub && isLoggedIn) ? 'flex' : 'none';
    if (guestBadge) guestBadge.style.display  = (!inClub && !isLoggedIn) ? '' : 'none';
}

function _clubsOpenCreateModal() {
    const modal = document.getElementById('clubs-create-modal');
    if (modal) modal.style.display = 'flex';
}

function _clubsCloseCreateModal() {
    const modal = document.getElementById('clubs-create-modal');
    if (modal) modal.style.display = 'none';
    const status = document.getElementById('club-create-status');
    if (status) status.textContent = '';
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
    _clubsSetTabVisibility(!!club);
    if (!club) {
        if (noClub) noClub.style.display = '';
        if (myCard) myCard.style.display = 'none';
        // If on a member-only tab, switch back to my-club
        if (['leaderboard','tournament'].includes(_clubsState.tab)) switchClubsTab('my-club');
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
        setTimeout(_clubsCloseCreateModal, 1200);
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

/* ═══════════════════════════════════════════════════════════════════════
   CLUB TOURNAMENTS
   SQL to run in Supabase SQL Editor:
   ─────────────────────────────────────────────────────────────────────
   create table club_tournaments (
     id            uuid primary key default gen_random_uuid(),
     challenger_id uuid references clubs(id) on delete cascade,
     defender_id   uuid references clubs(id) on delete cascade,
     status        text default 'pending',  -- pending | active | done
     challenger_wins int default 0,
     defender_wins   int default 0,
     rounds        int default 3,           -- best of N
     created_at    timestamptz default now(),
     resolved_at   timestamptz
   );
   alter table club_tournaments enable row level security;
   create policy "read club tournaments"   on club_tournaments for select using (true);
   create policy "insert club tournaments" on club_tournaments for insert with check (auth.uid() is not null);
   create policy "update club tournaments" on club_tournaments for update using (true);
   ─────────────────────────────────────────────────────────────────────
   Flow:
   1. Club A owner/member challenges Club B by tag
   2. Row inserted with status='pending'
   3. Any Club B member can accept → status='active'
   4. Active tournament shows in both clubs' tournament tabs
   5. Members from each club play 1v1 matches from the lobby
   6. Each win increments their club's win counter
   7. First to ceil(rounds/2) wins takes the tournament → status='done'
   8. Winner club gets +50 trophies
======================================================================= */

const CLUB_TOURN_TROPHIES = 50;

/* ── Open tournament tab ── */
function _loadClubTournamentTab() {
    const noClub  = document.getElementById('clubs-tourn-no-club');
    const main    = document.getElementById('clubs-tourn-main');
    if (!_clubsState.myClub) {
        if (noClub) noClub.style.display = '';
        if (main)   main.style.display   = 'none';
        return;
    }
    if (noClub) noClub.style.display = 'none';
    if (main)   main.style.display   = 'flex';
    _fetchClubTournaments();
}

/* ── Fetch active and pending tournaments for our club ── */
async function _fetchClubTournaments() {
    const sb = window._supabase;
    if (!sb || !_clubsState.myClub) return;
    const cid = _clubsState.myClub.id;
    try {
        const { data } = await sb.from('club_tournaments')
            .select('*, challenger:challenger_id(name,badge,tag), defender:defender_id(name,badge,tag)')
            .or(`challenger_id.eq.${cid},defender_id.eq.${cid}`)
            .neq('status', 'done')
            .order('created_at', { ascending: false });
        _renderClubTournaments(data || []);
    } catch(e) { console.warn('[DR ClubTourn] fetch error', e); }
}

function _renderClubTournaments(rows) {
    const list    = document.getElementById('clubs-tourn-list');
    const pending = document.getElementById('clubs-tourn-pending');
    if (!list || !pending) return;

    const active  = rows.filter(r => r.status === 'active');
    const pend    = rows.filter(r => r.status === 'pending');
    const myId    = _clubsState.myClub?.id;

    // Active
    if (active.length === 0) {
        list.innerHTML = '<div class="clubs-auth-notice" style="padding:12px 0;"><div class="clubs-auth-sub">No active tournaments right now.</div></div>';
    } else {
        list.innerHTML = active.map(t => {
            const isChallenger = t.challenger_id === myId;
            const us   = isChallenger ? t.challenger : t.defender;
            const them = isChallenger ? t.defender   : t.challenger;
            const ourW = isChallenger ? t.challenger_wins : t.defender_wins;
            const thW  = isChallenger ? t.defender_wins   : t.challenger_wins;
            const need = Math.ceil(t.rounds / 2);
            return `
            <div class="club-card" style="gap:8px;">
                <div class="club-card-header">
                    <div class="club-badge">${us?.badge || '⚔️'}</div>
                    <div class="club-info">
                        <div class="club-name">${_clubEsc(us?.name || '?')} vs ${_clubEsc(them?.name || '?')}</div>
                        <div class="club-meta">Best of ${t.rounds} · First to ${need} wins</div>
                    </div>
                </div>
                <div style="display:flex;gap:0;border-top:1px solid rgba(100,65,20,0.2);padding-top:8px;">
                    <div class="club-stat"><div class="club-stat-val" style="color:#7ae87a;">${ourW}</div><div class="club-stat-label">Our Wins</div></div>
                    <div class="club-stat"><div class="club-stat-val" style="color:#e87a7a;">${thW}</div><div class="club-stat-label">Their Wins</div></div>
                    <div class="club-stat"><div class="club-stat-val">${need}</div><div class="club-stat-label">Needed</div></div>
                </div>
            </div>`;
        }).join('');
    }

    // Pending
    if (pend.length === 0) {
        pending.innerHTML = '<div style="font-family:\'Cinzel\',serif;font-size:9px;color:rgba(100,65,20,0.4);font-style:italic;">No pending challenges.</div>';
    } else {
        pending.innerHTML = pend.map(t => {
            const isChallenger = t.challenger_id === myId;
            const other = isChallenger ? t.defender : t.challenger;
            const canAccept = !isChallenger;
            return `
            <div class="club-card" style="gap:8px;">
                <div class="club-card-header">
                    <div class="club-badge">${other?.badge || '⚔️'}</div>
                    <div class="club-info">
                        <div class="club-name">${isChallenger ? 'You challenged' : 'Challenge from'} ${_clubEsc(other?.name || '?')}</div>
                        <div class="club-meta">#${_clubEsc(other?.tag || '?')} · Best of ${t.rounds}</div>
                    </div>
                </div>
                ${canAccept ? `<button class="auth-btn" style="font-size:10px;padding:7px;" onclick="acceptClubChallenge('${t.id}')">⚔ Accept Challenge</button>` : ''}
                ${isChallenger ? `<button class="auth-btn secondary" style="font-size:9px;padding:6px;" onclick="cancelClubChallenge('${t.id}')">Cancel</button>` : ''}
            </div>`;
        }).join('');
    }
}

/* ── Challenge another club by tag ── */
async function clubChallenge() {
    const sb     = window._supabase;
    const tag    = (document.getElementById('clubs-tourn-tag-input')?.value || '').trim().toUpperCase();
    const status = document.getElementById('clubs-tourn-status');
    if (!sb || !_syncedUid)              { if (status) status.textContent = 'Sign in first.'; return; }
    if (!_clubsState.myClub)             { if (status) status.textContent = 'Join a club first.'; return; }
    if (!tag || tag.length < 2)          { if (status) status.textContent = 'Enter a valid club tag.'; return; }
    if (tag === _clubsState.myClub.tag)  { if (status) status.textContent = "You can't challenge your own club."; return; }

    if (status) status.textContent = 'Looking up club…';
    try {
        const { data: target } = await sb.from('clubs').select('id,name,tag').eq('tag', tag).maybeSingle();
        if (!target) { if (status) status.textContent = 'Club not found.'; return; }

        // Check no existing active/pending tournament between these two clubs
        const { data: existing } = await sb.from('club_tournaments')
            .select('id').or(`and(challenger_id.eq.${_clubsState.myClub.id},defender_id.eq.${target.id}),and(challenger_id.eq.${target.id},defender_id.eq.${_clubsState.myClub.id})`)
            .neq('status', 'done').maybeSingle();
        if (existing) { if (status) status.textContent = 'A tournament already exists with this club.'; return; }

        const { error } = await sb.from('club_tournaments').insert({
            challenger_id:   _clubsState.myClub.id,
            defender_id:     target.id,
            status:          'pending',
            challenger_wins: 0,
            defender_wins:   0,
            rounds:          3,
        });
        if (error) { if (status) status.textContent = error.message; return; }
        if (status) status.textContent = `Challenge sent to ${target.name}!`;
        if (document.getElementById('clubs-tourn-tag-input')) document.getElementById('clubs-tourn-tag-input').value = '';
        setTimeout(() => { if (status) status.textContent = ''; }, 3000);
        _fetchClubTournaments();
    } catch(e) {
        if (status) status.textContent = 'Error — try again.';
        console.warn('[DR ClubTourn] challenge error', e);
    }
}

/* ── Accept a challenge ── */
async function acceptClubChallenge(tournId) {
    const sb = window._supabase;
    if (!sb) return;
    try {
        await sb.from('club_tournaments').update({ status: 'active' }).eq('id', tournId);
        _fetchClubTournaments();
    } catch(e) { console.warn('[DR ClubTourn] accept error', e); }
}

/* ── Cancel / decline a challenge ── */
async function cancelClubChallenge(tournId) {
    const sb = window._supabase;
    if (!sb) return;
    try {
        await sb.from('club_tournaments').delete().eq('id', tournId);
        _fetchClubTournaments();
    } catch(e) { console.warn('[DR ClubTourn] cancel error', e); }
}

/* ── Record a match result for an active club tournament ── */
async function recordClubTournamentWin(winnersClubId) {
    const sb = window._supabase;
    if (!sb || !_clubsState.myClub) return;
    const myId = _clubsState.myClub.id;
    try {
        // Find the active tournament involving our club
        const { data: tourn } = await sb.from('club_tournaments')
            .select('*')
            .or(`challenger_id.eq.${myId},defender_id.eq.${myId}`)
            .eq('status', 'active')
            .maybeSingle();
        if (!tourn) return;

        const isChallenger  = tourn.challenger_id === winnersClubId;
        const cWins = tourn.challenger_wins + (isChallenger ? 1 : 0);
        const dWins = tourn.defender_wins   + (!isChallenger ? 1 : 0);
        const need  = Math.ceil(tourn.rounds / 2);
        const done  = cWins >= need || dWins >= need;
        const winnerClubId = cWins >= need ? tourn.challenger_id : tourn.defender_id;

        const update = {
            challenger_wins: cWins,
            defender_wins:   dWins,
            ...(done ? { status: 'done', resolved_at: new Date().toISOString() } : {}),
        };
        await sb.from('club_tournaments').update(update).eq('id', tourn.id);

        // Award trophies to winning club
        if (done) {
            sb.from('clubs')
              .update({ trophies: sb.rpc ? undefined : 0 }) // use increment below
              .eq('id', winnerClubId).then(() => {});
            // Increment trophies via rpc or manual fetch+update
            const { data: winClub } = await sb.from('clubs').select('trophies').eq('id', winnerClubId).maybeSingle();
            if (winClub) {
                await sb.from('clubs').update({ trophies: (winClub.trophies || 0) + CLUB_TOURN_TROPHIES }).eq('id', winnerClubId);
            }
            if (typeof _lobbyChatSystem === 'function') _lobbyChatSystem(`🏆 Club tournament decided! ${winnersClubId === myId ? 'Your club wins!' : 'Opponent club wins.'} +${CLUB_TOURN_TROPHIES} trophies awarded.`);
        }
        _fetchClubTournaments();
    } catch(e) { console.warn('[DR ClubTourn] recordWin error', e); }
}
