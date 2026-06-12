/* page-adventure.js */
(function(){
  "use strict";
  const { loadState, setState, esc, fmtStats, stars, renderGlobalSummary, highlightNav, wireResetButton, toast } = GOGShared;

  let state;

  function getRunTeam() {
    const locked = GameEngine.getAdventureTeam(state);
    return locked.length ? locked : GameEngine.getSelectedTeam(state);
  }

  function getQuestOutcomeNarrative(latest) {
    if (!latest) return "";
    if (latest.success) {
      return `The kingdom breathes easier as ${latest.questName} turns into a hard-won gnome victory. The team kept the story together long enough to drag home loot, XP, and new bragging material.`;
    }
    return `The kingdom survives the tale, but ${latest.questName} ends as a messy setback. The team still learns from the wreckage, and the next quest starts with sharper instincts and louder cautionary stories.`;
  }

  function renderQuestOverview(latest, extras) {
    if (!latest) return "";
    return `
      <div class="paper" style="margin-top:14px;">
        <h3>Quick Glance</h3>
        <p class="card-copy">${esc(getQuestOutcomeNarrative(latest))}</p>
        <div class="info-list">
          <div class="info-row"><strong>Quest</strong><span>${esc(latest.questName)}</span></div>
          <div class="info-row"><strong>Result</strong><span>${latest.success ? "Victory" : "Defeat"}</span></div>
          <div class="info-row"><strong>Scenes Cleared</strong><span>${extras.successfulScenes}/${(latest.scenes || []).length}</span></div>
          <div class="info-row"><strong>Total Score</strong><span>${latest.totalScore}/${latest.targetScore}</span></div>
          <div class="info-row"><strong>Gold Earned</strong><span>+${latest.rewards.gold}g</span></div>
        </div>
      </div>`;
  }

  function renderInProgress(mount) {
    const run = state.currentAdventure;
    const scene = GameEngine.getCurrentScene(state);
    const team = getRunTeam();
    if (!run || !scene) {
      renderLobby(mount);
      return;
    }
    const prog = `${run.currentSceneIndex}/${run.scenes.length}`;
    const pct = Math.round((run.currentSceneIndex / run.scenes.length) * 100);

    mount.innerHTML = `
      <div class="adventure-columns">
        <div class="adventure-left">
          <div class="paper">
            <h3>${canStart ? "Ready to Begin" : "Not Ready"}</h3>
            ${quest ? `
              <div class="meta-row">
                <div class="meta-pill">${esc(quest.name)}</div>
                <div class="meta-pill">D${quest.difficulty}</div>
                <div class="meta-pill">${esc(quest.rarity)}</div>
                <div class="meta-pill">${quest.scenes} scenes</div>
                <div class="meta-pill">Target ${quest.targetScore}</div>
              </div>
              <p class="card-copy">${esc(quest.storyHook || "A kingdom problem needs a very small heroic force.")}</p>` : `<div class="empty-note">No quest selected. <a href="choose-your-quest.html">Choose a quest after hiring your team.</a></div>`}
            ${team.length ? `
              <div class="team-list">
                ${team.map(g => `<div class="team-pill"><span>${esc(g.name)} · ${esc(g.type.label)}</span><span>Lv ${g.level}</span></div>`).join("")}
              </div>` : `<div class="empty-note" style="margin-top:12px;">No team assigned. <a href="prepare-for-battle.html">Prepare your team.</a></div>`}
            <div class="page-actions">
              <button class="action-btn" data-start ${!canStart ? "disabled" : ""}>${canStart ? "▶ Begin Adventure" : "Complete Setup First"}</button>
            </div>
          </div>

          ${latest ? `
          <div class="paper">
            <h3>Previous Result</h3>
            <div class="meta-row">
              <div class="meta-pill">${latest.success ? "Victory" : "Defeat"}</div>
              <div class="meta-pill">Score ${latest.totalScore}/${latest.targetScore}</div>
            </div>
            <p class="card-copy" style="font-style:italic;">"${esc(latest.narrativeImpact || "")}"</p>
          </div>` : ""}
        </div>

        <div class="adventure-right">
          <div class="panel">
            <div class="panel-inner">
              <div class="panel-head"><div><div class="tiny">Checklist</div><h3>Before You Begin</h3></div></div>
              <div class="quest-list">
                <div class="quest"><div><h4>Army hired</h4><p>Via Assemble Your Team</p></div><div class="badge">${(state.army?.gnomes || []).length > 0 ? "✓" : "✗"}</div></div>
                <div class="quest"><div><h4>Quest selected</h4><p>Via Choose Your Quest page</p></div><div class="badge">${quest ? "✓" : "✗"}</div></div>
                <div class="quest"><div><h4>Team prepared</h4><p>Exactly 3 gnomes assigned</p></div><div class="badge">${team.length===3 ? "✓" : "✗"}</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>`;

    renderGlobalSummary(state);

    mount.querySelectorAll("[data-choose]").forEach(btn => {
      btn.onclick = () => {
        try {
          state = setState(GameEngine.resolveSceneChoice(state, btn.dataset.choose));
          if (state.currentAdventure?.status === "complete") renderComplete(mount);
          else renderInProgress(mount);
        } catch (e) {
          toast(e.message, true);
        }
      };
    });
  }

  function renderComplete(mount) {
    const run = state.currentAdventure;
    const latest = state.adventureLog[state.adventureLog.length - 1];
    const extras = GameEngine.getQuestSummaryExtras(latest);

    mount.innerHTML = `
      <div class="paper" style="margin-bottom:18px;border-color:${run.success ? "rgba(22,163,74,.3)" : "rgba(220,38,38,.3)"};background:${run.success ? "rgba(240,253,244,.92)" : "rgba(254,242,242,.92)"};">
        <div class="tiny">${run.success ? "Victory" : "Defeat"}</div>
        <h3 style="margin-top:6px;">${esc(run.questName)}</h3>
        <p class="card-copy" style="font-style:italic;font-size:16px;">"${esc(latest.narrativeImpact || "")}"</p>
        <div class="meta-row">
          <div class="meta-pill">Score ${run.totalScore}/${run.targetScore}</div>
          <div class="meta-pill">+${latest.rewards.gold}g</div>
          <div class="meta-pill">Player +${latest.rewards.playerXp} XP</div>
          <div class="meta-pill">Gnome +${latest.rewards.gnomeXp} XP</div>
          <div class="meta-pill">${latest.rewards.loot.length} Loot</div>
        </div>
        <div class="page-actions">
          <button class="action-btn" data-new-quest>New Quest</button>
          <a class="secondary-btn" href="vault.html" style="text-decoration:none;">View Vault</a>
          <a class="secondary-btn" href="leaderboard.html" style="text-decoration:none;">Leaderboard</a>
        </div>
      </div>

      ${state.lastUnlockedAchievements?.length ? `
      <div class="paper" style="margin-bottom:18px;border-color:rgba(245,158,11,.35);">
        <h3>🏆 Achievements Unlocked</h3>
        <div class="info-list">
          ${(state.lastUnlockedAchievements || []).map(a => `<div class="info-row"><strong>${esc(a.name)}</strong><span>+${a.fame} Fame</span></div>`).join("")}
        </div>
      </div>` : ""}

      <div class="adventure-columns">
        <div>
          <div class="paper">
            <h3>Quest Results</h3>
            <p class="card-copy" style="margin-bottom:12px;">${esc(getQuestOutcomeNarrative(latest))}</p>
            <div class="info-list">
              ${(latest.gnomeXpGains || []).map(e => `<div class="info-row"><strong>${esc(e.name)}</strong><span>+${e.xpGained} XP</span></div>`).join("")}
              <div class="info-row"><strong>Scenes Cleared</strong><span>${extras.successfulScenes}/${(latest.scenes || []).length}</span></div>
              <div class="info-row"><strong>Luck Procs</strong><span>${latest.bonusTracker?.luckUses || 0}</span></div>
              <div class="info-row"><strong>Quirk Procs</strong><span>${latest.bonusTracker?.quirkUses || 0}</span></div>
              <div class="info-row"><strong>XP Modifier</strong><span>×${(latest.rewardProfile?.xpModifier || 1).toFixed(2)}</span></div>
              <div class="info-row"><strong>Loot Modifier</strong><span>×${(latest.rewardProfile?.lootModifier || 1).toFixed(2)}</span></div>
              ${extras.bestScene ? `<div class="info-row"><strong>Best Scene</strong><span>${esc(extras.bestScene.description)} (${extras.bestScene.score})</span></div>` : ""}
              ${extras.worstScene ? `<div class="info-row"><strong>Worst Scene</strong><span>${esc(extras.worstScene.description)} (${extras.worstScene.score})</span></div>` : ""}
            </div>
          </div>
          ${latest.rewards.loot.length ? `
          <div class="paper" style="margin-top:14px;">
            <h3>Loot Earned</h3>
            <div class="info-list">
              ${latest.rewards.loot.map(item => `
                <div class="info-row">
                  <strong>${esc(item.name)}</strong>
                  <span>${esc(item.tier)} · ${Object.entries(item.statModifiers || {}).map(([k, v]) => `${esc(k)}+${v}`).join(", ") || "no bonuses"}</span>
                </div>`).join("")}
            </div>
          </div>` : ""}
        </div>
        <div>
          <div class="paper">
            <h3>Scene Breakdown</h3>
            <div class="scene-list">
              ${(latest.scenes || []).map(s => `
                <div class="scene-item ${s.success ? "success" : "fail"}">
                  <strong>${esc(s.description)}</strong><br/>
                  <em>${esc(s.optionTitle)}</em> — ${s.score}/${s.required} — ${esc(s.outcome)}<br/>
                  <small>Stat ${s.statScore} · Skill ${s.skillBonus} · Type ${s.typeBonus} · Gear ${s.gearBonus} · Luck ${s.luckBurst} · Quirk ${s.quirkSwing}</small>
                </div>`).join("")}
            </div>
          </div>
          ${renderQuestOverview(latest, extras)}
        </div>
      </div>`;

    renderGlobalSummary(state);

    mount.querySelector("[data-new-quest]")?.addEventListener("click", () => {
      state = setState({ ...state, selectedQuestId: null, selectedTeamIds: [], currentAdventure: null });
      window.location.href = "choose-your-quest.html";
    });
  }

  function renderLobby(mount) {
    const quest = GameEngine.getSelectedQuest(state);
    const team = GameEngine.getSelectedTeam(state);
    const latest = state.adventureLog?.[state.adventureLog.length - 1] || null;
    const canStart = !!quest && team.length === 3;

    mount.innerHTML = `
      <div class="grid-2">
        <div class="adventure-left">
          <div class="paper">
            <h3>${canStart ? "Ready to Begin" : "Not Ready"}</h3>
            ${quest ? `
              <div class="meta-row">
                <div class="meta-pill">${esc(quest.name)}</div>
                <div class="meta-pill">D${quest.difficulty}</div>
                <div class="meta-pill">${esc(quest.rarity)}</div>
                <div class="meta-pill">${quest.scenes} scenes</div>
                <div class="meta-pill">Target ${quest.targetScore}</div>
              </div>
              <p class="card-copy">${esc(quest.storyHook || "A kingdom problem needs a very small heroic force.")}</p>` : `<div class="empty-note">No quest selected. <a href="choose-your-quest.html">Choose a quest after hiring your team.</a></div>`}
            ${team.length ? `
              <div class="team-list">
                ${team.map(g => `<div class="team-pill"><span>${esc(g.name)} · ${esc(g.type.label)}</span><span>Lv ${g.level}</span></div>`).join("")}
              </div>` : `<div class="empty-note" style="margin-top:12px;">No team assigned. <a href="prepare-for-battle.html">Prepare your team.</a></div>`}
            <div class="page-actions">
              <button class="action-btn" data-start ${!canStart ? "disabled" : ""}>${canStart ? "▶ Begin Adventure" : "Complete Setup First"}</button>
            </div>
          </div>

          ${latest ? `
          <div class="paper" style="margin-top:18px;">
            <h3>Previous Result</h3>
            <div class="meta-row">
              <div class="meta-pill">${latest.success ? "Victory" : "Defeat"}</div>
              <div class="meta-pill">Score ${latest.totalScore}/${latest.targetScore}</div>
            </div>
            <p class="card-copy" style="font-style:italic;">"${esc(latest.narrativeImpact || "")}"</p>
          </div>` : ""}
        </div>
        <div class="adventure-right">
          <div class="panel">
            <div class="panel-inner">
              <div class="panel-head"><div><div class="tiny">Checklist</div><h3>Before You Begin</h3></div></div>
              <div class="quest-list">
                <div class="quest"><div><h4>Army hired</h4><p>Via Assemble Your Team</p></div><div class="badge">${(state.army?.gnomes || []).length > 0 ? "✓" : "✗"}</div></div>
                <div class="quest"><div><h4>Quest selected</h4><p>Via Choose Your Quest page</p></div><div class="badge">${quest ? "✓" : "✗"}</div></div>
                <div class="quest"><div><h4>Team of 3 assigned</h4><p>Via Prepare for Battle</p></div><div class="badge">${team.length === 3 ? "✓" : "✗"}</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>`;

    renderGlobalSummary(state);

    mount.querySelector("[data-start]")?.addEventListener("click", () => {
      if (!canStart) return;
      try {
        state = setState(GameEngine.createAdventureRun(state));
        renderInProgress(mount);
      } catch (e) {
        toast(e.message, true);
      }
    });
  }

  function renderPage() {
    const mount = document.getElementById("adventure-mount");
    if (!mount) return;
    const run = state.currentAdventure;
    if (run?.status === "in_progress") renderInProgress(mount);
    else if (run?.status === "complete") renderComplete(mount);
    else renderLobby(mount);
  }

  document.addEventListener("DOMContentLoaded", () => {
    state = loadState();
    highlightNav();
    wireResetButton(state);
    renderPage();
  });
})();
