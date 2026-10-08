// Culture, history and language notes for Snak.
//
// Every sentence a note shows is a CLAIM, and every claim carries `q`: a quotation copied word for word from the
// Wikipedia article in sources/notes/<src>.txt (CC BY-SA 4.0; build/notes-src.mjs saves the exact revision).
// build/verify-notes.mjs fails the build if a quotation is not in its article, if a sentence is longer than 20 words,
// if a Danish term shown with the note is not in the article, or if a quiz answer is not backed by a claim.
// Nothing is added from memory: if the article does not say it, the note does not say it.
//
//   gate  — the note opens once this many words have been started
//   terms — Danish words shown with the note; each must appear in the article
//   quiz  — questions asked later in rounds; `claim` is the claim that gives the answer

export const NOTES = [
  // ───────────────────────── culture ─────────────────────────
  {
    id: 'hygge', kind: 'culture', title: 'Hygge', src: 'hygge', gate: 60, terms: ['hygge', 'hyggelig'],
    claims: [
      { t: 'Hygge is a Danish and Norwegian word for a cozy, contented mood.', q: 'is a word in Danish and Norwegian that describes a cozy, contented mood evoked by comfort and conviviality' },
      { t: 'People use hygge, and forms made from it such as hyggelig, in both Denmark and Norway.', q: 'is a widely used word in both Norway and Denmark (including in its derived forms, such as hyggelig)' },
      { t: 'Hygge as a core part of Danish culture is a recent idea, from the late 20th century.', q: 'the emphasis on hygge as a core part of Danish culture is a recent phenomenon, dating to the late 20th century' },
      { t: 'In Norway, hygge is just a word, much like “cozy”.', q: 'in Norway "hygge" is just a word, similar in status to "cozy."' },
      { t: 'Meik Wiking wrote the Hygge Manifesto, which gives hygge ten ideals.', q: 'created the Hygge Manifesto, which quantifies hygge into ten ideals' },
      { t: 'They include atmosphere, togetherness, comfort and shelter.', q: 'atmosphere, presence, pleasure, equality, gratitude, comfort, togetherness, harmony, truce, and shelter' },
    ],
    quiz: [
      { ask: 'How many ideals does the Hygge Manifesto give?', answer: 'ten', wrong: ['five', 'seven', 'twelve'], claim: 4 },
      { ask: 'When did hygge become a core part of Danish culture, according to the article?', answer: 'The late 20th century', wrong: ['The Viking Age', 'The 1700s', 'The 1930s'], claim: 2 },
    ],
  },
  {
    id: 'jante', kind: 'culture', title: 'The Law of Jante', src: 'law-of-jante', gate: 150, terms: ['janteloven'],
    claims: [
      { t: 'The Law of Jante is a made-up code of conduct.', q: 'is a fictional code of conduct whose name is now used colloquially' },
      { t: 'Its name now describes disapproval of people who show off their personal success.', q: 'to denote a social attitude of disapproval towards expressions of individuality and personal success' },
      { t: 'The author Aksel Sandemose invented it.', q: 'Invented by the Danish-Norwegian author Aksel Sandemose' },
      { t: 'He first wrote it as ten rules in a novel from 1933.', q: "first formulated as ten rules in Sandemose's satirical novel A Fugitive Crosses His Tracks (En flyktning krysser sitt spor, 1933)" },
      { t: 'The ten rules share one idea: you are not to think you are special.', q: "You are not to think you're anyone special, or that you're better than us." },
      { t: 'People in Scandinavia often call it quintessentially Danish, Norwegian or Swedish.', q: 'It is common in Scandinavia to claim the Law of Jante as something quintessentially Danish, Norwegian or Swedish.' },
    ],
    quiz: [
      { ask: 'Who invented the Law of Jante?', answer: 'Aksel Sandemose', wrong: ['Hans Christian Andersen', 'Søren Kierkegaard', 'Karen Blixen'], claim: 2 },
      { ask: 'In what year did the ten rules first appear in a novel?', answer: '1933', wrong: ['1805', '1849', '1948'], claim: 3 },
    ],
  },
  {
    id: 'smorrebrod', kind: 'culture', title: 'Smørrebrød', src: 'sm-rrebr-d', gate: 120, terms: ['smørrebrød', 'rugbrød', 'franskbrød'],
    claims: [
      { t: 'Smørrebrød is an open sandwich from Denmark, Norway and Sweden.', q: 'is a traditional open-faced sandwich in the cuisines of Denmark, Norway and Sweden' },
      { t: 'The word first meant “butter and bread”.', q: 'originally smør og brød, "butter and bread"' },
      { t: 'It is a piece of buttered rugbrød, a dense, dark rye bread, with toppings.', q: 'usually consists of a piece of buttered rugbrød (a dense, dark rye bread) topped with' },
      { t: 'Pickled herring is one traditional topping.', q: 'Traditional toppings include pickled herring (plain, spiced or curried)' },
      { t: 'People usually eat it with a knife and fork.', q: 'which is usually eaten with utensils' },
      { t: 'At festive meals, fish toppings come first, then cold cuts and salads, then cheese.', q: 'fish toppings first (such as herring, shrimp, or smoked salmon) followed by cold cuts and salads, and finally cheese with bread or crackers and fruit' },
    ],
    quiz: [
      { ask: 'What did the word smørrebrød first mean?', answer: 'butter and bread', wrong: ['rye and herring', 'salt and bread', 'cheese and fish'], claim: 1 },
      { ask: 'What is rugbrød?', answer: 'A dense, dark rye bread', wrong: ['A light wheat bread', 'A kind of pickled fish', 'A soft white roll'], claim: 2 },
    ],
  },
  {
    id: 'andersen', kind: 'culture', title: 'Hans Christian Andersen', src: 'hans-christian-andersen', gate: 300, terms: [],
    claims: [
      { t: 'Hans Christian Andersen was a Danish writer.', q: 'was a Danish writer. A prolific writer of plays' },
      { t: 'He was born in Odense on 2 April 1805.', q: 'Andersen was born in Odense, Denmark, on 2 April 1805' },
      { t: 'He is best remembered for his literary fairy tales.', q: 'he is also best remembered for his literary fairy tales' },
      { t: 'His fairy tales have been translated into more than 125 languages.', q: 'have been translated into more than 125 languages' },
      { t: 'They include “The Little Mermaid” and “The Nightingale”.', q: '"The Little Mermaid", "The Nightingale"' },
      { t: 'At 14 he moved to Copenhagen to look for work as an actor.', q: 'At 14, Andersen moved to Copenhagen to seek employment as an actor.' },
    ],
    quiz: [
      { ask: 'Where was Hans Christian Andersen born?', answer: 'Odense', wrong: ['Aarhus', 'Aalborg', 'Roskilde'], claim: 1 },
      { ask: 'Into how many languages have his fairy tales been translated?', answer: 'More than 125', wrong: ['More than 12', 'About 30', 'More than 60'], claim: 3 },
    ],
  },
  // ───────────────────────── history ─────────────────────────
  {
    id: 'danelaw', kind: 'history', title: 'The Danelaw', src: 'danelaw', gate: 400, terms: ['danelagen'],
    claims: [
      { t: 'The Danelaw was the part of England where Danish laws applied.', q: 'was the part of England between the late ninth century and the Norman Conquest under Anglo-Saxon rule in which Danish laws applied' },
      { t: 'It began when Danish Vikings took large parts of eastern and northern England in the late ninth century.', q: 'originated in the conquest and occupation of large parts of eastern and northern England by Danish Vikings in the late ninth century' },
      { t: 'The Great Heathen Army invaded England in 865.', q: 'originated from the invasion of the Great Heathen Army into England in 865' },
      { t: 'In 867 the Danes captured York, which they called Jórvík.', q: 'In 867 they captured Northumbria and its capital, York ("Jórvík")' },
      { t: 'The Danelaw covered about Yorkshire, the central and eastern Midlands, and the East of England.', q: 'The Danelaw approximately covered Yorkshire, the central and eastern Midlands, and the East of England.' },
      { t: 'The Danes kept their own laws and, in return, were loyal to England.', q: 'allowing the self-governance of the Danes in exchange of loyalty to England' },
      { t: 'The meeting of the two cultures changed the language spoken in England.', q: 'The language spoken in England was affected by this clash of cultures' },
    ],
    quiz: [
      { ask: 'In which year did the Great Heathen Army invade England?', answer: '865', wrong: ['765', '1066', '1397'], claim: 2 },
      { ask: 'What did the Danes call York?', answer: 'Jórvík', wrong: ['Danelagen', 'Odense', 'Kalmar'], claim: 3 },
    ],
  },
  {
    id: 'kalmar', kind: 'history', title: 'The Kalmar Union', src: 'kalmar-union', gate: 700, terms: [],
    claims: [
      { t: 'From 1397 to 1523, one monarch ruled Denmark, Sweden and Norway.', q: 'it joined under a single monarch the three kingdoms of Denmark, Sweden' },
      { t: 'Queen Margaret I of Denmark designed the union.', q: 'as designed by Queen Margaret I of Denmark' },
      { t: 'The countries stayed separate states, but one monarch directed their policies.', q: 'Legally, the countries remained separate sovereign states, but their domestic and foreign policies were directed by a common monarch.' },
      { t: 'Norway’s sea colonies, including Iceland, Greenland and the Faroe Islands, were part of the union too.', q: "together with Norway's maritime colonies (then including Iceland, Greenland, the Faroe Islands" },
      { t: 'Nobles started it to counter the Hanseatic League, a northern German trade league.', q: 'who sought to counter the influence of the Hanseatic League, a northern German trade league' },
      { t: 'Sweden left for good in 1523, when Gustav Vasa was elected its king.', q: "Gustav Vasa's election as King of Sweden on 6 June 1523, and his triumphant entry into Stockholm 11 days later, marked Sweden's final secession from the Kalmar Union." },
    ],
    quiz: [
      { ask: 'Who designed the Kalmar Union?', answer: 'Queen Margaret I of Denmark', wrong: ['King Gustav Vasa', 'King Frederick III', 'Aksel Sandemose'], claim: 1 },
      { ask: 'When did Sweden leave the union for good?', answer: '1523', wrong: ['1397', '1849', '1953'], claim: 5 },
    ],
  },
  {
    id: 'grundloven', kind: 'history', title: 'The constitution', src: 'constitution-of-denmark', gate: 1000, terms: ['Grundloven', 'Grundlovsdag', 'Folketing'],
    claims: [
      { t: 'Denmark’s first democratic constitution was adopted in 1849.', q: 'The first democratic constitution was adopted in 1849, replacing the 1665 absolutist constitution.' },
      { t: 'It ended an absolute monarchy and brought in democracy.', q: 'ended an absolute monarchy and introduced democracy' },
      { t: 'The constitution in use now is from 1953.', q: 'The current constitution is from 1953.' },
      { t: 'Denmark is a constitutional monarchy with a parliamentary system.', q: 'defines Denmark as a constitutional monarchy, governed through a parliamentary system' },
      { t: 'The parliament, the Folketing, cannot make laws that go against the constitution.', q: 'The Danish Parliament (Folketinget) cannot make any laws which may be repugnant or contrary to the Constitutional Act' },
      { t: 'Denmark celebrates the constitution every year on 5 June.', q: 'Denmark celebrates the adoption of the Constitution on 5 June' },
      { t: 'It protects freedom of speech, religion, association and assembly.', q: 'freedom of speech, freedom of religion, freedom of association, and freedom of assembly' },
    ],
    quiz: [
      { ask: 'In which year was Denmark’s first democratic constitution adopted?', answer: '1849', wrong: ['1397', '1665', '1948'], claim: 0 },
      { ask: 'On which date is Constitution Day?', answer: '5 June', wrong: ['2 April', '28 September', '17 June'], claim: 5 },
    ],
  },
  {
    id: 'rescue', kind: 'history', title: 'The rescue of the Danish Jews', src: 'rescue-of-the-danish-jews', gate: 1300, terms: [],
    claims: [
      { t: 'In the Second World War, the Danish resistance and many citizens took 7,500 of Denmark’s 8,000 Jews to Sweden.', q: "managed to evacuate 7,500 of Denmark's 8,000 Jews, plus 686 non-Jewish spouses, by sea to nearby neutral Sweden" },
      { t: 'On 28 September 1943, the German diplomat Georg Ferdinand Duckwitz leaked the German plan to arrest them.', q: "on September 28, 1943, German diplomat Georg Ferdinand Duckwitz leaked Hitler's plans to do so to the Danish government" },
      { t: 'The Danish state church and nearly every political party spoke out against the deportation.', q: "prompted the Danish state church and all political parties except the pro-Nazi National Socialist Workers' Party of Denmark (NSWPD) immediately to denounce the action" },
      { t: 'It is seen as one of the largest acts of collective resistance in the countries Nazi Germany occupied.', q: 'This rescue is considered one of the largest actions of collective resistance to aggression in the countries occupied by Nazi Germany' },
      { t: 'As a result, 99 percent of Denmark’s Jewish population survived the Holocaust.', q: "99% of Denmark's Jewish population survived the Holocaust" },
    ],
    quiz: [
      { ask: 'To which country were most of Denmark’s Jews taken by sea?', answer: 'Sweden', wrong: ['Norway', 'England', 'Iceland'], claim: 0 },
      { ask: 'What share of Denmark’s Jewish population survived the Holocaust?', answer: '99 percent', wrong: ['50 percent', '75 percent', '90 percent'], claim: 4 },
    ],
  },
  // ───────────────────────── language ─────────────────────────
  {
    id: 'danish', kind: 'language', title: 'The Danish language', src: 'danish-language', gate: 0, terms: ['dansk'],
    claims: [
      { t: 'About 5.5 million people speak Danish, mostly in and around Denmark.', q: 'spoken by about 5.5 million people, principally in and around Denmark' },
      { t: 'Danish is a North Germanic language.', q: 'is a North Germanic language from the Indo-European language family' },
      { t: 'It descends from Old Norse, the language of the Viking Era.', q: 'Danish is a descendant of Old Norse, the common language of the Germanic peoples who lived in Scandinavia during the Viking Era' },
      { t: 'Speakers of Danish, Norwegian and Swedish largely understand one another, but not Icelandic or Faroese.', q: 'are largely mutually intelligible with each other, but not with "insular Scandinavian", i.e. Icelandic and Faroese' },
      { t: 'After the Reformation and the printing press, a standard Danish grew from the Copenhagen dialect.', q: 'a standard language was developed which was based on the dialect of Copenhagen' },
      { t: 'Danish has a very large set of vowels: 27 that change meaning.', q: '27 phonemically distinctive vowels' },
    ],
    quiz: [
      { ask: 'Which older language does Danish descend from?', answer: 'Old Norse', wrong: ['Old English', 'Latin', 'Old German'], claim: 2 },
      { ask: 'Which of these do Danish speakers largely NOT understand?', answer: 'Icelandic', wrong: ['Swedish', 'Norwegian', 'Danish dialects'], claim: 3 },
    ],
  },
  {
    id: 'stod', kind: 'language', title: 'Stød', src: 'st-d', gate: 30, terms: ['stød', 'gul', 'gule'],
    claims: [
      { t: 'Stød is a feature of Danish sound. Its most common form is a kind of creaky voice.', q: 'which in its most common form is a kind of creaky voice (laryngealization)' },
      { t: 'In the IPA it is written with the sign ˀ.', q: '(represented in non-standard IPA as ⟨◌ˀ⟩)' },
      { t: 'The word stød itself does not have a stød.', q: 'The noun stød itself does not have a stød.' },
      { t: 'A syllable with stød starts high and loud. Then the pitch and loudness drop.', q: 'The first phase has a relatively high intensity and a high pitch (measured as F0), whereas the second phase sees a drop in intensity and pitch.' },
      { t: 'Some word pairs differ only by stød, so it can change the meaning.', q: 'there are minimal pairs where the presence or absence of stød determines meaning' },
      { t: 'Gul, “yellow”, has stød. Its plural, gule, has none.', q: "for example gul [ˈkuˀl] 'yellow (singular)' and gule [ˈkuːlə] 'yellow (plural)'" },
      { t: 'Two-syllable words with the accent on the first syllable have no stød.', q: 'Two-syllable words with accent on the first syllable do not take stød' },
    ],
    quiz: [
      { ask: 'Which sign shows stød in the IPA?', answer: 'ˀ', wrong: ['ː', 'ˈ', 'ð'], claim: 1 },
      { ask: 'Which word has stød?', answer: 'gul', wrong: ['gule', 'both of them', 'neither of them'], claim: 5 },
    ],
  },
  {
    id: 'sounds', kind: 'language', title: 'Danish sounds', src: 'danish-phonology', gate: 80, terms: [],
    claims: [
      { t: 'Spoken Danish can be hard for Norwegians and Swedes to understand, but they read it easily.', q: 'spoken Danish can be challenging for Norwegians and Swedes to understand without training, although they can easily read written Danish' },
      { t: 'The sounds /p, t, k/ are said with a puff of air.', q: '/p, t, k/ are voiceless aspirated, with /t/ also affricated' },
      { t: 'The sounds /b, d, g/ are said without that puff, so they sound like p, t and k.', q: '/b, d, ɡ/ are voiceless unaspirated [p, t, k]' },
      { t: 'Danish stop sounds are often called “lenis”: said with less muscle tension than in many languages.', q: 'The plosives /p, t, k, b, d, ɡ/ are often described as "lenis", i.e. having lesser muscular tension than the "fortis" voiceless stops of other languages.' },
      { t: 'The “soft d”, in Danish blødt d, is written ð in the IPA.', q: '/ð/ – the so-called "soft d" (Danish: blødt d)' },
    ],
    quiz: [
      { ask: 'What is the “soft d” called in Danish?', answer: 'blødt d', wrong: ['hårdt d', 'stumt d', 'langt d'], claim: 4 },
      { ask: 'Which sounds are said with a puff of air?', answer: '/p, t, k/', wrong: ['/b, d, g/', '/m, n, l/', '/s, v, h/'], claim: 1 },
    ],
  },
  {
    id: 'spelling', kind: 'language', title: 'Danish spelling', src: 'danish-orthography', gate: 100, terms: ['ville', 'kunne', 'skulle'],
    claims: [
      { t: 'The Danish alphabet has 29 letters, with three extra: æ, ø and å.', q: '29-letter Latin-script alphabet with three additional letters: ⟨æ⟩, ⟨ø⟩ and ⟨å⟩' },
      { t: 'Writing and pronunciation do not match closely.', q: 'The orthography is characterized by a low degree of correspondence between writing and pronunciation.' },
      { t: 'The Danish Language Council sets the spelling rules.', q: 'the norms are set by the Danish language council through the publication of Retskrivningsordbogen' },
      { t: 'In 1948, the letter å replaced aa.', q: 'In 1948 ⟨å⟩ was re-introduced or officially introduced in Danish, replacing ⟨aa⟩.' },
      { t: 'The 1948 reform ended capital letters on all nouns.', q: 'The reform of 1948 abolished the capitalization of all nouns.' },
      { t: 'It also changed the past forms kunde, skulde and vilde to kunne, skulle and ville.', q: 'The reform of 1948 also changed the spelling of past tense forms of modal verbs (kunde, skulde, vilde): now they are spelled kunne, skulle, ville, the same as the infinitives of those verbs.' },
    ],
    quiz: [
      { ask: 'Which letter replaced aa in 1948?', answer: 'å', wrong: ['æ', 'ø', 'ð'], claim: 3 },
      { ask: 'How many letters does the Danish alphabet have?', answer: '29', wrong: ['26', '28', '32'], claim: 0 },
    ],
  },
  {
    id: 'grammar', kind: 'language', title: 'En or et, and “the”', src: 'danish-grammar', gate: 120, terms: ['en', 'et', 'drengen', 'fængslet'],
    claims: [
      { t: 'Danish has two grammatical genders: common and neuter.', q: 'There are two grammatical genders in Danish: common and neuter.' },
      { t: 'The word for “a” is en for common nouns and et for neuter nouns.', q: 'The singular indefinite article (a/an in English) is en for common-gender nouns and et for neuter nouns.' },
      { t: 'They are often called n-words and t-words.', q: 'They are often informally called n-words and t-words.' },
      { t: 'En dreng is “a boy”, and et fængsel is “a jail”.', q: 'En dreng. A boy. Et fængsel. A jail.' },
      { t: 'To say “the”, Danish adds a suffix to the noun. It does not add a separate word.', q: 'definite nouns in Danish are rendered by adding a suffix (i.e. not an article) to the indefinite form' },
      { t: 'The suffix is -en for common nouns and -et for neuter nouns.', q: 'The definite singular ending is -en for common-gender nouns and -et for neuter nouns.' },
      { t: 'So drengen is “the boy” and fængslet is “the jail”.', q: 'Drengen. The boy. Fængslet. The jail.' },
    ],
    quiz: [
      { ask: 'Which word for “a” goes with a neuter noun?', answer: 'et', wrong: ['en', 'ed', 'at'], claim: 1 },
      { ask: 'How does Danish say “the boy”?', answer: 'drengen', wrong: ['den dreng', 'dreng den', 'drenget'], claim: 6 },
    ],
  },
  {
    id: 'numbers', kind: 'language', title: 'Danish numbers', src: 'danish-language', gate: 100, terms: ['tres', 'halvtreds', 'tooghalvtreds'],
    claims: [
      { t: 'The numbers 50, 60, 70, 80 and 90 are built on twenty as a base.', q: 'the numerals 50, 60, 70, 80 and 90 are based on a vigesimal system' },
      { t: 'French numbers from 80 to 99 work in a similar way.', q: '(like the French numerals from 80 through 99)' },
      { t: 'Tres, 60, is short for tre-sinds-tyve, “three times twenty”.', q: 'Tres is short for tre-sinds-tyve "three times twenty" and means 60' },
      { t: 'Halvtreds, 50, is short for halvtredje-sinds-tyve, “two and a half times twenty”.', q: 'while 50 is halvtreds, short for halvtredje-sinds-tyve "2+1⁄2 times twenty"' },
      { t: 'Today, 52 is usually said as tooghalvtreds.', q: '52 is usually rendered as tooghalvtreds' },
    ],
    quiz: [
      { ask: 'What does tres mean?', answer: '60', wrong: ['30', '50', '90'], claim: 2 },
      { ask: 'What is the base of the Danish numbers 50 to 90?', answer: 'Twenty', wrong: ['Ten', 'Twelve', 'Five'], claim: 0 },
    ],
  },
];
