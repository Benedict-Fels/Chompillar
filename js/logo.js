/* Logo: Raupenkörper formt das C, läuft unten unter dem h entlang, der Kopf ist das o.
   Aufbau im h1: <span class="lgc"></span>h<span class="lgo"><svg Kopf></span>mpillar
   Der Körper wird nach dem Laden der Schrift gemessen und als SVG über das h1 gelegt. */
function drawLogo(h1){
  const c = h1.querySelector('.lgc'), o = h1.querySelector('.lgo');
  if (!c || !o) return;
  const old = h1.querySelector('.lgbody'); if (old) old.remove();
  const R = h1.getBoundingClientRect(), rc = c.getBoundingClientRect(), ro = o.getBoundingClientRect();
  const fs = parseFloat(getComputedStyle(h1).fontSize);
  const base = ro.bottom - R.top - fs * 0.06;                           // Grundlinie (der Kopf sitzt .06em tiefer)
  const rad = fs * 0.33, cx = rc.left - R.left + rad + fs * 0.07, cy = base - fs * 0.36;
  const hx = ro.left - R.left + ro.width * 0.5, hy = ro.top - R.top + ro.height * 0.5, hr = ro.width * 0.5;
  // Weg: C-Bogen von oben rechts gegen den Uhrzeigersinn bis unten, dann unter dem h entlang zum Kopf (dem o)
  const pts = [], a0 = -0.27 * Math.PI, a1 = -1.5 * Math.PI;
  const arcLen = Math.abs(a1 - a0) * rad, by = cy + rad, lineLen = Math.max(0, hx - hr * 0.7 - cx);
  const total = arcLen + lineLen, low = base + fs * 0.06;               // unter dem h: knapp unter der Grundlinie
  const pos = d => {
    if (d <= arcLen){ const a = a0 - d / rad; return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]; }
    const t = (d - arcLen) / (lineLen || 1), x = cx + (d - arcLen);
    const y = t < 0.75 ? by + (low - by) * Math.min(1, t / 0.3) : low + (hy + hr * 0.35 - low) * ((t - 0.75) / 0.25) ** 2;
    return [x, y];
  };
  let d = 0;
  while (d < total){
    const t = d / total, r = fs * (0.065 + 0.06 * t);                  // dünn am Schwanz, dick am Kopf
    pts.push({ p: pos(d), r });
    d += r * 1.55;
  }
  const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'lgbody'); svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', R.width); svg.setAttribute('height', R.height + fs * 0.3);
  let s = '';
  pts.forEach(({ p, r }, i) => {
    s += `<circle cx="${p[0].toFixed(1)}" cy="${(p[1] + r * 0.85).toFixed(1)}" r="${(r * 0.22).toFixed(1)}" fill="#2F4A1A"/>`;   // Beinchen
  });
  pts.forEach(({ p, r }, i) => {
    s += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${r.toFixed(1)}" fill="${i % 2 ? '#6CAA34' : '#7EC040'}" stroke="#2F5A17" stroke-width="${(fs * 0.018).toFixed(1)}"/>`
      + `<circle cx="${(p[0] - r * 0.3).toFixed(1)}" cy="${(p[1] - r * 0.32).toFixed(1)}" r="${(r * 0.25).toFixed(1)}" fill="#FFF0AA" opacity=".55"/>`;
  });
  svg.innerHTML = s;
  h1.prepend(svg);
}
function initLogo(){
  const h1 = document.querySelector('h1.logo'); if (!h1) return;
  const go = () => drawLogo(h1);
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(go);
  addEventListener('resize', go);
}
