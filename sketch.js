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

  // CONTROL DE ROTACIÓN: Solo si el mouse está a la derecha del sidebar (x > 320)
  if (mouseIsPressed && mouseX > 320) {
    currentRotation = map(mouseX, 320, width, -PI, PI);
  }

  let txt = document.getElementById('inText').value;
  let angle = radians(document.getElementById('inAngle').value);
  let rOutBase = parseInt(document.getElementById('inRout').value);
  let jitter = parseInt(document.getElementById('inJitter').value);
  let weight = parseFloat(document.getElementById('inWeight').value);
  let ballSize = parseInt(document.getElementById('inBallSize').value);
  let ballWeight = parseFloat(document.getElementById('inBallWeight').value);
  let lStyle = document.getElementById('inStyle').value;

  // Número de líneas forzado a longitud de texto
  let steps = txt.length;

  translate((width + 320) / 2 - 160, height / 2);

  for (let i = 0; i < steps; i++) {
    let theta = (steps > 1) ? map(i, 0, steps - 1, -angle/2, angle/2) : 0;
    let finalAngle = theta + currentRotation;
    let rVar = rOutBase + random(-jitter, jitter);

    // 1. DIBUJO DE LÍNEA
    push();
    rotate(finalAngle);
    stroke(0);
    strokeWeight(weight);
    if (lStyle === 'dashed') {
      drawingContext.setLineDash([5, 5]);
    } else {
      drawingContext.setLineDash([]);
    }
    line(40, 0, rVar, 0); 
    pop();

    // 2. DIBUJO DE BOLITA Y LETRA
    let lx = cos(finalAngle) * (rVar + ballSize/2 + 5);
    let ly = sin(finalAngle) * (rVar + ballSize/2 + 5);
    
    push();
    translate(lx, ly);
    
    // Dibujo de la bolita (si el tamaño es > 0)
    if (ballSize > 0) {
      fill(255);
      stroke(0);
      strokeWeight(ballWeight);
      ellipse(0, 0, ballSize, ballSize);
    }

    // Dibujo de la letra (siempre recta)
    noStroke();
    fill(0);
    textSize(18);
    text(txt[i], 0, 1); // El +1 es un ajuste óptico para la Vulf
    pop();
  }
}

function saveSVG() {
  save("vulf_tool_v2.3.svg");
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