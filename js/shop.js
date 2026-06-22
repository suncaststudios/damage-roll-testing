/* ═══════════════════════════════════════════════════════════════
   SHOP  —  Arcane Emporium
   Tabs: Featured · Cosmetics · Bundles · Currency · History
   Currencies: Gold (earned in-game) · Gems (future premium)
================================================================ */

/* ── Currency state ── */
let _shopGold = 0;
let _shopGems = 0;

/* ── Load currency from localStorage ── */
function _shopLoadCurrency() {
    try {
        _shopGold = parseInt(localStorage.getItem('dr_shop_gold') || '0', 10) || 0;
        _shopGems = parseInt(localStorage.getItem('dr_shop_gems') || '0', 10) || 0;
    } catch(e) {}
}

function _shopSaveCurrency() {
    try {
        localStorage.setItem('dr_shop_gold', String(_shopGold));
        localStorage.setItem('dr_shop_gems', String(_shopGems));
    } catch(e) {}
}

/* ── Called from game on win / chain / etc ── */
function shopAwardGold(amount) {
    _shopLoadCurrency();
    _shopGold = Math.max(0, _shopGold + amount);
    _shopSaveCurrency();
    _shopUpdateCurrencyDisplay();
}

/* ── Open shop ── */
function openShop() {
    _shopLoadCurrency();
    toggle('menu-shop', true);
    switchShopTab('featured');
    _shopUpdateCurrencyDisplay();
}

/* ── Update currency display ── */
function _shopUpdateCurrencyDisplay() {
    const goldEl = document.getElementById('shop-gold-amt');
    const gemEl  = document.getElementById('shop-gem-amt');
    if (goldEl) goldEl.textContent = _shopGold.toLocaleString();
    if (gemEl)  gemEl.textContent  = _shopGems.toLocaleString();
}

/* ── Tab switching ── */
function switchShopTab(id) {
    document.querySelectorAll('.shop-tab').forEach(t =>
        t.classList.toggle('active', t.dataset.tab === id));
    document.querySelectorAll('.shop-panel').forEach(p =>
        p.classList.toggle('active', p.id === 'shop-panel-' + id));
    playSfx('menuClick');

    // Lazy-render panels
    if (id === 'featured')  _shopRenderFeatured();
    if (id === 'cosmetics') _shopRenderCosmetics('all');
    if (id === 'bundles')   _shopRenderBundles();
}

/* ── Featured tab ── */
function _shopRenderFeatured() {
    const grid  = document.getElementById('shop-grid-featured');
    const empty = document.getElementById('shop-empty-featured');
    if (!grid) return;
    // No live items yet — show empty state
    grid.innerHTML = '';
    if (empty) empty.style.display = 'flex';
}

/* ── Cosmetics tab ── */
const _COSMETIC_PLACEHOLDER = [
    // These are preview / placeholder entries shown before real items are added.
    // Remove or replace when real cosmetics are ready.
    { id:'hat_crown',   name:'Iron Crown',      icon:'👑',  type:'hat',      rarity:'legendary', price:800,  currency:'gold' },
    { id:'hat_wizard',  name:'Arcane Cap',       icon:'🧙',  type:'hat',      rarity:'rare',      price:350,  currency:'gold' },
    { id:'hat_jester',  name:"Fool's Bell",      icon:'🃏',  type:'hat',      rarity:'uncommon',  price:150,  currency:'gold' },
    { id:'aura_fire',   name:'Ember Aura',       icon:'🔥',  type:'aura',     rarity:'epic',      price:600,  currency:'gold' },
    { id:'aura_ice',    name:'Frost Aura',       icon:'❄️',  type:'aura',     rarity:'rare',      price:400,  currency:'gold' },
    { id:'aura_shadow', name:'Shadow Veil',      icon:'🌑',  type:'aura',     rarity:'legendary', price:1200, currency:'gems' },
    { id:'mat_gold',    name:'Gilded Material',  icon:'✨',  type:'material', rarity:'epic',      price:500,  currency:'gold' },
    { id:'mat_bone',    name:'Bone Material',    icon:'🦴',  type:'material', rarity:'rare',      price:300,  currency:'gold' },
    { id:'trail_flame', name:'Flame Trail',      icon:'🌋',  type:'trail',    rarity:'legendary', price:1500, currency:'gems' },
    { id:'trail_rune',  name:'Rune Trail',       icon:'ᚠ',   type:'trail',    rarity:'epic',      price:700,  currency:'gold' },
    { id:'back_skull',  name:'Skull Back',       icon:'💀',  type:'back',     rarity:'rare',      price:250,  currency:'gold' },
    { id:'back_rune',   name:'Elder Rune Back',  icon:'ᛟ',   type:'back',     rarity:'epic',      price:550,  currency:'gold' },
];

let _shopCosmeticFilter = 'all';

function filterShopCosmetics(filter, btnEl) {
    _shopCosmeticFilter = filter;
    document.querySelectorAll('.shop-filter').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    _shopRenderCosmetics(filter);
}

function _shopRenderCosmetics(filter) {
    const grid  = document.getElementById('shop-grid-cosmetics');
    const empty = document.getElementById('shop-empty-cosmetics');
    if (!grid) return;

    const typeMap = { hats:'hat', auras:'aura', materials:'material', trails:'trail', backs:'back' };
    const filterType = typeMap[filter] || null;
    const items = filterType
        ? _COSMETIC_PLACEHOLDER.filter(c => c.type === filterType)
        : _COSMETIC_PLACEHOLDER;

    if (!items.length) {
        grid.innerHTML = '';
        if (empty) empty.style.display = 'flex';
        return;
    }
    if (empty) empty.style.display = 'none';

    const owned = _shopGetOwned();
    grid.innerHTML = items.map(item => {
        const isOwned = owned.has(item.id);
        const priceIcon = item.currency === 'gems' ? '💎' : '🪙';
        return `
        <div class="shop-item" onclick="_shopItemClick('${item.id}')">
            <div class="shop-item-rarity-bar ${item.rarity}"></div>
            <div class="shop-item-icon">${item.icon}</div>
            <div class="shop-item-name">${item.name}</div>
            <div class="shop-item-type">${_shopTypeLabel(item.type)}</div>
            ${isOwned
                ? `<div class="shop-item-owned">✓ Owned</div>`
                : `<div class="shop-item-price">${priceIcon} ${item.price.toLocaleString()}</div>`
            }
        </div>`;
    }).join('');
}

function _shopTypeLabel(type) {
    return { hat:'Hat', aura:'Aura', material:'Material', trail:'Trail', back:'Card Back' }[type] || type;
}

function _shopGetOwned() {
    try {
        return new Set(JSON.parse(localStorage.getItem('dr_shop_owned') || '[]'));
    } catch(e) { return new Set(); }
}

function _shopSetOwned(set) {
    try { localStorage.setItem('dr_shop_owned', JSON.stringify([...set])); } catch(e) {}
}

/* ── Item click → purchase modal ── */
function _shopItemClick(id) {
    const item = _COSMETIC_PLACEHOLDER.find(c => c.id === id);
    if (!item) return;
    playSfx('cardHover');

    const owned = _shopGetOwned();
    if (owned.has(id)) {
        _shopShowToast('Already owned!', '✓');
        return;
    }

    _shopLoadCurrency();
    const balance = item.currency === 'gems' ? _shopGems : _shopGold;
    const canAfford = balance >= item.price;
    const priceIcon = item.currency === 'gems' ? '💎' : '🪙';
    const balLabel = item.currency === 'gems'
        ? `${_shopGems.toLocaleString()} 💎`
        : `${_shopGold.toLocaleString()} 🪙`;

    // Build confirm modal
    let modal = document.getElementById('shop-confirm-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'shop-confirm-modal';
        modal.style.cssText = `
            position:fixed;inset:0;z-index:9500;
            display:flex;align-items:center;justify-content:center;
            background:rgba(0,0,0,0.78);backdrop-filter:blur(5px);
        `;
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
        document.body.appendChild(modal);
    }

    modal.style.display = 'flex';
    modal.innerHTML = `
        <div style="
            background:linear-gradient(160deg,#1a1005 0%,#0d0800 100%);
            border:1px solid rgba(140,95,25,0.45);border-radius:12px;
            padding:30px 34px;max-width:360px;width:90%;
            box-shadow:0 8px 48px rgba(0,0,0,0.85);
            font-family:'Cinzel',serif;color:#d4b878;
            text-align:center;position:relative;
        ">
            <div class="shop-item-rarity-bar ${item.rarity}" style="position:absolute;top:0;left:0;right:0;border-radius:12px 12px 0 0;"></div>
            <div style="font-size:52px;margin:8px 0 10px;">${item.icon}</div>
            <div style="font-size:15px;font-weight:bold;letter-spacing:1px;margin-bottom:4px;">${item.name}</div>
            <div style="font-size:8px;letter-spacing:3px;text-transform:uppercase;color:#5a3a10;margin-bottom:18px;">${_shopTypeLabel(item.type)} · ${item.rarity}</div>
            <div style="font-size:11px;color:#7a5a30;margin-bottom:6px;">PRICE</div>
            <div style="font-size:22px;font-weight:bold;color:#e8c87a;margin-bottom:4px;">${priceIcon} ${item.price.toLocaleString()}</div>
            <div style="font-size:9px;color:${canAfford?'#4a8040':'#8b0000'};letter-spacing:1px;margin-bottom:20px;">
                Your balance: ${balLabel}
            </div>
            ${canAfford ? `
                <div style="display:flex;gap:10px;justify-content:center;">
                    <button class="shop-btn shop-btn-gold" style="min-width:110px;"
                        onclick="_shopConfirmPurchase('${id}')">Purchase</button>
                    <button class="shop-btn" style="border-color:rgba(100,65,20,0.35);color:#5a3a10;min-width:80px;"
                        onclick="document.getElementById('shop-confirm-modal').remove()">Cancel</button>
                </div>
            ` : `
                <div style="font-family:'IM Fell English',serif;font-size:11px;color:rgba(180,60,60,0.7);font-style:italic;margin-bottom:14px;">
                    Not enough ${item.currency === 'gems' ? 'Gems' : 'Gold'} to purchase this item.
                </div>
                <button class="shop-btn" style="border-color:rgba(100,65,20,0.35);color:#5a3a10;"
                    onclick="document.getElementById('shop-confirm-modal').remove()">Close</button>
            `}
        </div>
    `;
}

function _shopConfirmPurchase(id) {
    const item = _COSMETIC_PLACEHOLDER.find(c => c.id === id);
    if (!item) return;
    _shopLoadCurrency();

    if (item.currency === 'gems') {
        if (_shopGems < item.price) { _shopShowToast('Not enough Gems', '❌'); return; }
        _shopGems -= item.price;
    } else {
        if (_shopGold < item.price) { _shopShowToast('Not enough Gold', '❌'); return; }
        _shopGold -= item.price;
    }
    _shopSaveCurrency();

    const owned = _shopGetOwned();
    owned.add(id);
    _shopSetOwned(owned);

    document.getElementById('shop-confirm-modal')?.remove();
    _shopUpdateCurrencyDisplay();
    _shopShowToast(`${item.name} purchased!`, '✓');
    playSfx('heal');

    // Re-render current cosmetics panel if open
    if (_shopCosmeticFilter !== undefined) _shopRenderCosmetics(_shopCosmeticFilter);
}

/* ── Bundles ── */
function _shopRenderBundles() {
    const grid  = document.getElementById('shop-grid-bundles');
    const empty = document.getElementById('shop-empty-bundles');
    if (!grid) return;
    grid.innerHTML = '';
    if (empty) empty.style.display = 'flex';
}

/* ── Toast notification ── */
function _shopShowToast(msg, icon = '✓') {
    let toast = document.getElementById('shop-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'shop-toast';
        toast.style.cssText = `
            position:fixed;bottom:32px;left:50%;transform:translateX(-50%);
            z-index:99990;
            background:rgba(10,6,2,0.96);
            border:1px solid rgba(140,95,25,0.5);
            border-radius:999px;padding:8px 22px;
            font-family:'Cinzel',serif;font-size:11px;letter-spacing:1.5px;
            color:#c8a460;white-space:nowrap;
            box-shadow:0 4px 20px rgba(0,0,0,0.7);
            opacity:0;transition:opacity 0.2s;pointer-events:none;
            display:flex;align-items:center;gap:8px;
        `;
        document.body.appendChild(toast);
    }
    toast.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
    toast.style.opacity = '1';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

/* ── Init on load ── */
window.addEventListener('DOMContentLoaded', () => {
    _shopLoadCurrency();
    _shopUpdateCurrencyDisplay();
});
