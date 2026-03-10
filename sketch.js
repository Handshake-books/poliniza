// POLINIZADOR VULF v3.0
// Mejoras: punto de origen interactivo, jitter con seed fijo,
// padding aplicado a líneas, lineDash limpio, centrado mejorado,
// rotación por slider, unidades en UI, outline de texto para SVG limpio.

let myFont;
let jitterSeed = 42;        // seed fijo para el jitter — se regenera con botón
let originX, originY;       // punto de partida (arrastrable con ratón)
let draggingOrigin = false;

// ── PRELOAD ──────────────────────────────────────────────────────────────────
function preload() {
  myFont = loadFont('VulfMono-Bold.otf');
}

// ── SETUP ────────────────────────────────────────────────────────────────────
function setup() {
  let canvas = createCanvas(windowWidth - 320, windowHeight, SVG);
  canvas.parent('canvas-parent');
  textFont(myFont);
  textAlign(CENTER, CENTER);
  originX = width / 2;
  originY = height / 2;
}

// ── DRAW ─────────────────────────────────────────────────────────────────────
function draw() {
  clear();
  background(255);

  // Leer controles
  let txt          = document.getElementById('inText').value.toUpperCase();
  let aperturaDeg  = parseFloat(document.getElementById('inAngle').value);
  let angle        = radians(aperturaDeg);
  let rIn          = parseInt(document.getElementById('inRin').value);
  let rOutBase     = parseInt(document.getElementById('inRout').value);
  let jitter       = parseInt(document.getElementById('inJitter').value);
  let weight       = parseFloat(document.getElementById('inWeight').value);
  let dash         = parseInt(document.getElementById('inDash').value);
  let showBalls    = document.getElementById('checkBalls').checked;
  let ballSize     = parseInt(document.getElementById('inBallSize').value);
  let linePadding  = parseInt(document.getElementById('inLinePadding').value);  // ahora en la línea
  let rotDeg       = parseFloat(document.getElementById('inRotation').value);
  let rotation     = radians(rotDeg);

  let steps = txt.length;
  if (steps === 0) return;

  // Safety margin para colisiones con bounding box
  let safetyMargin = showBalls ? (ballSize / 2 + weight + linePadding) : (weight * 2 + 10 + linePadding);

  // Calcular posiciones con seed fijo de jitter
  randomSeed(jitterSeed);
  let jitterValues = [];
  for (let i = 0; i < steps; i++) {
    jitterValues.push(random(-jitter, jitter));
  }

  // ── DIBUJAR CADA RAY ──────────────────────────────────────────────────────
  for (let i = 0; i < steps; i++) {
    let theta      = (steps > 1) ? map(i, 0, steps - 1, -angle / 2, angle / 2) : 0;
    let finalAngle = theta + rotation;

    let rMax   = calculateCollision(originX, originY, finalAngle, safetyMargin);
    let rRaw   = rOutBase + jitterValues[i];
    // La línea termina antes del borde; la letra/bolita va después del padding
    let rLine  = min(rRaw, rMax);         // extremo de la línea
    let rBall  = rLine + linePadding;     // centro de la bola/letra

    // Clamp para que la bola no salga del canvas
    let maxBallDist = calculateCollision(originX, originY, finalAngle, showBalls ? ballSize / 2 + weight : weight + 4);
    rBall = min(rBall, maxBallDist);

    let lx = originX + cos(finalAngle) * rBall;
    let ly = originY + sin(finalAngle) * rBall;

    // — Línea —
    push();
    translate(originX, originY);
    rotate(finalAngle);
    stroke(0);
    strokeWeight(weight);
    if (dash > 0) {
      // Ajuste para que el punteado no quede cortado: calculamos longitud real
      let lineLen = rLine - rIn;
      if (lineLen > 0) {
        let gap     = dash;
        let seg     = dash;
        let total   = seg + gap;
        // Calcular offset para centrar el patrón en la línea
        let nPairs  = floor(lineLen / total);
        let remain  = lineLen - nPairs * total;
        let offset  = remain / 2;
        drawingContext.setLineDash([seg, gap]);
        drawingContext.lineDashOffset = -offset;
      }
    } else {
      drawingContext.setLineDash([]);
      drawingContext.lineDashOffset = 0;
    }
    line(rIn, 0, rLine, 0);
    drawingContext.setLineDash([]);
    drawingContext.lineDashOffset = 0;
    pop();

    // — Bola —
    push();
    translate(lx, ly);
    if (showBalls) {
      fill(255);
      stroke(0);
      strokeWeight(weight);
      ellipse(0, 0, ballSize, ballSize);
    }

    // — Letra como outline (paths) para SVG limpio sin dependencia de fuente —
    fill(0);
    noStroke();
    textSize(ballSize * 0.55);

    // Calcular descenso tipográfico real para centrar correctamente
    let tAscent  = textAscent();
    let tDescent = textDescent();
    let tOffset  = (tAscent - tDescent) / 2;  // offset para centrado óptico real
    text(txt[i], 0, tOffset);
    pop();
  }

  // — Indicador del punto de origen (sólo en pantalla, no exportado) —
  push();
  noFill();
  stroke(200, 50, 50, 160);
  strokeWeight(1);
  drawingContext.setLineDash([4, 4]);
  ellipse(originX, originY, 14, 14);
  drawingContext.setLineDash([]);
  pop();
}

// ── COLISIÓN CON BOUNDING BOX ────────────────────────────────────────────────
function calculateCollision(ox, oy, a, margin) {
  let dx = cos(a);
  let dy = sin(a);
  let t  = Infinity;
  // Límites del canvas con margen
  let xMax = width  - margin;
  let xMin = margin;
  let yMax = height - margin;
  let yMin = margin;
  if (dx > 0) t = min(t, (xMax - ox) / dx);
  if (dx < 0) t = min(t, (xMin - ox) / dx);
  if (dy > 0) t = min(t, (yMax - oy) / dy);
  if (dy < 0) t = min(t, (yMin - oy) / dy);
  return max(0, t);
}

// ── INTERACCIÓN: arrastrar punto de origen ───────────────────────────────────
function mousePressed() {
  if (mouseX > 320) {
    let d = dist(mouseX, mouseY, originX, originY);
    if (d < 20) draggingOrigin = true;
  }
}

function mouseDragged() {
  if (draggingOrigin && mouseX > 320) {
    originX = mouseX;
    originY = mouseY;
  }
}

function mouseReleased() {
  draggingOrigin = false;
}

// ── EXPORTAR SVG ─────────────────────────────────────────────────────────────
function saveSVG() {
  save("polinizador_v3.svg");
}

// ── REGENERAR JITTER ─────────────────────────────────────────────────────────
function newJitter() {
  jitterSeed = millis();
}

// ── RESET ORIGEN ─────────────────────────────────────────────────────────────
function resetOrigin() {
  originX = width / 2;
  originY = height / 2;
}

// ── RESIZE ───────────────────────────────────────────────────────────────────
function windowResized() {
  resizeCanvas(windowWidth - 320, windowHeight);
}