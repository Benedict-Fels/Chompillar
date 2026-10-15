'use strict';
/* =====================================================================
   Magen und Darm-Screen (Stufe 17, Physik in gut.js)
   Jeder Run legt eine Portion Nahrungsbrei in den Magen (ein fester Anteil der gefressenen
   Fruchtwährung, zusätzlich zum normalen Ertrag). Beim Verdauen wird jede Portion zu 3 Brocken,
   die als Haufen im Magensack liegen. Der Brocken am Ausgang geht per Klick durch den Schlauch
   zum Pförtner und fällt durch den Darm. Zilien und Pförtner stellt der Spieler selbst;
   die Stellung wird gespeichert (mit "Gedächtnis" eine je Frucht).
   Ertrag eines Brockens = Nährstoffe × Punkte / GUT.full × Darmflora, in der Währung seiner Welt.
   ===================================================================== */
const gcv = $('gcv'), gctx = gcv.getContext('2d');
gcv.width = GUT.W * 2; gcv.height = GUT.H * 2;
const gut = { queue: [], transit: [], balls: [], cilia: [], tube: null, pops: [], pfX: GUT.W / 2, drag: null, glide: null, pending: false, chosen: null,
  t: 0, acc: 0, auto: false, autoT: 0, active: false, finished: true, n0: 0, done: 0, got: {}, best: 0, holes: {}, hits: 0, saveT: 0, panelT: 0,
  flash: GUT.HOLES.map(() => 0) };                               // Aufleuchten der Ausgänge (richtiger Ausgang)

/* ---------- Magen (Portionen) ---------- */
const stomachFull = () => save.gut.p.length >= S.gutCap;
const stomachEmpty = () => !save.gut.p.length;
function stomachAdd(w, f, fx){                                 // liefert true, wenn eine Portion hineinpasste
  if (stomachFull() || f <= 0) return false;
  save.gut.p.push({ w, n: GUT.share * Math.max(0, f - fx), x: GUT.share * fx });
  return true;
}
// Portion → Brocken: Nährstoffe gleichmäßig verteilt (Zuckerkristalle machen die Brocken nahrhafter)
const portionBalls = p => Array.from({ length: GUT.perPortion }, () => ({ k: p.w, v: (p.n + p.x) / GUT.perPortion }));
const payout = (v, points) => v * points / GUT.full * S.gutConv;

/* ---------- Stellung (Pförtner + Zilien) ---------- */
function layoutFor(w){
  const L = save.gutLay || {};
  return gutFitLayout(S.gutMem[w] && L.per && L.per[w] ? L.per[w] : L, S.gutCilia, S.gutBile);
}
function snapshot(){
  const g = gut.tube;
  return { pf: Math.round(gut.pfX), z: gut.cilia.map(z => [Math.round(z.x), Math.round(z.y)]), g: g ? [Math.round(g.x), Math.round(g.y)] : null };
}
// Aktuelle Stellung merken: mit Gedächtnis für diese Frucht nur in ihrer eigenen Stellung, sonst in der gemeinsamen
function storeLayout(w){
  const L = save.gutLay = save.gutLay || {}, s = snapshot();
  if (w !== undefined && S.gutMem[w]){ L.per = L.per || {}; L.per[w] = s; }
  else { L.pf = s.pf; L.z = s.z; L.g = s.g; }
}
const newCilium = (x, y) => ({ x, y, fl: 0, hairs: Array.from({ length: 16 }, (_, i) => ({ a: -Math.PI / 2 + (i - 7.5) * 0.39, ph: i * 1.7 })) });
// Bewegliche Teile in fester Reihenfolge: die Zilien, dann die Gallenblase (falls eingebaut)
const movers = () => gut.tube ? gut.cilia.concat([gut.tube]) : gut.cilia;
const layoutPts = L => L.g ? L.z.concat([L.g]) : L.z;
function applyLayout(L, animate, w = gut.layW){
  const pts = layoutPts(L);
  gut.layW = w;                                                    // Frucht, deren Stellung gerade steht (für das Speichern)
  while (gut.cilia.length < L.z.length) gut.cilia.push(newCilium(L.z[gut.cilia.length][0], L.z[gut.cilia.length][1]));
  gut.cilia.length = L.z.length;
  if (L.g && !gut.tube) gut.tube = { x: L.g[0], y: L.g[1], fl: 0 };
  if (!L.g) gut.tube = null;
  if (!animate){ gut.pfX = L.pf; movers().forEach((z, i) => { z.x = pts[i][0]; z.y = pts[i][1]; }); return; }
  gut.glide = { t: 0, dur: 0.35, from: { pf: gut.pfX, z: movers().map(z => [z.x, z.y]) }, to: { pf: L.pf, z: pts } };
}
const sameLayout = L => Math.abs(L.pf - gut.pfX) < 0.5 && layoutPts(L).length === movers().length
  && layoutPts(L).every((p, i) => Math.hypot(p[0] - movers()[i].x, p[1] - movers()[i].y) < 0.5);

/* ---------- Magensack: Brocken liegen als Haufen, nur zur Anzeige ---------- */
const SX = 168, SY = 86, RX = 112, RY = 72, OUT_A = 0.75;
const OUT = { x: SX + RX * Math.cos(OUT_A), y: SY + RY * Math.sin(OUT_A) };
const STOMACH = new Path2D(); STOMACH.ellipse(SX, SY, RX, RY, 0, 0, Math.PI * 2);
const ON = (() => { const nx = Math.cos(OUT_A) / RX, ny = Math.sin(OUT_A) / RY, l = Math.hypot(nx, ny); return { x: nx / l, y: ny / l }; })();
const ESO = { x: 118, y: -14 };
function tubePt(u, px){                                         // Schlauch vom Magenausgang (u = 0) zum Pförtner (u = 1)
  const P0 = OUT, P1 = { x: OUT.x + ON.x * 26, y: OUT.y + ON.y * 26 }, P2 = { x: px, y: GUT.PF_Y - 30 }, P3 = { x: px, y: GUT.PF_Y - 4 };
  const v = 1 - u;
  return { x: v * v * v * P0.x + 3 * v * v * u * P1.x + 3 * v * u * u * P2.x + u * u * u * P3.x,
           y: v * v * v * P0.y + 3 * v * v * u * P1.y + 3 * v * u * u * P2.y + u * u * u * P3.y };
}
function sackBall(it, delay){ return { k: it.k, v: it.v, x: ESO.x + (delay * 37 % 9) - 4, y: ESO.y, vx: 0, vy: 40, wait: delay, inside: false }; }
function sackStep(dt){
  const q0 = gut.queue;
  for (const q of q0){
    if (q.wait > 0){ q.wait -= dt; continue; }
    q.vy += 650 * dt;
    q.vx += (OUT.x - q.x) * 0.9 * dt; q.vy += (OUT.y - q.y) * 0.4 * dt;   // der Magen drückt Richtung Ausgang
    q.vx *= 1 - 2.5 * dt; q.vy *= 1 - 2.5 * dt;
    q.x += q.vx * dt; q.y += q.vy * dt;
    const r = gutType(q.k).r * 0.95;
    if (q.y > SY - RY * 0.6 || q.inside){
      q.inside = true;
      const ex = (q.x - SX) / (RX - r - 3), ey = (q.y - SY) / (RY - r - 3), d = Math.hypot(ex, ey);
      if (d > 1){ q.x = SX + ex / d * (RX - r - 3); q.y = SY + ey / d * (RY - r - 3); const nx = ex / d, ny = ey / d, vn = q.vx * nx + q.vy * ny; if (vn > 0){ q.vx -= vn * nx * 1.3; q.vy -= vn * ny * 1.3; } }
    }
  }
  for (let i = 0; i < q0.length; i++) for (let j = i + 1; j < q0.length; j++){
    const A = q0[i], B = q0[j]; if (A.wait > 0 || B.wait > 0) continue;
    const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy), min = (gutType(A.k).r + gutType(B.k).r) * 0.95;
    if (d >= min || !d) continue;
    const nx = dx / d, ny = dy / d, o = (min - d) / 2;
    A.x -= nx * o; A.y -= ny * o; B.x += nx * o; B.y += ny * o;
    const vn = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny; if (vn < 0){ A.vx += vn * nx * 0.5; A.vy += vn * ny * 0.5; B.vx -= vn * nx * 0.5; B.vy -= vn * ny * 0.5; }
  }
}
function nextIdx(){                                             // der nächste Brocken ist der am Ausgang
  let best = -1, bd = 1e9;
  gut.queue.forEach((q, i) => { if (q.wait > 0 || !q.inside) return; const d = Math.hypot(q.x - OUT.x, q.y - OUT.y); if (d < bd){ bd = d; best = i; } });
  return best;
}

/* ---------- Runde öffnen und verlassen ---------- */
function openGut(){
  S = stats(); GUT.burstExtra = fl('suppe') ? fv('suppe') - 5 : 0;
  const items = save.gut.p.flatMap(portionBalls);
  for (let i = items.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
  save.gut.p = [];
  gut.queue = items.map((it, i) => sackBall(it, i * 0.1));
  gut.transit = []; gut.balls = []; gut.pops = []; gut.got = {}; gut.best = 0; gut.holes = {}; gut.hits = 0;
  gut.n0 = items.length; gut.done = 0; gut.auto = false; gut.pending = false; gut.chosen = null; gut.glide = null;
  gut.active = items.length > 0; gut.finished = !gut.active;
  const k0 = items.length ? items[0].k : save.world;
  applyLayout(layoutFor(k0), false, k0);
  persist();
  show('gut');
}
// Verlassen mitten in der Runde: Verdautes ist schon gutgeschrieben, der Rest geht als Portionen zurück in den Magen
function gutLeave(){
  if (gut.active){
    const rest = {};
    for (const b of [...gut.queue, ...gut.transit, ...gut.balls]) rest[b.k] = (rest[b.k] || 0) + b.v;
    for (const w in rest) if (rest[w] > 0.01) save.gut.p.push({ w: +w, n: rest[w], x: 0 });
    gut.queue = []; gut.transit = []; gut.balls = [];
    gut.active = false; gut.finished = true;
  }
  if (gut.drag) gut.drag = null;
  persist();
}
addEventListener('pagehide', () => { if (screen === 'gut') gutLeave(); });
function gutFinish(){ gut.active = false; gut.finished = true; AU.sfx('verdaut'); persist(); renderGutPanel(); }

/* Für Tests und die Bot-Simulation: den ganzen Magen ohne Zeichnen verdauen, mit der gespeicherten Stellung */
function digestAll(pickPf){
  S = stats(); GUT.burstExtra = fl('suppe') ? fv('suppe') - 5 : 0;
  const items = save.gut.p.flatMap(portionBalls), got = {};
  save.gut.p = [];
  for (const it of items){
    const L = layoutFor(it.k), pf = pickPf ? pickPf(it.k, L) : L.pf;
    const r = gutSimulate(it.k, pf, L.z, L.g);
    got[it.k] = (got[it.k] || 0) + payout(it.v, r.points);
  }
  for (const w in got) addCur(+w, 'f', got[w]);
  persist();
  return got;
}

/* ---------- Einwurf ---------- */
function gutDrop(){
  if (!gut.active || gut.pending || gut.drag) return false;
  const ni = nextIdx(); if (ni < 0) return false;
  const q = gut.queue[ni]; gut.chosen = q;
  if (S.gutMem.some(Boolean)){                                  // mit Gedächtnis: erst die Stellung dieser Frucht (oder die gemeinsame) einnehmen
    const L = layoutFor(q.k);
    if (!sameLayout(L)){ applyLayout(L, true, q.k); gut.pending = true; return true; }
    gut.layW = q.k;
  }
  gutRelease(); return true;
}
function gutRelease(){
  const ni = gut.chosen && gut.queue.includes(gut.chosen) ? gut.queue.indexOf(gut.chosen) : nextIdx(); gut.chosen = null;
  if (ni < 0) return;
  const q = gut.queue.splice(ni, 1)[0];
  storeLayout(q.k);                                             // die Stellung, mit der geworfen wird, merkt sich der Darm
  gut.transit.push({ k: q.k, v: q.v, u: 0, px: gut.pfX, sx: q.x, sy: q.y });
  AU.sfx('plopp');
}

/* ---------- Ablauf ---------- */
const HOLE_NAMES = { dick: 'Dickdarm', pfort: 'Pfortader', lymph: 'Lymphgefäß', blind: 'Blinddarm' };
const GUT_EV = {
  hit(b, z, gain, n){
    gut.hits++;
    gut.pops.push({ x: z.x, y: z.y - GUT.CIL_R - 12, txt: '+' + gain, col: ['#FFE08A', '#F7C873', '#E8A869'][n], life: 0.8 });
    AU.sfx('zotte', Math.min(12, b.chain * 2));
  },
  land(b, h, m, points){
    if (sorbitAgain(b)){                                      // Fundstück Sorbit: der Pflaumen-Brocken läuft noch einmal durch
      const nb = gutBall(b.k, gut.pfX); nb.v = b.v; nb.got = b.got; nb.again = true; gut.balls.push(nb);
      gut.pops.push({ x: (h.x1 + h.x2) / 2, y: GUT.FLOOR - 16, txt: 'Sorbit: nochmal!', col: '#E3D2F5', life: 1.4, big: true });
      AU.sfx('plopp');
      return;
    }
    const cash = payout(b.v, points);
    addCur(b.k, 'f', cash);
    gut.got[b.k] = (gut.got[b.k] || 0) + cash;
    gut.best = Math.max(gut.best, points); if (!b.fam || --b.fam.left === 0) gut.done++;   // Kürbis: zählt, wenn der letzte Kern unten ist
    gut.holes[h.id] = (gut.holes[h.id] || 0) + 1;
    const right = m > 1, cx = (h.x1 + h.x2) / 2;
    gut.pops.push({ x: cx, y: GUT.FLOOR - 16, txt: '+' + fmtNum(cash), cur: b.k, col: right ? '#FFE08A' : '#F1DCD2', life: 1.4, big: right });
    if (right){
      gut.flash[GUT.HOLES.indexOf(h)] = 1;
      const id = gutType(b.k).id;                              // Kürbiskerne zählen als Kürbis
      save.gutFound = save.gutFound || {};
      if (!save.gutFound[id]){
        save.gutFound[id] = h.id;
        gut.pops.push({ x: Math.min(GUT.W - 70, Math.max(70, cx)), y: GUT.FLOOR - 52, txt: 'Entdeckt!', col: '#FFF4E0', life: 2.2, big: true, huge: true });
        AU.sfx('darmrausch'); renderGutPanel(); persist();
      } else AU.sfx('blind');
    } else AU.sfx('schale', 0.5);
  },
  burst(b, kids){
    gut.pops.push({ x: b.x, y: b.y - 16, txt: 'Knack!', col: '#FFE9C2', life: 0.8 });
    AU.sfx('knack'); AU.sfx('plopp');
  },
  tubeIn(b){ if (gut.tube) gut.tube.fl = 1; AU.sfx('plopp'); },
  emul(b){
    gut.pops.push({ x: b.x, y: b.y + 16, txt: 'emulgiert', col: '#CDEB9A', life: 1 });
    AU.sfx('drop');
  },
};
/* Sorbit: jeder 2. Pflaumen-Brocken (Stufe 2: zwei von drei, Stufe 3: jeder) läuft ein zweites Mal durch, fest gezählt */
function sorbitAgain(b){
  const l = fl('sorbit');
  if (!l || b.again || b.T.id !== 'pflaume') return false;
  const c = save.sorbitN = (save.sorbitN || 0) + 1;
  return l >= 3 || (l === 2 ? c % 3 !== 0 : c % 2 === 0);
}
/* Nusstinte: Fallbahn des nächsten Brockens vorausrechnen (dieselbe Physik, ohne Zufall), bis zur 1. / 2. Zilie oder ganz.
   Zwischengespeichert, solange Pförtner, Zilien und Gallenblase gleich stehen. */
function inkPath(){
  const l = fl('nusstinte');
  if (!l || gut.glide || gut.pending) return null;
  const ni = nextIdx(); if (ni < 0) return null;
  const k = gut.queue[ni].k, stop = fv('nusstinte');
  const key = [k, stop, Math.round(gut.pfX), ...movers().map(z => Math.round(z.x) + ',' + Math.round(z.y))].join('|');
  if (gut.ink && gut.ink.key === key) return gut.ink.pts;
  const cil = gut.cilia.map(z => ({ x: z.x, y: z.y, fl: 0 })), tube = gut.tube ? { x: gut.tube.x, y: gut.tube.y } : null;
  const b = gutBall(k, gut.pfX), balls = [b], pts = [[b.x, b.y]];
  let hits = 0;
  const ev = { hit(){ hits++; } };
  for (let s = 0; s < 240 * 15 && !b.done; s++){
    gutStep(balls, cil, GUT.STEP, ev, tube);
    if (s % 4 === 0 || b.done) pts.push([b.x, b.y]);
    if (hits >= stop){ pts.push([b.x, b.y]); break; }
  }
  gut.ink = { key, pts };
  return pts;
}
function gutUpdate(dt){
  gut.t += dt;
  if (gut.glide){
    const gl = gut.glide; gl.t += dt; const u = Math.min(1, gl.t / gl.dur), e = u * u * (3 - 2 * u);
    gut.pfX = gl.from.pf + (gl.to.pf - gl.from.pf) * e;
    movers().forEach((z, i) => { z.x = gl.from.z[i][0] + (gl.to.z[i][0] - gl.from.z[i][0]) * e; z.y = gl.from.z[i][1] + (gl.to.z[i][1] - gl.from.z[i][1]) * e; });
    if (u >= 1){ gut.glide = null; if (gut.pending){ gut.pending = false; gutRelease(); } }
  }
  sackStep(dt);
  // Mit Gedächtnis zeigt der Darm immer die Stellung des markierten (nächsten) Brockens: Was man verschiebt, gilt für ihn
  if (S.gutMem.some(Boolean) && !gut.drag && !gut.glide && !gut.pending){
    const ni = nextIdx();
    if (ni >= 0 && gut.queue[ni].k !== gut.layW){ const k = gut.queue[ni].k, L = layoutFor(k); if (sameLayout(L)) gut.layW = k; else applyLayout(L, true, k); }
  }
  for (let i = gut.transit.length - 1; i >= 0; i--){
    const q = gut.transit[i]; q.u += dt / 0.55;
    if (q.u >= 1){ gut.transit.splice(i, 1); const b = gutBall(q.k, q.px); b.v = q.v; gut.balls.push(b); }
  }
  gutStep(gut.balls, gut.cilia, dt, GUT_EV, gut.tube);
  if (gut.tube) gut.tube.fl = Math.max(0, gut.tube.fl - dt * 2);
  for (const b of gut.balls){ b.trail.push([b.x, b.y]); if (b.trail.length > 12) b.trail.shift(); }
  gut.balls = gut.balls.filter(b => !b.done);
  for (const z of gut.cilia) z.fl = Math.max(0, z.fl - dt * 2.5);
  for (let i = 0; i < gut.flash.length; i++) gut.flash[i] = Math.max(0, gut.flash[i] - dt * 1.2);
  for (let i = gut.pops.length - 1; i >= 0; i--){ const p = gut.pops[i]; p.life -= dt; p.y -= dt * 24; if (p.life <= 0) gut.pops.splice(i, 1); }
  if (gut.auto && gut.queue.length){ gut.autoT -= dt; if (gut.autoT <= 0 && gutDrop()) gut.autoT = 0.9; }
  if (gut.active && !gut.queue.length && !gut.transit.length && !gut.balls.length && !gut.pending) gutFinish();
}
function gutFrame(dt){
  if (!modalOpen()){
    gut.acc += dt * admMul('speed');
    let n = 0;
    while (gut.acc >= GUT.STEP && n++ < 60){ gutUpdate(GUT.STEP); gut.acc -= GUT.STEP; }   // feste Schrittweite: gleicher Einwurf, gleicher Weg
    if (n >= 60) gut.acc = 0;
    gut.saveT += dt; if (gut.saveT > 2){ gut.saveT = 0; persist(); }
    gut.panelT += dt; if (gut.panelT > 0.25){ gut.panelT = 0; renderGutLive(); }
  }
  drawGut();
}

/* ---------- Zeichnen ---------- */
function drawBrocken(c, k, x, y, scale = 1, b = null){
  const T = b ? b.T : gutType(k), r = (b ? b.r : T.r) * scale;
  c.fillStyle = T.col;
  if (b && b.emul){ c.fillStyle = 'rgba(160,210,90,0.45)'; c.beginPath(); c.arc(x, y, r + 3, 0, 6.283); c.fill(); c.fillStyle = T.col; }
  if (T.id === 'oel' && !(b && b.emul)){ c.beginPath(); c.moveTo(x, y - r * 1.5); c.bezierCurveTo(x + r * 1.1, y - r * 0.4, x + r, y + r, x, y + r); c.bezierCurveTo(x - r, y + r, x - r * 1.1, y - r * 0.4, x, y - r * 1.5); c.fill(); }
  else { c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill(); }
  if (T.id === 'kirsche'){ c.strokeStyle = '#4E0514'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, r * 0.45, 0, 6.283); c.stroke(); }
  if (T.id === 'pflaume'){ c.fillStyle = 'rgba(220,214,236,0.35)'; c.beginPath(); c.arc(x, y, r, 3.6, 5.6); c.lineTo(x, y); c.fill(); }   // Wachsreif
  if (T.id === 'apfel'){ c.strokeStyle = 'rgba(150,110,40,0.5)'; c.lineWidth = 1.2; c.beginPath(); c.arc(x, y, r * 0.6, 0, 6.283); c.stroke(); }
  if (T.id === 'kuerbis'){ c.strokeStyle = '#B35A12'; c.lineWidth = 1.2; for (const o of [-0.45, 0, 0.45]){ c.beginPath(); c.ellipse(x + o * r, y, r * 0.22, r * 0.9, 0, 0, 6.283); c.stroke(); } }
  if (T.id === 'kern'){ c.strokeStyle = '#B8A57A'; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y, r * 0.95, r * 0.6, 0.5, 0, 6.283); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.arc(x - r * 0.35, y - r * 0.35, r * 0.3, 0, 6.283); c.fill();
}
function drawCilium(c, z, t){
  const R = GUT.CIL_R, hl = z === gut.drag;
  if (z.fl > 0){ c.fillStyle = `rgba(255,214,110,${0.35 * z.fl})`; c.beginPath(); c.arc(z.x, z.y, R + 14 * z.fl, 0, 6.283); c.fill(); }
  c.lineCap = 'round';
  for (const h of z.hairs){
    const sway = Math.sin(t * 3 + h.ph) * 0.12, spread = 1 + 0.35 * z.fl, a = -Math.PI / 2 + (h.a + Math.PI / 2) * spread + sway;
    const len = R + 14 + 5 * z.fl;
    const bx = z.x + Math.cos(a) * (R * 0.55), by = z.y + Math.sin(a) * (R * 0.55);
    const tx = z.x + Math.cos(a) * len, ty = z.y + Math.sin(a) * len;
    const mx = z.x + Math.cos(a + sway * 2) * len * 0.7, my = z.y + Math.sin(a + sway * 2) * len * 0.7;
    c.strokeStyle = z.fl > 0.2 ? '#F2B64A' : '#C8665A'; c.lineWidth = 3.4;
    c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(mx, my, tx, ty); c.stroke();
    c.fillStyle = z.fl > 0.2 ? '#FFE08A' : '#FBE3D8'; c.beginPath(); c.arc(tx, ty, 2.8, 0, 6.283); c.fill();
  }
  const grd = c.createRadialGradient(z.x - 5, z.y - 6, 2, z.x, z.y, R);
  grd.addColorStop(0, z.fl > 0.2 ? '#FFE9B0' : '#F6C1B2'); grd.addColorStop(1, z.fl > 0.2 ? '#E8A45A' : '#C9685C');
  c.fillStyle = grd; c.beginPath(); c.arc(z.x, z.y, R, 0, 6.283); c.fill();
  c.strokeStyle = hl ? '#FFFFFF' : 'rgba(90,30,24,0.6)'; c.lineWidth = hl ? 2.5 : 1.5; c.stroke();
}
/* Gallenblase: kleine grüne Röhre mit Öffnung oben, Galle schwappt darin */
function drawTube(c, tb, t){
  const { hw, hl } = GUT.TUBE, x = tb.x, y = tb.y, hl2 = gut.drag === 'tube';
  c.fillStyle = `rgba(160,210,90,${0.25 + 0.35 * tb.fl})`; c.beginPath(); c.roundRect(x - hw - 4, y - hl - 6, 2 * hw + 8, 2 * hl + 12, hw + 4); c.fill();
  const g = c.createLinearGradient(x - hw, 0, x + hw, 0); g.addColorStop(0, '#5E8A34'); g.addColorStop(0.45, '#A9CF6A'); g.addColorStop(1, '#4E7A2A');
  c.fillStyle = g; c.beginPath(); c.roundRect(x - hw, y - hl, 2 * hw, 2 * hl, [hw * 0.5, hw * 0.5, hw, hw]); c.fill();
  c.fillStyle = 'rgba(214,236,150,0.55)';                                   // Galle schwappt
  for (let i = 0; i < 3; i++){ const yy = y - hl + 10 + ((t * 26 + i * 17) % (2 * hl - 14)); c.beginPath(); c.ellipse(x + Math.sin(t * 2 + i) * 4, yy, 3, 2, 0, 0, 6.283); c.fill(); }
  c.fillStyle = '#2F4A1A'; c.beginPath(); c.ellipse(x, y - hl, hw - 2, 4.5, 0, 0, 6.283); c.fill();   // Öffnung
  c.strokeStyle = hl2 ? '#FFFFFF' : 'rgba(40,70,20,0.7)'; c.lineWidth = hl2 ? 2.5 : 1.5;
  c.beginPath(); c.roundRect(x - hw, y - hl, 2 * hw, 2 * hl, [hw * 0.5, hw * 0.5, hw, hw]); c.stroke();
  c.fillStyle = '#3E6420'; c.beginPath(); c.roundRect(x - 5, y + hl - 2, 10, 8, 3); c.fill();       // Ausgang
}
function drawWallHairs(c, t){                                   // Flimmerhärchen an den Wänden: Welle, die nach unten schlägt
  const { W, WALL, PF_Y, FLOOR } = GUT;
  c.lineCap = 'round';
  for (const side of [0, 1]){
    const x0 = side ? W : 0, s = side ? -1 : 1;
    c.fillStyle = '#C97567'; c.fillRect(side ? W - 5 : 0, PF_Y + 8, 5, FLOOR - PF_Y - 8);
    for (let y = PF_Y + 14; y < FLOOR - 4; y += 6){
      const ph = t * 7 - y * 0.09 + side * 1.3, beat = Math.sin(ph);
      const ang = 0.55 * beat + (beat > 0 ? 0.25 : 0), len = WALL + 4 + 2 * Math.sin(y * 0.7);
      const tx = x0 + s * Math.cos(ang) * len, ty = y + Math.sin(ang) * len, mx = x0 + s * len * 0.55, my = y + Math.sin(ang) * len * 0.3;
      c.strokeStyle = beat > 0.7 ? '#F0A597' : '#D98579'; c.lineWidth = 2.2;
      c.beginPath(); c.moveTo(x0 + s * 4, y); c.quadraticCurveTo(mx, my, tx, ty); c.stroke();
    }
  }
}
function drawBottom(c, t){
  const { W, H, FLOOR, WALL } = GUT, y0 = FLOOR, hB = H - FLOOR;
  c.fillStyle = '#3A1B16'; c.fillRect(0, y0, W, hB);
  GUT.HOLES.forEach((h, hi) => {
    const w = h.x2 - h.x1, cx = (h.x1 + h.x2) / 2;
    if (h.id === 'dick'){
      c.fillStyle = '#6B3A2E'; c.beginPath(); c.roundRect(h.x1 + 2, y0, w - 4, hB - 4, [0, 0, 10, 10]); c.fill();
      c.strokeStyle = '#8A5242'; c.lineWidth = 2; for (let x = h.x1 + 14; x < h.x2 - 6; x += 18){ c.beginPath(); c.moveTo(x, y0 + 4); c.quadraticCurveTo(x - 5, y0 + hB / 2, x, hB + y0 - 8); c.stroke(); }
    } else if (h.id === 'pfort' || h.id === 'lymph'){
      const dark = h.id === 'pfort' ? '#6E0F1E' : '#8C7420';
      c.fillStyle = dark; c.beginPath(); c.roundRect(h.x1 + 4, y0, w - 8, hB - 4, [0, 0, 18, 18]); c.fill();
      c.fillStyle = h.col; c.beginPath(); c.roundRect(h.x1 + 10, y0, w - 20, hB - 18, [0, 0, 14, 14]); c.fill();
      for (let i = 0; i < 4; i++){ const yy = y0 + ((t * 30 + i * 18) % (hB - 20)) + 6; c.fillStyle = h.id === 'pfort' ? '#E05468' : '#F6E3A0'; c.beginPath(); c.ellipse(cx + Math.sin(i * 2 + t) * 8, yy, 4, 2.6, 0, 0, 6.283); c.fill(); }
    } else if (h.id === 'blind'){
      c.fillStyle = '#8A4FB3'; c.beginPath(); c.roundRect(h.x1 + 2, y0, w - 4, 36, [0, 0, 14, 14]); c.fill();
      c.strokeStyle = '#8A4FB3'; c.lineWidth = 7; c.beginPath(); c.moveTo(cx, y0 + 30); c.bezierCurveTo(cx + 4, y0 + 56, cx - 20, y0 + 50, cx - 16, y0 + 78); c.stroke();
    }
    if (h.x1 > WALL){ c.fillStyle = '#B5645A'; c.beginPath(); c.roundRect(h.x1 - 3, FLOOR - 24, 6, 30, 3); c.fill(); }
    const fl = gut.flash[hi];                                   // richtiger Ausgang: leuchtet auf
    if (fl > 0){ c.fillStyle = `rgba(255,226,140,${0.55 * fl})`; c.beginPath(); c.roundRect(h.x1 + 2, y0 - 30 * fl, w - 4, hB + 30 * fl, 10); c.fill(); }
    c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = fl > 0.3 ? '#FFF1D6' : '#D9BFB3';
    const narrow = w < 60;
    c.font = `700 ${narrow ? 8 : 10}px "Bricolage Grotesque", system-ui, sans-serif`; c.fillText(h.name, cx, y0 + 26 + (h.id === 'blind' ? 16 : 0));
  });
}
function drawGut(){
  const c = gctx, t = gut.t, { W, H, PF_Y, FLOOR } = GUT, px = gut.pfX;
  c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#2A1512'; c.fillRect(0, 0, gcv.width, gcv.height);
  c.setTransform(gcv.width / W, 0, 0, gcv.height / H, 0, 0);
  const grd = c.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#F4C9BE'); grd.addColorStop(1, '#EDB2A5');
  c.fillStyle = grd; c.beginPath(); c.roundRect(0, PF_Y - 6, W, FLOOR - PF_Y + 6, [22, 22, 0, 0]); c.fill();
  drawWallHairs(c, t);
  drawBottom(c, t);
  // Decke des Darms, in der der Pförtner sitzt
  c.strokeStyle = '#C97567'; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath();
  for (let x = 14; x <= W - 14; x += 6) c.lineTo(x, PF_Y - 4 + Math.sin(x * 0.08 + t * 1.5) * 1.2);
  c.stroke();
  // Speiseröhre
  for (const [w, col] of [[26, '#B5645A'], [18, '#E9A597']]){ c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(ESO.x - 12, -20); c.quadraticCurveTo(ESO.x - 6, 6, SX - 50, SY - RY + 10); c.stroke(); }
  // Schlauch vom Magenausgang zum Pförtner, mit Muskelringen; wölbt sich um den Brocken
  const pts = []; for (let i = 0; i <= 40; i++) pts.push(tubePt(i / 40, px));
  const bulge = gut.transit.map(q => tubePt(q.u, q.px));
  for (const [w, col] of [[24, '#B5645A'], [16, '#E9A597']]){
    c.strokeStyle = col; c.lineWidth = w; c.beginPath(); pts.forEach((q, i) => i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)); c.stroke();
    for (const b of bulge){ c.fillStyle = col; c.beginPath(); c.arc(b.x, b.y, w / 2 + 5, 0, 6.283); c.fill(); }
  }
  c.strokeStyle = 'rgba(160,80,70,0.55)'; c.lineWidth = 2;
  for (let i = 2; i < pts.length - 2; i += 3){
    const a0 = pts[i - 1], a1 = pts[i + 1], dx = a1.x - a0.x, dy = a1.y - a0.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const w = 7 + (gut.transit.length ? 1.5 * Math.sin(i * 0.9 - t * 14) : 0);
    c.beginPath(); c.moveTo(pts[i].x - nx * w, pts[i].y - ny * w); c.lineTo(pts[i].x + nx * w, pts[i].y + ny * w); c.stroke();
  }
  for (const q of gut.transit){
    let pt = tubePt(q.u, q.px);
    if (q.u < 0.2){ const e = q.u / 0.2, o = tubePt(0, q.px); pt = { x: q.sx + (o.x - q.sx) * e, y: q.sy + (o.y - q.sy) * e }; }
    drawBrocken(c, q.k, pt.x, pt.y, 0.9);
  }
  // Magensack mit Falten und dem Haufen Brocken; der nächste ist markiert
  const sg = c.createRadialGradient(SX - 40, SY - 30, 10, SX, SY, RX); sg.addColorStop(0, '#F6C3B6'); sg.addColorStop(1, '#E29384');
  c.fillStyle = sg; c.fill(STOMACH);
  c.save(); c.clip(STOMACH);
  c.strokeStyle = 'rgba(181,100,90,0.3)'; c.lineWidth = 3;
  for (let i = 0; i < 6; i++){ c.beginPath(); c.moveTo(SX - RX + 10, SY - 40 + i * 16); c.bezierCurveTo(SX - 40, SY - 10 + i * 12 + Math.sin(t + i) * 2, SX + 40, SY - 20 + i * 14, SX + RX, SY - 30 + i * 14); c.stroke(); }
  const ni = nextIdx();
  gut.queue.forEach((q, i) => { if (q.wait <= 0 && q.inside && i !== ni) drawBrocken(c, q.k, q.x, q.y, 0.95); });
  if (ni >= 0){ const q = gut.queue[ni]; drawBrocken(c, q.k, q.x, q.y, 1.05); c.strokeStyle = '#FFF4E0'; c.lineWidth = 2; c.beginPath(); c.arc(q.x, q.y, gutType(q.k).r + 5, 0, 6.283); c.stroke(); }
  c.restore();
  for (const q of gut.queue) if (q.wait <= 0 && !q.inside) drawBrocken(c, q.k, q.x, q.y, 0.95);
  c.strokeStyle = '#B5645A'; c.lineWidth = 4; c.stroke(STOMACH);
  c.save(); c.translate(OUT.x, OUT.y); c.rotate(OUT_A + Math.PI / 2);                  // Pylorus am Magenausgang
  c.fillStyle = '#A9574D'; c.beginPath(); c.ellipse(0, 0, 15, 6, 0, 0, 6.283); c.fill();
  c.fillStyle = '#6E2E26'; c.beginPath(); c.ellipse(0, 0, 7, 2.6, 0, 0, 6.283); c.fill();
  c.restore();
  c.fillStyle = '#F4E6DC'; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.font = '800 14px "Bricolage Grotesque", system-ui, sans-serif';
  c.fillText(gut.queue.length ? `Magen: ${gut.queue.length}` : 'Magen leer', 320, 30);
  if (gut.queue.length){ c.font = '600 11px "Bricolage Grotesque", system-ui, sans-serif'; c.fillStyle = '#C9AFA5'; c.fillText('Klick auf den', 320, 48); c.fillText('Magen: einwerfen', 320, 62); c.fillText('(markiert = nächster)', 320, 78); }
  // Pförtner: Schließmuskel in der Darmdecke, zum Ziehen
  c.fillStyle = gut.drag === 'pf' ? '#8E3F36' : '#B5645A'; c.beginPath(); c.ellipse(px, PF_Y, 24, 10, 0, 0, 6.283); c.fill();
  c.strokeStyle = 'rgba(110,40,32,0.5)'; c.lineWidth = 1.5;
  for (let i = 0; i < 10; i++){ const a = i / 10 * 6.283; c.beginPath(); c.moveTo(px + Math.cos(a) * 10, PF_Y + Math.sin(a) * 4.5); c.lineTo(px + Math.cos(a) * 21, PF_Y + Math.sin(a) * 8.5); c.stroke(); }
  c.fillStyle = '#5A2620'; c.beginPath(); c.ellipse(px, PF_Y, 8, 3.8, 0, 0, 6.283); c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.5;
  for (const sd of [-1, 1]){ c.beginPath(); c.moveTo(px + sd * 27, PF_Y - 3); c.lineTo(px + sd * 31, PF_Y); c.lineTo(px + sd * 27, PF_Y + 3); c.stroke(); }
  const ink = gut.queue.length ? inkPath() : null;
  if (ink){                                                       // Nusstinte: vorausgesagte Fallbahn
    c.setLineDash([5, 5]); c.strokeStyle = 'rgba(74,46,22,0.85)'; c.lineWidth = 2.4; c.lineCap = 'round';
    c.beginPath(); ink.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.setLineDash([]);
    const [ex, ey] = ink[ink.length - 1]; c.fillStyle = 'rgba(74,46,22,0.85)'; c.beginPath(); c.arc(ex, ey, 3.5, 0, 6.283); c.fill();
  }
  else if (gut.queue.length || gut.transit.length){ c.setLineDash([3, 6]); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(px, PF_Y + 12); c.lineTo(px, FLOOR); c.stroke(); c.setLineDash([]); }
  for (const z of gut.cilia) drawCilium(c, z, t);
  if (gut.tube) drawTube(c, gut.tube, t);
  for (const b of gut.balls){
    if (b.tube){ c.globalAlpha = 0.55; drawBrocken(c, b.k, b.x, b.y, 0.8, b); c.globalAlpha = 1; continue; }   // in der Röhre
    c.strokeStyle = b.T.col; c.globalAlpha = 0.25; c.lineWidth = b.r * 0.8; c.lineCap = 'round'; c.beginPath(); b.trail.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.globalAlpha = 1;
    drawBrocken(c, b.k, b.x, b.y, 1, b);
    c.font = '800 12px "Bricolage Grotesque", system-ui, sans-serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = 'rgba(70,20,16,0.8)';
    c.strokeText(b.got, b.x, b.y - b.r - 8); c.fillStyle = '#FFF4E0'; c.fillText(b.got, b.x, b.y - b.r - 8);
  }
  for (const p of gut.pops){
    c.globalAlpha = Math.min(1, p.life * 2); c.font = `800 ${p.huge ? 24 : p.big ? 17 : 15}px "Bricolage Grotesque", system-ui, sans-serif`; c.textAlign = 'center';
    c.lineWidth = 4; c.strokeStyle = 'rgba(70,20,16,0.85)'; c.strokeText(p.txt, p.x, p.y); c.fillStyle = p.col; c.fillText(p.txt, p.x, p.y);
  }
  c.globalAlpha = 1;
}

/* ---------- Seitenleiste ---------- */
function renderGutLive(){
  renderTabs();
  let top = '';
  for (let w = 0; w < WORLDS.length; w++) if (gut.got[w]) top += `<div class="res">${icon(w, 'f')}+${fmtInt(gut.got[w])}</div>`;
  if (!top) top = `<div class="note">${gut.active ? 'Stell Pförtner und Zilien hin, dann klick auf den Magen.' : 'Der Magen ist leer. Jeder Run füllt eine Portion.'}</div>`;
  $('gutTop').innerHTML = top;
  const H = gut.holes, holes = Object.keys(HOLE_NAMES).filter(k => H[k]).map(k => `${HOLE_NAMES[k]} ${H[k]}×`).join(', ');
  const rows = [
    ['Brocken', `${gut.done} / ${gut.n0}`],
    ['Zilien-Treffer', gut.hits],
    ['Bester Brocken', gut.best ? fmt(Math.round(gut.best * 10) / 10) + ' Punkte' : '–'],
    ['Ganz verdaut ab', `${GUT.full} Punkten`],
    ['Magen', `${save.gut.p.length} / ${S.gutCap} Portionen`],
  ];
  if (holes) rows.push(['Ausgänge', holes]);
  $('gutStats').innerHTML = rows.map(([a, b]) => `<span>${a}</span><span>${b}</span>`).join('');
  $('gutSkip').disabled = !gut.queue.length;
  $('gutSkip').textContent = gut.auto && gut.queue.length ? 'Automatisch läuft …' : 'Rest automatisch einwerfen';
  $('gutHint').textContent = gut.finished && gut.n0
    ? 'Fertig verdaut. Deine Stellung bleibt gespeichert.'
    : 'Zilien und Pförtner anfassen und ziehen. Klick auf den Magen (oder Leertaste) wirft den markierten Brocken ein. Jede Zilie gibt einem Brocken höchstens 3, 2, 1 Punkte. Jede Frucht wird an einem anderen Ausgang am besten aufgenommen: Finde ihn heraus. Gleiche Frucht und gleiche Stellung ergeben immer denselben Weg.';
}
/* Entdeckte Ausgänge: je Frucht, die schon frei ist, der richtige Ausgang oder "?" */
function foundHtml(){
  const F = save.gutFound || {};
  const rows = WORLDS.slice(0, save.unlocked).map((w, i) => {
    const T = gutType(i), h = F[T.id];
    return h ? `<div class="found"><b>${T.name} → ${HOLE_NAMES[h]}</b><span class="note">${GUT.FACT[T.id]}</span></div>`
      : `<div class="found"><b>${T.name} → ?</b></div>`;
  }).join('');
  return `<h2>Ausgänge</h2><div class="foundlist">${rows}</div>`;
}
/* Darm-Upgrades: eigene Seite mit Baum. Oben der Darm, darunter Zilien, Darmflora, Magen, Gallenblase,
   unten je Frucht ein Gedächtnis-Knoten. Beschreibung und Kaufen nach dem Anklicken (zweiter Klick kauft). */
const GUT_TREE = { zilien: [14, 0.42], darmflora: [38, 0.42], magen: [62, 0.42], galle: [86, 0.42] };
const GUT_SHORT = { zilien: 'Mehr Zilien', darmflora: 'Darmflora', magen: 'Magen', galle: 'Gallenblase' };
const FRUIT_SHORT = ['Beere', 'Kirsche', 'Walnuss', 'Pflaume', 'Apfel', 'Kürbis'];
let gutSel = null;
function gutNodePos(u, H){ return u.mem !== undefined ? [10 + 16 * u.mem, H * 0.82] : [(GUT_TREE[u.id] || [50])[0], H * 0.42]; }
function gutNodeHtml(u){
  const l = lv(u.id), mem = u.mem !== undefined;
  const ic = mem ? `<svg class="ni ni-c" viewBox="0 0 24 24" aria-hidden="true">${ICON[u.mem].f}</svg>` : nodeIcon(u);
  return `${ic}<span class="lv">${l}<small>/${u.max}</small></span><span class="lbl">${mem ? FRUIT_SHORT[u.mem] || WORLDS[u.mem].name : GUT_SHORT[u.id] || u.name}</span>`;
}
function renderGutTree(H){
  const list = UPG.filter(u => u.gut && visible(u));
  if (!list.some(u => u.id === gutSel)) gutSel = (list.find(u => lv(u.id) < u.max) || list[0] || {}).id || null;
  const mems = list.filter(u => u.mem !== undefined), top = H * 0.13, bar = H * 0.66;
  let lines = '';
  for (const u of list){ const [x, y] = gutNodePos(u, H); if (u.mem === undefined) lines += `<line x1="50" y1="${top}" x2="${x}" y2="${y}"/>`; }
  if (mems.length){                                           // Gedächtnis: Leiste vom Darm nach unten, dann zu jeder Frucht
    const xs = mems.map(u => gutNodePos(u, H)[0]), y = gutNodePos(mems[0], H)[1];
    lines += `<line x1="50" y1="${top}" x2="50" y2="${bar}"/><line x1="${Math.min(50, ...xs)}" y1="${bar}" x2="${Math.max(50, ...xs)}" y2="${bar}"/>`
      + xs.map(x => `<line x1="${x}" y1="${bar}" x2="${x}" y2="${y}"/>`).join('');
  }
  let h = `<div class="gtree" style="height:${H}px"><svg viewBox="0 0 100 ${H}" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>
    <div class="node root" style="left:50%;top:${top}px" title="Darm"><svg class="ni" viewBox="0 0 24 24" aria-hidden="true">${UICON.verdauung}</svg></div>`
    + (mems.length ? `<span class="gtl" style="top:${bar - 26}px">Gedächtnis je Frucht</span>` : '');
  for (const u of list){
    const [x, y] = gutNodePos(u, H);
    h += `<button class="node${u.mem !== undefined ? ' mem' : ''}" data-gnode="${u.id}" title="${u.name}" style="left:${x}%;top:${y}px${u.mem !== undefined ? `;--wc:${WORLDS[u.mem].color}` : ''}">${gutNodeHtml(u)}</button>`;
  }
  return h + '</div>';
}
function renderGutDetail(){
  const el = $('gutDetail'); if (!el) return;
  const u = U[gutSel];
  if (!u){ el.innerHTML = ''; return; }
  const l = lv(u.id), maxed = l >= u.max, c = costOf(u);
  const ic = u.mem !== undefined ? `<svg class="si si-c" viewBox="0 0 24 24" aria-hidden="true">${ICON[u.mem].f}</svg>` : nodeIcon(u).replace('class="ni"', 'class="si"');
  el.innerHTML = `<div class="dcard"><div class="branch">Darm · ${WORLDS[c.w].name}</div><h3 class="sh">${ic}${u.name}</h3>
    <p>${u.desc}</p><p class="note">Stufe ${l} von ${u.max}</p>
    <p class="change"><span class="now">${nodeVal(u, l)}</span>${maxed ? ' <span class="note">(voll ausgebaut)</span>' : `<span class="arrow">→</span><span class="next">${nodeVal(u, l + 1)}</span>`}</p>
    ${maxed ? '' : `<button class="wide primary" data-gbuy="${u.id}" ${canBuy(u) ? '' : 'disabled'}>Kaufen: ${costHtml(c)}</button>`}
    ${!maxed && !afford(c) ? `<p class="note">(fehlt: ${missing(c)})</p>` : ''}</div>`;
  const b = el.querySelector('[data-gbuy]');
  if (b) b.onclick = () => gutBuy(u);
}
/* Nach einem Kauf (mehr Zilien, Gallenblase): alle gespeicherten Stellungen anpassen, Neues erscheint an freier Stelle */
function refitLayouts(){
  const L = save.gutLay = save.gutLay || {}, f = x => gutFitLayout(x && x.z ? x : null, S.gutCilia, S.gutBile);
  const sh = f(L); L.pf = sh.pf; L.z = sh.z; L.g = sh.g;
  for (const w in (L.per || {})) L.per[w] = f(L.per[w]);
}
function gutBuy(u){
  if (!canBuy(u)){ AU.sfx('nope'); return; }
  buy(u); refitLayouts(); persist(); renderGutShop();
}
function syncGutTree(){                                        // Zustand der Knoten (kaufbar, voll, gewählt), ohne neu zu bauen
  for (const b of document.querySelectorAll('#gutTreeBox [data-gnode]')){
    const u = U[b.dataset.gnode];
    b.classList.toggle('can', canBuy(u)); b.classList.toggle('max', lv(u.id) >= u.max); b.classList.toggle('sel', gutSel === u.id);
  }
}
function renderGutShop(){
  const box = $('gutTreeBox').parentElement, H = Math.max(360, Math.min(620, box.clientHeight || 520));
  $('bank2').innerHTML = bankHtml();
  $('gutTreeBox').innerHTML = renderGutTree(H);
  for (const b of document.querySelectorAll('#gutTreeBox [data-gnode]')) b.onclick = () => {
    const u = U[b.dataset.gnode];
    if (gutSel === u.id){ if (lv(u.id) < u.max) gutBuy(u); else AU.sfx('nope'); return; }
    gutSel = u.id; AU.sfx('tick'); syncGutTree(); renderGutDetail();
  };
  renderGutDetail(); syncGutTree(); renderTabs();
}
function renderGutPanel(){                                     // Seitenleiste im Darm: nur noch die entdeckten Ausgänge
  $('gutUpg').innerHTML = foundHtml();
  renderGutLive();
}

/* ---------- Eingabe ---------- */
function gutXY(e){
  const r = gcv.getBoundingClientRect(), sc = Math.min(r.width / GUT.W, r.height / GUT.H);
  return { x: (e.clientX - r.left - (r.width - GUT.W * sc) / 2) / sc, y: (e.clientY - r.top - (r.height - GUT.H * sc) / 2) / sc };
}
const ciliumAt = p => gut.cilia.find(z => Math.hypot(z.x - p.x, z.y - p.y) < GUT.CIL_R + 12);
const overTube = p => gut.tube && Math.abs(p.x - gut.tube.x) < GUT.TUBE.hw + 8 && Math.abs(p.y - gut.tube.y) < GUT.TUBE.hl + 10;
const overPf = p => Math.abs(p.x - gut.pfX) < 28 && Math.abs(p.y - GUT.PF_Y) < 14;
const overStomach = p => Math.hypot((p.x - SX) / RX, (p.y - SY) / RY) < 1;
gcv.addEventListener('pointerdown', e => {
  e.preventDefault(); const p = gutXY(e);
  const z = ciliumAt(p);
  if (z || overPf(p) || overTube(p)){ gut.drag = z || (overTube(p) ? 'tube' : 'pf'); gut.glide = null; gut.pending = false; gcv.setPointerCapture(e.pointerId); return; }
  if (overStomach(p)) gutDrop();
});
gcv.addEventListener('pointermove', e => {
  const p = gutXY(e);
  gcv.style.cursor = gut.drag ? 'grabbing' : ciliumAt(p) || overPf(p) || overTube(p) ? 'grab' : overStomach(p) ? 'pointer' : 'default';
  if (!gut.drag) return;
  if (gut.drag === 'pf'){ gut.pfX = Math.max(GUT.WALL + 8, Math.min(GUT.W - GUT.WALL - 8, p.x)); return; }
  if (gut.drag === 'tube'){ const [x, y] = gutClampTube(p.x, p.y, gut.cilia); gut.tube.x = x; gut.tube.y = y; return; }
  const [x, y] = gutClampCilium(p.x, p.y, movers().filter(o => o !== gut.drag));
  gut.drag.x = x; gut.drag.y = y;
});
addEventListener('pointerup', () => {
  if (!gut.drag) return;
  gut.drag = null;
  storeLayout(gut.layW); persist();
});
addEventListener('keydown', e => {
  if (screen !== 'gut' || modalOpen()) return;
  const tag = e.target && e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (e.code === 'Space'){ e.preventDefault(); if (!e.repeat) gutDrop(); }
});

$('gutSkip').onclick = e => { gut.auto = true; gut.autoT = 0; e.currentTarget.blur(); renderGutLive(); };
$('toGut').onclick = () => { run.active = false; openGut(); };
$('endNext').onclick = () => startRun();
