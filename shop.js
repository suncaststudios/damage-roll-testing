/* ═══════════════════════════════════════════════════════════════════
   ARCANE EMPORIUM  —  shop.js  v2
   ─────────────────────────────────────────────────────────────────
   • Daily rotation of 10 items from a pool of 20
   • Bundles: up to 3 per day, 3-5 items, no same class twice, 15% off
   • Purchase history: last 8 purchases, 80% refund forever
   • Gold only — no gems, no battle pass
   • Popularity tracked locally, synced to Supabase on quit
   ─────────────────────────────────────────────────────────────────
   Storage keys:
     dr_shop_gold         — current gold balance
     dr_shop_owned        — JSON array of owned item ids
     dr_shop_history      — JSON array of last 8 purchase objects
     dr_shop_popularity   — JSON object { itemId: localCount }
     dr_shop_pending_pop  — popularity increments not yet synced
     dr_shop_last_day     — YYYY-MM-DD of last rotation
     dr_shop_daily_ids    — JSON array of today's 10 item ids
═══════════════════════════════════════════════════════════════════ */

/* ═══════════════════ COSMETIC POOL (20 items) ═══════════════════ */
const SHOP_POOL = [
    /* ── HATS (6) ── */
    { id:'hat_devil',    class:'hat',  name:'Devil Horns',     icon:'😈', desc:'Two red horns curve above your card. Intimidation guaranteed.',           price:180 },
    { id:'hat_trucker',  class:'hat',  name:'Trucker Hat',     icon:'🧢', desc:'A mesh-back cap. Worn-in, road-worn, and ready to deal damage.',           price:120 },
    { id:'hat_barb',     class:'hat',  name:'Barbarian Helm',  icon:'⛑',  desc:'Iron-riveted helmet of the war-worn north. Your enemies will notice.',     price:200 },
    { id:'hat_angel',    class:'hat',  name:'Angel Ring',      icon:'😇', desc:'A soft golden halo floats above. Don\'t let it fool anyone.',              price:150 },
    { id:'hat_tnt',      class:'hat',  name:'TNT Block',       icon:'💣', desc:'A certain pixelated explosive block. Not from any game we can name.',      price:160 },
    { id:'hat_crown',    class:'hat',  name:'Thorn Crown',     icon:'👑', desc:'A crown of black thorns. Worn by those who climbed over everyone else.',   price:280 },

    /* ── AURAS (6) ── */
    { id:'aura_saiyan',  class:'aura', name:'Saiyan Charge',   icon:'⚡', desc:'Golden crackling energy erupts from your card. Power level: rising.',      price:320 },
    { id:'aura_skulls',  class:'aura', name:'Skull Orbit',     icon:'💀', desc:'Three skulls orbit your card in an endless slow rotation.',                price:280 },
    { id:'aura_pixel',   class:'aura', name:'Pixel Glow',      icon:'🟦', desc:'A blue pixelated shimmer traces the edge of your card. Retro.',            price:240 },
    { id:'aura_flame',   class:'aura', name:'Soul Flame',      icon:'🔥', desc:'Cold blue fire licks the border of your card. It doesn\'t burn. Much.',   price:300 },
    { id:'aura_runes',   class:'aura', name:'Rune Pulse',      icon:'ᚠ',  desc:'Ancient runes pulse outward from your card in rings of faint gold.',       price:260 },
    { id:'aura_void',    class:'aura', name:'Void Tear',       icon:'🌑', desc:'A tear in reality frames your card. What\'s on the other side? Unknown.',  price:400 },

    /* ── CARDS (5) ── */
    { id:'card_trad',    class:'card', name:'Traditional',     icon:'🃏', desc:'Classic blue rim with aged paper texture. Old school.',                    price:140 },
    { id:'card_steel',   class:'card', name:'Steel Plate',     icon:'⚙',  desc:'Cold brushed metal surface. Every card feels like a weapon.',              price:220 },
    { id:'card_gel',     class:'card', name:'Gel',             icon:'🫧', desc:'A translucent gel finish. Slightly wobbly. Very satisfying.',              price:180 },
    { id:'card_obsidian',class:'card', name:'Obsidian',        icon:'🖤', desc:'Glassy volcanic black. Smooth, cold, and completely unreadable.',           price:260 },
    { id:'card_parchment',class:'card',name:'Parchment',       icon:'📜', desc:'Worn manuscript paper, ink-stained at the edges. Ancient.',                price:200 },

    /* ── FONTS (3) ── */
    { id:'font_mono',    class:'font', name:'Terminal Mono',   icon:'⌨',  desc:'Clean monospace. Every card reads like a system readout.',                 price:100 },
    { id:'font_serif',   class:'font', name:'Elder Serif',     icon:'📖', desc:'A weathered serif. Your cards feel like pages from a forgotten tome.',     price:120 },
    { id:'font_display', class:'font', name:'War Display',     icon:'⚔',  desc:'Bold, condensed, uppercase. Maximum impact, minimum mercy.',               price:140 },
];

/* ═══════════════════ BUNDLE DEFINITIONS (rotated, max 3/day) ═════ */
const BUNDLE_POOL = [
    {
        id:'bundle_warmonger', name:'Warmonger Pack', icon:'⚔',
        desc:'Suit up for battle. A full combat loadout.',
        itemIds:['hat_barb','aura_saiyan','card_steel','font_display'],
    },
    {
        id:'bundle_haunted', name:'Haunted Set', icon:'💀',
        desc:'Death follows you. Let everyone see it.',
        itemIds:['hat_devil','aura_skulls','card_obsidian'],
    },
    {
        id:'bundle_scholar', name:'Scholar\'s Collection', icon:'📜',
        desc:'For the player who reads between the lines.',
        itemIds:['hat_angel','card_parchment','font_serif','aura_runes'],
    },
    {
        id:'bundle_retro', name:'Retro Rig', icon:'🟦',
        desc:'Pixels and ports. A throwback loadout.',
        itemIds:['hat_tnt','aura_pixel','font_mono','card_gel'],
    },
    {
        id:'bundle_void', name:'Void Walker', icon:'🌑',
        desc:'You came from nowhere. Return to it in style.',
        itemIds:['hat_crown','aura_void','card_obsidian','font_display'],
    },
];

/* ═══════════════════ GOLD EARN INFO ═════════════════════════════ */
const GOLD_SOURCES = [
    { icon:'⚡', label:'Win an online match',     amount:'+25 🪙' },
    { icon:'🏆', label:'Win a tournament',         amount:'+150 🪙' },
    { icon:'🔗', label:'Land a triple crit chain', amount:'+10 🪙' },
    { icon:'📅', label:'Daily login',              amount:'+5 🪙'  },
    { icon:'⚙',  label:'Complete an achievement',  amount:'+15–50 🪙' },
    { icon:'🎯', label:'First win of the day',     amount:'+20 🪙' },
];

/* ═══════════════════ STATE ══════════════════════════════════════ */
let _shopGold       = 0;
let _shopOwned      = new Set();
let _shopHistory    = [];   // [{id, name, icon, price, purchasedAt}]
let _shopPopularity = {};   // {itemId: globalCount} — loaded from Supabase or local
let _shopPendingPop = {};   // {itemId: delta} — to be synced on quit
let _shopDailyIds   = [];   // today's 10 item ids
let _shopDailyBundleIds = [];// today's (up to 3) bundle ids
let _shopActiveTab  = 'featured';
let _shopActiveSub  = 'all';

/* ═══════════════════ INIT ═══════════════════════════════════════ */
function _shopLoad() {
    try {
        _shopGold       = parseInt(localStorage.getItem('dr_shop_gold')  || '0', 10) || 0;
        _shopOwned      = new Set(JSON.parse(localStorage.getItem('dr_shop_owned')   || '[]'));
        _shopHistory    = JSON.parse(localStorage.getItem('dr_shop_history')         || '[]');
        _shopPopularity = JSON.parse(localStorage.getItem('dr_shop_popularity')      || '{}');
        _shopPendingPop = JSON.parse(localStorage.getItem('dr_shop_pending_pop')     || '{}');
    } catch(e) {}
    _shopResolveDailyRotation();
}

function _shopSave() {
    try {
        localStorage.setItem('dr_shop_gold',        String(_shopGold));
        localStorage.setItem('dr_shop_owned',       JSON.stringify([..._shopOwned]));
        localStorage.setItem('dr_shop_history',     JSON.stringify(_shopHistory));
        localStorage.setItem('dr_shop_popularity',  JSON.stringify(_shopPopularity));
        localStorage.setItem('dr_shop_pending_pop', JSON.stringify(_shopPendingPop));
    } catch(e) {}
}

/* ── Gold API (called by game on win/achievement/etc) ── */
function shopAwardGold(amount) {
    _shopLoad();
    _shopGold = Math.max(0, _shopGold + amount);
    _shopSave();
    _shopUpdateCurrencyDisplay();
}

/* ═══════════════════ DAILY ROTATION ════════════════════════════ */
function _shopTodayKey() {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/* Seeded shuffle — same seed = same order for everyone on same day */
function _shopSeededShuffle(arr, seed) {
    const a = [...arr];
    let s = seed;
    for (let i = a.length - 1; i > 0; i--) {
        s = ((s * 1664525) + 1013904223) & 0xffffffff;
        const j = Math.abs(s) % (i + 1);
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function _shopDateSeed(dateStr) {
    // Turn "2026-06-22" into an integer seed
    return dateStr.split('-').reduce((acc, n) => acc * 1000 + parseInt(n, 10), 0);
}

function _shopResolveDailyRotation() {
    const today = _shopTodayKey();
    const stored = localStorage.getItem('dr_shop_last_day');
    if (stored === today) {
        try {
            _shopDailyIds       = JSON.parse(localStorage.getItem('dr_shop_daily_ids')        || '[]');
            _shopDailyBundleIds = JSON.parse(localStorage.getItem('dr_shop_daily_bundle_ids') || '[]');
        } catch(e) {}
        if (_shopDailyIds.length === 10) return;
    }
    // New day — generate rotation
    const seed    = _shopDateSeed(today);
    const items   = _shopSeededShuffle(SHOP_POOL, seed);
    const bundles = _shopSeededShuffle(BUNDLE_POOL, seed + 7);
    _shopDailyIds       = items.slice(0, 10).map(i => i.id);
    _shopDailyBundleIds = bundles.slice(0, 3).map(b => b.id);
    localStorage.setItem('dr_shop_last_day',          today);
    localStorage.setItem('dr_shop_daily_ids',          JSON.stringify(_shopDailyIds));
    localStorage.setItem('dr_shop_daily_bundle_ids',   JSON.stringify(_shopDailyBundleIds));
}

/* ── Get today's listed items/bundles ── */
function _shopDailyItems() {
    return _shopDailyIds.map(id => SHOP_POOL.find(i => i.id === id)).filter(Boolean);
}

function _shopDailyBundles() {
    return _shopDailyBundleIds.map(id => BUNDLE_POOL.find(b => b.id === id)).filter(Boolean)
        .map(b => {
            const items = b.itemIds.map(id => SHOP_POOL.find(i => i.id === id)).filter(Boolean);
            const fullPrice   = items.reduce((s,i) => s + i.price, 0);
            const bundlePrice = Math.floor(fullPrice * 0.85);
            const savings     = fullPrice - bundlePrice;
            return { ...b, items, fullPrice, bundlePrice, savings };
        });
}

/* ═══════════════════ POPULARITY ════════════════════════════════ */
function _shopGetPopularity(id) {
    return (_shopPopularity[id] || 0) + (_shopPendingPop[id] || 0);
}

function _shopIncrementPop(id) {
    _shopPendingPop[id] = (_shopPendingPop[id] || 0) + 1;
    _shopPopularity[id] = (_shopPopularity[id] || 0) + 1;
    _shopSave();
}

/* Sync pending popularity to Supabase — called before window unload */
async function _shopSyncPopularity() {
    const sb = window._supabase;
    if (!sb || !Object.keys(_shopPendingPop).length) return;
    try {
        for (const [id, delta] of Object.entries(_shopPendingPop)) {
            // Upsert into a shop_popularity table
            const { data } = await sb.from('shop_popularity').select('count').eq('item_id', id).maybeSingle();
            const newCount  = (data?.count || 0) + delta;
            await sb.from('shop_popularity').upsert({ item_id: id, count: newCount }, { onConflict: 'item_id' });
        }
        _shopPendingPop = {};
        _shopSave();
    } catch(e) {}
}

/* Load global popularity from Supabase */
async function _shopLoadPopularity() {
    const sb = window._supabase;
    if (!sb) return;
    try {
        const { data } = await sb.from('shop_popularity').select('item_id,count');
        if (data) data.forEach(row => { _shopPopularity[row.item_id] = row.count; });
        _shopSave();
    } catch(e) {}
}

/* ═══════════════════ OPEN SHOP ═════════════════════════════════ */
function openShop() {
    _shopLoad();
    _shopLoadPopularity();
    toggle('menu-shop', true);
    switchShopTab('featured');
    _shopUpdateCurrencyDisplay();
}

function _shopUpdateCurrencyDisplay() {
    const el = document.getElementById('shop-gold-amt');
    if (el) el.textContent = _shopGold.toLocaleString();
}

/* ═══════════════════ TAB SWITCHING ═════════════════════════════ */
function switchShopTab(id) {
    _shopActiveTab = id;
    document.querySelectorAll('.shop-tab').forEach(t =>
        t.classList.toggle('active', t.dataset.tab === id));
    document.querySelectorAll('.shop-panel').forEach(p =>
        p.classList.toggle('active', p.id === 'shop-panel-' + id));
    playSfx('menuClick');

    if (id === 'featured')  _shopRenderFeatured();
    if (id === 'cosmetics') _shopRenderCosmetics(_shopActiveSub);
    if (id === 'bundles')   _shopRenderBundles();
    if (id === 'history')   _shopRenderHistory();
}

function switchShopSub(sub, btnEl) {
    _shopActiveSub = sub;
    document.querySelectorAll('.shop-filter').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    _shopRenderCosmetics(sub);
    playSfx('menuClick');
}

/* ═══════════════════ FEATURED ══════════════════════════════════ */
function _shopRenderFeatured() {
    const daily = _shopDailyItems();
    const bundles = _shopDailyBundles();

    // Top 3 cosmetics by popularity (from today's listed items)
    const topItems = [...daily]
        .sort((a,b) => _shopGetPopularity(b.id) - _shopGetPopularity(a.id))
        .slice(0, 3);

    // Top 2 bundles by popularity
    const topBundles = [...bundles]
        .sort((a,b) => _shopGetPopularity(b.id) - _shopGetPopularity(a.id))
        .slice(0, 2);

    const itemGrid   = document.getElementById('shop-feat-items');
    const bundleGrid = document.getElementById('shop-feat-bundles');
    const noItems    = document.getElementById('shop-feat-no-items');
    const noBundles  = document.getElementById('shop-feat-no-bundles');

    if (itemGrid) {
        if (!topItems.length) {
            itemGrid.innerHTML = '';
            if (noItems) noItems.style.display = 'block';
        } else {
            if (noItems) noItems.style.display = 'none';
            itemGrid.innerHTML = topItems.map((item, i) => _shopItemCard(item, ['🥇','🥈','🥉'][i] + ' ')).join('');
        }
    }

    if (bundleGrid) {
        if (!topBundles.length) {
            bundleGrid.innerHTML = '';
            if (noBundles) noBundles.style.display = 'block';
        } else {
            if (noBundles) noBundles.style.display = 'none';
            bundleGrid.innerHTML = topBundles.map(b => _shopBundleCard(b)).join('');
        }
    }
}

/* ═══════════════════ COSMETICS ═════════════════════════════════ */
function _shopRenderCosmetics(sub) {
    const daily = _shopDailyItems();
    const classMap = { hats:'hat', auras:'aura', cards:'card', fonts:'font' };
    const filterClass = classMap[sub] || null;
    const items = filterClass ? daily.filter(i => i.class === filterClass) : daily;

    const grid  = document.getElementById('shop-grid-cosmetics');
    const empty = document.getElementById('shop-empty-cosmetics');
    if (!grid) return;

    if (!items.length) {
        grid.innerHTML = '';
        if (empty) empty.style.display = 'flex';
        return;
    }
    if (empty) empty.style.display = 'none';
    grid.innerHTML = items.map(item => _shopItemCard(item)).join('');
}

/* ═══════════════════ BUNDLES ═══════════════════════════════════ */
function _shopRenderBundles() {
    const bundles = _shopDailyBundles();
    const grid  = document.getElementById('shop-grid-bundles');
    const empty = document.getElementById('shop-empty-bundles');
    if (!grid) return;

    if (!bundles.length) {
        grid.innerHTML = '';
        if (empty) empty.style.display = 'flex';
        return;
    }
    if (empty) empty.style.display = 'none';
    grid.innerHTML = bundles.map(b => _shopBundleCard(b)).join('');
}

/* ═══════════════════ HISTORY ═══════════════════════════════════ */
function _shopRenderHistory() {
    const el = document.getElementById('shop-history-list');
    const empty = document.getElementById('shop-history-empty');
    if (!el) return;

    if (!_shopHistory.length) {
        el.innerHTML = '';
        if (empty) empty.style.display = 'flex';
        return;
    }
    if (empty) empty.style.display = 'none';

    el.innerHTML = _shopHistory.slice(0, 8).map(h => {
        const refundAmt = Math.floor(h.price * 0.8);
        const alreadyRefunded = h.refunded;
        const date = new Date(h.purchasedAt).toLocaleDateString(undefined, { month:'short', day:'numeric' });
        return `
        <div class="shop-history-row ${alreadyRefunded ? 'refunded' : ''}">
            <div class="shop-history-icon">${h.icon}</div>
            <div class="shop-history-info">
                <div class="shop-history-name">${h.name}</div>
                <div class="shop-history-meta">${_shopClassLabel(h.class)} · ${h.price} 🪙 · ${date}</div>
            </div>
            <div class="shop-history-right">
                ${alreadyRefunded
                    ? `<span class="shop-history-refunded-badge">Refunded</span>`
                    : `<button class="shop-btn shop-btn-refund" onclick="_shopRefund('${h.id}')">↩ ${refundAmt} 🪙</button>`
                }
            </div>
        </div>`;
    }).join('');
}

/* ═══════════════════ CARD HTML HELPERS ═════════════════════════ */
function _shopClassLabel(cls) {
    return { hat:'Hat', aura:'Aura', card:'Card Style', font:'Font' }[cls] || cls;
}
function _shopClassColor(cls) {
    return { hat:'#e8a020', aura:'#8040e0', card:'#2080e0', font:'#20a060' }[cls] || '#c8a460';
}

function _shopItemCard(item, prefix = '') {
    const owned   = _shopOwned.has(item.id);
    const pop     = _shopGetPopularity(item.id);
    const clColor = _shopClassColor(item.class);
    return `
    <div class="shop-item" onclick="_shopItemClick('${item.id}')">
        <div class="shop-item-class-bar" style="background:${clColor};"></div>
        <div class="shop-item-icon">${prefix}${item.icon}</div>
        <div class="shop-item-name">${item.name}</div>
        <div class="shop-item-type" style="color:${clColor};">${_shopClassLabel(item.class)}</div>
        <div class="shop-item-desc">${item.desc}</div>
        ${owned
            ? `<div class="shop-item-owned">✓ Owned</div>`
            : `<div class="shop-item-price">🪙 ${item.price.toLocaleString()}</div>`
        }
        ${pop > 0 ? `<div class="shop-item-pop">🔥 ${pop} purchased</div>` : ''}
    </div>`;
}

function _shopBundleCard(bundle) {
    const allOwned = bundle.items.every(i => _shopOwned.has(i.id));
    const someOwned = bundle.items.some(i => _shopOwned.has(i.id));
    const pop = _shopGetPopularity(bundle.id);
    return `
    <div class="shop-bundle-card" onclick="_shopBundleClick('${bundle.id}')">
        <div class="shop-bundle-header">
            <span class="shop-bundle-icon">${bundle.icon}</span>
            <div>
                <div class="shop-bundle-name">${bundle.name}</div>
                <div class="shop-bundle-desc">${bundle.desc}</div>
            </div>
        </div>
        <div class="shop-bundle-items">
            ${bundle.items.map(i => `
                <div class="shop-bundle-item ${_shopOwned.has(i.id) ? 'owned' : ''}">
                    <span>${i.icon}</span>
                    <span>${i.name}</span>
                    <span style="color:${_shopClassColor(i.class)};font-size:8px;">${_shopClassLabel(i.class)}</span>
                </div>`).join('')}
        </div>
        <div class="shop-bundle-footer">
            <div class="shop-bundle-pricing">
                <span class="shop-bundle-full-price">🪙 ${bundle.fullPrice}</span>
                <span class="shop-bundle-arrow">→</span>
                <span class="shop-bundle-price">🪙 ${bundle.bundlePrice}</span>
                <span class="shop-bundle-savings">Save ${bundle.savings}!</span>
            </div>
            ${allOwned
                ? `<div class="shop-item-owned">✓ All Owned</div>`
                : `<button class="shop-btn shop-btn-gold" style="font-size:9px;padding:6px 14px;"
                    ${someOwned ? 'title="Some items already owned — only unowned items will be purchased"' : ''}>
                    ${someOwned ? '⚡ Buy Remaining' : '📦 Buy Bundle'}
                  </button>`
            }
            ${pop > 0 ? `<div class="shop-item-pop" style="margin-top:6px;">🔥 ${pop} purchased</div>` : ''}
        </div>
    </div>`;
}

/* ═══════════════════ PURCHASE FLOW ═════════════════════════════ */
function _shopItemClick(id) {
    const item = SHOP_POOL.find(i => i.id === id);
    if (!item) return;
    playSfx('cardHover');

    if (_shopOwned.has(id)) { _shopToast('Already owned!', '✓'); return; }
    _shopShowConfirm({
        icon: item.icon,
        name: item.name,
        type: _shopClassLabel(item.class),
        typeColor: _shopClassColor(item.class),
        desc: item.desc,
        price: item.price,
        onConfirm: () => _shopDoPurchase(item),
    });
}

function _shopBundleClick(id) {
    const bundle = _shopDailyBundles().find(b => b.id === id);
    if (!bundle) return;
    playSfx('cardHover');

    const unowned = bundle.items.filter(i => !_shopOwned.has(i.id));
    if (!unowned.length) { _shopToast('You own everything in this bundle!', '✓'); return; }

    // If some items already owned, only charge for unowned at bundle ratio
    const effectivePrice = unowned.length === bundle.items.length
        ? bundle.bundlePrice
        : Math.floor(bundle.bundlePrice * (unowned.length / bundle.items.length));

    _shopShowConfirm({
        icon: bundle.icon,
        name: bundle.name,
        type: `Bundle · ${bundle.items.length} items`,
        typeColor: '#c8a460',
        desc: bundle.items.map(i => `${i.icon} ${i.name}`).join(' · '),
        price: effectivePrice,
        note: unowned.length < bundle.items.length
            ? `You already own ${bundle.items.length - unowned.length} item(s). Only unowned items will be added.`
            : `15% off — you save ${bundle.savings} 🪙`,
        onConfirm: () => {
            unowned.forEach(item => {
                _shopOwned.add(item.id);
                _shopHistory.unshift({ id:item.id, name:item.name, icon:item.icon,
                    class:item.class, price:Math.floor(effectivePrice/unowned.length),
                    purchasedAt:Date.now(), refunded:false });
            });
            _shopHistory = _shopHistory.slice(0, 8);
            _shopGold   -= effectivePrice;
            _shopIncrementPop(bundle.id);
            _shopSave();
            _shopUpdateCurrencyDisplay();
            _shopToast(`${bundle.name} purchased!`, '📦');
            document.getElementById('shop-confirm-modal')?.remove();
            _shopRefreshActive();
            _shopSyncOwned();
            playSfx('heal');
        },
    });
}

function _shopDoPurchase(item) {
    if (_shopGold < item.price) { _shopToast('Not enough Gold!', '❌'); return; }
    _shopOwned.add(item.id);
    _shopGold -= item.price;
    _shopHistory.unshift({
        id: item.id, name: item.name, icon: item.icon,
        class: item.class, price: item.price,
        purchasedAt: Date.now(), refunded: false,
    });
    _shopHistory = _shopHistory.slice(0, 8);
    _shopIncrementPop(item.id);
    _shopSave();
    _shopUpdateCurrencyDisplay();
    _shopToast(`${item.name} purchased!`, '✓');
    document.getElementById('shop-confirm-modal')?.remove();
    _shopRefreshActive();
    _shopSyncOwned();
    playSfx('heal');
}

/* ── Refund ── */
function _shopRefund(id) {
    const entry = _shopHistory.find(h => h.id === id && !h.refunded);
    if (!entry) return;
    const refundAmt = Math.floor(entry.price * 0.8);
    entry.refunded = true;
    _shopOwned.delete(id);
    _shopGold += refundAmt;
    _shopSave();
    _shopUpdateCurrencyDisplay();
    _shopToast(`Refunded ${refundAmt} 🪙`, '↩');
    _shopRenderHistory();
    _shopSyncOwned();
}

/* ── Sync owned list to Supabase ── */
async function _shopSyncOwned() {
    const sb  = window._supabase;
    const uid = window._syncedUid || (typeof _syncedUid !== 'undefined' ? _syncedUid : null);
    if (!sb || !uid) return;
    try {
        const ownedArr = [..._shopOwned].map(id => {
            const item = SHOP_POOL.find(i => i.id === id);
            return { item_id: id, item_name: item?.name || id };
        });
        await sb.from('shop_owned').upsert({ user_id: uid, owned: ownedArr }, { onConflict: 'user_id' });
    } catch(e) {}
}

/* ── Load owned from Supabase on login ── */
async function _shopLoadOwned() {
    const sb  = window._supabase;
    const uid = window._syncedUid || (typeof _syncedUid !== 'undefined' ? _syncedUid : null);
    if (!sb || !uid) return;
    try {
        const { data } = await sb.from('shop_owned').select('owned').eq('user_id', uid).maybeSingle();
        if (data?.owned) {
            data.owned.forEach(e => _shopOwned.add(e.item_id));
            _shopSave();
        }
    } catch(e) {}
}

/* ─────────────────── CONFIRM MODAL ─────────────────── */
function _shopShowConfirm({ icon, name, type, typeColor, desc, price, note, onConfirm }) {
    const canAfford = _shopGold >= price;
    let modal = document.getElementById('shop-confirm-modal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'shop-confirm-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.8);backdrop-filter:blur(5px);';
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    modal.innerHTML = `
        <div style="background:linear-gradient(160deg,#1a1005,#0d0800);border:1px solid rgba(140,95,25,.45);border-radius:12px;padding:30px 34px;max-width:380px;width:90%;font-family:'Cinzel',serif;color:#d4b878;text-align:center;position:relative;">
            <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${typeColor};border-radius:12px 12px 0 0;"></div>
            <button onclick="document.getElementById('shop-confirm-modal').remove()" style="position:absolute;top:12px;right:14px;background:none;border:none;color:#5a3a10;font-size:18px;cursor:pointer;">✕</button>
            <div style="font-size:52px;margin:10px 0 10px;">${icon}</div>
            <div style="font-size:15px;font-weight:bold;letter-spacing:1px;margin-bottom:3px;">${name}</div>
            <div style="font-size:8px;letter-spacing:3px;text-transform:uppercase;color:${typeColor};margin-bottom:10px;">${type}</div>
            <div style="font-family:'IM Fell English',serif;font-size:11px;color:rgba(200,160,80,.6);font-style:italic;margin-bottom:14px;line-height:1.5;">${desc}</div>
            ${note ? `<div style="font-size:9px;color:#6b8040;letter-spacing:1px;margin-bottom:10px;">${note}</div>` : ''}
            <div style="font-size:9px;color:#5a3a10;letter-spacing:2px;margin-bottom:4px;text-transform:uppercase;">Price</div>
            <div style="font-size:24px;font-weight:bold;color:#e8c87a;margin-bottom:4px;">🪙 ${price.toLocaleString()}</div>
            <div style="font-size:9px;color:${canAfford ? '#4a8040' : '#8b0000'};letter-spacing:1px;margin-bottom:20px;">Your balance: ${_shopGold.toLocaleString()} 🪙</div>
            ${canAfford
                ? `<div style="display:flex;gap:10px;justify-content:center;">
                    <button class="shop-btn shop-btn-gold" style="min-width:120px;" onclick="(${onConfirm.toString()})()">Purchase</button>
                    <button class="shop-btn" style="border-color:rgba(100,65,20,.35);color:#5a3a10;min-width:80px;" onclick="document.getElementById('shop-confirm-modal').remove()">Cancel</button>
                   </div>`
                : `<div style="font-family:'IM Fell English',serif;font-size:11px;color:rgba(180,60,60,.7);font-style:italic;margin-bottom:14px;">Not enough Gold to purchase this.</div>
                   <button class="shop-btn" style="border-color:rgba(100,65,20,.35);color:#5a3a10;" onclick="document.getElementById('shop-confirm-modal').remove()">Close</button>`
            }
        </div>`;
    document.body.appendChild(modal);
}

/* ─────────────────── HELPERS ─────────────────── */
function _shopRefreshActive() {
    if (_shopActiveTab === 'featured')  _shopRenderFeatured();
    if (_shopActiveTab === 'cosmetics') _shopRenderCosmetics(_shopActiveSub);
    if (_shopActiveTab === 'bundles')   _shopRenderBundles();
    if (_shopActiveTab === 'history')   _shopRenderHistory();
}

function _shopToast(msg, icon = '✓') {
    let t = document.getElementById('shop-toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'shop-toast';
        t.style.cssText = 'position:fixed;bottom:32px;left:50%;transform:translateX(-50%);z-index:99990;background:rgba(10,6,2,.96);border:1px solid rgba(140,95,25,.5);border-radius:999px;padding:8px 22px;font-family:\'Cinzel\',serif;font-size:11px;letter-spacing:1.5px;color:#c8a460;white-space:nowrap;box-shadow:0 4px 20px rgba(0,0,0,.7);opacity:0;transition:opacity .2s;pointer-events:none;display:flex;align-items:center;gap:8px;';
        document.body.appendChild(t);
    }
    t.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
    t.style.opacity = '1';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.opacity = '0'; }, 2500);
}

/* ── Sync popularity to Supabase before page unload ── */
window.addEventListener('beforeunload', _shopSyncPopularity);

/* ── Init ── */
window.addEventListener('DOMContentLoaded', () => {
    _shopLoad();
    _shopUpdateCurrencyDisplay();
});
