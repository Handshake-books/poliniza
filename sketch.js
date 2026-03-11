let currentRotation = 0;
let jitterOffsets = [];
let originOffsetX = 0;
let originOffsetY = 0;
let textReversed = false;
let loadedFonts = {};   // { filename: p5.Font }
let currentFont = null;
let fontsIndex = [];

function preload() {
  // Cargar el índice de fuentes
  fontsIndex = loadJSON('fonts/index.json');
}

function setup() {
  let canvas = createCanvas(windowWidth - 320, windowHeight, SVG);
  canvas.parent('canvas-parent');
  textAlign(CENTER, CENTER);

  // Poblar el <select> con las fuentes del índice
  let sel = document.getElementById('inFont');
  sel.innerHTML = '';
  for (let fname of fontsIndex) {
    let opt = document.createElement('option');
    opt.value = fname;
    opt.textContent = fname.replace(/\.(otf|ttf)$/i, '');
    sel.appendChild(opt);
  }

  // Cargar la primera fuente por defecto
  if (fontsIndex.length > 0) {
    loadFontByName(fontsIndex[0]);
  }
}

function loadFontByName(fname) {
  if (loadedFonts[fname]) {
    currentFont = loadedFonts[fname];
    return;
  }
  // Mostrar indicador mientras carga
  document.getElementById('fontStatus').textContent = '⏳';
  loadFont('fonts/' + fname, function(f) {
    loadedFonts[fname] = f;
    currentFont = f;
    document.getElementById('fontStatus').textContent = '✓';
  }, function() {
    // Fallback si no carga: usar fuente del sistema
    currentFont = null;
    document.getElementById('fontStatus').textContent = '✗';
  });
}

function onFontChange() {
  let fname = document.getElementById('inFont').value;
  document.getElementById('fontStatus').textContent = '⏳';
  loadFontByName(fname);
}

function draw() {
  clear();
  background(255);

  let centerX = width / 2 + originOffsetX;
  let centerY = height / 2 + originOffsetY;

  if (mouseIsPressed && mouseX > 320) {
    currentRotation = atan2(mouseY - centerY, mouseX - centerX);
  }

  let rawTxt     = document.getElementById('inText').value;
  let txt        = textReversed ? rawTxt.split('').reverse().join('') : rawTxt;
  let angle      = radians(parseFloat(document.getElementById('inAngle').value));
  let rIn        = parseFloat(document.getElementById('inRin').value);
  let rOutBase   = parseFloat(document.getElementById('inRout').value);
  let jitter     = parseFloat(document.getElementById('inJitter').value);
  let weight     = parseFloat(document.getElementById('inWeight').value);
  let dash       = parseFloat(document.getElementById('inDash').value);
  let showBalls  = document.getElementById('checkBalls').checked;
  let ballSize   = parseFloat(document.getElementById('inBallSize').value);
  let letterSize = parseFloat(document.getElementById('inLetterSize').value);
  let lPad       = parseFloat(document.getElementById('inLetterPadding').value);

  let steps = txt.length;
  while (jitterOffsets.length < steps + 20) {
    jitterOffsets.push(Math.random() * 2 - 1);
  }

  // Pre-calcular posiciones
  let positions = [];
  for (let i = 0; i < steps; i++) {
    let theta = (steps > 1) ? map(i, 0, steps - 1, -angle / 2, angle / 2) : 0;
    let finalAngle = theta + currentRotation;
    let safetyMargin = showBalls ? (ballSize / 2 + weight + 2) : (weight * 2 + 10);
    let rConJitter = rOutBase + jitterOffsets[i % jitterOffsets.length] * jitter;
    let rMax = calculateCollision(centerX, centerY, finalAngle, safetyMargin);
    let rFinal = min(rConJitter, rMax);
    rFinal = max(rIn, rFinal);

    let lx = centerX + cos(finalAngle) * (rFinal + lPad);
    let ly = centerY + sin(finalAngle) * (rFinal + lPad);
    lx = constrain(lx, safetyMargin, width - safetyMargin);
    ly = constrain(ly, safetyMargin, height - safetyMargin);

    positions.push({ finalAngle, rFinal, lx, ly });
  }

  // PASO 1 — todas las líneas (detrás)
  for (let i = 0; i < steps; i++) {
    let { finalAngle, rFinal } = positions[i];
    if (rFinal > rIn) {
      push();
      translate(centerX, centerY);
      rotate(finalAngle);
      stroke(0); strokeWeight(weight);
      if (dash > 0) {
        drawingContext.setLineDash([dash, dash]);
        drawingContext.lineDashOffset = 0;
      } else {
        drawingContext.setLineDash([]);
      }
      line(rIn, 0, rFinal, 0);
      pop();
    }
  }

  // PASO 2 — bolas + letras (delante)
  for (let i = 0; i < steps; i++) {
    let { lx, ly } = positions[i];
    push();
    translate(lx, ly);
    drawingContext.setLineDash([]);
    if (showBalls) {
      fill(255); stroke(0); strokeWeight(weight);
      ellipse(0, 0, ballSize, ballSize);
    }
    noStroke(); fill(0);
    if (currentFont) textFont(currentFont);
    textSize(letterSize);
    text(txt[i], 0, letterSize * 0.04);
    pop();
  }
}

function calculateCollision(cx, cy, a, margin) {
  let dx = cos(a), dy = sin(a);
  let t = Infinity;
  if (dx > 0) t = min(t, (width  - margin - cx) / dx);
  if (dx < 0) t = min(t, (margin - cx) / dx);
  if (dy > 0) t = min(t, (height - margin - cy) / dy);
  if (dy < 0) t = min(t, (margin - cy) / dy);
  return max(0, t);
}

function randomizeAll() {
  jitterOffsets = Array.from({length: 60}, () => Math.random() * 2 - 1);
  currentRotation = Math.random() * TWO_PI;
  originOffsetX = (Math.random() * 2 - 1) * width  * 0.25;
  originOffsetY = (Math.random() * 2 - 1) * height * 0.25;
}

function randomizeJitter() {
  jitterOffsets = Array.from({length: 60}, () => Math.random() * 2 - 1);
}

function resetRotation() {
  currentRotation = 0;
  originOffsetX = 0;
  originOffsetY = 0;
}

function toggleReverse() {
  textReversed = !textReversed;
  let btn = document.getElementById('btnReverse');
  btn.textContent = textReversed ? '→ Izq→Der (ON)' : '← Der→Izq';
  btn.classList.toggle('active', textReversed);
}

function saveSVG() {
  save("polinizador_v3.svg");
}

function keyPressed() {
  if (document.activeElement.tagName === 'INPUT') return;
  if (key === 'r' || key === 'R') randomizeAll();
  if (key === 'j' || key === 'J') randomizeJitter();
}

function windowResized() {
  resizeCanvas(windowWidth - 320, windowHeight);
}