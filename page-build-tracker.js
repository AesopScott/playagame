/* page-build-tracker.js */
(function(){
  "use strict";
  const { loadState, renderGlobalSummary, highlightNav, wireResetButton } = GOGShared;
  document.addEventListener("DOMContentLoaded", () => {
    const state = loadState();
    highlightNav();
    wireResetButton(state);
    renderGlobalSummary(state);
    document.getElementById("build-tracker-mount").innerHTML = `
      <div class="paper" style="margin-bottom:18px;">
        <h3>Current Build: v7.4.3</h3>
        <p>Root launcher build. The ZIP now includes a base index.html at the root with a nav pane that links into the GOG game folder and reserves a second slot for the future Gnome Election Game.</p>
      </div>
      <div class="paper">
        <h3>Build History</h3>
        <div class="list-cards">
          ${[
            ["v1.0",        "Initial multi-page site with homepage and core pages."],
            ["v1.1–v1.13",  "Homepage, navigation, banner, and visual identity iterations."],
            ["v2.0",        "First playable prototype: state, seasonal quests, recruit pool, hiring, team assignment, quest running, rewards, vault loot, and leaderboard logging."],
            ["v2.1–v2.3",   "Expanded XP/bonus handling and added scene-by-scene choices with option profiles."],
            ["v2.4–v2.9",   "Multiple failed nav-pane restoration attempts before the rendering bug was found."],
            ["v3.0",        "Converted to self-contained build with all inline CSS and JS."],
            ["v3.3",        "Fixed the real nav bug by separating page identity from inner render mounts."],
            ["v3.4",        "Added quest preview and Begin Adventure button, plus first-pass dynamic loot generation."],
            ["v3.5",        "Vault became a real inventory system with dynamic item generation, equipping, and effective stat impact from gear."],
            ["v3.6–v3.9",   "Added Build Tracker, quest identity, build markers, and stronger narrative flavor."],
            ["v4.0",        "First progression attempt — later rolled back when the engine branch became unstable."],
            ["v4.1–v4.4.2", "Late-branch patches for upkeep, summaries, state clarity, refactors, and emergency fixes that ultimately broke the engine chain."],
            ["v5.0",        "Clean stable rebuild from last known working architecture to restore visible Quests and recruitable Gnomes."],
            ["v5.1",        "Rebuilt progression cleanly: player leveling, gnome leveling, stat growth, skill/quirk gain, and clean +/++ type upgrades."],
            ["v6.0",        "Stable branch with scene-by-scene option scoring, team fit evaluation, reward profiles, narrative summaries, and achievements."],
            ["v6.0.16.5",   "Fixed assemble page disappearing on hire (renderEquipControls undefined). Extracted helper functions outside DOMContentLoaded."],
            ["v7.0",        "Full structural extraction. engine.js is single source of truth. ui-shared.js handles all storage, rendering helpers, equip delegation, and nav. Every page is a lean HTML shell + one JS file. No more copy-paste engine drift. Bugs fixed once."],
            ["v7.1",        "Adventure stability pass. Active runs now lock the starting team and quest snapshot, preventing mid-run state corruption if selections change later. begin-adventure.html was rebuilt as a clean shell, and page-adventure.js now renders lobby, active run, and completion states more reliably."],
            ["v7.2",        "Flow order update. Assemble Your Team now comes before Choose Your Quest throughout navigation and gameplay guidance, the quest page now flows forward into battle prep, and starting gold increased from 80 to 150."],
            ["v7.2.1",      "Navigation pane patch. Swapped the Team and Quests links in the shared nav/order across the site so the visible menu now matches the intended team-first flow."],
            ["v7.2.2",      "Flavor and readability pass. Updated the Step Zero welcome headline, replaced stat letters with stat symbols on gnome cards, and added hover tooltips for displayed skills and quirks."],
            ["v7.3",        "Quest flow polish pass. Team is Step One and Quests is Step Two, Army Management now lives in the right third of the Team page with a stat legend, quest cards include story hooks and scene previews, and the Adventure page swaps overview panels for cleaner breakdowns plus a Quest Overview summary."],
            ["v7.3.1",      "Season rollover and loot rules pass. Quest completion now auto-advances to the next season, the Vault nav explains its inventory function on hover, combat gear and shields now boost Combat, wands and staffs boost Mind, and rings plus amulets can roll any stat bonus."],
            ["v7.4.3",      "Layout polish pass. Army Management and the stat legend now share the left side of the Team page at matching size, the Quest page removes the season overview panel, and Adventure swaps Quest Overview for a leaner Quick Glance card."],
          ].map(([v,d])=>`<div class="light-card"><h4>${v}</h4><p>${d}</p></div>`).join("")}
        </div>
      </div>
      <div class="paper" style="margin-top:18px;">
        <h3>Architecture: v7.4.3</h3>
        <div class="info-list">
          <div class="info-row"><strong>engine.js</strong><span>All game logic. One file. ~600 lines.</span></div>
          <div class="info-row"><strong>ui-shared.js</strong><span>Storage, toast, equip helpers, status bar, nav. ~200 lines.</span></div>
          <div class="info-row"><strong>shared-layout.css</strong><span>All styles. One file. Referenced by every page.</span></div>
          <div class="info-row"><strong>page-*.js</strong><span>One file per page. Pure UI logic, no engine duplication.</span></div>
          <div class="info-row"><strong>*.html</strong><span>~50-line shell per page. Imports the 3 shared files + page JS.</span></div>
        </div>
      </div>`;
  });
})();
