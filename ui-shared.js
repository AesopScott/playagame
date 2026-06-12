/**
 * Game of Gnomes — UI Shared v7.4.3
 * Storage, helpers, status bar, nav, equip controls.
 * Load AFTER engine.js on every page.
 */
(function (global) {
  "use strict";

  const STORAGE_KEY = "gogGameStateV2";

  // ─── Storage ──────────────────────────────────────────────────────────────
  function saveState(state) { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

  function loadState() {
    let state = null;
    try { state = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch(_) {}
    state = GameEngine.repairState(state);
    saveState(state);
    return state;
  }

  function setState(next) { saveState(next); return next; }

  // ─── Toast ────────────────────────────────────────────────────────────────
  function toast(msg, isError) {
    const container = document.getElementById("toast-container");
    if (!container) { console.warn(msg); return; }
    const el = document.createElement("div");
    el.className = "gog-toast" + (isError ? " error" : "");
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3400);
  }

  // ─── HTML escape ──────────────────────────────────────────────────────────
  function esc(v) {
    return String(v).replace(/[&<>"']/g, s =>
      ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[s]);
  }

  // ─── Stat / trait formatting ──────────────────────────────────────────────
  const STAT_META = {
    combat: { symbol:"⚔", label:"Combat" },
    mind:   { symbol:"🧠", label:"Mind" },
    skill:  { symbol:"🛠", label:"Skill" },
    luck:   { symbol:"☘", label:"Luck" },
    quirk:  { symbol:"✦", label:"Quirk" },
    team:   { symbol:"🤝", label:"Team" },
  };

  const SKILL_DESCRIPTIONS = {
    "guard":"Protects allies and reduces frontline pressure.",
    "cleave":"Hits hard and can power through clustered threats.",
    "shield bash":"Staggers enemies and creates breathing room.",
    "hold the line":"Improves formation stability during rough scenes.",
    "quick shot":"Fast ranged attack that helps finish threats early.",
    "eagle eye":"Improves aim, scouting, and long-range reads.",
    "pinning arrow":"Slows or disrupts enemies before they close in.",
    "scout":"Spots danger, shortcuts, and useful openings.",
    "arcane bolt":"Reliable burst of focused magical damage.",
    "ward":"Creates magical protection against harm or chaos.",
    "spark burst":"Short explosive magic burst for crowd control.",
    "mana focus":"Stabilizes spellcasting and improves magical output.",
    "spirit ward":"Protects the team from eerie or supernatural effects.",
    "haunt sense":"Detects ghosts, curses, hidden weirdness, and bad vibes.",
    "echo pulse":"Releases unstable spirit energy with swingy results.",
    "blessing":"Adds a little luck, safety, or mystical support.",
    "sneak":"Helps move unseen and avoid direct confrontation.",
    "lockpick":"Opens sealed paths, chests, and tricky mechanisms.",
    "backstab":"Big payoff when striking from surprise or advantage.",
    "trap disarm":"Safely neutralizes traps and dangerous mechanisms.",
    "shadow step":"Rapid repositioning through stealth and timing.",
    "silent strike":"Clean, quiet takedown with minimal alarm.",
    "vanish":"Escape notice or slip out of danger at the last second.",
    "poison sense":"Detects toxins, tainted air, and suspicious substances.",
    "tinker":"Builds, tweaks, or hacks together a practical solution.",
    "turret":"Deploys a gadget that adds steady support fire.",
    "repair":"Fixes gear, devices, and broken mechanisms.",
    "brew":"Mixes useful compounds, tonics, or weird concoctions.",
    "bomb toss":"Big explosive payoff with some built-in chaos.",
    "acid vial":"Melts through armor, locks, or stubborn obstacles.",
    "smoke flask":"Blocks vision and creates an opening to reposition.",
    "lore recall":"Pulls up obscure knowledge when it matters.",
    "analysis":"Breaks down patterns, risks, and puzzle logic.",
    "scribe":"Records clues and helps keep complex plans organized.",
    "puzzle solve":"Excels at logic challenges and structured problems.",
    "debate":"Wins arguments, stalls enemies, or changes a situation socially.",
    "inspire":"Boosts morale and helps the team work together.",
    "insight":"Reads motives, patterns, and hidden meaning quickly.",
    "moral confusion":"Creates bizarre but sometimes useful uncertainty.",
  };

  const QUIRK_DESCRIPTIONS = {
    "overconfident":"Acts like the plan is already working, for better or worse.",
    "presses every button":"Cannot resist touching mysterious devices or switches.",
    "collects shiny rocks":"Gets distracted by treasure, trinkets, and sparkly nonsense.",
    "argues with statues":"Treats suspicious landmarks like they are part of the conversation.",
    "easily distracted":"May lose focus when anything interesting happens nearby.",
    "dramatic whisperer":"Narrates stealth like it is a stage performance.",
    "improvises too much":"Solves problems with confidence before checking the plan.",
    "suspicious of soup":"Distrusts anything warm, mixed, or oddly aromatic.",
    "laughs during danger":"Gets weirdly cheerful when things are clearly going wrong.",
    "cursed optimism":"Assumes disaster will somehow work out beautifully.",
  };

  function fmtStats(stats) {
    return Object.entries(STAT_META).map(([key, meta]) =>
      `<span title="${meta.label}" aria-label="${meta.label} ${stats[key]}">${meta.symbol}${stats[key]}</span>`
    ).join(" ");
  }

  function renderStatLegend() {
    return `<div class="paper" style="height:100%;">
      <h3>Stat Symbol Legend</h3>
      <div class="info-list">
        ${Object.values(STAT_META).map(meta => `<div class="info-row"><strong>${meta.symbol}</strong><span>${meta.label}</span></div>`).join("")}
      </div>
      <p class="muted" style="margin-top:10px;">These symbols match the gnome cards, so you can read stats at a glance.</p>
    </div>`;
  }

  function renderTraitList(list, kind) {
    const items = Array.isArray(list) ? list : [];
    if (!items.length) return "None";
    const source = kind === "quirk" ? QUIRK_DESCRIPTIONS : SKILL_DESCRIPTIONS;
    return items.map(item => {
      const desc = source[item] || `${kind === "quirk" ? "Quirk" : "Skill"}: ${item}.`;
      return `<span title="${esc(desc)}">${esc(item)}</span>`;
    }).join(", ");
  }

  function rarityClass(v) { return `rarity-${String(v||"").toLowerCase()}`; }

  function stars(n) { return "★".repeat(Math.max(1,n)) + "☆".repeat(Math.max(0,5-n)); }

  // ─── Slot helpers ─────────────────────────────────────────────────────────
  function slotLabel(slot) {
    return ({weapon1:"Weapon 1",weapon2:"Weapon 2",amulet:"Amulet",ring1:"Ring 1",ring2:"Ring 2"})[slot] || slot;
  }
  function vaultItemsForSlot(vault, slot) {
    return (vault||[]).filter(item => {
      if (slot==="amulet")                  return item.slotType==="amulet";
      if (slot==="ring1"||slot==="ring2")   return item.slotType==="ring";
      if (slot==="weapon1"||slot==="weapon2") return ["one_handed","two_handed","shield"].includes(item.slotType);
      return false;
    });
  }

  // ─── Best vault upgrade ───────────────────────────────────────────────────
  function bestVaultUpgrade(vault, gnome) {
    const items = vault || [];
    let best = null, bestScore = -Infinity;
    for (const item of items) {
      const score = Object.values(item.statModifiers||{}).reduce((a,b)=>a+b, 0);
      if (score > bestScore) { best = item; bestScore = score; }
    }
    return best ? { item: best, score: bestScore } : null;
  }

  function describeItemDelta(currentItem, newItem) {
    const cur  = currentItem?.statModifiers || {};
    const next = newItem?.statModifiers || {};
    const stats = Array.from(new Set([...Object.keys(cur),...Object.keys(next)]));
    const deltas = stats.map(s => { const d=(next[s]||0)-(cur[s]||0); return d!==0?`${d>0?"+":""}${d} ${s}`:null; }).filter(Boolean);
    return deltas.length ? deltas.join(", ") : "No stat change";
  }

  // ─── Equipment summary ────────────────────────────────────────────────────
  function renderEquipmentSummary(gnome) {
    const eq = gnome.equipment || {};
    return `<div class="info-list" style="margin-top:10px;">
      ${["weapon1","weapon2","amulet","ring1","ring2"].map(slot => `
        <div class="info-row">
          <strong>${slotLabel(slot)}</strong>
          <span>${eq[slot] ? esc(eq[slot].name) : "Empty"}</span>
        </div>`).join("")}
    </div>`;
  }

  // ─── Equip controls ───────────────────────────────────────────────────────
  function renderEquipControls(state, gnome, compact = false) {
    const slots = ["weapon1","weapon2","amulet","ring1","ring2"];
    return `<div class="equip-section">${slots.map(slot => {
      const options  = vaultItemsForSlot(state.vault, slot);
      const equipped = gnome.equipment?.[slot];
      return `<div style="margin-bottom:10px;">
        <div class="equip-slot-label">${slotLabel(slot)}</div>
        ${equipped
          ? `<div class="equip-slot-equipped">⚔ ${esc(equipped.name)}</div>
             <button class="secondary-btn" data-unequip="${gnome.id}|${slot}">Unequip</button>`
          : `<div class="equip-slot-empty">Empty</div>`}
        <div style="margin-top:5px;">
          ${options.length
            ? options.map(item => `<button class="secondary-btn" data-equip="${gnome.id}|${slot}|${item.id}" style="margin:0 4px 4px 0;">Equip ${esc(item.name)}</button>`).join("")
            : `<div class="muted">${compact?"No vault items.":"No matching items in vault."}</div>`}
        </div>
      </div>`;
    }).join("")}</div>`;
  }

  // ─── Upgrade suggestion box ───────────────────────────────────────────────
  function renderUpgradeBox(vault, gnome) {
    const best = bestVaultUpgrade(vault, gnome);
    if (!best) return `<div class="muted" style="margin-top:10px;font-size:13px;">No vault upgrades available.</div>`;
    return `<div class="upgrade-box">
      <strong>⬆ Best Vault Upgrade</strong>
      <div>${esc(best.item.name)}</div>
      <div class="muted">${esc(describeItemDelta(null, best.item))}</div>
    </div>`;
  }

  // ─── Global status bar ────────────────────────────────────────────────────
  function renderGlobalSummary(state) {
    document.querySelectorAll("[data-global-summary]").forEach(node => {
      const quest    = GameEngine.getSelectedQuest(state);
      const upkeep   = GameEngine.getArmyUpkeepTotal(state.army);
      const progress = GameEngine.getPlayerLevelProgress(state.player);
      node.innerHTML = [
        `<span class="status-chip">S${state.season?.number??0}</span>`,
        `<span class="status-chip">Lv ${state.player.level}</span>`,
        `<span class="status-chip">XP ${progress.current}/${progress.needed}</span>`,
        `<span class="status-chip gold-chip">⚜ ${state.player.gold}g</span>`,
        `<span class="status-chip">Army ${(state.army?.gnomes||[]).length}/${GameEngine.getMaxArmySize(state.player.level)}</span>`,
        `<span class="status-chip">Upkeep ${upkeep}</span>`,
        `<span class="status-chip">Quest: ${quest ? esc(quest.name) : "None"}</span>`,
        `<span class="status-chip">Team: ${state.selectedTeamIds.length}/3</span>`,
        state.player.fame ? `<span class="status-chip">Fame ${state.player.fame}</span>` : "",
      ].join("");
    });
  }

  // ─── State clarity panel ──────────────────────────────────────────────────
  function renderStateClarityPanel(state) {
    const summary  = GameEngine.getSeasonStateSummary(state);
    const progress = GameEngine.getPlayerLevelProgress(state.player);
    const latest   = summary.latest;
    return `<div class="paper" style="margin-bottom:18px;">
      <h3>Season ${summary.seasonNumber} Overview</h3>
      <div class="info-list">
        <div class="info-row"><strong>Quest</strong><span>${esc(summary.selectedQuestName)}</span></div>
        <div class="info-row"><strong>Team</strong><span>${summary.selectedTeamNames.length ? esc(summary.selectedTeamNames.join(", ")) : "None selected"}</span></div>
        <div class="info-row"><strong>Army</strong><span>${(state.army?.gnomes||[]).length}/${summary.armyMax}</span></div>
        <div class="info-row"><strong>Season Upkeep</strong><span>${summary.upkeep}g</span></div>
        <div class="info-row"><strong>XP Progress</strong><span>${progress.current}/${progress.needed} (${progress.percent}%)</span></div>
        ${state.lastSeasonUpkeep ? `<div class="info-row"><strong>Last Upkeep Paid</strong><span>${state.lastSeasonUpkeep.total}g</span></div>` : ""}
        ${latest ? `<div class="info-row"><strong>Last Result</strong><span>${latest.success?"Victory":"Defeat"} • ${latest.totalScore}/${latest.targetScore}</span></div>` : ""}
        ${latest?.narrativeImpact ? `<div class="info-row"><strong>Narrative</strong><span>${esc(latest.narrativeImpact)}</span></div>` : ""}
      </div>
    </div>`;
  }

  // ─── Nav highlight ────────────────────────────────────────────────────────
  function highlightNav() {
    const pageMap = {
      home:        "index.html",
      assemble:    "assemble-your-team.html",
      quests:      "choose-your-quest.html",
      prepare:     "prepare-for-battle.html",
      adventure:   "begin-adventure.html",
      vault:       "vault.html",
      leaderboard: "leaderboard.html",
      about:       "about.html",
      achievements:"achievements.html",
      "build-tracker":"build-tracker.html",
    };
    const page = document.body.getAttribute("data-page") || "";
    document.querySelectorAll(".nav-btn").forEach(link => {
      if (link.getAttribute("href") === pageMap[page]) link.classList.add("active");
    });
  }

  // ─── Wire shared buttons ──────────────────────────────────────────────────
  function wireResetButton(state) {
    document.querySelectorAll("[data-action='reset-game']").forEach(btn => {
      btn.onclick = () => {
        if (!confirm("Reset all progress? This cannot be undone.")) return;
        const next = GameEngine.generateSeason(GameEngine.createGameState({ playerName:"Player", startingGold:150, playerLevel:1 }));
        next.settings = { difficulty: state?.settings?.difficulty || "Normal" };
        setState(next);
        location.reload();
      };
    });
  }

  function wireNewSeasonButton(state, onComplete) {
    document.querySelectorAll("[data-action='new-season']").forEach(btn => {
      btn.onclick = () => {
        const next = GameEngine.generateSeason(state);
        setState(next);
        if (onComplete) onComplete(next);
        else location.reload();
      };
    });
  }

  // ─── Expose ───────────────────────────────────────────────────────────────
  global.GOGShared = {
    STORAGE_KEY,
    saveState, loadState, setState,
    toast, esc, fmtStats, renderStatLegend, renderTraitList, rarityClass, stars,
    slotLabel, vaultItemsForSlot, bestVaultUpgrade, describeItemDelta,
    renderEquipmentSummary, renderEquipControls, renderUpgradeBox,
    renderGlobalSummary, renderStateClarityPanel,
    highlightNav, wireResetButton, wireNewSeasonButton,
  };

  // Also wire equip/unequip on any mount div via event delegation
  function wireEquipDelegation(mountEl, getStateFn, onUpdate) {
    if (!mountEl) return;
    mountEl.addEventListener("click", e => {
      const btn = e.target.closest("[data-equip],[data-unequip]");
      if (!btn) return;
      try {
        let next;
        if (btn.hasAttribute("data-equip")) {
          const [gnomeId, slot, itemId] = btn.getAttribute("data-equip").split("|");
          next = GameEngine.equipVaultItemToGnome(getStateFn(), gnomeId, itemId, slot);
          toast("Item equipped.");
        } else {
          const [gnomeId, slot] = btn.getAttribute("data-unequip").split("|");
          next = GameEngine.unequipGnomeItem(getStateFn(), gnomeId, slot);
          toast("Item unequipped.");
        }
        setState(next);
        onUpdate(next);
      } catch(err) { toast(err.message, true); }
    });
  }

  global.GOGShared.wireEquipDelegation = wireEquipDelegation;

})(window);
