// POLINIZADOR VULF v3.2
// - SVG generado a mano: limpio, capas separadas, color editable en InDesign
// - Centrado tipográfico real via measureText offscreen
// - Rotación: arrastrar en canvas (fluido, delta-based)
// - Origen: arrastrar punto rojo (zona pequeña, prioridad sobre rotación)
// - Z-order toggle: líneas detrás o delante de bolas
// - Selector de fuentes cargadas en repo
// - Punto rojo NUNCA sale en el SVG exportado

// ── FUENTES DISPONIBLES ───────────────────────────────────────────────────────
// Añade aquí los archivos que tengas en el repo. El label es solo para la UI.
const FONTS = [
  { label: 'VulfMono Bold',        file: 'VulfMono-Bold.otf'         },
  { label: 'VulfMono Regular',     file: 'VulfMono-Regular.otf'      },
  { label: 'VulfMono Light Italic',file: 'VulfMono-LightItalic.otf'  },
];

let currentFontIdx  = 0;
let p5Font;
let jitterSeed      = 42;
let originX, originY;

let draggingOrigin   = false;
let draggingRotation = false;
let rotationAngle    = 0;
let lastMouseAngle   = 0;

let mouseIdleTimer   = 0;
const HIDE_AFTER     = 80;

// Cache de offset tipográfico por fuente+tamaño
let _tyCache = {};

// ── PRELOAD ───────────────────────────────────────────────────────────────────
function preload() {
  p5Font = loadFont(FONTS[currentFontIdx].file);
}

// ── SETUP ─────────────────────────────────────────────────────────────────────
function setup() {
  let canvas = createCanvas(windowWidth - 260, windowHeight);
  canvas.parent('canvas-parent');
  originX = width  / 2;
  originY = height / 2;
  buildFontSelector();
}

// ── SELECTOR DE FUENTES ───────────────────────────────────────────────────────
function buildFontSelector() {
  let sel = document.getElementById('fontSelect');
  FONTS.forEach((f, i) => {
    let opt       = document.createElement('option');
    opt.value     = i;
    opt.textContent = f.label;
    if (i === 0) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => {
    currentFontIdx = parseInt(sel.value);
    _tyCache = {};  // invalidar cache al cambiar fuente
    loadFont(FONTS[currentFontIdx].file, (f) => { p5Font = f; });
  });
}

// ── PARÁMETROS ────────────────────────────────────────────────────────────────
function getParams() {
  return {
    txt:         document.getElementById('inText').value.toUpperCase(),
    angle:       radians(parseFloat(document.getElementById('inAngle').value)),
    rIn:         parseInt(document.getElementById('inRin').value),
    rOutBase:    parseInt(document.getElementById('inRout').value),
    jitter:      parseInt(document.getElementById('inJitter').value),
    weight:      parseFloat(document.getElementById('inWeight').value),
    dash:        parseInt(document.getElementById('inDash').value),
    showBalls:   document.getElementById('checkBalls').checked,
    ballSize:    parseInt(document.getElementById('inBallSize').value),
    linePadding: parseInt(document.getElementById('inLinePadding').value),
    linesBack:   document.getElementById('checkLinesBack').checked,
  };
}

// ── CALCULAR POSICIONES ───────────────────────────────────────────────────────
function calcPositions(p) {
  let steps = p.txt.length;
  if (steps === 0) return [];

  let margin = p.showBalls
    ? (p.ballSize / 2 + p.weight + p.linePadding)
    : (p.weight * 2 + 10 + p.linePadding);

  randomSeed(jitterSeed);
  let jv = Array.from({length: steps}, () => random(-p.jitter, p.jitter));

  return jv.map((jitter, i) => {
    let theta  = steps > 1 ? map(i, 0, steps-1, -p.angle/2, p.angle/2) : 0;
    let fa     = theta + rotationAngle;
    let rMax   = calcCollision(fa, margin);
    let rLine  = min(p.rOutBase + jitter, rMax);
    let rBallMax = calcCollision(fa, p.showBalls ? p.ballSize/2 + p.weight : p.weight + 4);
    let rBall  = min(rLine + p.linePadding, rBallMax);
    return {
      fa,
      rIn:    p.rIn,
      rLine,
      rBall,
      lx: originX + cos(fa) * rBall,
      ly: originY + sin(fa) * rBall,
      letter: p.txt[i],
    };
  });
}

// ── CENTRADO TIPOGRÁFICO REAL ─────────────────────────────────────────────────
// Mide el bounding box real del glifo "M" (mayúscula representativa)
// usando un canvas 2D offscreen cargado con la misma fuente.
// Devuelve el offset Y desde el centro de la bola hasta la baseline,
// de forma que el centro óptico de la mayúscula quede en y=0.
function getTypoOffset(fontSize) {
  let key = FONTS[currentFontIdx].file + '_' + fontSize.toFixed(1);
  if (_tyCache[key] !== undefined) return _tyCache[key];

  let offCanvas = document.createElement('canvas');
  offCanvas.width  = fontSize * 2;
  offCanvas.height = fontSize * 2;
  let ctx = offCanvas.getContext('2d');

  // Cargar la misma fuente con @font-face si aún no está en el documento
  let fontFamily = FONTS[currentFontIdx].file.replace(/\.[^.]+$/, '');
  ctx.font = `${fontSize}px "${fontFamily}"`;

  let m          = ctx.measureText('H');  // H es la referencia de cap-height
  let capHeight  = m.actualBoundingBoxAscent;
  // Para que el centro de la H quede en y=0 al dibujar en BASELINE mode:
  // baseline estará en y=offset, centro de la H en y = offset - capHeight/2 = 0
  // → offset = capHeight / 2
  let offset = capHeight / 2;
  _tyCache[key] = offset;
  return offset;
}

// ── DRAW ──────────────────────────────────────────────────────────────────────
function draw() {
  clear();
  background(255);

  let p    = getParams();
  let rays = calcPositions(p);
  if (rays.length === 0) return;

  let fs       = p.ballSize * 0.55;
  let tyOffset = getTypoOffset(fs);

  if (p.linesBack) {
    rays.forEach(r => drawRayLine(r, p));
    rays.forEach(r => drawRayBall(r, p, fs, tyOffset));
  } else {
    rays.forEach(r => { drawRayLine(r, p); drawRayBall(r, p, fs, tyOffset); });
  }

  // Indicador origen — SOLO pantalla
  mouseIdleTimer++;
  if (mouseIdleTimer < HIDE_AFTER) {
    let a = constrain(map(mouseIdleTimer, HIDE_AFTER * 0.5, HIDE_AFTER, 220, 0), 0, 220);
    push();
    stroke(220, 40, 40, a);
    strokeWeight(1);
    noFill();
    drawingContext.setLineDash([3, 3]);
    ellipse(originX, originY, 12, 12);
    drawingContext.setLineDash([]);
    stroke(220, 40, 40, a);
    let s = 3.5;
    line(originX-s, originY, originX+s, originY);
    line(originX, originY-s, originX, originY+s);
    pop();
  }
}

function drawRayLine(r, p) {
  push();
  translate(originX, originY);
  rotate(r.fa);
  stroke(0); strokeWeight(p.weight); noFill();
  if (p.dash > 0) {
    let len    = r.rLine - r.rIn;
    let offset = len > 0 ? (len % (p.dash*2)) / 2 : 0;
    drawingContext.setLineDash([p.dash, p.dash]);
    drawingContext.lineDashOffset = -offset;
  } else {
    drawingContext.setLineDash([]);
    drawingContext.lineDashOffset = 0;
  }
  line(r.rIn, 0, r.rLine, 0);
  drawingContext.setLineDash([]);
  drawingContext.lineDashOffset = 0;
  pop();
}

function drawRayBall(r, p, fs, tyOffset) {
  push();
  translate(r.lx, r.ly);
  if (p.showBalls) {
    fill(255); stroke(0); strokeWeight(p.weight);
    ellipse(0, 0, p.ballSize, p.ballSize);
  }
  fill(0); noStroke();
  textFont(p5Font);
  textSize(fs);
  textAlign(CENTER, BASELINE);
  text(r.letter, 0, tyOffset);
  pop();
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

// ── RATÓN ─────────────────────────────────────────────────────────────────────
function mouseMoved() { mouseIdleTimer = 0; }

function mousePressed() {
  if (mouseX <= 260) return;
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
    rotationAngle += delta;
    lastMouseAngle = cur;
  }
}

function mouseReleased() {
  draggingOrigin = draggingRotation = false;
}

// ── EXPORTAR SVG ──────────────────────────────────────────────────────────────
// Genera SVG limpio a mano: 3 capas (lineas / bolas / letras),
// stroke/fill en negro puro → se puede recolorear en InDesign sin problema.
function saveSVG() {
  let p    = getParams();
  let rays = calcPositions(p);
  if (rays.length === 0) return;

  let fs       = p.ballSize * 0.55;
  let tyOffset = getTypoOffset(fs);
  let W = width, H = height;
  let fontFamily = FONTS[currentFontIdx].file.replace(/\.[^.]+$/, '');

  let svg = [];
  svg.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);

  // ── Capa líneas
  let sw  = p.weight;
  let da  = p.dash > 0 ? ` stroke-dasharray="${p.dash} ${p.dash}"` : '';
  svg.push(`  <g id="lineas" stroke="black" stroke-width="${sw}" fill="none">`);
  rays.forEach(r => {
    let x1 = (originX + cos(r.fa) * r.rIn ).toFixed(2);
    let y1 = (originY + sin(r.fa) * r.rIn ).toFixed(2);
    let x2 = (originX + cos(r.fa) * r.rLine).toFixed(2);
    let y2 = (originY + sin(r.fa) * r.rLine).toFixed(2);
    let dOff = '';
    if (p.dash > 0) {
      let len    = r.rLine - r.rIn;
      let offset = len > 0 ? -(len % (p.dash * 2)) / 2 : 0;
      dOff = ` stroke-dashoffset="${offset.toFixed(2)}"`;
    }
    svg.push(`    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${da}${dOff}/>`);
  });
  svg.push(`  </g>`);

  // ── Capa bolas
  if (p.showBalls) {
    svg.push(`  <g id="bolas" fill="white" stroke="black" stroke-width="${sw}">`);
    rays.forEach(r => {
      svg.push(`    <circle cx="${r.lx.toFixed(2)}" cy="${r.ly.toFixed(2)}" r="${(p.ballSize/2).toFixed(2)}"/>`);
    });
    svg.push(`  </g>`);
  }

  // ── Capa letras (text con font-family; al abrir en Illustrator: Texto > Crear contornos)
  svg.push(`  <g id="letras" fill="black" font-size="${fs.toFixed(2)}" font-family="${fontFamily}" text-anchor="middle">`);
  rays.forEach(r => {
    let tx = r.lx.toFixed(2);
    let ty = (r.ly + tyOffset).toFixed(2);
    svg.push(`    <text x="${tx}" y="${ty}">${escapeXML(r.letter)}</text>`);
  });
  svg.push(`  </g>`);

  svg.push(`</svg>`);

  let blob = new Blob([svg.join('\n')], {type: 'image/svg+xml;charset=utf-8'});
  let a    = Object.assign(document.createElement('a'), {
    href:     URL.createObjectURL(blob),
    download: 'polinizador_v3.2.svg',
  });
  a.click();
}

function escapeXML(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── JITTER / RESET ────────────────────────────────────────────────────────────
function newJitter()   { jitterSeed = millis(); }
function resetOrigin() { originX = width/2; originY = height/2; }

// ── RESIZE ────────────────────────────────────────────────────────────────────
function windowResized() { resizeCanvas(windowWidth - 260, windowHeight); }