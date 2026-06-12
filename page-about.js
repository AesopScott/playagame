/* page-about.js */
(function(){
  "use strict";
  const { loadState, setState, renderGlobalSummary, highlightNav, wireResetButton } = GOGShared;
  document.addEventListener("DOMContentLoaded", () => {
    const state = loadState();
    highlightNav();
    wireResetButton(state);
    renderGlobalSummary(state);
    document.getElementById("about-mount").innerHTML = `
      <div class="grid-2">
        <div>
          <div class="paper">
            <h3>What is GOG?</h3>
            <p>Game of Gnomes is a web-based, narrative-fueled high fantasy strategy game where magic crackles, heroes rise, kingdoms tremble — and then there are your gnomes.</p>
            <p>Embark on grand adventures of kingdom-building, danger-facing, and (occasionally) princess-saving. Assuming your gnomes don't stop for a snack first.</p>
          </div>
          <div class="paper" style="margin-top:18px;">
            <h3>The Flow</h3>
            <div class="quest-list" style="background:transparent;padding:0;">
              <div class="quest"><div><h4>Choose a Quest</h4><p>Pick from the season's board based on rarity, difficulty, loot, and XP.</p></div></div>
              <div class="quest"><div><h4>Build Your Army</h4><p>Hire gnomes each season. Each has unique stats, skills, quirks, and rarity.</p></div></div>
              <div class="quest"><div><h4>Pick Three</h4><p>Assign exactly 3 gnomes and equip them with vault gear before you begin.</p></div></div>
              <div class="quest"><div><h4>Play Each Scene</h4><p>Every scene offers three approaches. Your team composition changes which options work best.</p></div></div>
              <div class="quest"><div><h4>Collect Rewards</h4><p>Gold, XP, loot, and narrative flavor based on how you played.</p></div></div>
            </div>
          </div>
        </div>
        <div>
          <div class="paper">
            <h3>Gnome Stats</h3>
            <div class="info-list">
              <div class="info-row"><strong>Combat</strong><span>Fights, clashes, and direct confrontations.</span></div>
              <div class="info-row"><strong>Mind</strong><span>Puzzles, ancient traps, and arcane problems.</span></div>
              <div class="info-row"><strong>Skill</strong><span>Mechanical traps, precision tasks, and tricky navigation.</span></div>
              <div class="info-row"><strong>Luck</strong><span>Hazards, random events, and things that could go either way.</span></div>
              <div class="info-row"><strong>Quirk</strong><span>Chaotic scenes where weird behavior is actually helpful.</span></div>
              <div class="info-row"><strong>Team</strong><span>Coordination-heavy scenes and teamwork bonuses.</span></div>
            </div>
          </div>
          <div class="paper" style="margin-top:18px;">
            <h3>Gnome Types</h3>
            <div class="info-list">
              ${["Warrior","Archer","Mage","Spirit Mage","Rogue","Ninja","Engineer","Alchemist","Scholar","Philosopher"].map(t=>`<div class="info-row"><strong>${t}</strong><span>${GameEngine.getPreferredStatsForType(t).join(", ")}</span></div>`).join("")}
            </div>
          </div>
        </div>
      </div>`;
  });
})();
