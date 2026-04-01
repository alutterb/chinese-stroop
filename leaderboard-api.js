(function (global) {
  "use strict";

  const TABLE = "stroop_scores";
  const FETCH_LIMIT = 100;

  function getConfig() {
    const c = global.STROOP_API;
    if (!c || typeof c.supabaseUrl !== "string" || typeof c.supabaseAnonKey !== "string") return null;
    const url = c.supabaseUrl.trim().replace(/\/$/, "");
    const key = c.supabaseAnonKey.trim();
    if (!url || !key || url.includes("YOUR_") || key.includes("YOUR_")) return null;
    return { supabaseUrl: url, supabaseAnonKey: key };
  }

  function headers(cfg) {
    return {
      apikey: cfg.supabaseAnonKey,
      Authorization: "Bearer " + cfg.supabaseAnonKey,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    };
  }

  function mapRow(r) {
    return {
      name: r.name,
      level: r.level,
      accuracyPct: r.accuracy_pct,
      timeCompletedSec: Number(r.time_completed_sec),
      ts: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    };
  }

  /**
   * @param {{ name: string; level: number; accuracyPct: number; timeCompletedSec: number }} row
   * @returns {Promise<{ ok: boolean; remote: boolean }>}
   */
  async function submitRun(row) {
    const local = global.ChineseStroopLocal;
    const cfg = getConfig();

    const payload = {
      name: String(row.name || "Anonymous").slice(0, 40),
      level: Math.min(3, Math.max(1, Number(row.level) || 1)),
      accuracy_pct: Math.min(100, Math.max(0, Math.round(Number(row.accuracyPct) || 0))),
      time_completed_sec: Math.max(0, Number(row.timeCompletedSec) || 0),
    };

    if (!cfg) {
      local.add({
        name: payload.name,
        level: payload.level,
        accuracyPct: payload.accuracy_pct,
        timeCompletedSec: payload.time_completed_sec,
      });
      return { ok: true, remote: false };
    }

    try {
      const res = await fetch(`${cfg.supabaseUrl}/rest/v1/${TABLE}`, {
        method: "POST",
        headers: headers(cfg),
        body: JSON.stringify([payload]),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || res.statusText);
      }
      return { ok: true, remote: true };
    } catch {
      local.add({
        name: payload.name,
        level: payload.level,
        accuracyPct: payload.accuracy_pct,
        timeCompletedSec: payload.time_completed_sec,
      });
      return { ok: false, remote: false };
    }
  }

  /**
   * @param {number} level
   * @returns {Promise<{ rows: ReturnType<typeof mapRow>[]; source: "remote" | "local" }>}
   */
  async function fetchScoresForLevel(level) {
    const local = global.ChineseStroopLocal;
    const lv = Math.min(3, Math.max(1, Number(level) || 1));
    const cfg = getConfig();

    if (!cfg) {
      return {
        rows: local.sortRows(local.rowsForLevel(lv)),
        source: "local",
      };
    }

    try {
      const q = new URLSearchParams({
        level: `eq.${lv}`,
        order: "accuracy_pct.desc,time_completed_sec.asc",
        limit: String(FETCH_LIMIT),
        select: "name,level,accuracy_pct,time_completed_sec,created_at",
      });
      const res = await fetch(`${cfg.supabaseUrl}/rest/v1/${TABLE}?${q.toString()}`, {
        method: "GET",
        headers: {
          apikey: cfg.supabaseAnonKey,
          Authorization: "Bearer " + cfg.supabaseAnonKey,
        },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("bad response");
      return { rows: data.map(mapRow), source: "remote" };
    } catch {
      return {
        rows: local.sortRows(local.rowsForLevel(lv)),
        source: "local",
      };
    }
  }

  function isRemoteConfigured() {
    return getConfig() != null;
  }

  global.StroopLeaderboard = {
    submitRun,
    fetchScoresForLevel,
    isRemoteConfigured,
    getConfig,
  };
})(typeof window !== "undefined" ? window : globalThis);
