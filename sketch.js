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

  // ROTACIÓN POR POSICIÓN: Sigue al puntero al hacer click
  if (mouseIsPressed && mouseX > 320) {
    currentRotation = atan2(mouseY - centerY, mouseX - centerX);
  }

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

  for (let i = 0; i < steps; i++) {
    let theta = (steps > 1) ? map(i, 0, steps - 1, -angle/2, angle/2) : 0;
    let finalAngle = theta + currentRotation;
    
    // Margen de seguridad para que la bola no se corte
    let safetyMargin = showBalls ? ballSize/2 + weight : 15;
    
    let rFinal;
    if (useCollision) {
      rFinal = calculateCollision(finalAngle, safetyMargin);
    } else {
      rFinal = rOutBase + random(-jitter, jitter);
    }

    // 1. DIBUJO DE LÍNEA
    push();
    translate(centerX, centerY);
    rotate(finalAngle);
    stroke(0);
    strokeWeight(weight);
    if (dash > 0) drawingContext.setLineDash([dash, dash]);
    else drawingContext.setLineDash([]);
    
    line(rIn, 0, rFinal, 0);
    pop();

    // 2. DIBUJO DE LETRA / BOLA (Cálculo de posición vertical fija)
    let totalDist = rFinal + letterPadding;
    let lx = centerX + cos(finalAngle) * totalDist;
    let ly = centerY + sin(finalAngle) * totalDist;
    
    push();
    translate(lx, ly);
    // No hay rotación aquí -> Letra vertical a 0º
    
    if (showBalls) {
      fill(255);
      stroke(0);
      strokeWeight(weight); // Grosor unificado
      drawingContext.setLineDash([]);
      ellipse(0, 0, ballSize, ballSize);
    }

    noStroke();
    fill(0);
    textSize(ballSize * 0.55); // Escalado dinámico
    drawingContext.setLineDash([]);
    
    // Ajuste de centrado vertical: 
    // Bajamos la letra un 15% del tamaño de la bola para centrarla ópticamente
    text(txt[i], 0, ballSize * 0.08); 
    pop();
  }
}

function calculateCollision(a, margin) {
  let dx = cos(a);
  let dy = sin(a);
  let t = Infinity;
  
  // Límites ajustados con el margen de la bola
  let limitW = width/2 - margin;
  let limitH = height/2 - margin;
  
  if (dx > 0) t = min(t, limitW / dx);
  if (dx < 0) t = min(t, -limitW / dx);
  if (dy > 0) t = min(t, limitH / dy);
  if (dy < 0) t = min(t, -limitH / dy);
  
  return max(0, t);
}

function saveSVG() {
  save("vulf_design_v2.6.svg");
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