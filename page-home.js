/* page-home.js */
(function(){
  "use strict";
  const { loadState, setState, esc, fmtStats, rarityClass, renderGlobalSummary, renderStateClarityPanel, highlightNav, wireResetButton, wireNewSeasonButton, toast } = GOGShared;

  function render(state) {
    const mount = document.getElementById("home-mount");
    if (!mount) return;
    const quest = GameEngine.getSelectedQuest(state);
    const team  = GameEngine.getSelectedTeam(state);
    const latest = state.adventureLog?.[state.adventureLog.length-1] || null;

    mount.innerHTML = `
      <div class="home-centered-panels">${renderStateClarityPanel(state)}</div>
      ${latest ? `
            <div class="paper" style="margin-top:24px;">
              <h3>Last Adventure</h3>
              <div class="meta-row">
                <div class="meta-pill">${latest.success?"Victory":"Defeat"}</div>
                <div class="meta-pill">Score ${latest.totalScore}/${latest.targetScore}</div>
                <div class="meta-pill">+${latest.rewards.gold}g</div>
                <div class="meta-pill">+${latest.rewards.playerXp} XP</div>
                <div class="meta-pill">${latest.rewards.loot.length} Loot</div>
              </div>
              <p class="card-copy" style="font-style:italic;">"${esc(latest.narrativeImpact || "")}"</p>
            </div>` : ""}
      <div class="paper" style="margin-top:24px;">
            <h3>How to Play</h3>
            <div class="quest-list">
              <div class="quest"><div><h4>1. Assemble Your Team</h4><p>Hire gnomes from the recruit pool</p></div><div class="badge">${(state.army?.gnomes||[]).length > 0 ? "Active":"Empty"}</div></div>
              <div class="quest"><div><h4>2. Choose Your Quest</h4><p>Pick from the season's quest slots</p></div><div class="badge">${quest?"Selected":"Pending"}</div></div>
              <div class="quest"><div><h4>3. Prepare for Battle</h4><p>Assign exactly 3 gnomes for the quest</p></div><div class="badge">${state.selectedTeamIds.length}/3</div></div>
              <div class="quest"><div><h4>4. Begin Adventure</h4><p>Choose your approach each scene</p></div><div class="badge">${latest?"Played":"Ready"}</div></div>
            </div>
            <div class="page-actions">
              ${quest && state.selectedTeamIds.length===3
                ? `<a class="action-btn" href="begin-adventure.html" style="text-decoration:none;">▶ Begin Adventure</a>`
                : `<a class="action-btn" href="${(state.army?.gnomes||[]).length > 0 ? (quest?"prepare-for-battle.html":"choose-your-quest.html") : "assemble-your-team.html"}" style="text-decoration:none;">${(state.army?.gnomes||[]).length > 0 ? (quest?"Prepare Team →":"Choose a Quest →") : "Assemble Your Team →"}</a>`}
              <button class="secondary-btn" data-action="new-season">Roll New Season</button>
            </div>
          </div>`;

    renderGlobalSummary(state);
    wireNewSeasonButton(state, next => { setState(next); render(next); });
  }

  document.addEventListener("DOMContentLoaded", () => {
    let state = loadState();
    highlightNav();
    wireResetButton(state);
    render(state);
  });
})();
