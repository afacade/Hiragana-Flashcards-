/*
 * app.js — views, the study loop and everything the user touches.
 */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var VIEWS = ['home', 'study', 'summary', 'chart', 'stats'];
  var session = null;
  var current = null;      // {entry, item} being asked
  var phase = 'ask';       // 'ask' | 'answered'
  var advanceTimer = null;
  var currentView = 'home';
  var mode = 'tap';            // how the current card is answered
  var placed = [];             // tiles dropped into slots, Level 2
  var puzzle = null;           // {slots, bank} for the current Level 2 card

  // A touch device only raises its keyboard for a real gesture, so focus is
  // never forced here — see the input's click handler for the rest.
  var isTouch = typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: coarse)').matches;
  var selectedKana = null;   // chart tile whose detail is open

  /* ------------------------------ utilities ------------------------- */

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  var toastTimer = null;
  function toast(message) {
    var box = $('#toast');
    box.textContent = message;
    box.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { box.hidden = true; }, 2600);
  }

  function pct(part, whole) {
    if (!whole) return 0;
    return Math.round((part / whole) * 100);
  }

  function plural(n, one, many) {
    return n + ' ' + (n === 1 ? one : (many || one + 's'));
  }

  /* -------------------------------- sound --------------------------- */

  var audio = null;
  function beep(kind) {
    if (!Store.settings().sound) return;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audio) audio = new Ctx();
      if (audio.state === 'suspended') audio.resume();
      var osc = audio.createOscillator();
      var gain = audio.createGain();
      var now = audio.currentTime;
      var freq = kind === 'correct' ? 660 : kind === 'close' ? 520 : 200;
      osc.type = kind === 'wrong' ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, now);
      if (kind === 'correct') osc.frequency.exponentialRampToValueAtTime(880, now + 0.09);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(kind === 'wrong' ? 0.07 : 0.11, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      osc.connect(gain).connect(audio.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch (err) { /* audio is a nicety, never a blocker */ }
  }

  /* ------------------------------- routing -------------------------- */

  function show(view) {
    currentView = view;
    VIEWS.forEach(function (name) {
      $('#view-' + name).hidden = (name !== view);
    });
    $$('.nav-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.go === view);
    });
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });

    if (view !== 'chart') {
      selectedKana = null;
      $('#kana-detail').hidden = true;
    }
    if (view === 'home') renderHome();
    if (view === 'chart') renderChart();
    if (view === 'stats') renderStats();
  }

  /* -------------------------------- home ---------------------------- */

  function statBox(value, label) {
    var box = el('div', 'stat-box');
    box.appendChild(el('b', null, String(value)));
    box.appendChild(el('span', null, label));
    return box;
  }

  function masteryCounts(items) {
    var out = [0, 0, 0, 0, 0];
    items.forEach(function (it) { out[SRS.mastery(Store.card(it.id))] += 1; });
    return out;
  }

  function renderHome() {
    var streak = Store.streak();
    var totals = Store.totals();
    var today = Store.history()[Store.todayKey()] || 0;
    var kanaMastered = masteryCounts(KanaData.items).slice(3).reduce(function (a, b) { return a + b; }, 0);

    var strip = $('#home-stats');
    strip.innerHTML = '';
    strip.appendChild(statBox(streak.current, streak.current === 1 ? 'day streak' : 'day streak'));
    strip.appendChild(statBox(today, 'reviews today'));
    strip.appendChild(statBox(pct(totals.correct, totals.reviews) + '%', 'accuracy'));
    strip.appendChild(statBox(kanaMastered, 'kana known'));

    [1, 2].forEach(function (level) {
      var items = Session.pool(level);
      var counts = Session.counts(level);
      var m = masteryCounts(items);
      var learned = items.length - m[0];
      var strong = m[3] + m[4];

      $('#l' + level + '-meter').style.width = pct(strong, items.length) + '%';
      $('#l' + level + '-progress').textContent = items.length
        ? learned + ' of ' + items.length + ' started · ' + strong + ' well known'
        : 'Nothing selected — check Settings.';

      var row = $('#l' + level + '-counts');
      row.innerHTML = '';
      if (counts.due) row.appendChild(el('span', 'pill hot', counts.due + ' due now'));
      if (counts.fresh) row.appendChild(el('span', 'pill new', counts.fresh + ' new'));
      if (!counts.due && !counts.fresh && items.length) {
        row.appendChild(el('span', 'pill done', 'All caught up'));
      }
      if (counts.waiting) row.appendChild(el('span', 'pill', counts.waiting + ' scheduled'));
    });
  }

  /* -------------------------------- study --------------------------- */

  function startSession(level, ahead) {
    session = Session.build(level, { ahead: ahead });
    if (!session.queue.length) {
      // Nothing due: offer to pull work forward rather than a dead end.
      showEmptySummary(level);
      return;
    }
    show('study');
    nextCard();
  }

  function nextCard() {
    clearTimeout(advanceTimer);
    var next = Session.next(session);
    if (!next) { finishSession(); return; }

    current = next;
    phase = 'ask';

    var item = next.item;
    var card = Store.card(item.id);
    var isNew = !card || card.state === 'new';

    var kana = $('#prompt-kana');
    kana.textContent = item.kana;
    kana.classList.toggle('is-long', item.kana.length > 6);

    var meta = $('#prompt-meta');
    if (session.level === 1) {
      meta.textContent = isNew ? 'new character' : 'character';
    } else {
      meta.textContent = isNew ? 'new · ' + item.tierLabel.toLowerCase() : item.tierLabel.toLowerCase();
    }

    var hint = $('#prompt-hint');
    hint.textContent = (session.level === 2 && Store.settings().showMeaningHint) ? item.meaning : '';

    $('#prompt-card').className = 'prompt-card';
    $('#feedback').innerHTML = '';
    $('#reveal-btn').hidden = false;
    $('#next-btn').hidden = true;
    $('#builder-check').hidden = false;

    mode = modeFor(session.level);
    renderAnswerArea(item);
    updateStudyBar();
  }

  /** Typing, four-way choice or word tiles, per the setting and the level. */
  function modeFor(level) {
    var setting = Store.settings().answerMode;
    if (setting === 'type') return 'type';
    if (setting === 'mixed') return level === 1 ? 'choice' : 'type';
    return level === 1 ? 'choice' : 'tiles';
  }

  function renderAnswerArea(item) {
    $('#answer-form').hidden = mode !== 'type';
    $('#choices').hidden = mode !== 'choice';
    $('#builder').hidden = mode !== 'tiles';
    $('#kbd-hint').textContent = mode === 'type'
      ? 'Enter to check, Enter again to continue'
      : 'Enter for the next card';

    if (mode === 'type') renderTyping();
    else if (mode === 'choice') renderChoices(item);
    else renderTiles(item);
  }

  function renderTyping() {
    var input = $('#answer-input');
    input.value = '';
    input.classList.remove('locked');
    input.placeholder = session.level === 1 ? 'type the reading…' : 'type the whole reading…';
    $('#answer-submit').textContent = 'Check';
    // Forcing focus on a phone leaves the field focused with the keyboard
    // dismissed, and a tap on an already-focused field opens nothing.
    if (!isTouch) input.focus();
  }

  function renderChoices(item) {
    var box = $('#choices');
    box.innerHTML = '';
    var picked = Choices.options(item, Session.pool(session.level), 4);
    picked.options.forEach(function (reading) {
      var btn = el('button', 'choice', reading);
      btn.type = 'button';
      btn.dataset.reading = reading;
      btn.addEventListener('click', function () {
        if (phase !== 'ask') return;
        answerWith(reading);
      });
      box.appendChild(btn);
    });
  }

  function renderTiles(item) {
    puzzle = Choices.tiles(item, Session.pool(session.level));
    placed = [];
    drawPuzzle();
  }

  function drawPuzzle() {
    var slots = $('#slots');
    slots.innerHTML = '';
    puzzle.slots.forEach(function (_, i) {
      var slot = el('button', 'slot');
      slot.type = 'button';
      if (placed[i]) {
        slot.textContent = placed[i].text;
        slot.classList.add('filled');
        slot.addEventListener('click', function () {
          if (phase !== 'ask') return;
          placed.splice(i, 1);        // take it back, close the gap
          drawPuzzle();
        });
      } else {
        slot.classList.add('empty');
        slot.disabled = true;
        slot.textContent = '';
      }
      slots.appendChild(slot);
    });

    var bank = $('#bank');
    bank.innerHTML = '';
    puzzle.bank.forEach(function (text, index) {
      var used = placed.some(function (p) { return p.index === index; });
      var tile = el('button', 'tile' + (used ? ' used' : ''), text);
      tile.type = 'button';
      tile.disabled = used || phase !== 'ask';
      tile.addEventListener('click', function () {
        if (phase !== 'ask' || placed.length >= puzzle.slots.length) return;
        placed.push({ index: index, text: text });
        drawPuzzle();
      });
      bank.appendChild(tile);
    });

    var check = $('#builder-check');
    check.disabled = placed.length !== puzzle.slots.length || phase !== 'ask';
    check.textContent = placed.length === puzzle.slots.length
      ? 'Check' : 'Tap the reading in order';
  }

  function assembled() {
    return placed.map(function (p) { return p.text; }).join(' ');
  }

  function updateStudyBar() {
    var done = session.stats.answered;
    var left = Session.remaining(session);
    $('#study-remaining').textContent = left + ' left';
    $('#study-score').textContent = pct(session.stats.correct, done) + '%';
    $('#study-progress').style.width = pct(done, done + left) + '%';
  }

  function submitAnswer() {
    if (phase === 'answered') { nextCard(); return; }

    if (mode === 'type') {
      var typed = $('#answer-input').value.trim();
      if (typed) answerWith(typed);
      return;
    }
    if (mode === 'tiles' && placed.length === puzzle.slots.length) answerWith(assembled());
  }

  /** One grading path for typing, choices and tiles alike. */
  function answerWith(given) {
    var item = current.item;
    var verdict = Romaji.checkAnswer(given, item.romaji, item.literal);
    var correct = verdict.status === 'correct' || verdict.status === 'close';

    var gap = Session.answer(session, current.entry, correct);
    revealFeedback(verdict, given, gap);
    beep(verdict.status === 'correct' ? 'correct' : correct ? 'close' : 'wrong');

    if (correct && verdict.status === 'correct' && Store.settings().autoAdvance) {
      advanceTimer = setTimeout(nextCard, mode === 'type' ? 750 : 900);
    }
  }

  function revealFeedback(verdict, typed, gap) {
    phase = 'answered';
    var item = current.item;
    var card = Store.card(item.id);

    lockAnswerArea(verdict, typed);
    $('#reveal-btn').hidden = true;

    var tone = verdict.status === 'correct' ? 'correct'
      : verdict.status === 'close' ? 'close' : 'wrong';
    $('#prompt-card').className = 'prompt-card is-' + tone;

    var box = el('div', 'fb ' + tone);
    var titles = {
      correct: ['Correct', '✓'],
      close: ['Almost', '≈'],
      wrong: ['Not quite', '✗']
    };
    var title = el('div', 'fb-title');
    title.appendChild(el('span', null, titles[tone][1]));
    title.appendChild(el('span', null, titles[tone][0]));
    box.appendChild(title);

    var answer = el('div', 'fb-answer');
    var kana = el('b', null, item.kana);
    answer.appendChild(kana);
    answer.appendChild(document.createTextNode('  '));
    answer.appendChild(el('span', 'fb-romaji', item.romaji));
    box.appendChild(answer);

    if (item.meaning) box.appendChild(el('div', 'fb-meaning', item.meaning));

    var note = noteFor(verdict, typed, item);
    var noteLine = note ? el('div', 'fb-note', note) : null;
    if (noteLine) box.appendChild(noteLine);

    // Say plainly when it comes back: a card still in its learning steps
    // returns inside this session, not on a day schedule.
    var whenLine = el('div', 'fb-note', scheduleLine(card, gap));

    if (tone !== 'correct') {
      var actions = el('div', 'fb-actions');
      // Only typing can produce a typo; a tapped answer was meant.
      if (verdict.status !== 'close' && mode === 'type') {
        var typoBtn = el('button', 'btn ghost', 'That was a typo — count it');
        typoBtn.type = 'button';
        typoBtn.addEventListener('click', function () {
          if (!Session.reanswer(session, true)) return;
          toast('Counted as correct');
          var regraded = Store.card(item.id);
          whenLine.textContent = regraded.state === 'review'
            ? 'Next review ' + SRS.dueLabel(regraded)
            : 'Back again later this session';
          $('#prompt-card').className = 'prompt-card is-correct';
          box.className = 'fb correct';
          title.firstChild.textContent = '✓';
          title.lastChild.textContent = 'Counted as correct';
          actions.remove();
          if (noteLine) noteLine.remove();   // "You typed …" no longer applies
          updateStudyBar();
          $('#answer-input').focus();
        });
        actions.appendChild(typoBtn);
      }
      box.appendChild(actions);
    }

    box.appendChild(whenLine);

    var fb = $('#feedback');
    fb.innerHTML = '';
    fb.appendChild(box);
    updateStudyBar();
  }

  /**
   * Freeze the answer controls and show what was right.
   * The text input is deliberately never made readOnly: on a phone that
   * dismisses the keyboard, and because the field keeps focus, tapping it
   * afterwards is not a focus change and raises nothing.
   */
  function lockAnswerArea(verdict, given) {
    var item = current.item;

    if (mode === 'type') {
      $('#answer-input').classList.add('locked');
      $('#answer-submit').textContent = 'Next';
      return;
    }

    if (mode === 'choice') {
      $$('#choices .choice').forEach(function (btn) {
        btn.disabled = true;
        var reading = Romaji.normalize(btn.dataset.reading);
        if (reading === Romaji.normalize(item.romaji)) btn.classList.add('correct');
        else if (given && reading === Romaji.normalize(given)) btn.classList.add('wrong');
      });
      $('#next-btn').hidden = false;
      return;
    }

    $$('#bank .tile').forEach(function (tile) { tile.disabled = true; });
    $$('#slots .slot').forEach(function (slot, i) {
      slot.disabled = true;
      var want = puzzle.slots[i];
      var got = placed[i] ? placed[i].text : null;
      if (got === want) {
        slot.classList.add('correct');
      } else if (got === null) {
        slot.textContent = want;             // revealed rather than answered
        slot.classList.remove('empty');
        slot.classList.add('revealed');
      } else {
        slot.classList.add(verdict.status === 'close' ? 'off' : 'wrong');
      }
    });
    $('#builder-check').hidden = true;
    $('#next-btn').hidden = false;
  }

  function scheduleLine(card, gap) {
    if (gap !== null && gap !== undefined) return 'Back again in about ' + gap + ' cards';
    return 'Next review ' + SRS.dueLabel(card);
  }

  function noteFor(verdict, typed, item) {
    if (verdict.note === 'particle') {
      var rules = {
        'は': 'は is written "ha" but read "wa" when it marks the topic.',
        'へ': 'へ is written "he" but read "e" when it marks a direction.',
        'を': 'を is written "wo" but read "o" when it marks the object.'
      };
      var notes = (item.particles || [])
        .map(function (k) { return rules[k]; })
        .filter(Boolean);
      return notes.length ? notes.join(' ') : null;
    }
    if (verdict.note === 'longvowel') {
      return 'Long vowels count: ' + item.romaji + '.';
    }
    if (verdict.status === 'wrong' && typed) {
      var verb = mode === 'type' ? 'typed' : mode === 'choice' ? 'picked' : 'built';
      return 'You ' + verb + ' "' + typed + '".';
    }
    return null;
  }

  function revealAnswer() {
    if (phase === 'answered') return;
    var gap = Session.answer(session, current.entry, false);
    revealFeedback({ status: 'wrong', note: null }, '', gap);
    beep('wrong');
  }

  function finishSession() {
    clearTimeout(advanceTimer);
    var s = session.stats;
    var minutes = Math.max(1, Math.round((Date.now() - session.startedAt) / 60000));
    var accuracy = pct(s.correct, s.answered);

    $('#summary-title').textContent = accuracy >= 90 ? 'Excellent session'
      : accuracy >= 70 ? 'Good session' : 'Session complete';
    $('#summary-sub').textContent = 'Level ' + session.level + ' · ' + plural(minutes, 'minute');
    $('#summary-pct').textContent = accuracy + '%';
    $('#summary-ring').style.background =
      'conic-gradient(var(--accent) ' + (accuracy * 3.6) + 'deg, var(--surface-3) 0deg)';

    var grid = $('#summary-grid');
    grid.innerHTML = '';
    grid.appendChild(statBox(s.answered, 'answers'));
    grid.appendChild(statBox(s.introduced, 'new cards'));
    grid.appendChild(statBox(s.again, 'missed'));

    renderMisses();

    var counts = Session.counts(session.level);
    $('#summary-again').textContent = (counts.due || counts.fresh) ? 'Keep going' : 'Study ahead';
    show('summary');
  }

  // Cards answered wrongly at least once during this session.
  function renderMisses() {
    var wrap = $('#summary-misses');
    wrap.innerHTML = '';
    var ids = Object.keys(session.items).filter(function (id) {
      var c = Store.card(id);
      return c && c.lastSeen >= session.startedAt && c.seen > 0 && c.streak === 0;
    });
    if (!ids.length) return;

    var list = el('div', 'miss-list');
    list.appendChild(el('h3', null, 'Worth another look'));
    ids.slice(0, 8).forEach(function (id) {
      var item = session.items[id];
      var row = el('div', 'miss-row');
      row.appendChild(el('span', 'k', item.kana));
      row.appendChild(el('span', 'r', item.romaji));
      list.appendChild(row);
    });
    wrap.appendChild(list);
  }

  function showEmptySummary(level) {
    session = { level: level, stats: { answered: 0, correct: 0, introduced: 0, again: 0 }, startedAt: Date.now(), items: {} };
    $('#summary-title').textContent = 'Nothing due right now';
    $('#summary-sub').textContent = 'Your Level ' + level + ' cards are all scheduled for later. That is the system working.';
    $('#summary-pct').textContent = '✓';
    $('#summary-ring').style.background = 'conic-gradient(var(--good) 360deg, var(--surface-3) 0deg)';
    $('#summary-grid').innerHTML = '';
    $('#summary-misses').innerHTML = '';
    $('#summary-again').textContent = 'Study ahead anyway';
    show('summary');
  }

  /* -------------------------------- chart --------------------------- */

  function renderChart() {
    var legend = $('#chart-legend');
    legend.innerHTML = '';
    SRS.masteryLabels.forEach(function (label, i) {
      var item = el('span');
      var swatch = el('i');
      swatch.style.background = 'var(--m' + i + ')';
      item.appendChild(swatch);
      item.appendChild(document.createTextNode(label));
      legend.appendChild(item);
    });

    var body = $('#chart-body');
    body.innerHTML = '';
    KanaData.sets.forEach(function (set) {
      var counts = masteryCounts(set.kana.map(function (k) { return KanaData.byKana[k]; }));
      var section = el('section', 'chart-set');
      var head = el('header');
      head.appendChild(el('h3', null, set.label));
      head.appendChild(el('span', 'set-hint', (set.kana.length - counts[0]) + ' of ' + set.kana.length + ' started'));
      section.appendChild(head);

      var cols = set.rows[0].length;
      var grid = el('div', 'chart-grid cols-' + cols);
      set.rows.forEach(function (row) {
        row.forEach(function (k) {
          if (!k) { grid.appendChild(el('div', 'kana-tile empty')); return; }
          var item = KanaData.byKana[k];
          var card = Store.card(item.id);
          var tile = el('button', 'kana-tile');
          tile.type = 'button';
          tile.dataset.m = SRS.mastery(card);
          tile.dataset.kana = k;
          if (selectedKana === k) tile.classList.add('selected');
          tile.appendChild(el('span', 'k', k));
          tile.appendChild(el('span', 'r', item.romaji));
          tile.appendChild(el('span', 'bar'));
          grid.appendChild(tile);
        });
      });
      section.appendChild(grid);
      body.appendChild(section);
    });

    if (selectedKana) showKanaDetail(selectedKana); else $('#kana-detail').hidden = true;
  }

  function showKanaDetail(kana) {
    var item = KanaData.byKana[kana];
    var card = Store.card(item.id);
    var box = $('#kana-detail');
    box.hidden = false;
    box.innerHTML = '';
    box.appendChild(el('span', 'big', kana));

    var dl = el('dl');
    function pair(term, value) {
      // Each label/value stays one unit so the row wraps between pairs.
      var group = el('div');
      group.appendChild(el('dt', null, term));
      group.appendChild(el('dd', null, value));
      dl.appendChild(group);
    }
    pair('Reading', item.romaji);
    pair('Status', SRS.masteryLabels[SRS.mastery(card)]);
    pair('Answered', card ? card.correct + ' / ' + card.seen + ' right' : 'not yet seen');
    pair('Next review', SRS.dueLabel(card));
    box.appendChild(dl);
  }

  /* -------------------------------- stats --------------------------- */

  function renderStats() {
    var totals = Store.totals();
    var streak = Store.streak();
    var strip = $('#stats-strip');
    strip.innerHTML = '';
    strip.appendChild(statBox(totals.reviews, 'total reviews'));
    strip.appendChild(statBox(pct(totals.correct, totals.reviews) + '%', 'accuracy'));
    strip.appendChild(statBox(streak.current, 'day streak'));
    strip.appendChild(statBox(streak.best, 'best streak'));

    renderHeatmap();

    renderBreakdown($('#stats-l1'), KanaData.sets.map(function (set) {
      return { label: set.label, items: set.kana.map(function (k) { return KanaData.byKana[k]; }) };
    }));

    renderBreakdown($('#stats-l2'), WordData.tiers.map(function (tier) {
      return {
        label: tier.label,
        items: WordData.items.filter(function (it) { return it.tier === tier.tier; })
      };
    }));
  }

  function renderHeatmap() {
    var map = $('#heatmap');
    map.innerHTML = '';
    var history = Store.history();
    var days = 84;
    var today = new Date();
    // Start on the Sunday that keeps the grid aligned to weeks.
    var start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1));
    start.setDate(start.getDate() - start.getDay());

    var cursor = new Date(start);
    while (cursor <= today) {
      var key = Store.todayKey(cursor.getTime());
      var count = history[key] || 0;
      var cell = el('i');
      cell.dataset.h = count === 0 ? 0 : count < 10 ? 1 : count < 25 ? 2 : count < 50 ? 3 : 4;
      cell.title = key + ' · ' + plural(count, 'review');
      map.appendChild(cell);
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  function renderBreakdown(target, groups) {
    target.innerHTML = '';
    var wrap = el('div', 'breakdown');
    groups.forEach(function (group) {
      var counts = masteryCounts(group.items);
      var total = group.items.length;
      var started = total - counts[0];

      var row = el('div', 'breakdown-row');
      var head = el('div', 'breakdown-head');
      head.appendChild(el('span', null, group.label));
      head.appendChild(el('span', null, started + ' / ' + total + ' started'));
      row.appendChild(head);

      var stack = el('div', 'stack');
      [1, 2, 3, 4].forEach(function (m) {
        if (!counts[m]) return;
        var seg = el('i');
        seg.dataset.m = m;
        seg.style.width = (counts[m] / total * 100) + '%';
        seg.title = counts[m] + ' ' + SRS.masteryLabels[m].toLowerCase();
        stack.appendChild(seg);
      });
      row.appendChild(stack);
      wrap.appendChild(row);
    });
    target.appendChild(wrap);
  }

  /* ------------------------------ settings -------------------------- */

  function openSettings() {
    buildSettings();
    $('#settings-modal').hidden = false;
  }

  function closeSettings() {
    $('#settings-modal').hidden = true;
    // Re-render whatever is on screen: changing the active sets alters the
    // chart, the stats breakdown and the home counts alike.
    if (currentView !== 'study') show(currentView); else renderHome();
  }

  function buildSettings() {
    var s = Store.settings();

    var setBox = $('#set-toggles');
    setBox.innerHTML = '';
    KanaData.sets.forEach(function (set) {
      var label = el('label', 'switch-row');
      var input = el('input');
      input.type = 'checkbox';
      input.checked = !!s.sets[set.id];
      input.addEventListener('change', function () {
        s.sets[set.id] = input.checked;
        if (!s.sets.basic && !s.sets.dakuten && !s.sets.yoon) {
          s.sets.basic = true;
          input.checked = set.id === 'basic';
          toast('Keep at least one set switched on');
        }
        Store.save();
        buildSettings();
      });
      var text = el('span');
      text.appendChild(document.createTextNode(set.label + ' '));
      text.appendChild(el('span', 'count', '(' + set.kana.length + ')'));
      text.appendChild(el('small', null, set.hint));
      label.appendChild(input);
      label.appendChild(text);
      setBox.appendChild(label);
    });

    var tierBox = $('#tier-toggles');
    tierBox.innerHTML = '';
    WordData.tiers.forEach(function (tier) {
      var label = el('label', 'switch-row');
      var input = el('input');
      input.type = 'checkbox';
      input.checked = !!s.wordTiers[tier.tier];
      input.addEventListener('change', function () {
        s.wordTiers[tier.tier] = input.checked;
        var any = Object.keys(s.wordTiers).some(function (k) { return s.wordTiers[k]; });
        if (!any) {
          s.wordTiers[1] = true;
          input.checked = tier.tier === 1;
          toast('Keep at least one group switched on');
        }
        Store.save();
        buildSettings();
      });
      var text = el('span');
      text.appendChild(document.createTextNode(tier.label + ' '));
      text.appendChild(el('span', 'count', '(' + tier.entries.length + ')'));
      label.appendChild(input);
      label.appendChild(text);
      tierBox.appendChild(label);
    });

    $$('input[name="answer-mode"]').forEach(function (radio) {
      radio.checked = radio.value === Store.settings().answerMode;
      radio.onchange = function () {
        if (!radio.checked) return;
        Store.settings().answerMode = radio.value;
        Store.save();
      };
    });

    bindCheckbox('#opt-match', 'matchKanaProgress');
    bindCheckbox('#opt-auto', 'autoAdvance');
    bindCheckbox('#opt-meaning', 'showMeaningHint');
    bindCheckbox('#opt-sound', 'sound');
    bindRange('#opt-new', '#val-new', 'newPerSession');
    bindRange('#opt-max', '#val-max', 'maxReviews');

    $('#data-note').textContent = 'Studying since ' + new Date(Store.all().created).toLocaleDateString()
      + ' · ' + plural(Object.keys(Store.all().cards).length, 'card') + ' tracked.';
  }

  function bindCheckbox(sel, key) {
    var input = $(sel);
    input.checked = !!Store.settings()[key];
    input.onchange = function () {
      Store.settings()[key] = input.checked;
      Store.save();
    };
  }

  function bindRange(sel, valueSel, key) {
    var input = $(sel);
    var out = $(valueSel);
    input.value = Store.settings()[key];
    out.textContent = input.value;
    input.oninput = function () {
      out.textContent = input.value;
      Store.settings()[key] = parseInt(input.value, 10);
      Store.save();
    };
  }

  /* -------------------------------- data ---------------------------- */

  function exportProgress() {
    var blob = new Blob([Store.exportJSON()], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'hiragana-progress-' + Store.todayKey() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('Progress exported');
  }

  function importProgress(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        Store.importJSON(String(reader.result));
        buildSettings();
        renderHome();
        toast('Progress imported');
      } catch (err) {
        toast(err.message || 'Could not read that file');
      }
    };
    reader.readAsText(file);
  }

  function resetScope(scope) {
    var what = scope === 'all' ? 'all progress, settings and history'
      : 'your Level ' + scope + ' progress';
    if (!window.confirm('Reset ' + what + '? This cannot be undone.')) return;
    Store.reset(scope === 'all' ? 'all' : parseInt(scope, 10));
    buildSettings();
    renderHome();
    toast('Reset done');
  }

  /* ------------------------------- events --------------------------- */

  function bind() {
    document.addEventListener('click', function (e) {
      var go = e.target.closest('[data-go]');
      if (go) { show(go.dataset.go); return; }

      var start = e.target.closest('[data-start]');
      if (start) { startSession(parseInt(start.dataset.start, 10), false); return; }

      var reset = e.target.closest('[data-reset]');
      if (reset) { resetScope(reset.dataset.reset); return; }

      var tile = e.target.closest('.kana-tile');
      if (tile && tile.dataset.kana) {
        selectedKana = selectedKana === tile.dataset.kana ? null : tile.dataset.kana;
        renderChart();
        return;
      }
    });

    $('#answer-form').addEventListener('submit', function (e) {
      e.preventDefault();
      submitAnswer();
    });

    // A tap on a field that already holds focus is not a focus change, so the
    // on-screen keyboard stays down. Dropping focus first makes it reopen.
    $('#answer-input').addEventListener('click', function () {
      if (document.activeElement === $('#answer-input')) {
        $('#answer-input').blur();
        $('#answer-input').focus();
      }
    });

    $('#builder-check').addEventListener('click', function () {
      if (phase === 'ask') submitAnswer();
    });

    $('#next-btn').addEventListener('click', nextCard);

    $('#reveal-btn').addEventListener('click', revealAnswer);

    $('#study-quit').addEventListener('click', function () {
      clearTimeout(advanceTimer);
      if (session && session.stats.answered) finishSession();
      else show('home');
    });

    $('#summary-again').addEventListener('click', function () {
      startSession(session ? session.level : 1, true);
    });

    $('#open-settings').addEventListener('click', openSettings);
    $('#close-settings').addEventListener('click', closeSettings);
    $('#settings-modal').addEventListener('click', function (e) {
      if (e.target === $('#settings-modal')) closeSettings();
    });

    $('#export-btn').addEventListener('click', exportProgress);
    $('#import-btn').addEventListener('click', function () { $('#import-file').click(); });
    $('#import-file').addEventListener('change', function (e) {
      if (e.target.files && e.target.files[0]) importProgress(e.target.files[0]);
      e.target.value = '';
    });

    document.addEventListener('keydown', function (e) {
      // Enter advances once an answer is showing, wherever focus happens to
      // be. Handled here so it also cancels the auto-advance pause.
      if (e.key === 'Enter' && !$('#view-study').hidden && phase === 'answered') {
        e.preventDefault();
        nextCard();
        return;
      }

      if (!$('#view-study').hidden && phase === 'ask') {
        // 1-4 pick a choice; Enter checks a finished row of tiles.
        if (mode === 'choice' && /^[1-4]$/.test(e.key)) {
          var buttons = $$('#choices .choice');
          var target = buttons[parseInt(e.key, 10) - 1];
          if (target) { e.preventDefault(); target.click(); }
          return;
        }
        if (mode === 'tiles' && e.key === 'Enter') {
          e.preventDefault();
          submitAnswer();
          return;
        }
      }
      if (e.key === 'Escape') {
        if (!$('#settings-modal').hidden) { closeSettings(); return; }
        if (!$('#view-study').hidden) {
          clearTimeout(advanceTimer);
          if (session && session.stats.answered) finishSession(); else show('home');
        }
      }
      // Keep typing focused on the answer box during a session.
      if (mode === 'type' && !$('#view-study').hidden && phase === 'ask'
          && document.activeElement !== $('#answer-input')
          && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        $('#answer-input').focus();
      }
    });
  }

  /* -------------------------------- boot ---------------------------- */

  Store.load();
  bind();
  show('home');
})();
