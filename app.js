(function () {
  "use strict";

  const STORAGE_PREFIX = "chineseStroop_";
  const STORAGE_VERSION = 1;
  const TRIALS_PER_RUN = 24;
  const OPTION_COUNT = 5;
  const FEEDBACK_MS = 550;

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
    stimulus: byId("stimulus-word"),
    options: byId("options"),
    feedback: byId("feedback"),
    sumLevel: byId("sum-level"),
    sumCorrect: byId("sum-correct"),
    sumRt: byId("sum-rt"),
    sumLifetime: byId("sum-lifetime"),
    btnAgainSame: byId("btn-again-same"),
    btnAgainMenu: byId("btn-again-menu"),
  };

  el.trialCountLabel.textContent = String(TRIALS_PER_RUN);

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
    currentLevel = level;
    trialQueue = [];
    for (let i = 0; i < TRIALS_PER_RUN; i++) trialQueue.push(buildTrial(level));
    trialIndex = 0;
    sessionLog = [];
    showScreen("trial");
    showTrial();
  }

  function showTrial() {
    clearFeedbackTimer();
    awaitingAnswer = true;
    trialShownAt = performance.now();
    el.feedback.classList.add("hidden");
    el.feedback.textContent = "";
    el.feedback.classList.remove("ok", "bad");

    const t = trialQueue[trialIndex];
    const semantic = colorMap.get(t.semanticId);
    const ink = colorMap.get(t.inkId);
    if (!semantic || !ink) return;

    el.badge.textContent = LEVEL_LABELS[/** @type {1|2|3} */ (currentLevel)] || "";
    el.progress.textContent = `Trial ${trialIndex + 1} / ${TRIALS_PER_RUN}`;

    el.stimulus.textContent = semantic.en;
    el.stimulus.classList.remove("stimulus-word--gold", "stimulus-word--silver");
    el.stimulus.style.removeProperty("color");
    if (ink.id === "gold") {
      el.stimulus.classList.add("stimulus-word--gold");
    } else if (ink.id === "silver") {
      el.stimulus.classList.add("stimulus-word--silver");
    } else {
      el.stimulus.style.color = ink.hex;
    }

    const opts = sampleOptions(t.correctId);
    el.options.innerHTML = "";
    const showPinyin = currentLevel === 2;

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
  }

  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * @param {string} chosenId
   */
  function onOptionClick(chosenId) {
    if (!awaitingAnswer || currentLevel === null || trialShownAt === null) return;
    awaitingAnswer = false;
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

    feedbackTimer = window.setTimeout(() => {
      feedbackTimer = 0;
      trialIndex += 1;
      if (trialIndex >= trialQueue.length) {
        endSession();
      } else {
        showTrial();
      }
    }, FEEDBACK_MS);
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

  function endSession() {
    clearFeedbackTimer();
    awaitingAnswer = false;
    const n = sessionLog.length;
    const correctN = sessionLog.filter((r) => r.correct).length;
    const meanRt = meanRtCorrect();

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

    el.sumLevel.textContent = currentLevel != null ? LEVEL_LABELS[/** @type {1|2|3} */ (currentLevel)] : "—";
    el.sumCorrect.textContent = `${correctN} / ${n} (${n ? Math.round((100 * correctN) / n) : 0}%)`;
    el.sumRt.textContent = meanRt != null ? `${meanRt} ms` : "—";

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
    showScreen("intro");
  });
})();
