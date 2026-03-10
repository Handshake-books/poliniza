let myFont;
let seed = 0;
let currentRotation = 0;

function preload() {
  // Asegúrate de que el archivo en GitHub se llame EXACTAMENTE así:
  myFont = loadFont('VulfMono-Bold.otf');
}

function setup() {
  let canvas = createCanvas(windowWidth - 320, windowHeight, SVG);
  canvas.parent('canvas-parent');
  // Aplicamos la fuente una sola vez en el setup para mayor estabilidad
  textFont(myFont);
  textAlign(CENTER, CENTER);
}

function draw() {
  clear();
  background(255);
  randomSeed(seed);

  // Rotación interactiva
  if (mouseIsPressed && mouseX > 0) {
    currentRotation = map(mouseX, 0, width, -PI, PI);
  }

  let txt = document.getElementById('inText').value;
  let angle = radians(document.getElementById('inAngle').value);
  let steps = parseInt(document.getElementById('inSteps').value);
  let rOutBase = parseInt(document.getElementById('inRout').value);
  let jitter = parseInt(document.getElementById('inJitter').value);
  let weight = parseFloat(document.getElementById('inWeight').value);
  let lStyle = document.getElementById('inStyle').value;
  let dashSize = parseInt(document.getElementById('inDash').value);

  translate(width / 2, height / 2);

  for (let i = 0; i < steps; i++) {
    let theta = (steps > 1) ? map(i, 0, steps - 1, -angle/2, angle/2) : 0;
    let finalAngle = theta + currentRotation;
    let rVar = rOutBase + random(-jitter, jitter);

    // 1. DIBUJO DE LÍNEA (Usando rotación local)
    push();
    rotate(finalAngle);
    stroke(0);
    strokeWeight(weight);
    if (lStyle === 'dashed') {
      drawingContext.setLineDash([dashSize, dashSize]);
    } else {
      drawingContext.setLineDash([]);
    }
    line(40, 0, rVar, 0); 
    pop();

    // 2. DIBUJO DE LETRA (Calculamos coordenadas globales, SIN ROTAR)
    // Esto garantiza que la letra esté siempre a 0 grados
    let lx = cos(finalAngle) * (rVar + 30);
    let ly = sin(finalAngle) * (rVar + 30);
    
    push();
    translate(lx, ly);
    noStroke();
    fill(0);
    drawingContext.setLineDash([]); 
    textSize(22);
    text(txt[i % txt.length], 0, 0);
    pop();
  }
}

function saveSVG() {
  save("polinizacion_vector.svg");
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