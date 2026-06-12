/* page-prepare.js */
(function(){
  "use strict";
  const { loadState, setState, esc, fmtStats, renderTraitList, rarityClass, renderGlobalSummary, highlightNav, wireResetButton, renderEquipmentSummary, renderEquipControls, renderUpgradeBox, toast, wireEquipDelegation } = GOGShared;

  let state;

  function render(s) {
    state = s;
    const mount = document.getElementById("prepare-mount");
    if (!mount) return;
    const quest = GameEngine.getSelectedQuest(state);
    const team  = GameEngine.getSelectedTeam(state);
    const army  = state.army?.gnomes || [];

    mount.innerHTML = `
      <div class="grid-2">
        <section>
          <h3 class="section-title">Pick Your Team</h3>
          <small class="helper">Select exactly 3 gnomes. Click a selected gnome to deselect.</small>
          ${!quest?`<div class="empty-note" style="margin-bottom:14px;">No quest selected yet. You can pick your 3 gnomes now, then head to <a href="choose-your-quest.html">Choose Your Quest</a>.</div>`:""}
          <div class="army-grid">
            ${army.map(g => {
              const sel = state.selectedTeamIds.includes(g.id);
              const eff = GameEngine.getEffectiveStats(g);
              return `
              <div class="army-card ${rarityClass(g.rarity)} ${sel?"selected":""}">
                <div class="card-top">
                  <div><div class="slot-title">${g.rarity}</div><h4>${esc(g.name)}</h4></div>
                  <div class="badge">${esc(g.type.label)}</div>
                </div>
                <div class="meta-row"><div class="meta-pill">Lv ${g.level}</div></div>
                <div class="card-copy"><strong>Effective:</strong> ${fmtStats(eff)}</div>
                <div class="info-list">
                  <div class="info-row"><strong>Skills</strong><span>${renderTraitList(g.skills, "skill")}</span></div>
                  <div class="info-row"><strong>Quirks</strong><span>${renderTraitList(g.quirks, "quirk")}</span></div>
                </div>
                ${renderEquipmentSummary(g)}
                ${renderUpgradeBox(state.vault, g)}
                ${sel ? renderEquipControls(state, g, true) : ""}
                <div class="page-actions">
                  <button class="secondary-btn" data-toggle="${g.id}">${sel?"✓ Remove":"Add to Team"}</button>
                </div>
              </div>`; }).join("") || `<div class="empty-note">No army yet. Visit <a href="assemble-your-team.html">Assemble Your Team</a>.</div>`}
          </div>
        </section>
        <section>
          <div class="team-locked" style="position:sticky;top:20px;">
            <div class="tiny">Adventure Team</div>
            <h3 class="section-title" style="margin-top:6px;">${team.length}/3 Selected</h3>
            ${quest?`
              <div class="meta-row">
                <div class="meta-pill">${esc(quest.name)}</div>
                <div class="meta-pill">D${quest.difficulty}</div>
                <div class="meta-pill">${quest.scenes} Scenes</div>
                <div class="meta-pill">Target ${quest.targetScore}</div>
              </div>`:`<div class="muted" style="margin-bottom:12px;">No quest selected.</div>`}
            <div class="team-list">
              ${team.map(g=>`
                <div class="team-pill">
                  <span>${esc(g.name)} · ${esc(g.type.label)}</span>
                  <span>${fmtStats(GameEngine.getEffectiveStats(g))}</span>
                </div>`).join("") || `<div class="muted">No gnomes selected yet.</div>`}
            </div>
            <div class="page-actions">
              ${team.length===3 && quest
                ? `<a class="action-btn" href="begin-adventure.html" style="text-decoration:none;">▶ Begin Adventure</a>`
                : team.length===3
                  ? `<a class="action-btn" href="choose-your-quest.html" style="text-decoration:none;">Choose Quest →</a>`
                  : `<button class="action-btn" disabled>Need ${3-team.length} More</button>`}
              <button class="secondary-btn" data-lock>Lock Team</button>
            </div>
          </div>
        </section>
      </div>`;

    renderGlobalSummary(state);

    mount.querySelectorAll("[data-toggle]").forEach(btn => {
      btn.onclick = () => {
        const id  = btn.dataset.toggle;
        let ids   = [...state.selectedTeamIds];
        if (ids.includes(id)) { ids = ids.filter(x=>x!==id); }
        else {
          if (ids.length>=3) { toast("Only 3 gnomes can go on an adventure.", true); return; }
          ids.push(id);
        }
        state = setState({ ...state, selectedTeamIds: ids });
        GOGShared.saveState(state);
        render(state);
      };
    });

    mount.querySelector("[data-lock]")?.addEventListener("click", () => {
      try {
        state = setState(GameEngine.assignBattleTeam(state, state.selectedTeamIds));
        render(state);
        toast(quest ? "Team locked in." : "Team locked in. Next: choose a quest.");
      } catch(e) { toast(e.message, true); }
    });

    wireEquipDelegation(mount, ()=>state, next => { state=setState(next); render(state); });
  }

  document.addEventListener("DOMContentLoaded", () => {
    state = loadState();
    highlightNav();
    wireResetButton(state);
    render(state);
  });
})();
