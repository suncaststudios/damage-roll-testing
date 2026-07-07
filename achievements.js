const ACHIEVEMENTS = [
    
    { id:'first_blood',     icon:'🩸', name:'First Blood',         desc:'Win your first battle.',                                          rarity:'common',    secret:false },
    { id:'veteran',         icon:'⚔️', name:'Veteran',             desc:'Win 10 battles.',                                                 rarity:'uncommon',  secret:false },
    { id:'warlord',         icon:'🗡️', name:'Warlord',             desc:'Win 50 battles.',                                                 rarity:'rare',      secret:false },
    { id:'legend',          icon:'👑', name:'Legend',              desc:'Win 100 battles.',                                                rarity:'epic',      secret:false },
    { id:'unstoppable',     icon:'💎', name:'Unstoppable',         desc:'Win 250 battles.',                                                rarity:'legendary', secret:false },
    { id:'first_loss',      icon:'💀', name:'Baptism of Fire',     desc:'Lose your first battle.',                                         rarity:'common',    secret:false },
    { id:'comeback',        icon:'🔄', name:'From the Ashes',      desc:'Win a battle after dropping below 15 HP.',                        rarity:'rare',      secret:false },
    { id:'flawless',        icon:'✨', name:'Untouchable',         desc:'Win without dropping below 50 HP.',                               rarity:'epic',      secret:false },
    { id:'close_call',      icon:'😰', name:'Hair\'s Breadth',     desc:'Win with 1–3 HP remaining.',                                     rarity:'rare',      secret:false },
    { id:'massacre',        icon:'🔥', name:'Massacre',            desc:'Deal 30+ damage in a single turn.',                               rarity:'uncommon',  secret:false },
    { id:'overkill',        icon:'💥', name:'Overkill',            desc:'Deal 50+ damage in a single hit.',                                rarity:'epic',      secret:false },
    { id:'annihilator',     icon:'☄️', name:'Annihilator',        desc:'Win a battle dealing 200+ total damage.',                         rarity:'legendary', secret:false },

    
    { id:'first_crit',      icon:'🎲', name:'Lucky Roll',          desc:'Roll your first Critical.',                                       rarity:'common',    secret:false },
    { id:'crit_streak',     icon:'🎯', name:'Loaded Dice',         desc:'Roll 3 Crits in a single chain.',                                 rarity:'uncommon',  secret:false },
    { id:'crit_50',         icon:'🎰', name:'Fortune\'s Favourite', desc:'Roll 50 total Crits.',                                           rarity:'rare',      secret:false },
    { id:'first_fail',      icon:'💫', name:'Murphy\'s Law',        desc:'Roll your first Fail.',                                          rarity:'common',    secret:false },
    { id:'fail_10',         icon:'🪦', name:'Cursed Bones',        desc:'Roll 10 Fails in a single session.',                              rarity:'uncommon',  secret:false },
    { id:'no_fail',         icon:'🍀', name:'Blessed',             desc:'Win a battle without rolling a single Fail.',                     rarity:'rare',      secret:false },
    { id:'crit_chain_3',    icon:'⛓️', name:'Chain Reaction',      desc:'Land a full 3-crit chain.',                                       rarity:'rare',      secret:false },
    { id:'roll_6_six',      icon:'🔮', name:'Hexamancer',          desc:'Roll a natural 6 six times in one battle.',                       rarity:'epic',      secret:false },

    
    { id:'use_attack',      icon:'⚔️', name:'Swing and Slice',     desc:'Play the Attack card 20 times.',                                  rarity:'common',    secret:false },
    { id:'use_heal',        icon:'🧪', name:'Field Medic',         desc:'Heal a total of 100 HP across all games.',                        rarity:'uncommon',  secret:false },
    { id:'use_vampire',     icon:'🦇', name:'Bloodsucker',         desc:'Drain HP with Vampire 15 times.',                                 rarity:'uncommon',  secret:false },
    { id:'use_plague',      icon:'☠️', name:'Plague Doctor',       desc:'Inflict poison 10 times.',                                        rarity:'uncommon',  secret:false },
    { id:'use_pet',         icon:'🐉', name:'Dragonkeeper',        desc:'Summon your pet 5 times.',                                        rarity:'rare',      secret:false },
    { id:'pet_saves_life',  icon:'🛡️', name:'Loyal Guardian',      desc:'Have your pet absorb a killing blow.',                            rarity:'rare',      secret:false },
    { id:'use_mirror',      icon:'🪞', name:'Reflector',           desc:'Trigger Mirror deflection 5 times.',                              rarity:'uncommon',  secret:false },
    { id:'mirror_kill',     icon:'⚡', name:'Poetic Justice',      desc:'Reflect enough damage to end the battle.',                        rarity:'epic',      secret:false },
    { id:'use_tariff',      icon:'📜', name:'Tax Collector',       desc:'Apply Tariff 10 times.',                                          rarity:'uncommon',  secret:false },
    { id:'use_bomb',        icon:'💣', name:'Demolitions Expert',  desc:'Detonate 10 Bombs.',                                              rarity:'uncommon',  secret:false },
    { id:'bomb_kill',       icon:'🧨', name:'Kaboom',              desc:'Kill the opponent with a Bomb.',                                  rarity:'rare',      secret:false },
    { id:'use_storm',       icon:'⚡', name:'Storm Caller',        desc:'Strike with Storm 10 times.',                                     rarity:'uncommon',  secret:false },
    { id:'use_snipe',       icon:'🏹', name:'Dead Eye',            desc:'Fire Snipe 15 times.',                                            rarity:'uncommon',  secret:false },
    { id:'snipe_thru_pet',  icon:'🎯', name:'Through the Beast',   desc:'Kill with Snipe bypassing a pet.',                                rarity:'rare',      secret:false },
    { id:'use_inferno',     icon:'🔥', name:'Pyromancer',          desc:'Set 10 inferno burns.',                                           rarity:'uncommon',  secret:false },
    { id:'use_frost',       icon:'❄️', name:'Ice Age',             desc:'Freeze the opponent 5 times.',                                    rarity:'rare',      secret:false },
    { id:'freeze_win',      icon:'🧊', name:'Cold Blooded',        desc:'Win a battle with freeze still active.',                          rarity:'epic',      secret:false },
    { id:'use_soul',        icon:'👻', name:'Soul Ripper',         desc:'Play Soul 5 times.',                                              rarity:'rare',      secret:false },
    { id:'soul_kill',       icon:'💀', name:'Reaper',              desc:'Kill the opponent with Soul.',                                    rarity:'epic',      secret:false },
    { id:'use_leech',       icon:'🩸', name:'Parasite',            desc:'Leech HP 20 times.',                                              rarity:'common',    secret:false },
    { id:'use_regen',       icon:'🌿', name:'Naturalist',          desc:'Apply Regen 10 times.',                                           rarity:'common',    secret:false },
    { id:'use_curse',       icon:'🔮', name:'Hexer',               desc:'Curse the opponent 5 times.',                                     rarity:'uncommon',  secret:false },
    { id:'use_gold',        icon:'💰', name:'Golden Touch',        desc:'Play Gold card 5 times.',                                         rarity:'uncommon',  secret:false },
    { id:'use_bone',        icon:'🦴', name:'Necrobrawler',        desc:'Throw 30 cursed bones.',                                          rarity:'common',    secret:false },
    { id:'use_shield',      icon:'🛡️', name:'Wall of Iron',        desc:'Block with Shield 10 times.',                                     rarity:'common',    secret:false },

    
    { id:'play_berserker',  icon:'💀', name:'Born to Rage',        desc:'Win a battle with the Berserker deck.',                           rarity:'uncommon',  secret:false },
    { id:'play_necro',      icon:'🔮', name:'Dark Arts',           desc:'Win a battle with the Necromancer deck.',                         rarity:'uncommon',  secret:false },
    { id:'play_guardian',   icon:'🛡️', name:'Bulwark',             desc:'Win a battle with the Guardian deck.',                            rarity:'uncommon',  secret:false },
    { id:'play_trickster',  icon:'🃏', name:'Wild Card',           desc:'Win a battle with the Trickster deck.',                           rarity:'uncommon',  secret:false },
    { id:'play_elemental',  icon:'⚡', name:'Force of Nature',     desc:'Win a battle with the Elemental deck.',                           rarity:'uncommon',  secret:false },
    { id:'play_siren',      icon:'🎵', name:'Curtain Call',        desc:'Win a battle with the Siren deck.',                               rarity:'uncommon',  secret:false },
    { id:'play_bard',       icon:'🎸', name:'Standing Ovation',    desc:'Win a battle with the Bard deck.',                                rarity:'uncommon',  secret:false },
    { id:'play_iron_vanguard', icon:'🏰', name:'Steel Unbroken',    desc:'Win a battle with the Iron Vanguard deck.',                       rarity:'uncommon',  secret:false },
    { id:'play_forest_warden', icon:'🏹', name:'Ghost of the Woods', desc:'Win a battle with the Forest Warden deck.',                      rarity:'uncommon',  secret:false },
    { id:'play_plague_herald', icon:'⚗️', name:'The Reaping',       desc:'Win a battle with the Plague Herald deck.',                       rarity:'uncommon',  secret:false },
    { id:'play_gilded_throne', icon:'👑', name:'By Royal Decree',   desc:'Win a battle with the Gilded Throne deck.',                       rarity:'uncommon',  secret:false },
    { id:'play_all_decks',  icon:'📚', name:'Polymath',            desc:'Win at least one battle with every deck.',                        rarity:'epic',      secret:false },

    
    { id:'win_3',           icon:'🔥', name:'Hot Streak',          desc:'Win 3 battles in a row.',                                         rarity:'uncommon',  secret:false },
    { id:'win_5',           icon:'💥', name:'Rampage',             desc:'Win 5 battles in a row.',                                         rarity:'rare',      secret:false },
    { id:'win_10',          icon:'🌪️', name:'Juggernaut',          desc:'Win 10 battles in a row.',                                        rarity:'legendary', secret:false },

    
    { id:'play_100',        icon:'🎮', name:'Dedicated',           desc:'Play 100 battles total.',                                         rarity:'rare',      secret:false },
    { id:'play_500',        icon:'🏅', name:'Obsessed',            desc:'Play 500 battles total.',                                         rarity:'epic',      secret:false },
    { id:'heal_full',       icon:'💚', name:'Full Recovery',       desc:'Heal back to full HP from below 20.',                             rarity:'rare',      secret:false },
    { id:'tariff_blocks_50',icon:'💸', name:'Tax Haven',           desc:'Block 50+ total damage with Tariff.',                             rarity:'rare',      secret:false },
    { id:'self_dmg_10',     icon:'🤦', name:'Own Goal',            desc:'Take 10 self-inflicted fails in one session.',                    rarity:'uncommon',  secret:false },
    { id:'ai_fails_5',      icon:'🤖', name:'Robot Problems',      desc:'Watch the AI fail 5 times in one battle.',                       rarity:'uncommon',  secret:false },
    { id:'use_all_cards',   icon:'🃏', name:'Card Shark',          desc:'Use every card type at least once.',                              rarity:'rare',      secret:false },
    { id:'status_stack',    icon:'🌀', name:'Status Effect',       desc:'Have 4+ status effects active simultaneously.',                   rarity:'epic',      secret:false },
    { id:'poison_kill',     icon:'☠️', name:'Slow Death',          desc:'Win by poison damage on the final tick.',                         rarity:'rare',      secret:false },
    { id:'burn_kill',       icon:'🔥', name:'Scorched Earth',      desc:'Win by burn damage on the final tick.',                           rarity:'rare',      secret:false },

    
    { id:'use_cleave',        icon:'🪓', name:'The Axeman Cometh',    desc:'Strike with Cleave 10 times.',                                    rarity:'uncommon',  secret:false },
    { id:'use_destrier',      icon:'🐴', name:'Full Gallop',          desc:'Charge with Destrier 5 times.',                                   rarity:'rare',      secret:false },
    { id:'use_rally',         icon:'🚩', name:'Hold the Line',        desc:'Rally your troops 10 times.',                                     rarity:'uncommon',  secret:false },
    { id:'use_volley',        icon:'🪃', name:'Rain of Arrows',       desc:'Loose 15 volleys.',                                               rarity:'common',    secret:false },
    { id:'use_bramble',       icon:'🌿', name:'Thornweaver',          desc:'Entangle the enemy 10 times with Bramble.',                       rarity:'uncommon',  secret:false },
    { id:'use_miasma',        icon:'🫧', name:'Plague Bearer',        desc:'Unleash Miasma 10 times.',                                        rarity:'uncommon',  secret:false },
    { id:'use_pandemic',      icon:'⚗️', name:'Patient Zero',         desc:'Unleash Pandemic 3 times.',                                       rarity:'rare',      secret:false },
    { id:'use_decree',        icon:'📋', name:'By My Word',           desc:'Issue 10 Royal Decrees.',                                         rarity:'uncommon',  secret:false },
    { id:'use_inquisitor',    icon:'⚖️', name:'No Mercy',             desc:'Pass Inquisitor\'s Judgment 5 times.',                            rarity:'rare',      secret:false },
    { id:'tithe_big',         icon:'💎', name:'Extortionist',         desc:'Collect 15+ damage from a single Tithe.',                         rarity:'rare',      secret:false },
    { id:'rally_cleanse',     icon:'🚩', name:'Untainted',            desc:'Cleanse both poison and burn with a single Rally.',               rarity:'uncommon',  secret:false },
    { id:'destrier_kill',     icon:'🐴', name:'Trampled',             desc:'Kill the opponent with Destrier\'s charge.',                      rarity:'rare',      secret:false },
    { id:'pandemic_kill',     icon:'⚗️', name:'The Great Dying',      desc:'Win by Pandemic poison on the final tick.',                       rarity:'epic',      secret:false },
    { id:'double_dot_kill',   icon:'🌀', name:'Death by a Thousand Cuts', desc:'Win with both poison and burn ticking simultaneously.',       rarity:'epic',      secret:false },

    
    { id:'gold_double_reroll',icon:'💰', name:'Press Your Luck',      desc:'Use a Gold card crit to get 2 rerolls.',                          rarity:'rare',      secret:false },
    { id:'frost_self',        icon:'🧊', name:'Cold Feet',            desc:'Freeze yourself with a failed Frost card.',                       rarity:'uncommon',  secret:false },
    { id:'tariff_self',       icon:'📜', name:'Tax Yourself',         desc:'Debuff yourself with a failed Tariff.',                           rarity:'uncommon',  secret:false },
    { id:'regen_wither',      icon:'🌿', name:'Withered',             desc:'Wither from a failed Regen card.',                                rarity:'uncommon',  secret:false },
    { id:'win_500_hp',        icon:'❤️', name:'Ironclad',             desc:'Win 500 total HP worth of battles (sum of final HP).',            rarity:'rare',      secret:false },
    { id:'crit_from_gold',    icon:'🎲', name:'Gilded Dice',          desc:'Roll a natural 6 on a Gold-buffed reroll.',                       rarity:'rare',      secret:false },
    { id:'survive_pandemic',  icon:'🩺', name:'Immune',               desc:'Survive a full Pandemic (all 5 ticks) and win.',                  rarity:'epic',      secret:false },
    { id:'status_6',          icon:'🌪️', name:'Walking Disaster',     desc:'Have 6+ status effects active simultaneously.',                   rarity:'legendary', secret:false },
    { id:'win_25',            icon:'🗡️', name:'Seasoned',             desc:'Win 25 battles total.',                                           rarity:'common',    secret:false },
    { id:'deal_1000',         icon:'⚔️', name:'Bloodthirsty',         desc:'Deal 1000 total damage across all battles.',                      rarity:'rare',      secret:false },
    { id:'heal_500',          icon:'🧪', name:'Apothecary',           desc:'Heal 500 total HP across all battles.',                           rarity:'rare',      secret:false },

    
    { id:'secret_9',          icon:'🎯', name:'Triple Threat',        desc:'Land 3 crits in a row on 3 different cards in a single turn.',    rarity:'epic',      secret:true },
    { id:'secret_10',         icon:'🃏', name:'Against All Odds',     desc:'Win from 1 HP.',                                                  rarity:'legendary', secret:true },
    { id:'secret_11',         icon:'🏰', name:'The Iron Wall',        desc:'Win a battle without your HP dropping below 60.',                 rarity:'rare',      secret:true },
    { id:'secret_12',         icon:'☠️', name:'Plague Lord',          desc:'Have the opponent at 40+ poison/burn stacks total in one battle.', rarity:'epic',     secret:true },
];

let achStats = {
    wins: 0, losses: 0, totalGames: 0,
    winStreak: 0, lossStreak: 0, maxWinStreak: 0,
    totalCrits: 0, totalFails: 0, totalSelfFails: 0,
    totalHealedHP: 0, totalDamageDealt: 0, totalTariffBlocked: 0,
    cardCounts: {}, 
    deckWins: {}, 
    vampireUses: 0, plagueUses: 0, petUses: 0, mirrorTriggers: 0,
    tariffUses: 0, bombUses: 0, stormUses: 0, snipeUses: 0,
    infernoUses: 0, frostUses: 0, soulUses: 0, leechUses: 0,
    regenUses: 0, curseUses: 0, goldUses: 0, boneUses: 0, shieldUses: 0,
    attackUses: 0, healUses: 0,
    cleaveUses: 0, destrierUses: 0, rallyUses: 0, volleyUses: 0,
    brambleUses: 0, miasmaUses: 0, pandemicUses: 0, decreeUses: 0, inquisitorUses: 0,
    totalDamageDealtAllTime: 0, totalHealedAllTime: 0, totalWinHP: 0,
    _totalPoisonBurnStacks: 0, _battleGoldCrits: 0,
    _battleCrits: 0, _battleFails: 0, _battleAiFails: 0,
    _battleTurns: 0, _battleDmgDealt: 0, _battleSameCard: {},
    _battleCardsUsed: new Set(), _battleLowestHP: 75,
    _failsThisBattle: 0, _wonWithFreeze: false,
};

let unlockedAchs = new Set();

const ACH_KEY   = 'dmgroll_achievements';
const STATS_KEY  = 'dmgroll_stats';
const DECKS_KEY  = 'dmgroll_custom_decks';

function saveAchievements() {
    try {
        localStorage.setItem(ACH_KEY, JSON.stringify([...unlockedAchs]));
        localStorage.setItem(STATS_KEY, JSON.stringify({
            ...achStats,
            _battleCardsUsed: [...achStats._battleCardsUsed]
        }));
        const msg = document.getElementById('ach-save-msg');
        if (msg) { msg.style.opacity = '1'; setTimeout(() => msg.style.opacity = '0', 1800); }
    } catch(e) { console.warn('Save failed', e); }
    // Cloud sync (fire-and-forget, only if signed in)
    _pushStatsCloud();
}

function loadAchievements() {
    try {
        const a = localStorage.getItem(ACH_KEY);
        if (a) unlockedAchs = new Set(JSON.parse(a));
        const s = localStorage.getItem(STATS_KEY);
        if (s) {
            const parsed = JSON.parse(s);
            if (parsed._battleCardsUsed) parsed._battleCardsUsed = new Set(parsed._battleCardsUsed);
            Object.assign(achStats, parsed);
        }
    } catch(e) {}
}

function confirmResetAchievements() {
    document.getElementById('ach-reset-modal').classList.add('open');
}

function doResetAchievements() {
    document.getElementById('ach-reset-modal').classList.remove('open');
    unlockedAchs = new Set();
    achStats = { wins:0,losses:0,totalGames:0,winStreak:0,lossStreak:0,maxWinStreak:0,totalCrits:0,totalFails:0,totalSelfFails:0,totalHealedHP:0,totalDamageDealt:0,totalTariffBlocked:0,cardCounts:{},deckWins:{},vampireUses:0,plagueUses:0,petUses:0,mirrorTriggers:0,tariffUses:0,bombUses:0,stormUses:0,snipeUses:0,infernoUses:0,frostUses:0,soulUses:0,leechUses:0,regenUses:0,curseUses:0,goldUses:0,boneUses:0,shieldUses:0,attackUses:0,healUses:0,cleaveUses:0,destrierUses:0,rallyUses:0,volleyUses:0,brambleUses:0,miasmaUses:0,pandemicUses:0,decreeUses:0,inquisitorUses:0,totalDamageDealtAllTime:0,totalHealedAllTime:0,totalWinHP:0,_totalPoisonBurnStacks:0,_battleGoldCrits:0,_battleCrits:0,_battleFails:0,_battleAiFails:0,_battleTurns:0,_battleDmgDealt:0,_battleSameCard:{},_battleCardsUsed:new Set(),_battleLowestHP:75,_failsThisBattle:0,_wonWithFreeze:false };
    try {
        localStorage.removeItem(ACH_KEY);
        localStorage.removeItem(STATS_KEY);
    } catch(e) {}
    saveAchievements();
    renderAchGrid('all');
    const msg = document.getElementById('ach-save-msg');
    if (msg) { msg.textContent = 'Reset!'; msg.style.opacity = '1'; setTimeout(() => { msg.style.opacity = '0'; msg.textContent = ''; }, 2500); }
}

function resetAchievements() {
    unlockedAchs = new Set();
    achStats = { wins:0,losses:0,totalGames:0,winStreak:0,lossStreak:0,maxWinStreak:0,totalCrits:0,totalFails:0,totalSelfFails:0,totalHealedHP:0,totalDamageDealt:0,totalTariffBlocked:0,cardCounts:{},deckWins:{},vampireUses:0,plagueUses:0,petUses:0,mirrorTriggers:0,tariffUses:0,bombUses:0,stormUses:0,snipeUses:0,infernoUses:0,frostUses:0,soulUses:0,leechUses:0,regenUses:0,curseUses:0,goldUses:0,boneUses:0,shieldUses:0,attackUses:0,healUses:0,cleaveUses:0,destrierUses:0,rallyUses:0,volleyUses:0,brambleUses:0,miasmaUses:0,pandemicUses:0,decreeUses:0,inquisitorUses:0,totalDamageDealtAllTime:0,totalHealedAllTime:0,totalWinHP:0,_totalPoisonBurnStacks:0,_battleGoldCrits:0,_battleCrits:0,_battleFails:0,_battleAiFails:0,_battleTurns:0,_battleDmgDealt:0,_battleSameCard:{},_battleCardsUsed:new Set(),_battleLowestHP:75,_failsThisBattle:0,_wonWithFreeze:false };
    saveAchievements();
    renderAchGrid('all');
}

loadAchievements();

function saveDeckData() {
    try {
        const customs = DECKS.filter(d => d.isCustom);
        localStorage.setItem(DECKS_KEY, JSON.stringify(customs));
        localStorage.setItem(DECKS_KEY + '_selected', selectedDeckId);
        const msg = document.getElementById('deck-save-msg');
        if (msg) { msg.style.opacity = '1'; setTimeout(() => msg.style.opacity = '0', 1800); }
    } catch(e) { console.warn('Deck save failed', e); }
}

function loadDeckData() {
    try {
        const raw = localStorage.getItem(DECKS_KEY);
        if (raw) {
            const customs = JSON.parse(raw);
            for (let i = DECKS.length - 1; i >= 0; i--) {
                if (DECKS[i].isCustom) DECKS.splice(i, 1);
            }
            customs.forEach(d => DECKS.push(d));
        }
        const sel = localStorage.getItem(DECKS_KEY + '_selected');
        if (sel && DECKS.find(d => d.id === sel)) {
            selectedDeckId = sel;
        }
    } catch(e) { console.warn('Deck load failed', e); }
}

loadDeckData();
loadLastDeck();
setTimeout(() => { buildDeckUI(); }, 0);

let _toastTimeout = null;
function unlockAch(id) {
    if (unlockedAchs.has(id)) return;
    const def = ACHIEVEMENTS.find(a => a.id === id);
    if (!def) return;
    unlockedAchs.add(id);
    saveAchievements();
    showAchToast(def);
    if (document.getElementById('menu-achievements').style.display !== 'none') renderAchGrid();
    // Award gold based on rarity
    const goldByRarity = { common:15, uncommon:25, rare:40, epic:75, legendary:150 };
    const goldReward = goldByRarity[def.rarity] || 15;
    if (typeof shopAwardGold === 'function') {
        shopAwardGold(goldReward);
        setTimeout(() => {
            if (typeof _showGoldToast === 'function') _showGoldToast(`+${goldReward} 🪙 Achievement: ${def.name}`);
        }, 3600);
    }
    // Award XP based on rarity
    if (typeof _xpOnAchievement === 'function') {
        setTimeout(() => _xpOnAchievement(def.rarity), 1200);
    }
}

function showAchToast(def) {
    const t = document.getElementById('ach-toast');
    document.getElementById('ach-toast-icon').textContent = def.icon;
    document.getElementById('ach-toast-name').textContent = def.name;
    t.classList.add('show');
    if (_toastTimeout) clearTimeout(_toastTimeout);
    _toastTimeout = setTimeout(() => t.classList.remove('show'), 3500);
}

function checkAchs(context = {}) {
    const s = achStats;

    if (s.wins >= 1)   unlockAch('first_blood');
    if (s.wins >= 10)  unlockAch('veteran');
    if (s.wins >= 50)  unlockAch('warlord');
    if (s.wins >= 100) unlockAch('legend');
    if (s.wins >= 250) unlockAch('unstoppable');
    if (s.losses >= 1) unlockAch('first_loss');
    if (s.winStreak >= 3)  unlockAch('win_3');
    if (s.winStreak >= 5)  unlockAch('win_5');
    if (s.winStreak >= 10) unlockAch('win_10');
    if (s.totalGames >= 100) unlockAch('play_100');
    if (s.totalGames >= 500) unlockAch('play_500');

    if (s.totalCrits >= 1)  unlockAch('first_crit');
    if (s.totalCrits >= 50) unlockAch('crit_50');
    if (s.totalFails >= 1)  unlockAch('first_fail');
    if (s._battleCrits >= 6) unlockAch('roll_6_six');

    if (s.attackUses >= 20)   unlockAch('use_attack');
    if (s.totalHealedHP >= 100) unlockAch('use_heal');
    if (s.vampireUses >= 15)  unlockAch('use_vampire');
    if (s.plagueUses >= 10)   unlockAch('use_plague');
    if (s.petUses >= 5)       unlockAch('use_pet');
    if (s.mirrorTriggers >= 5) unlockAch('use_mirror');
    if (s.tariffUses >= 10)   unlockAch('use_tariff');
    if (s.bombUses >= 10)     unlockAch('use_bomb');
    if (s.stormUses >= 10)    unlockAch('use_storm');
    if (s.snipeUses >= 15)    unlockAch('use_snipe');
    if (s.infernoUses >= 10)  unlockAch('use_inferno');
    if (s.frostUses >= 5)     unlockAch('use_frost');
    if (s.soulUses >= 5)      unlockAch('use_soul');
    if (s.leechUses >= 20)    unlockAch('use_leech');
    if (s.regenUses >= 10)    unlockAch('use_regen');
    if (s.curseUses >= 5)     unlockAch('use_curse');
    if (s.goldUses >= 5)      unlockAch('use_gold');
    if (s.boneUses >= 30)     unlockAch('use_bone');
    if (s.shieldUses >= 10)   unlockAch('use_shield');

    if (s._battleFails >= 10)   unlockAch('fail_10');
    if (s._battleAiFails >= 5)  unlockAch('ai_fails_5');
    if (s._battleTurns >= 30)   unlockAch('secret_7');
    if (s._failsThisBattle >= 3 && context.won) unlockAch('secret_6');
    if (context.won && s._battleLowestHP <= 0) {} 
    if (context.wonWithFreeze)                 unlockAch('freeze_win'); 
    if (s.totalSelfFails >= 10) unlockAch('self_dmg_10');
    if (s.totalTariffBlocked >= 50) unlockAch('tariff_blocks_50');

    if (s.deckWins['berserker'] >= 1)   unlockAch('play_berserker');
    if (s.deckWins['necromancer'] >= 1) unlockAch('play_necro');
    if (s.deckWins['guardian'] >= 1)    unlockAch('play_guardian');
    if (s.deckWins['trickster'] >= 1)   unlockAch('play_trickster');
    if (s.deckWins['elemental'] >= 1)   unlockAch('play_elemental');
    if (s.deckWins['siren'] >= 1)       unlockAch('play_siren');
    if (s.deckWins['bard'] >= 1)        unlockAch('play_bard');
    if (s.deckWins['iron_vanguard'] >= 1)   unlockAch('play_iron_vanguard');
    if (s.deckWins['forest_warden'] >= 1)   unlockAch('play_forest_warden');
    if (s.deckWins['plague_herald'] >= 1)   unlockAch('play_plague_herald');
    if (s.deckWins['gilded_throne'] >= 1)   unlockAch('play_gilded_throne');
    const deckIds = ['standard','berserker','necromancer','guardian','trickster','elemental','siren','bard','iron_vanguard','forest_warden','plague_herald','gilded_throne'];
    if (deckIds.every(d => (s.deckWins[d] || 0) >= 1)) unlockAch('play_all_decks');

    if (context.singleHitDmg >= 30)  unlockAch('massacre');
    if (context.singleHitDmg >= 50)  unlockAch('overkill');
    if (context.totalBattleDmg >= 200) unlockAch('annihilator');
    if (context.chainLen >= 3)        unlockAch('crit_chain_3');
    if (context.chainLen >= 3)        unlockAch('crit_streak');
    if (context.wonFromLow)           unlockAch('comeback');
    if (context.won && state.pHP >= 50) unlockAch('flawless');
    if (context.won && state.pHP >= 1 && state.pHP <= 3) unlockAch('close_call');
    if (context.healedFull)           unlockAch('heal_full');
    if (context.petSavedLife)         unlockAch('pet_saves_life');
    if (context.mirrorKill)           unlockAch('mirror_kill');
    if (context.bombKill)             unlockAch('bomb_kill');
    if (context.soulKill)             unlockAch('soul_kill');
    if (context.snipeThroughPet)      unlockAch('snipe_thru_pet');
    if (context.poisonKill)           unlockAch('poison_kill');
    if (context.burnKill)             unlockAch('burn_kill');
    if (context.exactlyOneDmg)        unlockAch('secret_3');
    if (context.critOnHeal)           unlockAch('secret_4');
    if (context.bothAtOne)            unlockAch('secret_5');
    if (context.noAttackWin)          unlockAch('secret_8');
    if (context.statusCount >= 4)     unlockAch('status_stack');

    if (s.cleaveUses >= 10)     unlockAch('use_cleave');
    if (s.destrierUses >= 5)    unlockAch('use_destrier');
    if (s.rallyUses >= 10)      unlockAch('use_rally');
    if (s.volleyUses >= 15)     unlockAch('use_volley');
    if (s.brambleUses >= 10)    unlockAch('use_bramble');
    if (s.miasmaUses >= 10)     unlockAch('use_miasma');
    if (s.pandemicUses >= 3)    unlockAch('use_pandemic');
    if (s.decreeUses >= 10)     unlockAch('use_decree');
    if (s.inquisitorUses >= 5)  unlockAch('use_inquisitor');

    if (s._battleGoldCrits >= 1)           unlockAch('gold_double_reroll');
    if ((s.totalWinHP || 0) >= 500)        unlockAch('win_500_hp');
    if ((s.totalDamageDealtAllTime || 0) >= 1000) unlockAch('deal_1000');
    if ((s.totalHealedHP || 0) >= 500)     unlockAch('heal_500');
    if (s.wins >= 25)                      unlockAch('win_25');
    if (context.survivedPandemic)          unlockAch('survive_pandemic');
    if (context.doubleDotKill)             unlockAch('double_dot_kill');
    if (context.wonAt1HP)                  unlockAch('secret_10');
    if (context.ironWall)                  unlockAch('secret_11');
    if ((s._totalPoisonBurnStacks || 0) >= 40) unlockAch('secret_12');

    if (context.frostSelf)       unlockAch('frost_self');
    if (context.tariffSelf)      unlockAch('tariff_self');
    if (context.regenWither)     unlockAch('regen_wither');
    if (context.titheHit >= 15)  unlockAch('tithe_big');
    if (context.rallyCleanse)    unlockAch('rally_cleanse');
    if (context.destrierKill)    unlockAch('destrier_kill');
    if (context.pandemicKill)    unlockAch('pandemic_kill');
    if (context.goldCritReroll)  unlockAch('crit_from_gold');
    if (context.statusCount >= 6) unlockAch('status_6');

    const allCardIds = [0,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46];
    if (allCardIds.every(id => s._battleCardsUsed.has(id) || (s.cardCounts[id]||0) >= 1)) unlockAch('use_all_cards');

    Object.values(s._battleSameCard).forEach(n => { if(n >= 10) unlockAch('secret_2'); });

    if (context.won && s._battleFails === 0) unlockAch('no_fail');

    if (s.lossStreak >= 25) unlockAch('secret_1');
}

let _achFilter = 'all';
function openAchievements() {
    toggle('menu-achievements', true);
    renderAchGrid('all');
}
function filterAch(filter, el) {
    _achFilter = filter;
    document.querySelectorAll('.ach-filter').forEach(f => f.classList.remove('active'));
    el.classList.add('active');
    renderAchGrid(filter);
}
function renderAchGrid(filter) {
    filter = filter || _achFilter;
    const grid = document.getElementById('ach-grid');
    grid.innerHTML = '';
    const unlocked = unlockedAchs.size;
    const total = ACHIEVEMENTS.length;
    document.getElementById('ach-count').textContent = `${unlocked} / ${total}`;
    document.getElementById('ach-prog-fill').style.width = (unlocked / total * 100) + '%';

    let list = ACHIEVEMENTS;
    if (filter === 'unlocked') list = ACHIEVEMENTS.filter(a => unlockedAchs.has(a.id));
    else if (filter === 'locked') list = ACHIEVEMENTS.filter(a => !unlockedAchs.has(a.id));
    else if (['common','uncommon','rare','epic','legendary'].includes(filter)) list = ACHIEVEMENTS.filter(a => a.rarity === filter);

    const rarityOrder = { legendary:0, epic:1, rare:2, uncommon:3, common:4 };
    list = [...list].sort((a,b) => {
        const au = unlockedAchs.has(a.id), bu = unlockedAchs.has(b.id);
        if (au !== bu) return au ? -1 : 1;
        return rarityOrder[a.rarity] - rarityOrder[b.rarity];
    });

    list.forEach(ach => {
        const isUnlocked = unlockedAchs.has(ach.id);
        const tile = document.createElement('div');
        tile.className = 'ach-tile' + (isUnlocked ? ' unlocked' : '') + (ach.secret ? ' secret' : '');
        tile.dataset.rarity = ach.rarity;
        tile.innerHTML = `
            <div class="ach-tile-icon">${ach.icon}</div>
            <div class="ach-tile-body">
                <div class="ach-tile-name">${ach.secret && !isUnlocked ? '???' : ach.name}</div>
                <div class="ach-tile-rarity">${ach.rarity}</div>
                <div class="ach-tile-desc">${ach.secret && !isUnlocked ? 'Secret achievement — keep playing to discover it.' : ach.desc}</div>
            </div>
            <div class="ach-tile-check">✦</div>`;
        grid.appendChild(tile);
    });
}

function trackCardPlayed(cardId, isPlayer) {
    if (!isPlayer) return;
    achStats.cardCounts[cardId] = (achStats.cardCounts[cardId] || 0) + 1;
    achStats._battleCardsUsed.add(cardId);
    achStats._battleSameCard[cardId] = (achStats._battleSameCard[cardId] || 0) + 1;
    switch(cardId) {
        case 0:  achStats.attackUses++;  break;
        case 2:  achStats.healUses++;    break;
        case 3:  achStats.tariffUses++;  break;
        case 4:  achStats.petUses++;     break;
        case 5:  achStats.vampireUses++; break;
        case 6:   break;
        case 7:  achStats.plagueUses++;  break;
        case 8:  achStats.bombUses++;    break;
        case 9:  achStats.shieldUses++;  break;
        case 10: achStats.stormUses++;   break;
        case 11: achStats.curseUses++;   break;
        case 12: achStats.regenUses++;   break;
        case 13: achStats.snipeUses++;   break;
        case 14: achStats.leechUses++;   break;
        case 15: achStats.infernoUses++; break;
        case 16: achStats.frostUses++;   break;
        case 17: achStats.goldUses++;    break;
        case 18: achStats.boneUses++;    break;
        case 19: achStats.soulUses++;    break;
        case 20: case 21: case 22: case 23: case 24: case 25: break;
        case 26: case 27: case 28: case 29: case 30: case 31: break;
        case 33: achStats.cleaveUses++;    break;
        case 34: achStats.rallyUses++;     break;
        case 35: achStats.destrierUses++;  break;
        case 36: achStats.volleyUses++;    break;
        case 38: achStats.brambleUses++;   break;
        case 40: achStats.miasmaUses++;    break;
        case 43: achStats.pandemicUses++;  break;
        case 44: achStats.decreeUses++;    break;
        case 46: achStats.inquisitorUses++; break;
    }
    checkAchs();
}

function trackCrit(isPlayer) {
    if (isPlayer) { achStats.totalCrits++; achStats._battleCrits++; }
    checkAchs();
}

function trackFail(isPlayer) {
    if (isPlayer) {
        achStats.totalFails++; achStats._battleFails++;
        achStats._failsThisBattle++;
    } else {
        achStats._battleAiFails++;
    }
    checkAchs();
}

function trackDamage(amount, isPlayer) {
    if (isPlayer) {
        achStats.totalDamageDealt += amount;
        achStats._battleDmgDealt += amount;
    }
    achStats._battleLowestHP = Math.min(achStats._battleLowestHP, state.pHP);
    checkAchs({ singleHitDmg: amount, exactlyOneDmg: Math.round(amount) === 1 });
}

function trackTariffBlock(originalDmg) {
    achStats.totalTariffBlocked += Math.floor(originalDmg * 0.5);
    if (achStats.totalTariffBlocked >= 50) checkAchs({});
}

function trackTurn() {
    achStats._battleTurns++;
    if (achStats._battleTurns >= 30) checkAchs({});
}

function trackHeal(amount) {
    achStats.totalHealedHP += amount;
    const wasLow = state.pHP < 20;
    const afterHP = Math.min(75, state.pHP + amount);
    if (wasLow && afterHP >= 75) checkAchs({ healedFull: true });
    checkAchs();
}

function trackSelfFail() {
    achStats.totalSelfFails++;
    checkAchs();
}

function trackChain(len) {
    if (len >= 3) {
        checkAchs({ chainLen: len });
        if (typeof shopAwardGold === 'function') shopAwardGold(10);
        _showGoldToast('+10 🪙 Triple Crit Chain!');
    }
}

function trackStatusStack() {
    let count = 0;
    if (state.pPet > 0)    count++;
    if (state.pTariff > 0) count++;
    if (state.pMirror)     count++;
    if (state.pPoison > 0) count++;
    if (state.pBurn > 0)   count++;
    if (state.pRegen > 0)  count++;
    if (state.pShield)     count++;
    if (state.pFreeze > 0) count++;
    if (count >= 4) checkAchs({ statusCount: count });
}

function resetBattleStats() {
    achStats._battleCrits = 0;
    achStats._battleFails = 0;
    achStats._battleAiFails = 0;
    achStats._battleTurns = 0;
    achStats._battleDmgDealt = 0;
    achStats._battleSameCard = {};
    achStats._battleCardsUsed = new Set();
    achStats._battleLowestHP = 75;
    achStats._failsThisBattle = 0;
    achStats._wonWithFreeze = false;
    achStats._survivedPandemic = false;
    achStats._totalPoisonBurnStacks = 0;
    achStats._battleGoldCrits = 0;
    achStats._consecutiveCritCards = 0;
}

function trackGameEnd(won) {
    achStats.totalGames++;
    if (won) {
        achStats.wins++;
        achStats.winStreak++;
        achStats.lossStreak = 0;
        achStats.maxWinStreak = Math.max(achStats.maxWinStreak, achStats.winStreak);
        if (achStats.deckWins[selectedDeckId] === undefined) achStats.deckWins[selectedDeckId] = 0;
        achStats.deckWins[selectedDeckId]++;
        achStats.totalWinHP = (achStats.totalWinHP || 0) + Math.max(0, state.pHP);
        // Award gold for winning (online only)
        if (typeof _onlineMode !== 'undefined' && _onlineMode && typeof shopAwardGold === 'function') {
            shopAwardGold(25);
            _showGoldToast('+25 🪙 Victory!');
            // First win of the day bonus
            const today = new Date().toISOString().slice(0, 10);
            const lastWinDay = localStorage.getItem('dr_last_win_day');
            if (lastWinDay !== today) {
                localStorage.setItem('dr_last_win_day', today);
                shopAwardGold(20);
                _showGoldToast('+20 🪙 First Win of the Day!');
            }
        }
        // XP for offline wins (online XP handled by _submitMatchResult → _xpOnMatchEnd)
        if ((typeof _onlineMode === 'undefined' || !_onlineMode) && typeof _xpOnMatchEnd === 'function') {
            _xpOnMatchEnd(true, false, false, true);
        }
    } else {
        achStats.losses++;
        achStats.lossStreak++;
        achStats.winStreak = 0;
        // XP for offline losses (online loss handled by _submitMatchResult)
        if ((typeof _onlineMode === 'undefined' || !_onlineMode) && typeof _xpOnMatchEnd === 'function') {
            _xpOnMatchEnd(false, false, false, true);
        }
    }
    achStats.totalDamageDealtAllTime = (achStats.totalDamageDealtAllTime || 0) + (achStats._battleDmgDealt || 0);
    const doubleDotKill = !won ? false : (state.aPoison > 0 || state.aPoisonDmg > 0) && (state.aBurn > 0 || state.aBurnDmg > 0);
    const ctx = {
        won,
        wonFromLow: won && achStats._battleLowestHP <= 15,
        wonAt1HP: won && Math.round(state.pHP) === 1,
        ironWall: won && achStats._battleLowestHP >= 60,
        totalBattleDmg: achStats._battleDmgDealt,
        noAttackWin: won && !(achStats._battleCardsUsed.has(0)),
        wonWithFreeze: won && state.aFreeze > 0,
        doubleDotKill,
        survivedPandemic: won && achStats._survivedPandemic,
    };
    checkAchs(ctx);
    saveAchievements();
    resetBattleStats();
}

function logCombat(msg) {
    if (!opt('opt-combat-log')) return;
    const log = document.getElementById('combat-log');
    if (!log) return;
    const el = document.createElement('div');
    el.style.cssText = 'font-family:"Cinzel",serif;font-size:9px;letter-spacing:1px;color:rgba(160,120,60,0.75);text-align:center;padding:1px 0;animation:fadeInUp 0.3s ease;';
    el.textContent = msg;
    log.prepend(el);
    while (log.children.length > 5) log.removeChild(log.lastChild);
}
function toggleCombatLog() {
    const log = document.getElementById('combat-log');
    if (log) log.style.display = opt('opt-combat-log') ? 'flex' : 'none';
}

let _skipRequested = false;

function showSkipBtn() {}

function applyUpdateLog(val) {
    const enabled = val != null ? val : (document.getElementById('opt-update-log')?.checked ?? true);
    const panel = document.getElementById('changelog-panel');
    if (panel) panel.style.display = enabled ? 'flex' : 'none';
}

function applyColorblind() {
    const cb = opt('opt-colorblind');
    document.documentElement.style.setProperty('--uncommon', cb ? '#2e7d32' : '#1b5e20');
    document.documentElement.style.setProperty('--rare',     cb ? '#1565c0' : '#0d47a1');
    document.documentElement.style.setProperty('--epic',     cb ? '#6a1b9a' : '#6a1b9a');
    document.querySelectorAll('.picker-card-rarity, .card').forEach(el => {
        el.dataset.cbLabel = cb ? ({'common':'◆','uncommon':'◆◆','rare':'◆◆◆','epic':'◆◆◆◆','legendary':'★'}[el.className.split(' ').find(c => ['common','uncommon','rare','epic','legendary'].includes(c))] || '') : '';
    });
}


/* ── _pushStatsCloud — syncs achievement stats to Supabase (fire-and-forget) ── */
function _pushStatsCloud() {
    const sb  = window._supabase;
    if (!sb || !_syncedUid) return;
    // Collect current stats from localStorage
    const statsRaw = localStorage.getItem('dr_stats');
    const stats = statsRaw ? JSON.parse(statsRaw) : {};
    sb.from('profiles').update({
        wins:            stats.wins            || 0,
        losses:          stats.losses          || 0,
        tournaments_won: stats.tournamentsWon  || 0,
    }).eq('id', _syncedUid).then(() => {});
}

/* ── _initSync — stub for future cloud sync initialisation ── */
function _initSync() {
    // Placeholder — cloud sync initialised via _authStartupCheck in auth.js
}


function _showGoldToast(msg) {
    let t = document.getElementById('gold-award-toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'gold-award-toast';
        t.style.cssText = 'position:fixed;top:22px;right:24px;z-index:99991;background:rgba(10,6,2,.96);border:1px solid rgba(200,160,40,.55);border-radius:999px;padding:8px 18px;font-family:Cinzel,serif;font-size:10px;letter-spacing:1.5px;color:#e8c870;white-space:nowrap;box-shadow:0 4px 20px rgba(0,0,0,.7);opacity:0;transition:opacity .2s;pointer-events:none;';
        document.body.appendChild(t);
    }
    // Stack toasts if multiple fire at once
    clearTimeout(t._timer);
    t.textContent = msg;
    t.style.opacity = '1';
    t._timer = setTimeout(() => { t.style.opacity = '0'; }, 2800);
}
