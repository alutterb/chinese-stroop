(function () {
  "use strict";

  const byId = (id) => document.getElementById(id);

  const panels = [1, 2, 3].map((lv) => ({
    level: lv,
    tab: byId(`lb-tab-${lv}`),
    panel: byId(`lb-panel-${lv}`),
    tbody: byId(`lb-tbody-${lv}`),
  }));

  const statusEl = byId("lb-status");
  const subtitleEl = byId("lb-subtitle");
  const refreshBtn = byId("lb-refresh");

  function formatTime(sec) {
    if (sec < 60) return `${sec.toFixed(1)}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s.toFixed(1)}s`;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** @param {HTMLElement} tbody @param {{ name: string; accuracyPct: number; timeCompletedSec: number }[]} rows */
  function renderTable(tbody, rows) {
    tbody.innerHTML = "";
    if (!rows.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 4;
      td.className = "lb-empty";
      td.textContent = "No runs yet for this level.";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
    rows.forEach((r, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td class="lb-rank">${i + 1}</td><td class="lb-name">${escapeHtml(r.name)}</td><td>${r.accuracyPct}%</td><td class="lb-time">${formatTime(r.timeCompletedSec)}</td>`;
      tbody.appendChild(tr);
    });
  }

  function activateLevel(level) {
    panels.forEach(({ level: lv, tab, panel }) => {
      const on = lv === level;
      tab.classList.toggle("lb-tab--active", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.setAttribute("tabindex", on ? "0" : "-1");
      panel.classList.toggle("hidden", !on);
      panel.setAttribute("aria-hidden", on ? "false" : "true");
    });
  }

  async function loadAll() {
    const LB = window.StroopLeaderboard;
    const configured = LB && LB.isRemoteConfigured();

    if (subtitleEl) {
      subtitleEl.textContent = configured
        ? "Scores from Supabase (shared across devices)."
        : "Add api-config.js with Supabase credentials for cross-device scores.";
    }
    if (statusEl) statusEl.textContent = "Loading…";
    if (refreshBtn) refreshBtn.disabled = true;

    try {
      if (!LB || !LB.fetchScoresForLevel) throw new Error("Leaderboard API not loaded");

      const results = await Promise.all([
        LB.fetchScoresForLevel(1),
        LB.fetchScoresForLevel(2),
        LB.fetchScoresForLevel(3),
      ]);

      const anyFallback = results.some((r) => r.source === "local");
      if (statusEl) {
        if (!configured) {
          statusEl.textContent = "Showing this browser only (localStorage).";
        } else if (anyFallback) {
          statusEl.textContent = "Some data loaded from this device (network or API error).";
        } else {
          statusEl.textContent = "Connected to cloud leaderboard.";
        }
      }

      panels.forEach((p, i) => renderTable(p.tbody, results[i].rows));
    } catch {
      if (statusEl) statusEl.textContent = "Could not load scores.";
      panels.forEach((p) => {
        p.tbody.innerHTML = "";
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 4;
        td.className = "lb-empty";
        td.textContent = "Error loading leaderboard.";
        tr.appendChild(td);
        p.tbody.appendChild(tr);
      });
    } finally {
      if (refreshBtn) refreshBtn.disabled = false;
    }
  }

  panels.forEach(({ level, tab }) => {
    tab.addEventListener("click", () => activateLevel(level));
  });

  if (refreshBtn) refreshBtn.addEventListener("click", () => loadAll());

  activateLevel(1);
  loadAll();
})();
