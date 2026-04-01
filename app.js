(function () {
  "use strict";

  const STORAGE_PREFIX = "chineseStroop_";
  const STORAGE_VERSION = 1;
  const PLAYER_NAME_KEY = STORAGE_PREFIX + "playerName";
  const TRIALS_PER_RUN = 24;
  const OPTION_COUNT = 5;
  const FEEDBACK_MS = 550;
  const TRIAL_MS = 15000;

  /** @type {readonly { id: string; en: string; zh: string; pinyin: string; hex: string }[]} */
  const COLORS = Object.freeze([
    { id: "red", en: "Red", zh: "红色", pinyin: "hóng sè", hex: "#e53935" },
    { id: "green", en: "Green", zh: "绿色", pinyin: "lǜ sè", hex: "#43a047" },
    { id: "yellow", en: "Yellow", zh: "黄色", pinyin: "huáng sè", hex: "#ffea00" },
    { id: "blue", en: "Blue", zh: "蓝色", pinyin: "lán sè", hex: "#1e88e5" },
    { id: "purple", en: "Purple", zh: "紫色", pinyin: "zǐ sè", hex: "#ab47bc" },
    { id: "orange", en: "Orange", zh: "橙色", pinyin: "chéng sè", hex: "#fb8c00" },
    { id: "brown", en: "Brown", zh: "咖啡色", pinyin: "kāfēi sè", hex: "#6d4c41" },
    { id: "black", en: "Black", zh: "黑色", pinyin: "hēi sè", hex: "#212121" },
    { id: "white", en: "White", zh: "白色", pinyin: "bái sè", hex: "#fafafa" },
    { id: "gray", en: "Gray", zh: "灰色", pinyin: "huī sè", hex: "#78909c" },
    { id: "gold", en: "Gold", zh: "金色", pinyin: "jīn sè", hex: "#b8860b" },
    { id: "silver", en: "Silver", zh: "银色", pinyin: "yín sè", hex: "#7d8fa3" },
  ]);

  const byId = (id) => /** @type {HTMLElement} */ (document.getElementById(id));

  const el = {
    intro: byId("screen-intro"),
    trial: byId("screen-trial"),
    summary: byId("screen-summary"),
    trialCountLabel: byId("trial-count-label"),
    badge: byId("trial-level-badge"),
    progress: byId("trial-progress"),
    countdown: byId("trial-countdown"),
    stimulus: byId("stimulus-word"),
    inkBar: byId("ink-bar"),
    options: byId("options"),
    feedback: byId("feedback"),
    sumLevel: byId("sum-level"),
    sumCorrect: byId("sum-correct"),
    sumRt: byId("sum-rt"),
    sumTime: byId("sum-time"),
    sumLifetime: byId("sum-lifetime"),
    btnAgainSame: byId("btn-again-same"),
    btnAgainMenu: byId("btn-again-menu"),
    playerName: /** @type {HTMLInputElement | null} */ (document.getElementById("player-name")),
  };

  el.trialCountLabel.textContent = String(TRIALS_PER_RUN);

  if (el.playerName) {
    el.playerName.value = localStorage.getItem(PLAYER_NAME_KEY) || "";
    el.playerName.addEventListener("input", () => {
      localStorage.setItem(PLAYER_NAME_KEY, el.playerName.value.trim().slice(0, 40));
    });
  }

  /** @type {Map<string, typeof COLORS[0]>} */
  const colorMap = new Map(COLORS.map((c) => [c.id, c]));

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function randomCongruentPair() {
    const c = COLORS[Math.floor(Math.random() * COLORS.length)];
    return { semanticId: c.id, inkId: c.id };
  }

  function randomIncongruentPair() {
    let semantic = COLORS[Math.floor(Math.random() * COLORS.length)];
    let ink = COLORS[Math.floor(Math.random() * COLORS.length)];
    let guard = 0;
    while (ink.id === semantic.id && guard++ < 50) {
      ink = COLORS[Math.floor(Math.random() * COLORS.length)];
    }
    if (ink.id === semantic.id) {
      const i = COLORS.indexOf(semantic);
      ink = COLORS[(i + 1) % COLORS.length];
    }
    return { semanticId: semantic.id, inkId: ink.id };
  }

  /**
   * @param {number} level
   * @returns {{ semanticId: string; inkId: string; correctId: string }}
   */
  function buildTrial(level) {
    if (level === 1) {
      const { semanticId, inkId } = randomCongruentPair();
      return { semanticId, inkId, correctId: semanticId };
    }
    const { semanticId, inkId } = randomIncongruentPair();
    return { semanticId, inkId, correctId: inkId };
  }

  /**
   * @param {string} correctId
   * @returns {typeof COLORS}
   */
  function sampleOptions(correctId) {
    const correct = colorMap.get(correctId);
    if (!correct) throw new Error("bad correctId");
    const others = COLORS.filter((c) => c.id !== correctId);
    const picked = shuffle(others).slice(0, OPTION_COUNT - 1);
    return shuffle([correct, ...picked]);
  }

  const LEVEL_LABELS = {
    1: "Level 1",
    2: "Level 2",
    3: "Level 3",
  };

  /** @type {number | null} */
  let currentLevel = null;
  /** @type {ReturnType<typeof buildTrial>[]} */
  let trialQueue = [];
  let trialIndex = 0;
  /** @type {number | null} */
  let trialShownAt = null;
  let awaitingAnswer = false;
  /** @type {{ level: number; semanticId: string; inkId: string; correctId: string; chosenId: string | null; correct: boolean; reactionTimeMs: number | null }[]} */
  let sessionLog = [];
  let feedbackTimer = 0;
  /** @type {number} */
  let runStartedPerf = 0;
  let countdownInterval = 0;
  let trialTimeoutId = 0;

  function getPlayerName() {
    const fromInput = el.playerName?.value?.trim() || "";
    const fromStore = localStorage.getItem(PLAYER_NAME_KEY)?.trim() || "";
    const raw = fromInput || fromStore;
    return raw ? raw.slice(0, 40) : "Anonymous";
  }

  function clearCountdownAndDeadline() {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = 0;
    }
    if (trialTimeoutId) {
      clearTimeout(trialTimeoutId);
      trialTimeoutId = 0;
    }
  }

  function showScreen(which) {
    el.intro.classList.toggle("hidden", which !== "intro");
    el.trial.classList.toggle("hidden", which !== "trial");
    el.summary.classList.toggle("hidden", which !== "summary");
  }

  function clearFeedbackTimer() {
    if (feedbackTimer) {
      clearTimeout(feedbackTimer);
      feedbackTimer = 0;
    }
  }

  function startLevel(level) {
    clearFeedbackTimer();
    clearCountdownAndDeadline();
    runStartedPerf = performance.now();
    currentLevel = level;
    trialQueue = [];
    for (let i = 0; i < TRIALS_PER_RUN; i++) trialQueue.push(buildTrial(level));
    trialIndex = 0;
    sessionLog = [];
    showScreen("trial");
    showTrial();
  }

  function updateCountdownDisplay(deadlinePerf) {
    const left = Math.max(0, (deadlinePerf - performance.now()) / 1000);
    el.countdown.textContent = `${left.toFixed(1)}s`;
    el.countdown.classList.toggle("countdown--urgent", left <= 5);
  }

  function showTrial() {
    clearFeedbackTimer();
    clearCountdownAndDeadline();
    awaitingAnswer = true;
    trialShownAt = performance.now();
    el.feedback.classList.add("hidden");
    el.feedback.textContent = "";
    el.feedback.classList.remove("ok", "bad");

    const t = trialQueue[trialIndex];
    const semantic = colorMap.get(t.semanticId);
    const ink = colorMap.get(t.inkId);
    if (!semantic || !ink) return;

    const deadlinePerf = trialShownAt + TRIAL_MS;

    el.badge.textContent = LEVEL_LABELS[/** @type {1|2|3} */ (currentLevel)] || "";
    el.progress.textContent = `Trial ${trialIndex + 1} / ${TRIALS_PER_RUN}`;
    updateCountdownDisplay(deadlinePerf);

    el.stimulus.textContent = semantic.en;
    el.stimulus.style.color = ink.hex;
    el.inkBar.classList.remove("ink-bar--gold", "ink-bar--silver");
    el.inkBar.hidden = true;
    if (ink.id === "gold") {
      el.inkBar.hidden = false;
      el.inkBar.classList.add("ink-bar--gold");
    } else if (ink.id === "silver") {
      el.inkBar.hidden = false;
      el.inkBar.classList.add("ink-bar--silver");
    }

    const opts = sampleOptions(t.correctId);
    el.options.innerHTML = "";
    const showPinyin = currentLevel === 1 || currentLevel === 2;

    opts.forEach((c) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option-btn";
      btn.dataset.colorId = c.id;
      if (showPinyin) {
        btn.innerHTML = `${escapeHtml(c.zh)}<span class="option-pinyin">${escapeHtml(c.pinyin)}</span>`;
      } else {
        btn.textContent = c.zh;
      }
      btn.addEventListener("click", () => onOptionClick(c.id));
      el.options.appendChild(btn);
    });

    countdownInterval = window.setInterval(() => updateCountdownDisplay(deadlinePerf), 100);
    trialTimeoutId = window.setTimeout(onTrialTimeout, TRIAL_MS);
  }

  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function advanceAfterFeedback() {
    feedbackTimer = 0;
    trialIndex += 1;
    if (trialIndex >= trialQueue.length) {
      endSession();
    } else {
      showTrial();
    }
  }

  function onTrialTimeout() {
    trialTimeoutId = 0;
    if (!awaitingAnswer || currentLevel === null || trialShownAt === null) return;
    awaitingAnswer = false;
    clearCountdownAndDeadline();

    const t = trialQueue[trialIndex];
    sessionLog.push({
      level: currentLevel,
      semanticId: t.semanticId,
      inkId: t.inkId,
      correctId: t.correctId,
      chosenId: null,
      correct: false,
      reactionTimeMs: TRIAL_MS,
    });

    el.feedback.classList.remove("hidden");
    el.feedback.classList.remove("ok");
    el.feedback.classList.add("bad");
    el.feedback.textContent = `Time's up (${TRIAL_MS / 1000}s)`;

    const buttons = el.options.querySelectorAll(".option-btn");
    buttons.forEach((b) => {
      b.disabled = true;
      const id = b.getAttribute("data-color-id");
      if (id === t.correctId) b.classList.add("correct-reveal");
    });

    feedbackTimer = window.setTimeout(advanceAfterFeedback, FEEDBACK_MS);
  }

  /**
   * @param {string} chosenId
   */
  function onOptionClick(chosenId) {
    if (!awaitingAnswer || currentLevel === null || trialShownAt === null) return;
    awaitingAnswer = false;
    clearCountdownAndDeadline();

    const t = trialQueue[trialIndex];
    const rt = Math.round(performance.now() - trialShownAt);
    const correct = chosenId === t.correctId;

    sessionLog.push({
      level: currentLevel,
      semanticId: t.semanticId,
      inkId: t.inkId,
      correctId: t.correctId,
      chosenId,
      correct,
      reactionTimeMs: rt,
    });

    el.feedback.classList.remove("hidden");
    el.feedback.classList.toggle("ok", correct);
    el.feedback.classList.toggle("bad", !correct);
    el.feedback.textContent = correct ? `Correct · ${rt} ms` : `Incorrect · ${rt} ms`;

    const buttons = el.options.querySelectorAll(".option-btn");
    buttons.forEach((b) => {
      const id = b.getAttribute("data-color-id");
      b.disabled = true;
      if (id === chosenId && !correct) b.classList.add("wrong-pick");
      if (id === t.correctId) b.classList.add("correct-reveal");
    });

    feedbackTimer = window.setTimeout(advanceAfterFeedback, FEEDBACK_MS);
  }

  function meanRtCorrect() {
    const times = sessionLog.filter((r) => r.correct).map((r) => r.reactionTimeMs);
    if (!times.length) return null;
    return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + "state");
      if (!raw) return { v: STORAGE_VERSION, sessions: [], lifetime: { correct: 0, total: 0, sumRtCorrect: 0, nRtCorrect: 0 } };
      const parsed = JSON.parse(raw);
      if (parsed.v !== STORAGE_VERSION || !parsed.lifetime) {
        return { v: STORAGE_VERSION, sessions: [], lifetime: { correct: 0, total: 0, sumRtCorrect: 0, nRtCorrect: 0 } };
      }
      return parsed;
    } catch {
      return { v: STORAGE_VERSION, sessions: [], lifetime: { correct: 0, total: 0, sumRtCorrect: 0, nRtCorrect: 0 } };
    }
  }

  function saveState(state) {
    const sessions = state.sessions.slice(-25);
    localStorage.setItem(STORAGE_PREFIX + "state", JSON.stringify({ ...state, sessions }));
  }

  function formatRunTime(sec) {
    if (sec < 60) return `${sec.toFixed(1)} s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s.toFixed(1)}s`;
  }

  function endSession() {
    clearFeedbackTimer();
    clearCountdownAndDeadline();
    awaitingAnswer = false;
    const n = sessionLog.length;
    const correctN = sessionLog.filter((r) => r.correct).length;
    const meanRt = meanRtCorrect();
    const timeCompletedSec = Math.round(((performance.now() - runStartedPerf) / 1000) * 10) / 10;
    const accuracyPct = n ? Math.round((100 * correctN) / n) : 0;

    const state = loadState();
    state.sessions.push({
      ts: Date.now(),
      level: currentLevel,
      nTrials: n,
      correct: correctN,
      meanRtCorrect: meanRt,
    });
    state.lifetime.total += n;
    state.lifetime.correct += correctN;
    sessionLog.forEach((r) => {
      if (r.correct && r.reactionTimeMs != null) {
        state.lifetime.sumRtCorrect += r.reactionTimeMs;
        state.lifetime.nRtCorrect += 1;
      }
    });
    saveState(state);

    if (window.ChineseStroopLB && currentLevel != null) {
      window.ChineseStroopLB.add({
        name: getPlayerName(),
        level: currentLevel,
        accuracyPct,
        timeCompletedSec,
      });
    }

    el.sumLevel.textContent = currentLevel != null ? LEVEL_LABELS[/** @type {1|2|3} */ (currentLevel)] : "—";
    el.sumCorrect.textContent = `${correctN} / ${n} (${accuracyPct}%)`;
    el.sumRt.textContent = meanRt != null ? `${meanRt} ms` : "—";
    el.sumTime.textContent = formatRunTime(timeCompletedSec);

    const L = state.lifetime;
    const lifeMean = L.nRtCorrect ? Math.round(L.sumRtCorrect / L.nRtCorrect) : null;
    el.sumLifetime.textContent =
      L.total > 0
        ? `All sessions on this device: ${L.correct} / ${L.total} correct${lifeMean != null ? ` · mean RT (correct): ${lifeMean} ms` : ""}.`
        : "";

    showScreen("summary");
  }

  document.querySelectorAll(".level-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lv = Number(btn.getAttribute("data-level"));
      if (lv >= 1 && lv <= 3) startLevel(lv);
    });
  });

  el.btnAgainSame.addEventListener("click", () => {
    if (currentLevel != null) startLevel(currentLevel);
  });

  el.btnAgainMenu.addEventListener("click", () => {
    clearFeedbackTimer();
    clearCountdownAndDeadline();
    showScreen("intro");
  });
})();
