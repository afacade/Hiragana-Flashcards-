/*
 * store.js — everything that survives a reload: card scheduling state,
 * settings, daily streak and review history. Backed by localStorage, with a
 * JSON export/import so progress can be moved between browsers.
 */
(function (global) {
  'use strict';

  var KEY = 'hiragana-trainer/v1';
  var SRS = global.SRS;

  var DEFAULT_SETTINGS = {
    answerMode: 'tap',            // 'tap' | 'mixed' | 'type'
    sets: { basic: true, dakuten: false, yoon: false },
    newPerSession: 8,
    maxReviews: 60,
    wordTiers: { 1: true, 2: true, 3: true, 4: true },
    matchKanaProgress: false,
    showMeaningHint: false,
    autoAdvance: true,
    sound: true
  };

  var state = null;

  function todayKey(ts) {
    var d = new Date(ts || Date.now());
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function blank() {
    return {
      version: 1,
      created: Date.now(),
      cards: {},
      settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
      history: {},                 // 'YYYY-MM-DD' -> reviews that day
      totals: { reviews: 0, correct: 0 },
      streak: { current: 0, best: 0, last: null }
    };
  }

  function merge(base, saved) {
    // Shallow-merge saved settings over defaults so new options appear with
    // sensible values after an update.
    var out = JSON.parse(JSON.stringify(base));
    Object.keys(saved || {}).forEach(function (k) {
      var v = saved[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object') {
        Object.keys(v).forEach(function (kk) { out[k][kk] = v[kk]; });
      } else if (v !== undefined) {
        out[k] = v;
      }
    });
    return out;
  }

  function load() {
    state = blank();
    var raw;
    try {
      raw = global.localStorage.getItem(KEY);
    } catch (err) {
      raw = null; // private mode, blocked storage — run in memory
    }
    if (raw) {
      try {
        var saved = JSON.parse(raw);
        state.created = saved.created || state.created;
        state.cards = saved.cards || {};
        state.settings = merge(DEFAULT_SETTINGS, saved.settings);
        state.history = saved.history || {};
        state.totals = merge(state.totals, saved.totals);
        state.streak = merge(state.streak, saved.streak);
      } catch (err) {
        // Corrupt payload: start clean rather than trap the user on an error.
        state = blank();
      }
    }
    return state;
  }

  function save() {
    try {
      global.localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      /* storage unavailable or full — keep going with in-memory state */
    }
  }

  function settings() { return state.settings; }

  function card(id) {
    return state.cards[id] || null;
  }

  function cardOrNew(id) {
    if (!state.cards[id]) state.cards[id] = SRS.newCard(id);
    return state.cards[id];
  }

  /** Record one answer against the totals, the day history and the streak. */
  function recordReview(correct) {
    var key = todayKey();
    state.history[key] = (state.history[key] || 0) + 1;
    state.totals.reviews += 1;
    if (correct) state.totals.correct += 1;
    bumpStreak(key);
  }

  function bumpStreak(key) {
    var s = state.streak;
    if (s.last === key) return;
    var yesterday = todayKey(Date.now() - SRS.DAY);
    s.current = (s.last === yesterday) ? s.current + 1 : 1;
    s.last = key;
    if (s.current > s.best) s.best = s.current;
  }

  /** Take back the most recent review (used when an answer is re-graded). */
  function undoReview(wasCorrect) {
    var key = todayKey();
    if (state.history[key]) state.history[key] -= 1;
    if (state.totals.reviews > 0) state.totals.reviews -= 1;
    if (wasCorrect && state.totals.correct > 0) state.totals.correct -= 1;
  }

  /** Streak, corrected for days gone by since the last study session. */
  function streak() {
    var s = state.streak;
    if (!s.last) return { current: 0, best: s.best || 0 };
    var today = todayKey();
    var yesterday = todayKey(Date.now() - SRS.DAY);
    var current = (s.last === today || s.last === yesterday) ? s.current : 0;
    return { current: current, best: s.best || 0 };
  }

  function history() { return state.history; }
  function totals() { return state.totals; }
  function all() { return state; }

  function reset(scope) {
    if (scope === 'all') {
      state = blank();
    } else {
      // Drop just the cards of one level, keeping settings and stats.
      var prefix = scope === 1 ? 'k:' : 'w:';
      Object.keys(state.cards).forEach(function (id) {
        if (id.indexOf(prefix) === 0) delete state.cards[id];
      });
    }
    save();
  }

  function exportJSON() {
    return JSON.stringify(state, null, 2);
  }

  function importJSON(text) {
    var incoming = JSON.parse(text);
    if (!incoming || typeof incoming !== 'object' || !incoming.cards) {
      throw new Error('That file does not look like a progress export.');
    }
    state.cards = incoming.cards || {};
    state.settings = merge(DEFAULT_SETTINGS, incoming.settings);
    state.history = incoming.history || {};
    state.totals = merge({ reviews: 0, correct: 0 }, incoming.totals);
    state.streak = merge({ current: 0, best: 0, last: null }, incoming.streak);
    save();
  }

  global.Store = {
    load: load,
    save: save,
    settings: settings,
    card: card,
    cardOrNew: cardOrNew,
    recordReview: recordReview,
    undoReview: undoReview,
    streak: streak,
    history: history,
    totals: totals,
    all: all,
    reset: reset,
    exportJSON: exportJSON,
    importJSON: importJSON,
    todayKey: todayKey,
    defaults: DEFAULT_SETTINGS
  };
})(typeof window !== 'undefined' ? window : globalThis);
