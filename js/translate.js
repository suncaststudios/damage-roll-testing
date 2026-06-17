/* ═══════════════════════════════════════════════════════════════════════
   AUTO-TRANSLATE SYSTEM
   Priority:
   1. window.translation API (Chrome 131+ with flag enabled)
   2. LibreTranslate public instance (free, no key needed)
   3. No-op (show original text)

   Usage:
     const result = await translateText('Hola mundo', 'es', 'en');
     // result → { text: 'Hello world', method: 'libretranslate' }

   Chat auto-translate:
     Each incoming message gets a 🌐 button. Clicking it translates
     inline and replaces the text. Translation is cached per message.
======================================================================= */

const LIBRETRANSLATE_URL = 'https://libretranslate.com/translate';
const _translateCache    = new Map();  // key: `${from}:${to}:${text}` → translated string

/* ── Core translate function ── */
async function translateText(text, fromLang, toLang) {
    if (!text || fromLang === toLang) return { text, method: 'none' };
    const cacheKey = `${fromLang}:${toLang}:${text}`;
    if (_translateCache.has(cacheKey)) {
        return { text: _translateCache.get(cacheKey), method: 'cache' };
    }

    // 1. Try Chrome Translation API
    if (window.translation?.createTranslator) {
        try {
            const translator = await window.translation.createTranslator({
                sourceLanguage: fromLang,
                targetLanguage: toLang,
            });
            const result = await translator.translate(text);
            _translateCache.set(cacheKey, result);
            return { text: result, method: 'chrome' };
        } catch(e) {
            // fall through
        }
    }

    // 2. LibreTranslate (free public instance, no key)
    try {
        const res = await fetch(LIBRETRANSLATE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                q:      text,
                source: fromLang === 'auto' ? 'auto' : fromLang,
                target: toLang,
                format: 'text',
            }),
        });
        if (res.ok) {
            const data = await res.json();
            if (data.translatedText) {
                _translateCache.set(cacheKey, data.translatedText);
                return { text: data.translatedText, method: 'libretranslate' };
            }
        }
    } catch(e) {
        // fall through
    }

    // 3. No-op fallback
    return { text, method: 'none' };
}

/* ── Detect the language of a string ── */
async function detectLanguage(text) {
    // Chrome API
    if (window.translation?.detectLanguage) {
        try {
            const result = await window.translation.detectLanguage(text);
            return result?.detectedLanguage || 'auto';
        } catch(e) {}
    }
    // LibreTranslate detect
    try {
        const res = await fetch('https://libretranslate.com/detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ q: text }),
        });
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data[0]?.language) return data[0].language;
        }
    } catch(e) {}
    return 'auto';
}

/* ── Translate a lobby chat message inline ── */
async function _lobbyTranslateMsg(msgEl, originalText) {
    const toLang   = window._currentLang || 'en';
    const btn      = msgEl.querySelector('.translate-btn');
    const textEl   = msgEl.querySelector('.lobby-chat-text');
    if (!textEl) return;

    if (btn) { btn.textContent = '⏳'; btn.disabled = true; }

    // Detect source language
    const fromLang = await detectLanguage(originalText);
    if (fromLang === toLang) {
        if (btn) { btn.textContent = '✓'; btn.title = 'Already in your language'; }
        return;
    }

    const { text, method } = await translateText(originalText, fromLang, toLang);

    if (method === 'none') {
        if (btn) { btn.textContent = '✗'; btn.title = 'Translation unavailable'; btn.disabled = false; }
        return;
    }

    // Store original for toggling back
    if (!msgEl.dataset.original) msgEl.dataset.original = originalText;
    msgEl.dataset.translated = text;
    msgEl.dataset.showingTranslation = 'true';

    textEl.textContent = text;
    textEl.style.fontStyle = 'italic';
    textEl.style.color = 'rgba(160,200,255,0.8)';

    if (btn) {
        btn.textContent = '🔁';
        btn.title = 'Show original';
        btn.disabled = false;
        btn.onclick = () => _lobbyToggleTranslation(msgEl);
    }
}

/* ── Toggle between translated and original ── */
function _lobbyToggleTranslation(msgEl) {
    const textEl  = msgEl.querySelector('.lobby-chat-text');
    if (!textEl) return;
    const showing = msgEl.dataset.showingTranslation === 'true';
    if (showing) {
        textEl.textContent = msgEl.dataset.original;
        textEl.style.fontStyle = '';
        textEl.style.color = '';
        msgEl.dataset.showingTranslation = 'false';
        const btn = msgEl.querySelector('.translate-btn');
        if (btn) { btn.textContent = '🌐'; btn.title = 'Translate'; }
    } else {
        textEl.textContent = msgEl.dataset.translated;
        textEl.style.fontStyle = 'italic';
        textEl.style.color = 'rgba(160,200,255,0.8)';
        msgEl.dataset.showingTranslation = 'true';
        const btn = msgEl.querySelector('.translate-btn');
        if (btn) { btn.textContent = '🔁'; btn.title = 'Show original'; }
    }
}

/* ── Build a translate button for a chat message ── */
function _makeTranslateBtn(msgEl, originalText) {
    const btn = document.createElement('button');
    btn.className   = 'translate-btn';
    btn.textContent = '🌐';
    btn.title       = 'Translate message';
    btn.style.cssText = `
        background:none; border:none; cursor:pointer;
        font-size:11px; padding:0 3px; opacity:0.4;
        transition:opacity 0.15s; flex-shrink:0; line-height:1;
    `;
    btn.onmouseenter = () => btn.style.opacity = '1';
    btn.onmouseleave = () => btn.style.opacity = '0.4';
    btn.onclick = () => _lobbyTranslateMsg(msgEl, originalText);
    return btn;
}

window._makeTranslateBtn    = _makeTranslateBtn;
window._lobbyTranslateMsg   = _lobbyTranslateMsg;
window.translateText        = translateText;
window.detectLanguage       = detectLanguage;
