import type { Dictionary } from '../i18n'

/**
 * Romanian.
 *
 * Poker vocabulary stays in English throughout, because that is how Romanian
 * players actually talk: buy-in, bankroll, bounty, range, equity, ROI, ITM,
 * MDF, ICM, EV, flop, turn, river, preflop, showdown, all-in, shove, fold,
 * call, raise, limp, 3-bet, c-bet, big blind, ante, stack, freeroll, satellite,
 * rake, downswing, variance, and the seat names (UTG, LJ, HJ, CO, BTN, SB, BB).
 * Only the surrounding prose is translated.
 */
export const ro: Dictionary = {
  // -------------------------------------------------------------- chrome --
  'Main menu': 'Meniu principal',
  'Questions and suggestions:': 'Întrebări și sugestii:',
  Language: 'Limbă',

  // ----------------------------------------------------------------- home --
  'Poker Tools': 'Poker Tools',
  'Choose a tool to get started': 'Alege un instrument ca să începi',

  // Section names and blurbs
  MDF: 'MDF',
  'Build a defending range, then test it under fire.':
    'Construiește un range de apărare, apoi testează-l sub presiune.',
  Calculators: 'Calculatoare',
  'Put a number on the spot in front of you.':
    'Pune o cifră pe situația din fața ta.',
  Knowledge: 'Teorie',
  'Learn the ranges and the numbers, then drill them.':
    'Învață range-urile și cifrele, apoi exersează-le.',
  'At the table': 'La masă',
  'Small helpers for while you are playing, and after.':
    'Ajutoare mici pentru cât joci, și pentru după.',

  // Tool cards
  'MDF Range Tool': 'MDF Range Tool',
  'Paint your range, pick a bet size, tag hands to call or fold, and track Minimum Defense Frequency.':
    'Pictează-ți range-ul, alege un bet size, marchează mâinile de call sau fold și urmărește Minimum Defense Frequency.',
  'MDF Practice': 'MDF Practice',
  'Gamified drill: defend a preset range on flop, turn, and river vs random bets. Score your fold accuracy.':
    'Exercițiu sub formă de joc: apără un range presetat pe flop, turn și river împotriva unor pariuri aleatorii. Primești punctaj pentru acuratețea fold-urilor.',
  'Equity Calculator': 'Equity Calculator',
  'Calculate preflop equity for a hand or range against one or more opponent ranges.':
    'Calculează equity preflop pentru o mână sau un range împotriva unuia sau mai multor range-uri adverse.',
  'Mystery Bounty': 'Mystery Bounty',
  'Work out what an average bounty is worth in cash and in big blinds, and how much wider it lets you call.':
    'Află cât valorează un bounty mediu în bani și în big blinds, și cu cât mai larg poți da call datorită lui.',
  Bankroll: 'Bankroll',
  'What buy-ins your roll actually supports, from your ROI and field size, at three levels of risk.':
    'Ce buy-in-uri îți susține de fapt bankroll-ul, pornind de la ROI-ul tău și mărimea field-ului, la trei niveluri de risc.',
  'MTT Variance': 'MTT Variance',
  'Simulate a tournament sample: downswings, confidence bands, and risk of ruin, with graphs of every run.':
    'Simulează un eșantion de turnee: downswing-uri, intervale de încredere și risk of ruin, cu grafice pentru fiecare rulare.',
  'Preflop Charts': 'Preflop Charts',
  'MTT ranges by position and stack depth, typed in as strings — then drill yourself on them hand by hand.':
    'Range-uri de MTT după poziție și adâncimea stack-ului, scrise ca text — apoi exersează-le mână cu mână.',
  'Quiz Me': 'Quiz Me',
  'Heuristics, flashcards and questions to drill the numbers. Study the bundled decks or import your own file.':
    'Reguli practice, flashcard-uri și întrebări ca să exersezi cifrele. Studiază pachetele incluse sau importă-ți propriul fișier.',
  Randomizer: 'Randomizer',
  'Generate a random number from 1 to 100. Auto-generates every 15 seconds or roll manually.':
    'Generează un număr aleatoriu de la 1 la 100. Se generează automat la 15 secunde sau manual.',
  'Leak Finder': 'Leak Finder',
  "Import a positional export from PokerTracker, Hold'em Manager or Hand2Note, rank every leak, and track it over time.":
    "Importă un export pe poziții din PokerTracker, Hold'em Manager sau Hand2Note, clasifică fiecare leak și urmărește-l în timp.",

  // Status badges
  Done: 'Gata',
  'In progress': 'În lucru',
  'In review': 'În verificare',
  'Coming soon': 'În curând',

  // ------------------------------------------------------------- bankroll --
  'What you can afford to play, from your edge and the fields you play — not a rule of thumb.':
    'Ce îți permiți să joci, pornind de la edge-ul tău și field-urile în care joci — nu o regulă generală.',
  'Your situation': 'Situația ta',
  'What you can lose': 'Ce îți permiți să pierzi',
  'Your ROI': 'ROI-ul tău',
  'Return on total cost': 'Raportat la costul total',
  'Field size': 'Mărimea field-ului',
  'Typical entrants': 'Număr obișnuit de înscrieri',
  'Paid places': 'Locuri plătite',
  'Top % of field': 'Primele % din field',
  Fee: 'Fee',
  'Rake on the buy-in': 'Rake-ul peste buy-in',
  Over: 'Pe parcursul a',
  'Tournaments the risk covers': 'Turneele pe care se calculează riscul',
  Simulations: 'Simulări',
  'More = steadier': 'Mai multe = mai stabil',
  'Buy-in you play': 'Buy-in-ul pe care îl joci',
  'To check where you stand': 'Ca să vezi unde te afli',
  'What you can play': 'Ce poți juca',
  'biggest buy-in': 'cel mai mare buy-in',
  Aggressive: 'Agresiv',
  Normal: 'Normal',
  Conservative: 'Conservator',
  'Roughly one run in seven ends in rebuilding. For players with income behind them, or who are happy to drop back down.':
    'Cam una din șapte rulări se termină cu reconstruit de la zero. Pentru jucători care au un venit în spate sau cărora nu le pasă să coboare la limite mai mici.',
  'One run in twenty. The usual working compromise between growth and safety.':
    'Una din douăzeci de rulări. Compromisul obișnuit între creștere și siguranță.',
  'One run in a hundred. For players whose poker money has to survive whatever happens.':
    'Una din o sută de rulări. Pentru jucătorii ai căror bani de poker trebuie să reziste orice s-ar întâmpla.',
  'Every buy-in, judged': 'Fiecare buy-in, evaluat',
  'Buy-in': 'Buy-in',
  'Entry cost': 'Cost înscriere',
  'Risk of ruin': 'Risk of ruin',
  Verdict: 'Verdict',
  'Out of range': 'Peste posibilități',
  'Buy-ins deep': 'Buy-in-uri acoperite',
  'Too big': 'Prea mare',
  'For the normal tier': 'Pentru nivelul normal',
  short: 'lipsă',
  'How this is worked out': 'Cum se calculează',

  // ------------------------------------------------------------- variance --
  'Simulate a tournament sample: downswings, confidence bands and risk of ruin.':
    'Simulează un eșantion de turnee: downswing-uri, intervale de încredere și risk of ruin.',
  'Prize-pool portion': 'Partea care intră în premii',
  'Added on top': 'Adăugat peste',
  'Average entrants': 'Număr mediu de înscrieri',
  Tournaments: 'Turnee',
  'Sample size · max 20,000': 'Mărimea eșantionului · maximum 20.000',
  'Runs to average · max 5,000': 'Rulări de mediat · maximum 5.000',
  'For risk of ruin': 'Pentru risk of ruin',
  'Run simulation': 'Rulează simularea',
  Seed: 'Seed',
  'same seed → same run': 'același seed → aceeași rulare',
  'Expected profit': 'Profit așteptat',
  'Std deviation': 'Deviație standard',
  'Chance of loss': 'Șansă de pierdere',
  'Typical downswing': 'Downswing obișnuit',
  'Worst downswing': 'Cel mai rău downswing',
  'Bankroll over time': 'Bankroll în timp',
  'Where the runs finished': 'Unde s-au terminat rulările',
  Median: 'Mediană',
  'Expected value': 'Valoare așteptată',
  'break even': 'prag de rentabilitate',
  'final profit': 'profit final',
  'tournaments played': 'turnee jucate',

  'Play {min}–{max}': 'Joacă {min}–{max}',
  '{min}–{max} an entry once the fee is on': '{min}–{max} pe înscriere, cu fee-ul inclus',
  '{n} buy-ins deep · {roll} covers it': '{n} buy-in-uri acoperite · {roll} ajunge',
  '{pct} risk': 'risc {pct}',
  'Where {amount} puts you': 'Unde te plasează {amount}',
  '{amount} short': 'îți lipsesc {amount}',
  'At this edge that is about {n} more tournaments at your current level before {amount} is a normal-tier game rather than a shot.':
    'Cu edge-ul ăsta înseamnă cam încă {n} turnee la nivelul actual până când {amount} devine un joc de nivel normal, nu o încercare.',
  'Each tier is a promise about how often a {n}-tournament stretch ends in busting the roll.':
    'Fiecare nivel e o promisiune despre cât de des o serie de {n} turnee se termină cu bankroll-ul spart.',
  'The cash each buy-in demands. Anything your {amount} already covers is coloured in; grey is what you cannot afford yet.':
    'Banii ceruți de fiecare buy-in. Ce acoperă deja {amount} apare colorat; gri e ce nu îți permiți încă.',
  'At a {roi}% ROI you lose money every time you register, so no bankroll is big enough — a bigger roll only buys a longer decline. The numbers below assume the ROI you entered is real; fix the edge before sizing the roll.':
    'Cu un ROI de {roi}% pierzi bani de fiecare dată când te înscrii, deci niciun bankroll nu e suficient de mare — unul mai mare doar îți cumpără un declin mai lung. Cifrele de mai jos presupun că ROI-ul introdus e real; repară edge-ul înainte să dimensionezi bankroll-ul.',
  'Enter a bankroll greater than 0.': 'Introdu un bankroll mai mare decât 0.',
  'Field size must be at least 2.': 'Mărimea field-ului trebuie să fie cel puțin 2.',
  'Paid places must be between 0 and 100%.': 'Locurile plătite trebuie să fie între 0 și 100%.',
  'Fee cannot be negative.': 'Fee-ul nu poate fi negativ.',
  'Simulate at least 1 tournament.': 'Simulează cel puțin 1 turneu.',
  'Run at least 1 simulation.': 'Rulează cel puțin 1 simulare.',

  "Why not just say 100 buy-ins.":
    "De ce nu pur și simplu 100 de buy-in-uri.",
  "A 180-man turbo and a 5,000-runner major have completely different variance, and a 25% ROI grinder needs far less cushion than a 3% one. A flat number has to be wrong for almost everybody, so this simulates the tournaments you actually play — the same model the MTT Variance tool uses — and reads the answer off the results.":
    "Un turbo de 180 de jucători și un major cu 5.000 de înscrieri au varianță complet diferită, iar un grinder cu 25% ROI are nevoie de mult mai puțină rezervă decât unul cu 3%. O cifră fixă e greșită pentru aproape toată lumea, așa că aici se simulează turneele pe care le joci efectiv — același model folosit de MTT Variance — și răspunsul se citește din rezultate.",
  "What the tiers mean.":
    "Ce înseamnă nivelurile.",
  "Each one is a tolerance for going broke over the stretch you set: {aggressive} for aggressive, {normal} for normal, {conservative} for conservative. The simulation records how far below its starting point every run ever went, and the required bankroll is the point that only the tolerated fraction of runs dipped past.":
    "Fiecare e o toleranță pentru a rămâne fără bani pe intervalul pe care îl setezi: {aggressive} pentru agresiv, {normal} pentru normal, {conservative} pentru conservator. Simularea reține cât de jos sub punctul de plecare a coborât fiecare rulare, iar bankroll-ul necesar e punctul sub care a trecut doar fracțiunea tolerată de rulări.",
  "The horizon matters.":
    "Orizontul contează.",
  "Risk of ruin is not a fixed property of a bankroll — it grows with how long you play, because a longer stretch gives the downswing more chances to happen. Doubling the tournaments raises what you need. Set it to the volume you actually expect to put in.":
    "Risk of ruin nu e o proprietate fixă a unui bankroll — crește cu cât joci mai mult, fiindcă un interval mai lung dă downswing-ului mai multe ocazii să apară. Dublarea numărului de turnee crește cât îți trebuie. Pune volumul pe care chiar te aștepți să îl joci.",
  "It is only as good as your ROI.":
    "Valorează exact cât ROI-ul tău.",
  "Everything here hangs on the edge you type in, and most players guess high. If your ROI came from a few hundred tournaments it is mostly noise — use the low end of what you believe, and remember that the number you enter is over the total cost including the fee.":
    "Totul de aici depinde de edge-ul pe care îl introduci, iar majoritatea jucătorilor îl supraestimează. Dacă ROI-ul tău vine din câteva sute de turnee, e mai mult zgomot statistic — folosește capătul de jos al a ceea ce crezi și ține minte că numărul introdus e raportat la costul total, inclusiv fee-ul.",

  "Fee / rake":
    "Fee / rake",
  "Set your numbers and run a simulation to see the spread of outcomes.":
    "Pune-ți cifrele și rulează o simulare ca să vezi cum se împrăștie rezultatele.",
  "Final profit of every run. Red bars finished below break even.":
    "Profitul final al fiecărei rulări. Barele roșii s-au terminat sub pragul de rentabilitate.",
  "How the model works":
    "Cum funcționează modelul",
  "Simulating…":
    "Se simulează…",
  "5th–95th percentile":
    "Percentila 5–95",
  "Payouts.":
    "Premiile.",
  "The top slice of the field is paid, with the prize for place i proportional to 1/i across the pool. That curve tracks real MTT structures closely: the winner takes about 30% of the pool in a 100-runner event, 18% at 1,000 entrants and 13% at 10,000, with a min-cash near one buy-in.":
    "Se plătește partea de sus a field-ului, premiul pentru locul i fiind proporțional cu 1/i din pool. Curba urmărește îndeaproape structurile reale de MTT: câștigătorul ia cam 30% din pool într-un turneu cu 100 de jucători, 18% la 1.000 de înscrieri și 13% la 10.000, cu un min-cash aproape de un buy-in.",
  "Finishes.":
    "Clasările.",
  "Each tournament draws a finishing position. A break-even player finishes uniformly across the field; a winning player's finishes are skewed toward the top. The skew is solved numerically so the long-run result matches the ROI you entered.":
    "Fiecare turneu extrage o poziție de final. Un jucător pe zero se clasează uniform în field; clasările unui jucător câștigător sunt înclinate spre vârf. Înclinarea e calculată numeric, ca rezultatul pe termen lung să corespundă ROI-ului introdus.",
  "Caveat.":
    "Atenție.",
  "This assumes a fixed field size, a fixed ROI and no re-entries, and it says nothing about whether your ROI estimate is right. Treat the spread as indicative, not a forecast.":
    "Se presupune un field de mărime fixă, un ROI fix și fără re-entry-uri, iar despre cât de corectă e estimarea ta de ROI nu spune nimic. Tratează împrăștierea ca orientativă, nu ca pe o prognoză.",
  "Manual": "Manual",
  "Auto / 15s":
    "Auto / 15s",
  "Roll":
    "Aruncă",
  "Pop out to a corner window":
    "Deschide într-o fereastră de colț",
  "Your browser blocked the pop-up. Allow pop-ups for this site and try again.":
    "Browserul a blocat fereastra. Permite pop-up-urile pentru acest site și încearcă din nou.",

  // ----------------------------------------------------------------- misc --
  Clear: 'Șterge',
  Save: 'Salvează',
  Load: 'Încarcă',
  Delete: 'Șterge',
  Compare: 'Compară',
  Reset: 'Resetează',
  Import: 'Importă',
  Export: 'Exportă',
  Close: 'Închide',
  Cancel: 'Anulează',
  Copy: 'Copiază',
  Download: 'Descarcă',
  'Add a rung': 'Adaugă o treaptă',
  Overall: 'General',
  Position: 'Poziție',
  Preflop: 'Preflop',
  Postflop: 'Postflop',
  Winrate: 'Winrate',
}
