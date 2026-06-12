/**
 * Game of Gnomes — Engine v7.4.3
 * Single source of truth. Include once. Works on all pages.
 */
(function (global) {
  "use strict";

  // ─── Constants ────────────────────────────────────────────────────────────
  const GnomeStats      = Object.freeze(["combat","mind","skill","luck","quirk","team"]);
  const GnomeBaseTypes  = Object.freeze(["Warrior","Archer","Mage","Spirit Mage","Rogue","Ninja","Engineer","Alchemist","Scholar","Philosopher"]);
  const TypeRanks       = Object.freeze(["","+","++"]);
  const Rarity          = Object.freeze(["Common","Uncommon","Rare","Epic","Legendary"]);
  const LootTier        = Object.freeze(["Common","Uncommon","Rare","Epic","Legendary"]);

  // ─── Utility ──────────────────────────────────────────────────────────────
  function createId(p = "id") { return `${p}_${Math.random().toString(36).slice(2,10)}`; }
  function clone(v)            { return JSON.parse(JSON.stringify(v)); }
  function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function pickRandom(list)    { return list[randomInt(0, list.length - 1)]; }
  function clampStat(v)        { return Math.max(1, Math.min(5, Number(v) || 1)); }

  function normalizeStats(s = {}) {
    return { combat: clampStat(s.combat), mind: clampStat(s.mind), skill: clampStat(s.skill), luck: clampStat(s.luck), quirk: clampStat(s.quirk), team: clampStat(s.team) };
  }
  function normalizePartialStatMods(m = {}) {
    const o = {};
    for (const s of GnomeStats) if (m[s] !== undefined) o[s] = Number(m[s]) || 0;
    return o;
  }

  // ─── Types ────────────────────────────────────────────────────────────────
  function createType(baseType, rank = 0) {
    if (!GnomeBaseTypes.includes(baseType)) throw new Error(`Unknown gnome type: ${baseType}`);
    return { baseType, rank, label: `${baseType}${TypeRanks[rank]}` };
  }

  // ─── Equipment ────────────────────────────────────────────────────────────
  function createEmptyEquipment() { return { weapon1: null, weapon2: null, amulet: null, ring1: null, ring2: null }; }

  // ─── Gnome ────────────────────────────────────────────────────────────────
  function createGnome({ id = createId("gnome"), name, type, level = 1, xp = 0, rarity = "Common", stats, skills = [], quirks = [], equipment } = {}) {
    if (!name) throw new Error("Gnome name required.");
    if (!type?.baseType) throw new Error("Gnome type required.");
    if (!Rarity.includes(rarity)) throw new Error(`Invalid rarity: ${rarity}`);
    return {
      id, name,
      type: createType(type.baseType, type.rank ?? 0),
      level, xp, rarity,
      stats: normalizeStats(stats),
      skills: [...skills],
      quirks: [...quirks],
      equipment: equipment ? { ...createEmptyEquipment(), ...equipment } : createEmptyEquipment(),
    };
  }
  function createRecruitableGnome({ rarity = "Common", ...rest } = {}) {
    return { ...createGnome({ rarity, ...rest }), rarity };
  }

  function getEffectiveStats(gnome) {
    const e = { ...gnome.stats };
    for (const item of Object.values(gnome.equipment || {})) {
      if (!item?.statModifiers) continue;
      for (const [stat, mod] of Object.entries(item.statModifiers)) e[stat] = (e[stat] || 0) + mod;
    }
    return e;
  }

  // ─── Army ─────────────────────────────────────────────────────────────────
  function createArmy(gnomes = []) { return { id: createId("army"), gnomes: [...gnomes] }; }

  function getMaxArmySize(level) {
    if (level >= 20) return 12;
    if (level >= 15) return 10;
    if (level >= 10) return 8;
    if (level >= 5)  return 6;
    return 4;
  }

  function getGnomeSeasonUpkeep(gnome) {
    const base = { Common: 2, Uncommon: 4, Rare: 7, Epic: 11, Legendary: 16 }[gnome.rarity] || 2;
    const tierBonus = (gnome.type?.rank || 0) * 3;
    return base + (gnome.level * 2) + tierBonus;
  }

  function getArmyUpkeepTotal(army) {
    return (army?.gnomes || []).reduce((sum, g) => sum + getGnomeSeasonUpkeep(g), 0);
  }

  function removeArmyGnome(gameState, gnomeId) {
    const next = clone(gameState);
    next.army.gnomes = next.army.gnomes.filter(g => g.id !== gnomeId);
    next.selectedTeamIds = next.selectedTeamIds.filter(id => id !== gnomeId);
    return next;
  }

  // ─── XP & Leveling ────────────────────────────────────────────────────────
  function xpNeededForLevel(level) { return Math.max(0, level * 100); }

  function addXp(gnome, xpGained) {
    const n = clone(gnome);
    n.xp += xpGained;
    while (n.xp >= xpNeededForLevel(n.level + 1)) n.level += 1;
    return n;
  }

  function levelUpGnome(gnome) {
    const n = clone(gnome);
    const skillPool = getSkillsForType(n.type.baseType) || [];
    const quirkPool = getQuirkPool();
    while (n.xp >= xpNeededForLevel(n.level + 1)) {
      n.level += 1;
      const stat = pickRandom(GnomeStats);
      n.stats[stat] = Math.min(5, (n.stats[stat] || 1) + 1);
      if (n.level >= 5)      n.type.rank = 2;
      else if (n.level >= 3) n.type.rank = Math.max(n.type.rank || 0, 1);
      n.type.label = `${n.type.baseType}${TypeRanks[n.type.rank]}`;
      if (Math.random() < 0.5 && skillPool.length) {
        const s = pickRandom(skillPool);
        if (!n.skills.includes(s)) n.skills.push(s);
      } else if (quirkPool.length) {
        const q = pickRandom(quirkPool);
        if (!n.quirks.includes(q)) n.quirks.push(q);
      }
    }
    return n;
  }

  function levelUpPlayer(player) {
    const n = clone(player);
    while (n.xp >= xpNeededForLevel(n.level + 1)) n.level += 1;
    n.unlockedQuestSlots = getUnlockedQuestSlotCount(n.level);
    return n;
  }

  function getPlayerXpRequiredForNextLevel(level) { return xpNeededForLevel(level + 1); }

  // ─── Player ───────────────────────────────────────────────────────────────
  function createPlayerProfile({ id = createId("player"), level = 1, xp = 0 } = {}) {
    return { id, level, xp, fame: 0, unlockedQuestSlots: getUnlockedQuestSlotCount(level) };
  }

  function getUnlockedQuestSlotCount(level) {
    if (level >= 25) return 6;
    if (level >= 18) return 5;
    if (level >= 12) return 4;
    if (level >= 7)  return 3;
    return 2;
  }

  // ─── Gnome Data ───────────────────────────────────────────────────────────
  function getBaseStatsForType(t) {
    const p = {
      Warrior:       { combat:4, mind:2, skill:2, luck:2, quirk:2, team:3 },
      Archer:        { combat:3, mind:2, skill:3, luck:3, quirk:2, team:2 },
      Mage:          { combat:1, mind:4, skill:3, luck:2, quirk:3, team:2 },
      "Spirit Mage": { combat:1, mind:4, skill:2, luck:2, quirk:4, team:3 },
      Rogue:         { combat:2, mind:3, skill:4, luck:3, quirk:2, team:2 },
      Ninja:         { combat:3, mind:3, skill:4, luck:2, quirk:2, team:2 },
      Engineer:      { combat:2, mind:4, skill:4, luck:1, quirk:3, team:2 },
      Alchemist:     { combat:1, mind:4, skill:4, luck:2, quirk:3, team:2 },
      Scholar:       { combat:1, mind:5, skill:2, luck:2, quirk:2, team:3 },
      Philosopher:   { combat:1, mind:5, skill:2, luck:3, quirk:3, team:4 },
    };
    return normalizeStats(p[t] || p.Warrior);
  }

  function getSkillsForType(t) {
    const p = {
      Warrior:       ["guard","cleave","shield bash","hold the line"],
      Archer:        ["quick shot","eagle eye","pinning arrow","scout"],
      Mage:          ["arcane bolt","ward","spark burst","mana focus"],
      "Spirit Mage": ["spirit ward","haunt sense","echo pulse","blessing"],
      Rogue:         ["sneak","lockpick","backstab","trap disarm"],
      Ninja:         ["shadow step","silent strike","vanish","poison sense"],
      Engineer:      ["tinker","turret","repair","trap disarm"],
      Alchemist:     ["brew","bomb toss","acid vial","smoke flask"],
      Scholar:       ["lore recall","analysis","scribe","puzzle solve"],
      Philosopher:   ["debate","inspire","insight","moral confusion"],
    };
    return p[t] || [];
  }

  function getQuirkPool() {
    return ["overconfident","presses every button","collects shiny rocks","argues with statues","easily distracted",
            "dramatic whisperer","improvises too much","suspicious of soup","laughs during danger","cursed optimism"];
  }

  function getPreferredStatsForType(typeLabel) {
    const n = typeLabel.replace(/\+\+?$/, "");
    const m = {
      Warrior:       ["combat","team"],
      Archer:        ["skill","luck"],
      Mage:          ["mind","skill"],
      "Spirit Mage": ["mind","quirk"],
      Rogue:         ["skill","luck"],
      Ninja:         ["skill","combat"],
      Engineer:      ["mind","skill"],
      Alchemist:     ["mind","skill"],
      Scholar:       ["mind","team"],
      Philosopher:   ["mind","team"],
    };
    return m[n] || [];
  }

  function getSkillBonusForScene(gnome, scene) {
    const skills = (gnome.skills || []).map(s => String(s).toLowerCase());
    const relevant = {
      combat: ["guard","cleave","shield bash","hold the line","quick shot","pinning arrow","backstab","silent strike","turret","bomb toss","arcane bolt"],
      mind:   ["analysis","lore recall","puzzle solve","insight","scribe","haunt sense"],
      skill:  ["lockpick","trap disarm","tinker","repair","sneak","shadow step","brew"],
      luck:   ["scout","vanish","moral confusion"],
      quirk:  ["blessing","echo pulse"],
      team:   ["inspire","guard","hold the line","blessing"],
    };
    const hits = skills.filter(s => (relevant[scene.type] || []).includes(s)).length;
    return hits > 0 ? Math.min(3, hits + 1) : 0;
  }

  // ─── Rarity helpers ───────────────────────────────────────────────────────
  function getRarityIndex(r)    { return Rarity.indexOf(r); }
  function pickWeightedRarity(weights = [50,28,14,6,2]) {
    const total = weights.reduce((a,b) => a+b, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < weights.length; i++) { roll -= weights[i]; if (roll <= 0) return Rarity[i]; }
    return Rarity[0];
  }
  function getStatBonusFromRarity(r)  { return ({Common:0,Uncommon:1,Rare:2,Epic:3,Legendary:4})[r] ?? 0; }
  function getSkillCountFromRarity(r) { return ({Common:1,Uncommon:2,Rare:2,Epic:3,Legendary:4})[r] ?? 1; }
  function getQuirkCountFromRarity(r) { return ({Common:1,Uncommon:1,Rare:2,Epic:2,Legendary:3})[r] ?? 1; }

  function applyRarityToStats(base, rarity) {
    const o = { ...base };
    let bonus = getStatBonusFromRarity(rarity) * 2;
    while (bonus > 0) { const s = pickRandom(GnomeStats); o[s] = Math.min(5, o[s] + 1); bonus--; }
    return o;
  }

  function takeUniqueRandom(list, count) {
    const pool = [...list], picked = [];
    while (pool.length && picked.length < count) picked.push(pool.splice(randomInt(0, pool.length-1), 1)[0]);
    return picked;
  }

  // ─── Recruit generation ───────────────────────────────────────────────────
  function generateGnomeName() {
    const f = ["Nib","Mop","Brindle","Tocket","Fizz","Pip","Crumble","Bramble","Snip","Wizzle"];
    const l = ["wick","boggle","spark","thimble","root","gear","whistle","crumb","fern","snap"];
    return `${pickRandom(f)}${pickRandom(l)}`;
  }

  function generateRecruitableGnome(rarity = pickWeightedRarity()) {
    const baseType = pickRandom(GnomeBaseTypes);
    return createRecruitableGnome({
      name: generateGnomeName(), rarity,
      type: { baseType, rank: 0 },
      stats: applyRarityToStats(getBaseStatsForType(baseType), rarity),
      skills: takeUniqueRandom(getSkillsForType(baseType), getSkillCountFromRarity(rarity)),
      quirks: takeUniqueRandom(getQuirkPool(), getQuirkCountFromRarity(rarity)),
    });
  }

  function generateRecruitPool(player, count = 4) {
    const weights = player.level >= 10 ? [40,28,18,10,4] : [55,25,12,6,2];
    return Array.from({ length: count }, () => generateRecruitableGnome(pickWeightedRarity(weights)));
  }

  function getHireCostForRarity(rarity) {
    return ({ Common:20, Uncommon:35, Rare:60, Epic:100, Legendary:180 })[rarity] ?? 20;
  }

  // ─── Quests ───────────────────────────────────────────────────────────────
  function getAllowedLootTiersForSlot(i) {
    return [
      ["Common","Uncommon"],
      ["Common","Uncommon"],
      ["Common","Uncommon","Rare"],
      ["Uncommon","Rare","Epic"],
      ["Rare","Epic","Legendary"],
      ["Epic","Legendary"],
    ][i] || ["Common"];
  }

  function getSceneCountForQuest(r, d)    { return Math.min(11, ({Common:3,Uncommon:5,Rare:7,Epic:9,Legendary:11}[r]||3) + (d >= 4 ? 2 : 0)); }
  function getChallengeRatingForQuest(r, d) { return d * 2 + ({Common:0,Uncommon:1,Rare:2,Epic:3,Legendary:4}[r]||0); }
  function getTargetScoreForQuest(s, cr)  { return s * cr * 3; }

  function getQuestXpReward(quest, success) {
    const base = (quest.difficulty * 20) + (quest.scenes * 4) + (Math.max(0, getRarityIndex(quest.rarity)) * 10);
    return success ? base : Math.floor(base / 2);
  }
  function getGnomeXpReward(quest, success, bonuses = {}) {
    const base = (quest.difficulty * 12) + (quest.scenes * 3) + (Math.max(0, getRarityIndex(quest.rarity)) * 6);
    const bonus = (bonuses.skillUses||0)*4 + (bonuses.typeUses||0)*4 + (bonuses.luckUses||0)*3;
    return success ? base + bonus : Math.floor((base + bonus) / 2);
  }

  function getQuestSceneArchetypes() {
    return [
      {
        key: "rescue",
        title: "rescue",
        introTemplates: [
          "A local village begs the gnomes to reach {place} before a missing royal courier loses both the map and their nerve.",
          "A panicked messenger says somebody important is trapped inside {place}, and only snack-powered heroes can get there in time.",
        ],
        outroTemplates: [
          "If the team keeps moving, the kingdom gets its hero back and a very grateful feast table.",
          "Success means a daring rescue, cheering villagers, and bragging rights all season long.",
        ],
        sceneTypes: ["team", "skill", "combat", "luck"],
      },
      {
        key: "heist",
        title: "heist",
        introTemplates: [
          "The crown wants something quietly recovered from {place} before goblins, ghosts, or accountants claim it first.",
          "A secret stash hidden in {place} must be reclaimed before sunrise and before the snacks run out.",
        ],
        outroTemplates: [
          "The final scene should end with jingling loot, narrow escapes, and one wildly unnecessary flourish.",
          "Pull it off and the kingdom gets its treasure back without admitting how close this was to becoming a disaster.",
        ],
        sceneTypes: ["skill", "mind", "luck", "quirk"],
      },
      {
        key: "siege",
        title: "siege",
        introTemplates: [
          "Scouts report that {place} is under pressure, and the gnomes are the nearest force eccentric enough to help.",
          "The kingdom needs a tiny strike team to reinforce {place} before the walls and morale both give out.",
        ],
        outroTemplates: [
          "The push ends with a desperate stand where teamwork matters just as much as courage.",
          "If the line holds, the whole region gets another season to keep arguing peacefully.",
        ],
        sceneTypes: ["combat", "team", "combat", "mind"],
      },
      {
        key: "mystery",
        title: "mystery",
        introTemplates: [
          "Something very wrong is happening around {place}, and nobody can agree whether it is a curse, a prank, or both.",
          "Rumors around {place} mention whispering stones, missing supplies, and suspiciously confident raccoons.",
        ],
        outroTemplates: [
          "To solve it, the gnomes will need brains, nerve, and at least one terrible idea that somehow works.",
          "The truth is buried under clues, weird magic, and several opportunities to panic creatively.",
        ],
        sceneTypes: ["mind", "quirk", "skill", "team"],
      },
      {
        key: "expedition",
        title: "expedition",
        introTemplates: [
          "An old route into {place} has reopened, and the kingdom wants a brave survey before anything hungrier gets there first.",
          "Cartographers need a team to chart {place}, recover useful relics, and avoid becoming cautionary songs.",
        ],
        outroTemplates: [
          "Every scene pushes deeper into danger as the party balances discovery with survival.",
          "The best ending brings home maps, loot, and all three gnomes in mostly matching condition.",
        ],
        sceneTypes: ["luck", "skill", "mind", "combat"],
      },
      {
        key: "affair",
        title: "affair",
        introTemplates: [
          "What started at {place} as a minor errand has become a full kingdom-grade mess with witnesses everywhere.",
          "The court politely calls it an affair. The gnomes correctly identify it as a ridiculous emergency centered on {place}.",
        ],
        outroTemplates: [
          "Expect cross-talk, misplaced relics, and one climactic scene where keeping everyone together is half the battle.",
          "Untangling the affair means surviving the chaos long enough to tell a much funnier version later.",
        ],
        sceneTypes: ["team", "quirk", "mind", "luck"],
      },
    ];
  }

  function getQuestSceneFlavor(type) {
    const map = {
      combat: "frontline clashes and loud heroic nonsense",
      mind: "riddles, clues, and dangerously confident thinking",
      skill: "locks, traps, and fiddly disaster-prevention",
      luck: "precarious paths and split-second breaks",
      quirk: "cursed weirdness and highly suspect instincts",
      team: "coordination, rescues, and everyone pulling together",
    };
    return map[type] || "adventure complications";
  }

  function buildQuestNarrative(name, place, archetype, scenePlan) {
    const opener = pickRandom(archetype.introTemplates).replace(/\{place\}/g, place);
    const closer = pickRandom(archetype.outroTemplates).replace(/\{place\}/g, place);
    const sceneLine = scenePlan.map(getQuestSceneFlavor).join(", then ");
    return {
      storyHook: `${opener} ${closer}`,
      sceneStory: `This run winds through ${sceneLine}.`,
      scenePreview: scenePlan.map((type, idx) => ({
        index: idx,
        type,
        label: getQuestSceneFlavor(type),
      })),
    };
  }

  function generateQuestName() {
    const a = ["Goblin","Cursed","Royal","Sunken","Whispering","Broken","Moonlit","Ancient","Crooked","Ember"];
    const b = ["Tower","Forest","Vault","Pie","Bridge","Keep","Marsh","Crypt","Workshop","Cavern"];
    const c = ["Expedition","Incident","Heist","Rescue","Mystery","Siege","Problem","Recovery","Riddle","Affair"];
    return `${pickRandom(a)} ${pickRandom(b)} ${pickRandom(c)}`;
  }

  function generateQuestForSlot(i) {
    const allowed    = getAllowedLootTiersForSlot(i);
    const lootTier   = pickRandom(allowed);
    const rarity     = Rarity[randomInt(0, Math.max(0, LootTier.indexOf(lootTier)))];
    const difficulty = randomInt(1, 5);
    const scenes     = getSceneCountForQuest(rarity, difficulty);
    const cr         = getChallengeRatingForQuest(rarity, difficulty);
    const name       = generateQuestName();
    const place      = name.split(" ").slice(1, -1).join(" ") || name;
    const archetype  = pickRandom(getQuestSceneArchetypes());
    const scenePlan  = Array.from({ length: scenes }, (_, idx) => archetype.sceneTypes[idx % archetype.sceneTypes.length]);
    const narrative  = buildQuestNarrative(name, place, archetype, scenePlan);
    return {
      id: createId("quest"), name,
      rarity, difficulty, lootTier,
      challengeRating: cr, scenes, targetScore: getTargetScoreForQuest(scenes, cr),
      tags: ["seasonal", `slot_${i+1}`, archetype.key],
      storyHook: narrative.storyHook,
      sceneStory: narrative.sceneStory,
      scenePreview: narrative.scenePreview,
      scenePlan,
    };
  }

  function generateQuestBoardForPlayer(player) {
    const unlocked = getUnlockedQuestSlotCount(player.level);
    return Array.from({ length: 6 }, (_, i) => ({
      slotIndex: i, unlocked: i < unlocked,
      allowedLootTiers: getAllowedLootTiersForSlot(i),
      quest: i < unlocked ? generateQuestForSlot(i) : null,
    }));
  }

  // ─── Game State ───────────────────────────────────────────────────────────
  function createGameState({ playerName = "Player", startingGold = 150, playerLevel = 1 } = {}) {
    const player = createPlayerProfile({ level: playerLevel, xp: 0 });
    return {
      playerName,
      player: { ...player, gold: startingGold },
      season: null, army: createArmy([]), vault: [],
      selectedQuestId: null, selectedTeamIds: [],
      currentAdventure: null, adventureLog: [],
      achievements: { unlocked: [] },
      lastSeasonUpkeep: null, lastQuestSummary: null,
      settings: { difficulty: "Normal" },
    };
  }

  function generateSeason(gameState) {
    const next = clone(gameState);
    const num = (next.season?.number || 0) + 1;
    const upkeep = getArmyUpkeepTotal(next.army);
    const goldBefore = next.player.gold;
    next.player.gold = Math.max(0, next.player.gold - upkeep);
    next.lastSeasonUpkeep = { seasonNumber: num, total: upkeep, goldBefore, goldAfter: next.player.gold };
    next.season = {
      id: createId("season"), number: num,
      questBoard: generateQuestBoardForPlayer(next.player),
      recruitPool: generateRecruitPool(next.player, 4),
    };
    next.selectedQuestId = null;
    next.selectedTeamIds = [];
    return next;
  }

  function repairState(state) {
    state = (state && typeof state === "object") ? state : {};
    state.player = state.player || {};
    if (typeof state.player.level !== "number" || state.player.level < 1) state.player.level = 1;
    if (typeof state.player.xp    !== "number" || state.player.xp < 0)   state.player.xp = 0;
    if (typeof state.player.gold  !== "number" || isNaN(state.player.gold)) state.player.gold = 150;
    if (typeof state.player.fame  !== "number" || isNaN(state.player.fame)) state.player.fame = 0;
    state.army              = (state.army && Array.isArray(state.army.gnomes)) ? state.army : { gnomes: [] };
    state.vault             = Array.isArray(state.vault)             ? state.vault             : [];
    state.selectedTeamIds   = Array.isArray(state.selectedTeamIds)   ? state.selectedTeamIds   : [];
    state.adventureLog      = Array.isArray(state.adventureLog)      ? state.adventureLog      : [];
    state.achievements      = state.achievements || { unlocked: [] };
    if (!Array.isArray(state.achievements.unlocked)) state.achievements.unlocked = [];
    state.settings          = state.settings || {};
    state.settings.difficulty = ["Easy","Normal","Hard","Insane"].includes(state.settings.difficulty)
      ? state.settings.difficulty : "Normal";
    // ensure starting gold if fresh
    const fresh = state.adventureLog.length === 0 && state.army.gnomes.length === 0 && state.vault.length === 0;
    if (fresh && state.player.gold < 75) state.player.gold = 150;
    if (!state.season || !Array.isArray(state.season.questBoard)) state = generateSeason(state);
    return state;
  }

  function selectQuest(gameState, questId) {
    const next = clone(gameState);
    const all  = next.season?.questBoard?.flatMap(s => s.quest ? [s.quest] : []) || [];
    if (!all.find(q => q.id === questId)) throw new Error("Quest not found on this season's board.");
    next.selectedQuestId = questId;
    return next;
  }

  function hireGnome(gameState, gnomeId) {
    const next  = clone(gameState);
    const pool  = next.season?.recruitPool || [];
    const idx   = pool.findIndex(g => g.id === gnomeId);
    if (idx === -1) throw new Error("Recruitable gnome not found.");
    if ((next.army?.gnomes || []).length >= getMaxArmySize(next.player.level))
      throw new Error("Your army is at its current maximum size.");
    const recruit = pool[idx];
    const cost    = getHireCostForRarity(recruit.rarity);
    if (next.player.gold < cost) throw new Error("Not enough gold to hire this gnome.");
    next.player.gold -= cost;
    next.army.gnomes.push(recruit);
    next.season.recruitPool.splice(idx, 1);
    return next;
  }

  function assignBattleTeam(gameState, gnomeIds) {
    const next = clone(gameState);
    const team = next.army.gnomes.filter(g => gnomeIds.includes(g.id));
    if (team.length !== 3) throw new Error("Exactly 3 gnomes must be selected.");
    next.selectedTeamIds = [...gnomeIds];
    return next;
  }

  function getSelectedQuest(gs) {
    for (const slot of gs.season?.questBoard || []) if (slot.quest?.id === gs.selectedQuestId) return slot.quest;
    return null;
  }
  function getSelectedTeam(gs) {
    return gs.army.gnomes.filter(g => gs.selectedTeamIds.includes(g.id));
  }

  // ─── Scene Generation ─────────────────────────────────────────────────────
  function getChallengeTypeFromSceneType(t) {
    return ({combat:"Combat",mind:"Puzzle",skill:"Trap",luck:"Hazard",quirk:"Chaos",team:"Coordination"})[t] || "Challenge";
  }
  function getSceneTags(t) {
    return ({
      combat: ["hostile","danger","pressure"],
      mind:   ["ancient","riddle","arcane"],
      skill:  ["mechanical","timed","unstable"],
      luck:   ["hazard","swingy","uncertain"],
      quirk:  ["weird","chaotic","volatile"],
      team:   ["coordinated","multi-step","group"],
    })[t] || ["general"];
  }

  function generateScene(quest, idx, forcedType) {
    const type = forcedType || pickRandom(GnomeStats);
    const difficulty = Math.max(1, quest.challengeRating + randomInt(-1, 2));
    const names = {
      combat: ["Ambush at the Gate","Tunnel Skirmish","Broken Wall Clash"],
      mind:   ["Rune Puzzle","Ancient Lock","Whispering Map"],
      skill:  ["Collapsing Mechanism","Needle Trap Hall","Flooded Gear Room"],
      luck:   ["Swinging Bridge","Falling Rubble","Shifting Fog"],
      quirk:  ["Cursed Laughing Idol","Unstable Potion Echo","Mischief Wisp"],
      team:   ["Heavy Portcullis","Split-Path Relay","Rescue Under Pressure"],
    };
    return { id: createId("scene"), sceneIndex: idx, type, difficulty, description: pickRandom(names[type] || ["Unknown Scene"]) };
  }

  // ─── Scene Options ────────────────────────────────────────────────────────
  function createSceneOptions(scene) {
    const t = scene.type;
    const norm = opt => ({ ...opt, challengeType: getChallengeTypeFromSceneType(t), tags: getSceneTags(t), id: createId("option") });

    const table = {
      combat: [
        norm({ title:"Hold the Line",    approach:"Protect the formation and grind the enemy down safely.",           preferredStats:["combat","team"],           preferredTypes:["Warrior","Scholar","Philosopher"],     preferredSkills:["guard","hold the line","inspire","ward"],             preferredGearTags:["shield","heavy","amulet"],    teamworkStyle:"coordinated", scoreProfile:5,xpProfile:2,lootProfile:2,luckProfile:1,quirkProfile:1,riskProfile:1, scoreModifier:3, xpModifier:0.8,  lootModifier:0.8,  goldModifier:0.9,  luckScaling:0.8,  quirkScaling:0.7,  failPenalty:0.7  }),
        norm({ title:"Execute the Plan", approach:"Balance force, timing, and support to win cleanly.",               preferredStats:["combat","mind","team"],     preferredTypes:["Warrior","Archer","Engineer"],          preferredSkills:["quick shot","guard","repair","turret"],              preferredGearTags:["weapon","focus","shield"],    teamworkStyle:"paired",      scoreProfile:3,xpProfile:3,lootProfile:3,luckProfile:2,quirkProfile:2,riskProfile:3, scoreModifier:1, xpModifier:1.0,  lootModifier:1.0,  goldModifier:1.0,  luckScaling:1.0,  quirkScaling:1.0,  failPenalty:1.0  }),
        norm({ title:"Arcane Gamble",     approach:"Break the fight open with dangerous power and risky improvisation.",preferredStats:["mind","quirk","luck"],     preferredTypes:["Mage","Spirit Mage","Alchemist"],       preferredSkills:["arcane bolt","echo pulse","bomb toss","blessing"],   preferredGearTags:["focus","amulet","oddity"],   teamworkStyle:"volatile",    scoreProfile:2,xpProfile:5,lootProfile:5,luckProfile:5,quirkProfile:5,riskProfile:5, scoreModifier:-1,xpModifier:1.35,lootModifier:1.35,goldModifier:1.2,  luckScaling:1.7,  quirkScaling:1.8,  failPenalty:1.4  }),
      ],
      mind: [
        norm({ title:"Study the Pattern",   approach:"Read the clues, decode the logic, and solve it properly.",          preferredStats:["mind"],                    preferredTypes:["Scholar","Philosopher","Mage"],         preferredSkills:["analysis","lore recall","puzzle solve","insight"],   preferredGearTags:["book","focus","lens"],       teamworkStyle:"coordinated", scoreProfile:5,xpProfile:3,lootProfile:2,luckProfile:1,quirkProfile:1,riskProfile:1, scoreModifier:3, xpModifier:0.9,  lootModifier:0.85, goldModifier:0.9,  luckScaling:0.7,  quirkScaling:0.7,  failPenalty:0.7  }),
        norm({ title:"Tinker a Workaround", approach:"Use tools and creativity to bypass the intended solution.",          preferredStats:["mind","skill"],             preferredTypes:["Engineer","Rogue","Alchemist"],         preferredSkills:["tinker","repair","lockpick","brew"],                 preferredGearTags:["tools","rope","kit"],        teamworkStyle:"paired",      scoreProfile:3,xpProfile:3,lootProfile:3,luckProfile:2,quirkProfile:2,riskProfile:3, scoreModifier:1, xpModifier:1.0,  lootModifier:1.0,  goldModifier:1.0,  luckScaling:1.0,  quirkScaling:1.0,  failPenalty:1.0  }),
        norm({ title:"Try the Weird Shortcut",approach:"Bet on strange insight, bold guesses, and eccentric genius.",    preferredStats:["luck","quirk","mind"],      preferredTypes:["Philosopher","Spirit Mage","Rogue"],    preferredSkills:["moral confusion","haunt sense","vanish","insight"],  preferredGearTags:["oddity","charm","ring"],     teamworkStyle:"chaotic",     scoreProfile:2,xpProfile:5,lootProfile:4,luckProfile:5,quirkProfile:5,riskProfile:5, scoreModifier:-1,xpModifier:1.3, lootModifier:1.25, goldModifier:1.1,  luckScaling:1.8,  quirkScaling:1.8,  failPenalty:1.5  }),
      ],
      skill: [
        norm({ title:"Disarm It Properly",    approach:"Neutralize the mechanism with careful technique.",                preferredStats:["skill","mind"],             preferredTypes:["Rogue","Engineer","Ninja"],             preferredSkills:["trap disarm","lockpick","tinker","repair"],          preferredGearTags:["tools","precision","rope"],  teamworkStyle:"coordinated", scoreProfile:5,xpProfile:2,lootProfile:3,luckProfile:1,quirkProfile:1,riskProfile:1, scoreModifier:3, xpModifier:0.85, lootModifier:1.0,  goldModifier:0.95, luckScaling:0.8,  quirkScaling:0.7,  failPenalty:0.7  }),
        norm({ title:"Outmaneuver the Trap",   approach:"Use speed, timing, and positioning to avoid the worst of it.",   preferredStats:["skill","luck"],             preferredTypes:["Rogue","Ninja","Archer"],               preferredSkills:["sneak","shadow step","vanish","scout"],              preferredGearTags:["cloak","light","rope"],      teamworkStyle:"mobile",      scoreProfile:3,xpProfile:3,lootProfile:3,luckProfile:3,quirkProfile:2,riskProfile:3, scoreModifier:1, xpModifier:1.0,  lootModifier:1.0,  goldModifier:1.0,  luckScaling:1.2,  quirkScaling:1.0,  failPenalty:1.0  }),
        norm({ title:"Force It Open",          approach:"Blow past the mechanism and grab whatever you can.",              preferredStats:["combat","luck","quirk"],    preferredTypes:["Warrior","Alchemist","Engineer"],       preferredSkills:["bomb toss","guard","repair","cleave"],               preferredGearTags:["heavy","weapon","oddity"],   teamworkStyle:"frontline",   scoreProfile:2,xpProfile:4,lootProfile:5,luckProfile:4,quirkProfile:4,riskProfile:5, scoreModifier:-1,xpModifier:1.25,lootModifier:1.4,  goldModifier:1.2,  luckScaling:1.5,  quirkScaling:1.6,  failPenalty:1.5  }),
      ],
      luck: [
        norm({ title:"Play It Safe",     approach:"Reduce the chaos and accept smaller gains.",                          preferredStats:["mind","team"],              preferredTypes:["Scholar","Engineer","Warrior"],         preferredSkills:["analysis","repair","guard","blessing"],              preferredGearTags:["kit","amulet","shield"],     teamworkStyle:"coordinated", scoreProfile:4,xpProfile:2,lootProfile:2,luckProfile:1,quirkProfile:1,riskProfile:1, scoreModifier:2, xpModifier:0.8,  lootModifier:0.75, goldModifier:0.85, luckScaling:0.7,  quirkScaling:0.7,  failPenalty:0.6  }),
        norm({ title:"Ride the Chaos",   approach:"Take the best line you can and trust the moment.",                    preferredStats:["luck","skill","team"],      preferredTypes:["Archer","Rogue","Engineer"],            preferredSkills:["scout","vanish","quick shot","repair"],              preferredGearTags:["ring","rope","light"],       teamworkStyle:"loose",       scoreProfile:3,xpProfile:3,lootProfile:3,luckProfile:4,quirkProfile:3,riskProfile:3, scoreModifier:0, xpModifier:1.0,  lootModifier:1.0,  goldModifier:1.0,  luckScaling:1.4,  quirkScaling:1.1,  failPenalty:1.0  }),
        norm({ title:"Embrace the Mayhem",approach:"Lean fully into fortune, quirks, and improbable nonsense.",          preferredStats:["luck","quirk"],             preferredTypes:["Spirit Mage","Philosopher","Rogue"],    preferredSkills:["echo pulse","moral confusion","haunt sense","vanish"],preferredGearTags:["oddity","ring","charm"],     teamworkStyle:"chaotic",     scoreProfile:2,xpProfile:5,lootProfile:4,luckProfile:5,quirkProfile:5,riskProfile:5, scoreModifier:-2,xpModifier:1.35,lootModifier:1.25, goldModifier:1.2,  luckScaling:2.0,  quirkScaling:2.0,  failPenalty:1.6  }),
      ],
      quirk: [
        norm({ title:"Contain the Weirdness",approach:"Suppress the unstable energy before it gets worse.",              preferredStats:["mind","team"],              preferredTypes:["Scholar","Warrior","Engineer"],         preferredSkills:["analysis","hold the line","repair","ward"],          preferredGearTags:["shield","kit","focus"],      teamworkStyle:"coordinated", scoreProfile:4,xpProfile:2,lootProfile:2,luckProfile:1,quirkProfile:1,riskProfile:1, scoreModifier:2, xpModifier:0.8,  lootModifier:0.8,  goldModifier:0.9,  luckScaling:0.7,  quirkScaling:0.7,  failPenalty:0.7  }),
        norm({ title:"Channel It",           approach:"Shape the strange energy into a usable advantage.",                preferredStats:["quirk","mind","team"],      preferredTypes:["Spirit Mage","Alchemist","Mage"],       preferredSkills:["echo pulse","blessing","brew","ward"],               preferredGearTags:["amulet","focus","oddity"],   teamworkStyle:"volatile",    scoreProfile:3,xpProfile:3,lootProfile:3,luckProfile:3,quirkProfile:4,riskProfile:3, scoreModifier:0, xpModifier:1.05, lootModifier:1.05, goldModifier:1.0,  luckScaling:1.2,  quirkScaling:1.5,  failPenalty:1.0  }),
        norm({ title:"Let the Quirk Cook",   approach:"Trust bizarre habits and cursed instinct to solve the problem.",   preferredStats:["quirk","luck"],             preferredTypes:["Philosopher","Spirit Mage","Alchemist"], preferredSkills:["moral confusion","echo pulse","bomb toss","haunt sense"],preferredGearTags:["oddity","charm","ring"],  teamworkStyle:"chaotic",     scoreProfile:2,xpProfile:5,lootProfile:4,luckProfile:4,quirkProfile:5,riskProfile:5, scoreModifier:-2,xpModifier:1.35,lootModifier:1.2,  goldModifier:1.15, luckScaling:1.6,  quirkScaling:2.1,  failPenalty:1.6  }),
      ],
      team: [
        norm({ title:"Follow the Formation",approach:"Assign roles cleanly and execute a disciplined team plan.",         preferredStats:["team","mind"],              preferredTypes:["Warrior","Scholar","Philosopher"],      preferredSkills:["inspire","hold the line","analysis","guard"],        preferredGearTags:["banner","shield","focus"],   teamworkStyle:"coordinated", scoreProfile:5,xpProfile:2,lootProfile:2,luckProfile:1,quirkProfile:1,riskProfile:1, scoreModifier:3, xpModifier:0.85, lootModifier:0.85, goldModifier:0.9,  luckScaling:0.7,  quirkScaling:0.7,  failPenalty:0.7  }),
        norm({ title:"Split the Work",       approach:"Use different specialties at once and cover more angles.",          preferredStats:["team","skill"],             preferredTypes:["Engineer","Rogue","Mage"],              preferredSkills:["tinker","lockpick","ward","trap disarm"],            preferredGearTags:["tools","rope","amulet"],     teamworkStyle:"paired",      scoreProfile:3,xpProfile:3,lootProfile:3,luckProfile:2,quirkProfile:2,riskProfile:3, scoreModifier:1, xpModifier:1.0,  lootModifier:1.0,  goldModifier:1.0,  luckScaling:1.0,  quirkScaling:1.0,  failPenalty:1.0  }),
        norm({ title:"Trust Heroic Chaos",   approach:"Let everyone improvise and hope greatness somehow emerges.",        preferredStats:["luck","quirk","team"],      preferredTypes:["Archer","Rogue","Spirit Mage"],         preferredSkills:["quick shot","vanish","echo pulse","scout"],          preferredGearTags:["light","ring","oddity"],     teamworkStyle:"loose",       scoreProfile:2,xpProfile:5,lootProfile:5,luckProfile:5,quirkProfile:4,riskProfile:5, scoreModifier:-2,xpModifier:1.3, lootModifier:1.35, goldModifier:1.2,  luckScaling:1.8,  quirkScaling:1.5,  failPenalty:1.5  }),
      ],
    };
    return table[t] || [];
  }

  // ─── Scene Scoring ────────────────────────────────────────────────────────
  function scoreSceneOption(team, scene, option) {
    let statScore = 0, skillBonus = 0, typeBonus = 0, gearBonus = 0, luckBurst = 0, quirkSwing = 0, teamworkBonus = 0;
    const contributors = [];

    for (const gnome of team) {
      const stats = getEffectiveStats(gnome);
      const statC = (option.preferredStats || []).reduce((s, k) => s + (stats[k] || 0), 0);
      statScore += statC;

      const typeName = gnome.type.label.replace(/\+\+?$/, "");
      const typeC = (option.preferredTypes || []).includes(typeName) ? 2 : 0;
      typeBonus += typeC;

      const hits = (gnome.skills || []).filter(s => (option.preferredSkills || []).includes(s)).length;
      const skillC = hits > 0 ? Math.min(4, hits * 2) : 0;
      skillBonus += skillC;

      const itemStrs = Object.values(gnome.equipment || {}).filter(Boolean)
        .map(item => `${item.name} ${(item.tags||[]).join(" ")}`.toLowerCase());
      const gearC = (option.preferredGearTags || []).some(tag => itemStrs.some(s => s.includes(tag.toLowerCase()))) ? 2 : 0;
      gearBonus += gearC;

      const luckC = Math.random() < (gnome.stats.luck || 1) * 0.06 ? Math.round(2 * (option.luckScaling || 1)) : 0;
      luckBurst += luckC;

      const quirkC = Math.random() < (gnome.stats.quirk || 1) * 0.05 ? Math.round(randomInt(-1, 3) * (option.quirkScaling || 1)) : 0;
      quirkSwing += quirkC;

      contributors.push({ gnomeId: gnome.id, name: gnome.name, statContribution: statC, skillBonus: skillC, typeBonus: typeC, gearBonus: gearC, luckBonus: luckC, quirkSwing: quirkC });
    }

    const teamTotal = team.reduce((s, g) => s + g.stats.team, 0);
    const twBonuses = { coordinated:3, paired:2, frontline:2, mobile:2, loose:1, chaotic:1, volatile:1 };
    teamworkBonus = teamTotal >= 8 ? (twBonuses[option.teamworkStyle] || 1) : 0;

    const randomRoll = randomInt(1, 6);
    const score = statScore + skillBonus + typeBonus + gearBonus + teamworkBonus + luckBurst + quirkSwing + randomRoll + (option.scoreModifier || 0);
    const required = scene.difficulty * 2;
    const success = score >= required;
    let outcome = "poor";
    if (score >= required + 8)     outcome = "great";
    else if (score >= required + 3) outcome = "good";
    else if (success)               outcome = "barely";

    return {
      sceneId: scene.id, sceneIndex: scene.sceneIndex,
      challengeType: scene.challengeType, sceneType: scene.type, description: scene.description,
      optionId: option.id, optionTitle: option.title, approach: option.approach,
      statScore, skillBonus, typeBonus, gearBonus, teamworkBonus, luckBurst, quirkSwing, randomRoll,
      optionScoreModifier: option.scoreModifier || 0,
      rewardProfile: { xpModifier: option.xpModifier||1, lootModifier: option.lootModifier||1, goldModifier: option.goldModifier||1, failPenalty: option.failPenalty||1 },
      score, required, success, outcome, contributors,
      optionProfiles: { score: option.scoreProfile, xp: option.xpProfile, loot: option.lootProfile, luck: option.luckProfile, quirk: option.quirkProfile, risk: option.riskProfile },
    };
  }

  function evaluateOptionFit(team, option) {
    let statFit = 0, typeFit = 0, skillFit = 0, gearFit = 0;
    const matchedTypes  = new Set();
    const matchedSkills = new Set();
    const teamworkFit = Math.min(5, Math.max(1, Math.round(team.reduce((s,g) => s+(g.stats.team||0), 0) / 3)));

    for (const gnome of team) {
      const stats = getEffectiveStats(gnome);
      statFit += (option.preferredStats || []).reduce((s, k) => s+(stats[k]||0), 0);
      const typeName = gnome.type.label.replace(/\+\+?$/, "");
      if ((option.preferredTypes || []).includes(typeName)) matchedTypes.add(typeName);
      for (const skill of gnome.skills || []) if ((option.preferredSkills||[]).includes(skill)) matchedSkills.add(skill);
      const itemStrs = Object.values(gnome.equipment||{}).filter(Boolean).map(i=>`${i.name} ${(i.tags||[]).join(" ")}`.toLowerCase());
      if ((option.preferredGearTags||[]).some(tag=>itemStrs.some(s=>s.includes(tag.toLowerCase())))) gearFit++;
    }
    typeFit = matchedTypes.size; skillFit = matchedSkills.size;
    const statRating  = Math.max(1, Math.min(5, Math.round(statFit / Math.max(3, (option.preferredStats||[]).length*3))));
    const typeRating  = Math.max(1, Math.min(5, typeFit+1));
    const skillRating = Math.max(1, Math.min(5, skillFit+1));
    const gearRating  = Math.max(1, Math.min(5, gearFit+1));
    const overall     = Math.round((statRating+typeRating+skillRating+gearRating+teamworkFit)/5);
    return { overall, statRating, typeRating, skillRating, gearRating, teamworkFit };
  }

  // ─── Adventure Run ────────────────────────────────────────────────────────
  function createAdventureRun(gameState) {
    const quest = getSelectedQuest(gameState);
    const team  = getSelectedTeam(gameState);
    if (!quest)          throw new Error("No quest selected.");
    if (team.length!==3) throw new Error("Exactly 3 gnomes must be assigned.");
    const scenes = Array.from({ length: quest.scenes }, (_, i) => {
      const plannedType = Array.isArray(quest.scenePlan) ? quest.scenePlan[i] : null;
      const s = generateScene(quest, i, plannedType);
      s.challengeType = getChallengeTypeFromSceneType(s.type);
      s.tags    = getSceneTags(s.type);
      s.options = createSceneOptions(s);
      return s;
    });
    const next = clone(gameState);
    next.currentAdventure = {
      id: createId("run"), questId: quest.id, questName: quest.name, questRarity: quest.rarity,
      questSnapshot: clone(quest),
      targetScore: quest.targetScore, teamIds: team.map(g=>g.id),
      scenes, currentSceneIndex: 0, results: [], totalScore: 0,
      bonusTracker: { skillUses:0, typeUses:0, luckUses:0, quirkUses:0 },
      status: "in_progress",
    };
    return next;
  }

  function getCurrentScene(gs) {
    const run = gs.currentAdventure;
    if (!run || run.status !== "in_progress") return null;
    return run.scenes[run.currentSceneIndex] || null;
  }

  function getAdventureTeam(gs) {
    const run = gs.currentAdventure;
    if (!run?.teamIds?.length) return [];
    return (gs.army?.gnomes || []).filter(g => run.teamIds.includes(g.id));
  }

  function getAdventureQuest(gs) {
    const run = gs.currentAdventure;
    if (!run?.questId) return null;
    if (run.questSnapshot) return clone(run.questSnapshot);
    return getSelectedQuest(gs);
  }

  function aggregateRewardProfile(results) {
    if (!results.length) return { xpModifier:1, lootModifier:1, goldModifier:1, failPenalty:1 };
    const t = results.reduce((s,r) => ({ xpModifier:s.xpModifier+r.rewardProfile.xpModifier, lootModifier:s.lootModifier+r.rewardProfile.lootModifier, goldModifier:s.goldModifier+r.rewardProfile.goldModifier, failPenalty:s.failPenalty+r.rewardProfile.failPenalty }), { xpModifier:0,lootModifier:0,goldModifier:0,failPenalty:0 });
    const n = results.length;
    return { xpModifier:t.xpModifier/n, lootModifier:t.lootModifier/n, goldModifier:t.goldModifier/n, failPenalty:t.failPenalty/n };
  }

  function getQuestRewards(quest, success, bonusTracker = {}, rewardProfile = {}) {
    const baseGold  = quest.difficulty * 10 + getRarityIndex(quest.rarity) * 8;
    const playerXp  = getQuestXpReward(quest, success);
    const gnomeXp   = getGnomeXpReward(quest, success, bonusTracker);
    const lootCount = success ? Math.min(3, 1 + Math.floor((getRarityIndex(quest.rarity) + quest.difficulty) / 3)) : 0;
    const loot      = success ? Array.from({ length: lootCount }, () => generateDynamicLootItem(quest, rewardProfile, bonusTracker)) : [];
    return { gold: success ? baseGold : Math.floor(baseGold/3), playerXp, gnomeXp, loot };
  }

  function applyRewardProfile(baseRewards, profile, success, bonusTracker) {
    const luckBonus  = (bonusTracker.luckUses||0) * 3;
    const quirkBonus = (bonusTracker.quirkUses||0) * 3;
    const r = {
      gold:      Math.floor(baseRewards.gold      * profile.goldModifier),
      playerXp:  Math.floor(baseRewards.playerXp  * profile.xpModifier),
      gnomeXp:   Math.floor(baseRewards.gnomeXp   * profile.xpModifier),
      loot:      [...(baseRewards.loot || [])],
    };
    if (!success) {
      r.gold     = Math.max(0, Math.floor(r.gold     / profile.failPenalty));
      r.playerXp = Math.max(0, Math.floor(r.playerXp / profile.failPenalty));
      r.gnomeXp  = Math.max(0, Math.floor(r.gnomeXp  / profile.failPenalty));
    }
    r.playerXp += luckBonus + quirkBonus;
    r.gnomeXp  += luckBonus + quirkBonus;
    r.gold     += luckBonus;
    return r;
  }

  function applyQuestRewards(gameState, rewards) {
    const next = clone(gameState);
    next.player.gold  += rewards.gold;
    next.player.xp    += rewards.playerXp;
    next.player = levelUpPlayer(next.player);
    next.vault.push(...rewards.loot);
    next.army.gnomes = next.army.gnomes.map(g => {
      if (!next.selectedTeamIds.includes(g.id)) return g;
      return levelUpGnome(addXp(g, rewards.gnomeXp));
    });
    return next;
  }

  function resolveSceneChoice(gameState, optionId) {
    const next = clone(gameState);
    const run  = next.currentAdventure;
    if (!run || run.status !== "in_progress") throw new Error("No active adventure.");
    const scene  = run.scenes[run.currentSceneIndex];
    if (!scene) throw new Error("No active scene.");
    const option = (scene.options||[]).find(o => o.id === optionId);
    if (!option) throw new Error("Option not found.");

    const team   = getAdventureTeam(next);
    if (team.length !== 3) throw new Error("Adventure team is no longer valid.");
    const result = scoreSceneOption(team, scene, option);
    run.results.push(result);
    run.totalScore += result.score;
    run.currentSceneIndex += 1;

    if (result.success) {
      if (result.skillBonus > 0)  run.bonusTracker.skillUses++;
      if (result.typeBonus  > 0)  run.bonusTracker.typeUses++;
      if (result.luckBurst  > 0)  run.bonusTracker.luckUses++;
      if (result.quirkSwing > 0)  run.bonusTracker.quirkUses++;
    }

    if (run.currentSceneIndex >= run.scenes.length) {
      const success       = run.totalScore >= run.targetScore;
      const rewardProfile = aggregateRewardProfile(run.results);
      const questForRewards = getAdventureQuest(next);
      const baseRewards   = getQuestRewards(questForRewards, success, run.bonusTracker, rewardProfile);
      const rewards       = applyRewardProfile(baseRewards, rewardProfile, success, run.bonusTracker);
      const rewarded      = applyQuestRewards(next, rewards);
      const narrativeImpact = buildNarrativeSummary(run.questName, success, run.bonusTracker, run.results);
      const summaryExtras   = getQuestSummaryExtras({ scenes: run.results });
      const logEntry = {
        id: createId("log"), seasonNumber: rewarded.season?.number||0,
        questId: run.questId, questName: run.questName, teamIds: [...run.teamIds],
        success, totalScore: run.totalScore, targetScore: run.targetScore,
        scenes: [...run.results], rewards, rewardProfile,
        bonusTracker: { ...run.bonusTracker },
        gnomeXpGains: team.map(g => ({ gnomeId:g.id, name:g.name, xpGained:rewards.gnomeXp })),
        narrativeImpact, summaryExtras,
      };
      rewarded.adventureLog.push(logEntry);
      rewarded.lastQuestSummary = logEntry;
      rewarded.currentAdventure = { ...run, status:"complete", success, rewards, rewardProfile };
      const advancedSeason = generateSeason(rewarded);
      advancedSeason.currentAdventure = rewarded.currentAdventure;
      advancedSeason.lastQuestSummary = rewarded.lastQuestSummary;
      return checkAchievements(advancedSeason, logEntry);
    }
    return next;
  }

  // ─── Loot ─────────────────────────────────────────────────────────────────
  function buildLootStatModifiers(pool, itemBaseName, tier) {
    const statNames = ["combat","mind","skill","luck","quirk","team"];
    const statCount = tier === "Legendary" ? 3 : tier === "Epic" ? 2 : 1;
    const statMods  = {};
    const magicalNames = ["Wand","Staff"];
    const isMagicalWeapon = magicalNames.some(name => itemBaseName.includes(name));
    const guaranteedStat =
      pool.slotType === "shield" ? "combat" :
      (pool.slotType === "one_handed" || pool.slotType === "two_handed")
        ? (isMagicalWeapon ? "mind" : "combat")
        : null;

    if (guaranteedStat) {
      statMods[guaranteedStat] = statCount;
      return statMods;
    }

    for (let i = 0; i < statCount; i++) {
      const stat = statNames[Math.floor(Math.random() * statNames.length)];
      statMods[stat] = (statMods[stat] || 0) + 1;
    }
    return statMods;
  }

  function generateDynamicLootItem(quest, rewardProfile = {}, bonusTracker = {}) {
    const slotPool = [
      { slotType:"one_handed", names:["Sword","Dagger","Bow","Hammer","Wand"],     tags:["weapon","light","precise","heavy"] },
      { slotType:"two_handed", names:["Staff","Great Hammer","Longbow"],             tags:["weapon","focus","heavy","precise"] },
      { slotType:"shield",     names:["Shield","Buckler","Ward Plate"],             tags:["shield","guard","heavy"] },
      { slotType:"amulet",     names:["Amulet","Charm","Pendant","Totem"],          tags:["amulet","focus","arcane","charm"] },
      { slotType:"ring",       names:["Ring","Band","Loop","Seal"],                 tags:["ring","lucky","ancient","precise"] },
    ];
    const rarityIndex  = Math.max(0, Rarity.indexOf(quest.lootTier));
    const pressure     = (rewardProfile.lootModifier||1) + ((bonusTracker.luckUses||0)*0.08) + ((bonusTracker.quirkUses||0)*0.08);
    const finalIndex   = pressure >= 1.25 ? Math.min(4, rarityIndex+1) : rarityIndex;
    const tier         = Rarity[finalIndex];
    const pool         = slotPool[Math.floor(Math.random() * slotPool.length)];
    const itemBaseName = pickRandom(pool.names);
    const name         = `${tier} ${itemBaseName}`;
    const tags         = [pickRandom(pool.tags)];
    const statMods     = buildLootStatModifiers(pool, itemBaseName, tier);
    return {
      id: `loot_${Math.random().toString(36).slice(2,10)}`,
      name, tier, slotType: pool.slotType, tags, statModifiers: statMods,
      power: Object.values(statMods).reduce((a,b)=>a+b, 0),
    };
  }

  // ─── Equipment management ─────────────────────────────────────────────────
  function equipVaultItemToGnome(gameState, gnomeId, itemId, slotName) {
    const next  = clone(gameState);
    const gnome = next.army.gnomes.find(g => g.id === gnomeId);
    if (!gnome) throw new Error("Gnome not found.");
    const itemIdx = (next.vault||[]).findIndex(i => i.id === itemId);
    if (itemIdx === -1) throw new Error("Vault item not found.");
    const item = next.vault[itemIdx];
    const weaponSlots = ["weapon1","weapon2"];
    const ringSlots   = ["ring1","ring2"];
    const valid =
      (slotName === "amulet"           && item.slotType === "amulet") ||
      (ringSlots.includes(slotName)    && item.slotType === "ring") ||
      (weaponSlots.includes(slotName)  && ["one_handed","two_handed","shield"].includes(item.slotType));
    if (!valid) throw new Error("Item cannot go in that slot.");
    if (!gnome.equipment) gnome.equipment = createEmptyEquipment();
    next.vault.splice(itemIdx, 1);
    if (item.slotType === "two_handed") {
      if (gnome.equipment.weapon1) next.vault.push(gnome.equipment.weapon1);
      if (gnome.equipment.weapon2 && !gnome.equipment.weapon2.mirrored) next.vault.push(gnome.equipment.weapon2);
      gnome.equipment.weapon1 = item;
      gnome.equipment.weapon2 = { ...item, mirrored: true };
    } else {
      const existing = gnome.equipment[slotName];
      if (existing && !existing.mirrored) next.vault.push(existing);
      gnome.equipment[slotName] = item;
    }
    return next;
  }

  function unequipGnomeItem(gameState, gnomeId, slotName) {
    const next  = clone(gameState);
    const gnome = next.army.gnomes.find(g => g.id === gnomeId);
    if (!gnome?.equipment?.[slotName]) throw new Error("No item equipped there.");
    const item = gnome.equipment[slotName];
    gnome.equipment[slotName] = null;
    if (item && !item.mirrored) next.vault.push(item);
    if (slotName === "weapon1" && gnome.equipment.weapon2?.mirrored) gnome.equipment.weapon2 = null;
    if (slotName === "weapon2" && gnome.equipment.weapon1?.mirrored) gnome.equipment.weapon1 = null;
    return next;
  }

  // ─── Narrative ────────────────────────────────────────────────────────────
  function buildNarrativeSummary(questName, success, bonusTracker, scenes) {
    const quirk = bonusTracker?.quirkUses || 0;
    const luck  = bonusTracker?.luckUses  || 0;
    if (success  && quirk >= 2) return `${questName} was somehow saved by repeated bursts of deeply questionable gnome behavior.`;
    if (success  && luck  >= 2) return `${questName} succeeded on a wave of outrageous luck and even more outrageous confidence.`;
    if (success)                return `${questName} ended in victory after a series of hard-won scenes, suspicious plans, and at least one preventable mistake.`;
    if (!success && quirk >= 2) return `${questName} collapsed into comic disaster after too many quirks fired at exactly the wrong time.`;
    if (!success && luck  === 0)return `${questName} fell apart when the team ran out of answers, momentum, and probably common sense.`;
    return `${questName} became a noble failure full of bad timing, risky calls, and unforgettable gnome energy.`;
  }

  function getQuestSummaryExtras(log) {
    const scenes = log?.scenes || [];
    const successfulScenes = scenes.filter(s => s.success).length;
    const bestScene  = scenes.reduce((b,s) => (!b || s.score > b.score) ? s : b, null);
    const worstScene = scenes.reduce((w,s) => (!w || s.score < w.score) ? s : w, null);
    return { successfulScenes, failedScenes: scenes.length - successfulScenes, bestScene, worstScene };
  }

  // ─── Achievements ─────────────────────────────────────────────────────────
  const AchievementDefs = [
    { id:"first_quest",      name:"First Foot Forward",    desc:"Complete your first quest.",                       fame:5,  check:(s,l) => !!l },
    { id:"first_victory",    name:"Tiny Triumph",           desc:"Win your first quest.",                            fame:8,  check:(s,l) => !!l?.success },
    { id:"first_rare_loot",  name:"Shiny Problem",          desc:"Bring home Rare or better loot.",                 fame:10, check:(s,l) => (l?.rewards?.loot||[]).some(i=>["Rare","Epic","Legendary"].includes(i.tier)) },
    { id:"quirk_chain",      name:"Questionable Decisions", desc:"Trigger quirks 3+ times in one run.",             fame:12, check:(s,l) => (l?.bonusTracker?.quirkUses||0)>=3 },
    { id:"luck_chain",       name:"Ridiculous Fortune",     desc:"Trigger luck 3+ times in one run.",               fame:12, check:(s,l) => (l?.bonusTracker?.luckUses||0)>=3 },
    { id:"level3_gnome",     name:"Getting Serious",        desc:"Raise a gnome to level 3.",                       fame:10, check:(s)  => (s.army?.gnomes||[]).some(g=>g.level>=3) },
    { id:"plus_type",        name:"Promoted!",              desc:"Upgrade a gnome type to +.",                      fame:12, check:(s)  => (s.army?.gnomes||[]).some(g=>(g.type?.rank||0)>=1) },
    { id:"plusplus_type",    name:"Veteran Trouble",        desc:"Upgrade a gnome type to ++.",                     fame:20, check:(s)  => (s.army?.gnomes||[]).some(g=>(g.type?.rank||0)>=2) },
    { id:"hard_win",         name:"Hard Way Home",          desc:"Win on Hard difficulty.",                         fame:18, check:(s,l)=> s.settings?.difficulty==="Hard" && !!l?.success },
    { id:"insane_win",       name:"Legendary Nonsense",     desc:"Win on Insane difficulty.",                       fame:30, check:(s,l)=> s.settings?.difficulty==="Insane" && !!l?.success },
    { id:"full_army",        name:"Organized Chaos",        desc:"Fill your army to its maximum size.",             fame:15, check:(s)  => (s.army?.gnomes||[]).length >= getMaxArmySize(s.player.level) },
    { id:"vault_5",          name:"Hoarder Instinct",       desc:"Collect 5 items in the vault.",                   fame:10, check:(s)  => (s.vault||[]).length >= 5 },
    { id:"season_3",         name:"Survived Three Seasons", desc:"Reach season 3.",                                 fame:20, check:(s)  => (s.season?.number||0) >= 3 },
  ];

  function checkAchievements(state, latestLog) {
    const next = clone(state);
    next.achievements = next.achievements || { unlocked: [] };
    if (!Array.isArray(next.achievements.unlocked)) next.achievements.unlocked = [];
    next.lastUnlockedAchievements = [];
    for (const def of AchievementDefs) {
      if (next.achievements.unlocked.includes(def.id)) continue;
      try {
        if (def.check(next, latestLog)) {
          next.achievements.unlocked.push(def.id);
          next.player.fame = (next.player.fame || 0) + def.fame;
          next.lastUnlockedAchievements.push({ id: def.id, name: def.name, fame: def.fame });
        }
      } catch(_) {}
    }
    return next; // return full state so lastUnlockedAchievements is preserved
  }

  // ─── Player progress helpers ──────────────────────────────────────────────
  function getPlayerLevelProgress(player) {
    const nextReq = getPlayerXpRequiredForNextLevel(player.level);
    const prevReq = player.level <= 1 ? 0 : player.level * 100;
    const current = Math.max(0, player.xp - prevReq);
    const needed  = Math.max(1, nextReq - prevReq);
    return { current, needed, percent: Math.max(0, Math.min(100, Math.round((current/needed)*100))), nextReq };
  }

  function getSeasonStateSummary(state) {
    const selectedQuest = getSelectedQuest(state);
    const selectedTeam  = getSelectedTeam(state);
    const latest        = state.adventureLog?.[state.adventureLog.length-1] || null;
    return {
      seasonNumber:      state.season?.number || 0,
      selectedQuestName: selectedQuest ? selectedQuest.name : "None",
      selectedTeamNames: selectedTeam.map(g=>g.name),
      latest,
      upkeep:   getArmyUpkeepTotal(state.army),
      armyMax:  getMaxArmySize(state.player.level),
    };
  }

  // ─── Export ───────────────────────────────────────────────────────────────
  const GAME_VERSION = "7.3.4";

  global.GameEngine = {
    version: GAME_VERSION,
    // Constants
    GnomeStats, GnomeBaseTypes, TypeRanks, Rarity, LootTier, AchievementDefs,
    // Gnome / army
    createType, createGnome, createRecruitableGnome, createArmy,
    getEffectiveStats, getMaxArmySize, getGnomeSeasonUpkeep, getArmyUpkeepTotal, removeArmyGnome,
    getBaseStatsForType, getSkillsForType, getPreferredStatsForType,
    // XP / leveling
    addXp, levelUpGnome, levelUpPlayer,
    getPlayerXpRequiredForNextLevel, getPlayerLevelProgress,
    // Player
    createPlayerProfile, getUnlockedQuestSlotCount,
    // Recruit
    generateRecruitableGnome, generateRecruitPool, getHireCostForRarity,
    // Quests
    getAllowedLootTiersForSlot, getSceneCountForQuest, getChallengeRatingForQuest, getTargetScoreForQuest,
    getQuestXpReward, getGnomeXpReward, getRarityIndex,
    // State
    createGameState, generateSeason, repairState, selectQuest, hireGnome, assignBattleTeam,
    removeArmyGnome, getSelectedQuest, getSelectedTeam, getSeasonStateSummary,
    // Adventure
    createAdventureRun, getCurrentScene, getAdventureTeam, getAdventureQuest, resolveSceneChoice, scoreSceneOption, evaluateOptionFit,
    // Rewards / loot
    getQuestRewards, applyQuestRewards, generateDynamicLootItem,
    // Equipment
    equipVaultItemToGnome, unequipGnomeItem,
    // Narrative
    buildNarrativeSummary, getQuestSummaryExtras,
    // Achievements
    AchievementDefs, checkAchievements,
    // Utils
    createId, clone, randomInt, pickRandom,
  };

})(window);
