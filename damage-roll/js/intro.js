(function () {
    
    if (localStorage.getItem('dr_intro_done') === '1') {
        const ov = document.getElementById('intro-overlay');
        if (ov) { ov.style.display = 'none'; ov.remove(); }
        return;
    }

    
    window._introMusicSuppressed = true;

    const overlay = document.getElementById('intro-overlay');
    const stages  = [
        document.getElementById('intro-s1'),
        document.getElementById('intro-s2'),
        document.getElementById('intro-s3'),
        document.getElementById('intro-s4'),
    ];
    const hint = document.getElementById('intro-hint');
    const DURATIONS = [2800, 7000, 9000, 3500];

    let current = 0;
    let autoTimer = null;
    let transitioning = false;

    function releaseMusic() {
        window._introMusicSuppressed = false;
        try { if (typeof startMenuAudio === 'function') startMenuAudio(); } catch(e) {}
    }

    function dismiss() {
        clearTimeout(autoTimer);
        overlay.style.transition = 'opacity 0.85s ease';
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.remove();
            releaseMusic();
            // Fire main menu entrance animation
            const mm = document.getElementById('menu-main');
            if (mm) {
                mm.classList.remove('screen-visible-main');
                void mm.offsetWidth;
                mm.classList.add('screen-visible-main');
            }
        }, 900);
    }

    function nextStage() {
        if (transitioning) return;
        transitioning = true;
        clearTimeout(autoTimer);

        stages[current].style.opacity = '0';
        current++;

        if (current >= stages.length) {
            hint.style.opacity = '0';
            setTimeout(dismiss, 600);
            return;
        }

        setTimeout(() => {
            stages[current].style.opacity = '1';
            transitioning = false;
            if (current === stages.length - 1) hint.textContent = 'Click anywhere to continue';
            autoTimer = setTimeout(nextStage, DURATIONS[current]);
        }, 850);
    }

    overlay.addEventListener('click', () => {
        if (current >= stages.length - 1) { dismiss(); return; }
        nextStage();
    });

    setTimeout(() => {
        stages[0].style.opacity = '1';
        transitioning = false;
        autoTimer = setTimeout(nextStage, DURATIONS[0]);
    }, 350);
})();
