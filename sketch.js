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

  if (mouseIsPressed && mouseX > 320) {
    currentRotation = map(mouseX, 320, width, -PI, PI);
  }

  let txt = document.getElementById('inText').value;
  let angle = radians(document.getElementById('inAngle').value);
  let weight = parseFloat(document.getElementById('inWeight').value);
  let dash = parseInt(document.getElementById('inDash').value);
  let showBalls = document.getElementById('checkBalls').checked;
  let ballSize = parseInt(document.getElementById('inBallSize').value);
  let ballWeight = parseFloat(document.getElementById('inBallWeight').value);
  let margin = parseInt(document.getElementById('inMargin').value);

  let steps = txt.length;
  let centerX = (width) / 2;
  let centerY = height / 2;

  // Dibujar guía visual de la "superficie" (opcional, invisible en el SVG final)
  noFill(); stroke(230); strokeWeight(1);
  rect(margin, margin, width - margin * 2, height - margin * 2);

  for (let i = 0; i < steps; i++) {
    let theta = (steps > 1) ? map(i, 0, steps - 1, -angle/2, angle/2) : 0;
    let finalAngle = theta + currentRotation;

    // --- LÓGICA DE PROYECCIÓN HASTA EL BORDE ---
    // Raycasting simple contra el rectángulo del margen
    let dirX = cos(finalAngle);
    let dirY = sin(finalAngle);
    
    // Límites de la caja
    let left = margin - centerX;
    let right = (width - margin) - centerX;
    let top = margin - centerY;
    let bottom = (height - margin) - centerY;

    let t = Infinity;
    if (dirX > 0) t = min(t, right / dirX);
    if (dirX < 0) t = min(t, left / dirX);
    if (dirY > 0) t = min(t, bottom / dirY);
    if (dirY < 0) t = min(t, top / dirY);

    let rHit = t; // El spray "golpea" a esta distancia

    push();
    translate(centerX, centerY);
    
    // DIBUJO DE LÍNEA
    stroke(0);
    strokeWeight(weight);
    if (dash > 0) {
      drawingContext.setLineDash([dash, dash]);
    } else {
      drawingContext.setLineDash([]);
    }
    line(0, 0, dirX * rHit, dirY * rHit);

    // DIBUJO DE LETRA + BOLA
    // Posicionamos exactamente en el punto de choque
    let lx = dirX * rHit;
    let ly = dirY * rHit;
    
    push();
    translate(lx, ly);
    rotate(-finalAngle); // Corregimos para que el siguiente push sea neutro
    
    // Bolita
    if (showBalls) {
      fill(255);
      stroke(0);
      strokeWeight(ballWeight);
      drawingContext.setLineDash([]);
      ellipse(0, 0, ballSize, ballSize);
    }

    // Letra: Ajuste fino de centrado para Vulf Mono Bold
    noStroke();
    fill(0);
    textSize(ballSize * 0.5); // Escalado automático al tamaño de la bola
    text(txt[i], 0, ballSize * 0.05); 
    pop();
    
    pop();
  }
}

function saveSVG() {
  save("vulf_collision_v2.4.svg");
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