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

  let centerX = width / 2;
  let centerY = height / 2;

  if (mouseIsPressed && mouseX > 320) {
    currentRotation = atan2(mouseY - centerY, mouseX - centerX);
  }

  let txt = document.getElementById('inText').value;
  let angle = radians(document.getElementById('inAngle').value);
  let rIn = parseInt(document.getElementById('inRin').value);
  let rOutBase = parseInt(document.getElementById('inRout').value);
  let jitter = parseInt(document.getElementById('inJitter').value);
  let weight = parseFloat(document.getElementById('inWeight').value);
  let dash = parseInt(document.getElementById('inDash').value);
  let showBalls = document.getElementById('checkBalls').checked;
  let ballSize = parseInt(document.getElementById('inBallSize').value);
  let letterPadding = parseInt(document.getElementById('inLetterPadding').value);

  let steps = txt.length;

  for (let i = 0; i < steps; i++) {
    let theta = (steps > 1) ? map(i, 0, steps - 1, -angle/2, angle/2) : 0;
    let finalAngle = theta + currentRotation;
    
    let safetyMargin = showBalls ? (ballSize/2 + weight) : (weight * 2 + 10);
    
    // Aplicamos Jitter al largo base antes de calcular la colisión
    let rConJitter = rOutBase + random(-jitter, jitter);
    let rMax = calculateCollision(finalAngle, safetyMargin);
    
    // El radio final respeta el choque con el borde
    let rFinal = min(rConJitter, rMax);

    // 1. LÍNEA
    push();
    translate(centerX, centerY);
    rotate(finalAngle);
    stroke(0);
    strokeWeight(weight);
    if (dash > 0) drawingContext.setLineDash([dash, dash]);
    else drawingContext.setLineDash([]);
    line(rIn, 0, rFinal, 0);
    pop();

    // 2. LETRA / BOLA (Vertical fija)
    let distWithPadding = rFinal + letterPadding;
    let lx = centerX + cos(finalAngle) * distWithPadding;
    let ly = centerY + sin(finalAngle) * distWithPadding;
    
    lx = constrain(lx, safetyMargin, width - safetyMargin);
    ly = constrain(ly, safetyMargin, height - safetyMargin);

    push();
    translate(lx, ly);
    
    if (showBalls) {
      fill(255);
      stroke(0);
      strokeWeight(weight);
      drawingContext.setLineDash([]);
      ellipse(0, 0, ballSize, ballSize);
    }

    noStroke();
    fill(0);
    textSize(ballSize * 0.6);
    drawingContext.setLineDash([]);
    text(txt[i], 0, ballSize * 0.12); 
    pop();
  }
}

function calculateCollision(a, margin) {
  let dx = cos(a);
  let dy = sin(a);
  let t = Infinity;
  let innerW = width/2 - margin;
  let innerH = height/2 - margin;
  if (dx > 0) t = min(t, innerW / dx);
  if (dx < 0) t = min(t, -innerW / dx);
  if (dy > 0) t = min(t, innerH / dy);
  if (dy < 0) t = min(t, -innerH / dy);
  return max(0, t);
}

function saveSVG() {
  save("vulf_master_v2.8.svg");
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