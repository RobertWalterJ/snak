// Everything that differs between Snak (Danish) and Saga (Icelandic) lives here, so the engine and the
// build scripts are the same code in both apps.
export const LANG = {
  id: 'da',
  app: 'Snak',
  slug: 'snak',
  name: 'Danish',
  native: 'dansk',
  tatoeba: { sentences: 'dan_sentences.tsv', links: 'dan-eng_links.tsv' },
  // the phone's own voice, used to read words aloud (there is no recording set yet)
  audio: { tatoeba: 'dan', ll: 'LL-Q9035 (dan)-', old: 'Da-', kaikki: 'kaikki-da.jsonl', piper: { model: 'da_DK-talesyntese-medium', label: 'Piper, Danish voice "talesyntese" (CC0 training data, Språkbanken)' } },
  voice: { prefix: 'da', label: 'Danish' },
  stageCuts: [200, 500, 900, 1400, 2000],
  stageTitles: ['The first 200 words', 'Words 201–500', 'Words 501–900', 'Words 901–1,400', 'Words 1,401–2,000'],
  stageWhy: [
    'The commonest 200 words are in almost every sentence. Learn these first.',
    'Now you can follow short, simple sentences about people, places and things.',
    'These words fill in everyday talk: time, family, work and food.',
    'Here the words get more specific, and the sentences get longer.',
    'These are less common words. Many appear in reading more than in speech.',
  ],
  genders: { c: { key: 'en', label: 'en', note: 'common gender' }, n: { key: 'et', label: 'et', note: 'neuter' } },
  genderPrompt: 'Does this noun take en or et?',
  genderHelp: 'Danish nouns are either en-words (common gender) or et-words (neuter). The word for "a" changes to match: en bil, et hus.',
  pronNote: 'Danish spelling hides many sounds. Listen as well as read, and check the IPA.',
  themes: [
    { id: 'dannebrog', name: 'Dannebrog', sub: 'red and white' },
    { id: 'fjord', name: 'Fjord', sub: 'blue and grey' },
    { id: 'hygge', name: 'Hygge', sub: 'warm and soft' },
  ],
  ladder: { id: 'verbs', title: 'Verb forms', intro: 'Danish verbs do not change with the person: jeg har, du har, vi har. They change with the time. This ladder practises the present, the past and the past participle.' },
};
