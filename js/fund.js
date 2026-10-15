'use strict';
/* =====================================================================
   Fundstücke (Setzkasten), Stufe 22
   Je Welt fünf. Genau eines bringt mehr Ertrag der eigenen Fruchtwährung (yield), die anderen
   ändern, wie eine Frucht oder der Run abläuft. Stufe 1 beim Fund, Stufe 2 und 3 durch Veredeln
   mit der Kernwährung der Welt. v = Wert je Stufe, desc(x, l) beschreibt die Wirkung mit diesem Wert.
   where = wo es wirkt ('alle' oder der Name einer Frucht bzw. 'Darm').
   ===================================================================== */
const FUND_CHANCE = 0.1;                                   // Anteil der Früchte mit funkelnder Stelle
const FUND_FIRST_RUN = 5;                                  // das allererste Fundstück liegt sicher ab dem 5. Run in der Johannisbeere
const FUND_COST = [20, 100, 150, 750, 450, 600];           // Veredeln auf Stufe 2 (Stufe 3: dreifach), in der Kernwährung der Welt
const pctS = x => Math.round(x * 100) + ' %';
const FUND = [
  // --- Johannisbeere ---
  { id: 'bluetenrest', w: 0, name: 'Blütenrest', yield: true, where: 'Johannisbeere', v: [0.15, 0.25, 0.35],
    fact: 'Unten an jeder Johannisbeere sitzt der vertrocknete Rest der Blüte.',
    desc: x => `+${pctS(x)} Beerensaft.`,
    ic: '<path d="M12 3.5l1.7 5 5-1.7-3.3 4.2 3.3 4.2-5-1.7-1.7 5-1.7-5-5 1.7 3.3-4.2-3.3-4.2 5 1.7Z"/>' },
  { id: 'honigtau', w: 0, name: 'Honigtau', where: 'alle', v: [0.03, 0.05, 0.07],
    fact: 'Blattläuse saugen an Johannisbeeren und scheiden zuckrigen Honigtau aus. Ameisen und Bienen sammeln ihn.',
    desc: x => `Jede geplatzte Saftblase (auch Öltropfen) gibt ${pctS(x)} der Ausdauer zurück.`,
    ic: '<path d="M12 3c-3 5-5 7-5 10a5 5 0 0 0 10 0c0-3-2-5-5-10Z"/><path d="M9.8 13.5a2.2 2.2 0 0 0 2.2 2.2"/>' },
  { id: 'vitaminc', w: 0, name: 'Vitamin C', where: 'alle', v: [0.5, 0.75, 1],
    fact: 'Johannisbeeren haben viel Vitamin C, die schwarzen sogar mehr als Zitronen.',
    desc: x => `Nach einem kritischen Biss ist der nächste mit ${pctS(x)} Chance auch einer. Ein Folge-Krit löst keinen weiteren aus.`,
    ic: '<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16M6.4 6.4l11.2 11.2M17.6 6.4 6.4 17.6"/>' },
  { id: 'johannistag', w: 0, name: 'Johannistag', where: 'alle', v: [10, 8, 6],
    fact: 'Johannisbeeren werden um den Johannistag am 24. Juni reif. Daher haben sie ihren Namen.',
    desc: x => `Jeder ${x}. Run (über alle Welten gezählt) ist Johannistag: doppelte Fundchance.`,
    ic: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>' },
  { id: 'gallmilbe', w: 0, name: 'Gallmilbe', where: 'alle', v: [0.2, 0.3, 0.4],
    fact: 'Die Johannisbeer-Gallmilbe lebt in den Knospen und lässt sie kugelig anschwellen („Rundknospen").',
    desc: x => `Sonderstellen sind ${pctS(x)} größer.`,
    ic: '<circle cx="12" cy="13.5" r="6.5"/><path d="M12 7V3M9 4.5l3 2.5 3-2.5"/><circle cx="9.8" cy="12" r="1"/>' },
  // --- Kirsche ---
  { id: 'herzkirsche', w: 1, name: 'Herzkirsche', yield: true, where: 'Kirsche', v: [0.15, 0.25, 0.35],
    fact: 'Herzkirschen sind Süßkirschen mit weichem, saftigem Fruchtfleisch und herzförmiger Frucht.',
    desc: x => `+${pctS(x)} Kirschsaft.`,
    ic: '<path d="M12 20.5s-6.5-4-6.5-9a3.5 3.5 0 0 1 6.5-1.8 3.5 3.5 0 0 1 6.5 1.8c0 5-6.5 9-6.5 9Z"/><path d="M12 9.7c0-3 1.2-5.2 4.2-6.4"/>' },
  { id: 'kernspucken', w: 1, name: 'Kernspucken', where: 'alle', v: [4, 7, 10],
    fact: 'Kirschkern-Weitspucken ist ein echter Wettbewerb. Die Besten spucken weiter als 20 Meter.',
    desc: x => `Säurespucke fliegt doppelt so weit und dringt erst ${x} Pixel ins Material ein, bevor sie platzt. Wirkt nur mit Säurespucke.`,
    ic: '<ellipse cx="16.5" cy="12" rx="4" ry="5"/><path d="M3 8.5h6M2 12h7.5M3 15.5h6"/>' },
  { id: 'kirschgummi', w: 1, name: 'Kirschgummi', where: 'alle', v: [0.2, 0.3, 0.4],
    fact: 'Verletzte Kirschbäume schützen sich mit Gummifluss: Aus der Rinde quillt ein bernsteinfarbenes Harz.',
    desc: x => `Die aktive Fähigkeit wirkt ${pctS(x)} länger (Schub: weiter, Säurespucke: längere Pfütze).`,
    ic: '<path d="M4 3v18M8 3v18"/><path d="M14.5 6c-2 3-3 4.5-3 6.5a3 3 0 0 0 6 0c0-2-1-3.5-3-6.5Z"/>' },
  { id: 'essigfliege', w: 1, name: 'Kirschessigfliege', where: 'alle', v: [0.05, 0.1, 0.15],
    fact: 'Die Kirschessigfliege sticht reife, heile Früchte an und legt ihre Eier hinein. Die Frucht wird weich und fault.',
    desc: x => `Faulstellen kommen ${Math.round(x * 100)} Prozentpunkte häufiger (auch ohne das Upgrade, außer ausgeschaltet) und sind 25 % größer.`,
    ic: '<ellipse cx="12" cy="14.5" rx="3" ry="5"/><circle cx="12" cy="7.5" r="2"/><path d="M9.5 12.5 4 10M14.5 12.5 20 10M9.5 15.5 5 17.5M14.5 15.5 19 17.5"/>' },
  { id: 'kernkissen', w: 1, name: 'Kirschkernkissen', where: 'alle', v: [0.25, 0.35, 0.45],
    fact: 'Kirschkerne speichern Wärme gut. Darum füllt man sie in Wärmekissen.',
    desc: x => `Bisse in Kerne und Steine kosten ${pctS(x)} weniger Ausdauer.`,
    ic: '<path d="M4 7c3-2 13-2 16 0 1.5 3 1.5 7 0 10-3 2-13 2-16 0-1.5-3-1.5-7 0-10Z"/><circle cx="9" cy="11" r=".8"/><circle cx="13" cy="13.5" r=".8"/><circle cx="15.5" cy="10" r=".8"/>' },
  // --- Walnuss ---
  { id: 'hirnwindung', w: 2, name: 'Hirnwindung', yield: true, where: 'Walnuss', v: [0.15, 0.25, 0.35],
    fact: 'Die Walnuss sieht aus wie ein kleines Gehirn. Nach der alten Signaturenlehre sollte sie darum gut fürs Hirn sein.',
    desc: x => `+${pctS(x)} Nussholz.`,
    ic: '<path d="M12 4c-4.5 0-8 3-8 8s3.5 8 8 8 8-3 8-8-3.5-8-8-8Z"/><path d="M12 4v16M8 8c2 1 0 3 2 4s0 3-2 4M16 8c-2 1 0 3-2 4s0 3 2 4"/>' },
  { id: 'nusstinte', w: 2, name: 'Nusstinte', where: 'Darm', v: [1, 2, 99],
    fact: 'Aus der grünen Walnusshülle hat man früher braune Tinte und Holzbeize gemacht.',
    desc: x => `Im Darm zeigt eine gestrichelte Linie, wohin der nächste Brocken fällt: ${x === 1 ? 'bis zur ersten Zilie' : x === 2 ? 'bis zur zweiten Zilie' : 'den ganzen Weg'}.`,
    ic: '<path d="M20 3C12 5 7 11 5 19l2 1c2-6 6-11 13-17Z"/><path d="M3 21.5h2.5M8 21.5h2.5M13 21.5h2.5"/>' },
  { id: 'scheidewand', w: 2, name: 'Scheidewand', where: 'Walnuss', v: [1, 2, 3],
    fact: 'Dünne Holzwände trennen in der Walnuss die Kernhälften voneinander.',
    desc: x => `Die inneren Trennwände sind so weich wie die grüne Hülle und kosten auch nur so viel Ausdauer` + (x > 1 ? `, dazu ×${x} Nussholz aus den Wänden.` : '.'),
    ic: '<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16" stroke-dasharray="2 2.2"/>' },
  { id: 'kraehe', w: 2, name: 'Krähenwurf', where: 'Walnuss', v: [2, 3, 4],
    fact: 'Krähen lassen Walnüsse aus der Luft auf Straßen fallen, damit die Schale platzt.',
    desc: x => `Beim ersten Biss in die Holzschale springen ${x} Risse durch die Schale. Risse sind weich.`,
    ic: '<path d="M5 19C8 10 13 5 20 4c-1 7-6 12-15 15Z"/><path d="M5 19l8-8M10 11h3M12.5 8.5h3"/>' },
  { id: 'nussknacker', w: 2, name: 'Nussknacker', where: 'alle', v: [3, 4, 5],
    fact: 'Der Nussknacker aus dem Erzgebirge knackt Nüsse mit seinem Hebel-Kiefer.',
    desc: x => `Der erste Biss in die Schale (Walnuss: Holzschale) trifft in jedem Run mit ${x}-facher Bisskraft.`,
    ic: '<rect x="8" y="3" width="8" height="5" rx="1"/><path d="M7 8h10v5H7ZM9.5 13v3h5v-3M9 16v5M15 16v5"/>' },
  // --- Pflaume ---
  { id: 'hauszwetschge', w: 3, name: 'Hauszwetschge', yield: true, where: 'Pflaume', v: [0.15, 0.25, 0.35],
    fact: 'Die Hauszwetschge ist die klassische Backpflaume für den Zwetschgenkuchen.',
    desc: x => `+${pctS(x)} Pflaumenmus.`,
    ic: '<ellipse cx="12" cy="13" rx="6" ry="8"/><path d="M12 5c-1.5 3-1.5 13 0 16M12 5c1-1.5 2.5-2.2 4-2.2"/>' },
  { id: 'sorbit', w: 3, name: 'Sorbit', where: 'Darm', v: [1, 2, 3],
    fact: 'Pflaumen enthalten Sorbit. Der Zuckeralkohol zieht Wasser in den Darm und wirkt abführend.',
    desc: x => `${x === 1 ? 'Jeder zweite' : x === 2 ? 'Zwei von drei' : 'Jeder'} Pflaumen-Brocken läuft ein zweites Mal durch den Darm und sammelt weiter Punkte. Gezählt wird erst am zweiten Ausgang.`,
    ic: '<path d="M5 12a7 7 0 1 0 2-5"/><path d="M4 3.5V8h4.5"/>' },
  { id: 'doerr', w: 3, name: 'Dörrpflaume', where: 'Pflaume', v: [[0.1, 1.3], [0.15, 1.4], [0.2, 1.5]],
    fact: 'Beim Trocknen verliert die Pflaume viel Wasser. Der Zucker bleibt und ist dann konzentriert.',
    desc: x => `${pctS(x[0])} der Pflaumen sind Dörrpflaumen (statt einer Sonderstelle): dunkler, schrumpelig, 20 % kleiner und ×${fmt(x[1])} Ertrag je Pixel.`,
    ic: '<path d="M6 7c2-3 10-3 12 0s2 8 0 11-10 3-12 0-2-8 0-11Z"/><path d="M9.5 7.5c1 2-1 3 0 5s-1 3 0 4.5M13.5 7c1 2-1 4 0 6s-1 3 0 4"/>' },
  { id: 'wachsreif', w: 3, name: 'Wachsreif', where: 'alle', v: [0.04, 0.06, 0.08],
    fact: 'Der weißliche Belag auf Pflaumen ist eine natürliche Wachsschicht. Sie lässt sich abwischen.',
    desc: x => `Die Außenschicht, die der Raupenkörper streift, wird alle 0,3 s um ${pctS(x)} weicher (bis auf ein Viertel).`,
    ic: '<ellipse cx="12" cy="12" rx="7" ry="8.5"/><path d="M8.5 9h.01M10.5 6.8h.01M9 12.5h.01M7.5 15h.01M11.5 10h.01"/>' },
  { id: 'gaerung', w: 3, name: 'Gärung', where: 'alle', v: [1.5, 1.75, 2],
    fact: 'Hefen vergären den Zucker reifer Pflaumen. Aus der Maische wird Most und Schnaps.',
    desc: x => `Faulstellen bringen ×${fmt(x)} Ertrag.`,
    ic: '<path d="M7 21h10l-1-11H8Z"/><circle cx="10" cy="6" r="1.5"/><circle cx="14.5" cy="4" r="1"/><circle cx="13.5" cy="8" r="1"/>' },
  // --- Apfel ---
  { id: 'streuobst', w: 4, name: 'Streuobstwiese', yield: true, where: 'Apfel', v: [0.15, 0.25, 0.35],
    fact: 'Auf Streuobstwiesen stehen hohe Obstbäume verstreut, oft mit alten Apfelsorten.',
    desc: x => `+${pctS(x)} Apfelsaft.`,
    ic: '<circle cx="12" cy="9" r="6"/><path d="M12 15v6M8 21h8"/><circle cx="10" cy="8" r=".9"/><circle cx="14" cy="10.5" r=".9"/>' },
  { id: 'apfelwickler', w: 4, name: 'Apfelwickler', where: 'Apfel', v: [1, 2, 3],
    fact: 'Die Raupe des Apfelwicklers ist „der Wurm im Apfel". Sie frisst sich bis zum Kerngehäuse.',
    desc: x => x === 1 ? 'Ein Gang führt von einer zufälligen Stelle der Schale bis ans Kerngehäuse.'
      : x === 2 ? 'Ein breiter Gang führt von einer zufälligen Stelle der Schale bis ans Kerngehäuse.'
      : 'Zwei breite Gänge führen von der Schale bis ans Kerngehäuse.',
    ic: '<path d="M3 15c2-4 4-4 5 0s3 4 5 0 3-4 5 0"/><circle cx="20.3" cy="14" r="1.6"/>' },
  { id: 'ethylen', w: 4, name: 'Ethylen', where: 'alle', v: [0.15, 0.2, 0.25],
    fact: 'Äpfel geben das Reifegas Ethylen ab. Anderes Obst daneben reift dadurch schneller.',
    desc: x => `${pctS(x)} der Früchte sind überreif: weicheres Fruchtfleisch mit ×1,3 Ertrag und ein paar Öffnungen in der Schale.`,
    ic: '<path d="M12 7c-3-2-7 0-7 5 0 4 3 8 7 8s7-4 7-8c0-5-4-7-7-5Z"/><path d="M12 7c0-2 1-3 2.5-4"/><path d="M18.5 3c1 1 1 2 0 3M21 2c1.5 1.5 1.5 3.5 0 5"/>' },
  { id: 'mehlig', w: 4, name: 'Mehlig', where: 'alle', v: [0.3, 0.4, 0.5],
    fact: 'In mehligen Äpfeln lösen sich die Zellen voneinander. Das Fruchtfleisch zerfällt leicht.',
    desc: x => `Bisse ins weiche Material reichen ${pctS(x)} weiter und reißen größere Brocken heraus.`,
    ic: '<circle cx="7" cy="8" r="2"/><circle cx="15" cy="7" r="1.5"/><circle cx="11" cy="14" r="2.5"/><circle cx="18" cy="15" r="1.5"/><circle cx="6" cy="17.5" r="1"/>' },
  { id: 'glasig', w: 4, name: 'Glasigkeit', where: 'Apfel', v: [0.5, 0.75, 1],
    fact: 'Bei Glasigkeit sammelt sich Zuckersaft zwischen den Zellen. Die Stellen werden durchscheinend und schmecken süß.',
    desc: x => `Zuckerkristalle im Apfel sind ${pctS(x)} größer.`,
    ic: '<path d="M12 2l3.5 6L12 21 8.5 8Z"/><path d="M8.5 8h7M6.5 10 3 14l4.5 5M17.5 10l3.5 4-4.5 5"/>' },
  // --- Kürbis ---
  { id: 'riesenkuerbis', w: 5, name: 'Riesenkürbis', yield: true, where: 'Kürbis', v: [0.15, 0.25, 0.35],
    fact: 'Rekordkürbisse wiegen über 1.200 Kilogramm.',
    desc: x => `+${pctS(x)} Kürbismus.`,
    ic: '<path d="M12 7c-5 0-8 3-8 7s3 6 8 6 8-2 8-6-3-7-8-7Z"/><path d="M12 7c-2 3-2 10 0 13M12 7c2 3 2 10 0 13M12 7V4"/>' },
  { id: 'halloween', w: 5, name: 'Halloween-Kürbis', where: 'Kürbis', v: [4, 3, 2],
    fact: 'Zu Halloween schnitzt man Fratzen in ausgehöhlte Kürbisse und stellt ein Licht hinein.',
    desc: x => `Jeder ${x}. Kürbis hat eine Fratze: zwei Augen und ein Mund als Löcher in der Schale.`,
    ic: '<circle cx="12" cy="12" r="9"/><path d="M7.5 9.5 9.3 7l1.7 2.5ZM13 9.5 14.7 7l1.8 2.5Z"/><path d="M6.8 13.5c2 3.5 8.4 3.5 10.4 0l-2.1 1.2-1.6-1.2-1.5 1.2-1.6-1.2-1.5 1.2Z"/>' },
  { id: 'lagerkuerbis', w: 5, name: 'Lagerkürbis', where: 'alle', v: [1, 2, 99],
    fact: 'Kürbisse mit harter Schale halten sich kühl und trocken gelagert monatelang.',
    desc: x => `Eine funkelnde Stelle, die du nicht erreichst, bleibt ${x === 1 ? 'für den nächsten Run' : x === 2 ? 'für die nächsten zwei Runs' : 'bis zum Fund'} in dieser Welt erhalten.`,
    ic: '<rect x="3" y="9" width="18" height="11.5" rx="1.5"/><path d="M3 13h18M3 17h18M8 9c0-3.5 8-3.5 8 0"/>' },
  { id: 'ranke', w: 5, name: 'Ranke', where: 'alle', v: [0.5, 0.75, 1],
    fact: 'Kürbisse klettern und halten sich mit Ranken fest, die sich um alles wickeln.',
    desc: x => `Schub reicht ${pctS(x)} weiter. Wirkt nur mit Schub.`,
    ic: '<path d="M4 20.5c4-1 6-4 6-8a4 4 0 1 1 4 4 2 2 0 1 1-2-2"/>' },
  { id: 'suppe', w: 5, name: 'Kürbissuppe', where: 'Darm', v: [7, 8, 9],
    fact: 'Ein Herbstklassiker, gern mit gerösteten Kürbiskernen obendrauf.',
    desc: x => `Im Darm platzen Kürbis-Brocken in ${x} statt 5 Kerne, jeder Kern zählt so viel wie vorher.`,
    ic: '<path d="M3 11h18a9 9 0 0 1-18 0Z"/><path d="M9 7.5c0-1.5 1-1.5 1-3.2M14 7.5c0-1.5 1-1.5 1-3.2"/>' },
];
const FU = Object.fromEntries(FUND.map(f => [f.id, f]));
const fl = id => (save.fund && save.fund[id]) || 0;                  // Stufe 0–3
const fv = id => { const l = fl(id); return l ? FU[id].v[l - 1] : 0; };
const fundsOf = w => FUND.filter(f => f.w === w);
const fundCount = () => FUND.filter(f => fl(f.id)).length;
const fundYield = w => { const f = FUND.find(f => f.w === w && f.yield); return 1 + (f ? fv(f.id) : 0); };
const fundCost = f => { const l = fl(f.id); return l && l < 3 ? FUND_COST[f.w] * (l === 1 ? 1 : 3) : 0; };
const fundIcon = (f, cls = 'si') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${f.ic}</svg>`;
const runCount = () => save.runs.reduce((a, b) => a + b, 0);
function johannistag(){                                              // ist der kommende Run ein Johannistag?
  const l = fl('johannistag');
  return !!l && (runCount() + 1) % FU.johannistag.v[l - 1] === 0;
}

/* ---------- Fundstelle in der Frucht ---------- */
/* Welches Fundstück liegt in dieser Frucht? null = keins. Gezogen aus den noch fehlenden der Welt. */
function fundPlan(){
  const force = adm.on ? adm.fund : '';
  if (force === 'none') return null;
  const miss = fundsOf(WI).filter(f => !fl(f.id));
  if (!miss.length) return null;
  const keep = save.fundKeep && save.fundKeep[WI];
  if (keep && miss.some(f => f.id === keep.id)) return { id: keep.id, kept: true };
  const first = !fundCount() && WI === 0 && save.runs[0] + 1 >= FUND_FIRST_RUN;
  if (!(first || force === 'always' || Math.random() < FUND_CHANCE * (johannistag() ? 2 : 1))) return null;
  return { id: miss[Math.floor(Math.random() * miss.length)].id, first };
}
/* Stelle setzen: im Fruchtfleisch (Walnuss: im Nusskern), ganz von dieser Schicht umgeben.
   Das erste Fundstück liegt auf der Seite, von der die Raupe kommt. Die Pixel bekommen einen goldenen Schimmer. */
function fundPlace(plan){
  if (!plan) return null;
  const k = W.id === 'walnuss' ? 3 : 2, r = Math.max(2.4, R * 0.032);
  for (let t = 0; t < 800; t++){
    let a = Math.random() * 6.283, d = R * (0.12 + Math.random() * 0.8);
    if (plan.first && t < 400){ a = Math.PI + (Math.random() - 0.5) * 1.3; d = R * (0.5 + Math.random() * 0.3); }
    const x = Math.floor(CX + Math.cos(a) * d) + 0.5, y = Math.floor(CY + Math.sin(a) * d) + 0.5;
    const i = Math.floor(y) * SIM + Math.floor(x);
    if (type[i] !== k) continue;
    let ok = true;
    disc(x, y, r + 1.5, j => { if (type[j] !== k) ok = false; });
    if (!ok) continue;
    disc(x, y, r * 1.7, (j, dx, dy, dd) => mixCol(j, [255, 222, 120], 0.6 * (1 - dd / (r * 1.7))));
    return { id: plan.id, kept: !!plan.kept, x, y, i, r, got: false, ph: Math.random() * 6 };
  }
  return null;
}
/* Jeden Schritt: Ist die Mitte der Stelle weg, ist das Fundstück eingesammelt */
function fundStep(){
  const F = run.fund;
  if (!F || F.got || type[F.i]) return;
  F.got = true;
  pop(F.x, F.y - 10, 'Fundstück!');
  AU.sfx('fund');
  if (!reduceMotion) shake = Math.max(shake, 2);
}
function drawFund(){
  const F = run.fund;
  if (!F || F.got) return;
  const t = performance.now() / 1000, X = F.x * SC, Y = F.y * SC, rr = Math.max(15, F.r * SC * 1.5);
  const g = ctx.createRadialGradient(X, Y, 0, X, Y, rr * 2.4);
  g.addColorStop(0, `rgba(255,240,170,${0.75 + 0.2 * Math.sin(t * 3 + F.ph)})`); g.addColorStop(0.45, 'rgba(255,214,90,0.35)'); g.addColorStop(1, 'rgba(255,214,90,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, Y, rr * 2.4, 0, 6.283); ctx.fill();
  for (let s = 0; s < 3; s++){
    const ph = F.ph + s * 2.09 + t * 0.6, a = Math.max(0, Math.sin(t * 2.6 + s * 2.1));
    star(X + Math.cos(ph) * rr * 0.8, Y + Math.sin(ph) * rr * 0.8, rr * (0.45 + 0.6 * a), 0.35 + 0.65 * a);
  }
  star(X, Y, rr * (0.95 + 0.2 * Math.sin(t * 4)), 1);
}
/* Run-Ende: Fund gutschreiben (wird im Ergebnis-Fenster enthüllt) oder mit dem Lagerkürbis für später merken */
function fundEnd(){
  const F = run.fund;
  if (!F) return null;
  save.fund = save.fund || {}; save.fundKeep = save.fundKeep || {};
  if (F.got){
    save.fund[F.id] = 1;
    save.fundNew = (save.fundNew || []).concat(F.id);
    delete save.fundKeep[WI];
    return { got: F.id };
  }
  const l = fl('lagerkuerbis'), K = save.fundKeep[WI];
  const left = F.kept && K && K.id === F.id ? K.left - 1 : l ? FU.lagerkuerbis.v[l - 1] : 0;
  if (left > 0) save.fundKeep[WI] = { id: F.id, left }; else delete save.fundKeep[WI];
  return { missed: true, kept: left > 0 };
}
function fundRevealHtml(L){
  if (!L.fund) return '';
  if (L.fund.missed) return `<div class="fundrev miss"><b>Funkelnde Stelle verpasst.</b> <span class="note">${L.fund.kept ? 'Der Lagerkürbis hält sie für den nächsten Run frisch.' : 'Sie ist mit der Frucht verloren.'}</span></div>`;
  const f = FU[L.fund.got];
  return `<div class="fundrev"><div class="frhead">${fundIcon(f, 'fri')}<div><small>Fundstück · ${WORLDS[f.w].name}</small><b>${f.name}</b></div></div>
    <p>${f.desc(f.v[0], 1)}</p><p class="note">${f.fact}</p><p class="note">Liegt jetzt im Setzkasten.</p></div>`;
}

/* ---------- Frucht-Zustände: Dörrpflaume, überreif (Ethylen), Halloween-Kürbis ---------- */
function fruitMods(){
  const force = adm.on ? adm.fruit : '';
  const m = { dry: false, ripe: false, face: false, johannis: johannistag() };
  const dl = fl('doerr');
  if (W.id === 'pflaume' && (force === 'dry' || (!force && dl && Math.random() < FU.doerr.v[dl - 1][0]))) m.dry = true;
  else if (force === 'ripe' || (!force && fl('ethylen') && Math.random() < fv('ethylen'))) m.ripe = true;
  const hl = fl('halloween');
  if (W.id === 'kuerbis' && (force === 'face' || (!force && hl && (save.runs[WI] + 1) % FU.halloween.v[hl - 1] === 0))) m.face = true;
  m.ym = m.dry ? FU.doerr.v[Math.max(0, dl - 1)][1] : 1;              // Ertrag je Pixel
  return m;
}
const killPx = i => { totals[type[i]]--; type[i] = 0; };              // Pixel vor dem Run entfernen (zählt nicht als gefressen)
const emptyNb = i => !type[i - 1] || !type[i + 1] || !type[i - SIM] || !type[i + SIM];
/* Dörrpflaume: dunkler, bräunlicher, mit Falten und schrumpeligem Rand */
function dryFruit(){
  const s = Math.random() * 50, q = 78 / R;
  for (let i = 0; i < N; i++){
    if (!type[i]) continue;
    const x = i % SIM, y = i / SIM | 0, n1 = noise(x * q * 0.8, y * q * 0.6, s), n2 = noise(x * q * 1.7 + 40, y * q * 1.4, s + 7);
    const v = n1 * 5 + n2 * 2, fold = Math.max(0, 1 - Math.abs(v - Math.floor(v) - 0.5) / 0.09);   // Falten: Höhenlinien eines weichen Rauschens
    for (let c = 0; c < 3; c++) col[i*3+c] = col[i*3+c] * 0.55 * (1 - 0.32 * fold) + [46, 18, 30][c] * 0.28;
  }
  for (let pass = 0; pass < 3; pass++){                              // Rand schrumpeln: Haut an Falten abtragen
    const cut = [];
    for (let i = SIM; i < N - SIM; i++){
      if (type[i] !== 1 || !emptyNb(i)) continue;
      const x = i % SIM, y = i / SIM | 0;
      if (noise(x * q * 2.6, y * q * 2.9, s + 3) > 0.62 - pass * 0.03) cut.push(i);
    }
    cut.forEach(killPx);
  }
}
/* Überreif: Fruchtfleisch weicher (Härte ×0,6), etwas dunkler, Flecken auf der Schale, ein paar Öffnungen */
function ripeFruit(){
  const s = Math.random() * 50, q = 78 / R;
  for (let i = 0; i < N; i++){
    const k = type[i]; if (!k) continue;
    const L = W.layers[k], x = i % SIM, y = i / SIM | 0;
    if (L.juicy){ hp[i] *= 0.6; hpMax[i] *= 0.6; mixCol(i, [170, 96, 30], 0.18); }
    else if (k === 1 && Math.pow(noise(x * q * 2.2, y * q * 2.4, s), 5) > 0.42) mixCol(i, [92, 58, 26], 0.5);
  }
  const n = 3 + Math.floor(Math.random() * 3);
  for (let h = 0; h < n; h++){
    const a = Math.random() * 6.283 + h * 1.9, x = CX + Math.cos(a) * R * 0.97, y = CY + Math.sin(a) * R * 0.97;
    disc(x, y, R * 0.065, i => { if (type[i] === 1) killPx(i); });
  }
}
/* Apfelwickler: Gang von der Schale bis ans Kerngehäuse (Stufe 2 breiter, Stufe 3 zwei Gänge), Ränder braun vom Fraß */
function wormTunnels(){
  const l = fl('apfelwickler');
  const tr = Math.max(2.5, headR() * 1.1) * (l >= 2 ? 1.4 : 1);
  const a0 = Math.random() * 6.283;
  for (let g = 0; g < (l >= 3 ? 2 : 1); g++){
    let a = a0 + g * (2.4 + Math.random()), x = CX + Math.cos(a) * R * 1.05, y = CY + Math.sin(a) * R * 1.05;
    let dir = a + Math.PI, wig = Math.random() * 6;
    for (let st = 0; st < R * 2; st++){
      const want = Math.atan2(CY - y, CX - x);
      dir = want + 0.55 * Math.sin(st * 0.05 + wig);
      x += Math.cos(dir); y += Math.sin(dir);
      let core = false;
      disc(x, y, tr + 2, (i, dx, dy, dd) => {
        const k = type[i];
        if (k >= 3) { if (dd < tr) core = true; return; }
        if (dd < tr) killPx(i); else if (k === 2) mixCol(i, [128, 84, 36], 0.55);
      });
      if (core) break;
    }
  }
}
/* Halloween-Kürbis: Fratze wie bei einer Laterne, quer durch die Frucht geschnitten. Zwei Dreiecksaugen, eine kleine Nase und
   ein breites Grinsen mit Zähnen, dessen Mundwinkel die Schale durchbrechen (zwei Eingänge). Hinter der Frucht leuchtet ein
   Kerzenschein (drawBehind), die Schnittkanten glühen. */
function carveFace(){
  const holes = [];
  const tri = (u, v, ax, ay, bx, by, cx, cy) => {                    // Punkt im Dreieck?
    const s1 = (bx - ax) * (v - ay) - (by - ay) * (u - ax), s2 = (cx - bx) * (v - by) - (cy - by) * (u - bx), s3 = (ax - cx) * (v - cy) - (ay - cy) * (u - cx);
    return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
  };
  for (let i = 0; i < N; i++){
    if (!type[i]) continue;
    const u = (i % SIM + 0.5 - CX) / R, v = ((i / SIM | 0) + 0.5 - CY) / R;
    const eye = tri(Math.abs(u), v, 0.2, 0.02, 0.66, 0.02, 0.43, -0.42);
    const nose = tri(u, v, -0.09, 0.2, 0.09, 0.2, 0, 0.06);
    let mouth = false;
    if (Math.abs(u) < 0.95){                                         // Grinsen: Mitte der Bahn steigt zu den Winkeln an
      const c = 0.64 - 0.2 * u * u, hh = 0.13 - 0.065 * u * u;
      const toothT = Math.abs(Math.abs(u) - 0.3) < 0.07 ? 0.075 : 0, toothB = Math.abs(u) < 0.08 ? 0.075 : 0;
      mouth = v > c - hh + toothT && v < c + hh - toothB;
    }
    if (eye || nose || mouth) holes.push(i);
  }
  holes.forEach(killPx);
  for (const i of holes) for (const j of [i - 1, i + 1, i - SIM, i + SIM, i - 2, i + 2, i - 2 * SIM, i + 2 * SIM]) if (j >= 0 && j < N && type[j]) mixCol(j, [255, 214, 100], 0.5);
}
/* Hinter der Frucht: beim Halloween-Kürbis ein Kerzenschein, der durch Fratze und Hohlraum leuchtet */
function drawBehind(){
  if (!run.mods || !run.mods.face) return;
  const t = performance.now() / 1000, f = 0.94 + 0.04 * Math.sin(t * 9) + 0.02 * Math.sin(t * 23);   // Kerze flackert
  const X = CX * SC, Y = CY * SC, rr = R * SC;
  const g = ctx.createRadialGradient(X, Y, 0, X, Y, rr * 1.02);
  g.addColorStop(0, `rgb(255,${236 * f | 0},${150 * f | 0})`); g.addColorStop(0.5, `rgb(255,${200 * f | 0},${84 * f | 0})`); g.addColorStop(1, 'rgb(214,118,30)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, Y, rr * 1.02, 0, 6.283); ctx.fill();
}
/* Krähenwurf: Beim ersten Biss in die Holzschale springen Risse von dort durch die Schale. Risspixel sind weich. */
function crackShell(i0){
  run.cracked = true;
  const n = fv('kraehe'), x0 = i0 % SIM + 0.5, y0 = (i0 / SIM | 0) + 0.5;
  const inward = Math.atan2(CY - y0, CX - x0), w = Math.max(1.1, R * 0.011), Hs = W.layers[2].hp;
  for (let c = 0; c < n; c++){
    let a = inward + (n > 1 ? (c / (n - 1) - 0.5) * 2.6 : 0) + (Math.random() - 0.5) * 0.3, x = x0, y = y0;
    for (let s = 0; s < R * 0.7; s += 0.7){
      a += (Math.random() - 0.5) * 0.45;
      x += Math.cos(a) * 0.7; y += Math.sin(a) * 0.7;
      let any = false;
      disc(x, y, w, j => {
        if (type[j] !== 2) return;
        any = true;
        if (hpMax[j] > Hs * 0.5){ hpMax[j] = W.layers[1].hp * 1.2; hp[j] = Math.min(hp[j], hpMax[j]); mixCol(j, [44, 28, 14], 0.65); shade(j); }
      });
      if (!any && s > 4) break;
    }
  }
  pop(x0, y0 - 10, 'Knacks!'); AU.sfx('knack');
  if (!reduceMotion) shake = Math.max(shake, 2.5);
}
/* Scheidewand: in der Walnuss eine eigene Schicht "Trennwand" (so weich wie die Hülle), nur solange das Fundstück da ist */
function wallLayer(){
  const Wn = WORLDS[2];
  if (fl('scheidewand')) Wn.layers[5] = { name: 'Trennwand', hp: Wn.layers[1].hp, cost: Wn.layers[1].cost, f: Wn.layers[2].f * fv('scheidewand'),
    sw: '#B08A58', note: 'weich dank Scheidewand', snd: 'wood' };
  else delete Wn.layers[5];
}
/* Weich gemachte harte Pixel (Risse): kosten wie die Außenschicht und nehmen Kraft aus jeder Schicht an */
const softPx = (i, k) => W.layers[k].hard && hpMax[i] < W.layers[k].hp * 0.5;
function pxCost(i, k){
  const L = W.layers[k];
  if (softPx(i, k)) return Math.min(L.cost, W.layers[1].cost);
  let c = L.cost * (L.hard ? S.hardMult : 1);
  if (L.k && fl('kernkissen')) c *= 1 - fv('kernkissen');
  return c;
}
/* Wachsreif: Außenschicht, die der Körper streift, wird weicher */
function waxStep(dt){
  run.waxT = (run.waxT || 0) - dt;
  if (run.waxT > 0) return;
  run.waxT = 0.3;
  const x = fv('wachsreif'), m = meter('Wachsreif'), segs = segments();
  for (let j = 1; j < segs.length; j++){
    const s = segs[j];
    disc(s.x, s.y, s.r + 1.2 * catGrow(), i => {
      if (type[i] !== 1) return;
      const floor = hpMax[i] * 0.25;
      if (hp[i] <= floor) return;
      const nh = Math.max(floor, hp[i] - hpMax[i] * x);
      m.dmg += hp[i] - nh; hp[i] = nh; shade(i);
    });
  }
}
/* Einblendungen beim Start eines Runs (Sonderstellen, Fruchtzustand, Johannistag) */
function startBanner(){
  const b = [];
  if (SP.def) b.push(`${MASC(W.name) ? 'Dieser' : 'Diese'} ${W.name} hat ${SP.def.plural}`);
  if (run.mods.dry) b.push('Eine Dörrpflaume: kleiner, aber süßer');
  if (run.mods.ripe) b.push(`Überreif: weiches Fruchtfleisch, mehr Ertrag`);
  if (run.mods.face) b.push('Ein Halloween-Kürbis!');
  if (run.mods.johannis) b.push('Johannistag: doppelte Fundchance');
  if (run.fund && run.fund.kept) b.push('Die funkelnde Stelle ist noch da');
  return b;
}
/* Ertrag je Pixel einer Schicht in diesem Run: Dörrpflaume (alles), überreif (saftige Schichten ×1,3) */
const pxYield = k => (run.mods ? run.mods.ym : 1) * (run.mods && run.mods.ripe && W.layers[k] && W.layers[k].juicy ? 1.3 : 1);
