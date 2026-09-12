# Hiragana Trainer

A dark-themed web app for learning to read hiragana. Two levels, spaced
repetition, no build step and no account — open `index.html` and study.

## The two levels

**Level 1 — characters.** One kana appears; you type how it is read. All 104
syllables are covered: the 46 basic kana, the 25 dakuten/handakuten forms and
the 33 yōon combinations. The dakuten and yōon sets start switched off so you
can add them when the basics stick.

**Level 2 — words and sentences.** A whole word or sentence in hiragana
appears and you type the entire reading. 230 items in four groups, from
two-kana words up to full sentences, each with its English meaning.

## How the repetition works

Two clocks run at the same time.

*Inside a session*, a card you miss comes back two cards later and keeps
coming back until you get it right. Each success pushes it further away —
four cards, then twelve — so characters you know stop interrupting you.

*Between sessions*, a card that survives its learning steps moves onto a day
schedule that multiplies by its ease factor each time you recall it: 1 day, 3
days, 8 days, 21 days and onwards. Missing a card costs it ease and drops it
back into the queue, so the things you keep forgetting stay in front of you
and the things you know drift out of the way.

## Typing answers

Any common romanisation is accepted — `shi` or `si`, `tsu` or `tu`, `ja`,
`jya` or `zya`, `fu` or `hu`. Spaces, apostrophes and hyphens are ignored, so
`kin'en` and `kinen` both pass.

Two kinds of near-miss are treated gently. Getting the length of a long vowel
wrong (`tokyo` for とうきょう) is marked **Almost** and counts as correct, with
the full reading shown. Reading a particle the way it is spelled rather than
the way it is said (`konnichiha`, `gakkou he ikimasu`, `gohan wo tabemasu`) is
also **Almost**, and the app names the rule behind it: は is read *wa* as a
topic marker, へ is read *e* as a direction marker, を is read *o* as an object
marker.

Which particles are actually at work is worked out from the data rather than
guessed, so ごはんを たべます flags the を and leaves the は inside ごはん alone.
The character を studied on its own accepts both `wo` and `o`.

A genuine slip is not punished either — after a wrong answer, **That was a
typo — count it** restores the card's schedule exactly as it was and re-grades
the answer as correct.

## Other things in the app

- **Chart** — the full syllabary, each character tinted by how well it is
  sticking. Tap one for its reading, accuracy and next review date.
- **Stats** — running accuracy, current and best day streak, a twelve-week
  activity heatmap and a mastery breakdown per group.
- **Settings** — which kana sets and word groups are in play, new cards per
  session, review cap, meaning hints, auto-advance and sound. Level 2 can be
  held back to words whose kana you have already started.
- **Export / import** — progress is a JSON file you can move between browsers.

## Running it

No dependencies and no build step:

```
open index.html
```

Or serve the folder, which is also all that is needed to publish it on GitHub
Pages:

```
python3 -m http.server 8000
```

Progress is saved in the browser's `localStorage` under
`hiragana-trainer/v1`, and never leaves your machine. Studying in a private
window or with site data blocked still works — the session just will not be
remembered.

## Keyboard

`Enter` checks your answer, `Enter` again moves to the next card, and `Esc`
ends the session. Typing anywhere on the study screen jumps focus back into
the answer box.

## Layout

```
index.html            app shell
css/styles.css        dark theme
js/romaji.js          kana → romaji, and tolerant answer checking
js/data-kana.js       the syllabary and chart layout
js/data-words.js      Level 2 words and sentences
js/srs.js             the scheduler
js/store.js           localStorage persistence
js/session.js         study queue
js/app.js             views and the study loop
```

Level 2 readings are cross-checked against their kana by the transliterator,
so a prompt and its answer cannot drift apart; the only permitted differences
are the particle readings described above.

## Accuracy checks

The dataset is verified rather than trusted. Every one of the 334 study items
is checked to accept its own displayed reading, every alternative
romanisation of the kana is checked to pass, no kana accepts another kana's
reading, and each of the 21 particle items resolves to the exact particle
responsible.
