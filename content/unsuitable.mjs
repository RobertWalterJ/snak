// What stays out of the learner deck: vulgar, slur and graphic words, in Danish and in the
// English of a translation. A word is also dropped if Wiktionary tags any of its senses
// vulgar / offensive / derogatory (build/extract.mjs sets `anyBad`).

export const BAD_DA = new Set(`fuck fucking lort lorte pis pisse røv røvhul kneppe knep luder pik pikke pat patter kusse fisse bøsse perker neger spasser mongol skid skide fandens fanden helvede satan nazist nazister voldtage voldtægt sex sexet porno pornografi bordel prostitueret hore idiot idioter dumme svin svinet bitch shit`.split(/\s+/));

const BAD_EN = /\b(fuck\w*|shit\w*|bitch\w*|rape\w*|rapist|whore|slut|cunt|dick|cock|pussy|nigg\w*|faggot|retard\w*|porn\w*|sex|sexual\w*|naked|nude|kill\w*|murder\w*|suicide|corpse|terroris\w*|nazi\w*|hell|damn\w*|bastard|asshole|piss\w*|drunk)\b/i;

// returns a reason or null
export function unsuitable(en, da = '') {
  if (BAD_EN.test(en || '')) return 'english';
  for (const t of String(da).toLowerCase().split(/[^a-zæøåéèü]+/)) if (BAD_DA.has(t)) return 'danish';
  return null;
}
export const badWord = (w) => BAD_DA.has(String(w).toLowerCase());
