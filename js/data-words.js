/*
 * data-words.js — Level 2 material: hiragana words and sentences to read aloud
 * by typing the romaji.
 *
 * Each entry is [kana, reading, meaning]. The reading is the spoken one, which
 * is why it differs from the spelling for the three particles (は→wa, へ→e,
 * を→o); the app treats the written spelling as a "close" answer and explains
 * the rule instead of marking it wrong.
 *
 * Tiers introduce material gradually:
 *   1  short words using only basic kana
 *   2  longer words, dakuten and handakuten
 *   3  yōon words and everyday set phrases
 *   4  sentences
 */
(function (global) {
  'use strict';

  var TIERS = [
    {
      tier: 1,
      label: 'Short words',
      entries: [
        ['いぬ', 'inu', 'dog'],
        ['ねこ', 'neko', 'cat'],
        ['さかな', 'sakana', 'fish'],
        ['とり', 'tori', 'bird'],
        ['うま', 'uma', 'horse'],
        ['うし', 'ushi', 'cow'],
        ['くま', 'kuma', 'bear'],
        ['さる', 'saru', 'monkey'],
        ['ひと', 'hito', 'person'],
        ['やま', 'yama', 'mountain'],
        ['かわ', 'kawa', 'river'],
        ['うみ', 'umi', 'sea'],
        ['そら', 'sora', 'sky'],
        ['つき', 'tsuki', 'moon'],
        ['ほし', 'hoshi', 'star'],
        ['いし', 'ishi', 'stone'],
        ['ゆき', 'yuki', 'snow'],
        ['あめ', 'ame', 'rain'],
        ['はな', 'hana', 'flower'],
        ['き', 'ki', 'tree'],
        ['て', 'te', 'hand'],
        ['め', 'me', 'eye'],
        ['みみ', 'mimi', 'ear'],
        ['くち', 'kuchi', 'mouth'],
        ['あたま', 'atama', 'head'],
        ['あし', 'ashi', 'foot, leg'],
        ['こころ', 'kokoro', 'heart'],
        ['ちから', 'chikara', 'strength'],
        ['はる', 'haru', 'spring'],
        ['なつ', 'natsu', 'summer'],
        ['あき', 'aki', 'autumn'],
        ['ふゆ', 'fuyu', 'winter'],
        ['あさ', 'asa', 'morning'],
        ['ひる', 'hiru', 'noon, daytime'],
        ['よる', 'yoru', 'night'],
        ['いま', 'ima', 'now'],
        ['とき', 'toki', 'time'],
        ['あした', 'ashita', 'tomorrow'],
        ['ひがし', 'higashi', 'east'],
        ['にし', 'nishi', 'west'],
        ['みなみ', 'minami', 'south'],
        ['きた', 'kita', 'north'],
        ['いえ', 'ie', 'house'],
        ['へや', 'heya', 'room'],
        ['くるま', 'kuruma', 'car'],
        ['みち', 'michi', 'road'],
        ['はし', 'hashi', 'bridge'],
        ['えき', 'eki', 'station'],
        ['ほん', 'hon', 'book'],
        ['かみ', 'kami', 'paper'],
        ['つくえ', 'tsukue', 'desk'],
        ['いす', 'isu', 'chair'],
        ['くつ', 'kutsu', 'shoes'],
        ['ふく', 'fuku', 'clothes'],
        ['にく', 'niku', 'meat'],
        ['やさい', 'yasai', 'vegetables'],
        ['みせ', 'mise', 'shop'],
        ['なまえ', 'namae', 'name'],
        ['おかね', 'okane', 'money'],
        ['うた', 'uta', 'song'],
        ['くに', 'kuni', 'country'],
        ['にほん', 'nihon', 'Japan'],
        ['こたえ', 'kotae', 'answer'],
        ['おおきい', 'ookii', 'big'],
        ['ちいさい', 'chiisai', 'small'],
        ['あたらしい', 'atarashii', 'new'],
        ['たかい', 'takai', 'tall, expensive'],
        ['やすい', 'yasui', 'cheap'],
        ['はやい', 'hayai', 'fast, early'],
        ['おそい', 'osoi', 'slow, late'],
        ['あつい', 'atsui', 'hot'],
        ['さむい', 'samui', 'cold'],
        ['おいしい', 'oishii', 'delicious'],
        ['たのしい', 'tanoshii', 'fun'],
        ['うれしい', 'ureshii', 'happy'],
        ['のむ', 'nomu', 'to drink'],
        ['みる', 'miru', 'to see, to watch'],
        ['きく', 'kiku', 'to listen, to ask'],
        ['よむ', 'yomu', 'to read'],
        ['かく', 'kaku', 'to write'],
        ['はなす', 'hanasu', 'to speak'],
        ['いく', 'iku', 'to go'],
        ['くる', 'kuru', 'to come'],
        ['かえる', 'kaeru', 'to return'],
        ['ねる', 'neru', 'to sleep'],
        ['あるく', 'aruku', 'to walk'],
        ['はしる', 'hashiru', 'to run'],
        ['かう', 'kau', 'to buy'],
        ['つくる', 'tsukuru', 'to make'],
        ['まつ', 'matsu', 'to wait']
      ]
    },
    {
      tier: 2,
      label: 'Dakuten words',
      entries: [
        ['みず', 'mizu', 'water'],
        ['かぜ', 'kaze', 'wind'],
        ['まど', 'mado', 'window'],
        ['ぶた', 'buta', 'pig'],
        ['たまご', 'tamago', 'egg'],
        ['ともだち', 'tomodachi', 'friend'],
        ['かぞく', 'kazoku', 'family'],
        ['ことば', 'kotoba', 'word, language'],
        ['ながい', 'nagai', 'long'],
        ['ふるい', 'furui', 'old'],
        ['げんき', 'genki', 'well, energetic'],
        ['しずか', 'shizuka', 'quiet'],
        ['きれい', 'kirei', 'pretty, clean'],
        ['むずかしい', 'muzukashii', 'difficult'],
        ['やさしい', 'yasashii', 'kind, easy'],
        ['いそがしい', 'isogashii', 'busy'],
        ['たべる', 'taberu', 'to eat'],
        ['およぐ', 'oyogu', 'to swim'],
        ['わかる', 'wakaru', 'to understand'],
        ['おぼえる', 'oboeru', 'to memorise'],
        ['でんわ', 'denwa', 'telephone'],
        ['てがみ', 'tegami', 'letter'],
        ['しんぶん', 'shinbun', 'newspaper'],
        ['かんじ', 'kanji', 'kanji'],
        ['ひらがな', 'hiragana', 'hiragana'],
        ['にほんご', 'nihongo', 'Japanese language'],
        ['がっこう', 'gakkou', 'school'],
        ['だいがく', 'daigaku', 'university'],
        ['せんせい', 'sensei', 'teacher'],
        ['がくせい', 'gakusei', 'student'],
        ['しごと', 'shigoto', 'work, job'],
        ['かばん', 'kaban', 'bag'],
        ['めがね', 'megane', 'glasses'],
        ['とけい', 'tokei', 'clock, watch'],
        ['ぼうし', 'boushi', 'hat'],
        ['えんぴつ', 'enpitsu', 'pencil'],
        ['きって', 'kitte', 'postage stamp'],
        ['きっぷ', 'kippu', 'ticket'],
        ['ざっし', 'zasshi', 'magazine'],
        ['さんぽ', 'sanpo', 'a walk'],
        ['てんき', 'tenki', 'weather'],
        ['ごはん', 'gohan', 'rice, a meal'],
        ['たべもの', 'tabemono', 'food'],
        ['くだもの', 'kudamono', 'fruit'],
        ['りんご', 'ringo', 'apple'],
        ['みかん', 'mikan', 'mandarin orange'],
        ['ぶどう', 'budou', 'grapes'],
        ['おんがく', 'ongaku', 'music'],
        ['えいが', 'eiga', 'film'],
        ['としょかん', 'toshokan', 'library'],
        ['ひこうき', 'hikouki', 'aeroplane'],
        ['きのう', 'kinou', 'yesterday'],
        ['おとうさん', 'otousan', 'father'],
        ['おかあさん', 'okaasan', 'mother'],
        ['いもうと', 'imouto', 'younger sister'],
        ['おとうと', 'otouto', 'younger brother'],
        ['こども', 'kodomo', 'child'],
        ['おんな', 'onna', 'woman'],
        ['おとこ', 'otoko', 'man'],
        ['なんじ', 'nanji', 'what time']
      ]
    },
    {
      tier: 3,
      label: 'Yōon words & phrases',
      entries: [
        ['きょう', 'kyou', 'today'],
        ['でんしゃ', 'densha', 'train'],
        ['じてんしゃ', 'jitensha', 'bicycle'],
        ['しゃしん', 'shashin', 'photograph'],
        ['しゅくだい', 'shukudai', 'homework'],
        ['べんきょう', 'benkyou', 'study'],
        ['じゅぎょう', 'jugyou', 'class, lesson'],
        ['りょこう', 'ryokou', 'travel'],
        ['りょうり', 'ryouri', 'cooking, dish'],
        ['びょういん', 'byouin', 'hospital'],
        ['しょくどう', 'shokudou', 'canteen'],
        ['としょしつ', 'toshoshitsu', 'reading room'],
        ['ちゃいろ', 'chairo', 'brown'],
        ['おちゃ', 'ocha', 'tea'],
        ['しゅみ', 'shumi', 'hobby'],
        ['かいしゃ', 'kaisha', 'company'],
        ['じしょ', 'jisho', 'dictionary'],
        ['いっしょ', 'issho', 'together'],
        ['しつもん', 'shitsumon', 'question'],
        ['きんようび', 'kinyoubi', 'Friday'],
        ['おはよう', 'ohayou', 'good morning'],
        ['こんにちは', 'konnichiwa', 'hello'],
        ['こんばんは', 'konbanwa', 'good evening'],
        ['さようなら', 'sayounara', 'goodbye'],
        ['ありがとう', 'arigatou', 'thank you'],
        ['すみません', 'sumimasen', 'excuse me, sorry'],
        ['ごめんなさい', 'gomennasai', "I'm sorry"],
        ['はじめまして', 'hajimemashite', 'nice to meet you'],
        ['おやすみなさい', 'oyasuminasai', 'good night'],
        ['いただきます', 'itadakimasu', 'said before eating'],
        ['ごちそうさま', 'gochisousama', 'said after eating'],
        ['おねがいします', 'onegaishimasu', 'please'],
        ['いってきます', 'ittekimasu', "I'm off"],
        ['ただいま', 'tadaima', "I'm home"],
        ['おかえりなさい', 'okaerinasai', 'welcome back'],
        ['だいじょうぶ', 'daijoubu', 'all right, fine']
      ]
    },
    {
      tier: 4,
      label: 'Sentences',
      entries: [
        ['わたしは がくせいです。', 'watashi wa gakusei desu', 'I am a student.'],
        ['これは ほんです。', 'kore wa hon desu', 'This is a book.'],
        ['あれは なんですか。', 'are wa nan desu ka', 'What is that?'],
        ['なまえは なんですか。', 'namae wa nan desu ka', 'What is your name?'],
        ['えきは どこですか。', 'eki wa doko desu ka', 'Where is the station?'],
        ['いま なんじですか。', 'ima nanji desu ka', 'What time is it now?'],
        ['いくらですか。', 'ikura desu ka', 'How much is it?'],
        ['ねこが すきです。', 'neko ga suki desu', 'I like cats.'],
        ['やまが みえます。', 'yama ga miemasu', 'I can see the mountain.'],
        ['てんきが いいですね。', 'tenki ga ii desu ne', 'Nice weather, isn\'t it?'],
        ['きょうは あついですね。', 'kyou wa atsui desu ne', "It's hot today, isn't it?"],
        ['きょうは いいてんきです。', 'kyou wa ii tenki desu', "It's good weather today."],
        ['あしたは あめが ふります。', 'ashita wa ame ga furimasu', 'It will rain tomorrow.'],
        ['しゅくだいが おおいです。', 'shukudai ga ooi desu', 'There is a lot of homework.'],
        ['こんしゅうは いそがしいです。', 'konshuu wa isogashii desu', 'This week is busy.'],
        ['とても おいしいです。', 'totemo oishii desu', "It's very tasty."],
        ['たのしかったです。', 'tanoshikatta desu', 'It was fun.'],
        ['だいじょうぶです。', 'daijoubu desu', "It's all right."],
        ['よく わかりません。', 'yoku wakarimasen', "I don't really understand."],
        ['にほんごが すこし わかります。', 'nihongo ga sukoshi wakarimasu', 'I understand a little Japanese.'],
        ['ひらがなが よめます。', 'hiragana ga yomemasu', 'I can read hiragana.'],
        ['にほんごを べんきょうします。', 'nihongo o benkyou shimasu', 'I study Japanese.'],
        ['ごはんを たべます。', 'gohan o tabemasu', 'I eat a meal.'],
        ['おちゃを のみます。', 'ocha o nomimasu', 'I drink tea.'],
        ['ほんを よみます。', 'hon o yomimasu', 'I read a book.'],
        ['みずを ください。', 'mizu o kudasai', 'Water, please.'],
        ['これを ください。', 'kore o kudasai', 'This one, please.'],
        ['なにを たべますか。', 'nani o tabemasu ka', 'What will you eat?'],
        ['まいにち がっこうへ いきます。', 'mainichi gakkou e ikimasu', 'I go to school every day.'],
        ['にほんへ いきたいです。', 'nihon e ikitai desu', 'I want to go to Japan.'],
        ['うみへ いきましょう。', 'umi e ikimashou', "Let's go to the sea."],
        ['でんしゃで いきます。', 'densha de ikimasu', 'I go by train.'],
        ['ともだちに あいます。', 'tomodachi ni aimasu', 'I meet a friend.'],
        ['せんせいに しつもんします。', 'sensei ni shitsumon shimasu', 'I ask the teacher a question.'],
        ['どこに すんでいますか。', 'doko ni sunde imasu ka', 'Where do you live?'],
        ['いっしょに いきませんか。', 'issho ni ikimasen ka', "Won't you come along?"],
        ['あさ ろくじに おきます。', 'asa rokuji ni okimasu', 'I get up at six in the morning.'],
        ['よる じゅうじに ねます。', 'yoru juuji ni nemasu', 'I go to bed at ten at night.'],
        ['すこし まってください。', 'sukoshi matte kudasai', 'Please wait a moment.'],
        ['ゆっくり はなしてください。', 'yukkuri hanashite kudasai', 'Please speak slowly.'],
        ['もういちど おねがいします。', 'mou ichido onegaishimasu', 'Once more, please.'],
        ['おなかが すきました。', 'onaka ga sukimashita', "I'm hungry."],
        ['すこし つかれました。', 'sukoshi tsukaremashita', "I'm a little tired."],
        ['また あした。', 'mata ashita', 'See you tomorrow.']
      ]
    }
  ];

  // Which of は / へ / を are acting as particles in this item.
  //
  // Rather than guessing from the characters present — ごはんを contains a は
  // that is just a syllable — every combination of occurrences is transliterated
  // and the one that reproduces the curated reading wins.
  var PARTICLE_SOUND = { 'は': 'wa', 'へ': 'e', 'を': 'o' };

  function readingWith(kana, marked) {
    var out = '';
    var buffer = '';
    for (var i = 0; i < kana.length; i++) {
      if (marked.indexOf(i) !== -1) {
        out += global.Romaji.kanaToRomaji(buffer) + ' ' + PARTICLE_SOUND[kana[i]] + ' ';
        buffer = '';
      } else {
        buffer += kana[i];
      }
    }
    return out + global.Romaji.kanaToRomaji(buffer);
  }

  function detectParticles(kana, romaji) {
    var spots = [];
    for (var i = 0; i < kana.length; i++) {
      if (PARTICLE_SOUND[kana[i]]) spots.push(i);
    }
    if (!spots.length) return [];

    var want = global.Romaji.normalize(romaji);
    var combos = 1 << spots.length;
    for (var mask = 0; mask < combos; mask++) {
      var marked = [];
      for (var bit = 0; bit < spots.length; bit++) {
        if (mask & (1 << bit)) marked.push(spots[bit]);
      }
      if (global.Romaji.normalize(readingWith(kana, marked)) === want) {
        return marked.map(function (idx) { return kana[idx]; })
          .filter(function (ch, pos, arr) { return arr.indexOf(ch) === pos; });
      }
    }
    return [];
  }

  var ITEMS = [];
  TIERS.forEach(function (group) {
    group.entries.forEach(function (entry) {
      var kana = entry[0];
      var literal = global.Romaji.kanaToRomaji(kana);
      ITEMS.push({
        id: 'w:' + kana,
        level: 2,
        tier: group.tier,
        tierLabel: group.label,
        kana: kana,
        romaji: entry[1],
        meaning: entry[2],
        literal: literal,
        // The particles read differently from how they are written, if any.
        particles: detectParticles(kana, entry[1]),
        hasParticle: global.Romaji.normalize(literal) !== global.Romaji.normalize(entry[1])
      });
    });
  });

  global.WordData = {
    tiers: TIERS,
    items: ITEMS
  };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = (typeof window !== 'undefined' ? window : globalThis).WordData;
}
