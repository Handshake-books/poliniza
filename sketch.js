// POLINIZADOR v3.7
// Un solo spray. Fuentes desde fonts/index.json. Color picker bg/fg.
// Arrastrar • rojo → mueve origen. Arrastrar canvas → rota.

const SIDEBAR_W  = 268;
const HIDE_AFTER = 80;

// ── Fuentes ───────────────────────────────────────────────────────────────────
let FONTS          = [];
let currentFontIdx = 0;
let p5Font         = null;   // nombre CSS para renderizado en canvas
let otFont         = null;   // objeto opentype.Font para exportar paths
let _tyCache       = {};

// ── Estado del spray ──────────────────────────────────────────────────────────
let originX, originY;
let rotation     = 0;
let jitterSeed   = 42;

// ── Interacción ───────────────────────────────────────────────────────────────
let draggingOrigin   = false;
let draggingRotation = false;
let lastMouseAngle   = 0;
let mouseIdleTimer   = 0;

// ── PRELOAD (vacío — fuentes se cargan async) ─────────────────────────────────
function preload() {}

// ── SETUP ─────────────────────────────────────────────────────────────────────
function setup() {
  let canvas = createCanvas(windowWidth - SIDEBAR_W, windowHeight);
  canvas.parent('canvas-parent');
  originX = width  / 2;
  originY = height / 2;
  initFonts();
}

// ── CARGA DE FUENTES ──────────────────────────────────────────────────────────
// Usa FontFace nativo — evita los problemas de timing de loadFont() de p5.
// p5Font guarda el nombre CSS de la familia, no un objeto p5.Font.
// El renderizado usa drawingContext.font directamente.

let fontLoadPromises = [];

async function initFonts() {
  let sel = document.getElementById('fontSelect');

  try {
    let res   = await fetch('fonts/index.json');
    let files = await res.json();
    if (!Array.isArray(files) || files.length === 0) throw new Error('empty');
    FONTS = files.map(f => ({
      label  : f.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
      file   : 'fonts/' + f,
      family : f.replace(/\.[^.]+$/, ''),
    }));
  } catch {
    FONTS = [{ label: 'VulfMono Bold', file: 'VulfMono-Bold.otf', family: 'VulfMono-Bold' }];
  }

  // Registrar todas con FontFace (para canvas) y opentype (para SVG export)
  fontLoadPromises = FONTS.map(f => {
    let ff = new FontFace(f.family, `url(${f.file})`);
    let cssP = ff.load().then(loaded => { document.fonts.add(loaded); return true; })
                        .catch(() => false);
    // También parsear con opentype.js para poder exportar paths
    let otP = opentype.load(f.file).then(font => { f.otFont = font; })
                                    .catch(() => {});
    return Promise.all([cssP, otP]);
  });

  // Esperar primera fuente antes de arrancar
  await fontLoadPromises[0];
  p5Font = FONTS[0].family;
  otFont = FONTS[0].otFont || null;

  // Pueblar select
  sel.innerHTML = '';
  FONTS.forEach((f, i) => {
    let opt = document.createElement('option');
    opt.value = i;
    opt.textContent = f.label;
    sel.appendChild(opt);
  });

  sel.addEventListener('change', async () => {
    let i = parseInt(sel.value);
    await fontLoadPromises[i];
    currentFontIdx = i;
    _tyCache = {};
    p5Font = FONTS[i].family;
    otFont = FONTS[i].otFont || null;
  });
}

function fontFamily(idx) {
  return (FONTS.length && FONTS[idx]) ? FONTS[idx].family : 'monospace';
}

// ── LEER PARÁMETROS ───────────────────────────────────────────────────────────
function getP() {
  return {
    txt        : document.getElementById('inText').value.toUpperCase(),
    angle      : radians(parseFloat(document.getElementById('inAngle').value)),
    rIn        : parseInt(document.getElementById('inRin').value),
    rOutBase   : parseInt(document.getElementById('inRout').value),
    jitter     : parseInt(document.getElementById('inJitter').value),
    weight     : parseFloat(document.getElementById('inWeight').value),
    dash       : parseInt(document.getElementById('inDash').value),
    showBalls  : document.getElementById('checkBalls').checked,
    ballSize   : parseInt(document.getElementById('inBallSize').value),
    linePad    : parseInt(document.getElementById('inLinePad').value),
    linesBack  : document.getElementById('checkLinesBack').checked,
    colorBg    : document.getElementById('inColorBg').value,
    colorFg    : document.getElementById('inColorFg').value,
  };
}

// ── CALCULAR RAYOS ────────────────────────────────────────────────────────────
function calcRays(p) {
  let steps = p.txt.length;
  if (steps === 0) return [];
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
    return {
      fa, rIn: p.rIn, rLine, rBall,
      lx: originX + cos(fa) * rBall,
      ly: originY + sin(fa) * rBall,
      letter: p.txt[i],
    };
  });
}

// ── COLISIÓN ──────────────────────────────────────────────────────────────────
function calcCollision(a, margin) {
  let dx = cos(a), dy = sin(a), t = Infinity;
  if (dx > 0) t = min(t, (width  - margin - originX) / dx);
  if (dx < 0) t = min(t, (margin - originX) / dx);
  if (dy > 0) t = min(t, (height - margin - originY) / dy);
  if (dy < 0) t = min(t, (margin - originY) / dy);
  return max(0, t);
}

// ── CENTRADO TIPOGRÁFICO ──────────────────────────────────────────────────────
function getTypoOffset(fontSize) {
  if (!FONTS.length) return fontSize * 0.18;
  let key = currentFontIdx + '_' + fontSize.toFixed(1);
  if (_tyCache[key] !== undefined) return _tyCache[key];
  let oc  = document.createElement('canvas');
  oc.width = oc.height = Math.ceil(fontSize * 2);
  let ctx = oc.getContext('2d');
  ctx.font = `${fontSize}px "${fontFamily(currentFontIdx)}"`;
  let cap = ctx.measureText('H').actualBoundingBoxAscent || fontSize * 0.7;
  _tyCache[key] = cap / 2;
  return cap / 2;
}

// ── DRAW ──────────────────────────────────────────────────────────────────────
function draw() {
  let p = getP();
  background(p.colorBg);
  if (!p5Font) return;

  let rays = calcRays(p);
  if (rays.length === 0) return;

  let fs  = p.ballSize * 0.55;
  let tyo = getTypoOffset(fs);

  if (p.linesBack) {
    rays.forEach(r => doLine(r, p));
    rays.forEach(r => doBall(r, p, fs, tyo));
  } else {
    rays.forEach(r => { doLine(r, p); doBall(r, p, fs, tyo); });
  }

  // Indicador de origen — sólo en pantalla
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
}

function doLine(r, p) {
  push();
  translate(originX, originY);
  rotate(r.fa);
  stroke(p.colorFg);
  strokeWeight(p.weight);
  noFill();
  if (p.dash > 0) {
    let len = r.rLine - r.rIn;
    let off = len > 0 ? (len % (p.dash * 2)) / 2 : 0;
    drawingContext.setLineDash([p.dash, p.dash]);
    drawingContext.lineDashOffset = -off;
  } else {
    drawingContext.setLineDash([]);
    drawingContext.lineDashOffset = 0;
  }
  line(r.rIn, 0, r.rLine, 0);
  drawingContext.setLineDash([]);
  drawingContext.lineDashOffset = 0;
  pop();
}

function doBall(r, p, fs, tyo) {
  push();
  translate(r.lx, r.ly);
  if (p.showBalls) {
    fill(p.colorBg);
    stroke(p.colorFg);
    strokeWeight(p.weight);
    ellipse(0, 0, p.ballSize, p.ballSize);
  }
  // Usar drawingContext directamente para renderizar con FontFace nativo
  noStroke();
  fill(p.colorFg);
  drawingContext.font = `${fs}px "${p5Font || 'monospace'}"`;
  drawingContext.textAlign = 'center';
  drawingContext.textBaseline = 'alphabetic';
  drawingContext.fillStyle = p.colorFg;
  drawingContext.fillText(r.letter, 0, tyo);
  pop();
}

// ── RATÓN ─────────────────────────────────────────────────────────────────────
function mouseMoved()  { mouseIdleTimer = 0; }

function mousePressed() {
  if (mouseX <= SIDEBAR_W) return;
  mouseIdleTimer = 0;
  if (dist(mouseX, mouseY, originX, originY) < 16) {
    draggingOrigin = true;
  } else {
    draggingRotation = true;
    lastMouseAngle   = atan2(mouseY - originY, mouseX - originX);
  }
}

function mouseDragged() {
  mouseIdleTimer = 0;
  if (draggingOrigin) {
    originX = constrain(mouseX, 20, width  - 20);
    originY = constrain(mouseY, 20, height - 20);
  } else if (draggingRotation) {
    let cur   = atan2(mouseY - originY, mouseX - originX);
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
  let p   = getP();
  let rays = calcRays(p);
  if (rays.length === 0) return;

  let fs  = p.ballSize * 0.55;
  let tyo = getTypoOffset(fs);
  let W   = width, H = height;
  let fam = FONTS.length ? fontFamily(currentFontIdx) : 'sans-serif';
  let fg  = p.colorFg;
  let bg  = p.colorBg;
  let sw  = p.weight;
  let da  = p.dash > 0 ? ` stroke-dasharray="${p.dash} ${p.dash}"` : '';

  let svg = [];
  svg.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  svg.push(`  <rect width="${W}" height="${H}" fill="${bg}"/>`);

  svg.push(`  <g id="lineas" stroke="${fg}" stroke-width="${sw}" fill="none">`);
  rays.forEach(r => {
    let x1  = (originX + cos(r.fa)*r.rIn ).toFixed(2);
    let y1  = (originY + sin(r.fa)*r.rIn ).toFixed(2);
    let x2  = (originX + cos(r.fa)*r.rLine).toFixed(2);
    let y2  = (originY + sin(r.fa)*r.rLine).toFixed(2);
    let dof = p.dash > 0
      ? ` stroke-dashoffset="${(-(r.rLine-r.rIn) % (p.dash*2) / 2).toFixed(2)}"`
      : '';
    svg.push(`    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${da}${dof}/>`);
  });
  svg.push(`  </g>`);

  if (p.showBalls) {
    svg.push(`  <g id="bolas" fill="${bg}" stroke="${fg}" stroke-width="${sw}">`);
    rays.forEach(r => {
      svg.push(`    <circle cx="${r.lx.toFixed(2)}" cy="${r.ly.toFixed(2)}" r="${(p.ballSize/2).toFixed(2)}"/>`);
    });
    svg.push(`  </g>`);
  }

  // ── Capa letras: paths expandidos si opentype está disponible, <text> como fallback
  if (otFont) {
    // Escala: opentype trabaja en unidades de fuente (UPM), hay que escalar a px
    let upm      = otFont.unitsPerEm;
    let scale    = fs / upm;
    svg.push(`  <g id="letras" fill="${fg}">`);
    rays.forEach(r => {
      let glyph = otFont.charToGlyph(r.letter);
      let path  = glyph.getPath(0, 0, fs);   // x=0,y=0 — luego translatemos
      // Calcular offset de centrado (cap-height del glifo 'H')
      let hGlyph  = otFont.charToGlyph('H');
      let hBB     = hGlyph.getBoundingBox();
      let capH    = hBB.y2 * scale;
      let offsetY = capH / 2;
      let tx = r.lx.toFixed(2);
      let ty = (r.ly + offsetY).toFixed(2);
      // Obtener el path data y aplicar transform de posición
      let pathData = path.toPathData(3);
      // Centrar horizontalmente: medir ancho del glifo
      let bb    = glyph.getBoundingBox();
      let glyphW = (bb.x2 - bb.x1) * scale;
      let offsetX = -glyphW / 2 - bb.x1 * scale;
      svg.push(`    <path transform="translate(${(r.lx + offsetX).toFixed(2)},${ty})" d="${pathData}"/>`);
    });
    svg.push(`  </g>`);
  } else {
    // Fallback: <text> con font-family (requiere fuente instalada)
    let fam = fontFamily(currentFontIdx);
    svg.push(`  <g id="letras" fill="${fg}" font-size="${fs.toFixed(2)}" font-family="${fam}" text-anchor="middle">`);
    rays.forEach(r => {
      svg.push(`    <text x="${r.lx.toFixed(2)}" y="${(r.ly+tyo).toFixed(2)}">${esc(r.letter)}</text>`);
    });
    svg.push(`  </g>`);
  }
  svg.push(`</svg>`);

  let blob = new Blob([svg.join('\n')], {type:'image/svg+xml;charset=utf-8'});
  Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: 'polinizador_v3.7.svg',
  }).click();
}

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function newJitter()   { jitterSeed = Math.floor(millis()); }

function resetOrigin() {
  originX = width / 2;
  originY = height / 2;
}

function randomOrigin() {
  // Posición aleatoria dentro del canvas con margen
  let m = 60;
  originX = m + Math.random() * (width  - m * 2);
  originY = m + Math.random() * (height - m * 2);
  // Ángulo aleatorio completo
  rotation = Math.random() * TWO_PI;
}

// ── TECLADO — listener nativo (no depende del foco del canvas) ────────────────
window.addEventListener('keydown', function(e) {
  // No actuar si el foco está en un input, select o textarea
  let tag = document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

  switch (e.key) {
    case 'j': case 'J': newJitter(); break;
    case 'r': case 'R': randomOrigin(); break;
    case 'c': case 'C': resetOrigin(); break;
    case 's': case 'S': saveSVG(); break;

    case 'ArrowLeft':
      e.preventDefault();
      rotation -= Math.PI / 180;
      break;
    case 'ArrowRight':
      e.preventDefault();
      rotation += Math.PI / 180;
      break;

    case 'ArrowUp': {
      e.preventDefault();
      let sl = document.getElementById('inRout');
      sl.value = Math.min(parseInt(sl.value) + 10, parseInt(sl.max));
      sl.dispatchEvent(new Event('input'));
      break;
    }
    case 'ArrowDown': {
      e.preventDefault();
      let sl = document.getElementById('inRout');
      sl.value = Math.max(parseInt(sl.value) - 10, parseInt(sl.min));
      sl.dispatchEvent(new Event('input'));
      break;
    }
  }
});

function windowResized() { resizeCanvas(windowWidth - SIDEBAR_W, windowHeight); }