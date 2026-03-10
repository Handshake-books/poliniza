let myFont;
let seed = 0;
let currentRotation = 0;

function preload() {
  myFont = loadFont('VulfMono-Bold.otf');
}

function setup() {
  let canvas = createCanvas(windowWidth - 320, windowHeight, SVG);
  canvas.parent('canvas-parent');
  textFont(myFont);
  textAlign(CENTER, CENTER);
}

function draw() {
  clear();
  background(255);
  randomSeed(seed);

  // Rotación solo en el lienzo
  if (mouseIsPressed && mouseX > 320) {
    currentRotation = map(mouseX, 320, width, -PI, PI);
  }

  // Inputs
  let txt = document.getElementById('inText').value;
  let angle = radians(document.getElementById('inAngle').value);
  let rIn = parseInt(document.getElementById('inRin').value);
  let rOutBase = parseInt(document.getElementById('inRout').value);
  let weight = parseFloat(document.getElementById('inWeight').value);
  let dash = parseInt(document.getElementById('inDash').value);
  let jitter = parseInt(document.getElementById('inJitter').value);
  
  let useCollision = document.getElementById('checkCollision').checked;
  let showBalls = document.getElementById('checkBalls').checked;
  let ballSize = parseInt(document.getElementById('inBallSize').value);
  let letterPadding = parseInt(document.getElementById('inLetterPadding').value);

  let steps = txt.length;
  let centerX = width / 2;
  let centerY = height / 2;

  translate(centerX, centerY);

  for (let i = 0; i < steps; i++) {
    let theta = (steps > 1) ? map(i, 0, steps - 1, -angle/2, angle/2) : 0;
    let finalAngle = theta + currentRotation;
    
    // Determinación del largo de la línea
    let rFinal;
    if (useCollision) {
      rFinal = calculateCollision(finalAngle, centerX, centerY);
    } else {
      rFinal = rOutBase + random(-jitter, jitter);
    }

    // 1. Dibujo de la Línea
    push();
    rotate(finalAngle);
    stroke(0);
    strokeWeight(weight);
    if (dash > 0) drawingContext.setLineDash([dash, dash]);
    else drawingContext.setLineDash([]);
    
    line(rIn, 0, rFinal, 0);
    pop();

    // 2. Dibujo de Letra/Bola (Rotación Fija Robusta)
    // Calculamos posición exacta al final de la línea + padding
    let totalDist = rFinal + letterPadding;
    let lx = cos(finalAngle) * totalDist;
    let ly = sin(finalAngle) * totalDist;
    
    push();
    translate(lx, ly);
    // IMPORTANTE: NO rotamos el push, para que la letra herede 0 grados.
    
    if (showBalls) {
      fill(255);
      stroke(0);
      strokeWeight(1);
      drawingContext.setLineDash([]);
      ellipse(0, 0, ballSize, ballSize);
    }

    noStroke();
    fill(0);
    textSize(22);
    drawingContext.setLineDash([]);
    // Centrado óptico para Vulf Mono Bold
    text(txt[i % txt.length], 0, 5); 
    pop();
  }
}

// Función de colisión con bordes del lienzo
function calculateCollision(a, cx, cy) {
  let dx = cos(a);
  let dy = sin(a);
  let t = Infinity;
  
  if (dx > 0) t = min(t, (width/2) / dx);
  if (dx < 0) t = min(t, (-width/2) / dx);
  if (dy > 0) t = min(t, (height/2) / dy);
  if (dy < 0) t = min(t, (-height/2) / dy);
  
  return t;
}

function saveSVG() {
  save("vulf_master_v2.5.svg");
}

function resetRotation() {
  currentRotation = 0;
}

function keyPressed() {
  if (key === 'r' || key === 'R') seed = millis();
}

function windowResized() {
  resizeCanvas(windowWidth - 320, windowHeight);
}