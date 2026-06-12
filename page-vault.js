/* page-vault.js */
(function(){
  "use strict";
  const { loadState, setState, esc, fmtStats, renderGlobalSummary, highlightNav, wireResetButton, renderEquipControls, toast, wireEquipDelegation } = GOGShared;
  let state;

  function render(s) {
    state = s;
    const mount = document.getElementById("vault-mount");
    if (!mount) return;
    const vault = state.vault || [];

    mount.innerHTML = `
      ${vault.length?`
        <div class="paper" style="margin-bottom:18px;">
          <h3>Vault Contents — ${vault.length} item${vault.length===1?"":"s"}</h3>
          <p class="card-copy">Items stored here can be equipped to gnomes from the Team or Preparation pages. Equipping moves the item from the vault into the gnome's gear slot.</p>
        </div>
        <div class="vault-grid">
          ${vault.map(item=>`
            <div class="vault-card">
              <div class="card-top">
                <div><div class="slot-title">${item.tier}</div><h4>${esc(item.name)}</h4></div>
                <div class="meta-pill">${item.slotType}</div>
              </div>
              <div class="meta-row">${(item.tags||[]).map(t=>`<div class="meta-pill">${t}</div>`).join("")}</div>
              <div class="card-copy">Power ${item.power||0}</div>
              <div class="info-list">
                <div class="info-row"><strong>Stat Bonuses</strong><span>${Object.entries(item.statModifiers||{}).map(([k,v])=>`${k}+${v}`).join(", ")||"None"}</span></div>
              </div>
            </div>`).join("")}
        </div>
        <div class="paper" style="margin-top:24px;">
          <h3>Quick Equip by Gnome</h3>
          <small class="helper">Equip directly from here without navigating to the Team page.</small>
          ${(state.army?.gnomes||[]).map(g=>`
            <div style="margin-bottom:18px;">
              <h4 style="font-family:'Cinzel',serif;margin:0 0 8px;">${esc(g.name)} — ${esc(g.type.label)}</h4>
              ${renderEquipControls(state, g, false)}
            </div>`).join("")||`<div class="muted">No gnomes in army yet.</div>`}
        </div>`
      : `<div class="empty-note">Your vault is empty. Complete quests to earn loot. Items only enter the vault through successful quest rewards.</div>`}`;

    renderGlobalSummary(state);
    wireEquipDelegation(mount, ()=>state, next => { state=setState(next); render(state); });
  }

  document.addEventListener("DOMContentLoaded", () => {
    state = loadState();
    highlightNav();
    wireResetButton(state);
    render(state);
  });
})();
