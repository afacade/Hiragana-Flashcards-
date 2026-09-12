/*
 * session.js — builds a study queue and decides what to show next.
 *
 * The queue holds entries {id, due} where `due` counts cards shown, not time.
 * Answering advances the counter by one; a card re-queued with a gap of 12
 * therefore reappears roughly twelve cards later. Cards that graduate leave
 * the queue for the day.
 */
(function (global) {
  'use strict';

  var Store = global.Store;
  var SRS = global.SRS;

  /** Items of a level that the current settings allow. */
  function pool(level) {
    var s = Store.settings();
    if (level === 1) {
      return global.KanaData.items.filter(function (it) { return s.sets[it.set]; });
    }
    var items = global.WordData.items.filter(function (it) { return s.wordTiers[it.tier]; });
    if (s.matchKanaProgress) {
      var known = items.filter(function (it) { return usesKnownKana(it); });
      // Never leave the learner with an empty deck: fall back to everything.
      if (known.length >= 5) return known;
    }
    return items;
  }

  // True when every kana in the item has at least been introduced.
  function usesKnownKana(item) {
    var parts = global.KanaData.itemsIn(item.kana);
    if (!parts.length) return false;
    return parts.every(function (k) {
      var c = Store.card(k.id);
      return c && c.state !== 'new';
    });
  }

  function counts(level, now) {
    now = now || Date.now();
    var items = pool(level);
    var due = 0, fresh = 0, done = 0;
    items.forEach(function (it) {
      var c = Store.card(it.id);
      if (!c || c.state === 'new') fresh += 1;
      else if (c.due <= now) due += 1;
      else done += 1;
    });
    return { total: items.length, due: due, fresh: fresh, waiting: done };
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  /**
   * Build a session.
   * @param {number} level 1 or 2
   * @param {object} [opts] {ahead:true} pulls cards forward when nothing is due
   */
  function build(level, opts) {
    opts = opts || {};
    var now = Date.now();
    var s = Store.settings();
    var items = pool(level);
    var byId = {};
    items.forEach(function (it) { byId[it.id] = it; });

    var dueItems = [];
    var newItems = [];
    var future = [];

    items.forEach(function (it) {
      var c = Store.card(it.id);
      if (!c || c.state === 'new') newItems.push(it);
      else if (c.due <= now) dueItems.push({ item: it, due: c.due });
      else future.push({ item: it, due: c.due });
    });

    dueItems.sort(function (a, b) { return a.due - b.due; });
    var reviews = dueItems.slice(0, s.maxReviews).map(function (d) { return d.item; });
    shuffle(reviews);

    // New material is introduced in teaching order, not shuffled.
    var fresh = newItems.slice(0, s.newPerSession);

    if (!reviews.length && !fresh.length && opts.ahead) {
      // Nothing is due: study the nearest upcoming cards early.
      future.sort(function (a, b) { return a.due - b.due; });
      reviews = future.slice(0, Math.max(10, s.newPerSession)).map(function (f) { return f.item; });
      shuffle(reviews);
    }

    var queue = [];
    var pos = 0;

    // Interleave: a new card every few reviews so nothing arrives in a lump.
    var every = reviews.length && fresh.length
      ? Math.max(2, Math.floor(reviews.length / fresh.length))
      : 1;
    var ri = 0, fi = 0;
    while (ri < reviews.length || fi < fresh.length) {
      for (var n = 0; n < every && ri < reviews.length; n++) {
        queue.push({ id: reviews[ri++].id, due: pos++ });
      }
      if (fi < fresh.length) queue.push({ id: fresh[fi++].id, due: pos++ });
    }

    return {
      level: level,
      items: byId,
      queue: queue,
      step: 0,
      lastId: null,
      startedAt: now,
      planned: queue.length,
      stats: { answered: 0, correct: 0, introduced: 0, again: 0 }
    };
  }

  /** The next card to show, or null when the session is finished. */
  function next(session) {
    if (!session.queue.length) return null;

    var ready = session.queue.filter(function (e) { return e.due <= session.step; });
    if (!ready.length) {
      // Everything left is scheduled further out; jump the clock forward.
      var soonest = session.queue.reduce(function (a, b) { return b.due < a.due ? b : a; });
      session.step = soonest.due;
      ready = session.queue.filter(function (e) { return e.due <= session.step; });
    }

    ready.sort(function (a, b) { return a.due - b.due; });

    // Avoid showing the same card twice in a row when there is a choice.
    var pick = ready[0];
    if (pick.id === session.lastId && ready.length > 1) pick = ready[1];

    return { entry: pick, item: session.items[pick.id] };
  }

  /**
   * Apply an answer: updates the card, re-queues it if it is not finished.
   * @returns {number|null} gap in cards, or null when done for the day
   */
  function answer(session, entry, correct) {
    var card = Store.cardOrNew(entry.id);
    var snapshot = JSON.parse(JSON.stringify(card));
    var stepBefore = session.step;
    var gap = SRS.grade(card, correct, Date.now());

    session.step += 1;
    session.lastId = entry.id;
    session.stats.answered += 1;
    if (snapshot.state === 'new') session.stats.introduced += 1;
    if (correct) session.stats.correct += 1; else session.stats.again += 1;

    var i = session.queue.indexOf(entry);
    if (i !== -1) session.queue.splice(i, 1);

    var requeued = null;
    if (gap !== null) {
      // Jitter by a card either way so the order does not feel mechanical.
      var jitter = Math.floor(Math.random() * 3) - 1;
      requeued = { id: entry.id, due: session.step + Math.max(1, gap + jitter) };
      session.queue.push(requeued);
    }

    // Kept so a mistyped answer can be taken back without corrupting the
    // card's schedule.
    session.lastAnswer = {
      id: entry.id,
      snapshot: snapshot,
      correct: correct,
      requeued: requeued,
      stepBefore: stepBefore
    };

    Store.recordReview(correct);
    Store.save();
    return gap;
  }

  /**
   * Re-grade the answer just given — used by "that was a typo".
   * Restores the card exactly as it was, then applies the new verdict.
   */
  function reanswer(session, correct) {
    var last = session.lastAnswer;
    if (!last || last.correct === correct) return false;

    Store.all().cards[last.id] = JSON.parse(JSON.stringify(last.snapshot));
    if (last.requeued) {
      var i = session.queue.indexOf(last.requeued);
      if (i !== -1) session.queue.splice(i, 1);
    }
    session.stats.answered -= 1;
    if (last.snapshot.state === 'new') session.stats.introduced -= 1;
    if (last.correct) session.stats.correct -= 1; else session.stats.again -= 1;
    session.step = last.stepBefore;
    Store.undoReview(last.correct);

    answer(session, { id: last.id }, correct);
    return true;
  }

  function remaining(session) {
    return session.queue.length;
  }

  global.Session = {
    pool: pool,
    counts: counts,
    build: build,
    next: next,
    answer: answer,
    reanswer: reanswer,
    remaining: remaining
  };
})(typeof window !== 'undefined' ? window : globalThis);
