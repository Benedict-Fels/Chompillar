'use strict';
/* =====================================================================
   Setzkasten-Seite (Stufe 22): Holzkasten mit einer Reihe je Welt und fünf Fächern.
   Gefundene Fundstücke zeigen Icon, Name und Stufe, leere Fächer ein "?". Rechts die Karte des
   gewählten Fachs: Wirkung, echter Fakt, wo es wirkt, Veredeln mit der Kernwährung der Welt.
   ===================================================================== */
let boxSel = null;                                          // id eines Fundstücks oder 'w,j' für ein leeres Fach
let boxNew = [];                                            // beim Öffnen frisch gefundene (Markierung "neu")
const MASC = n => n === 'Apfel' || n === 'Kürbis';           // der Apfel, der Kürbis; sonst die
const inDer = n => (MASC(n) ? 'im ' : 'in der ') + n, inEiner = n => (MASC(n) ? 'in einem ' : 'in einer ') + n;
const WHERE = f => f.where === 'alle' ? 'in allen Früchten' : f.where === 'Darm' ? 'im Darm' : 'nur ' + inDer(f.where);
const pips = l => '●'.repeat(l) + '○'.repeat(3 - l);

function renderBox(){
  if (save.fundNew && save.fundNew.length){                 // neue Funde einmal hervorheben, dann gelten sie als gesehen
    boxNew = save.fundNew.slice(); save.fundNew = []; persist();
    boxSel = boxNew[boxNew.length - 1];
  }
  if (!boxSel){ const f = FUND.find(x => fl(x.id)); boxSel = f ? f.id : '0,0'; }
  let h = '';
  WORLDS.forEach((w, wi) => {
    const list = fundsOf(wi), open = wi < save.unlocked, have = list.filter(f => fl(f.id)).length;
    h += `<div class="krow${open ? '' : ' locked'}"><div class="klabel"><b>${icon(wi, 'f')}${w.name}</b><small>${open ? `${have} / ${list.length}` : 'noch nicht frei'}</small></div><div class="kfaecher">`;
    list.forEach((f, j) => {
      const l = fl(f.id);
      if (l) h += `<button class="fach has${boxSel === f.id ? ' sel' : ''}${boxNew.includes(f.id) ? ' neu' : ''}" data-fach="${f.id}" title="${f.name}">${fundIcon(f, 'fi')}<span class="fname">${f.name}</span><span class="pips" aria-label="Stufe ${l} von 3">${pips(l)}</span></button>`;
      else h += `<button class="fach empty${boxSel === wi + ',' + j ? ' sel' : ''}" data-fach="${wi},${j}" aria-label="Leeres Fach">?</button>`;
    });
    h += `</div></div>`;
  });
  $('kasten').innerHTML = h;
  for (const b of $('kasten').querySelectorAll('[data-fach]')) b.onclick = () => { boxSel = b.dataset.fach; AU.sfx('tick'); renderBox(); };
  $('bank3').innerHTML = bankHtml();
  renderFundDetail();
  renderFundInfo();
  renderTabs();
}

function renderFundDetail(){
  const f = FU[boxSel], el = $('fundDetail');
  if (!f){                                                  // leeres Fach
    const wi = +boxSel.split(',')[0], w = WORLDS[wi];
    el.innerHTML = `<div class="dcard"><div class="branch">Leeres Fach · ${w.name}</div><h3>Noch nicht gefunden</h3>
      <p>${wi < save.unlocked ? `Dieses Fundstück liegt irgendwo ${inEiner(w.name)}. Halt nach einer funkelnden Stelle Ausschau.` : `${MASC(w.name) ? 'Der' : 'Die'} ${w.name} ist noch nicht frei.`}</p></div>`;
    return;
  }
  const l = fl(f.id), w = WORLDS[f.w], c = fundCost(f), can = c && cur(f.w, 'k') >= c;
  let html = `<div class="dcard"><div class="branch">Fundstück · ${w.name}</div><h3 class="sh">${fundIcon(f)}${f.name}</h3>
    <p>${f.desc(f.v[l - 1], l)}</p>
    <p class="note">Echt: ${f.fact}</p>
    <p class="note">Wirkt ${WHERE(f)} · Stufe ${l} von 3 <span class="fpips">${pips(l)}</span></p>`;
  if (l < 3){
    html += `<p class="change"><span class="arrow">Stufe ${l + 1}:</span> <span class="next">${f.desc(f.v[l], l + 1)}</span></p>
      <button class="wide primary" id="refine" ${can ? '' : 'disabled'}>Veredeln: ${money(f.w, 'k', c)}</button>`
      + (can ? '' : `<p class="note">(fehlt: ${money(f.w, 'k', Math.ceil(c - cur(f.w, 'k')))})</p>`);
  } else html += `<p class="note">Voll veredelt.</p>`;
  el.innerHTML = html + '</div>';
  const b = $('refine');
  if (b) b.onclick = () => refine(f);
}
function refine(f){
  const c = fundCost(f);
  if (!c || cur(f.w, 'k') < c){ AU.sfx('nope'); return; }
  addCur(f.w, 'k', -c);
  save.fund[f.id] = fl(f.id) + 1;
  AU.sfx(fl(f.id) >= 3 ? 'maxed' : 'buy', fl(f.id) / 3);
  S = stats(); persist(); renderBox();
}
function renderFundInfo(){
  let t = `Jede Frucht hat mit ${pctS(FUND_CHANCE)} Chance eine funkelnde Stelle, in der Walnuss im Nusskern, sonst im Fruchtfleisch. Friss ihre Mitte frei: Am Run-Ende siehst du, was es war. Fundstücke wirken immer, ausrüsten musst du nichts.`;
  if (!fundCount()) t += ` Das erste liegt sicher in der Johannisbeere, spätestens ab dem ${FUND_FIRST_RUN}. Run.`;
  if (fl('johannistag')){
    const every = fv('johannistag'), n = runCount() + 1, wait = (every - n % every) % every;
    t += wait ? ` Nächster Johannistag in ${wait} Run${wait > 1 ? 's' : ''}.` : ' Der nächste Run ist Johannistag.';
  }
  const K = save.fundKeep || {};
  for (const w in K) t += ` Gemerkt (Lagerkürbis): eine funkelnde Stelle ${inDer(WORLDS[w].name)}.`;
  $('fundInfo').textContent = t;
}
