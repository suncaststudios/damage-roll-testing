/* ONLINE MULTIPLAYER SYSTEM
   Backend: Supabase (Postgres + Realtime)

   Supabase tables required:
     online_rooms  — room signaling (created/joined/cleaned up)
     match_queue   — matchmaking queue entries

   SQL to run in Supabase SQL Editor:
   ─────────────────────────────────────────────────────────────────────
   create table online_rooms (
     code        text primary key,
     host        text,
     host_name   text,
     guest       text,
     guest_name  text,
     status      text default 'waiting',
     seed        bigint,
     created_at  timestamptz default now()
   );
   create table match_queue (
     uid         text primary key,
     name        text,
     room_code   text,
     joined_at   bigint
   );
   -- Enable realtime on both tables (Supabase dashboard → Database → Replication)
   alter publication supabase_realtime add table online_rooms;
   alter publication supabase_realtime add table match_queue;
   -- RLS: allow anonymous reads/writes (tighten once you have auth)
   alter table online_rooms  enable row level security;
   alter table match_queue   enable row level security;
   create policy "anon all" on online_rooms  for all using (true) with check (true);
   create policy "anon all" on match_queue   for all using (true) with check (true);
   ─────────────────────────────────────────────────────────────────────
   Game flow:
   • HOST creates room  → inserts row into online_rooms, waits via Realtime sub
   • GUEST joins by code → updates room row (guest + status='ready') → both start
   • Move sync uses Supabase Realtime BROADCAST (zero DB writes during gameplay)
   • Room row is deleted when game ends or is cancelled
═══════════════════════════════════════════════════════════════════════ */

let _onlineMode   = false;   // true when in an online game
let _onlineRole   = null;    // 'host' | 'guest'
let _onlineCode   = null;    // 6-char room code
let _onlineUid    = null;    // our identifier
let _onlineOppUid = null;    // opponent identifier
let _roomListener = null;    // Supabase realtime unsubscribe fn
let _mmListener   = null;    // matchmaking listener unsubscribe fn
let _mmQueueKey   = null;    // our key in the match_queue table
let _broadcastChannel = null; // Supabase broadcast channel for live moves

/* ── Generate a local UID for the session ── */
function _getOnlineUid() {
    if (_syncedCode) return _syncedCode;
    let uid = sessionStorage.getItem('dr_online_uid');
    if (!uid) { uid = Math.random().toString(36).slice(2,10).toUpperCase(); sessionStorage.setItem('dr_online_uid', uid); }
    return uid;
}

/* ── Generate a 6-char room code ── */
function _genRoomCode() {
    const C = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({length:6}, () => C[Math.floor(Math.random()*C.length)]).join('');
}

/* ── Get player display name ── */
function _getDisplayName() {
    return _profileData?.username || 'Wanderer';
}

/* ═══════════════════ CREATE ROOM ═══════════════════ */
function openCreateRoom() {
    _onlineUid = _getOnlineUid();
    toggle('menu-start', false);
    const cp = document.getElementById('room-create-panel');
    const jp = document.getElementById('room-join-panel');
    if (cp) { cp.style.display = 'flex'; cp.style.flexDirection = 'column'; }
    if (jp) jp.style.display = 'none';
    // Reset UI
    const codeEl = document.getElementById('room-code-val');
    if (codeEl) codeEl.textContent = '······';
    const hintEl = document.getElementById('room-code-hint');
    if (hintEl) hintEl.textContent = 'Generating code…';
    const statusEl = document.getElementById('room-host-status');
    if (statusEl) { statusEl.textContent = 'Waiting for opponent to join…'; statusEl.className = 'online-status wait'; }
    const foundCard = document.getElementById('room-found-card');
    if (foundCard) foundCard.classList.remove('show');
    toggle('menu-online-room', true);
    _createRoom();
}

async function _createRoom() {
    const f = window._db;
    if (!f) { document.getElementById('room-host-status').textContent = 'Backend not ready — refresh and try again.'; return; }

    // Clean up any previous room
    if (_onlineCode) { try { await f.remove('onlineRooms/' + _onlineCode); } catch(e){} }

    _onlineCode = _genRoomCode();
    _onlineRole = 'host';

    try {
        await f.set('onlineRooms/' + _onlineCode, {
            host:       _onlineUid,
            host_name:  _getDisplayName(),
            guest:      null,
            guest_name: null,
            status:     'waiting',
            seed:       Math.floor(Math.random() * 999999),
        });
    } catch(e) {
        document.getElementById('room-host-status').textContent = 'Failed to create room — check connection.';
        document.getElementById('room-host-status').className = 'online-status err';
        return;
    }

    document.getElementById('room-code-val').textContent = _onlineCode;
    document.getElementById('room-code-hint').textContent = 'Share this code with your opponent. Click to copy.';
    document.getElementById('room-host-status').textContent = 'Waiting for opponent to join…';
    document.getElementById('room-host-status').className = 'online-status wait';

    // Listen for guest joining via Supabase Realtime (Postgres CDC)
    _roomListener = f.sub('onlineRooms/' + _onlineCode, snap => {
        if (!snap || !snap.data) return;
        const room = snap.data;
        if (room.guest && room.status === 'ready') {
            _onlineOppUid = room.guest;
            const guestName = room.guest_name || 'Opponent';
            const hostStatus = document.getElementById('room-host-status');
            if (hostStatus) { hostStatus.textContent = guestName + ' joined! Starting…'; hostStatus.className = 'online-status ok'; }
            const foundCard = document.getElementById('room-found-card');
            const foundName = document.getElementById('room-found-name');
            if (foundName) foundName.textContent = guestName;
            if (foundCard) foundCard.classList.add('show');
            if (_roomListener) { _roomListener(); _roomListener = null; }
            setTimeout(() => _startOnlineGame('host', _onlineCode), 1000);
        }
    });

    // Auto-expire room after 10 minutes
    setTimeout(async () => {
        if (_onlineCode) { try { await f.remove('onlineRooms/' + _onlineCode); } catch(e){} }
    }, 10 * 60 * 1000);
}

function copyRoomCode() {
    if (!_onlineCode) return;
    navigator.clipboard.writeText(_onlineCode).then(() => {
        document.getElementById('room-code-hint').textContent = '✦ Copied to clipboard!';
        setTimeout(() => document.getElementById('room-code-hint').textContent = 'Share this code with your opponent. Click to copy.', 2000);
    });
}

async function cancelRoom() {
    if (_roomListener) { _roomListener(); _roomListener = null; }
    if (_onlineCode && window._db) {
        try { await window._db.remove('onlineRooms/' + _onlineCode); } catch(e){}
    }
    _onlineCode = null;
    toggle('menu-online-room', false);
    toggle('menu-start', true); if(typeof _updateStartScreen==='function') _updateStartScreen();
}

/* ═══════════════════ JOIN ROOM ═══════════════════ */
function openJoinRoom() {
    _onlineUid = _getOnlineUid();
    toggle('menu-start', false);
    const cp = document.getElementById('room-create-panel');
    const jp = document.getElementById('room-join-panel');
    if (cp) cp.style.display = 'none';
    if (jp) { jp.style.display = 'flex'; jp.style.flexDirection = 'column'; }
    const statusEl = document.getElementById('room-join-status');
    if (statusEl) { statusEl.textContent = ''; statusEl.className = 'online-status'; statusEl.style.display = 'none'; }
    const inputEl = document.getElementById('room-join-input');
    if (inputEl) inputEl.value = '';
    const btn = document.getElementById('room-join-btn');
    if (btn) { btn.disabled = false; btn.textContent = '⚔ Join Battle'; }
    toggle('menu-online-room', true);
    setTimeout(() => document.getElementById('room-join-input')?.focus(), 200);
}

async function joinRoomByCode() {
    const f = window._db;
    const code = document.getElementById('room-join-input').value.trim().toUpperCase();
    const statusEl = document.getElementById('room-join-status');
    const btn = document.getElementById('room-join-btn');
    statusEl.className = 'online-status wait';
    if (code.length !== 6) { statusEl.textContent = 'Code must be 6 characters.'; statusEl.className = 'online-status err'; return; }
    if (!f) { statusEl.textContent = 'Backend not ready — refresh and try again.'; statusEl.className = 'online-status err'; statusEl.style.display=''; return; }
    btn.disabled = true; btn.textContent = 'Joining…';
    statusEl.textContent = 'Looking up room…'; statusEl.style.display = '';
    try {
        const snap = await f.get('onlineRooms/' + code);
        if (!snap || !snap.data) { statusEl.textContent = 'Room not found. Check the code.'; statusEl.className = 'online-status err'; return; }
        const room = snap.data;
        if (room.status !== 'waiting') { statusEl.textContent = 'Room is no longer available.'; statusEl.className = 'online-status err'; return; }
        if (room.host === _onlineUid) { statusEl.textContent = "That's your own room!"; statusEl.className = 'online-status err'; return; }

        _onlineCode   = code;
        _onlineRole   = 'guest';
        _onlineOppUid = room.host;

        // Mark room as ready
        await f.update('onlineRooms/' + code, {
            guest:      _onlineUid,
            guest_name: _getDisplayName(),
            status:     'ready',
        });
        statusEl.textContent = 'Joined! Starting game…';
        statusEl.className = 'online-status ok';
        statusEl.style.display = '';
        setTimeout(() => _startOnlineGame('guest', code), 1000);
    } catch(e) {
        statusEl.textContent = 'Connection error — try again.';
        statusEl.className = 'online-status err';
        console.warn('[DR Online] join error', e);
    } finally {
        btn.disabled = false; btn.textContent = '⚔ Join Battle';
    }
}

/* ═══════════════════ MATCHMAKING ═══════════════════ */
function openMatchmaking() {
    if (!window._dbReady) { if(typeof _startScreenToast==='function') _startScreenToast('Connecting…'); return; }
    _onlineUid = _getOnlineUid();
    toggle('menu-start', false);
    toggle('menu-private-room-choice', false);
    toggle('menu-matchmaking', true);
    const statusEl = document.getElementById('mm-status-text');
    if (statusEl) statusEl.textContent = 'Searching for an opponent…';
    const queueEl = document.getElementById('mm-queue-info');
    if (queueEl) queueEl.textContent = '';
    const foundCard = document.getElementById('mm-found-card');
    if (foundCard) foundCard.classList.remove('show');
    const spinner = document.getElementById('mm-spinner');
    if (spinner) spinner.style.display = '';
    // Start elapsed timer
    clearInterval(window._mmElapsedTimer);
    let elapsed = 0;
    window._mmElapsedTimer = setInterval(() => {
        elapsed++;
        const el = document.getElementById('mm-elapsed');
        if (el) el.textContent = `Searching for ${elapsed}s…`;
    }, 1000);
    _enterMatchQueue();
}

async function _enterMatchQueue() {
    const f = window._db;
    if (!f) { document.getElementById('mm-status-text').textContent = 'Backend not ready — refresh and try again.'; return; }

    try {
        // Scan the queue for an available opponent
        const snap = await f.get('matchQueue');
        let foundMatch = false;
        if (snap && snap.data) {
            const queue = snap.data;
            for (const [key, entry] of Object.entries(queue)) {
                if (entry.uid === _onlineUid) continue;
                if (Date.now() - entry.joined_at > 60000) {
                    await f.remove('matchQueue/' + key);
                    continue;
                }
                // Found an opponent — join their room
                foundMatch = true;
                await f.remove('matchQueue/' + key);

                _onlineCode   = entry.room_code;
                _onlineRole   = 'guest';
                _onlineOppUid = entry.uid;

                document.getElementById('mm-status-text').textContent = 'Opponent found! Starting…';
                await f.update('onlineRooms/' + _onlineCode, {
                    guest:      _onlineUid,
                    guest_name: _getDisplayName(),
                    status:     'ready',
                });
                setTimeout(() => _startOnlineGame('guest', _onlineCode), 1200);
                break;
            }
        }

        if (!foundMatch) {
            // No one in queue — create a room and wait
            _onlineCode = _genRoomCode();
            _onlineRole = 'host';
            const seed = Math.floor(Math.random() * 999999);

            await f.set('onlineRooms/' + _onlineCode, {
                host: _onlineUid, host_name: _getDisplayName(),
                guest: null, guest_name: null,
                status: 'waiting', seed, created: Date.now(),
            });

            _mmQueueKey = _onlineUid;
            await f.set('matchQueue/' + _onlineUid, {
                uid:       _onlineUid,
                name:      _getDisplayName(),
                room_code: _onlineCode,
                joined_at: Date.now(),
            });

            let dotCount = 0;
            const dotInterval = setInterval(() => {
                dotCount = (dotCount + 1) % 4;
                document.getElementById('mm-status-text').textContent = 'Searching for an opponent' + '.'.repeat(dotCount + 1);
            }, 600);

            // Listen for someone joining our room
            _mmListener = f.sub('onlineRooms/' + _onlineCode, snap => {
                if (!snap || !snap.data) return;
                const room = snap.data;
                if (room.guest && room.status === 'ready') {
                    clearInterval(dotInterval);
                    _onlineOppUid = room.guest;
                    if (_mmListener) { _mmListener(); _mmListener = null; }
                    if (_mmQueueKey && window._db) {
                        try { window._db.remove('matchQueue/' + _mmQueueKey); } catch(e){}
                        _mmQueueKey = null;
                    }
                    clearInterval(window._mmElapsedTimer);
                    const mmSpinner = document.getElementById('mm-spinner');
                    if (mmSpinner) mmSpinner.style.display = 'none';
                    const mmFound = document.getElementById('mm-found-card');
                    const mmFoundName = document.getElementById('mm-found-name');
                    if (mmFoundName) mmFoundName.textContent = room.guest_name || 'Opponent';
                    if (mmFound) mmFound.classList.add('show');
                    document.getElementById('mm-status-text').textContent = '';
                    setTimeout(() => _startOnlineGame('host', _onlineCode), 1200);
                }
            });
        }
    } catch(e) {
        document.getElementById('mm-status-text').textContent = 'Connection error. Try again.';
        console.warn('[DR Online] matchmaking error', e);
    }
}

async function cancelMatchmaking() {
    clearInterval(window._mmElapsedTimer);
    const elapsed = document.getElementById('mm-elapsed');
    if (elapsed) elapsed.textContent = '';
    if (_mmListener) { _mmListener(); _mmListener = null; }
    if (_mmQueueKey && window._db) {
        try { await window._db.remove('matchQueue/' + _mmQueueKey); } catch(e){}
        _mmQueueKey = null;
    }
    if (_onlineCode && window._db) {
        try { await window._db.remove('onlineRooms/' + _onlineCode); } catch(e){}
        _onlineCode = null;
    }
    toggle('menu-matchmaking', false);
    toggle('menu-start', true); if(typeof _updateStartScreen==='function') _updateStartScreen();
}

/* ═══════════════════ START ONLINE GAME ═══════════════════ */
async function _startOnlineGame(role, code) {
    _onlineMode = true;
    _onlineRole = role;
    _onlineCode = code;

    toggle('menu-online-room', false);
    toggle('menu-matchmaking', false);

    // Show opponent name label
    let oppLabel = document.getElementById('online-opponent-label');
    if (!oppLabel) {
        oppLabel = document.createElement('div');
        oppLabel.id = 'online-opponent-label';
        const ah = document.getElementById('a-hand');
        if (ah && ah.parentNode) ah.parentNode.insertBefore(oppLabel, ah);
    }
    try {
        const snap = await window._db.get('onlineRooms/' + code);
        if (snap && snap.data) {
            const room = snap.data;
            const oppName = role === 'host' ? (room.guest_name || 'Opponent') : (room.host_name || 'Opponent');
            oppLabel.textContent = '⚔ vs ' + oppName;
        }
    } catch(e) {}

    // Open a Supabase Broadcast channel for live move sync (no DB writes)
    _broadcastChannel = window._db.broadcast(code);
    _broadcastChannel.on(msg => {
        if (!_onlineMode) return;
        if (!msg || msg.by === _onlineUid) return; // ignore our own echoes
        if (msg.type === 'play' && !state.turn) {
            _applyOpponentMove(msg);
        } else if (msg.type === 'chat') {
            // Display incoming chat message
            const msgsEl = document.getElementById('chat-messages');
            if (msgsEl) {
                const div = document.createElement('div');
                div.className = 'chat-msg chat-opponent';
                const safeText = msg.text?.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') || '';
                const safeName = msg.name?.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') || 'Opponent';
                div.innerHTML = `<span class="chat-name">${safeName}:</span> <span class="chat-text">${safeText}</span>`;
                msgsEl.appendChild(div);
                msgsEl.scrollTop = msgsEl.scrollHeight;
                // Show unread dot if chat is closed
                const chat = document.getElementById('game-chat');
                const dot  = document.getElementById('chat-unread-dot');
                if (chat && !chat.classList.contains('chat-open') && dot) dot.style.display = 'block';
            }
        }
    });

    await initGame();
}

/* ═══════════════════ ONLINE MOVE SYNC ═══════════════════ */

/* Called by playerAct BEFORE resolving — sends move over Broadcast (no DB write) */
async function _broadcastMove(cardIndex) {
    if (!_onlineMode || !_broadcastChannel) return;
    try {
        await _broadcastChannel.send({
            by:    _onlineUid,
            type:  'play',
            index: cardIndex,
            ts:    Date.now(),
        });
    } catch(e) { console.warn('[DR Online] broadcast failed', e); }
}

/* Called when we receive the opponent's move */
async function _applyOpponentMove(move) {
    if (_forfeited || _gameOverFired) return;
    _forcedOnlineCard = move.index;
    await aiAct();
    _forcedOnlineCard = null;
}

/* _forcedOnlineCard: set before calling aiAct when online to force opponent's chosen index */
let _forcedOnlineCard = null;

/* ═══════════════════ ONLINE CLEANUP ═══════════════════ */
function _cleanupOnline() {
    _onlineMode = false;
    if (_roomListener)     { _roomListener(); _roomListener = null; }
    if (_broadcastChannel) { _broadcastChannel.unsub(); _broadcastChannel = null; }
    if (_onlineCode && window._db) {
        try { window._db.remove('onlineRooms/' + _onlineCode); } catch(e){}
    }
    _onlineCode = null; _onlineRole = null; _onlineOppUid = null;
    const lbl = document.getElementById('online-opponent-label');
    if (lbl) lbl.textContent = '';
}


/* ═══════════════════ SETTINGS REFRESH ═══════════════════ */
/* The settings screen h2 styling is handled by CSS above.
   This function re-applies the Cinzel font to dynamic elements
   that may be injected after page load. */
function _refreshSettingsUI() {
    // Already handled by CSS — no JS needed unless dynamic rows are added.
}

/* ═══════════════════════════════════════════════════════════════════════
   END ONLINE MULTIPLAYER SYSTEM
═══════════════════════════════════════════════════════════════════════ */



/* ═══════════════════════════════════════════════════════════════════
   MATCH RESULT — win/loss tracking + XP (via xp.js)
   Rank system removed entirely. Level/XP is the sole progression system.
======================================================================= */

async function _submitMatchResult(won) {
    const sb  = window._supabase;
    if (!sb || !_syncedUid) return;

    try {
        const { data: myProfile } = await sb
            .from('profiles').select('wins, losses')
            .eq('id', _syncedUid).maybeSingle();
        if (!myProfile) return;

        const newWins   = (myProfile.wins   || 0) + (won ? 1 : 0);
        const newLosses = (myProfile.losses || 0) + (!won ? 1 : 0);

        sb.from('profiles').update({
            wins:   newWins,
            losses: newLosses,
        }).eq('id', _syncedUid).then(() => {});

        _profileData.wins   = newWins;
        _profileData.losses = newLosses;
        saveProfileData();

        // XP awarded by xp.js
        if (typeof _xpOnMatchEnd === 'function') {
            const isPrivate = typeof _privateMatch !== 'undefined' && _privateMatch;
            _xpOnMatchEnd(won, true, isPrivate, false);
        }
    } catch(e) {
        console.warn('[DR Match] _submitMatchResult error', e);
    }
}

