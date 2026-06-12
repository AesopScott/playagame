/* page-leaderboard.js */
(function(){
  "use strict";
  const { loadState, setState, esc, renderGlobalSummary, highlightNav, wireResetButton } = GOGShared;

  function summarizeSeasons(logs) {
    const bySeason = {};
    (logs||[]).forEach(log => {
      const s = log.seasonNumber || 0;
      if (!bySeason[s]) bySeason[s] = { seasonNumber:s, quests:0, victories:0, defeats:0, gold:0, loot:0, xp:0, names:[] };
      bySeason[s].quests++;
      if (log.success) bySeason[s].victories++; else bySeason[s].defeats++;
      bySeason[s].gold  += log.rewards?.gold || 0;
      bySeason[s].loot  += (log.rewards?.loot||[]).length;
      bySeason[s].xp    += log.rewards?.playerXp || 0;
      if (log.questName) bySeason[s].names.push(log.questName);
    });
    return Object.values(bySeason).sort((a,b)=>b.seasonNumber-a.seasonNumber);
  }

  function render(state) {
    const mount = document.getElementById("leaderboard-mount");
    if (!mount) return;
    const logs    = [...(state.adventureLog||[])].reverse();
    const seasons = summarizeSeasons(state.adventureLog);

    mount.innerHTML = `
      ${seasons.length?`
        <div class="paper" style="margin-bottom:18px;"><h3>Season Summary</h3></div>
        <div class="log-grid" style="margin-bottom:28px;">
          ${seasons.map(s=>`
            <div class="log-card">
              <div class="card-top">
                <div><div class="slot-title">Season ${s.seasonNumber}</div><h4>${s.victories>s.defeats?"Momentum Up":s.defeats>s.victories?"Rough Going":"Mixed Results"}</h4></div>
                <div class="meta-pill">${s.quests} Quest${s.quests===1?"":"s"}</div>
              </div>
              <div class="meta-row">
                <div class="meta-pill">W${s.victories} L${s.defeats}</div>
                <div class="meta-pill">+${s.gold}g</div>
                <div class="meta-pill">${s.loot} Loot</div>
                <div class="meta-pill">+${s.xp} XP</div>
              </div>
              <div class="card-copy">${s.names.slice(0,3).map(n=>esc(n)).join(" · ") || "No adventures."}</div>
            </div>`).join("")}
        </div>` : ""}      <div class="paper" style="margin-bottom:18px;"><h3>Adventure Log</h3></div>
      <div class="log-grid">
        ${logs.map(log=>`
          <div class="log-card">
            <div class="card-top">
              <div><div class="slot-title">Season ${log.seasonNumber}</div><h4>${esc(log.questName)}</h4></div>
              <div class="meta-pill">${log.success?"Victory":"Defeat"}</div>
            </div>
            <div class="info-list">
              <div class="info-row"><strong>Season</strong><span>${log.seasonNumber}</span></div>
              <div class="info-row"><strong>Quest</strong><span>${esc(log.questName)}</span></div>
              <div class="info-row"><strong>Gnomes</strong><span>${(log.teamSnapshot||[]).map(g=>esc(g.name)).join(" · ") || "Unknown party"}</span></div>
            </div>
          </div>`).join("") || `<div class="empty-note">No adventures logged yet.</div>`}
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
