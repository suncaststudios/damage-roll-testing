/* LOBBY SYSTEM
   Architecture:
   - Room metadata (name, size, players list, ready states, host) stored in
     Supabase `lobby_rooms` table — written only on join/leave/ready changes
   - Chat + vote + challenge events use Supabase Realtime BROADCAST only
     (zero DB writes during gameplay)
   - Each player subscribes to the room broadcast channel on join

   SQL to run in Supabase SQL Editor:
   ─────────────────────────────────────────────────────────────────────
   create table lobby_rooms (
     code        text primary key,
     name        text default 'My Lobby',
     max_players int default 2,
     host_uid    text,
     players     jsonb default '[]',
     created_at  timestamptz default now()
   );
   alter table lobby_rooms enable row level security;
   create policy "anon all lobby" on lobby_rooms for all using (true) with check (true);
   alter publication supabase_realtime add table lobby_rooms;
   ─────────────────────────────────────────────────────────────────────

   Player object shape (inside players jsonb array):
   { uid, name, avatar, ready, status } 
   status: 'waiting' | 'ready' | 'fighting' | 'spectating'
======================================================================= */

/* ── Lobby state ── */
const _lobby = {
    code:       null,
    name:       'My Lobby',
    maxPlayers: 2,
    hostUid:    null,
    players:    [],       // array of player objects
    isHost:     false,
    myStatus:   'waiting',
    isReady:    false,
    channel:    null,     // Supabase broadcast channel
    dbListener: null,     // Supabase CDC listener for room row
    createSize: 2,        // size picker on create screen
};

/* ══════════════════ NAVIGATION ══════════════════ */

function openPrivateRoomMenu() {
    if (!window._dbReady) { if(typeof _startScreenToast==='function') _startScreenToast('Connecting…'); return; }
    toggle('menu-start', false);
    toggle('menu-private-room-choice', true);
}

function openCreateRoom() {
    if (!_isProfileComplete()) { _requireProfile(() => openCreateRoom()); return; }
    toggle('menu-private-room-choice', false);
    // Reset size picker
    _lobby.createSize = 2;
    const sizeEl = document.getElementById('create-room-size-val');
    if (sizeEl) sizeEl.textContent = '2';
    // Pre-fill room name
    const nameEl = document.getElementById('create-room-name-input');
    if (nameEl) nameEl.value = (_profileData.username || 'Wanderer') + "'s Room";
    const statusEl = document.getElementById('create-room-status');
    if (statusEl) statusEl.style.display = 'none';
    toggle('menu-create-room-setup', true);
}

function openJoinRoom() {
    if (!_isProfileComplete()) { _requireProfile(() => openJoinRoom()); return; }
    toggle('menu-private-room-choice', false);
    const inputEl = document.getElementById('room-join-input');
    if (inputEl) inputEl.value = '';
    const statusEl = document.getElementById('room-join-status');
    if (statusEl) { statusEl.style.display = 'none'; statusEl.className = 'online-status'; }
    const btn = document.getElementById('room-join-btn');
    if (btn) { btn.disabled = false; btn.textContent = '⚔ Join Battle'; }
    toggle('menu-online-room', true);
    setTimeout(() => document.getElementById('room-join-input')?.focus(), 150);
}

/* ══════════════════ SIZE PICKER ══════════════════ */
function _lobbyAdjSize(delta) {
    _lobby.createSize = Math.max(2, Math.min(10, _lobby.createSize + delta));
    const el = document.getElementById('create-room-size-val');
    if (el) el.textContent = _lobby.createSize;
}

/* ══════════════════ CREATE ROOM ══════════════════ */
async function _lobbyCreate() {
    const sb  = window._supabase;
    const btn = document.querySelector('#menu-create-room-setup .auth-btn');
    const statusEl = document.getElementById('create-room-status');
    const name = (document.getElementById('create-room-name-input')?.value || '').trim()
                 || (_profileData.username + "'s Room");
    if (!sb) { _lobbyStatus(statusEl, 'Supabase not connected.', 'err'); return; }
    if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }

    const code = _genRoomCode();
    const myPlayer = _lobbyMakeSelf('waiting');

    try {
        const { error } = await sb.from('lobby_rooms').insert({
            code,
            name,
            max_players: _lobby.createSize,
            host_uid:    _getOnlineUid(),
            players:     JSON.stringify([myPlayer]),
        });
        if (error) { _lobbyStatus(statusEl, error.message, 'err'); return; }

        _lobby.code       = code;
        _lobby.name       = name;
        _lobby.maxPlayers = _lobby.createSize;
        _lobby.hostUid    = _getOnlineUid();
        _lobby.isHost     = true;
        _lobby.players    = [myPlayer];
        _lobby.myStatus   = 'waiting';
        _lobby.isReady    = false;

        toggle('menu-create-room-setup', false);
        _lobbyEnterScreen();
    } catch(e) {
        _lobbyStatus(statusEl, 'Error: ' + e.message, 'err');
        console.error('[DR Lobby] create error', e);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '🏰 Create Room'; }
    }
}

/* ══════════════════ JOIN ROOM BY CODE ══════════════════ */
async function joinRoomByCode() {
    const sb  = window._supabase;
    const code = (document.getElementById('room-join-input')?.value || '').trim().toUpperCase();
    const statusEl = document.getElementById('room-join-status');
    const btn = document.getElementById('room-join-btn');

    if (code.length !== 6) { _lobbyStatus(statusEl, 'Code must be 6 characters.', 'err'); return; }
    if (!sb) { _lobbyStatus(statusEl, 'Supabase not connected.', 'err'); return; }

    if (btn) { btn.disabled = true; btn.textContent = 'Joining…'; }
    _lobbyStatus(statusEl, 'Looking up room…', 'wait');

    try {
        const { data: room, error } = await sb
            .from('lobby_rooms').select('*').eq('code', code).maybeSingle();
        if (error || !room) { _lobbyStatus(statusEl, 'Room not found.', 'err'); return; }

        const players = typeof room.players === 'string'
            ? JSON.parse(room.players) : (room.players || []);

        if (players.find(p => p.uid === _getOnlineUid())) {
            _lobbyStatus(statusEl, 'You are already in this room.', 'err'); return;
        }

        const isSpectator = players.length >= room.max_players;
        const myPlayer    = _lobbyMakeSelf(isSpectator ? 'spectating' : 'waiting');
        const newPlayers  = [...players, myPlayer];

        const { error: updateErr } = await sb.from('lobby_rooms')
            .update({ players: JSON.stringify(newPlayers) }).eq('code', code);
        if (updateErr) { _lobbyStatus(statusEl, updateErr.message, 'err'); return; }

        _lobby.code       = code;
        _lobby.name       = room.name;
        _lobby.maxPlayers = room.max_players;
        _lobby.hostUid    = room.host_uid;
        _lobby.isHost     = false;
        _lobby.players    = newPlayers;
        _lobby.myStatus   = myPlayer.status;
        _lobby.isReady    = false;

        toggle('menu-online-room', false);
        _lobbyEnterScreen();
    } catch(e) {
        _lobbyStatus(statusEl, 'Error: ' + e.message, 'err');
        console.error('[DR Lobby] join error', e);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '⚔ Join Battle'; }
    }
}

/* ══════════════════ ENTER LOBBY SCREEN ══════════════════ */
function _lobbyEnterScreen() {
    toggle('menu-lobby', true);

    // Render initial state
    _lobbyRenderAll();

    // Lock host name display if guest
    const nameDisplay = document.getElementById('lobby-room-name-display');
    if (nameDisplay) {
        if (_lobby.isHost) {
            nameDisplay.classList.remove('readonly');
            nameDisplay.title = 'Click to rename';
        } else {
            nameDisplay.classList.add('readonly');
            nameDisplay.title = '';
            nameDisplay.onclick = null;
        }
    }

    // Subscribe to DB changes (player join/leave/ready)
    _lobbySubscribeDB();

    // Open broadcast channel for chat + votes + challenges
    _lobbyOpenBroadcast();

    // System message
    _lobbyChatSystem(_lobby.isHost
        ? `Room created. Code: ${_lobby.code}`
        : `Joined ${_lobby.name}`);
}

/* ══════════════════ SUPABASE SUBSCRIPTIONS ══════════════════ */
function _lobbySubscribeDB() {
    // No CDC subscription — lobby state is synced via broadcast only.
    // DB is only read on initial join (in _lobbyCreate / joinRoomByCode).
    // This eliminates all realtime DB reads and the Postgres CDC overhead.
    _lobby.dbListener = null;
}

function _lobbyOpenBroadcast() {
    if (_lobby.channel) { _lobby.channel.unsubscribe(); _lobby.channel = null; }
    const sb = window._supabase;
    if (!sb || !_lobby.code) return;
    const ch = sb.channel('lobby-bc-' + _lobby.code, {
        config: { broadcast: { self: false } }
    });

    // Chat + social
    ch.on('broadcast', { event: 'chat' },      ({ payload }) => _lobbyReceiveChat(payload));
    ch.on('broadcast', { event: 'whisper' },   ({ payload }) => {
        if (payload.to === _getOnlineUid()) _lobbyReceiveWhisper(payload);
    });
    ch.on('broadcast', { event: 'challenge' }, ({ payload }) => _lobbyReceiveChallenge(payload));
    ch.on('broadcast', { event: 'vote_kick' }, ({ payload }) => _lobbyReceiveVote('kick', payload));
    ch.on('broadcast', { event: 'vote_host' }, ({ payload }) => _lobbyReceiveVote('host', payload));

    // Player state — replaces CDC. Each client broadcasts their own state.
    ch.on('broadcast', { event: 'player_state' }, ({ payload }) => {
        const idx = _lobby.players.findIndex(p => p.uid === payload.uid);
        if (idx !== -1) {
            _lobby.players[idx].status = payload.status;
            _lobby.players[idx].ready  = payload.ready;
        }
        _lobbyRenderAll();
        _lobbyCheckStart();
    });

    // Join/leave announcements (broadcast by the joining/leaving client)
    ch.on('broadcast', { event: 'player_join' }, ({ payload }) => {
        if (_lobby.players.find(p => p.uid === payload.player.uid)) return;
        _lobby.players.push(payload.player);
        _lobbyChatSystem(`${payload.player.name} joined the room`);
        _lobbyRenderAll();
    });
    ch.on('broadcast', { event: 'player_leave' }, ({ payload }) => {
        _lobby.players = _lobby.players.filter(p => p.uid !== payload.uid);
        _lobbyChatSystem(`${payload.name} left the room`);
        if (payload.wasHost && _lobby.players.length > 0) {
            _lobby.hostUid = _lobby.players[0].uid;
            _lobby.isHost  = _lobby.hostUid === _getOnlineUid();
        }
        _lobbyRenderAll();
    });

    // Host change
    ch.on('broadcast', { event: 'host_change' }, ({ payload }) => {
        _applyHostChange(payload.newHostUid);
    });

    // Room name change (host only)
    ch.on('broadcast', { event: 'room_rename' }, ({ payload }) => {
        _lobby.name = payload.name;
        const el = document.getElementById('lobby-room-name-display');
        if (el) el.textContent = payload.name;
    });

    ch.subscribe(() => {
        // Announce ourselves once subscribed (if we're the joiner, not the creator)
        if (!_lobby.isHost) {
            setTimeout(() => {
                ch.send({
                    type: 'broadcast', event: 'player_join',
                    payload: { player: _lobbyMakeSelf(_lobby.myStatus) }
                });
            }, 300);
        }
    });
    _lobby.channel = ch;

    // Start heartbeat if host
    if (_lobby.isHost) _lobbyScheduleHeartbeat();
}

/* ══════════════════ RENDER ══════════════════ */
function _lobbyRenderAll() {
    _lobbyRenderHeader();
    _lobbyRenderPlayers();
    _lobbyRenderSpectateBar();
}

function _lobbyRenderHeader() {
    const nameEl = document.getElementById('lobby-room-name-display');
    if (nameEl) nameEl.textContent = _lobby.name;
    const codeEl = document.getElementById('lobby-code-display');
    if (codeEl) codeEl.textContent = _lobby.code;
    const sizeEl = document.getElementById('lobby-size-display');
    const activePlayers = _lobby.players.filter(p => p.status !== 'spectating');
    if (sizeEl) sizeEl.textContent =
        `${activePlayers.length} / ${_lobby.maxPlayers} players`;
    const subEl = document.getElementById('lobby-sub-info');
    const readyCount = _lobby.players.filter(p => p.status === 'ready').length;
    if (subEl) subEl.textContent =
        `${readyCount} / ${_lobby.players.length} ready`;
}

function _lobbyRenderPlayers() {
    const list = document.getElementById('lobby-player-list');
    if (!list) return;
    const myUid = _getOnlineUid();
    let html = '';

    // Fill active slots
    for (let i = 0; i < _lobby.maxPlayers; i++) {
        const p = _lobby.players.filter(x => x.status !== 'spectating')[i];
        if (p) {
            const isMe   = p.uid === myUid;
            const isHost = p.uid === _lobby.hostUid;
            const statusLabel = p.status === 'ready' ? 'Ready'
                : p.status === 'fighting' ? 'Fighting'
                : 'Waiting';
            html += `
            <div class="lobby-player-row${isMe?' is-self':''}${isHost?' is-host':''}"
                 id="lpr-${p.uid}" onclick="_lobbyOpenCtx('${p.uid}', event)">
                <div class="lobby-player-avatar">${p.avatar || '⚔️'}</div>
                <div class="lobby-player-info">
                    <div class="lobby-player-name">${_clubEsc(p.name)}${isMe?' (you)':''}</div>
                    <div class="lobby-player-status ${p.status}">${statusLabel}</div>
                </div>
                <div class="lobby-ctx-menu" id="ctx-${p.uid}"></div>
                <div class="lobby-whisper-popup" id="whisper-${p.uid}"></div>
            </div>`;
        } else {
            html += `<div class="lobby-empty-slot">Empty slot</div>`;
        }
    }

    // Spectators
    const specs = _lobby.players.filter(p => p.status === 'spectating');
    if (specs.length > 0) {
        html += `<div class="lobby-col-label" style="margin-top:8px;">Spectators</div>`;
        specs.forEach(p => {
            const isMe = p.uid === myUid;
            html += `
            <div class="lobby-player-row${isMe?' is-self':''}"
                 id="lpr-${p.uid}" onclick="_lobbyOpenCtx('${p.uid}', event)">
                <div class="lobby-player-avatar" style="opacity:0.5;">${p.avatar || '👁'}</div>
                <div class="lobby-player-info">
                    <div class="lobby-player-name" style="opacity:0.6;">${_clubEsc(p.name)}${isMe?' (you)':''}</div>
                    <div class="lobby-player-status spectating">Spectating</div>
                </div>
                <div class="lobby-ctx-menu" id="ctx-${p.uid}"></div>
            </div>`;
        });
    }

    list.innerHTML = html;
}

function _lobbyRenderSpectateBar() {
    const bar = document.getElementById('lobby-spectate-bar');
    if (!bar) return;
    const isSpec = _lobby.myStatus === 'spectating';
    bar.classList.toggle('show', isSpec);
    // Adjust ready btn
    const readyBtn = document.getElementById('lobby-ready-btn');
    if (readyBtn) readyBtn.style.display = isSpec ? 'none' : '';
}

/* ══════════════════ PLAYER CONTEXT MENU ══════════════════ */
function _lobbyOpenCtx(uid, event) {
    event.stopPropagation();
    const myUid = _getOnlineUid();
    if (uid === myUid) return; // no context menu on self

    // Close all open menus first
    document.querySelectorAll('.lobby-ctx-menu.open, .lobby-whisper-popup.open')
        .forEach(m => { m.classList.remove('open'); m.innerHTML = ''; });

    const menu = document.getElementById('ctx-' + uid);
    if (!menu) return;
    const player = _lobby.players.find(p => p.uid === uid);
    if (!player) return;

    const btns = [
        { label: '⚔ Challenge',       fn: `_lobbyChallenge('${uid}')` },
        { label: '💬 Whisper',         fn: `_lobbyOpenWhisper('${uid}', event)` },
        { label: '👤 View Profile',    fn: `_lobbyViewProfile('${uid}')` },
        { label: '🗳 Vote to Kick',    fn: `_lobbyVote('kick','${uid}')`, cls: 'danger' },
        { label: '👑 Vote as Host',    fn: `_lobbyVote('host','${uid}')` },
    ];
    menu.innerHTML = btns.map(b =>
        `<button class="lobby-ctx-btn${b.cls?' '+b.cls:''}"
            onclick="${b.fn};document.querySelectorAll('.lobby-ctx-menu').forEach(m=>m.classList.remove('open'))">
            ${b.label}
        </button>`
    ).join('');
    menu.classList.add('open');

    // Close on outside click
    setTimeout(() => {
        document.addEventListener('click', function handler() {
            menu.classList.remove('open');
            menu.innerHTML = '';
            document.removeEventListener('click', handler);
        }, { once: true });
    }, 0);
}

/* ══════════════════ READY ══════════════════ */
function _lobbyToggleReady() {
    _lobby.isReady  = !_lobby.isReady;
    _lobby.myStatus = _lobby.isReady ? 'ready' : 'waiting';

    const btn = document.getElementById('lobby-ready-btn');
    if (btn) {
        btn.textContent = _lobby.isReady ? '✕ Unready' : '✓ Ready';
        btn.classList.toggle('unready', _lobby.isReady);
    }

    // Update local player state immediately
    const myUid = _getOnlineUid();
    const idx = _lobby.players.findIndex(p => p.uid === myUid);
    if (idx !== -1) {
        _lobby.players[idx].status = _lobby.myStatus;
        _lobby.players[idx].ready  = _lobby.isReady;
    }

    // Broadcast state to all clients (zero DB write)
    _lobby.channel?.send({
        type: 'broadcast', event: 'player_state',
        payload: { uid: myUid, status: _lobby.myStatus, ready: _lobby.isReady }
    });

    _lobbyRenderAll();
    _lobbyCheckStart();
}

// No more _lobbyUpdateMyPlayerInDB — replaced by broadcast above.
// Host does ONE periodic DB sync every 30s as a heartbeat so late joiners
// can read the current state.
function _lobbyScheduleHeartbeat() {
    clearInterval(window._lobbyHeartbeatTimer);
    if (!_lobby.isHost) return;
    window._lobbyHeartbeatTimer = setInterval(async () => {
        const sb = window._supabase;
        if (!sb || !_lobby.code || !_lobby.isHost) { clearInterval(window._lobbyHeartbeatTimer); return; }
        try {
            await sb.from('lobby_rooms')
                .update({ players: JSON.stringify(_lobby.players) })
                .eq('code', _lobby.code);
        } catch(e) {}
    }, 30000);
}

function _lobbyCheckStart() {
    // All non-spectating players ready → start pairing
    const active = _lobby.players.filter(p => p.status !== 'spectating');
    if (active.length < 2) return;
    const allReady = active.every(p => p.status === 'ready');
    if (!allReady) return;
    if (_lobby.isHost) _lobbyStartPairing();
}

/* ══════════════════ PAIRING ══════════════════ */
function _lobbyStartPairing() {
    // Only host runs pairing to avoid race conditions
    const active = _lobby.players.filter(p => p.status !== 'spectating');
    const shuffled = [...active].sort(() => Math.random() - 0.5);
    const pairs = [];
    for (let i = 0; i < shuffled.length - 1; i += 2) {
        pairs.push([shuffled[i], shuffled[i + 1]]);
    }
    // Odd one out — mark as spectating temporarily
    if (shuffled.length % 2 !== 0) {
        const waiting = shuffled[shuffled.length - 1];
        _lobbyChatSystem(`${waiting.name} is waiting for an open match (spectating)`);
    }
    pairs.forEach(([p1, p2]) => {
        _lobbyChatSystem(`${p1.name} vs ${p2.name} — battle starting!`);
        // Broadcast the pairing so both clients know
        _lobby.channel?.send({
            type: 'broadcast', event: 'chat',
            payload: { system: true, text: `⚔ ${p1.name} vs ${p2.name}` }
        });
        // If we are in this pair — start our game
        const myUid = _getOnlineUid();
        if (p1.uid === myUid) {
            _lobbyStartDuel(p1, p2, 'host');
        } else if (p2.uid === myUid) {
            _lobbyStartDuel(p1, p2, 'guest');
        }
    });
}

function _lobbyStartDuel(p1, p2, role) {
    // Wire the existing 1v1 system
    _onlineMode   = true;
    _onlineRole   = role;
    _onlineCode   = _lobby.code + '-' + p1.uid.slice(0,4) + p2.uid.slice(0,4);
    _onlineUid    = _getOnlineUid();
    _onlineOppUid = role === 'host' ? p2.uid : p1.uid;
    // Open a dedicated broadcast channel for this 1v1
    _broadcastChannel = window._db.broadcast(_onlineCode);
    _broadcastChannel.on(move => {
        if (!_onlineMode || !move || move.by === _onlineUid) return;
        if (!state.turn && move.type === 'play') _applyOpponentMove(move);
    });
    toggle('menu-lobby', false);
    initGame();
}

/* ══════════════════ CHAT ══════════════════ */
function _lobbySendChat() {
    const input = document.getElementById('lobby-chat-input');
    const raw   = (input?.value || '').trim();
    if (!raw || !_lobby.channel) return;
    input.value = '';
    const { text, wasFiltered } = _filterChatMsg(raw);
    if (!text) return; // entire message was blocked
    const msg = {
        uid:    _getOnlineUid(),
        name:   _profileData.username || 'Wanderer',
        avatar: _profileData.avatar   || '⚔️',
        text,
        ts:     Date.now(),
    };
    // Show a subtle hint if something was filtered
    if (wasFiltered) {
        const hint = document.createElement('div');
        hint.className = 'lobby-chat-system';
        hint.textContent = '(some words were filtered from your message)';
        hint.style.color = 'rgba(200,140,60,0.5)';
        document.getElementById('lobby-chat-box')?.appendChild(hint);
    }
    _lobbyAppendChat(msg, true);
    _lobby.channel.send({ type: 'broadcast', event: 'chat', payload: msg });
}

function _lobbyReceiveChat(payload) {
    if (payload.system) { _lobbyChatSystem(payload.text); return; }
    const div = _lobbyAppendChat(payload, false);
    // Auto-translate if enabled and message isn't already in our language
    if (window._autoTranslateChat && div && typeof _lobbyTranslateMsg === 'function') {
        _lobbyTranslateMsg(div, payload.text);
    }
}

function _lobbyAppendChat(msg, isSelf) {
    const box = document.getElementById('lobby-chat-box');
    if (!box) return;
    const div = document.createElement('div');
    div.className = 'lobby-chat-msg';
    div.style.cssText = 'display:flex;align-items:flex-start;gap:6px;';
    div.innerHTML = `
        <span class="lobby-chat-sender${isSelf?' is-self':''}">${_clubEsc(msg.avatar)} ${_clubEsc(msg.name)}</span>
        <span class="lobby-chat-text">${_clubEsc(msg.text)}</span>`;
    // Add translate button for messages from others
    if (!isSelf && typeof _makeTranslateBtn === 'function') {
        div.appendChild(_makeTranslateBtn(div, msg.text));
    }
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    return div;
}

function _lobbyChatSystem(text) {
    const box = document.getElementById('lobby-chat-box');
    if (!box) return;
    const div = document.createElement('div');
    div.className = 'lobby-chat-system';
    div.textContent = text;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

/* ══════════════════ WHISPER ══════════════════ */
function _lobbyOpenWhisper(uid, event) {
    event.stopPropagation();
    document.querySelectorAll('.lobby-whisper-popup.open')
        .forEach(m => { m.classList.remove('open'); m.innerHTML = ''; });
    const popup = document.getElementById('whisper-' + uid);
    if (!popup) return;
    const player = _lobby.players.find(p => p.uid === uid);
    popup.innerHTML = `
        <div class="lobby-whisper-label">💬 Whisper to ${_clubEsc(player?.name || '?')}</div>
        <input class="lobby-chat-input" id="whisper-input-${uid}" type="text" maxlength="200"
            placeholder="Message…"
            onkeydown="if(event.key==='Enter')_lobbySendWhisper('${uid}')">
        <button class="lobby-chat-send-btn" style="padding:6px 10px;" onclick="_lobbySendWhisper('${uid}')">Send</button>`;
    popup.classList.add('open');
    setTimeout(() => document.getElementById('whisper-input-' + uid)?.focus(), 50);
}

function _lobbySendWhisper(toUid) {
    const input = document.getElementById('whisper-input-' + toUid);
    const text  = (input?.value || '').trim();
    if (!text || !_lobby.channel) return;
    input.value = '';
    const payload = {
        from:     _getOnlineUid(),
        fromName: _profileData.username || 'Wanderer',
        to:       toUid,
        text,
    };
    // Show in our own chat
    const box = document.getElementById('lobby-chat-box');
    if (box) {
        const toPlayer = _lobby.players.find(p => p.uid === toUid);
        const div = document.createElement('div');
        div.className = 'lobby-chat-msg';
        div.innerHTML = `
            <span class="lobby-chat-sender is-self whisper">→ ${_clubEsc(toPlayer?.name || '?')}</span>
            <span class="lobby-chat-text whisper">${_clubEsc(text)}</span>`;
        box.appendChild(div);
        box.scrollTop = box.scrollHeight;
    }
    _lobby.channel.send({ type: 'broadcast', event: 'whisper', payload });
    document.querySelectorAll('.lobby-whisper-popup.open')
        .forEach(m => { m.classList.remove('open'); m.innerHTML = ''; });
}

function _lobbyReceiveWhisper(payload) {
    const box = document.getElementById('lobby-chat-box');
    if (!box) return;
    const div = document.createElement('div');
    div.className = 'lobby-chat-msg';
    div.innerHTML = `
        <span class="lobby-chat-sender whisper">← ${_clubEsc(payload.fromName)}</span>
        <span class="lobby-chat-text whisper">${_clubEsc(payload.text)}</span>`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

/* ══════════════════ VOTE TO KICK / VOTE AS HOST ══════════════════ */
const _lobbyVotes = { kick: {}, host: {} };

function _lobbyVote(type, targetUid) {
    if (!_lobby.channel) return;
    const payload = {
        type,
        targetUid,
        voterUid:  _getOnlineUid(),
        voterName: _profileData.username || 'Wanderer',
        total:     _lobby.players.filter(p => p.status !== 'spectating').length,
    };
    // Count our own vote locally too
    _lobbyReceiveVote(type, payload);
    _lobby.channel.send({ type: 'broadcast', event: 'vote_' + type, payload });
}

function _lobbyReceiveVote(type, payload) {
    if (!_lobbyVotes[type][payload.targetUid]) _lobbyVotes[type][payload.targetUid] = new Set();
    _lobbyVotes[type][payload.targetUid].add(payload.voterUid);
    const votes    = _lobbyVotes[type][payload.targetUid].size;
    const needed   = Math.ceil(payload.total / 2);
    const target   = _lobby.players.find(p => p.uid === payload.targetUid);
    _lobbyChatSystem(`${payload.voterName} voted to ${type === 'kick' ? 'kick' : 'make host'} ${target?.name || '?'} (${votes}/${needed})`);
    if (votes >= needed) {
        _lobbyVotes[type][payload.targetUid] = new Set(); // reset
        if (type === 'kick') _lobbyExecuteKick(payload.targetUid);
        else                  _lobbyExecuteHostChange(payload.targetUid);
    }
}

async function _lobbyExecuteKick(uid) {
    _lobbyChatSystem('Vote passed — player removed from room.');
    if (uid === _getOnlineUid()) { _lobbyLeave(true); return; }
    // Update local state immediately
    _lobby.players = _lobby.players.filter(p => p.uid !== uid);
    _lobbyRenderAll();
    // Broadcast the kick so the kicked player's client calls _lobbyLeave
    _lobby.channel?.send({
        type: 'broadcast', event: 'player_leave',
        payload: { uid, name: '', wasHost: false, kicked: true }
    });
    // Host writes updated player list (1 write, unavoidable for persistence)
    if (_lobby.isHost) {
        const sb = window._supabase;
        sb?.from('lobby_rooms')
          .update({ players: JSON.stringify(_lobby.players) })
          .eq('code', _lobby.code).then(() => {});
    }
}

function _lobbyExecuteHostChange(uid) {
    _lobbyChatSystem('Vote passed — new host assigned.');
    // Update local state for everyone via broadcast
    _lobby.channel?.send({
        type: 'broadcast', event: 'host_change',
        payload: { newHostUid: uid }
    });
    _applyHostChange(uid);
    // Only old host writes to DB
    if (_lobby.isHost) {
        const sb = window._supabase;
        sb?.from('lobby_rooms').update({ host_uid: uid })
          .eq('code', _lobby.code).then(() => {});
    }
}

function _applyHostChange(uid) {
    _lobby.hostUid = uid;
    _lobby.isHost  = uid === _getOnlineUid();
    if (_lobby.isHost) _lobbyScheduleHeartbeat();
    _lobbyRenderPlayers();
}

/* ══════════════════ CHALLENGE ══════════════════ */
const _lobbyPendingChallenges = new Set();

function _lobbyChallenge(uid) {
    if (!_lobby.channel) return;
    const myUid = _getOnlineUid();
    // Check if they already challenged us
    if (_lobbyPendingChallenges.has(uid + '-' + myUid)) {
        // Mutual challenge → start duel
        _lobbyPendingChallenges.delete(uid + '-' + myUid);
        const me     = _lobbyMakeSelf(_lobby.myStatus);
        const target = _lobby.players.find(p => p.uid === uid);
        if (target) {
            _lobbyChatSystem(`⚔ Challenge accepted! ${me.name} vs ${target.name}`);
            _lobbyStartDuel(me, target, 'host');
        }
        return;
    }
    _lobbyPendingChallenges.add(myUid + '-' + uid);
    _lobby.channel.send({
        type: 'broadcast', event: 'challenge',
        payload: { from: myUid, fromName: _profileData.username || 'Wanderer', to: uid }
    });
    _lobbyChatSystem(`You challenged ${_lobby.players.find(p=>p.uid===uid)?.name || '?'} to a duel`);
}

function _lobbyReceiveChallenge(payload) {
    if (payload.to !== _getOnlineUid()) return;
    _lobbyPendingChallenges.add(payload.from + '-' + _getOnlineUid());
    _lobbyChatSystem(`⚔ ${payload.fromName} challenged you to a duel! Click their name → Challenge to accept.`);
}

/* ══════════════════ VIEW PROFILE ══════════════════ */
function _lobbyViewProfile(uid) {
    const sb = window._supabase;
    // Build/show modal immediately with loading state
    let modal = document.getElementById('lobby-profile-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'lobby-profile-modal';
        modal.style.cssText = `
            position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;
            background:rgba(0,0,0,0.72);backdrop-filter:blur(4px);
        `;
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div style="
            background:linear-gradient(160deg,#1a1005 0%,#0d0800 100%);
            border:1px solid rgba(140,95,25,0.45);border-radius:12px;
            padding:28px 32px;min-width:300px;max-width:420px;width:90%;
            box-shadow:0 8px 48px rgba(0,0,0,0.8);font-family:'Cinzel',serif;color:#d4b878;
            position:relative;
        ">
            <button onclick="document.getElementById('lobby-profile-modal').remove()" style="
                position:absolute;top:12px;right:14px;background:none;border:none;
                color:rgba(200,160,80,0.5);font-size:18px;cursor:pointer;
            ">✕</button>
            <div id="lpm-content" style="text-align:center;padding:20px 0;">
                <div style="color:rgba(200,160,80,0.5);font-size:11px;letter-spacing:2px;">LOADING…</div>
            </div>
        </div>
    `;

    if (!sb || !uid) {
        document.getElementById('lpm-content').innerHTML =
            '<div style="color:#c0392b;font-size:11px;">Could not load profile.</div>';
        return;
    }

    sb.from('profiles').select('username,avatar,avatar_img,banner_img,bio,quote,level,xp,wins,losses')
        .eq('id', uid).maybeSingle()
        .then(({ data, error }) => {
            const c = document.getElementById('lpm-content');
            if (!c) return;
            if (error || !data) {
                c.innerHTML = '<div style="color:#c0392b;font-size:11px;">Profile not found.</div>';
                return;
            }
            const wins   = data.wins   || 0;
            const losses = data.losses || 0;
            const total  = wins + losses;
            const wr     = total ? Math.round(wins / total * 100) : 0;
            const level  = data.level || 1;
            const tier   = typeof levelTier === 'function' ? levelTier(level) : { label:'Iron', color:'#888', icon:'⚙️' };
            const avHtml = data.avatar_img
                ? `<img src="${data.avatar_img}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid rgba(200,160,40,0.5);">`
                : `<div style="font-size:40px;line-height:1;">${data.avatar || '⚔️'}</div>`;
            c.innerHTML = `
                <div style="margin-bottom:10px;">${avHtml}</div>
                <div style="font-size:15px;font-weight:bold;letter-spacing:1px;margin-bottom:2px;">${data.username || 'Unknown'}</div>
                <div style="font-size:10px;color:${tier.color||'#c8a460'};letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">${tier.icon} Lv.${level} ${tier.label}</div>
                ${data.quote ? `<div style="font-size:10px;color:rgba(200,160,80,0.6);font-style:italic;margin-bottom:10px;">"${data.quote}"</div>` : ''}
                <div style="display:flex;gap:16px;justify-content:center;margin-bottom:${data.bio?'12px':'0'};">
                    <div><div style="font-size:16px;font-weight:bold;">${wins}</div><div style="font-size:8px;letter-spacing:2px;opacity:.6;">WINS</div></div>
                    <div><div style="font-size:16px;font-weight:bold;">${losses}</div><div style="font-size:8px;letter-spacing:2px;opacity:.6;">LOSSES</div></div>
                    <div><div style="font-size:16px;font-weight:bold;">${wr}%</div><div style="font-size:8px;letter-spacing:2px;opacity:.6;">WIN RATE</div></div>
                </div>
                ${data.bio ? `<div style="font-size:10px;color:rgba(200,160,80,0.55);margin-top:8px;line-height:1.5;">${data.bio}</div>` : ''}
            `;
        });
}

/* ══════════════════ ROOM NAME EDIT (HOST ONLY) ══════════════════ */
function _lobbyEditName() {
    if (!_lobby.isHost) return;
    const display = document.getElementById('lobby-room-name-display');
    const input   = document.getElementById('lobby-room-name-input');
    if (!display || !input) return;
    input.value = _lobby.name;
    display.style.display = 'none';
    input.style.display   = 'block';
    input.focus();
    input.select();
}

function _lobbySaveName() {
    const display = document.getElementById('lobby-room-name-display');
    const input   = document.getElementById('lobby-room-name-input');
    if (!display || !input) return;
    const newName = input.value.trim() || _lobby.name;
    _lobby.name   = newName;
    display.textContent   = newName;
    display.style.display = '';
    input.style.display   = 'none';
    // Broadcast rename to all clients (zero DB write)
    _lobby.channel?.send({
        type: 'broadcast', event: 'room_rename',
        payload: { name: newName }
    });
    // Fire-and-forget DB update for persistence (late joiners read this)
    const sb = window._supabase;
    if (sb && _lobby.code) {
        sb.from('lobby_rooms').update({ name: newName })
          .eq('code', _lobby.code).then(() => {});
    }
}

/* ══════════════════ COPY CODE ══════════════════ */
function _lobbyCopyCode() {
    if (!_lobby.code) return;
    navigator.clipboard.writeText(_lobby.code).then(() => {
        const el = document.getElementById('lobby-code-display');
        if (el) {
            const orig = el.textContent;
            el.textContent = 'Copied!';
            setTimeout(() => { el.textContent = orig; }, 1500);
        }
    });
}

/* ══════════════════ LEAVE ══════════════════ */
async function _lobbyLeave(kicked = false) {
    const sb = window._supabase;
    if (!kicked) playSfx('menuClick');
    clearInterval(window._lobbyHeartbeatTimer);

    const myUid   = _getOnlineUid();
    const wasHost = _lobby.isHost;
    const myName  = _profileData.username || 'Wanderer';

    // Broadcast leave immediately (before unsubscribing)
    if (_lobby.channel) {
        try {
            await _lobby.channel.send({
                type: 'broadcast', event: 'player_leave',
                payload: { uid: myUid, name: myName, wasHost }
            });
        } catch(e) {}
    }

    // Unsubscribe
    if (_lobby.channel)    { _lobby.channel.unsubscribe(); _lobby.channel = null; }
    if (_lobby.dbListener) { _lobby.dbListener(); _lobby.dbListener = null; }

    // DB work: use local state (no read needed)
    if (sb && _lobby.code) {
        try {
            const remainingPlayers = _lobby.players.filter(p => p.uid !== myUid);
            if (remainingPlayers.length === 0) {
                // Last person — delete the room (1 write)
                await sb.from('lobby_rooms').delete().eq('code', _lobby.code);
            } else if (wasHost) {
                // Pass host + update players in one write
                await sb.from('lobby_rooms').update({
                    host_uid: remainingPlayers[0].uid,
                    players:  JSON.stringify(remainingPlayers),
                }).eq('code', _lobby.code);
            }
            // If not host and not last: no DB write needed — others got the broadcast
        } catch(e) { console.warn('[DR Lobby] leave error', e); }
    }

    // Reset state
    Object.assign(_lobby, {
        code:null, name:'My Lobby', maxPlayers:2, hostUid:null,
        players:[], isHost:false, myStatus:'waiting', isReady:false,
        channel:null, dbListener:null,
    });
    Object.keys(_lobbyVotes.kick).forEach(k => delete _lobbyVotes.kick[k]);
    Object.keys(_lobbyVotes.host).forEach(k => delete _lobbyVotes.host[k]);
    _lobbyPendingChallenges.clear();

    toggle('menu-lobby', false);
    if (kicked) {
        toggle('menu-start', true); if(typeof _updateStartScreen==='function') _updateStartScreen();
    } else {
        toggle('menu-private-room-choice', true);
    }
}

/* ══════════════════ HELPERS ══════════════════ */
function _lobbyMakeSelf(status) {
    return {
        uid:    _getOnlineUid(),
        name:   _profileData.username || 'Wanderer',
        avatar: _profileData.avatar   || '⚔️',
        ready:  false,
        status,
    };
}

function _lobbyStatus(el, msg, type) {
    if (!el) return;
    el.textContent = msg;
    el.className   = 'online-status' + (type ? ' ' + type : '');
    el.style.display = msg ? '' : 'none';
}

/* ══════════════════ CANCEL OLD MATCHMAKING ══════════════════ */
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

/* ═══════════════════════════════ END LOBBY SYSTEM ══════════════════════════════════════════ */

// If Supabase module loads after _initSync (it usually does, since it's a module),
// re-try fetching the profile from cloud once Supabase is available
window._onDbReady = function() {
    // Run auth startup check once Supabase is ready
    _authStartupCheck();
};

/* ── updateClubTitle + renderPinnedAch + avatar/pin pickers below ── */






/* ═══════════════════════════════════════════════════════════════════════
   CHAT MODERATION
   Philosophy: "Xbox 360 party chat" — banter, trash talk, and light
   swearing are fine. What gets filtered is genuinely harmful content:
   slurs, harassment, doxxing-style language, and extreme content.
   Regular swearing (damn, hell, ass, crap, etc.) passes through.
======================================================================= */

/* Words to REMOVE from LeoProfanity's default list (allow these) */
const _CHAT_ALLOWED_WORDS = [
    'ass','asses','damn','hell','crap','piss','pissed','bastard',
    'bloody','bollocks','bugger','suck','sucks','sucked','sucker',
    'screw','screwed','clueless','moron','idiot','stupid','dumb',
    'noob','loser','bot','trash','garbage','awful','terrible',
    'ez','rekt','owned','destroyed','wrecked','demolished',
    'git','numpty','muppet','wanker','tosser','plonker',
];

/* Extra words to ADD to the filter (slurs, hate speech, harassment) */
const _CHAT_BLOCKED_EXTRA = [
    // Racial/ethnic slurs — not listing them here, LeoProfanity covers most
    // Adding doxxing-style trigger words
    'doxx','doxing','swat','swatting','kys','kill yourself',
    'your address','your ip','your location',
];

let _chatFilterReady = false;

function _initChatFilter() {
    if (_chatFilterReady) return;
    if (typeof LeoProfanity === 'undefined') return;
    // Start from default dictionary
    LeoProfanity.loadDictionary();
    // Remove the words we want to allow
    LeoProfanity.remove(_CHAT_ALLOWED_WORDS);
    // Add extra blocked words
    LeoProfanity.add(_CHAT_BLOCKED_EXTRA);
    _chatFilterReady = true;
}

/* ── Filter a chat message. Returns { text, wasFiltered } ── */
function _filterChatMsg(raw) {
    if (!raw) return { text: '', wasFiltered: false };
    _initChatFilter();
    if (typeof LeoProfanity === 'undefined') return { text: raw, wasFiltered: false };

    // In streamer mode, use the full strict filter (no relaxation)
    if (window._streamerMode) {
        const cleaned = LeoProfanity.clean(raw);
        return { text: cleaned, wasFiltered: cleaned !== raw };
    }

    const cleaned = LeoProfanity.clean(raw);
    return { text: cleaned, wasFiltered: cleaned !== raw };
}

/* ── Relaxed filter used when streamer mode is off ── */
function _applyRelaxedProfanityFilter() {
    if (typeof LeoProfanity === 'undefined') return;
    LeoProfanity.loadDictionary();
    LeoProfanity.remove(_CHAT_ALLOWED_WORDS);
    LeoProfanity.add(_CHAT_BLOCKED_EXTRA);
    _chatFilterReady = true;
}
