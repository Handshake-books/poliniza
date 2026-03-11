let seed = 42;
let currentRotation = 0;
let jitterOffsets = [];
let jitterSeed = 0;
let textReversed = false;

function setup() {
  let canvas = createCanvas(windowWidth - 320, windowHeight, SVG);
  canvas.parent('canvas-parent');
  textAlign(CENTER, CENTER);
}

function draw() {
  clear();
  background(255);
  randomSeed(seed + jitterSeed);

  let centerX = width / 2;
  let centerY = height / 2;

  if (mouseIsPressed && mouseX > 320) {
    currentRotation = atan2(mouseY - centerY, mouseX - centerX);
  }

  let rawTxt = document.getElementById('inText').value;
  let txt = textReversed ? rawTxt.split('').reverse().join('') : rawTxt;

  let angle         = radians(parseFloat(document.getElementById('inAngle').value));
  let rIn           = parseFloat(document.getElementById('inRin').value);
  let rOutBase      = parseFloat(document.getElementById('inRout').value);
  let jitter        = parseFloat(document.getElementById('inJitter').value);
  let weight        = parseFloat(document.getElementById('inWeight').value);
  let dash          = parseFloat(document.getElementById('inDash').value);
  let showBalls     = document.getElementById('checkBalls').checked;
  let ballSize      = parseFloat(document.getElementById('inBallSize').value);
  let letterPadding = parseFloat(document.getElementById('inLetterPadding').value);

  let steps = txt.length;

  while (jitterOffsets.length < steps) {
    jitterOffsets.push(Math.random() * 2 - 1);
  }

  // Pre-calcular posiciones
  let positions = [];
  for (let i = 0; i < steps; i++) {
    let theta = (steps > 1) ? map(i, 0, steps - 1, -angle / 2, angle / 2) : 0;
    let finalAngle = theta + currentRotation;
    let safetyMargin = showBalls ? (ballSize / 2 + weight) : (weight * 2 + 10);
    let rConJitter = rOutBase + jitterOffsets[i % jitterOffsets.length] * jitter;
    let rMax = calculateCollision(finalAngle, safetyMargin);
    let rFinal = min(rConJitter, rMax);
    rFinal = max(rIn, rFinal);

    let distWithPadding = rFinal + letterPadding;
    let lx = centerX + cos(finalAngle) * distWithPadding;
    let ly = centerY + sin(finalAngle) * distWithPadding;
    lx = constrain(lx, safetyMargin, width - safetyMargin);
    ly = constrain(ly, safetyMargin, height - safetyMargin);

    positions.push({ finalAngle, rFinal, lx, ly });
  }

  // === PASO 1: TODAS LAS LÍNEAS (siempre detrás) ===
  for (let i = 0; i < steps; i++) {
    let { finalAngle, rFinal } = positions[i];
    if (rFinal > rIn) {
      push();
      translate(centerX, centerY);
      rotate(finalAngle);
      stroke(0);
      strokeWeight(weight);
      if (dash > 0) {
        drawingContext.setLineDash([dash, dash]);
        drawingContext.lineDashOffset = 0;
      } else {
        drawingContext.setLineDash([]);
        drawingContext.lineDashOffset = 0;
      }
      line(rIn, 0, rFinal, 0);
      pop();
    }
  }

  // === PASO 2: TODAS LAS BOLAS + LETRAS (delante) ===
  for (let i = 0; i < steps; i++) {
    let { lx, ly } = positions[i];
    push();
    translate(lx, ly);
    if (showBalls) {
      fill(255);
      stroke(0);
      strokeWeight(weight);
      drawingContext.setLineDash([]);
      drawingContext.lineDashOffset = 0;
      ellipse(0, 0, ballSize, ballSize);
    }
    noStroke();
    fill(0);
    textSize(ballSize * 0.55);
    drawingContext.setLineDash([]);
    text(txt[i], 0, ballSize * 0.04);
    pop();
  }
}

function calculateCollision(a, margin) {
  let dx = cos(a);
  let dy = sin(a);
  let t = Infinity;
  let innerW = (width / 2) - margin;
  let innerH = (height / 2) - margin;
  if (dx > 0) t = min(t, innerW / dx);
  if (dx < 0) t = min(t, -innerW / dx);
  if (dy > 0) t = min(t, innerH / dy);
  if (dy < 0) t = min(t, -innerH / dy);
  return max(0, t);
}

function saveSVG() {
  save("polinizador_v3.svg");
}

function resetRotation() {
  currentRotation = 0;
}

function randomizeLayout() {
  jitterOffsets = [];
  let n = document.getElementById('inText').value.length + 20;
  for (let i = 0; i < n; i++) {
    jitterOffsets.push(Math.random() * 2 - 1);
  }
  currentRotation = Math.random() * TWO_PI;
  jitterSeed = millis();
}

function toggleReverse() {
  textReversed = !textReversed;
  let btn = document.getElementById('btnReverse');
  btn.textContent = textReversed ? '→ Izq a Der' : '← Der a Izq';
  btn.classList.toggle('active', textReversed);
}

function keyPressed() {
  if (document.activeElement.tagName === 'INPUT') return;
  if (key === 'r' || key === 'R') randomizeLayout();
}

function windowResized() {
  resizeCanvas(windowWidth - 320, windowHeight);
}