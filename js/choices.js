/*
 * choices.js — builds the things you tap.
 *
 * Level 1: four readings, where the three wrong ones are picked to be
 * genuinely confusable — characters that look alike (ぬ/め), share a consonant
 * or a vowel, or differ only by a dakuten. Random wrong answers would make the
 * question answerable without knowing the kana.
 *
 * Level 2: the reading is cut into word tiles you tap in order, mixed into a
 * bank of decoy tiles built by bending the real ones (voicing, long vowels,
 * particles) and borrowing from other items.
 */
(function (global) {
  'use strict';

  var Romaji = global.Romaji;

  // Characters a beginner genuinely mixes up by shape.
  var LOOKALIKE = {
    'あ': ['お', 'め', 'ぬ'], 'お': ['あ', 'む', 'ね'],
    'い': ['り', 'こ'], 'り': ['い', 'け'],
    'う': ['つ', 'ら'], 'つ': ['う', 'し'],
    'き': ['さ', 'ち'], 'さ': ['き', 'ち'], 'ち': ['さ', 'ら', 'せ'],
    'く': ['へ'], 'へ': ['く'],
    'け': ['は', 'ほ', 'り'],
    'こ': ['に', 'い'], 'に': ['こ', 'た'],
    'し': ['つ', 'ん'], 'ん': ['し', 'そ'],
    'す': ['む'], 'む': ['す', 'お'],
    'せ': ['ち', 'を'], 'そ': ['ろ', 'ん'],
    'た': ['な', 'に'], 'な': ['た'],
    'ぬ': ['め', 'ね', 'あ'], 'め': ['ぬ', 'の', 'あ'], 'ね': ['れ', 'わ', 'ぬ'],
    'の': ['め'],
    'は': ['ほ', 'ま', 'け'], 'ほ': ['は', 'ま'], 'ま': ['は', 'ほ', 'も'],
    'ひ': ['い'], 'ふ': ['ら'], 'ら': ['ち', 'ふ'],
    'み': ['ろ'], 'も': ['ま', 'し'],
    'や': ['か'], 'よ': ['ま', 'は'],
    'る': ['ろ', 'ふ'], 'ろ': ['る', 'そ', 'み'],
    'れ': ['ね', 'わ'], 'わ': ['ね', 'れ'],
    'を': ['せ']
  };

  var VOICED = { k: 'g', g: 'k', s: 'z', z: 's', t: 'd', d: 't', h: 'b', b: 'p', p: 'h', f: 'b', j: 'z' };
  var PARTICLES = ['o', 'wa', 'e', 'ni', 'ga', 'de', 'to', 'wo', 'ha', 'he'];
  // How each spoken particle is actually written — the decoy worth offering.
  var SPELLED_AS = { wa: 'ha', e: 'he', o: 'wo' };

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  // Strip the dakuten so が and か count as a pair (and きゃ with ぎゃ).
  function base(kana) {
    return kana.normalize ? kana.normalize('NFD')[0] : kana[0];
  }

  function onset(romaji) { return romaji.replace(/[aiueo]+$/, ''); }
  function coda(romaji) { return (romaji.match(/[aiueo]+$/) || [''])[0]; }

  function confusability(target, candidate) {
    var score = Math.random();          // keeps repeats from looking identical
    var look = LOOKALIKE[target.kana];
    if (look && look.indexOf(candidate.kana) !== -1) score += 6;
    if (base(target.kana) === base(candidate.kana)) score += 5;
    if (onset(target.romaji) === onset(candidate.romaji)) score += 2.5;
    if (coda(target.romaji) === coda(candidate.romaji)) score += 2;
    if (target.romaji.length === candidate.romaji.length) score += 0.5;
    return score;
  }

  /**
   * Four readings for a Level 1 card, shuffled, the right one among them.
   * @returns {{options: string[], answer: string}}
   */
  function options(item, pool, count) {
    count = count || 4;
    var taken = {};
    taken[Romaji.normalize(item.romaji)] = true;

    var ranked = pool
      .filter(function (other) {
        var key = Romaji.normalize(other.romaji);
        if (taken[key]) return false;    // skip じ/ぢ style duplicates
        return true;
      })
      .map(function (other) { return { item: other, score: confusability(item, other) }; })
      .sort(function (a, b) { return b.score - a.score; });

    var picked = [item.romaji];
    for (var i = 0; i < ranked.length && picked.length < count; i++) {
      var key = Romaji.normalize(ranked[i].item.romaji);
      if (taken[key]) continue;
      taken[key] = true;
      picked.push(ranked[i].item.romaji);
    }

    return { options: shuffle(picked), answer: item.romaji };
  }

  /* ----------------------------- word tiles ---------------------------- */

  // How many tiles a single word is cut into: short words stay whole and
  // become a pick-one-from-many instead.
  function tileCount(syllables) {
    if (syllables <= 2) return 1;
    if (syllables <= 5) return 2;
    if (syllables <= 8) return 3;
    return 4;
  }

  function groupEvenly(parts, groups) {
    var out = [];
    var index = 0;
    var left = parts.length;
    for (var g = groups; g > 0; g--) {
      var take = Math.ceil(left / g);
      out.push(parts.slice(index, index + take).join(''));
      index += take;
      left -= take;
    }
    return out;
  }

  /** Cut a reading into the tiles that must be tapped, in order. */
  function slotsFor(reading) {
    var words = reading.trim().split(/\s+/).filter(Boolean);
    if (words.length > 1) return words;          // a sentence: tile per word

    var parts = Romaji.syllables(words[0]);
    return groupEvenly(parts, tileCount(parts.length));
  }

  // Plausible wrong tiles built by bending a right one.
  function mutations(tile) {
    var out = [];
    var first = tile[0];

    if (VOICED[first]) out.push(VOICED[first] + tile.slice(1));
    if (tile.indexOf('sh') === 0) out.push('s' + tile.slice(2));
    else if (first === 's') out.push('sh' + tile.slice(1));
    if (tile.indexOf('ch') === 0) out.push('t' + tile.slice(2));
    else if (first === 't') out.push('ch' + tile.slice(1));
    if (first === 'f') out.push('h' + tile.slice(1));
    else if (first === 'h') out.push('f' + tile.slice(1));

    // Long vowels are the most common reading slip, so offer the other
    // length. Shortening suits any tile ("gakkou" → "gakko"); lengthening
    // only a short one, since "tabemasu" → "tabemasuu" reads as a typo
    // rather than a reading someone would actually choose.
    if (/ou$|uu$|oo$/.test(tile)) out.push(tile.slice(0, -1));
    else if (/[ou]$/.test(tile) && tile.length <= 3) out.push(tile + 'u');

    // Swap the final vowel, avoiding one that just doubles the vowel before
    // it — "atsui" → "atsuu" reads as a slipped key, not a plausible reading.
    var last = tile.slice(-1);
    if ('aiueo'.indexOf(last) !== -1) {
      var previous = tile.slice(-2, -1);
      var others = 'aiueo'.replace(last, '').split('').filter(function (v) { return v !== previous; });
      if (others.length) out.push(tile.slice(0, -1) + others[Math.floor(Math.random() * others.length)]);
    }
    return out;
  }

  /**
   * Tiles for a Level 2 card.
   * @returns {{slots: string[], bank: string[]}}
   */
  function tiles(item, pool) {
    var slots = slotsFor(item.romaji);
    var used = {};
    slots.forEach(function (t) { used[Romaji.normalize(t)] = true; });

    // Enough decoys to make it a real choice, few enough to stay thumb-sized.
    var wanted = slots.length === 1 ? 5 : slots.length >= 5 ? 3 : 4;
    var decoys = [];

    function offer(tile) {
      if (decoys.length >= wanted) return;
      if (!tile || !/^[a-z]+$/.test(tile)) return;
      var key = Romaji.normalize(tile);
      if (!key || used[key]) return;
      used[key] = true;
      decoys.push(tile);
    }

    // A particle slot gets rival particles — including the spelling the
    // learner might expect, so choosing it teaches the rule. Capped at two,
    // or every decoy would be a particle and the real words would place
    // themselves.
    var particleSlots = slots.filter(function (t) { return PARTICLES.indexOf(t) !== -1; });
    if (particleSlots.length) {
      var room = decoys.length + 2;
      // The written form of this item's own particle goes in first: choosing
      // it is the mistake worth making, because it gets the rule explained.
      var rivals = particleSlots
        .map(function (t) { return SPELLED_AS[t]; })
        .filter(Boolean)
        .concat(shuffle(PARTICLES.slice()));
      rivals.forEach(function (t) {
        if (decoys.length < room) offer(t);
      });
    }

    // Then bend the content words, longest first: those are the tiles whose
    // reading is actually in question.
    slots.slice()
      .sort(function (a, b) { return b.length - a.length; })
      .forEach(function (t) { shuffle(mutations(t)).forEach(offer); });

    // Top up from other items of the same kind, preferring similar lengths.
    if (decoys.length < wanted) {
      var target = slots[0].length;
      var borrowed = [];
      pool.forEach(function (other) {
        if (other.id === item.id) return;
        slotsFor(other.romaji).forEach(function (t) { borrowed.push(t); });
      });
      borrowed.sort(function (a, b) {
        return (Math.abs(a.length - target) + Math.random() * 2)
             - (Math.abs(b.length - target) + Math.random() * 2);
      });
      borrowed.forEach(offer);
    }

    return { slots: slots, bank: shuffle(slots.concat(decoys)) };
  }

  global.Choices = {
    options: options,
    tiles: tiles,
    slotsFor: slotsFor
  };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = (typeof window !== 'undefined' ? window : globalThis).Choices;
}
