    // ─── CONFIG — swap these two values ───────────────────────────────────────
    const SUPABASE_URL = 'https://jbtpvcpuerysdshzaeuq.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpidHB2Y3B1ZXJ5c2RzaHphZXVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MzQ1NDEsImV4cCI6MjA5NzQxMDU0MX0.JkBtHcaQEL2flw5wWKKRsHhUSS80EUAoHLFOi_QAOb0';
    // ──────────────────────────────────────────────────────────────────────────

    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
    window._supabase = sb;

    /* ── _db: thin wrapper so the rest of the game code is unchanged ──────────
       Rooms and matchmaking use the Supabase `online_rooms` / `match_queue`
       tables (one write to signal presence, then cleaned up after).
       Live move sync uses Supabase Realtime BROADCAST — no DB writes at all.
    ─────────────────────────────────────────────────────────────────────────── */

    // Parse a Firebase-style path like "onlineRooms/ABC123" or "matchQueue/uid"
    function _parsePath(path) {
        const parts = path.split('/');
        return { table: parts[0], id: parts[1] || null, field: parts[2] || null };
    }

    window._db = {

        // Read a row. Returns { data, error } — data is the row object or null.
        get: async (path) => {
            const { table, id } = _parsePath(path);
            const tbl = table === 'onlineRooms' ? 'online_rooms' : 'match_queue';
            const col = table === 'onlineRooms' ? 'code'         : 'uid';
            if (!id) {
                // Fetch entire table (used by matchmaking queue scan)
                const { data, error } = await sb.from(tbl).select('*');
                if (error) return { data: null, error };
                // Return as an object keyed by id, matching the old Firebase shape
                const obj = {};
                data.forEach(row => { obj[row[col]] = row; });
                return { data: Object.keys(obj).length ? obj : null, error: null };
            }
            const { data, error } = await sb.from(tbl).select('*').eq(col, id).maybeSingle();
            return { data, error };
        },

        // Insert or overwrite a row.
        set: async (path, value) => {
            const { table, id } = _parsePath(path);
            const tbl = table === 'onlineRooms' ? 'online_rooms' : 'match_queue';
            const col = table === 'onlineRooms' ? 'code'         : 'uid';
            const row = { [col]: id, ...value };
            const { error } = await sb.from(tbl).upsert(row, { onConflict: col });
            return { error };
        },

        // Merge fields into an existing row.
        update: async (path, value) => {
            const { table, id, field } = _parsePath(path);
            const tbl = table === 'onlineRooms' ? 'online_rooms' : 'match_queue';
            const col = table === 'onlineRooms' ? 'code'         : 'uid';
            // If path targets a sub-field (e.g. onlineRooms/ABC/move), wrap it
            const payload = field ? { [field]: value } : value;
            const { error } = await sb.from(tbl).update(payload).eq(col, id);
            return { error };
        },

        // Delete a row.
        remove: async (path) => {
            const { table, id } = _parsePath(path);
            const tbl = table === 'onlineRooms' ? 'online_rooms' : 'match_queue';
            const col = table === 'onlineRooms' ? 'code'         : 'uid';
            const { error } = await sb.from(tbl).delete().eq(col, id);
            return { error };
        },

        // Subscribe to row changes via Postgres CDC.
        // Returns an unsubscribe function, matching the old Firebase shape.
        sub: (path, cb) => {
            const { table, id } = _parsePath(path);
            const tbl = table === 'onlineRooms' ? 'online_rooms' : 'match_queue';
            const col = table === 'onlineRooms' ? 'code'         : 'uid';
            const channelName = `db-${tbl}-${id}-${Date.now()}`;
            const channel = sb.channel(channelName)
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: tbl, filter: `${col}=eq.${id}` },
                    payload => cb({ data: payload.new })
                )
                .subscribe();
            return () => sb.removeChannel(channel);
        },

        // ── Broadcast: zero-DB live move sync ──────────────────────────────────
        // Returns a { send(payload), unsub() } handle.
        broadcast: (roomCode) => {
            const channel = sb.channel(`game-${roomCode}`, {
                config: { broadcast: { self: false } }
            });
            channel.subscribe();
            return {
                send: (payload) => channel.send({ type: 'broadcast', event: 'move', payload }),
                on:   (cb)      => { channel.on('broadcast', { event: 'move' }, ({ payload }) => cb(payload)); },
                unsub: ()       => sb.removeChannel(channel),
            };
        },
    };

    window._dbReady = true;
    if (typeof window._onDbReady === 'function') window._onDbReady();
