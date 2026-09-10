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
  "25–75% / 5–95% of runs":
    "25–75% / 5–95% dintre rulări",
  "20 individual runs":
    "20 de rulări individuale",
  "Sample size · max {n}":
    "Mărimea eșantionului · maximum {n}",
  "Runs to average · max {n}":
    "Rulări de mediat · maximum {n}",
  "{runs} simulated runs of {tournaments} tournaments.":
    "{runs} rulări simulate a câte {tournaments} turnee.",
  "Median run finished at {median} · a quarter finished below {low} and a quarter above {high}.":
    "Rularea mediană s-a terminat la {median} · un sfert s-au terminat sub {low} și un sfert peste {high}.",
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

  "What a knockout is really worth — at the start of the phase, and right now.":
    "Cât valorează cu adevărat un knockout — la începutul fazei, și chiar acum.",
  "Tournament":
    "Turneu",
  "Event name":
    "Numele evenimentului",
  "Save event":
    "Salvează evenimentul",
  "Copy report":
    "Copiază raportul",
  "Entries":
    "Înscrieri",
  "Including re-entries":
    "Inclusiv re-entry-urile",
  "Prize pool / entry":
    "Prize pool / înscriere",
  "Buy-in share that plays":
    "Partea din buy-in care intră în joc",
  "Bounty / entry":
    "Bounty / înscriere",
  "Buy-in share for bounties":
    "Partea din buy-in pentru bounty-uri",
  "Fee / entry":
    "Fee / înscriere",
  "Rake":
    "Rake",
  "Bounty phase starts":
    "Faza de bounty începe la",
  "Players left when envelopes begin":
    "Jucători rămași când încep plicurile",
  "Starting stack":
    "Stack de start",
  "Chips":
    "Jetoane",
  "Current big blind":
    "Big blind curent",
  "Top prize":
    "Premiul cel mare",
  "optional":
    "opțional",
  "Value of each top envelope":
    "Valoarea fiecărui plic mare",
  "Saved events":
    "Evenimente salvate",
  "The drum":
    "Urna",
  "Part-way through the phase the start-of-phase average is a fiction. Enter the envelopes still in the drum and every number below switches to what a knockout is worth right now.":
    "La mijlocul fazei, media de la început e o ficțiune. Introdu plicurile rămase în urnă și toate cifrele de mai jos trec la cât valorează un knockout chiar acum.",
  "Using the drum":
    "Se folosește urna",
  "Use the drum":
    "Folosește urna",
  "Paste a table":
    "Lipește un tabel",
  "Read the table":
    "Citește tabelul",
  "Envelope value":
    "Valoarea plicului",
  "How many left":
    "Câte au rămas",
  "Remove this rung":
    "Șterge această treaptă",
  "Enter at least one rung with a value and a count.":
    "Introdu cel puțin o treaptă cu o valoare și un număr.",
  "Average bounty left":
    "Bounty mediu rămas",
  "What you will most likely draw":
    "Ce vei extrage cel mai probabil",
  "What is in the drum":
    "Ce e în urnă",
  "What each rung is worth to a single knockout, and how much of the remaining money it holds.":
    "Cât valorează fiecare treaptă pentru un singur knockout și ce parte din banii rămași conține.",
  "Envelope":
    "Plic",
  "Left":
    "Rămase",
  "Chance per KO":
    "Șansă per KO",
  "Share of the money":
    "Cotă din bani",
  "Will the big one still be there?":
    "Va mai fi acolo cel mare?",
  "Every bust draws an envelope, so the drum and the player count run down together. Drawing envelopes does not make the drum poorer on average — every rung shrinks by the same fraction — but it does make it likelier the big ones are gone.":
    "Fiecare eliminare extrage un plic, deci urna și numărul de jucători scad împreună. Extragerea plicurilor nu sărăcește urna în medie — fiecare treaptă se micșorează cu aceeași fracțiune — dar face tot mai probabil ca cele mari să fi ieșit deja.",
  "Players left":
    "Jucători rămași",
  "Drawn from here":
    "Extrase de aici încolo",
  "Top rung still live":
    "Treapta de sus încă în joc",
  "Average bounty":
    "Bounty mediu",
  "Average excluding the top envelopes":
    "Media fără plicurile mari",
  "Bounty pool":
    "Fondul de bounty",
  "Envelopes drawn":
    "Plicuri extrase",
  "vs your contribution":
    "față de contribuția ta",
  "Regular prize pool":
    "Prize pool obișnuit",
  "As the blinds grow":
    "Pe măsură ce cresc blindurile",
  "The bounty is a fixed amount of cash, so it buys fewer big blinds every level.":
    "Bounty-ul e o sumă fixă de bani, deci cumpără tot mai puține big blinds la fiecare nivel.",
  "Big blind":
    "Big blind",
  "Worth to a 30bb stack":
    "Cât valorează pentru un stack de 30bb",
  "What it does to a call":
    "Ce face pentru un call",
  "Someone jams and you are deciding whether to call. You only win a bounty by knocking a player out, so anyone who has you covered brings none.":
    "Cineva dă all-in și tu decizi dacă dai call. Un bounty se câștigă doar eliminând un jucător, deci oricine te acoperă nu aduce niciunul.",
  "Your stack":
    "Stack-ul tău",
  "Their shove":
    "Shove-ul lui",
  "Second jam":
    "Al doilea all-in",
  "none":
    "niciunul",
  "Multiway":
    "Multiway",
  "Dead money":
    "Bani morți",
  "Bubble factor":
    "Bubble factor",
  "1 = chip EV":
    "1 = chip EV",
  "Without bounty":
    "Fără bounty",
  "With bounty":
    "Cu bounty",
  "Equity saved":
    "Equity economisit",
  "Risking":
    "Riști",
  "They are jamming":
    "El dă all-in cu",
  "Calling range":
    "Range de call",
  "Equity vs the jam":
    "Equity vs all-in",
  "call":
    "call",
  "fold":
    "fold",
  "MTT ranges by position and stack depth. Type a range, then drill yourself on it.":
    "Range-uri de MTT după poziție și adâncimea stack-ului. Scrie un range, apoi exersează-l.",
  "Mode:":
    "Mod:",
  "Library":
    "Bibliotecă",
  "Drill":
    "Exercițiu",
  "Both":
    "Ambele",
  "All":
    "Toate",
  "Any":
    "Oricare",
  "{shown} of {total} charts in scope":
    "{shown} din {total} chart-uri în selecție",
  "— the drill deals from these":
    "— exercițiul împarte din acestea",
  "New chart":
    "Chart nou",
  "Import JSON":
    "Importă JSON",
  "Re-sync the charts that ship with the app, keeping any you added":
    "Resincronizează chart-urile livrate cu aplicația, păstrându-le pe cele adăugate de tine",
  "Restore bundled":
    "Restaurează cele incluse",
  "Discard every saved chart and load only the bundled set":
    "Șterge toate chart-urile salvate și încarcă doar setul inclus",
  "Click again to wipe":
    "Apasă din nou ca să ștergi",
  "Reset all":
    "Resetează tot",
  "Export JSON":
    "Exportă JSON",
  "No charts match these filters. Widen them, or add a chart.":
    "Niciun chart nu se potrivește cu aceste filtre. Lărgește-le sau adaugă un chart.",
  "Range notation":
    "Notația range-urilor",
  "Edit":
    "Editează",
  "Model":
    "Model",
  "Stack":
    "Stack",
  "Action":
    "Acțiune",
  "RFI, vs BTN open…":
    "RFI, vs BTN open…",
  "Save chart":
    "Salvează chart-ul",
  "{n} combos · {pct}%":
    "{n} combos · {pct}%",
  "No charts in scope. Widen the filters above to drill.":
    "Niciun chart în selecție. Lărgește filtrele de mai sus ca să exersezi.",
  "Correct — {hand} is a mix, either answer is fine":
    "Corect — {hand} e un mix, oricare răspuns e bun",
  "Correct":
    "Corect",
  "{hand} is a {action} here":
    "Aici {hand} e {action}",
  "Next hand":
    "Mâna următoare",
  "The chart appears once you answer.":
    "Chart-ul apare după ce răspunzi.",
  "Preflop equity via Monte Carlo — hand vs range, stacks, and PKO bounties.":
    "Equity preflop prin Monte Carlo — mână vs range, stack-uri și bounty-uri PKO.",
  "Hero stack":
    "Stack-ul tău",
  "Tournament buy-in used to convert bounties to chips":
    "Buy-in-ul folosit ca să convertească bounty-urile în jetoane",
  "Starting chips at buy-in":
    "Jetoane de start la buy-in",
  "Existing pot":
    "Pot existent",
  "Antes + blinds already in the middle":
    "Ante + blinduri deja în mijloc",
  "Call amount":
    "Suma de call",
  "Showdown pot":
    "Pot la showdown",
  "Iterations":
    "Iterații",
  "Calculating…":
    "Se calculează…",
  "Calculate equity":
    "Calculează equity",
  "Specific hand":
    "Mână anume",
  "Range":
    "Range",
  "Call":
    "Call",
  "Fold":
    "Fold",
  "Calling is":
    "Call-ul e",
  "{ev} chips EV":
    "{ev} jetoane EV",
  "for a {amount} chip call":
    "pentru un call de {amount} jetoane",
  "Chip EV {ev} chips":
    "Chip EV {ev} jetoane",
  "— fold is higher EV than calling.":
    "— fold-ul are EV mai mare decât call-ul.",
  "Bounty amount in buy-in currency":
    "Valoarea bounty-ului în moneda buy-in-ului",
  "not covered":
    "nu îl acoperi",
  "Import a positional report from PokerTracker, Hold’em Manager or Hand2Note and compare every seat to healthy baselines.":
    "Importă un raport pe poziții din PokerTracker, Hold’em Manager sau Hand2Note și compară fiecare poziție cu repere sănătoase.",
  "1 · Import your report":
    "1 · Importă raportul",
  "Example: PT4 CSV":
    "Exemplu: CSV din PT4",
  "Example: HM3 / H2N":
    "Exemplu: HM3 / H2N",
  "Example: overall":
    "Exemplu: general",
  "Analyze report":
    "Analizează raportul",
  "Import file (.csv / .txt)":
    "Importă fișier (.csv / .txt)",
  "Clear":
    "Golește",
  "Whole-game score":
    "Scor pe tot jocul",
  "Download .md":
    "Descarcă .md",
  "Save snapshot":
    "Salvează un instantaneu",
  "Fix these first":
    "Repară-le pe astea întâi",
  "Ranked across every seat by how far off you are, discounted by sample size":
    "Clasate pe toate pozițiile după cât de departe ești, ponderat cu mărimea eșantionului",
  "2 · Stats by position":
    "2 · Statistici pe poziții",
  "Done editing targets":
    "Gata cu editarea reperelor",
  "Edit targets":
    "Editează reperele",
  "Progress":
    "Progres",
  "Saved reports stay in this browser. Compare one to what is loaded now.":
    "Rapoartele salvate rămân în acest browser. Compară unul cu ce e încărcat acum.",
  "Hide changes":
    "Ascunde modificările",
  "Compare":
    "Compară",
  "Paste a report above, or type values into the grid, to see your leaks.":
    "Lipește un raport mai sus, sau scrie valorile în grilă, ca să îți vezi leak-urile.",
  "Defend a preset range on flop, turn, and river vs random bet sizes.":
    "Apără un range presetat pe flop, turn și river împotriva unor bet size-uri aleatorii.",
  "Score":
    "Scor",
  "New session":
    "Sesiune nouă",
  "You will face three streets. Tag combos as fold or call to match the MDF target each time.":
    "Vei juca trei străzi. Marchează combo-urile ca fold sau call ca să atingi ținta MDF de fiecare dată.",
  "Random preset range":
    "Range presetat aleatoriu",
  "Start practice":
    "Începe exercițiul",
  "Street":
    "Stradă",
  "Board":
    "Board",
  "Villain bet":
    "Pariul adversarului",
  "Combo detail":
    "Detalii combo",
  "Submit {street} defense":
    "Trimite apărarea pe {street}",
  "Continue to {street}":
    "Continuă la {street}",
  "See final score":
    "Vezi scorul final",
  "Session complete":
    "Sesiune încheiată",
  "Play again":
    "Joacă din nou",
  "Heuristics, flashcards and questions. Study the bundled decks or import your own file.":
    "Reguli practice, flashcard-uri și întrebări. Studiază pachetele incluse sau importă-ți propriul fișier.",
  "Decks:":
    "Pachete:",
  "Tags:":
    "Etichete:",
  "{n} right":
    "{n} corecte",
  "{n} wrong":
    "{n} greșite",
  "Restart":
    "Reia",
  "Nothing to study with these filters. Widen the deck or tag selection, or import a deck below.":
    "Nimic de studiat cu aceste filtre. Lărgește selecția de pachete sau etichete, ori importă un pachet mai jos.",
  "{right} right · {wrong} wrong":
    "{right} corecte · {wrong} greșite",
  " · {n} replayed":
    " · {n} reluate",
  "Go again":
    "Încă o dată",
  "Import a deck":
    "Importă un pachet",
  "Pick a .json or .md deck file. It is stored in this browser only — to add cards for everyone, edit src/content/quizDecks.json in the repo.":
    "Alege un fișier .json sau .md. Se salvează doar în acest browser — ca să adaugi cărți pentru toată lumea, editează src/content/quizDecks.json în repo.",
  "Choose deck file…":
    "Alege fișierul…",
  "Deck file format":
    "Formatul fișierului",
  "Click to reveal":
    "Apasă ca să vezi răspunsul",
  "Again":
    "Din nou",
  "Got it":
    "Am știut",
  "Next":
    "Următoarea",
  "Load":
    "Încarcă",
  "Delete":
    "Șterge",
  "Cancel":
    "Anulează",
  "Remove":
    "Șterge",
  "Position":
    "Poziție",
  "ITM":
    "ITM",

  "{chips} chips · {envelopes} envelopes · {pool} still in the drum":
    "{chips} jetoane · {envelopes} plicuri · {pool} încă în urnă",
  "{pct}% of the envelopes left":
    "{pct}% din plicurile rămase",
  "Median draw {amount}. A few big envelopes pull the average well above what a normal knockout pays.":
    "Extragerea mediană {amount}. Câteva plicuri mari trag media mult peste cât plătește un knockout obișnuit.",
  "The drum is still rich: a knockout now is worth {ratio}× the untouched average of {average}. The big envelopes are still live.":
    "Urna e încă bogată: un knockout acum valorează {ratio}× media inițială de {average}. Plicurile mari sunt încă în joc.",
  "The drum has been picked over: a knockout now is worth {ratio}× the untouched average of {average}. Bust someone for the chips, not the envelope.":
    "Urna a fost răscolită: un knockout acum valorează {ratio}× media inițială de {average}. Elimină pe cineva pentru jetoane, nu pentru plic.",
  "A knockout is worth about what it always was — {now} against an untouched average of {average}.":
    "Un knockout valorează cam cât a valorat mereu — {now} față de o medie inițială de {average}.",

  "The bounty adds {amount} bb of collectable dead money to the pot whenever you knock them out.":
    "Bounty-ul adaugă {amount} bb de bani morți pe care îi poți încasa de fiecare dată când elimini adversarul.",
  "Why the average is so big.":
    "De ce e media atât de mare.",
  "Every entry funds the bounty pool, but envelopes are only drawn during the bounty phase. With 1,000 entries and the phase starting at 150 players, 1,000 contributions are shared over 149 knockouts — so the average bounty is about 6.7× what each player put in. The later the phase starts, the bigger the average.":
    "Fiecare înscriere alimentează fondul de bounty, dar plicurile se extrag doar în faza de bounty. Cu 1.000 de înscrieri și faza pornind la 150 de jucători, 1.000 de contribuții se împart la 149 de knockout-uri — deci bounty-ul mediu e cam de 6,7× cât a pus fiecare jucător. Cu cât începe mai târziu faza, cu atât media e mai mare.",
  "Chips per unit of cash.":
    "Jetoane per unitate de bani.",
  "Big-blind values convert through the prize-pool share of the buy-in, not the total. Every chip in play is eventually paid out of the regular prize pool, so a 20,000 stack bought by the $500 that reaches it is worth 40 chips per dollar. Using the full buy-in would understate the bounty by the size of the bounty split.":
    "Valorile în big blinds se convertesc prin partea din buy-in care merge în prize pool, nu prin total. Fiecare jeton din joc e plătit până la urmă din prize pool-ul obișnuit, deci un stack de 20.000 cumpărat cu cei $500 care ajung acolo valorează 40 de jetoane pe dolar. Folosirea buy-in-ului întreg ar subestima bounty-ul cu exact partea de bounty.",
  "Average vs typical.":
    "Medie față de tipic.",
  "Mystery structures are top-heavy: a handful of envelopes can hold a large slice of the pool. The average is the right number for EV over many knockouts, but the draw you actually make is usually nearer the typical figure. Enter the announced top prize and how many envelopes are worth it to see both, along with your odds of hitting one. Splitting the same money across more top envelopes leaves the average untouched and pulls the typical draw down.":
    "Structurile mystery sunt concentrate în vârf: câteva plicuri pot conține o felie mare din fond. Media e cifra corectă pentru EV pe multe knockout-uri, dar extragerea pe care o faci efectiv e de obicei mai aproape de valoarea tipică. Introdu premiul cel mare anunțat și câte plicuri au acea valoare ca să le vezi pe amândouă, împreună cu șansele să nimerești unul. Împărțirea acelorași bani în mai multe plicuri mari lasă media neschimbată și trage extragerea tipică în jos.",
  "Drawing envelopes does not empty the drum of value.":
    "Extragerea plicurilor nu golește urna de valoare.",
  "If you do not know which envelopes have gone, every rung shrinks by the same expected fraction, so the average knockout is worth exactly what it was. What changes is the chance the big ones are still in there, which is what the depletion table tracks. Update the counts as envelopes are announced and the average moves for real.":
    "Dacă nu știi care plicuri au ieșit, fiecare treaptă se micșorează cu aceeași fracțiune așteptată, deci knockout-ul mediu valorează exact cât valora. Ce se schimbă e șansa ca cele mari să mai fie acolo, iar asta urmărește tabelul de epuizare. Actualizează numerele pe măsură ce plicurile sunt anunțate și media se mișcă cu adevărat.",
  "Coverage and ICM.":
    "Acoperire și ICM.",
  "A bounty is only winnable if you can eliminate the player holding it, so anyone who covers you contributes nothing to the call and is stripped out. The bubble factor scales only the chips you risk: the bounty is cash that pays regardless of where you finish, so it is not discounted by ICM. That asymmetry is the whole reason bounties loosen bubble play.":
    "Un bounty se poate câștiga doar dacă poți elimina jucătorul care îl are, deci oricine te acoperă nu contribuie cu nimic la call și e scos din calcul. Bubble factor-ul scalează doar jetoanele pe care le riști: bounty-ul e bani care se plătesc indiferent unde termini, deci nu e depreciat de ICM. Asimetria asta e exact motivul pentru care bounty-urile relaxează jocul pe bulă.",

  "every pair from 22 up":
    "toate perechile de la 22 în sus",
  "a run of pairs":
    "un interval de perechi",
  "one exact hand":
    "o mână exactă",
  "K6s through KQs — high card fixed, kicker climbs":
    "de la K6s la KQs — cartea mare fixă, kicker-ul urcă",
  "a run of kickers under one high card":
    "un interval de kickeri sub aceeași carte mare",
  "no suffix means suited and offsuit":
    "fără sufix înseamnă și suited, și offsuit",
  "every hand with an ace on top, AA included":
    "toate mâinile cu as, inclusiv AA",
  "just the suited or offsuit half":
    "doar jumătatea suited sau offsuit",
  "Separate with commas, spaces or new lines. Layers are checked top to bottom, so a hand in two ranges belongs to the upper one.":
    "Separă cu virgule, spații sau linii noi. Straturile se verifică de sus în jos, deci o mână aflată în două range-uri aparține celui de sus.",

  "Card {n}":
    "Cartea {n}",
  "Tap a card slot to open the picker.":
    "Apasă pe un slot ca să deschizi selectorul.",
  "{existing} existing + {players} from players":
    "{existing} existente + {players} de la jucători",
  "Showdown pot = existing pot + sum of all-in contributions (matched to effective stack).":
    "Pot la showdown = pot existent + suma contribuțiilor all-in (limitate la effective stack).",

  "Winrate is below break-even. Review your biggest leaks before moving up.":
    "Winrate-ul e sub pragul de rentabilitate. Uită-te la cele mai mari leak-uri înainte să urci la limite mai mari.",
  "Strong winrate — make sure you are not running above EV; keep studying spots that still cost you bb/100.":
    "Winrate bun — asigură-te că nu alergi peste EV; continuă să studiezi situațiile care încă te costă bb/100.",
  "You open too few pots when folded to you. Raise first-in more, especially from late position.":
    "Deschizi prea puține pot-uri când se dă fold până la tine. Dă raise first-in mai des, mai ales din poziție târzie.",
  "You open very wide when folded to you. Trim the weakest opens from early and middle position.":
    "Deschizi foarte larg când se dă fold până la tine. Taie cele mai slabe deschideri din poziție timpurie și de mijloc.",
  "Very tight limping — fine if you are not limping at all.":
    "Limp foarte strâns — e în regulă dacă nu dai limp deloc.",
  "You limp open too often. Default to raising; limping invites multiway pots and loses initiative.":
    "Dai limp prea des. Implicit dă raise; limp-ul atrage pot-uri multiway și pierde inițiativa.",
  "Low limp-raise frequency is normal unless you use it as a deliberate strategy.":
    "O frecvență mică de limp-raise e normală, dacă nu îl folosești ca strategie deliberată.",
  "You limp-raise too often. This line is easily exploited — tighten your limp-raise range.":
    "Dai limp-raise prea des. Linia asta e ușor de exploatat — strânge range-ul de limp-raise.",
  "Low limp-call frequency is fine.":
    "O frecvență mică de limp-call e în regulă.",
  "You limp-call too much. Either raise your limps or fold dominated hands to raises.":
    "Dai limp-call prea mult. Ori dai raise în loc de limp, ori dai fold la mâinile dominate când vine un raise.",
  "Low limp-fold is normal.":
    "Un limp-fold mic e normal.",
  "You limp and fold too often — dead money. Stop limping weak hands you will not defend.":
    "Dai limp și apoi fold prea des — bani aruncați. Nu mai da limp cu mâini slabe pe care nu le aperi.",
  "You complete the SB too often vs limpers. Raise more to isolate weak limps.":
    "Completezi din SB prea des împotriva limperilor. Dă raise mai mult ca să izolezi limp-urile slabe.",
  "You raise every limp from the SB. Mix in some completes with playable hands.":
    "Dai raise la fiecare limp din SB. Mai completează uneori cu mâini jucabile.",
  "You defend too wide vs SB opens. Fold more offsuit junk.":
    "Aperi prea larg împotriva deschiderilor din SB. Dă fold la mai mult gunoi offsuit.",
  "You fold too much vs SB opens. Defend more suited hands and broadways.":
    "Dai fold prea mult împotriva deschiderilor din SB. Apără mai multe mâini suited și broadway.",
  "You defend the big blind too wide vs steals. Fold more junk offsuit hands.":
    "Aperi big blind-ul prea larg împotriva steal-urilor. Dă fold la mai multe mâini offsuit slabe.",
  "You surrender your big blind too often. Defend more suited hands and broadways vs late opens.":
    "Îți cedezi big blind-ul prea des. Apără mai multe mâini suited și broadway împotriva deschiderilor târzii.",
  "You flat too few opens. Add some suited connectors and pairs in position.":
    "Dai call la prea puține deschideri. Adaugă niște suited connectors și perechi când ești în poziție.",
  "You flat opens too often. 3-bet or fold more — avoid calling dominated offsuit hands.":
    "Dai call la deschideri prea des. Dă mai mult 3-bet sau fold — evită call-ul cu mâini offsuit dominate.",
  "You 3-bet too little. Add light 3-bets vs late-position opens instead of flatting.":
    "Dai prea puțin 3-bet. Adaugă 3-bet-uri light împotriva deschiderilor din poziție târzie în loc de call.",
  "You 3-bet very aggressively. Ensure your range is not too bluff-heavy out of position.":
    "Dai 3-bet foarte agresiv. Asigură-te că range-ul tău nu are prea mult bluff când ești în afara poziției.",
  "You rarely 3-bet vs steals. Add light 3-bets from the blinds vs wide late opens.":
    "Dai rar 3-bet împotriva steal-urilor. Adaugă 3-bet-uri light din blinduri împotriva deschiderilor largi.",
  "You 3-bet steals very often. Balance with more calls or you become easy to 4-bet.":
    "Dai 3-bet la steal-uri foarte des. Echilibrează cu mai multe call-uri, altfel devii ușor de 4-bet-uit.",
  "Low non-all-in 3-bet frequency — add more small 3-bets in position.":
    "Frecvență mică de 3-bet fără all-in — adaugă mai multe 3-bet-uri mici din poziție.",
  "Very high non-all-in 3-bet rate. Make sure sizing and ranges are balanced.":
    "Rată foarte mare de 3-bet fără all-in. Asigură-te că sizing-ul și range-urile sunt echilibrate.",
  "You defend too many opens vs 3-bets. Fold more dominated hands (KJo, ATo).":
    "Aperi prea multe deschideri împotriva 3-bet-urilor. Dă fold la mai multe mâini dominate (KJo, ATo).",
  "You fold too much after opening — exploitable. Continue with suited hands and 4-bet bluff occasionally.":
    "Dai fold prea mult după ce ai deschis — exploatabil. Continuă cu mâini suited și mai dă din când în când 4-bet ca bluff.",
  "You almost never 4-bet. Add value 4-bets with QQ+/AK and some A5s bluffs.":
    "Aproape că nu dai 4-bet. Adaugă 4-bet-uri de valoare cu QQ+/AK și niște bluff-uri cu A5s.",
  "You 4-bet very often. Make sure you are not stacking off light preflop.":
    "Dai 4-bet foarte des. Asigură-te că nu îți bagi tot stack-ul preflop cu mâini slabe.",
  "You fold too few 3-bets vs 4-bets — stacking off light.":
    "Dai fold la prea puține 3-bet-uri când vine 4-bet — îți bagi stack-ul prea ușor.",
  "You fold too many 3-bets vs 4-bets. Continue with strong hands and add 5-bet bluffs.":
    "Dai fold la prea multe 3-bet-uri când vine 4-bet. Continuă cu mâini puternice și adaugă bluff-uri de 5-bet.",
  "You call 4-bets too wide after 3-betting. Fold more bluff-catchers.":
    "Dai call la 4-bet-uri prea larg după ce ai dat 3-bet. Dă fold la mai multe bluff-catchere.",
  "You fold too much to 4-bets after 3-betting — opponents can 4-bet you light.":
    "Dai fold prea mult la 4-bet-uri după ce ai dat 3-bet — adversarii te pot 4-bet-ui cu orice.",
  "You squeeze too rarely. Add squeezes with strong hands and suited blockers vs limp-calls.":
    "Dai squeeze prea rar. Adaugă squeeze-uri cu mâini puternice și blockeri suited împotriva limp-call-urilor.",
  "You squeeze very often. Tighten your squeeze range out of position.":
    "Dai squeeze foarte des. Strânge range-ul de squeeze când ești în afara poziției.",
  "You c-bet too little out of position heads-up. Bet more on boards that favor your range.":
    "Dai prea puțin c-bet în afara poziției heads-up. Pariază mai mult pe board-uri care îți favorizează range-ul.",
  "You c-bet too often OOP. Check more on low, connected boards that favor the caller.":
    "Dai c-bet prea des OOP. Dă check mai mult pe board-uri joase și conectate care favorizează cel care a dat call.",
  "You c-bet too little in position. Leverage position with more flop bets on favorable boards.":
    "Dai prea puțin c-bet din poziție. Profită de poziție cu mai multe pariuri pe flop pe board-uri favorabile.",
  "You c-bet too often IP. Check back more on boards that hit the caller range.":
    "Dai c-bet prea des IP. Dă check back mai mult pe board-uri care lovesc range-ul celui care a dat call.",
  "You float too rarely in position. Call more c-bets with backdoor equity and plan to take the pot later.":
    "Dai float prea rar din poziție. Dă call la mai multe c-bet-uri cu backdoor equity și plănuiește să iei pot-ul mai târziu.",
  "You float too many flop c-bets. Fold more weak hands without a plan for the turn.":
    "Dai float la prea multe c-bet-uri pe flop. Dă fold la mai multe mâini slabe fără plan pentru turn.",
  "You call flop c-bets too wide. Fold more weak hands with no backdoor equity.":
    "Dai call la c-bet-urile de pe flop prea larg. Dă fold la mai multe mâini slabe fără backdoor equity.",
  "You fold too much to flop c-bets — one bet wins your stack. Float more with position and equity.":
    "Dai fold prea mult la c-bet-urile de pe flop — un singur pariu îți ia stack-ul. Dă float mai mult când ai poziție și equity.",
  "You defend too wide vs c-bets in 3-bet pots. Fold more air and weak pairs.":
    "Aperi prea larg împotriva c-bet-urilor în pot-uri de 3-bet. Dă fold la mai mult aer și perechi slabe.",
  "You fold too much to c-bets in 3-bet pots — opponents can barrel you off equity.":
    "Dai fold prea mult la c-bet-uri în pot-uri de 3-bet — adversarii te pot da afară din mâini cu equity.",
  "You fight floats too often — check-raise or barrel more when floated.":
    "Te lupți cu float-urile prea des — dă mai mult check-raise sau mai barelează când ești floatat.",
  "You fold too much when floated. Bet the turn more with your strong hands and bluffs.":
    "Dai fold prea mult când ești floatat. Pariază turn-ul mai mult cu mâinile puternice și cu bluff-urile.",
  "You give up too rarely after c-betting — fine if you barrel well.":
    "Renunți prea rar după ce dai c-bet — e în regulă dacă barelezi bine.",
  "You c-bet and fold too often. Either check more flops or defend more vs raises.":
    "Dai c-bet și apoi fold prea des. Ori dai check pe mai multe flop-uri, ori aperi mai mult împotriva raise-urilor.",
  "You raise flop c-bets too rarely. Add check-raises with strong hands and draws.":
    "Dai raise la c-bet-urile de pe flop prea rar. Adaugă check-raise-uri cu mâini puternice și draw-uri.",
  "You raise flop c-bets too often. Tighten your raising range to value and strong draws.":
    "Dai raise la c-bet-urile de pe flop prea des. Strânge range-ul de raise la valoare și draw-uri puternice.",
  "You check-raise the flop too rarely OOP. Add XR with strong hands and combo draws.":
    "Dai check-raise pe flop prea rar OOP. Adaugă XR cu mâini puternice și combo draw-uri.",
  "You check-raise the flop very often. Balance with more checks and calls.":
    "Dai check-raise pe flop foarte des. Echilibrează cu mai multe check-uri și call-uri.",
  "You rarely raise c-bets in 3-bet pots. Add XR/raises with top pair+ and strong draws.":
    "Dai rar raise la c-bet-uri în pot-uri de 3-bet. Adaugă XR/raise-uri cu top pair+ și draw-uri puternice.",
  "You raise flop c-bets too often in 3-bet pots. Narrow to nutted hands and best draws.":
    "Dai raise la c-bet-urile de pe flop prea des în pot-uri de 3-bet. Restrânge la mâini de nuts și cele mai bune draw-uri.",
  "Low donk-bet turn frequency is normal.":
    "O frecvență mică de donk bet pe turn e normală.",
  "You donk the turn too often. Leading turn is usually a leak — prefer check-call or check-raise.":
    "Dai donk pe turn prea des. Să conduci pe turn e de obicei un leak — preferă check-call sau check-raise.",
  "You give up on the turn too often after c-betting. Double barrel more on good turn cards.":
    "Renunți pe turn prea des după ce ai dat c-bet. Dă double barrel mai mult pe cărți de turn bune.",
  "You barrel the turn very often. Ensure second barrels land on cards that favor your range.":
    "Barelezi turn-ul foarte des. Asigură-te că al doilea barrel cade pe cărți care îți favorizează range-ul.",
  "You float the turn too rarely. Call more with position when you have equity to realize.":
    "Dai float pe turn prea rar. Dă call mai mult din poziție când ai equity de realizat.",
  "You float the turn too often. Fold more marginal hands without river plan.":
    "Dai float pe turn prea des. Dă fold la mai multe mâini marginale fără plan pentru river.",
  "You probe the turn too rarely after checking flop. Bet more when checked to and you have equity.":
    "Dai probe pe turn prea rar după ce ai dat check pe flop. Pariază mai mult când se dă check spre tine și ai equity.",
  "You probe the turn too often. Be selective on cards that favor your range.":
    "Dai probe pe turn prea des. Fii selectiv, pe cărți care îți favorizează range-ul.",
  "You rarely follow turn probes with river bets. Add river barrels when turn card improves your range.":
    "Rar continui probe-urile de pe turn cu pariuri pe river. Adaugă barrel-uri pe river când cartea de turn îți îmbunătățește range-ul.",
  "You probe turn and barrel river too often. Give up more when the river bricks.":
    "Dai probe pe turn și barrel pe river prea des. Renunță mai des când river-ul e o carte moartă.",
  "You call turn barrels too wide. Fold more weak pairs and draws without odds.":
    "Dai call la barrel-urile de pe turn prea larg. Dă fold la mai multe perechi slabe și draw-uri fără cote.",
  "You fold too much to turn barrels. Continue with more pairs and draws that beat bluffs.":
    "Dai fold prea mult la barrel-urile de pe turn. Continuă cu mai multe perechi și draw-uri care bat bluff-urile.",
  "You call turn probes too wide. Fold more weak showdown value.":
    "Dai call la probe-urile de pe turn prea larg. Dă fold la mai multă valoare slabă de showdown.",
  "You fold too much to turn probes. Defend more with pairs and backdoor equity.":
    "Dai fold prea mult la probe-urile de pe turn. Apără mai mult cu perechi și backdoor equity.",
  "You raise turn bets too rarely. Add raises with nutted hands and strong draws.":
    "Dai raise la pariurile de pe turn prea rar. Adaugă raise-uri cu mâini de nuts și draw-uri puternice.",
  "You raise turn bets too often. Most turn raises should be for value or strong combo draws.":
    "Dai raise la pariurile de pe turn prea des. Majoritatea raise-urilor pe turn ar trebui să fie pentru valoare sau combo draw-uri puternice.",
  "You rarely raise turn probes. Add raises with strong hands to punish thin probes.":
    "Dai rar raise la probe-urile de pe turn. Adaugă raise-uri cu mâini puternice ca să pedepsești probe-urile subțiri.",
  "You raise turn probes too often. Reserve raises for value and best draws.":
    "Dai raise la probe-urile de pe turn prea des. Păstrează raise-urile pentru valoare și cele mai bune draw-uri.",
  "Low donk-river frequency is normal.":
    "O frecvență mică de donk pe river e normală.",
  "You donk the river too often. Leading river is usually a leak unless you block-callers.":
    "Dai donk pe river prea des. Să conduci pe river e de obicei un leak, dacă nu folosești block bet-uri.",
  "You value-bet and bluff the river too rarely. Bet more when you have clear value or blockers.":
    "Dai prea rar value bet și bluff pe river. Pariază mai mult când ai valoare clară sau blockeri.",
  "You bet the river too often. Check more marginal hands and give up on missed bluffs.":
    "Pariezi river-ul prea des. Dă check cu mai multe mâini marginale și renunță la bluff-urile ratate.",
  "You call river bets too light — a calling-station leak. Fold more marginal bluff-catchers.":
    "Dai call la pariurile de pe river prea ușor — leak de calling station. Dă fold la mai multe bluff-catchere marginale.",
  "You fold too much to river bets. Call down lighter vs aggressive opponents with blockers.":
    "Dai fold prea mult la pariurile de pe river. Dă call mai ușor împotriva adversarilor agresivi când ai blockeri.",
  "You are playing too tight preflop. Add suited connectors, suited aces, and late-position opens.":
    "Joci prea strâns preflop. Adaugă suited connectors, ași suited și deschideri din poziție târzie.",
  "You are playing too many hands. Tighten up in early position and stop calling with weak offsuit hands.":
    "Joci prea multe mâini. Strânge în poziție timpurie și nu mai da call cu mâini offsuit slabe.",
  "You raise too few pots preflop. Open wider in late position and 3-bet more instead of flatting.":
    "Dai raise la prea puține pot-uri preflop. Deschide mai larg din poziție târzie și dă mai mult 3-bet în loc de call.",
  "You raise a lot preflop. Make sure the extra volume is late-position steals, not loose early opens.":
    "Dai mult raise preflop. Asigură-te că volumul în plus vine din steal-uri din poziție târzie, nu din deschideri largi timpurii.",
  "You pass up too many steal spots. Open more from CO, BTN and SB when it folds to you.":
    "Ratezi prea multe ocazii de steal. Deschide mai mult din CO, BTN și SB când se dă fold până la tine.",
  "You steal very often. Fine vs tight blinds, but expect to get 3-bet if the table is paying attention.":
    "Dai steal foarte des. E în regulă împotriva blindurilor strânse, dar așteaptă-te la 3-bet dacă masa e atentă.",
  "You reach showdown rarely — you are folding too many rivers or barrelling into folds.":
    "Ajungi rar la showdown — ori dai fold pe prea multe river-uri, ori barelezi în fold-uri.",
  "You reach showdown too often. You are calling down too wide; fold more weak bluff-catchers.":
    "Ajungi la showdown prea des. Dai call prea larg; dă fold la mai multe bluff-catchere slabe.",
  "You lose most showdowns you reach. Your calling range is too weak — fold the bottom of it.":
    "Pierzi majoritatea showdown-urilor la care ajungi. Range-ul tău de call e prea slab — renunță la partea de jos.",
  "You win a lot at showdown, which usually means you only get there with the nuts. Call down wider.":
    "Câștigi mult la showdown, ceea ce înseamnă de obicei că ajungi acolo doar cu nuts. Dă call mai larg.",
  "You win too few of the pots you see a flop in. Barrel more and give up less on later streets.":
    "Câștigi prea puține din pot-urile în care vezi flop-ul. Barelează mai mult și renunță mai puțin pe străzile următoare.",
  "You win a lot of flops, often by betting. Watch that you are not folding out worse and value-betting thin.":
    "Câștigi multe flop-uri, deseori pariind. Ai grijă să nu dai afară mâini mai slabe și să nu pariezi valoare prea subțire.",
  "You check and call more than you bet and raise. Take the betting lead more often postflop.":
    "Dai check și call mai mult decât pariezi și dai raise. Preia inițiativa mai des postflop.",
  "Very aggressive postflop. Make sure the extra bets are value and blockers, not pure spew.":
    "Foarte agresiv postflop. Asigură-te că pariurile în plus sunt valoare și blockeri, nu risipă pură.",
  "Within the healthy range.":
    "În intervalul sănătos.",
  "{verb} — {seat} charts":
    "{verb} — chart-uri {seat}",
  "Compare your opens":
    "Compară-ți deschiderile",
  "Compare late-position opens":
    "Compară deschiderile din poziție târzie",
  "Compare your ranges":
    "Compară-ți range-urile",
  "Check the flatting range":
    "Verifică range-ul de call",
  "Check the 3-bet range":
    "Verifică range-ul de 3-bet",
  "Check blind 3-bets":
    "Verifică 3-bet-urile din blinduri",
  "Check the 4-bet range":
    "Verifică range-ul de 4-bet",
  "Check the squeeze range":
    "Verifică range-ul de squeeze",
  "Review the SB limp range":
    "Revizuiește range-ul de limp din SB",
  "Review BB vs limp":
    "Revizuiește BB împotriva limp-ului",
  "Review BB defence":
    "Revizuiește apărarea din BB",
  "Work out the right defend frequency":
    "Calculează frecvența corectă de apărare",
  "Build the flop defending range":
    "Construiește range-ul de apărare pe flop",
  "Build the turn defending range":
    "Construiește range-ul de apărare pe turn",
  "Build the river defending range":
    "Construiește range-ul de apărare pe river",
  "Check equity vs a calling range":
    "Verifică equity împotriva unui range de call",
  "Check float equity":
    "Verifică equity de float",
  "Check raise equity":
    "Verifică equity de raise",
  "Check check-raise equity":
    "Verifică equity de check-raise",
  "Check probe equity":
    "Verifică equity de probe",
  "Check equity vs a betting range":
    "Verifică equity împotriva unui range care pariază",
  "Drill the pot-odds numbers":
    "Exersează cifrele de pot odds",
  "Drill the combo maths":
    "Exersează matematica de combo-uri",
  "Drill the aggression heuristics":
    "Exersează regulile de agresivitate",
  "See what this winrate does over a sample":
    "Vezi ce face winrate-ul ăsta pe un eșantion",
  "OK":
    "OK",
  "Minor leak":
    "Leak minor",
  "Moderate leak":
    "Leak moderat",
  "Major leak":
    "Leak major",
  "No leaks detected — stats are within healthy ranges.":
    "Niciun leak detectat — statisticile sunt în intervale sănătoase.",
  "Solid overall. A few small adjustments will tighten things up.":
    "Solid în ansamblu. Câteva ajustări mici vor strânge lucrurile.",
  "Decent foundation, but several stats need attention.":
    "Bază decentă, dar câteva statistici cer atenție.",
  "Significant leaks detected. Focus on the major issues first.":
    "Leak-uri semnificative detectate. Concentrează-te întâi pe problemele majore.",
  "Hand count unknown — treat as directional only.":
    "Numărul de mâini e necunoscut — tratează asta doar ca orientare.",
  "PT4: Reports → stat report grouped by position → Export → CSV. HM3 and Hand2Note: any positional export with a header row. Count columns are read as sample sizes, dash (-) blanks are skipped, and HM3’s combined “Late” bucket is read as CO.":
    "PT4: Reports → raport de statistici grupat pe poziții → Export → CSV. HM3 și Hand2Note: orice export pe poziții cu un rând de antet. Coloanele Count sunt citite ca mărimi de eșantion, spațiile cu liniuță (-) sunt sărite, iar categoria combinată „Late” din HM3 e citită ca CO.",

  "{leaks} leaks across {seats} seats · weighted by how much sample backs each stat":
    "{leaks} leak-uri pe {seats} poziții · ponderat după cât eșantion susține fiecare statistică",
  "{stats} stats analyzed · {leaks} leaks found":
    "{stats} statistici analizate · {leaks} leak-uri găsite",
  "too low":
    "prea mic",
  "too high":
    "prea mare",
  "{hands} hands · {relevance}":
    "{hands} mâini · {relevance}",
  "Not enough data":
    "Date insuficiente",
  "Low relevance":
    "Relevanță mică",
  "Moderately relevant":
    "Relevanță moderată",
  "Highly relevant":
    "Relevanță mare",

  "Flashcards": "Flashcard-uri",
  "Quiz": "Quiz",
  "Reference": "Referință",

  // ------------------------------------------------------------- roadmap --
  "The road from beginner to high stakes, in six stages":
    "Drumul de la începător la high stakes, în șase etape",
  "Roadmap":
    "Roadmap",
  "Start here":
    "Începe de aici",
  "The whole climb, and what each step of it costs.":
    "Tot drumul, și cât costă fiecare pas din el.",
  "From knowing nothing to high stakes in six stages — the bankroll, volume and study hours each one takes, and how many players get through.":
    "De la zero la high stakes în șase etape — bankroll-ul, volumul și orele de studiu pe care le cere fiecare, și câți jucători ajung până la capăt.",
  "From never having played to sitting in a high-stakes game — the six stages, what each one costs in money and hours, and how many people actually get through.":
    "De la a nu fi jucat niciodată până la a sta într-un joc de high stakes — cele șase etape, cât costă fiecare în bani și ore, și câți oameni ajung de fapt până la capăt.",
  "Where are you now?":
    "Unde te afli acum?",
  "The road fills in up to where you are. Tap again to clear it.":
    "Drumul se colorează până unde ești. Apasă din nou ca să ștergi.",
  "Pick a stage to light up the road behind you. It stays in this browser.":
    "Alege o etapă ca să aprinzi drumul din spatele tău. Rămâne în acest browser.",
  "Stage {n}":
    "Etapa {n}",
  "Stakes":
    "Limite",
  "In buy-ins":
    "În buy-in-uri",
  "Time here":
    "Timp aici",
  "Volume":
    "Volum",
  "Study":
    "Studiu",
  "Typically {low}–{high} months of playing before you get here at all.":
    "De obicei {low}–{high} luni de joc până să ajungi aici.",
  "What you learn here":
    "Ce înveți aici",
  "How you know you are ready":
    "Cum știi că ești pregătit",
  "The honest part":
    "Partea sinceră",
  "Tools for this stage":
    "Instrumente pentru etapa asta",
  "True at every stage":
    "Adevărat în orice etapă",
  "The parts no single milestone owns, and the ones that decide who keeps going.":
    "Părțile care nu aparțin unei singure etape, și cele care decid cine merge mai departe.",
  "The rules":
    "Regulile",
  "Know what beats what, and what a position is.":
    "Să știi ce bate ce, și ce înseamnă poziția.",
  "Play money · freerolls":
    "Bani virtuali · freeroll-uri",
  "2–4 weeks":
    "2–4 săptămâni",
  "~50 tournaments":
    "~50 de turnee",
  "2–3 h/week":
    "2–3 h/săptămână",
  "Hand rankings without thinking about it":
    "Ierarhia mâinilor, fără să te gândești",
  "The seat names and why position matters":
    "Numele pozițiilor și de ce contează poziția",
  "Blinds, antes, and how a tournament clock works":
    "Blinduri, ante și cum funcționează ceasul unui turneu",
  "Pot odds as a fraction, not a feeling":
    "Pot odds ca fracție, nu ca senzație",
  "You never misread your hand and never miss that you are last to act.":
    "Nu îți citești greșit mâna niciodată și nu ratezi niciodată faptul că ești ultimul care acționează.",
  "The cheapest stage and the one people rush. Every hour here saves ten later, because everything above is built on it.":
    "Etapa cea mai ieftină și cea peste care se trece în grabă. Fiecare oră de aici îți economisește zece mai târziu, fiindcă tot ce urmează se construiește pe ea.",
  "Preflop discipline":
    "Disciplină preflop",
  "Play a tight, positionally aware opening game.":
    "Joacă un joc de deschidere strâns și conștient de poziție.",
  "$100 – $200":
    "$100 – $200",
  "100 buy-ins":
    "100 de buy-in-uri",
  "2–4 months":
    "2–4 luni",
  "500–1,000 tournaments":
    "500–1.000 de turnee",
  "3–5 h/week":
    "3–5 h/săptămână",
  "An opening range for every seat, memorised":
    "Un range de deschidere pentru fiecare poziție, memorat",
  "Folding the hands that look playable and are not":
    "Să dai fold la mâinile care par jucabile și nu sunt",
  "Shove and call ranges under 15bb":
    "Range-uri de shove și call sub 15bb",
  "3-betting for value before 3-betting as a bluff":
    "Să dai 3-bet pentru valoare înainte să dai 3-bet ca bluff",
  "You can name your open from any seat instantly, and your VPIP and PFR sit close together.":
    "Poți spune instant ce deschizi din orice poziție, iar VPIP și PFR sunt aproape unul de altul.",
  "Most players never finish this stage — they learn ranges, then abandon them the first time a tight session gets boring.":
    "Majoritatea jucătorilor nu termină niciodată etapa asta — învață range-urile, apoi le abandonează prima dată când o sesiune strânsă devine plictisitoare.",
  "Micro stakes":
    "Micro stakes",
  "Win for the first time, and prove it with volume.":
    "Câștigă pentru prima dată, și dovedește-o cu volum.",
  "$500 – $1,500":
    "$500 – $1.500",
  "150–250 buy-ins":
    "150–250 de buy-in-uri",
  "6–12 months":
    "6–12 luni",
  "3,000–5,000 tournaments":
    "3.000–5.000 de turnee",
  "5–8 h/week":
    "5–8 h/săptămână",
  "C-betting by board texture rather than by habit":
    "Să dai c-bet după textura board-ului, nu din obișnuință",
  "Reading a board for what it hits, not what you hold":
    "Să citești board-ul după ce lovește, nu după ce ai tu",
  "Basic ICM: why the bubble changes everything":
    "ICM de bază: de ce bula schimbă totul",
  "Tracking results honestly, including the losing months":
    "Să îți urmărești rezultatele cinstit, inclusiv lunile pe minus",
  "A positive ROI over 3,000+ tournaments — not 300, which tells you nothing.":
    "Un ROI pozitiv pe 3.000+ de turnee — nu pe 300, care nu îți spune nimic.",
  "The first real filter. Micro fields are soft but the rake is brutal, and a genuine winner here is often only making a few dollars an hour.":
    "Primul filtru adevărat. Field-urile de micro sunt slabe, dar rake-ul e brutal, iar un câștigător real de aici scoate deseori doar câțiva dolari pe oră.",
  "Low stakes":
    "Low stakes",
  "Turn a small edge into a repeatable one.":
    "Transformă un edge mic într-unul care se repetă.",
  "$3,000 – $8,000":
    "$3.000 – $8.000",
  "200–300 buy-ins":
    "200–300 de buy-in-uri",
  "1–2 years":
    "1–2 ani",
  "10,000+ tournaments":
    "10.000+ de turnee",
  "8–12 h/week":
    "8–12 h/săptămână",
  "Solver work on the spots that actually recur":
    "Lucru cu solverul pe situațiile care chiar se repetă",
  "Turn and river barrelling with a plan, not hope":
    "Barrel pe turn și river cu un plan, nu cu speranță",
  "ICM in the money, not just on the bubble":
    "ICM în bani, nu doar pe bulă",
  "Bankroll rules you follow on a bad day":
    "Reguli de bankroll pe care le respecți și într-o zi proastă",
  "You beat the level for a year, through at least one downswing you did not enjoy.":
    "Bați nivelul timp de un an, trecând prin cel puțin un downswing care nu ți-a plăcut.",
  "Where most serious players top out and stay — and there is nothing wrong with that. A good low-stakes grinder can make real money part-time.":
    "Aici se opresc și rămân majoritatea jucătorilor serioși — și nu e nimic greșit în asta. Un grinder bun de low stakes poate scoate bani reali part-time.",
  "Mid stakes":
    "Mid stakes",
  "Beat opponents who are also studying.":
    "Bate adversari care studiază și ei.",
  "$15,000 – $50,000":
    "$15.000 – $50.000",
  "250–400 buy-ins":
    "250–400 de buy-in-uri",
  "2–4 years":
    "2–4 ani",
  "15,000+ tournaments":
    "15.000+ de turnee",
  "10–15 h/week":
    "10–15 h/săptămână",
  "Population tendencies, not just theory":
    "Tendințele populației, nu doar teorie",
  "Exploits you can turn on and off deliberately":
    "Exploatări pe care le pornești și le oprești deliberat",
  "Mental game that survives a six-figure downswing":
    "Un mental game care rezistă la un downswing de șase cifre",
  "Treating it as a business: records, tax, expenses":
    "Să tratezi totul ca pe o afacere: evidențe, taxe, cheltuieli",
  "A winrate that holds up when the same names sit down every night.":
    "Un winrate care rezistă când aceleași nume se așază la masă în fiecare seară.",
  "Your opponents now study as hard as you do. Edge comes from game selection and consistency, not from knowing one more line.":
    "Adversarii tăi studiază acum la fel de mult ca tine. Edge-ul vine din selecția jocurilor și din consecvență, nu din a ști încă o linie.",
  "High stakes":
    "High stakes",
  "A small profession with very few seats.":
    "O profesie mică, cu foarte puține locuri.",
  "$215 – $10,000+":
    "$215 – $10.000+",
  "$100,000+ or backing":
    "$100.000+ sau backing",
  "300+ buy-ins, or a stable":
    "300+ buy-in-uri, sau o echipă care te susține",
  "Ongoing":
    "Continuu",
  "Selective, not maximal":
    "Selectiv, nu maximal",
  "15+ h/week, often with a group":
    "15+ h/săptămână, deseori într-un grup",
  "Game selection as the primary skill":
    "Selecția jocurilor ca abilitate principală",
  "Swings measured in tens of thousands":
    "Oscilații măsurate în zeci de mii",
  "A network: staking, swaps, study groups":
    "O rețea: staking, swap-uri, grupuri de studiu",
  "Knowing when a game is not worth sitting in":
    "Să știi când un joc nu merită să te așezi la el",
  "You are still here in five years, and the money is still yours.":
    "Ești încă aici peste cinci ani, și banii sunt tot ai tăi.",
  "Vanishingly few players arrive, and many who do are backed rather than playing their own roll. Most high-stakes careers are shorter than people imagine.":
    "Extrem de puțini jucători ajung aici, iar mulți dintre cei care ajung sunt susținuți financiar, nu joacă din bankroll-ul propriu. Majoritatea carierelor de high stakes sunt mai scurte decât își imaginează lumea.",
  "Volume is the entry fee":
    "Volumul e taxa de intrare",
  "Results under a few thousand tournaments are noise. A 10% ROI player can lose over 1,000 tournaments without doing anything wrong, so any conclusion drawn from a short sample is guesswork wearing a number.":
    "Rezultatele sub câteva mii de turnee sunt zgomot. Un jucător cu 10% ROI poate pierde pe 1.000 de turnee fără să greșească cu nimic, deci orice concluzie trasă dintr-un eșantion scurt e o presupunere îmbrăcată în cifre.",
  "Study time is not optional":
    "Timpul de studiu nu e opțional",
  "A rough working ratio is one hour of study for every three or four hours of play. Players who only play get better for about a year and then stop, because the game keeps moving and they do not.":
    "Un raport practic e o oră de studiu la fiecare trei-patru ore de joc. Jucătorii care doar joacă se îmbunătățesc vreo un an și apoi se opresc, fiindcă jocul merge înainte, iar ei nu.",
  "Bankroll rules break under pressure, not on paper":
    "Regulile de bankroll se rup sub presiune, nu pe hârtie",
  "Everyone agrees with the numbers when they are up. The rule only exists for the day you are stuck and a bigger game looks like the way out — that is the day it is worth something.":
    "Toată lumea e de acord cu cifrele când e pe plus. Regula există doar pentru ziua în care ești pe minus și un joc mai mare pare soluția — aia e ziua în care valorează ceva.",
  "Moving up is a decision, not a reward":
    "Urcatul la limite e o decizie, nu o recompensă",
  "Move up on a sample and a bankroll, never on a feeling or a heater. And be as willing to move back down: the players who survive are the ones who treat that as normal rather than as failure.":
    "Urcă pe baza unui eșantion și a unui bankroll, niciodată pe baza unei senzații sau a unei perioade bune. Și fii la fel de dispus să cobori: jucătorii care supraviețuiesc sunt cei care tratează asta ca pe ceva normal, nu ca pe un eșec.",
  "The mental game is the last leak to close":
    "Mental game-ul e ultimul leak pe care îl închizi",
  "Tilt costs more than any strategic error most players will ever make, and it compounds — a bad session becomes a bad week through decisions made while upset rather than through cards.":
    "Tilt-ul costă mai mult decât orice eroare strategică pe care o va face majoritatea jucătorilor, și se acumulează — o sesiune proastă devine o săptămână proastă prin decizii luate la nervi, nu prin cărți.",
  "Most people do not make it, and that is the honest part":
    "Majoritatea nu reușesc, și asta e partea sinceră",
  "The overwhelming majority of players never beat low stakes for a meaningful sample. Knowing that in advance makes the climb a choice rather than a disappointment.":
    "Marea majoritate a jucătorilor nu bat niciodată low stakes pe un eșantion semnificativ. Să știi asta dinainte face din urcuș o alegere, nu o dezamăgire.",

  // ----------------------------------------------------------------- misc --
  Save: 'Salvează',
  Reset: 'Resetează',
  Import: 'Importă',
  Export: 'Exportă',
  Close: 'Închide',
  Copy: 'Copiază',
  Download: 'Descarcă',
  'Add a rung': 'Adaugă o treaptă',
  Overall: 'General',
  Preflop: 'Preflop',
  Postflop: 'Postflop',
  Winrate: 'Winrate',
}
