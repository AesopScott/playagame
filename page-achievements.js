/* page-achievements.js */
(function(){
  "use strict";
  const { loadState, setState, esc, renderGlobalSummary, highlightNav, wireResetButton } = GOGShared;

  function render(state) {
    const mount = document.getElementById("achievements-mount");
    if (!mount) return;
    const unlocked = state.achievements?.unlocked || [];
    const newOnes  = state.lastUnlockedAchievements || [];

    mount.innerHTML = `
      ${newOnes.length?`
        <div class="paper" style="margin-bottom:18px;border-color:rgba(245,158,11,.35);">
          <h3>🏆 Recently Unlocked</h3>
          <div class="info-list">
            ${newOnes.map(a=>`<div class="info-row"><strong>${esc(a.name)}</strong><span>+${a.fame} Fame</span></div>`).join("")}
          </div>
        </div>`:""}
      <div class="paper" style="margin-bottom:18px;">
        <h3>Achievement Summary</h3>
        <div class="info-list">
          <div class="info-row"><strong>Unlocked</strong><span>${unlocked.length}/${GameEngine.AchievementDefs.length}</span></div>
          <div class="info-row"><strong>Fame</strong><span>${state.player.fame||0}</span></div>
          <div class="info-row"><strong>Fame Note</strong><span>Fame will unlock prestige features in future builds.</span></div>
        </div>
      </div>
      <div class="log-grid">
        ${GameEngine.AchievementDefs.map(a=>{
          const done = unlocked.includes(a.id);
          return `
          <div class="log-card" style="${done?"border-color:rgba(245,158,11,.3);background:rgba(255,251,235,.92);":"opacity:.72;"}">
            <div class="card-top">
              <div><div class="slot-title">${done?"Unlocked":"Locked"}</div><h4>${a.name}</h4></div>
              <div class="meta-pill">+${a.fame} Fame</div>
            </div>
            <div class="card-copy">${esc(a.desc)}</div>
          </div>`;}).join("")}
      </div>`;

    renderGlobalSummary(state);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const state = loadState();
    highlightNav();
    wireResetButton(state);
    render(state);
  });
})();
