// POLINIZADOR v4.0 — Gráfica fija festival
// Los parámetros de aspecto (colores, dash, apertura, jitter, etc.) se leen
// de la constante GFX definida en index.html. Solo son ajustables los
// parámetros de escala, tamaño, posición y lienzo.

const SIDEBAR_W  = 240;
const HIDE_AFTER = 80;

// ── Fuentes ───────────────────────────────────────────────────────────────────
let FONTS          = [];
let currentFontIdx = 0;
let p5Font         = null;
let otFont         = null;
let _tyCache       = {};

// ── Estado del spray ──────────────────────────────────────────────────────────
let originX, originY;
let rotation   = 0;
let jitterSeed = 42;

// ── Bounding box de trabajo ───────────────────────────────────────────────────
let bbW = 770, bbH = 1920;
let zoom = 1.0;
function bbX() { return (width  - bbW) / 2; }
function bbY() { return (height - bbH) / 2; }

// ── Interacción ───────────────────────────────────────────────────────────────
let draggingOrigin   = false;
let draggingRotation = false;
let lastMouseAngle   = 0;
let mouseIdleTimer   = 0;

function preload() {}

function setup() {
  let canvas = createCanvas(windowWidth - SIDEBAR_W, windowHeight);
  canvas.parent('canvas-parent');
  readBBox();
  originX = width  / 2;
  originY = height / 2;
  initFonts();
}

// ── CARGA DE FUENTES ──────────────────────────────────────────────────────────
// Fuente fija: 1nationalpark

async function initFonts() {
  try {
    let ff = new FontFace('1nationalpark', 'url(fonts/1nationalpark.ttf)');
    let loaded = await ff.load();
    document.fonts.add(loaded);
    p5Font = '1nationalpark';
    otFont = await opentype.load('fonts/1nationalpark.ttf').catch(() => null);
  } catch(e) {
    console.warn('Font load failed, using fallback');
    p5Font = 'monospace';
    otFont = null;
  }
}

function fontFamily(idx) {
  return '1nationalpark';
}

// ── LEER PARÁMETROS ───────────────────────────────────────────────────────────
// Los valores de gráfica se leen de GFX (constante fija).
// Solo los controles de escala/tamaño/lienzo vienen del DOM.
function getP() {
  return {
    txt       : document.getElementById('inText').value.toUpperCase(),
    angle     : radians(parseFloat(document.getElementById('inAngle').value || GFX.angle)),
    rIn       : parseInt(document.getElementById('inRin').value),
    rOutBase  : GFX.rOutBase,
    jitter    : GFX.jitter,
    weight    : parseFloat(document.getElementById('inWeight').value),
    dash      : GFX.dash,
    showBalls : GFX.showBalls,
    ballSize  : parseInt(document.getElementById('inBallSize').value),
    fontSize  : parseInt(document.getElementById('inFontSize').value),
    linePad   : GFX.linePad,
    linesBack : GFX.linesBack,
    flipText  : document.getElementById('checkFlip').checked,
    ballStroke: GFX.ballStroke,
    colorBg   : GFX.colorBg,
    colorFg   : GFX.colorFg,
    colorBall : GFX.colorBall,
    colorBallB: GFX.colorBallB,
    altBall   : GFX.altBall,
    colorText : GFX.colorText,
  };
}

// ── CALCULAR RAYOS ────────────────────────────────────────────────────────────
function calcRays(p) {
  let steps = p.txt.length;
  if (steps === 0) return [];
  let txt    = p.flipText ? p.txt.split('').reverse().join('') : p.txt;
  let margin = p.showBalls
    ? (p.ballSize / 2 + p.weight + p.linePad)
    : (p.weight * 2 + 10 + p.linePad);
  randomSeed(jitterSeed);
  let jv = Array.from({length: steps}, () => random(-p.jitter, p.jitter));
  return jv.map((jit, i) => {
    let theta = steps > 1 ? map(i, 0, steps-1, -p.angle/2, p.angle/2) : 0;
    let fa    = theta + rotation;
    let rMax  = calcCollision(fa, margin);
    let rLine = min(p.rOutBase + jit, rMax);
    let rBMax = calcCollision(fa, p.showBalls ? p.ballSize/2 + p.weight : p.weight + 4);
    let rBall = min(rLine + p.linePad, rBMax);
    let isSpace = txt[i] === ' ';
    return {
      fa, rIn: p.rIn, rLine, rBall,
      lx: originX + cos(fa) * rBall,
      ly: originY + sin(fa) * rBall,
      letter: txt[i],
      skip: isSpace,
    };
  });
}

// ── COLISIÓN ──────────────────────────────────────────────────────────────────
function calcCollision(a, margin) {
  let dx = cos(a), dy = sin(a), t = Infinity;
  let x0 = bbX(), y0 = bbY();
  if (dx > 0) t = min(t, (x0 + bbW - margin - originX) / dx);
  if (dx < 0) t = min(t, (x0 + margin - originX) / dx);
  if (dy > 0) t = min(t, (y0 + bbH - margin - originY) / dy);
  if (dy < 0) t = min(t, (y0 + margin - originY) / dy);
  return max(0, t);
}

// ── CENTRADO TIPOGRÁFICO ──────────────────────────────────────────────────────
function getTypoOffset(fontSize) {
  let key = '1np_' + fontSize.toFixed(1);
  if (_tyCache[key] !== undefined) return _tyCache[key];
  let oc  = document.createElement('canvas');
  oc.width = oc.height = Math.ceil(fontSize * 2);
  let ctx = oc.getContext('2d');
  ctx.font = fontSize + 'px "1nationalpark"';
  let cap = ctx.measureText('H').actualBoundingBoxAscent || fontSize * 0.7;
  _tyCache[key] = cap / 2;
  return cap / 2;
}

// ── DRAW ──────────────────────────────────────────────────────────────────────
function draw() {
  let p = getP();

  background(40);

  let cx = width  / 2;
  let cy = height / 2;

  drawingContext.save();
  drawingContext.translate(cx, cy);
  drawingContext.scale(zoom, zoom);
  drawingContext.translate(-cx, -cy);

  let bx = bbX(), by = bbY();

  // Clip al bbox
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(bx, by, bbW, bbH);
  drawingContext.clip();

  // Fondo área de trabajo
  fill(p.colorBg);
  noStroke();
  rect(bx, by, bbW, bbH);

  if (p5Font) {
    let rays = calcRays(p);
    if (rays.length > 0) {
      let fs  = p.fontSize;
      let tyo = getTypoOffset(fs);
      if (p.linesBack) {
        rays.forEach(r => { if (!r.skip) doLine(r, p); });
        rays.forEach((r, i) => { if (!r.skip) doBall(r, p, fs, tyo, i); });
      } else {
        rays.forEach((r, i) => { if (!r.skip) { doLine(r, p); doBall(r, p, fs, tyo, i); } });
      }
    }
  }

  drawingContext.restore(); // quita el clip

  // Borde del bbox
  noFill();
  stroke(90);
  strokeWeight(1 / zoom);
  drawingContext.setLineDash([4 / zoom, 4 / zoom]);
  rect(bx, by, bbW, bbH);
  drawingContext.setLineDash([]);

  // Indicador de origen
  mouseIdleTimer++;
  let a = constrain(map(mouseIdleTimer, HIDE_AFTER*0.5, HIDE_AFTER, 220, 0), 0, 220);
  if (a > 0) {
    push();
    noFill();
    stroke(220, 50, 50, a);
    strokeWeight(1);
    drawingContext.setLineDash([3, 3]);
    ellipse(originX, originY, 12, 12);
    drawingContext.setLineDash([]);
    let s = 3.5;
    line(originX-s, originY, originX+s, originY);
    line(originX, originY-s, originX, originY+s);
    pop();
  }

  drawingContext.restore(); // quita el zoom
}

function doLine(r, p) {
  push();
  translate(originX, originY);
  rotate(r.fa);
  stroke(p.colorFg);
  strokeWeight(p.weight);
  strokeCap(ROUND);
  noFill();
  drawingContext.setLineDash([]);
  drawingContext.lineDashOffset = 0;
  line(r.rIn, 0, r.rLine, 0);
  pop();
}

function doBall(r, p, fs, tyo, idx) {
  push();
  translate(r.lx, r.ly);
  if (p.showBalls) {
    let bCol = (p.altBall && idx % 2 === 1) ? p.colorBallB : p.colorBall;
    fill(bCol);
    if (p.ballStroke) { stroke(p.colorFg); strokeWeight(p.weight); }
    else noStroke();
    ellipse(0, 0, p.ballSize, p.ballSize);
  }
  noStroke();
  drawingContext.font = fs + 'px "1nationalpark"';
  drawingContext.textAlign = 'center';
  drawingContext.textBaseline = 'alphabetic';
  drawingContext.fillStyle = p.colorText;
  drawingContext.fillText(r.letter, 0, tyo);
  pop();
}

// ── RATÓN ─────────────────────────────────────────────────────────────────────
function screenToWorld(sx, sy) {
  let cx = width  / 2;
  let cy = height / 2;
  return {
    x: (sx - cx) / zoom + cx,
    y: (sy - cy) / zoom + cy,
  };
}

function mouseMoved()  { mouseIdleTimer = 0; }

function mousePressed() {
  if (mouseX <= SIDEBAR_W) return;
  mouseIdleTimer = 0;
  let w = screenToWorld(mouseX, mouseY);
  if (dist(w.x, w.y, originX, originY) < 16 / zoom) {
    draggingOrigin = true;
  } else {
    draggingRotation = true;
    lastMouseAngle   = atan2(w.y - originY, w.x - originX);
  }
}

function mouseDragged() {
  mouseIdleTimer = 0;
  let w = screenToWorld(mouseX, mouseY);
  if (draggingOrigin) {
    originX = constrain(w.x, bbX() + 10, bbX() + bbW - 10);
    originY = constrain(w.y, bbY() + 10, bbY() + bbH - 10);
  } else if (draggingRotation) {
    let cur   = atan2(w.y - originY, w.x - originX);
    let delta = cur - lastMouseAngle;
    if (delta >  PI) delta -= TWO_PI;
    if (delta < -PI) delta += TWO_PI;
    rotation      += delta;
    lastMouseAngle  = cur;
  }
}

function mouseReleased() {
  draggingOrigin = draggingRotation = false;
}

// ── EXPORTAR SVG ──────────────────────────────────────────────────────────────
function saveSVG() {
  let p    = getP();
  let rays = calcRays(p);
  if (rays.length === 0) return;

  let fs  = p.fontSize;
  let tyo = getTypoOffset(fs);
  let W   = bbW, H = bbH;
  let ox  = bbX(), oy = bbY();
  let fg  = p.colorFg;
  let bg  = p.colorBg;
  let sw  = p.weight;

  let upm   = otFont ? otFont.unitsPerEm : 1;
  let scale = fs / upm;
  let hCapOffsetY = 0;
  if (otFont) {
    let hGlyph = otFont.charToGlyph('H');
    let hBB    = hGlyph.getBoundingBox();
    hCapOffsetY = (hBB.y2 * scale) / 2;
  }

  let ballR      = (p.ballSize / 2).toFixed(2);
  let ballStroke = p.ballStroke ? `stroke="${fg}" stroke-width="${sw}"` : `stroke="none"`;

  let svg = [];
  svg.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  svg.push(`  <rect width="${W}" height="${H}" fill="${bg}"/>`);

  rays.forEach((r, i) => {
    if (r.skip) return;
    svg.push(`  <g id="molecula-${i}">`);

    let x1 = (originX - ox + cos(r.fa)*r.rIn  ).toFixed(2);
    let y1 = (originY - oy + sin(r.fa)*r.rIn  ).toFixed(2);
    let x2 = (originX - ox + cos(r.fa)*r.rLine).toFixed(2);
    let y2 = (originY - oy + sin(r.fa)*r.rLine).toFixed(2);
    svg.push(`    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${fg}" stroke-width="${sw}" stroke-linecap="round" fill="none"/>`);

    if (p.showBalls) {
      let bFill = (p.altBall && i % 2 === 1) ? p.colorBallB : p.colorBall;
      svg.push(`    <circle cx="${(r.lx - ox).toFixed(2)}" cy="${(r.ly - oy).toFixed(2)}" r="${ballR}" fill="${bFill}" ${ballStroke}/>`);
    }

    if (otFont) {
      let glyph    = otFont.charToGlyph(r.letter);
      let pathData = glyph.getPath(0, 0, fs).toPathData(3);
      let bb       = glyph.getBoundingBox();
      let glyphW   = (bb.x2 - bb.x1) * scale;
      let offsetX  = -glyphW / 2 - bb.x1 * scale;
      let tx       = (r.lx - ox + offsetX).toFixed(2);
      let ty       = (r.ly - oy + hCapOffsetY).toFixed(2);
      svg.push(`    <path fill="${p.colorText}" transform="translate(${tx},${ty})" d="${pathData}"/>`);
    } else {
      let fam = fontFamily(currentFontIdx);
      svg.push(`    <text x="${(r.lx - ox).toFixed(2)}" y="${(r.ly - oy + tyo).toFixed(2)}" fill="${p.colorText}" font-size="${fs.toFixed(2)}" font-family="1nationalpark" text-anchor="middle">${esc(r.letter)}</text>`);
    }

    svg.push(`  </g>`);
  });

  svg.push(`</svg>`);

  let blob = new Blob([svg.join('\n')], {type:'image/svg+xml;charset=utf-8'});
  Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: 'polinizador_v4.0.svg',
  }).click();
}

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function readBBox() {
  let w = parseInt(document.getElementById('inBbW').value) || 770;
  let h = parseInt(document.getElementById('inBbH').value) || 1920;
  bbW = Math.max(100, Math.min(w, 4000));
  bbH = Math.max(100, Math.min(h, 4000));
}

function setZoom(v) {
  zoom = Math.max(0.1, Math.min(4, parseFloat(v) || 1));
  let sl  = document.getElementById('inZoom');
  let lbl = document.getElementById('vZoom');
  if (sl)  sl.value  = zoom;
  if (lbl) lbl.value = Math.round(zoom * 100) + '%';
}

function applyBBox() {
  readBBox();
  let bx = bbX(), by = bbY();
  originX = constrain(originX, bx + 10, bx + bbW - 10);
  originY = constrain(originY, by + 10, by + bbH - 10);
}

function newJitter()   { jitterSeed = Math.floor(millis()); }

function resetOrigin() {
  originX = bbX() + bbW / 2;
  originY = bbY() + bbH / 2;
}

function randomOrigin() {
  let m = 60;
  originX = bbX() + m + Math.random() * (bbW - m * 2);
  originY = bbY() + m + Math.random() * (bbH - m * 2);
  rotation = Math.random() * TWO_PI;
}

// ── TECLADO ───────────────────────────────────────────────────────────────────
window.addEventListener('keydown', function(e) {
  let tag = document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

  switch (e.key) {
    case 'j': case 'J': newJitter(); break;
    case 'r': case 'R': randomOrigin(); break;
    case 'c': case 'C': resetOrigin(); break;
    case 'i': case 'I': {
      let cb = document.getElementById('checkFlip');
      cb.checked = !cb.checked;
      break;
    }
    case 's': case 'S': saveSVG(); break;
    case 'z': case 'Z': setZoom(1); break;
    case '+': case '=': setZoom(zoom * 1.1); break;
    case '-': case '_': setZoom(zoom * 0.9); break;
    case 'ArrowLeft':
      e.preventDefault();
      rotation -= Math.PI / 180;
      break;
    case 'ArrowRight':
      e.preventDefault();
      rotation += Math.PI / 180;
      break;
  }
});

function mouseWheel(e) {
  if (mouseX <= SIDEBAR_W) return;
  let factor = e.delta > 0 ? 0.9 : 1.1;
  setZoom(zoom * factor);
  return false;
}

function windowResized() { resizeCanvas(windowWidth - SIDEBAR_W, windowHeight); }