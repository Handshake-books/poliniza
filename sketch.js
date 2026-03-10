// POLINIZADOR VULF v3.6
// Multi-spray: cada spray tiene texto, posición y rotación propios.
// El resto de parámetros son globales.
// Interacción: click en canvas selecciona spray más cercano,
// arrastrar origen (•) mueve, arrastrar fuera rota.

// ── ESTADO GLOBAL ─────────────────────────────────────────────────────────────
let FONTS          = [];
let currentFontIdx = 0;
let p5Font;
let _tyCache       = {};

// Array de sprays. Cada uno: { id, txt, ox, oy, rotation, jitterSeed }
let sprays         = [];
let selectedIdx    = 0;   // índice del spray activo
let nextId         = 1;

// Interacción
let draggingOrigin   = false;
let draggingRotation = false;
let lastMouseAngle   = 0;
let mouseIdleTimer   = 0;
const HIDE_AFTER     = 80;
const SIDEBAR_W      = 260;
const ORIGIN_HIT_R   = 16;  // radio de click para agarrar el origen

// ── PRELOAD ───────────────────────────────────────────────────────────────────
function preload() {}

// ── SETUP ─────────────────────────────────────────────────────────────────────
function setup() {
  let canvas = createCanvas(windowWidth - SIDEBAR_W, windowHeight);
  canvas.parent('canvas-parent');
  // Primer spray por defecto
  addSpray('POLINIZADOS', width / 2, height / 2);
  initFonts();
}

// ── SPRAYS ────────────────────────────────────────────────────────────────────
function addSpray(txt, ox, oy) {
  let s = {
    id:         nextId++,
    txt:        txt.toUpperCase(),
    ox:         ox,
    oy:         oy,
    rotation:   0,
    jitterSeed: Math.floor(Math.random() * 99999),
  };
  sprays.push(s);
  selectedIdx = sprays.length - 1;
  rebuildSprayList();
  return s;
}

function removeSpray(idx) {
  if (sprays.length <= 1) return;  // siempre debe quedar uno
  sprays.splice(idx, 1);
  selectedIdx = Math.min(selectedIdx, sprays.length - 1);
  rebuildSprayList();
}

function selectSpray(idx) {
  selectedIdx = idx;
  // Resaltar fila activa en el sidebar
  document.querySelectorAll('.spray-row').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });
}

// ── SIDEBAR: lista de sprays ──────────────────────────────────────────────────
function rebuildSprayList() {
  let container = document.getElementById('sprayList');
  container.innerHTML = '';
  sprays.forEach((s, i) => {
    let row = document.createElement('div');
    row.className = 'spray-row' + (i === selectedIdx ? ' active' : '');
    row.dataset.idx = i;

    // Input de texto
    let inp = document.createElement('input');
    inp.type      = 'text';
    inp.className = 'spray-txt';
    inp.value     = s.txt;
    inp.maxLength = 40;
    inp.addEventListener('input', () => {
      sprays[i].txt = inp.value.toUpperCase();
      inp.value = sprays[i].txt;
    });
    inp.addEventListener('mousedown', () => selectSpray(i));

    // Botón borrar
    let btn = document.createElement('button');
    btn.className   = 'del-btn';
    btn.textContent = '×';
    btn.title       = 'Eliminar spray';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeSpray(i);
    });

    // Clic en la fila → seleccionar
    row.addEventListener('mousedown', () => selectSpray(i));

    row.appendChild(inp);
    row.appendChild(btn);
    container.appendChild(row);
  });
}

// ── FUENTES ───────────────────────────────────────────────────────────────────
async function initFonts() {
  let sel = document.getElementById('fontSelect');
  sel.innerHTML = '';
  try {
    // Lee fonts/index.json — un array de nombres de archivo, p.ej:
    // ["VulfMono-Bold.otf", "OtraFuente.ttf"]
    let res   = await fetch('fonts/index.json');
    let files = await res.json();
    if (!Array.isArray(files) || files.length === 0) throw new Error('empty');
    FONTS = files.map(f => ({
      label: f.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
      file:  'fonts/' + f,
    }));
  } catch {
    // Fallback: VulfMono-Bold.otf en la raíz
    FONTS = [{ label: 'VulfMono Bold', file: 'VulfMono-Bold.otf' }];
  }
  FONTS.forEach((f, i) => {
    let opt = document.createElement('option');
    opt.value = i; opt.textContent = f.label;
    sel.appendChild(opt);
    let family = f.file.replace(/.*\//, '').replace(/\.[^.]+$/, '');
    new FontFace(family, `url(${f.file})`).load()
      .then(ff => document.fonts.add(ff)).catch(() => {});
  });
  sel.addEventListener('change', () => {
    currentFontIdx = parseInt(sel.value);
    _tyCache = {};
    loadFont(FONTS[currentFontIdx].file, f => { p5Font = f; });
  });
  loadFont(FONTS[0].file, f => { p5Font = f; });
}

// ── PARÁMETROS GLOBALES ───────────────────────────────────────────────────────
function getGlobal() {
  return {
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
    colorBg:     document.getElementById('inColorBg').value,
    colorFg:     document.getElementById('inColorFg').value,
  };
}

// ── CALCULAR RAYOS DE UN SPRAY ────────────────────────────────────────────────
function calcRays(spray, g) {
  let steps = spray.txt.length;
  if (steps === 0) return [];
  let margin = g.showBalls
    ? (g.ballSize / 2 + g.weight + g.linePadding)
    : (g.weight * 2 + 10 + g.linePadding);
  randomSeed(spray.jitterSeed);
  let jv = Array.from({length: steps}, () => random(-g.jitter, g.jitter));
  return jv.map((jit, i) => {
    let theta = steps > 1 ? map(i, 0, steps-1, -g.angle/2, g.angle/2) : 0;
    let fa    = theta + spray.rotation;
    let rMax  = calcCollision(spray.ox, spray.oy, fa, margin);
    let rLine = min(g.rOutBase + jit, rMax);
    let rBMax = calcCollision(spray.ox, spray.oy, fa,
                  g.showBalls ? g.ballSize/2 + g.weight : g.weight + 4);
    let rBall = min(rLine + g.linePadding, rBMax);
    return {
      fa, rIn: g.rIn, rLine, rBall,
      lx: spray.ox + cos(fa) * rBall,
      ly: spray.oy + sin(fa) * rBall,
      letter: spray.txt[i],
    };
  });
}

// ── COLISIÓN BOUNDING BOX ─────────────────────────────────────────────────────
function calcCollision(ox, oy, a, margin) {
  let dx = cos(a), dy = sin(a), t = Infinity;
  if (dx > 0) t = min(t, (width  - margin - ox) / dx);
  if (dx < 0) t = min(t, (margin - ox) / dx);
  if (dy > 0) t = min(t, (height - margin - oy) / dy);
  if (dy < 0) t = min(t, (margin - oy) / dy);
  return max(0, t);
}

// ── CENTRADO TIPOGRÁFICO ──────────────────────────────────────────────────────
function getTypoOffset(fontSize) {
  if (!FONTS.length) return fontSize * 0.18;
  let key = FONTS[currentFontIdx].file + '_' + fontSize.toFixed(1);
  if (_tyCache[key] !== undefined) return _tyCache[key];
  let oc  = document.createElement('canvas');
  oc.width = oc.height = fontSize * 2;
  let ctx  = oc.getContext('2d');
  let fam  = FONTS[currentFontIdx].file.replace(/.*\//, '').replace(/\.[^.]+$/, '');
  ctx.font = `${fontSize}px "${fam}"`;
  let cap  = ctx.measureText('H').actualBoundingBoxAscent;
  _tyCache[key] = cap / 2;
  return cap / 2;
}

// ── DRAW ──────────────────────────────────────────────────────────────────────
function draw() {
  clear();
  background(g.colorBg);
  if (!p5Font || sprays.length === 0) return;

  let g        = getGlobal();
  let fs       = g.ballSize * 0.55;
  let tyOffset = getTypoOffset(fs);

  // Calcular todos los rayos primero (necesario para z-order global)
  let allRays = sprays.map(s => calcRays(s, g));

  if (g.linesBack) {
    // Todas las líneas primero, todas las bolas encima
    allRays.forEach((rays, si) => rays.forEach(r => drawLine(r, g, sprays[si])));
    allRays.forEach((rays, si) => rays.forEach(r => drawBall(r, g, fs, tyOffset, sprays[si])));
  } else {
    allRays.forEach((rays, si) => {
      rays.forEach(r => { drawLine(r, g, sprays[si]); drawBall(r, g, fs, tyOffset, sprays[si]); });
    });
  }

  // Indicadores de origen — todos los sprays, el seleccionado más visible
  mouseIdleTimer++;
  sprays.forEach((s, i) => {
    let isSelected = (i === selectedIdx);
    let baseAlpha  = isSelected ? 220 : 100;
    let a = mouseIdleTimer < HIDE_AFTER
      ? constrain(map(mouseIdleTimer, HIDE_AFTER*0.5, HIDE_AFTER, baseAlpha, 0), 0, baseAlpha)
      : 0;
    if (a <= 0) return;
    push();
    stroke(isSelected ? color(220,40,40,a) : color(120,120,180,a));
    strokeWeight(isSelected ? 1.2 : 0.8);
    noFill();
    drawingContext.setLineDash([3,3]);
    ellipse(s.ox, s.oy, 12, 12);
    drawingContext.setLineDash([]);
    let sv = isSelected ? 4 : 2.5;
    line(s.ox-sv, s.oy, s.ox+sv, s.oy);
    line(s.ox, s.oy-sv, s.ox, s.oy+sv);
    pop();
  });
}

// ── DIBUJAR LÍNEA ─────────────────────────────────────────────────────────────
function drawLine(r, g, spray) {
  push();
  translate(spray.ox, spray.oy);
  rotate(r.fa);
  stroke(g.colorFg); strokeWeight(g.weight); noFill();
  if (g.dash > 0) {
    let len    = r.rLine - r.rIn;
    let offset = len > 0 ? (len % (g.dash*2)) / 2 : 0;
    drawingContext.setLineDash([g.dash, g.dash]);
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

// ── DIBUJAR BOLA + LETRA ──────────────────────────────────────────────────────
function drawBall(r, g, fs, tyOffset, spray) {
  push();
  translate(r.lx, r.ly);
  if (g.showBalls) {
    fill(g.colorBg); stroke(g.colorFg); strokeWeight(g.weight);
    ellipse(0, 0, g.ballSize, g.ballSize);
  }
  fill(g.colorFg); noStroke();
  textFont(p5Font); textSize(fs); textAlign(CENTER, BASELINE);
  text(r.letter, 0, tyOffset);
  pop();
}

// ── INTERACCIÓN CON RATÓN ─────────────────────────────────────────────────────
function mouseMoved() { mouseIdleTimer = 0; }

function mousePressed() {
  if (mouseX <= SIDEBAR_W) return;
  mouseIdleTimer = 0;

  // 1. ¿Estamos sobre el origen de algún spray? (prioridad al seleccionado)
  let ordered = [selectedIdx, ...sprays.map((_,i)=>i).filter(i=>i!==selectedIdx)];
  for (let i of ordered) {
    let s = sprays[i];
    if (dist(mouseX, mouseY, s.ox, s.oy) < ORIGIN_HIT_R) {
      selectSpray(i);
      draggingOrigin = true;
      return;
    }
  }

  // 2. ¿Click cerca de un origen no seleccionado? → seleccionar
  for (let i = 0; i < sprays.length; i++) {
    let s = sprays[i];
    if (dist(mouseX, mouseY, s.ox, s.oy) < ORIGIN_HIT_R * 2.5) {
      selectSpray(i);
      return;
    }
  }

  // 3. Arrastrar en canvas abierto → rotar spray seleccionado
  draggingRotation = true;
  let s = sprays[selectedIdx];
  lastMouseAngle = atan2(mouseY - s.oy, mouseX - s.ox);
}

function mouseDragged() {
  mouseIdleTimer = 0;
  let s = sprays[selectedIdx];
  if (!s) return;

  if (draggingOrigin) {
    s.ox = constrain(mouseX, 20, width  - 20);
    s.oy = constrain(mouseY, 20, height - 20);
  } else if (draggingRotation) {
    let cur   = atan2(mouseY - s.oy, mouseX - s.ox);
    let delta = cur - lastMouseAngle;
    if (delta >  PI) delta -= TWO_PI;
    if (delta < -PI) delta += TWO_PI;
    s.rotation    += delta;
    lastMouseAngle  = cur;
  }
}

function mouseReleased() {
  draggingOrigin = draggingRotation = false;
}

// ── EXPORTAR SVG ──────────────────────────────────────────────────────────────
function saveSVG() {
  if (!sprays.length) return;
  let g        = getGlobal();
  let fs       = g.ballSize * 0.55;
  let tyOffset = getTypoOffset(fs);
  let W = width, H = height;
  let fontFamily = FONTS.length
    ? FONTS[currentFontIdx].file.replace(/.*\//, '').replace(/\.[^.]+$/, '')
    : 'sans-serif';

  let svg = [];
  svg.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);

  let sw = g.weight;
  let da = g.dash > 0 ? ` stroke-dasharray="${g.dash} ${g.dash}"` : '';
  let fg = g.colorFg;
  let bg = g.colorBg;

  // Fondo
  svg.push(`  <rect width="${W}" height="${H}" fill="${bg}"/>`);

  // Capa líneas — todos los sprays
  svg.push(`  <g id="lineas" stroke="${fg}" stroke-width="${sw}" fill="none">`);
  sprays.forEach(spray => {
    let rays = calcRays(spray, g);
    rays.forEach(r => {
      let x1 = (spray.ox + cos(r.fa)*r.rIn ).toFixed(2);
      let y1 = (spray.oy + sin(r.fa)*r.rIn ).toFixed(2);
      let x2 = (spray.ox + cos(r.fa)*r.rLine).toFixed(2);
      let y2 = (spray.oy + sin(r.fa)*r.rLine).toFixed(2);
      let dOff = g.dash > 0
        ? ` stroke-dashoffset="${(-(r.rLine-r.rIn)%(g.dash*2)/2).toFixed(2)}"`
        : '';
      svg.push(`    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${da}${dOff}/>`);
    });
  });
  svg.push(`  </g>`);

  // Capa bolas — todos los sprays
  if (g.showBalls) {
    svg.push(`  <g id="bolas" fill="${bg}" stroke="${fg}" stroke-width="${sw}">`);    sprays.forEach(spray => {
      calcRays(spray, g).forEach(r => {
        svg.push(`    <circle cx="${r.lx.toFixed(2)}" cy="${r.ly.toFixed(2)}" r="${(g.ballSize/2).toFixed(2)}"/>`);
      });
    });
    svg.push(`  </g>`);
  }

  // Capa letras — todos los sprays
  svg.push(`  <g id="letras" fill="${fg}" font-size="${fs.toFixed(2)}" font-family="${fontFamily}" text-anchor="middle">`);
  sprays.forEach(spray => {
    calcRays(spray, g).forEach(r => {
      svg.push(`    <text x="${r.lx.toFixed(2)}" y="${(r.ly+tyOffset).toFixed(2)}">${escapeXML(r.letter)}</text>`);
    });
  });
  svg.push(`  </g>`);

  svg.push(`</svg>`);

  let blob = new Blob([svg.join('\n')], {type:'image/svg+xml;charset=utf-8'});
  Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob), download: 'polinizador_v3.6.svg'
  }).click();
}

function escapeXML(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── ACCIONES GLOBALES ─────────────────────────────────────────────────────────
function addNewSpray() {
  addSpray('TEXTO', width/2, height/2);
}

function newJitter() {
  if (sprays[selectedIdx]) sprays[selectedIdx].jitterSeed = Math.floor(millis());
}

function resetOrigin() {
  if (sprays[selectedIdx]) {
    sprays[selectedIdx].ox = width  / 2;
    sprays[selectedIdx].oy = height / 2;
  }
}

// ── RESIZE ────────────────────────────────────────────────────────────────────
function windowResized() { resizeCanvas(windowWidth - SIDEBAR_W, windowHeight); }