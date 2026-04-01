(function () {
  "use strict";

  const byId = (id) => document.getElementById(id);

  const panels = [1, 2, 3].map((lv) => ({
    level: lv,
    tab: byId(`lb-tab-${lv}`),
    panel: byId(`lb-panel-${lv}`),
    tbody: byId(`lb-tbody-${lv}`),
  }));

  function formatTime(sec) {
    if (sec < 60) return `${sec.toFixed(1)}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s.toFixed(1)}s`;
  }

  function renderTable(level, tbody) {
    const rows = window.ChineseStroopLB.sortRows(window.ChineseStroopLB.rowsForLevel(level));
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

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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

  panels.forEach(({ level, tab }) => {
    tab.addEventListener("click", () => activateLevel(level));
  });

  panels.forEach(({ level, tbody }) => renderTable(level, tbody));

  activateLevel(1);
})();
