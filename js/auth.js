/* AUTH SYSTEM
   Screens: 0=Login  1=Reg-credentials  2=Reg-identity  3=Reg-profile
   Preferences sidebar: status / save-login / MFA / gender / logout / delete
======================================================================= */

/* ── Temp signup data held between screens ── */
const _authDraft = {
    email:'', password:'',
    displayName:'', username:'', gender:'', 
    avatar:'⚔️', avatarImg:null,
    banner: null, bannerImg:null,
    bio:'', quote:'',
};

/* ── Navigate between auth screens ── */
function _authGoto(n) {
    [0,1,2,3].forEach(i => {
        const el = document.getElementById('auth-s'+i);
        if (el) el.style.display = i === n ? 'flex' : 'none';
        if (el && i === n) el.style.flexDirection = 'column';
    });
    // populate screen 3 grids on first visit
    if (n === 3) _authInitScreen3();
}

/* ── Show / hide auth wall ── */
function _showAuthWall(allowClose = true) {
    const w = document.getElementById('auth-wall');
    if (w) w.style.display = 'flex';
    // Show close button only when opened voluntarily (not after logout etc)
    const closeBtn = document.getElementById('auth-wall-close');
    if (closeBtn) closeBtn.style.display = allowClose ? 'block' : 'none';
    _authGoto(0);
}
function _hideAuthWall() {
    const w = document.getElementById('auth-wall');
    if (w) w.style.display = 'none';
}

/* ════════════════ SCREEN 0 — LOGIN ════════════════ */
async function _authLogin() {
    const sb  = window._supabase;
    const btn = document.getElementById('auth-login-btn');
    const err = document.getElementById('auth-login-err');
    const email = document.getElementById('auth-login-email')?.value.trim();
    const pass  = document.getElementById('auth-login-password')?.value;
    if (!email || !pass) { err.textContent = 'Please fill in both fields.'; return; }
    btn.disabled = true; btn.textContent = 'Logging in…'; err.textContent = '';
    try {
        const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
        if (error) { err.textContent = error.message; return; }
        await _authOnLogin(data.user);
    } catch(e) {
        err.textContent = 'Connection error — try again.';
    } finally {
        btn.disabled = false; btn.textContent = '⚔ Login';
    }
}

/* ════════════════ SCREEN 1 — CREDENTIALS ════════════════ */
function _authS1Next() {
    const err   = document.getElementById('auth-s1-err');
    const email = document.getElementById('auth-reg-email')?.value.trim();
    const email2= document.getElementById('auth-reg-email2')?.value.trim();
    const pass  = document.getElementById('auth-reg-pass')?.value;
    const pass2 = document.getElementById('auth-reg-pass2')?.value;
    err.textContent = '';
    if (!email || !email2 || !pass || !pass2) { err.textContent = 'All fields are required.'; return; }
    if (email !== email2) { err.textContent = 'Emails do not match.'; return; }
    if (pass.length < 8)  { err.textContent = 'Password must be at least 8 characters.'; return; }
    if (pass !== pass2)   { err.textContent = 'Passwords do not match.'; return; }
    _authDraft.email    = email;
    _authDraft.password = pass;
    // Pre-fill username with random name
    const unEl = document.getElementById('auth-username');
    if (unEl && !unEl.value) unEl.value = _genRandomUsername();
    _authGoto(2);
}

/* ════════════════ SCREEN 2 — IDENTITY ════════════════ */
function _authS2Next() {
    const err     = document.getElementById('auth-s2-err');
    const dname   = document.getElementById('auth-display-name')?.value.trim();
    const uname   = document.getElementById('auth-username')?.value.trim();
    const dobVal  = document.getElementById('auth-dob')?.value;
    const gender  = document.getElementById('auth-gender')?.value;
    err.textContent = '';
    if (!dname) { err.textContent = 'Display name is required.'; return; }
    if (!dobVal) { err.textContent = 'Date of birth is required.'; return; }
    // Age check — must be 13+
    const dob  = new Date(dobVal);
    const now  = new Date();
    const age  = (now - dob) / (1000 * 60 * 60 * 24 * 365.25);
    if (age < 13) {
        err.textContent = 'You must be at least 13 years old to create an account.';
        return;
    }
    _authDraft.displayName = dname;
    _authDraft.username    = uname || _genRandomUsername();
    _authDraft.gender      = gender;
    // DOB is NOT stored — only used for age check
    _authGoto(3);
}

/* ════════════════ SCREEN 3 — PROFILE ════════════════ */
function _authInitScreen3() {
    // Avatar grid
    const ag = document.getElementById('auth-avatar-grid');
    if (ag && !ag.dataset.built) {
        ag.dataset.built = '1';
        ag.innerHTML = PROFILE_AVATARS.map(a =>
            `<button class="auth-avatar-opt${_authDraft.avatar===a?' sel':''}"
                onclick="_authPickAvatar('${a}')">${a}</button>`
        ).join('');
    }
    // Banner grid
    const bg = document.getElementById('auth-banner-grid');
    if (bg && !bg.dataset.built) {
        bg.dataset.built = '1';
        bg.innerHTML = PROFILE_BANNERS.map((b,i) =>
            `<button class="auth-banner-opt${i===0?' sel':''}"
                style="background:${b};"
                onclick="_authPickBanner(${i})"></button>`
        ).join('');
        _authDraft.banner = PROFILE_BANNERS[0];
        _authRefreshBannerPreview();
    }
    // Quote live preview — only show when typing
    const quoteEl = document.getElementById('auth-quote');
    if (quoteEl) {
        quoteEl.addEventListener('input', () => {
            const prev = document.getElementById('auth-quote-preview');
            if (!prev) return;
            if (quoteEl.value.trim()) {
                prev.textContent  = quoteEl.value;
                prev.style.display = '';
            } else {
                prev.style.display = 'none';
            }
        });
    }
}

function _authPickAvatar(emoji) {
    _authDraft.avatar    = emoji;
    _authDraft.avatarImg = null;
    const prev = document.getElementById('auth-avatar-preview');
    if (prev) prev.textContent = emoji;
    document.querySelectorAll('.auth-avatar-opt').forEach(b =>
        b.classList.toggle('sel', b.textContent === emoji));
}

function _authPickBanner(i) {
    _authDraft.banner    = PROFILE_BANNERS[i];
    _authDraft.bannerImg = null;
    _authRefreshBannerPreview();
    document.querySelectorAll('.auth-banner-opt').forEach((b,j) =>
        b.classList.toggle('sel', j === i));
}

function _authRefreshBannerPreview() {
    const prev = document.getElementById('auth-banner-preview');
    if (!prev) return;
    if (_authDraft.bannerImg) {
        prev.style.background = 'none';
        prev.style.backgroundImage = `url(${_authDraft.bannerImg})`;
        prev.style.backgroundSize = 'cover';
        prev.style.backgroundPosition = 'center';
    } else {
        prev.style.backgroundImage = '';
        prev.style.background = _authDraft.banner || PROFILE_BANNERS[0];
    }
}

function _authAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => {
        _authDraft.avatarImg = ev.target.result;
        _authDraft.avatar    = '📷';
        const prev = document.getElementById('auth-avatar-preview');
        if (prev) prev.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        document.querySelectorAll('.auth-avatar-opt').forEach(b => b.classList.remove('sel'));
    };
    reader.readAsDataURL(file);
}

function _authBannerUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => {
        _authDraft.bannerImg = ev.target.result;
        _authRefreshBannerPreview();
        document.querySelectorAll('.auth-banner-opt').forEach(b => b.classList.remove('sel'));
    };
    reader.readAsDataURL(file);
}

async function _authCreateProfile() {
    const sb  = window._supabase;
    const btn = document.getElementById('auth-create-btn');
    const err = document.getElementById('auth-s3-err');
    err.textContent = '';
    _authDraft.bio   = document.getElementById('auth-bio')?.value.trim()   || '';
    _authDraft.quote = document.getElementById('auth-quote')?.value.trim() || '';
    btn.disabled = true; btn.textContent = 'Creating account…';
    try {
        // 1. Create auth account
        const { data: authData, error: authErr } = await sb.auth.signUp({
            email:    _authDraft.email,
            password: _authDraft.password,
        });
        if (authErr) { err.textContent = authErr.message; return; }
        const uid = authData.user?.id;
        if (!uid) { err.textContent = 'Account created but no user ID returned. Try logging in.'; return; }
        // 2. Insert profile row
        const { error: profErr } = await sb.from('profiles').insert({
            id:            uid,
            username:      _authDraft.username,
            avatar:        _authDraft.avatar,
            avatar_img:    _authDraft.avatarImg || '',
            banner_img:    _authDraft.bannerImg || '',
            bio:           _authDraft.bio,
            quote:         _authDraft.quote,
            gender:        _authDraft.gender,
            online_status: 'online',
        });
        if (profErr) {
            // Profile insert failed but auth account was created — still let them in
            // They can fill in profile details later
            console.warn('[DR Auth] profile insert failed (non-fatal):', profErr.message);
        }
        // 3. Save banner pref locally
        _profileData.banner    = _authDraft.banner    || PROFILE_BANNERS[0];
        _profileData.bannerImg = _authDraft.bannerImg || null;
        await _authOnLogin(authData.user);
    } catch(e) {
        if (e.message?.includes('fetch') || e.message?.includes('network') || e.message?.includes('NetworkError')) {
            err.textContent = 'Connection failed — check your internet and try again.';
        } else {
            err.textContent = 'Error — ' + e.message;
        }
        console.error('[DR Auth] createProfile error', e);
    } finally {
        btn.disabled = false; btn.textContent = '✦ Create Account';
    }
}

/* ════════════════ AFTER LOGIN ════════════════ */
async function _authOnLogin(user) {
    if (!user) return;
    _syncedUid = user.id;
    // Persist session preference
    const saveLogin = localStorage.getItem('dr_save_login') === '1';
    if (!saveLogin) {
        // Will auto-expire when tab closes (Supabase default is localStorage,
        // we override by clearing on page load if save-login is off)
    }
    // Load profile from DB
    await _fetchProfileByUid(user.id);
    _profileData._isSetup = true;
    saveProfileData();
    _hideAuthWall();
    _updateCornerBtn();
    _renderProfileView();
    if (typeof updateClubTitle === 'function') updateClubTitle();
    _updateStartScreen();
    // Fire any pending gate fn (e.g. player tried to go online)
    const pending = window._afterProfileFn;
    window._afterProfileFn = null;
    if (pending) pending();
}

/* ════════════════ FETCH PROFILE FROM DB ════════════════ */
async function _fetchProfileByUid(uid, silent = false) {
    const sb = window._supabase;
    if (!sb || !uid) return;
    try {
        const { data, error } = await sb.from('profiles').select('*').eq('id', uid).maybeSingle();
        if (error || !data) return;
        // Merge DB data into local _profileData
        _profileData.username    = data.username    || _profileData.username;
        _profileData.avatar      = data.avatar      || _profileData.avatar;
        _profileData.avatarImg   = data.avatar_img  || null;
        _profileData.bannerImg   = data.banner_img  || null;
        _profileData.bio         = data.bio         || '';
        _profileData.quote       = data.quote       || '';
        _profileData.gender      = data.gender      || '';
        _profileData.onlineStatus= data.online_status || 'online';
        _profileData._isSetup    = true;
        saveProfileData();
        _updateCornerBtn();
        _renderProfileView();
    } catch(e) {
        if (!silent) console.warn('[DR Auth] _fetchProfileByUid error', e);
    }
}

/* ════════════════ STARTUP AUTH CHECK ════════════════ */
async function _authStartupCheck() {
    // Silently restore an existing session — never force the auth wall on startup.
    // The wall is only shown when the player clicks the profile button while logged out.
    const sb = window._supabase;
    if (!sb) return; // Supabase not configured yet — game runs in guest mode
    try {
        const { data: { session } } = await sb.auth.getSession();
        if (session?.user) {
            const saveLogin = localStorage.getItem('dr_save_login') === '1';
            const tabSession = sessionStorage.getItem('dr_tab_session');
            if (!saveLogin && !tabSession) {
                // Save-login is off and this is a fresh tab — sign out silently
                await sb.auth.signOut();
                return;
            }
            sessionStorage.setItem('dr_tab_session', '1');
            await _authOnLogin(session.user);
        }
        // No session — game runs as guest, no wall shown
    } catch(e) {
        console.warn('[DR Auth] startup check error', e);
    }
}

/* ════════════════ PREFERENCES SIDEBAR ════════════════ */
function openPrefSidebar() {
    playSfx('menuClick');
    // Move sidebar into menu-profile if not already there
    const sidebar  = document.getElementById('pref-sidebar');
    const profMenu = document.getElementById('menu-profile');
    if (sidebar && profMenu && sidebar.parentElement !== profMenu) {
        profMenu.appendChild(sidebar);
    }
    // Refresh state
    _prefRefreshStatus();
    _prefRefreshSaveLogin();
    _prefRefreshGenderCooldown();
    if (sidebar) sidebar.style.display = 'flex';
}

function closePrefSidebar() {
    const s = document.getElementById('pref-sidebar');
    if (s) s.style.display = 'none';
}

function _prefRefreshStatus() {
    const status = _profileData.onlineStatus || 'online';
    ['online','offline','dnd'].forEach(s => {
        const btn = document.getElementById('pref-st-' + s);
        if (!btn) return;
        btn.className = 'pref-status-btn' + (status === s ? ' active-' + s : '');
    });
}

function _prefRefreshSaveLogin() {
    const toggle = document.getElementById('pref-save-login');
    if (toggle) toggle.checked = localStorage.getItem('dr_save_login') === '1';
}

function _prefRefreshGenderCooldown() {
    const msg = document.getElementById('pref-gender-cooldown-msg');
    const btn = document.getElementById('pref-gender-btn');
    if (!msg || !btn) return;
    const lastChanged = _profileData.genderChangedAt;
    if (lastChanged) {
        const diff  = Date.now() - new Date(lastChanged).getTime();
        const week  = 7 * 24 * 60 * 60 * 1000;
        const left  = week - diff;
        if (left > 0) {
            const days = Math.ceil(left / (1000 * 60 * 60 * 24));
            msg.textContent = `Available in ${days} day${days!==1?'s':''}`;
            btn.disabled = true;
            return;
        }
    }
    msg.textContent = '';
    btn.disabled = false;
}

function _setPrefStatus(status) {
    _profileData.onlineStatus = status;
    saveProfileData();
    _prefRefreshStatus();
    // Debounced DB write — only fires once per 3s no matter how fast they click
    clearTimeout(window._statusWriteTimer);
    window._statusWriteTimer = setTimeout(() => {
        const sb = window._supabase;
        if (sb && _syncedUid) {
            sb.from('profiles').update({ online_status: status })
              .eq('id', _syncedUid).then(() => {});
        }
    }, 3000);
}

function _toggleSaveLogin(on) {
    localStorage.setItem('dr_save_login', on ? '1' : '0');
    if (on) sessionStorage.setItem('dr_tab_session', '1');
}

/* MFA */
async function _toggleMFA(on) {
    const sb = window._supabase;
    if (!sb) return;
    if (on) {
        try {
            const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp' });
            if (error) { alert('MFA setup failed: ' + error.message); document.getElementById('pref-mfa-toggle').checked = false; return; }
            const qrDiv    = document.getElementById('pref-mfa-qr');
            const qrImg    = document.getElementById('pref-mfa-qr-img');
            const secretEl = document.getElementById('pref-mfa-secret');
            if (qrDiv) qrDiv.style.display = 'flex';
            if (qrImg) qrImg.innerHTML = `<img src="${data.totp.qr_code}" style="width:140px;height:140px;border-radius:6px;">`;
            if (secretEl) secretEl.textContent = 'Secret: ' + data.totp.secret;
            window._mfaFactorId = data.id;
        } catch(e) { alert('MFA error: ' + e.message); }
    } else {
        // Unenroll
        try {
            const { data: factors } = await sb.auth.mfa.listFactors();
            for (const f of factors?.totp || []) {
                await sb.auth.mfa.unenroll({ factorId: f.id });
            }
            const qrDiv = document.getElementById('pref-mfa-qr');
            if (qrDiv) qrDiv.style.display = 'none';
        } catch(e) { console.warn('[DR Auth] MFA unenroll error', e); }
    }
}

async function _confirmMFA() {
    const sb   = window._supabase;
    const code = document.getElementById('pref-mfa-code')?.value.trim();
    const err  = document.getElementById('pref-mfa-err');
    if (!code || code.length !== 6) { if (err) err.textContent = 'Enter the 6-digit code.'; return; }
    try {
        const { data: challengeData } = await sb.auth.mfa.challenge({ factorId: window._mfaFactorId });
        const { error } = await sb.auth.mfa.verify({
            factorId:    window._mfaFactorId,
            challengeId: challengeData.id,
            code,
        });
        if (error) { if (err) err.textContent = error.message; return; }
        if (err) err.textContent = '';
        const qrDiv = document.getElementById('pref-mfa-qr');
        if (qrDiv) qrDiv.style.display = 'none';
        alert('Two-factor authentication enabled!');
    } catch(e) {
        if (err) err.textContent = 'Verification failed.';
    }
}

/* Gender change */
function _prefChangeGender() {
    const box = document.getElementById('pref-gender-confirm');
    if (box) box.classList.add('show');
}

async function _prefDoGenderChange() {
    const sb     = window._supabase;
    const newVal = document.getElementById('pref-gender-new')?.value;
    const box    = document.getElementById('pref-gender-confirm');
    if (box) box.classList.remove('show');
    _profileData.gender          = newVal;
    _profileData.genderChangedAt = new Date().toISOString();
    saveProfileData();
    _prefRefreshGenderCooldown();
    if (sb && _syncedUid) {
        await sb.from('profiles').update({
            gender:             newVal,
            gender_changed_at:  _profileData.genderChangedAt,
        }).eq('id', _syncedUid);
    }
}

/* Logout */
async function _prefLogout() {
    const sb = window._supabase;
    closePrefSidebar();
    toggle('menu-profile', false);
    sessionStorage.removeItem('dr_tab_session');
    _syncedUid   = null;
    _profileData._isSetup = false;
    if (sb) await sb.auth.signOut();
    _updateStartScreen();
    _showAuthWall();
}

/* Delete account */
function _prefDeleteAccountPrompt() {
    const box = document.getElementById('pref-delete-confirm');
    if (box) box.classList.add('show');
}

function _prefDeleteAccountFinal() {
    const passInput = document.getElementById('pref-delete-password');
    const finalBtn  = document.getElementById('pref-delete-final-btn');
    if (passInput) passInput.style.display = 'block';
    if (finalBtn)  finalBtn.style.display  = 'block';
}

async function _prefDeleteFinal() {
    const sb   = window._supabase;
    const pass = document.getElementById('pref-delete-password')?.value;
    const err  = document.getElementById('pref-delete-err');
    if (!pass) { if (err) err.textContent = 'Enter your password.'; return; }
    if (!sb || !_syncedUid) return;
    try {
        // Re-authenticate first
        const { data: { user } } = await sb.auth.getUser();
        const { error: signInErr } = await sb.auth.signInWithPassword({
            email:    user.email,
            password: pass,
        });
        if (signInErr) { if (err) err.textContent = 'Wrong password.'; return; }
        // Delete profile row
        await sb.from('profiles').delete().eq('id', _syncedUid);
        // Delete auth user (requires service role in production — flag for now)
        await sb.auth.admin?.deleteUser?.(_syncedUid);
        await sb.auth.signOut();
        _syncedUid = null;
        _profileData._isSetup = false;
        sessionStorage.removeItem('dr_tab_session');
        localStorage.removeItem(PROFILE_KEY);
        closePrefSidebar();
        toggle('menu-profile', false);
        _showAuthWall();
    } catch(e) {
        if (err) err.textContent = 'Delete failed — ' + e.message;
    }
}

/* ═══════════════════════════════ END AUTH SYSTEM ═══════════════════════════════════════ */
