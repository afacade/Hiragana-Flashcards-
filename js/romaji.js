/*
 * romaji.js — kana → romaji transliteration and tolerant answer checking.
 *
 * Two jobs:
 *   1. kanaToRomaji()  turns a hiragana string into its Hepburn reading, so the
 *      app never has to trust a hand-typed reading for a plain word.
 *   2. checkAnswer()   compares what the learner typed against the expected
 *      reading, accepting any common romanisation (shi/si, tsu/tu, ja/zya, …)
 *      and flagging "close" answers (long vowels, particle spellings) instead
 *      of punishing them.
 */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------------------
   * Kana table (Hepburn). Two-character yoon entries are listed first so the
   * tokeniser can try a 2-char lookahead before falling back to 1 char.
   * ------------------------------------------------------------------- */
  var KANA = {
    // yoon (contracted sounds)
    'きゃ': 'kya', 'きゅ': 'kyu', 'きょ': 'kyo',
    'しゃ': 'sha', 'しゅ': 'shu', 'しょ': 'sho',
    'ちゃ': 'cha', 'ちゅ': 'chu', 'ちょ': 'cho',
    'にゃ': 'nya', 'にゅ': 'nyu', 'にょ': 'nyo',
    'ひゃ': 'hya', 'ひゅ': 'hyu', 'ひょ': 'hyo',
    'みゃ': 'mya', 'みゅ': 'myu', 'みょ': 'myo',
    'りゃ': 'rya', 'りゅ': 'ryu', 'りょ': 'ryo',
    'ぎゃ': 'gya', 'ぎゅ': 'gyu', 'ぎょ': 'gyo',
    'じゃ': 'ja',  'じゅ': 'ju',  'じょ': 'jo',
    'ぢゃ': 'ja',  'ぢゅ': 'ju',  'ぢょ': 'jo',
    'びゃ': 'bya', 'びゅ': 'byu', 'びょ': 'byo',
    'ぴゃ': 'pya', 'ぴゅ': 'pyu', 'ぴょ': 'pyo',
    'しぇ': 'she', 'ちぇ': 'che', 'じぇ': 'je',
    'てぃ': 'ti',  'でぃ': 'di',  'とぅ': 'tu', 'どぅ': 'du',
    'ふぁ': 'fa',  'ふぃ': 'fi',  'ふぇ': 'fe', 'ふぉ': 'fo',
    'うぃ': 'wi',  'うぇ': 'we',  'うぉ': 'wo',

    // gojuon
    'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
    'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
    'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
    'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
    'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
    'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
    'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
    'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
    'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
    'わ': 'wa', 'ゐ': 'wi', 'ゑ': 'we', 'を': 'wo', 'ん': 'n',

    // dakuten / handakuten
    'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
    'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
    'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
    'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
    'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
    'ゔ': 'vu',

    // small vowels standing alone
    'ぁ': 'a', 'ぃ': 'i', 'ぅ': 'u', 'ぇ': 'e', 'ぉ': 'o',
    'ゃ': 'ya', 'ゅ': 'yu', 'ょ': 'yo'
  };

  var SOKUON = 'っ';

  /**
   * Transliterate a hiragana string to its literal Hepburn reading.
   * Spaces and punctuation are preserved so sentences stay readable.
   */
  function kanaToRomaji(kana) {
    var out = '';
    var i = 0;
    var pendingSokuon = false;

    while (i < kana.length) {
      var ch = kana[i];

      if (ch === SOKUON) {
        pendingSokuon = true;
        i += 1;
        continue;
      }

      var pair = kana.substr(i, 2);
      var syllable = null;
      var width = 1;

      if (KANA[pair] !== undefined) {
        syllable = KANA[pair];
        width = 2;
      } else if (KANA[ch] !== undefined) {
        syllable = KANA[ch];
      }

      if (syllable === null) {
        // Not kana (space, punctuation, latin) — pass it through untouched.
        if (ch === '　') out += ' ';
        else if ('。、！？'.indexOf(ch) === -1) out += ch;
        else if (ch === '？') out += '?';
        i += 1;
        pendingSokuon = false;
        continue;
      }

      if (pendingSokuon) {
        // Hepburn writes っ + ch as "tch" (matcha), otherwise it doubles.
        out += syllable.indexOf('ch') === 0 ? 't' : syllable[0];
        pendingSokuon = false;
      }

      // ん before a vowel or y needs an apostrophe: きんえん → kin'en.
      if (out.slice(-1) === 'n' && /^[aiueoy]/.test(syllable) && endsWithSyllabicN(kana, i)) {
        out += "'";
      }

      out += syllable;
      i += width;
    }

    if (pendingSokuon) out += 'tsu';
    return out;
  }

  // True when the character just before index i was ん (not part of a na-row kana).
  function endsWithSyllabicN(kana, i) {
    for (var j = i - 1; j >= 0; j--) {
      var c = kana[j];
      if (c === ' ' || c === '　') continue;
      return c === 'ん';
    }
    return false;
  }

  /* ---------------------------------------------------------------------
   * Normalisation: fold every common romanisation system onto one canonical
   * spelling so "shashin", "syasin" and "shasin" all compare equal.
   * ------------------------------------------------------------------- */
  function normalize(input) {
    var s = (input || '').toLowerCase().trim();

    // Macrons and circumflexes → doubled vowels (ō is written ou far more
    // often than oo in words the learner will meet here).
    s = s.replace(/[āâ]/g, 'aa')
         .replace(/[īî]/g, 'ii')
         .replace(/[ūû]/g, 'uu')
         .replace(/[ēê]/g, 'ee')
         .replace(/[ōô]/g, 'ou');

    // Everything that is not a latin letter is noise: spaces, apostrophes,
    // hyphens, full stops, Japanese punctuation.
    s = s.replace(/[^a-z]/g, '');

    // Geminates written with t/c before ch.
    s = s.replace(/cchi/g, 'tti').replace(/cch/g, 'tty')
         .replace(/tchi/g, 'tti').replace(/tch/g, 'tty');

    // sh / ch / ts / j families → kunrei-style canonical form.
    s = s.replace(/shi/g, 'si').replace(/sh/g, 'sy');
    s = s.replace(/chi/g, 'ti').replace(/ch/g, 'ty');
    s = s.replace(/tsu/g, 'tu');
    s = s.replace(/jy/g, 'zy').replace(/ji/g, 'zi').replace(/j/g, 'zy');
    s = s.replace(/fu/g, 'hu');

    // ぢ / づ share readings with じ / ず.
    s = s.replace(/di/g, 'zi').replace(/du/g, 'zu');

    // Syllabic ん: "nn" and "m" before a labial both mean ん.
    s = s.replace(/m(?=[bpm])/g, 'n');
    s = s.replace(/nn/g, 'n');

    return s;
  }

  /**
   * Second-chance comparison that ignores long-vowel spelling only
   * (tokyo/toukyou, gakko/gakkou, ju/juu). Everything else stays strict.
   */
  function looseForm(canonical) {
    return canonical.replace(/ou/g, 'o').replace(/oo/g, 'o').replace(/uu/g, 'u');
  }

  /** Levenshtein distance, capped — used only to say "looks like a typo". */
  function editDistance(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 99;
    var prev = [];
    var i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      var cur = [i];
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(
          prev[j] + 1,
          cur[j - 1] + 1,
          prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
      prev = cur;
    }
    return prev[b.length];
  }

  /**
   * Grade a typed answer.
   *
   * @param {string} input     what the learner typed
   * @param {string} expected  the reading we want (Hepburn, may contain spaces)
   * @param {string} [literal] reading spelled straight from the kana; differs
   *                           from `expected` for particles (は→wa, へ→e, を→o)
   * @returns {{status:'correct'|'close'|'typo'|'wrong', note:string|null}}
   */
  function checkAnswer(input, expected, literal) {
    var typed = normalize(input);
    var want = normalize(expected);

    if (!typed) return { status: 'wrong', note: null };
    if (typed === want) return { status: 'correct', note: null };

    // The character を on its own is fairly called either "wo" or "o".
    // (Inside a sentence it is a particle, handled as a near-miss below.)
    if (want === 'wo' && typed === 'o') return { status: 'correct', note: null };

    // Spelled the particle the way it is written rather than the way it is read.
    if (literal) {
      var lit = normalize(literal);
      if (lit !== want && typed === lit) {
        return { status: 'close', note: 'particle' };
      }
    }

    // Only the length of a long vowel differs.
    if (looseForm(typed) === looseForm(want)) {
      return { status: 'close', note: 'longvowel' };
    }

    // One slipped key on a longer answer.
    if (want.length >= 4 && editDistance(typed, want) === 1) {
      return { status: 'typo', note: null };
    }

    return { status: 'wrong', note: null };
  }

  global.Romaji = {
    table: KANA,
    kanaToRomaji: kanaToRomaji,
    normalize: normalize,
    checkAnswer: checkAnswer,
    editDistance: editDistance
  };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = (typeof window !== 'undefined' ? window : globalThis).Romaji;
}
