/* page-assemble.js */
(function(){
  "use strict";
  const { loadState, setState, esc, fmtStats, renderStatLegend, renderTraitList, rarityClass, renderGlobalSummary, highlightNav, wireResetButton, renderEquipmentSummary, renderEquipControls, renderUpgradeBox, toast, wireEquipDelegation } = GOGShared;

  let state;

  function render(s) {
    state = s;
    const mount = document.getElementById("assemble-mount");
    if (!mount) return;
    const recruits = state.season?.recruitPool || [];
    const army     = state.army?.gnomes || [];

    const recruitHtml = recruits.length
      ? recruits.map(g => {
          const cost      = GameEngine.getHireCostForRarity(g.rarity);
          const canAfford = state.player.gold >= cost;
          const atMax     = army.length >= GameEngine.getMaxArmySize(state.player.level);
          const disabled  = !canAfford || atMax;
          return `
          <div class="recruit-card ${rarityClass(g.rarity)}">
            <div class="card-top">
              <div><div class="slot-title">${g.rarity}</div><h4>${esc(g.name)}</h4></div>
              <div class="badge">${esc(g.type.label)}</div>
            </div>
            <div class="meta-row">
              <div class="meta-pill">${cost}g to hire</div>
              <div class="meta-pill">Lv ${g.level}</div>
              <div class="meta-pill">Upkeep ${GameEngine.getGnomeSeasonUpkeep(g)}/s</div>
            </div>
            <div class="card-copy">${fmtStats(g.stats)}</div>
            <div class="info-list">
              <div class="info-row"><strong>Skills</strong><span>${renderTraitList(g.skills, "skill")}</span></div>
              <div class="info-row"><strong>Quirks</strong><span>${renderTraitList(g.quirks, "quirk")}</span></div>
            </div>
            <div class="page-actions">
              <button class="action-btn" data-hire="${g.id}" ${disabled?"disabled":""}>
                ${atMax?"Army Full":canAfford?"Hire Gnome":"Need "+cost+"g"}
              </button>
            </div>
          </div>`; }).join("")
      : `<div class="empty-note">No recruits this season. Roll a new season on the Quests page.</div>`;

    const armyHtml = army.length
      ? army.map(g => {
          const eff = GameEngine.getEffectiveStats(g);
          return `
          <div class="army-card ${rarityClass(g.rarity)}">
            <div class="card-top">
              <div><div class="slot-title">${g.rarity}</div><h4>${esc(g.name)}</h4></div>
              <div class="badge">${esc(g.type.label)}</div>
            </div>
            <div class="meta-row">
              <div class="meta-pill">Lv ${g.level}</div>
              <div class="meta-pill">${g.xp}/${(g.level+1)*100} XP</div>
              <div class="meta-pill">Upkeep ${GameEngine.getGnomeSeasonUpkeep(g)}/s</div>
            </div>
            <div class="card-copy"><strong>Base:</strong> ${fmtStats(g.stats)}</div>
            <div class="card-copy"><strong>Effective:</strong> ${fmtStats(eff)}</div>
            <div class="info-list">
              <div class="info-row"><strong>Skills</strong><span>${renderTraitList(g.skills, "skill")}</span></div>
              <div class="info-row"><strong>Quirks</strong><span>${renderTraitList(g.quirks, "quirk")}</span></div>
            </div>
            ${renderEquipmentSummary(g)}
            ${renderUpgradeBox(state.vault, g)}
            ${renderEquipControls(state, g, true)}
            <div class="page-actions">
              <button class="danger-btn" data-dismiss="${g.id}">Dismiss</button>
            </div>
          </div>`; }).join("")
      : `<div class="empty-note">Your army is empty. Hire gnomes from the recruit pool to get started.</div>`;

    mount.innerHTML = `
      <div class="grid-2" style="grid-template-columns:1fr 1fr 1fr;margin-bottom:18px;align-items:stretch;">
        <div class="paper" style="height:100%;">
          <h3>Army Management</h3>
          <div class="info-list">
            <div class="info-row"><strong>Army Size</strong><span>${army.length}/${GameEngine.getMaxArmySize(state.player.level)}</span></div>
            <div class="info-row"><strong>Season Upkeep</strong><span>${GameEngine.getArmyUpkeepTotal(state.army)}g per season</span></div>
            ${state.lastSeasonUpkeep?`<div class="info-row"><strong>Last Season Charge</strong><span>${state.lastSeasonUpkeep.total}g</span></div>`:""}
          </div>
          <p class="muted" style="margin-top:10px;">Keep an eye on roster size and upkeep while you shape your kingdom’s tiny army.</p>
        </div>
        ${renderStatLegend()}
        <div></div>
      </div>
      <div class="grid-2">
        <section>
          <h3 class="section-title">Seasonal Recruits</h3>
          <small class="helper">Hire costs scale with rarity. Upkeep is charged each new season.</small>
          <div class="recruit-grid">${recruitHtml}</div>
        </section>
        <section>
          <h3 class="section-title">Your Army</h3>
          <small class="helper">Quick read: each gnome card shows base stats, effective stats with gear, skills, quirks, and equipped items.</small>
          <div class="army-grid">${armyHtml}</div>
        </section>
      </div>`;

    renderGlobalSummary(state);

    mount.querySelectorAll("[data-hire]").forEach(btn => {
      btn.onclick = () => {
        try { state = setState(GameEngine.hireGnome(state, btn.dataset.hire)); render(state); toast("Gnome hired!"); }
        catch(e) { toast(e.message, true); }
      };
    });

    mount.querySelectorAll("[data-dismiss]").forEach(btn => {
      btn.onclick = () => {
        if (!confirm("Dismiss this gnome? They leave the army permanently.")) return;
        state = setState(GameEngine.removeArmyGnome(state, btn.dataset.dismiss));
        render(state); toast("Gnome dismissed.");
      };
    });

    wireEquipDelegation(mount, ()=>state, next => { state = setState(next); render(state); });
  }

  document.addEventListener("DOMContentLoaded", () => {
    state = loadState();
    highlightNav();
    wireResetButton(state);
    render(state);
  });
})();
