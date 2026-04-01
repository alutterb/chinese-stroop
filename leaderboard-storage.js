(function (global) {
  "use strict";

  const KEY = "chineseStroop_leaderboard";
  const V = 1;
  const MAX_ROWS = 300;

  /**
   * @returns {{ v: number; rows: { name: string; level: number; accuracyPct: number; timeCompletedSec: number; ts: number }[] }}
   */
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { v: V, rows: [] };
      const o = JSON.parse(raw);
      if (o.v !== V || !Array.isArray(o.rows)) return { v: V, rows: [] };
      return o;
    } catch {
      return { v: V, rows: [] };
    }
  }

  function save(data) {
    const rows = data.rows.slice(-MAX_ROWS);
    localStorage.setItem(KEY, JSON.stringify({ v: V, rows }));
  }

  /**
   * @param {{ name: string; level: number; accuracyPct: number; timeCompletedSec: number }} row
   */
  function add(row) {
    const d = load();
    d.rows.push({
      name: row.name,
      level: row.level,
      accuracyPct: row.accuracyPct,
      timeCompletedSec: row.timeCompletedSec,
      ts: Date.now(),
    });
    save(d);
  }

  /**
   * @param {number} level
   */
  function rowsForLevel(level) {
    return load().rows.filter((r) => r.level === level);
  }

  /** Higher accuracy first; same accuracy → faster time first. */
  function sortRows(rows) {
    return rows.slice().sort((a, b) => {
      if (b.accuracyPct !== a.accuracyPct) return b.accuracyPct - a.accuracyPct;
      return a.timeCompletedSec - b.timeCompletedSec;
    });
  }

  global.ChineseStroopLB = { load, add, rowsForLevel, sortRows, KEY, V };
})(typeof window !== "undefined" ? window : globalThis);
