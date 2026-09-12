/*
 * srs.js — the scheduler.
 *
 * Two clocks run at once:
 *
 *   Within a session, a card you miss comes back a few cards later, and keeps
 *   coming back until you get it right. Each success pushes it further down
 *   the queue, so the gap grows: 3 cards, then 8, then 15.
 *
 *   Between sessions, a graduated card gets a real interval in days that
 *   multiplies by its ease factor every time you recall it (1 → 3 → 7 → 17 …).
 *   A lapse drops it back into the queue and shrinks its ease, so cards you
 *   keep missing stay frequent and cards you know drift out of the way.
 */
(function (global) {
  'use strict';

  var DAY = 86400000;

  // Gaps, measured in "cards shown", before an unfinished card returns.
  // A new card is met three times in one session, further apart each time.
  var LEARNING_GAPS = [4, 12];
  var RELEARN_GAPS = [6];
  var AGAIN_GAP = 2;

  var EASE_START = 2.5;
  var EASE_MIN = 1.3;
  var EASE_MAX = 3.0;
  var EASE_UP = 0.05;
  var EASE_DOWN = 0.2;

  var MATURE_DAYS = 21;
  var YOUNG_DAYS = 7;

  function newCard(id) {
    return {
      id: id,
      state: 'new',
      step: 0,
      ease: EASE_START,
      interval: 0,      // days
      due: 0,           // ms timestamp; 0 means "not scheduled yet"
      reps: 0,
      lapses: 0,
      streak: 0,
      seen: 0,
      correct: 0,
      lastSeen: 0
    };
  }

  function clampEase(e) {
    return Math.max(EASE_MIN, Math.min(EASE_MAX, e));
  }

  // Spread due dates a little so a big batch does not all come back together.
  function fuzz(days) {
    if (days < 2) return days;
    var spread = Math.max(1, Math.round(days * 0.1));
    return days + (Math.floor(Math.random() * (spread * 2 + 1)) - spread);
  }

  function schedule(card, days, now) {
    card.interval = Math.max(1, days);
    card.due = now + fuzz(card.interval) * DAY;
  }

  /**
   * Grade an answer.
   *
   * @param {object} card    mutated in place
   * @param {boolean} correct
   * @param {number} now     ms timestamp
   * @returns {number|null}  how many cards until it should reappear this
   *                         session, or null if it is done for today
   */
  function grade(card, correct, now) {
    now = now || Date.now();
    card.seen += 1;
    card.reps += 1;
    card.lastSeen = now;

    if (correct) card.correct += 1;
    card.streak = correct ? card.streak + 1 : 0;

    if (!correct) {
      if (card.state === 'review') {
        // A lapse: back to the front of the queue, and it stays easier to
        // trigger again for a while.
        card.lapses += 1;
        card.ease = clampEase(card.ease - EASE_DOWN);
        card.state = 'relearning';
        card.step = 0;
        card.interval = Math.max(1, Math.round(card.interval * 0.4));
      } else {
        card.state = card.state === 'relearning' ? 'relearning' : 'learning';
        card.step = 0;
      }
      card.due = now;
      return AGAIN_GAP;
    }

    if (card.state === 'new' || card.state === 'learning') {
      card.state = 'learning';
      if (card.step >= LEARNING_GAPS.length) {
        // Graduated: it now lives on the day clock.
        card.state = 'review';
        card.step = 0;
        schedule(card, 1, now);
        return null;
      }
      return LEARNING_GAPS[card.step++];
    }

    if (card.state === 'relearning') {
      if (card.step >= RELEARN_GAPS.length) {
        card.state = 'review';
        card.step = 0;
        schedule(card, Math.max(1, card.interval), now);
        return null;
      }
      return RELEARN_GAPS[card.step++];
    }

    // A due review recalled correctly: stretch the interval.
    card.ease = clampEase(card.ease + EASE_UP);
    var next = Math.max(card.interval + 1, Math.round(card.interval * card.ease));
    schedule(card, next, now);
    return null;
  }

  /** 0 new · 1 learning · 2 young · 3 mature · 4 mastered */
  function mastery(card) {
    if (!card || card.state === 'new') return 0;
    if (card.state === 'learning' || card.state === 'relearning') return 1;
    if (card.interval < YOUNG_DAYS) return 2;
    if (card.interval < MATURE_DAYS) return 3;
    return 4;
  }

  var MASTERY_LABELS = ['Not started', 'Learning', 'Familiar', 'Strong', 'Mastered'];

  function isDue(card, now) {
    if (!card || card.state === 'new') return false;
    return card.due <= (now || Date.now());
  }

  /** Human-readable "when will I see this again". */
  function dueLabel(card, now) {
    if (!card || card.state === 'new') return 'new';
    now = now || Date.now();
    if (card.due <= now) return 'due now';
    var days = Math.ceil((card.due - now) / DAY);
    if (days <= 1) return 'tomorrow';
    if (days < 30) return 'in ' + days + ' days';
    var months = Math.round(days / 30);
    return 'in ' + months + (months === 1 ? ' month' : ' months');
  }

  global.SRS = {
    DAY: DAY,
    newCard: newCard,
    grade: grade,
    mastery: mastery,
    masteryLabels: MASTERY_LABELS,
    isDue: isDue,
    dueLabel: dueLabel,
    learningGaps: LEARNING_GAPS
  };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = (typeof window !== 'undefined' ? window : globalThis).SRS;
}
