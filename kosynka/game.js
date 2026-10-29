'use strict';

/* ============================== helpers ============================== */
const $ = s => document.querySelector(s);
function el(tag, cls, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (parent) parent.appendChild(e);
  return e;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function fmtTime(s) { return ((s / 60) | 0) + ':' + String(s % 60).padStart(2, '0'); }

/* ============================== constants ============================== */
const SUITS = ['\u2660\uFE0E', '\u2665\uFE0E', '\u2666\uFE0E', '\u2663\uFE0E']; // ♠ ♥ ♦ ♣
const RANKS = [null, 'Т', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'В', 'Д', 'К'];
const isRed = s => s === 1 || s === 2;
const LS = { save: 'kosynka.save', draw: 'kosynka.draw', stats: 'kosynka.stats' };

/* ============================== dom refs ============================== */
const tableEl = $('#table');
const btnNew = $('#btnNew'), btnRestart = $('#btnRestart'), btnUndo = $('#btnUndo'),
      btnFinish = $('#btnFinish'), btnDraw = $('#btnDraw'), btnAgain = $('#btnAgain');
const stTime = $('#stTime'), stMoves = $('#stMoves'), stScore = $('#stScore');
const overlay = $('#overlay'), winStats = $('#winStats');
const fx = $('#fx'), fctx = fx.getContext('2d');

const stockSlot = el('div', 'slot stock', tableEl);
stockSlot.innerHTML = '<span class="recycle">↻</span><span class="badge"></span>';
const badgeEl = stockSlot.querySelector('.badge');
const wasteSlot = el('div', 'slot waste', tableEl);
const fSlots = [], tSlots = [];
for (let i = 0; i < 4; i++) {
  const s = el('div', 'slot foundation', tableEl);
  s.innerHTML = '<span class="ghost">A</span>';
  fSlots.push(s);
}
for (let i = 0; i < 7; i++) tSlots.push(el('div', 'slot tableau', tableEl));

/* ============================== cards ============================== */
const cards = [];
const cardById = id => cards[id];
(function buildCards() {
  for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) {
    const id = s * 13 + r - 1;
    const d = el('div', 'card ' + (isRed(s) ? 'red' : 'black'));
    d.dataset.id = id;
    const face = el('div', 'face', d);
    const cornerHTML = RANKS[r] + '<span>' + SUITS[s] + '</span>';
    const c1 = el('div', 'corner', face); c1.innerHTML = cornerHTML;
    const c2 = el('div', 'corner br', face); c2.innerHTML = cornerHTML;
    const ce = el('div', 'center', face); ce.textContent = SUITS[s];
    el('div', 'back', d);
    cards[id] = { id, s, r, faceUp: false, el: d, _x: 0, _y: 0 };
    tableEl.appendChild(d);
  }
})();

/* ============================== state ============================== */
const piles = { stock: [], waste: [], f: [[], [], [], []], t: [[], [], [], [], [], [], []] };
let hist = [];
let seed = 0, score = 0, moves = 0, elapsed = 0, started = false, won = false;
let timerId = null, drawMode = 1, G = null, autoRunning = false, fxRun = false, cascadeOver = false;
let stats;
try { stats = JSON.parse(localStorage.getItem(LS.stats)) || {}; } catch (e) { stats = {}; }
stats = Object.assign({ games: 0, wins: 0, bestTime: null, bestScore: 0 }, stats);
drawMode = +(localStorage.getItem(LS.draw) || 1) === 3 ? 3 : 1;

/* ============================== layout ============================== */
function layout() {
  const W = tableEl.clientWidth;
  const pad = Math.max(10, Math.min(20, W * 0.015));
  const gap = Math.max(8, Math.min(22, W * 0.016));
  const avail = W - 2 * pad;
  const coeff = drawMode === 3 ? 6.6 : 6;                 // верхний ряд: колода + отбой (+веер) + 4 дома
  let cw = Math.floor(Math.min(120, (avail - 5 * gap) / coeff, (avail - 6 * gap) / 7));
  cw = Math.max(36, cw);
  const ch = Math.round(cw * 1.42);
  document.documentElement.style.setProperty('--cw', cw + 'px');
  G = {
    W, pad, gap, cw, ch,
    stock: { x: pad, y: pad },
    waste: { x: pad + cw + gap, y: pad },
    f: Array.from({ length: 4 }, (_, i) => ({ x: W - pad - cw - (3 - i) * (cw + gap), y: pad })),
    t: Array.from({ length: 7 }, (_, i) => ({ x: pad + i * (cw + gap), y: pad + ch + Math.max(14, Math.round(ch * 0.17)) })),
    fanUp: Math.max(17, Math.round(ch * 0.27)),
    fanDown: Math.max(9, Math.round(ch * 0.13))
  };
}

function tableauOffsets(p) {
  if (p.length < 2) return [];
  let offs = [];
  for (let i = 1; i < p.length; i++) offs.push(p[i - 1].faceUp ? G.fanUp : G.fanDown);
  const total = offs.reduce((a, b) => a + b, 0);
  const availH = Math.max(window.innerHeight - G.t[0].y - 14, G.ch * 2.4);
  const maxTotal = availH - G.ch;
  let scale = 1;
  if (total > maxTotal && total > 0) scale = Math.max(0.22, maxTotal / total);
  return offs.map(o => Math.max(5, o * scale));
}

function setPos(c, x, y, z) {
  c._x = x; c._y = y;
  c.el.style.zIndex = z;
  c.el.style.transform = `translate3d(${x}px,${y}px,0)`;
  c.el.classList.toggle('face-down', !c.faceUp);
}
function moveSlot(s, x, y) { s.style.transform = `translate(${x}px,${y}px)`; }

function positionAll() {
  moveSlot(stockSlot, G.stock.x, G.stock.y);
  moveSlot(wasteSlot, G.waste.x, G.waste.y);
  fSlots.forEach((s, i) => moveSlot(s, G.f[i].x, G.f[i].y));
  tSlots.forEach((s, i) => moveSlot(s, G.t[i].x, G.t[i].y));

  let maxBottom = G.t[0].y + G.ch;
  piles.stock.forEach((c, i) => setPos(c, G.stock.x, G.stock.y, 1 + i));

  const wn = piles.waste.length;
  piles.waste.forEach((c, i) => {
    let spread = 0;
    if (drawMode === 3) { const from = Math.max(0, wn - 3); if (i >= from) spread = i - from; }
    setPos(c, G.waste.x + spread * G.cw * 0.28, G.waste.y, 60 + i);
  });

  piles.f.forEach((p, f) => p.forEach((c, i) => setPos(c, G.f[f].x, G.f[f].y, 100 + f * 10 + i)));

  piles.t.forEach((p, col) => {
    const offs = tableauOffsets(p);
    let y = G.t[col].y, bottom = G.t[col].y + G.ch;
    p.forEach((c, i) => {
      setPos(c, G.t[col].x, y, 200 + col * 30 + i);
      if (y + G.ch > bottom) bottom = y + G.ch;
      y += offs[i] || 0;
    });
    if (bottom > maxBottom) maxBottom = bottom;
  });
  tableEl.style.height = (maxBottom + 8) + 'px';
}

function render() { layout(); positionAll(); updateUI(); }

function updateUI() {
  stTime.textContent = fmtTime(elapsed);
  stMoves.textContent = moves;
  stScore.textContent = score;
  stockSlot.classList.toggle('empty', !piles.stock.length);
  badgeEl.textContent = piles.stock.length || '';
  btnUndo.disabled = !hist.length || won || autoRunning;
  btnFinish.hidden = !canAutoFinish();
  btnDraw.textContent = 'Открывать: ' + drawMode;
}

/* ============================== rules ============================== */
function locate(c) {
  let i = piles.stock.indexOf(c); if (i >= 0) return { pile: 'stock', idx: 0, pos: i };
  i = piles.waste.indexOf(c); if (i >= 0) return { pile: 'waste', idx: 0, pos: i };
  for (let k = 0; k < 4; k++) { i = piles.f[k].indexOf(c); if (i >= 0) return { pile: 'f', idx: k, pos: i }; }
  for (let k = 0; k < 7; k++) { i = piles.t[k].indexOf(c); if (i >= 0) return { pile: 't', idx: k, pos: i }; }
  return null;
}
function pileOf(loc) {
  if (loc.pile === 'stock') return piles.stock;
  if (loc.pile === 'waste') return piles.waste;
  if (loc.pile === 'f') return piles.f[loc.idx];
  return piles.t[loc.idx];
}
function canDropT(c, p) {
  if (!p.length) return c.r === 13;
  const top = p[p.length - 1];
  return top.faceUp && top.r === c.r + 1 && isRed(top.s) !== isRed(c.s);
}
function canDropF(c, p) {
  if (!p.length) return c.r === 1;
  const top = p[p.length - 1];
  return top.s === c.s && top.r === c.r - 1;
}
function canAutoFinish() {
  return !won && !autoRunning && !piles.stock.length && !piles.waste.length &&
         piles.t.every(p => p.every(c => c.faceUp));
}

/* ============================== history / save ============================== */
function snapshot() {
  return {
    seed, score, moves, elapsed, started,
    stock: piles.stock.map(c => c.id),
    waste: piles.waste.map(c => c.id),
    f: piles.f.map(p => p.map(c => c.id)),
    t: piles.t.map(p => p.map(c => ({ i: c.id, u: c.faceUp })))
  };
}
function applySnap(s) {
  seed = s.seed; score = s.score; moves = s.moves; elapsed = s.elapsed; started = s.started;
  piles.stock = s.stock.map(cardById); piles.stock.forEach(c => c.faceUp = false);
  piles.waste = s.waste.map(cardById); piles.waste.forEach(c => c.faceUp = true);
  piles.f = s.f.map(p => p.map(cardById)); piles.f.forEach(p => p.forEach(c => c.faceUp = true));
  piles.t = s.t.map(p => p.map(o => { const c = cardById(o.i); c.faceUp = o.u; return c; }));
  won = false; autoRunning = false;
}
function pushHistory() {
  hist.push(snapshot());
  if (hist.length > 300) hist.shift();
}
function save() {
  if (won) { clearSave(); return; }
  try { localStorage.setItem(LS.save, JSON.stringify(Object.assign(snapshot(), { drawMode }))); } catch (e) {}
}
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(LS.save));
    if (s && s.t && s.stock && s.f) return s;
  } catch (e) {}
  return null;
}
function clearSave() { try { localStorage.removeItem(LS.save); } catch (e) {} }
function saveStats() { try { localStorage.setItem(LS.stats, JSON.stringify(stats)); } catch (e) {} }

function undo() {
  if (!hist.length || won || fxRun || autoRunning) return;
  applySnap(hist.pop());
  if (started && !timerId) startTimer();
  render(); save();
}

/* ============================== timer ============================== */
function startTimer() {
  if (timerId) clearInterval(timerId);
  timerId = setInterval(() => {
    elapsed++;
    stTime.textContent = fmtTime(elapsed);
    if (elapsed % 5 === 0) save();
  }, 1000);
}
function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }
function startTimerIfNeeded() { started = true; if (!timerId) startTimer(); }

/* ============================== moves ============================== */
function raiseTemp(set) {
  set.forEach((c, i) => c.el.style.zIndex = 4000 + i);
  setTimeout(() => { if (!drag) positionAll(); }, 380);
}

function moveRun(src, firstCard, dstType, dstIdx) {
  pushHistory();
  const srcArr = pileOf(src);
  const pos = srcArr.indexOf(firstCard);
  const set = srcArr.splice(pos);
  if (dstType === 'f') piles.f[dstIdx].push(...set);
  else piles.t[dstIdx].push(...set);

  if (src.pile === 't' && srcArr.length && !srcArr[srcArr.length - 1].faceUp) {
    srcArr[srcArr.length - 1].faceUp = true;
    score += 5;
  }
  if (src.pile === 'waste' && dstType === 't') score += 5;
  else if (dstType === 'f') score += 10;
  else if (src.pile === 'f' && dstType === 't') score = Math.max(0, score - 15);

  moves++;
  startTimerIfNeeded();
  render();
  raiseTemp(set);
  save();
  checkWin();
}

function smartMove(src, card) {
  const srcArr = pileOf(src);
  const pos = srcArr.indexOf(card);
  const set = srcArr.slice(pos);
  if (set.length === 1) {
    for (let i = 0; i < 4; i++) {
      if (src.pile === 'f' && src.idx === i) continue;
      if (canDropF(card, piles.f[i])) { moveRun(src, card, 'f', i); return; }
    }
  }
  let target = -1;
  for (let i = 0; i < 7; i++) {
    if (src.pile === 't' && src.idx === i) continue;
    const p = piles.t[i];
    if (p.length && canDropT(card, p)) { target = i; break; }
  }
  if (target < 0 && card.r === 13 && !(src.pile === 't' && pos === 0)) {
    for (let i = 0; i < 7; i++) {
      if (src.pile === 't' && src.idx === i) continue;
      if (!piles.t[i].length) { target = i; break; }
    }
  }
  if (target >= 0) { moveRun(src, card, 't', target); return; }
  shake(card);
}

function drawFromStock() {
  if (won || autoRunning) return;
  if (piles.stock.length) {
    pushHistory();
    for (let i = 0; i < drawMode && piles.stock.length; i++) {
      const c = piles.stock.pop();
      c.faceUp = true;
      piles.waste.push(c);
    }
    moves++;
  } else if (piles.waste.length) {
    pushHistory();
    if (drawMode === 1) score = Math.max(0, score - 100);
    while (piles.waste.length) {
      const c = piles.waste.pop();
      c.faceUp = false;
      piles.stock.push(c);
    }
    moves++;
  } else return;
  startTimerIfNeeded();
  render(); save();
}

function autoFinish() {
  if (!canAutoFinish()) return;
  pushHistory();
  autoRunning = true;
  btnFinish.hidden = true;
  startTimerIfNeeded();
  (function step() {
    let best = null;
    for (let i = 0; i < 7; i++) {
      const p = piles.t[i];
      if (!p.length) continue;
      const c = p[p.length - 1];
      for (let f = 0; f < 4; f++) {
        if (canDropF(c, piles.f[f])) { if (!best || c.r < best.c.r) best = { i, c, f }; break; }
      }
    }
    if (!best) { autoRunning = false; render(); checkWin(); return; }
    piles.t[best.i].pop();
    piles.f[best.f].push(best.c);
    score += 10; moves++;
    render();
    raiseTemp([best.c]);
    if (piles.f.every(p => p.length === 13)) { autoRunning = false; checkWin(); return; }
    setTimeout(step, 110);
  })();
}

function shake(c) {
  try {
    c.el.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' },
       { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }],
      { duration: 280, composite: 'add' }
    );
  } catch (e) {}
}

/* ============================== drag & click ============================== */
let drag = null;

function rectOf(e) { const r = e.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; }
function rectUnion(a, b) {
  return { left: Math.min(a.left, b.left), top: Math.min(a.top, b.top), right: Math.max(a.right, b.right), bottom: Math.max(a.bottom, b.bottom) };
}
function overlapArea(l, t, w, h, r) {
  const x = Math.max(0, Math.min(l + w, r.right) - Math.max(l, r.left));
  const y = Math.max(0, Math.min(t + h, r.bottom) - Math.max(t, r.top));
  return x * y;
}

function mkTarget(type, idx) {
  let rect;
  let topCard = null;
  if (type === 'f') rect = rectOf(fSlots[idx]);
  else {
    rect = rectOf(tSlots[idx]);
    const p = piles.t[idx];
    if (p.length) {
      topCard = p[p.length - 1];
      rect = rectUnion(rect, rectOf(topCard.el));
    }
    rect.bottom += G.ch * 0.6;
  }
  const slot = type === 'f' ? fSlots[idx] : tSlots[idx];
  return { type, idx, rect, slot, el: topCard ? topCard.el : slot };
}
function validTargets(set, loc) {
  const lead = set[0], res = [];
  if (set.length === 1) {
    for (let i = 0; i < 4; i++) {
      if (loc.pile === 'f' && loc.idx === i) continue;
      if (canDropF(lead, piles.f[i])) res.push(mkTarget('f', i));
    }
  }
  for (let i = 0; i < 7; i++) {
    if (loc.pile === 't' && loc.idx === i) continue;
    if (canDropT(lead, piles.t[i])) res.push(mkTarget('t', i));
  }
  return res;
}
function setHover(tg, on) {
  if (!tg) return;
  tg.el.classList.toggle('over', on);
  tg.slot.classList.toggle('over', on);
}

tableEl.addEventListener('pointerdown', e => {
  if (won || fxRun || autoRunning || drag) return;
  if (e.button !== undefined && e.button !== 0) return;
  cards.forEach(c => c.el.style.transitionDelay = '');

  const cardEl = e.target.closest('.card');
  const onStock = cardEl
    ? piles.stock[piles.stock.length - 1] === cardById(+cardEl.dataset.id)
    : !!e.target.closest('.slot.stock');
  if (onStock) { drawFromStock(); return; }
  if (!cardEl) return;

  const card = cardById(+cardEl.dataset.id);
  const loc = locate(card);
  if (!loc) return;
  let set = null;
  if (loc.pile === 'waste' && loc.pos === piles.waste.length - 1) set = [card];
  else if (loc.pile === 't' && card.faceUp) set = piles.t[loc.idx].slice(loc.pos);
  else if (loc.pile === 'f' && loc.pos === piles.f[loc.idx].length - 1) set = [card];
  if (!set) return;

  drag = {
    set, src: { pile: loc.pile, idx: loc.idx }, pid: e.pointerId,
    sx: e.clientX, sy: e.clientY,
    orig: set.map(c => ({ x: c._x, y: c._y })),
    tRect: tableEl.getBoundingClientRect(),
    moved: false, hover: null,
    targets: validTargets(set, loc)
  };
  window.addEventListener('pointermove', onDragMove);
  window.addEventListener('pointerup', onDragUp);
  window.addEventListener('pointercancel', onDragCancel);
  e.preventDefault();
});

function onDragMove(e) {
  if (!drag || e.pointerId !== drag.pid) return;
  const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
  if (!drag.moved) {
    if (Math.hypot(dx, dy) < 5) return;
    drag.moved = true;
    drag.set.forEach((c, i) => { c.el.classList.add('drag'); c.el.style.zIndex = 4000 + i; });
  }
  drag.set.forEach((c, i) => {
    c.el.style.transform = `translate3d(${drag.orig[i].x + dx}px,${drag.orig[i].y + dy}px,0)`;
  });
  const l = drag.tRect.left + drag.orig[0].x + dx;
  const t = drag.tRect.top + drag.orig[0].y + dy;
  let best = null, bestA = G.cw * G.ch * 0.2;
  for (const tg of drag.targets) {
    const a = overlapArea(l, t, G.cw, G.ch, tg.rect);
    if (a > bestA) { bestA = a; best = tg; }
  }
  if (best !== drag.hover) {
    setHover(drag.hover, false);
    drag.hover = best;
    setHover(drag.hover, true);
  }
}

function onDragUp(e) {
  if (!drag || e.pointerId !== drag.pid) return;
  const d = drag;
  removeDragListeners();
  if (!d.moved) {
    drag = null;
    smartMove(d.src, d.set[0]);
    return;
  }
  d.set.forEach(c => c.el.classList.remove('drag'));
  setHover(d.hover, false);
  const tg = d.hover;
  drag = null;
  if (tg) moveRun(d.src, d.set[0], tg.type, tg.idx);
  else render(); // возврат на место
}
function onDragCancel() {
  if (!drag) return;
  const d = drag;
  removeDragListeners();
  d.set.forEach(c => c.el.classList.remove('drag'));
  setHover(d.hover, false);
  drag = null;
  render();
}
function removeDragListeners() {
  window.removeEventListener('pointermove', onDragMove);
  window.removeEventListener('pointerup', onDragUp);
  window.removeEventListener('pointercancel', onDragCancel);
}

/* ============================== win ============================== */
function checkWin() {
  if (won) return;
  if (!piles.f.every(p => p.length === 13)) return;
  won = true;
  stopTimer();
  clearSave();
  stats.wins++;
  if (stats.bestTime == null || elapsed < stats.bestTime) stats.bestTime = elapsed;
  if (score > stats.bestScore) stats.bestScore = score;
  saveStats();
  updateUI();
  setTimeout(startCascade, 450);
}

function makeSprite(c) {
  const dpr = window.devicePixelRatio || 1;
  const w = G.cw, h = G.ch;
  const cv = document.createElement('canvas');
  cv.width = w * dpr; cv.height = h * dpr;
  const x = cv.getContext('2d');
  x.scale(dpr, dpr);
  const r = w * 0.09;
  x.beginPath();
  x.moveTo(r + 0.5, 0.5); x.arcTo(w - 0.5, 0.5, w - 0.5, h - 0.5, r); x.arcTo(w - 0.5, h - 0.5, 0.5, h - 0.5, r);
  x.arcTo(0.5, h - 0.5, 0.5, 0.5, r); x.arcTo(0.5, 0.5, w - 0.5, 0.5, r); x.closePath();
  x.fillStyle = '#fdfdfa'; x.fill();
  x.strokeStyle = '#c9c8c0'; x.stroke();
  x.fillStyle = isRed(c.s) ? '#c8102e' : '#232733';
  x.textAlign = 'center';
  x.font = '700 ' + (w * 0.22) + 'px -apple-system, Segoe UI, sans-serif';
  x.fillText(RANKS[c.r], w * 0.17, w * 0.27);
  x.font = (w * 0.2) + 'px serif';
  x.fillText(SUITS[c.s], w * 0.17, w * 0.5);
  x.font = (w * 0.55) + 'px serif';
  x.fillText(SUITS[c.s], w / 2, h * 0.68);
  return cv;
}

function startCascade() {
  if (!won) return;
  const dpr = window.devicePixelRatio || 1;
  fx.width = innerWidth * dpr; fx.height = innerHeight * dpr;
  fx.style.display = 'block';
  fx.style.pointerEvents = 'auto';
  fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  fctx.clearRect(0, 0, innerWidth, innerHeight);

  const tRect = tableEl.getBoundingClientRect();
  const queue = [];
  for (let r = 13; r >= 1; r--) for (let f = 0; f < 4; f++) {
    const c = piles.f[f][r - 1];
    if (c) queue.push({ c, f });
  }
  const sprites = queue.map(q => ({
    sp: makeSprite(q.c),
    x: G.f[q.f].x + tRect.left,
    y: G.f[q.f].y + tRect.top
  }));
  let idx = 0, active = [];
  fxRun = true; cascadeOver = false;

  (function spawn() {
    if (!fxRun || idx >= sprites.length) return;
    const s = sprites[idx++];
    s.vx = (2.5 + Math.random() * 4.5) * (Math.random() < 0.5 ? -1 : 1);
    s.vy = -(1 + Math.random() * 3);
    s.b = 0;
    active.push(s);
    setTimeout(spawn, 260);
  })();

  let last = performance.now();
  const W = innerWidth, H = innerHeight;
  function frame(now) {
    if (!fxRun) return;
    const k = Math.min(2.5, (now - last) / 16.7); last = now;
    for (let i = active.length - 1; i >= 0; i--) {
      const a = active[i];
      a.vy += 0.45 * k; a.x += a.vx * k; a.y += a.vy * k;
      if (a.y + G.ch > H) { a.y = H - G.ch; a.vy *= -0.75; a.b++; }
      if (a.x + G.cw < 0 || a.x > W || (a.b > 5 && Math.abs(a.vy) < 1.2)) { active.splice(i, 1); continue; }
      fctx.drawImage(a.sp, a.x, a.y, G.cw, G.ch);
    }
    if (idx < sprites.length || active.length) requestAnimationFrame(frame);
    else setTimeout(endCascade, 700);
  }
  requestAnimationFrame(frame);
  fx.onpointerdown = () => endCascade();
}
function endCascade() {
  if (cascadeOver) return;
  cascadeOver = true;
  fxRun = false;
  fx.style.pointerEvents = 'none';
  showWinPanel();
}
function showWinPanel() {
  winStats.innerHTML =
    'Время: <b>' + fmtTime(elapsed) + '</b> · Ходов: <b>' + moves + '</b> · Очки: <b>' + score + '</b><br>' +
    'Лучшее время: <b>' + (stats.bestTime != null ? fmtTime(stats.bestTime) : '—') + '</b> · ' +
    'Лучшие очки: <b>' + stats.bestScore + '</b> · Побед: <b>' + stats.wins + '</b> из <b>' + stats.games + '</b>';
  overlay.hidden = false;
}

/* ============================== new game / deal ============================== */
function newGame(reuse) {
  if (!reuse) {
    seed = (Math.random() * 0x7fffffff) | 0;
    stats.games++;
    saveStats();
  }
  fxRun = false; cascadeOver = false;
  fx.style.display = 'none';
  overlay.hidden = true;
  won = false; autoRunning = false;
  hist = []; score = 0; moves = 0; elapsed = 0; started = false;
  stopTimer();

  const rng = mulberry32(seed);
  const deck = cards.slice();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    const t = deck[i]; deck[i] = deck[j]; deck[j] = t;
  }
  piles.stock = []; piles.waste = []; piles.f = [[], [], [], []]; piles.t = [[], [], [], [], [], [], []];
  cards.forEach(c => c.faceUp = false);
  let k = 0;
  for (let row = 0; row < 7; row++) for (let col = row; col < 7; col++) {
    const c = deck[k++];
    c.faceUp = (col === row);
    piles.t[col].push(c);
  }
  while (k < 52) piles.stock.push(deck[k++]);

  // анимация раздачи: всё в колоду, затем разлёт по колонкам
  layout();
  cards.forEach(c => {
    c.el.classList.add('no-anim', 'face-down');
    c.el.style.transform = `translate3d(${G.stock.x}px,${G.stock.y}px,0)`;
    c.el.style.zIndex = '';
    c.el.style.transitionDelay = '';
  });
  tableEl.offsetHeight; // reflow
  cards.forEach(c => c.el.classList.remove('no-anim'));
  let i = 0;
  for (let row = 0; row < 7; row++) for (let col = row; col < 7; col++) {
    piles.t[col][row].el.style.transitionDelay = (i++ * 35) + 'ms';
  }
  render();
  save();
  setTimeout(() => cards.forEach(c => c.el.style.transitionDelay = ''), i * 35 + 700);
}

/* ============================== init ============================== */
btnNew.addEventListener('click', () => newGame(false));
btnRestart.addEventListener('click', () => newGame(true));
btnUndo.addEventListener('click', undo);
btnFinish.addEventListener('click', autoFinish);
btnDraw.addEventListener('click', () => {
  drawMode = drawMode === 1 ? 3 : 1;
  try { localStorage.setItem(LS.draw, drawMode); } catch (e) {}
  render(); save();
});
btnAgain.addEventListener('click', () => newGame(false));

window.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
  else if (e.key === 'Escape' && drag) onDragCancel();
});

let rzT = 0;
window.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(render, 80); });
window.addEventListener('beforeunload', save);

const savedGame = loadSave();
if (savedGame) {
  try { applySnap(savedGame); render(); if (started && !timerId) startTimer(); }
  catch (e) { newGame(false); }
} else {
  newGame(false);
}
