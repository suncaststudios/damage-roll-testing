
const CHANGELOG = [
    {
        version: 'v0.5.5b',
        name: 'Button Fix',
        desc: 'Fixed major bug where the main menu buttons did not work.'
    },
    {
        version: 'v0.5.5',
        name: 'Music Fix + .json Mod Buff',
        desc: 'Fixed music not being true 0%, and made 100% a bit louder. Also buffed what modders can do with the .json file.'
    },
    {
        version: 'v0.5.4',
        name: 'Intro + Achievement Reset Update',
        desc: 'New intro at the start of the game, can be disabled in settings. Achievements can now be reset (wipes local storage). Fixed Discord Rich Presence not clearing when the game is closed.'
    },
    {
        version: 'v0.5.3',
        name: 'Color Customization',
        desc: 'Update allows players to change color of game menus + ingame graphics. Minor bugfixes as well.'
    },
    {
        version: 'v0.5.2',
        name: 'Dev Logs',
        desc: 'Toggleable dev logs added to game. This update is a test to see if the auto update feature actually works (it did lmao).'
    },
    {
        version: 'v0.5.1',
        name: 'Graphics Overhaul +',
        desc: 'New graphics options: low, mid, and high quality settings. Auto-update added so you never need to redownload from itch.io. Bug fixes included.'
    },
    {
        version: 'v0.4.0',
        name: 'Medieval Madness Update',
        desc: 'New decks and cards added to the roster. Various bug fixes.'
    },
    {
        version: 'v0.3.1',
        name: 'QOL + Music Update',
        desc: 'Music upgraded, tons of new settings added, and a custom MP3 URL feature — use your own music in game.'
    }
];

(function renderChangelog() {
    const container = document.getElementById('cl-entries');
    if (!container) return;
    CHANGELOG.forEach(entry => {
        const div = document.createElement('div');
        div.className = 'cl-entry';
        div.innerHTML =
            '<div class="cl-version">' + entry.version + '</div>' +
            '<div class="cl-name">' + entry.name + '</div>' +
            '<div class="cl-desc">' + entry.desc + '</div>';
        container.appendChild(div);
    });
})();
