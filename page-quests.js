/* page-quests.js */
(function(){
  "use strict";
  const { loadState, setState, esc, rarityClass, renderGlobalSummary, highlightNav, wireResetButton, wireNewSeasonButton, toast } = GOGShared;

  function renderScenePreview(q) {
    const preview = Array.isArray(q.scenePreview) ? q.scenePreview : [];
    if (!preview.length) return "";
    return `
      <div class="info-list" style="margin-top:12px;">
        ${preview.map((scene, idx) => `<div class="info-row"><strong>Scene ${idx + 1}</strong><span>${esc(scene.label)}</span></div>`).join("")}
      </div>`;
  }

  function render(state) {
    const mount = document.getElementById("quests-mount");
    if (!mount) return;
    const selected = GameEngine.getSelectedQuest(state);

    mount.innerHTML = `
      <div class="page-actions" style="margin-bottom:18px;">
        <button class="secondary-btn" data-action="new-season">Roll New Season</button>
      </div>
      <div class="quest-slot-grid">
        ${(state.season?.questBoard||[]).map(slot => {
          if (!slot.unlocked) return `
            <div class="quest-card locked">
              <div class="card-top"><div><div class="slot-title">Slot ${slot.slotIndex+1}</div><h4>Locked</h4></div><div class="meta-pill">Unlock Later</div></div>
              <div class="card-copy">Unlocks as your player level rises.</div>
              <div class="meta-row">${slot.allowedLootTiers.map(t=>`<div class="meta-pill">${t}</div>`).join("")}</div>
            </div>`;
          const q = slot.quest;
          const isSel = selected?.id === q.id;
          return `
            <div class="quest-card ${rarityClass(q.lootTier)} ${isSel?"selected":""}">
              <div class="card-top">
                <div><div class="slot-title">Slot ${slot.slotIndex+1}</div><h4>${esc(q.name)}</h4></div>
                <div class="meta-pill">${q.rarity}</div>
              </div>
              <div class="meta-row">
                <div class="meta-pill">Difficulty ${q.difficulty}</div>
                <div class="meta-pill">${q.lootTier} Loot</div>
                <div class="meta-pill">${q.scenes} Scenes</div>
                <div class="meta-pill">Target ${q.targetScore}</div>
                <div class="meta-pill">XP ${GameEngine.getQuestXpReward(q,true)}</div>
              </div>
              <div class="card-copy">${esc(q.storyHook || `A strange kingdom errand pulls the gnomes into danger.`)}</div>
              <div class="card-copy" style="margin-top:10px;font-style:italic;">${esc(q.sceneStory || "The scenes escalate from curious to dangerous in classic gnome fashion.")}</div>
              ${renderScenePreview(q)}
              <div class="info-list" style="margin-top:12px;">
                <div class="info-row"><strong>Loot Slots</strong><span>${slot.allowedLootTiers.join(", ")}</span></div>
              </div>
              <div class="page-actions">
                <button class="action-btn" data-select="${q.id}">${isSel?"✓ Selected":"Select Quest"}</button>
                ${isSel?`<a class="secondary-btn" href="prepare-for-battle.html" style="text-decoration:none;">Prepare Team →</a>`:""}
              </div>
            </div>`;
        }).join("")}
      </div>`;

    renderGlobalSummary(state);
    wireNewSeasonButton(state, next => { setState(next); render(next); });

    mount.querySelectorAll("[data-select]").forEach(btn => {
      btn.onclick = () => {
        try {
          const next = GameEngine.selectQuest(state, btn.dataset.select);
          state = setState(next);
          render(state);
          toast("Quest selected.");
        } catch(e) { toast(e.message, true); }
      };
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    let state = loadState();
    highlightNav();
    wireResetButton(state);
    render(state);
  });
})();
