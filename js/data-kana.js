/*
 * data-kana.js — the hiragana syllabary, split into the three sets a learner
 * normally tackles in order, plus the grid layout used by the chart view.
 *
 * Readings are not stored here: they come from Romaji.kanaToRomaji() so the
 * prompt and the answer can never drift apart.
 */
(function (global) {
  'use strict';

  var SETS = [
    {
      id: 'basic',
      label: 'Basic kana',
      hint: 'The 46 core syllables — start here.',
      rows: [
        ['あ', 'い', 'う', 'え', 'お'],
        ['か', 'き', 'く', 'け', 'こ'],
        ['さ', 'し', 'す', 'せ', 'そ'],
        ['た', 'ち', 'つ', 'て', 'と'],
        ['な', 'に', 'ぬ', 'ね', 'の'],
        ['は', 'ひ', 'ふ', 'へ', 'ほ'],
        ['ま', 'み', 'む', 'め', 'も'],
        ['や', null, 'ゆ', null, 'よ'],
        ['ら', 'り', 'る', 'れ', 'ろ'],
        ['わ', null, null, null, 'を'],
        ['ん', null, null, null, null]
      ]
    },
    {
      id: 'dakuten',
      label: 'Dakuten & handakuten',
      hint: 'The " and ° marks: が, ざ, だ, ば, ぱ rows.',
      rows: [
        ['が', 'ぎ', 'ぐ', 'げ', 'ご'],
        ['ざ', 'じ', 'ず', 'ぜ', 'ぞ'],
        ['だ', 'ぢ', 'づ', 'で', 'ど'],
        ['ば', 'び', 'ぶ', 'べ', 'ぼ'],
        ['ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ']
      ]
    },
    {
      id: 'yoon',
      label: 'Combinations (yōon)',
      hint: 'Kana paired with a small ゃ, ゅ or ょ.',
      rows: [
        ['きゃ', 'きゅ', 'きょ'],
        ['しゃ', 'しゅ', 'しょ'],
        ['ちゃ', 'ちゅ', 'ちょ'],
        ['にゃ', 'にゅ', 'にょ'],
        ['ひゃ', 'ひゅ', 'ひょ'],
        ['みゃ', 'みゅ', 'みょ'],
        ['りゃ', 'りゅ', 'りょ'],
        ['ぎゃ', 'ぎゅ', 'ぎょ'],
        ['じゃ', 'じゅ', 'じょ'],
        ['びゃ', 'びゅ', 'びょ'],
        ['ぴゃ', 'ぴゅ', 'ぴょ']
      ]
    }
  ];

  // Flatten into study items, in teaching order, skipping the grid's gaps.
  var ITEMS = [];
  SETS.forEach(function (set) {
    set.kana = [];
    set.rows.forEach(function (row) {
      row.forEach(function (k) {
        if (!k) return;
        set.kana.push(k);
        ITEMS.push({
          id: 'k:' + k,
          level: 1,
          set: set.id,
          kana: k,
          romaji: global.Romaji.kanaToRomaji(k)
        });
      });
    });
  });

  var BY_KANA = {};
  ITEMS.forEach(function (item) { BY_KANA[item.kana] = item; });

  global.KanaData = {
    sets: SETS,
    items: ITEMS,
    byKana: BY_KANA,
    /** Every kana character that appears in a string, as study-item ids. */
    itemsIn: function (text) {
      var found = [];
      var i = 0;
      while (i < text.length) {
        var pair = text.substr(i, 2);
        if (BY_KANA[pair]) { found.push(BY_KANA[pair]); i += 2; continue; }
        if (BY_KANA[text[i]]) found.push(BY_KANA[text[i]]);
        i += 1;
      }
      return found;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = (typeof window !== 'undefined' ? window : globalThis).KanaData;
}
