# Snak — learn Danish (prototype)

A phone-first, installable app for learning Danish with short rounds of spaced questions. Built on the same
ideas as Hok Gong (Cantonese) and Jasette (French): spaced retrieval with FSRS, a teaching card before each new
word, a ladder for the part of the grammar that is hard in this language, read-aloud for everything, and a
build that fails if any answer cannot be re-derived from its source. Unlike those two it is written for a
beginner and the whole interface is English.

## Run it

Double-click **Launch Snak.bat** (or the **Snak** shortcut on the Desktop). It opens http://localhost:8911/.
Close the black window to stop it. Or: `npm run dev`.

## What is in the prototype

- A word list taken from subtitle frequency, in 5 stages, commonest first.
- Question kinds: read (word to meaning), recall (meaning to word), listen (phone voice), gap (fill a sentence),
  gender, and a ladder (verb forms: present, past, past participle).
- Rounds of 18 (12 / 18 / 25 / 40) that are never cut short, with an "Another round" button.
- Three palettes, each light and dark; large-text option; no timers anywhere.
- Backup and restore of progress as a file. Works offline after the first load.

## Design

Calm Nordic editorial: warm or cool paper, one strong accent, soft shapes, big quiet type. Atkinson Hyperlegible for the
interface, Fraunces for the language itself, titles and numbers. A hero with a progress ring and a drawing that suits the
app (ripples of sound for Snak, ridges and an aurora band for Saga); a frosted floating tab bar (a side rail on a wide
screen); a focused round screen with a bottom dock that holds the answer and Continue within thumb reach; colour swatches,
three palettes per app, each light and dark. Right and wrong are always an icon and a word as well as colour. Motion is small
and switched off when the phone asks for less. Text is left-aligned, 1.6 line height, slightly open letter spacing. Every
palette is contrast-checked (`npm run check`, build/audit-colour.mjs, now 27 pairs per palette). First launch shows a
welcome with a "start from the beginning" or "I already know some" choice. On localhost the offline worker is removed so a
changed file always loads.

## Notes: culture, history and language

The **Notes** tab has 14 short readings (culture, history, language). Each note is built from claims: every sentence the
app shows is backed by a quotation copied word for word from the English Wikipedia article saved under `sources/notes/`
(CC BY-SA 4.0; the revision id is kept and shown). `build/verify-notes.mjs` fails the build if a quotation is not in its
article, a sentence runs past 20 words, a Danish term is not in the article, or a quiz answer is not stated in its claim.
A note opens as you learn words, and its two questions join your rounds after you read it. Notes can be read aloud with
the phone's English voice. To add a note: add the article to `content/notes-topics.mjs`, run `npm run notes`, then write
its claims in `content/notes.mjs`.

## Sound

Best source first: (1) a **recording by a real person** (Wikimedia Commons / Lingua Libre for words; Tatoeba for
sentences), credited by name on the card; (2) a **computer-voice clip** made for the app with Piper, so every word,
every form in the ladder and every example sentence has the same clear voice; (3) the phone's own voice. Every
speaker button has a **Slow** button beside it, and Settings has Normal / Slow / Very slow and automatic read-aloud.
Settings can save every clip on the device for offline use. The Piper voice (see `Language Audiogen_audio.py`,
`npm run audio` plus that script) is a machine voice and the app says so.

## Checks

`npm run check` rebuilds the deck and runs: **verify** (every answer re-derived from the corpus),
**test-verify** (12 planted faults must all be caught), **audit-colour** (WCAG contrast of every palette),
**test-sched** (a round is never short; casual and committed learners over 60 days).
Not done yet: a colour-blindness simulation, and a test on a real phone.

## Sources and licences

- Word meanings, genders, sounds and forms: English Wiktionary via kaikki.org, CC BY-SA 4.0.
- Example sentences and translations: Tatoeba contributors, CC BY 2.0 FR.
- Word frequency: FrequencyWords (hermitdave), from OpenSubtitles, CC BY-SA 4.0.
- Scheduler: ts-fsrs (MIT). Fonts: Atkinson Hyperlegible and Fraunces (SIL OFL).
- A few meanings for the commonest function words (content/glosses.mjs) were written by hand, because
  Wiktionary lists a rare meaning first. verify.mjs still requires the word to be in Wiktionary.

## Not yet (honest list)

- Recordings by real people are few: 99 words (Lingua Libre and Wikimedia Commons) and 97 example sentences (Tatoeba, native speakers). Everything else is a Piper computer voice (2,561 word clips, 2,873 sentence clips). Nobody has listened to every clip, so some pronunciations may be off; the real recordings are credited and the machine voice is labelled.
- The clips are in `app/audio/` (about 70 MB) and are not in git; rebuild them with `npm run audio` and `Language Audiogen_audio.py`.
- Gap questions can have more than one grammatical answer; the English translation is shown to settle it.
- No level check (there is a "skip the first stages" setting), no conversations, no speaking practice.
- Never pushed to GitHub or deployed.

## Danish notes

- Danish verbs do not change with the person, so the ladder is by time only. The ladder covers the 160 commonest verbs whose Wiktionary entry gives present, past and participle (480 questions). Incomplete entries are skipped, not guessed.
- Spelling hides many sounds (and the stød). The teaching card shows the IPA from Wiktionary. Stød is not explained yet.
