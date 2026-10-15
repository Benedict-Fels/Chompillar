'use strict';
/* =====================================================================
   Upgrade-Screen
   ===================================================================== */
let selected = 'kiefer';

function nodeAngle(u){ return BR[u.br] + u.off; }
function nodePos(u){
  const a = nodeAngle(u) * Math.PI / 180, r = RINGS[nodeRing(u)] || RINGS[RINGS.length - 1];
  return { x: 50 + Math.cos(a) * r, y: 50 + Math.sin(a) * r };
}
function lineFrom(u){
  if (u.parent) return nodePos(U[u.parent]);
  if (u.ab && u.idx > 0) return nodePos(U[`ab_${u.ab}_0`]);
  if (u.ab){                                               // an die Fähigkeit im Ring davor oder an die Raupe
    const prev = Object.keys(ABIL).find(id => save.abil.own[id] && save.abil.from[id] === save.abil.from[u.ab] - 1);
    return prev ? nodePos(U[`ab_${prev}_0`]) : { x: 50, y: 50 };
  }
  return { x: 50, y: 50 };
}

function buildTree(){
  const tree = $('tree');
  const root = document.createElement('div');
  root.className = 'node root';
  root.style.left = '50%'; root.style.top = '50%';
  root.title = 'Raupe';
  tree.appendChild(root);
  for (const u of UPG.filter(inTree)){
    const b = document.createElement('button');
    b.className = 'node' + (u.ab ? ' abn' : ''); b.id = 'n-' + u.id;
    b.addEventListener('click', () => {
      if (pan.moved) return;                                     // war ein Verschieben, kein Klick
      if (selected === u.id){ if (canBuy(u)) buy(u); else AU.sfx('nope'); }
      else { selected = u.id; AU.sfx('tick'); renderShop(); }
    });
    tree.appendChild(b);
  }
}

function buy(u){
  if (!canBuy(u)) return;
  const c = costOf(u);
  addCur(c.w, 'f', -c.f);
  if (c.k) addCur(c.kw, 'k', -c.k);
  save.lv[u.id] = lv(u.id) + 1;
  AU.sfx(lv(u.id) >= u.max ? 'maxed' : 'buy', lv(u.id) / u.max);
  S = stats();
  persist();
  renderShop();
}

/* Kontostand aller freigeschalteten Welten (Upgrade- und Darm-Upgrade-Seite) */
function bankHtml(){
  let bank = '';
  for (let w = 0; w < save.unlocked; w++){
    const here = w === save.world ? ' class="here"' : '';
    bank += `${icon(w, 'f')}<b${here} title="${WORLDS[w].fruitCur}">${fmtInt(cur(w, 'f'))}</b>${icon(w, 'k')}<b${here} title="${WORLDS[w].coreCur}">${fmtInt(cur(w, 'k'))}</b>`;
  }
  return bank;
}
function costHtml(c){ return money(c.w, 'f', c.f) + (c.k ? ' + ' + money(c.kw, 'k', c.k) : ''); }
function missing(c){
  const a = [];
  if (cur(c.w, 'f') < c.f) a.push(money(c.w, 'f', Math.ceil(c.f - cur(c.w, 'f'))));
  if (c.k && cur(c.kw, 'k') < c.k) a.push(money(c.kw, 'k', Math.ceil(c.k - cur(c.kw, 'k'))));
  return a.join(' + ');
}

/* Baum größer als sein Kasten: Die Fläche wächst mit den Ringen (so viel Platz wie früher bei drei Ringen),
   der Kasten zeigt einen Ausschnitt. Ziehen verschiebt, Mausrad, zwei Finger oder die Knöpfe zoomen
   (kleinste Stufe: ganzer Baum im Kasten, größte: 1,8-fach). */
const pan = { x: 0, y: 0, S: 0, base: 0, zoom: 1, down: null, moved: false, init: false, ptrs: new Map(), pinch: null };
const ZOOM_MAX = 1.8;
const treeBox = () => $('tree').parentElement;
function zoomMin(){ const b = treeBox(); return Math.min(1, Math.max(b.clientWidth, b.clientHeight) / (pan.base || 1)); }
function treeSize(v){ const box = treeBox(); return Math.round(Math.max(box.clientWidth, box.clientHeight) * Math.max(1, v / 40)); }
function placeTree(){
  const t = $('tree'), box = treeBox(), bw = box.clientWidth, bh = box.clientHeight;
  const cx = (bw - pan.S) / 2, cy = (bh - pan.S) / 2;            // kleiner als der Kasten: mittig
  pan.x = pan.S <= bw ? cx : Math.min(0, Math.max(bw - pan.S, pan.x));
  pan.y = pan.S <= bh ? cy : Math.min(0, Math.max(bh - pan.S, pan.y));
  t.style.width = pan.S + 'px';
  t.style.transform = `translate(${pan.x}px, ${pan.y}px)`;
}
function centerTreeOn(px, py){                                   // px, py in Prozent der Baumfläche
  const box = treeBox();
  pan.x = box.clientWidth / 2 - px / 100 * pan.S; pan.y = box.clientHeight / 2 - py / 100 * pan.S; placeTree();
}
function zoomAt(f, mx, my){                                      // mx, my: Punkt im Kasten, der stehen bleibt
  const z = Math.max(zoomMin(), Math.min(ZOOM_MAX, pan.zoom * f));
  if (z === pan.zoom) return;
  const rx = (mx - pan.x) / pan.S, ry = (my - pan.y) / pan.S;
  pan.zoom = z; pan.S = Math.round(pan.base * z);
  pan.x = mx - rx * pan.S; pan.y = my - ry * pan.S; placeTree();
}
{
  const box = treeBox();
  box.insertAdjacentHTML('beforeend', '<span class="treehint">Ziehen zum Verschieben, Mausrad zum Zoomen</span>'
    + '<div class="zoombtns"><button type="button" data-zoom="1.25" aria-label="Hineinzoomen">+</button><button type="button" data-zoom="0.8" aria-label="Herauszoomen">−</button></div>');
  const local = e => { const r = box.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  for (const b of box.querySelectorAll('[data-zoom]')){
    b.addEventListener('pointerdown', e => e.stopPropagation());
    b.onclick = () => zoomAt(+b.dataset.zoom, box.clientWidth / 2, box.clientHeight / 2);
  }
  box.addEventListener('wheel', e => { e.preventDefault(); const [mx, my] = local(e); zoomAt(Math.exp(-e.deltaY * 0.0015), mx, my); }, { passive: false });
  box.addEventListener('pointerdown', e => {
    pan.ptrs.set(e.pointerId, local(e));
    if (pan.ptrs.size === 2){                                      // zwei Finger: zoomen
      const [a, b] = [...pan.ptrs.values()]; pan.pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) }; pan.down = null; pan.moved = true; return;
    }
    pan.down = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, id: e.pointerId }; pan.moved = false;
  });
  box.addEventListener('pointermove', e => {
    if (pan.ptrs.has(e.pointerId)) pan.ptrs.set(e.pointerId, local(e));
    if (pan.pinch && pan.ptrs.size === 2){
      const [a, b] = [...pan.ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      zoomAt(d / pan.pinch.d, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); pan.pinch.d = d; return;
    }
    if (!pan.down) return;
    const dx = e.clientX - pan.down.x, dy = e.clientY - pan.down.y;
    if (!pan.moved && Math.hypot(dx, dy) < 6) return;
    if (!pan.moved){ pan.moved = true; box.classList.add('panning'); box.setPointerCapture(pan.down.id); }
    pan.x = pan.down.px + dx; pan.y = pan.down.py + dy; placeTree();
  });
  const up = e => { pan.ptrs.delete(e.pointerId); if (pan.ptrs.size < 2) pan.pinch = null; pan.down = null; box.classList.remove('panning'); setTimeout(() => { if (!pan.ptrs.size) pan.moved = false; }, 0); };
  box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
  addEventListener('resize', () => { if (screen === 'shop') renderTree(); });
}
function renderTree(){
  const v = RINGS[Math.min(RINGS.length - 1, save.unlocked + 1)] + 8, z = 50 / v;
  const base = treeSize(v), grew = base !== pan.base;
  pan.base = base; pan.zoom = Math.max(zoomMin(), Math.min(ZOOM_MAX, pan.zoom)); pan.S = Math.round(base * pan.zoom);
  if (!pan.init || grew){ pan.init = true; centerTreeOn(50, 50); } else placeTree();
  const svg = $('treeLines');
  svg.setAttribute('viewBox', `${50 - v} ${50 - v} ${2 * v} ${2 * v}`);
  let s = '';
  for (let w = 1; w < save.unlocked; w++){
    const ta = 121 * Math.PI / 180, tr = BANDS[w] + 1.2;
    s += `<circle class="band" cx="50" cy="50" r="${BANDS[w]}"/><text x="${50 + Math.cos(ta) * tr}" y="${50 + Math.sin(ta) * tr}" transform="rotate(31 ${50 + Math.cos(ta) * tr} ${50 + Math.sin(ta) * tr})">${WORLDS[w].name.toUpperCase()}</text>`;
  }
  for (const u of UPG.filter(inTree)){
    const b = $('n-' + u.id), vis = visible(u);
    b.hidden = !vis;
    if (!vis) continue;
    const p = nodePos(u), q = lineFrom(u), l = lv(u.id), open = unlocked(u);
    s += `<line class="${open ? 'on' : ''}${u.ab ? ' ab' : ''}" x1="${q.x}" y1="${q.y}" x2="${p.x}" y2="${p.y}"/>`;
    b.style.left = (50 + (p.x - 50) * z) + '%'; b.style.top = (50 + (p.y - 50) * z) + '%';
    b.classList.toggle('up', Math.sin(nodeAngle(u) * Math.PI / 180) < -0.3);
    b.classList.toggle('locked', !open);
    b.classList.toggle('max', l >= u.max);
    b.classList.toggle('can', canBuy(u));
    b.classList.toggle('sel', selected === u.id);
    const off = u.spKind && (save.spOff || {})[u.spKind];
    b.innerHTML = `${nodeIcon(u)}<span class="lv">${l}<small>/${u.max}</small></span>`;    // keine Namen im Baum, die Icons reichen
    b.title = `${u.name}${off ? ' (aus)' : ''}: Stufe ${l}/${u.max}`;
    b.setAttribute('aria-label', `${u.name}, Stufe ${l} von ${u.max}` + (open ? '' : ', gesperrt'));
  }
  svg.innerHTML = s;
}

function renderShop(){
  $('bank').innerHTML = bankHtml();
  $('sub').textContent = `${WORLDS[save.world].name} · Upgrades`;

  renderTree();

  if (!visible(U[selected]) || !inTree(U[selected])) selected = 'kiefer';
  const u = U[selected], l = lv(u.id), open = unlocked(u), maxed = l >= u.max;
  const c = costOf(u), wn = WORLDS[c.w].name;
  let html = `<div class="branch">${u.br} · ${wn}</div><h3 class="sh">${nodeIcon(u).replace('class="ni"', 'class="si"')}${u.name}</h3>
    <p>${u.desc}</p>
    <p class="note">Stufe ${l} von ${u.max}</p>`;
  if (!open) html += `<p class="req">Braucht ${U[u.parent].name} auf Stufe ${u.need}.</p>`;
  if (maxed) html += `<p class="change">${nodeVal(u, l)} <span class="note">(voll ausgebaut)</span></p>`;
  else {
    const a = nodeVal(u, l), b = nodeVal(u, l + 1), pre = (a.match(/^[^\d−+×]*/) || [''])[0];
    html += `<p class="change"><span class="now">${a}</span><span class="arrow">→</span><span class="next">${pre && b.startsWith(pre) ? b.slice(pre.length) : b}</span></p>`;
    if (open){
      const short = afford(c) ? '' : ` <span class="miss">(fehlt: ${missing(c)})</span>`;
      html += `<button class="wide primary" id="buyBtn" ${canBuy(u) ? '' : 'disabled'}>Kaufen: ${costHtml(c)}</button>${short ? `<p class="note">${short}</p>` : ''}`;
    }
  }
  if (u.spKind && l >= 1){                                   // Sonderstellen lassen sich ausschalten
    const off = !!(save.spOff || {})[u.spKind];
    html += `<button class="wide" id="spTog">${u.name} ${off ? 'einschalten' : 'ausschalten'}</button>`;
  }
  if (adm.on) html += `<div class="admrow"><span>Admin</span><button data-lv="0">0</button><button data-lv="-1">−1</button><button data-lv="1">+1</button><button data-lv="max">Max</button></div>`;
  $('detail').innerHTML = html;
  const st = $('spTog');
  if (st) st.onclick = () => {
    save.spOff = save.spOff || {};
    save.spOff[u.spKind] = !save.spOff[u.spKind];
    AU.sfx('tick'); S = stats(); persist(); renderShop();
  };
  const bb = $('buyBtn');
  if (bb) bb.onclick = () => buy(u);
  for (const b of $('detail').querySelectorAll('[data-lv]')) b.onclick = () => {
    const d = b.dataset.lv, now = lv(u.id);
    save.lv[u.id] = Math.max(0, Math.min(u.max, d === 'max' ? u.max : d === '0' ? 0 : now + +d));
    S = stats(); persist(); renderShop();
  };

  const L = save.last;
  if (L){
    const w = WORLDS[L.w];
    $('lastRun').innerHTML = `Letzter Run (${w.name}): ${money(L.w, 'f', L.f, '+')}` + (L.k >= 1 ? `, ${money(L.w, 'k', L.k, '+')}` : '') + (L.test ? ' <b>(Testlauf, nicht gutgeschrieben)</b>' : '') +
      `<br>${layerKeys(w).map(k => `${w.layers[k].name} ${Math.round(L.p[k] || 0)} %`).join(', ')}.`;
  } else $('lastRun').innerHTML = '';

  renderAbilities();
  renderTabs();
}

/* Reiter oben: Verdauen zeigt die Portionen im Magen, Neuer Run die gewählte Welt (Klick darauf: Welt wählen) */
function renderTabs(){
  const n = save.gut.p.length, cap = S.gutCap, w = WORLDS[save.world];
  $('tabGutN').textContent = `${n}/${cap}`;
  $('tabBoxN').textContent = `${fundCount()}/${FUND.length}`;
  $('tabBox').classList.toggle('new', !!(save.fundNew && save.fundNew.length));
  $('tabGut').classList.toggle('full', n >= cap);
  $('tabWorld').innerHTML = `<span class="dot" style="background:${w.color}"></span>${w.name} <span class="caret">▾</span>`;
  $('tabWorld').title = 'Welt wählen oder freischalten';
  const canUnlock = save.unlocked < WORLDS.length && cur(save.unlocked - 1, 'k') >= WORLDS[save.unlocked].unlockCost;
  $('tabWorld').classList.toggle('new', canUnlock);
}
function openWorlds(){ renderWorlds(); if (!$('worldDlg').open) $('worldDlg').showModal(); }


function renderWorlds(){
  let h = '';
  for (let w = 0; w < WORLDS.length; w++){
    const x = WORLDS[w];
    if (w < save.unlocked){
      const sel = w === save.world;
      h += `<div class="wrow${sel ? ' sel' : ''}"><span class="dot" style="background:${x.color}"></span>
        <span class="wname">${x.name}<small>${save.runs[w]} Runs · ${money(w, 'k', cur(w, 'k'))}</small></span>
        ${sel ? '<span class="note">gewählt</span>' : `<button data-pick="${w}">Wählen</button>`}</div>`;
    } else if (w === save.unlocked){
      const need = x.unlockCost, have = cur(w - 1, 'k');
      h += `<div class="wrow"><span class="dot" style="background:${x.color};opacity:.5"></span>
        <span class="wname">${x.name}<small>${icon(w - 1, 'k')}${fmtInt(Math.min(have, need))} / ${need} ${WORLDS[w - 1].coreCur}</small></span>
        <button class="primary" data-unlock="${w}" ${have >= need ? '' : 'disabled'}>Freischalten</button></div>`;
    } else {
      h += `<div class="wrow future"><span class="dot" style="background:${x.color}"></span><span class="wname">${x.name}<small>später</small></span></div>`;
    }
  }
  FUTURE.forEach((f, j) => {
    const txt = j === 0 && save.unlocked >= WORLDS.length ? 'folgt in der nächsten Ausbaustufe' : 'später';
    h += `<div class="wrow future"><span class="dot" style="background:${f.color}"></span><span class="wname">${f.name}<small>${txt}</small></span></div>`;
  });
  $('worlds').innerHTML = h;
  for (const b of document.querySelectorAll('[data-pick]')) b.onclick = () => { save.world = +b.dataset.pick; persist(); AU.sfx('tick'); $('worldDlg').close(); if (screen === 'shop') renderShop(); else renderTabs(); };
  for (const b of document.querySelectorAll('[data-unlock]')) b.onclick = () => { $('worldDlg').close(); if (screen !== 'shop') show('shop'); unlockWorld(+b.dataset.unlock); };
}

function unlockWorld(w){
  const need = WORLDS[w].unlockCost;   // nach dem Freischalten: Wahl einer neuen Fähigkeit (Popup), falls noch eine übrig ist
  if (w !== save.unlocked || cur(w - 1, 'k') < need) return;
  addCur(w - 1, 'k', -need);
  save.unlocked = w + 1;
  save.world = w;
  const options = drawChoices();
  save.choice = options.length ? { from: w - 1, options } : null;
  AU.sfx('unlock');
  persist();
  renderShop();
  openChoice();
}

function drawChoices(){
  const pool = Object.keys(ABIL).filter(id => !save.abil.own[id]);
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const act = shuffle(pool.filter(id => ABIL[id].kind === 'aktiv'));
  const pas = shuffle(pool.filter(id => ABIL[id].kind === 'passiv'));
  const pick = [];
  if (act.length) pick.push(act.shift());
  if (pas.length) pick.push(pas.shift());
  const rest = shuffle(act.concat(pas));
  while (pick.length < 3 && rest.length) pick.push(rest.shift());
  return shuffle(pick);
}

function openChoice(){
  const c = save.choice;
  if (!c) return;
  // Nichts mehr anzubieten (alle Fähigkeiten schon da, z. B. über den Admin-Modus): kein leeres Popup, das sich nicht schließen lässt
  c.options = (c.options || []).filter(id => ABIL[id] && !save.abil.own[id]);
  if (!c.options.length){ save.choice = null; persist(); renderShop(); return; }
  const cd = $('choiceDlg');
  $('choiceTitle').textContent = `${WORLDS[c.from].name} geschafft`;
  $('choiceNote').textContent = `Wähle eine neue Fähigkeit. Die anderen können nach einer späteren Welt wieder angeboten werden. `
    + (c.from + 1 < WORLDS.length ? `Ihre drei Ausbau-Knoten erscheinen im Baum und kosten ${WORLDS[c.from + 1].fruitCur} und ${WORLDS[c.from].coreCur}.` : '')
    + ` Die Raupe häutet sich ins Larvenstadium L${c.from + 2}: In früheren Früchten ist sie jetzt größer, in der Johannisbeere ×${fmt(Math.round(catGrow(0) * 10) / 10)}.`;
  $('choices').innerHTML = c.options.map(id => `<button class="choice" data-choose="${id}">
      <small>${ABIL[id].kind}</small><b>${ABIL[id].name}</b><span>${ABIL[id].desc([0, 0, 0])}</span>
      <span class="note">Ausbau: ${ABIL[id].nodes.map(n => n.name).join(', ')}</span></button>`).join('');
  for (const b of cd.querySelectorAll('[data-choose]')) b.onclick = () => choose(b.dataset.choose);
  if (!cd.open) cd.showModal();
}
// Die Wahl darf man wegklicken; sie bleibt offen und lässt sich in der Seitenleiste wieder öffnen

function choose(id){
  const c = save.choice;
  if (!c || !c.options.includes(id)) return;
  save.abil.own[id] = 1;
  save.abil.from[id] = c.from;
  const slot = ABIL[id].kind === 'aktiv' ? 'active' : 'passive';
  if (!save.abil[slot]) save.abil[slot] = id;
  save.choice = null;
  AU.sfx('choose');
  S = stats();
  persist();
  if ($('choiceDlg').open) $('choiceDlg').close();
  selected = `ab_${id}_0`;
  renderShop();
}

/* Fähigkeiten: zwei Plätze (aktiv, passiv) in der Seitenleiste. Ein Klick öffnet ein Fenster mit den
   freigeschalteten Fähigkeiten dieser Art; dort wird gewechselt. */
let abilOpen = null;
const kindOf = slot => slot === 'active' ? 'aktiv' : 'passiv';
function renderAbilities(){
  const A = save.abil, owned = Object.keys(A.own);
  $('slots').innerHTML = ['active', 'passive'].map(slot => {
    const id = A[slot], n = owned.filter(x => ABIL[x].kind === kindOf(slot)).length;
    return `<button class="slot${id ? ' full' : ''}" data-slot="${slot}" ${n ? '' : 'disabled'} title="${n ? 'Fähigkeit wechseln' : 'Noch keine freigeschaltet'}">
      <span class="sh">${id ? `<svg class="si" viewBox="0 0 24 24" aria-hidden="true">${UICON[id]}</svg>` : ''}<span>${slot === 'active' ? `Aktiv, alle ${S.cd} s` : 'Passiv'}<b>${id ? ABIL[id].name : 'leer'}</b></span></span>
      ${n > 1 ? `<span class="cnt">${n} ▾</span>` : ''}</button>`;
  }).join('');
  if (save.choice) $('slots').insertAdjacentHTML('afterbegin', `<button class="wide primary" id="openChoice">Neue Fähigkeit wählen</button>`);
  if ($('openChoice')) $('openChoice').onclick = () => openChoice();
  for (const b of document.querySelectorAll('[data-slot]')) b.onclick = () => openAbil(b.dataset.slot);
  if ($('abilDlg').open) renderAbilDlg();
}
function openAbil(slot){ abilOpen = slot; AU.sfx('tick'); renderAbilDlg(); if (!$('abilDlg').open) $('abilDlg').showModal(); }
function renderAbilDlg(){
  const A = save.abil, slot = abilOpen, list = Object.keys(A.own).filter(id => ABIL[id].kind === kindOf(slot));
  $('abilTitle').textContent = slot === 'active' ? `Aktive Fähigkeit (alle ${S.cd} s)` : 'Passive Fähigkeit';
  $('abils').innerHTML = list.map(id => {
    const a = ABIL[id], eq = A[slot] === id, Ls = abL(id);
    return `<div class="acard${eq ? ' eq' : ''}"><h3><span class="sh"><svg class="si" viewBox="0 0 24 24" aria-hidden="true">${UICON[id]}</svg>${a.name}</span> <small>Ausbau ${Ls.join(' / ')}</small></h3>
      <p>${a.desc(Ls)}</p>
      <div class="row">${eq ? '<span class="note">ausgerüstet</span>' : `<button class="primary" data-equip="${id}">Ausrüsten</button>`}
      <button data-show="${id}">Im Baum zeigen</button></div></div>`;
  }).join('');
  for (const b of document.querySelectorAll('[data-equip]')) b.onclick = () => {
    const id = b.dataset.equip; A[slot] = id; S = stats(); persist(); AU.sfx('tick'); $('abilDlg').close(); renderShop();
  };
  for (const b of document.querySelectorAll('[data-show]')) b.onclick = () => {
    $('abilDlg').close(); selected = `ab_${b.dataset.show}_0`; renderShop();
    const n = $('n-' + selected); if (n) centerTreeOn(parseFloat(n.style.left), parseFloat(n.style.top));
    $('tree').parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
}
