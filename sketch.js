let font;
let seed = 0;
let currentRotation = 0;

function preload() {
  font = loadFont('./VulfMono-Bold.otf');
}

function setup() {
  let canvas = createCanvas(windowWidth - 300, windowHeight, SVG);
  canvas.parent('canvas-parent');
  textFont(font);
  textAlign(CENTER, CENTER);
}

function draw() {
  clear();
  background(255);
  randomSeed(seed);

  // Interacción: solo rota si el mouse está presionado en el canvas
  if (mouseIsPressed && mouseX > 0) {
    currentRotation = map(mouseX, 0, width, -PI, PI);
  }

  // Captura de inputs del DOM
  let txt = document.getElementById('inText').value;
  let angle = radians(document.getElementById('inAngle').value);
  let rIn = parseInt(document.getElementById('inRin').value);
  let rOutBase = parseInt(document.getElementById('inRout').value);
  let steps = parseInt(document.getElementById('inDensity').value);
  let jitter = parseInt(document.getElementById('inJitter').value);
  let weight = parseFloat(document.getElementById('inWeight').value);

  translate(width / 2, height / 2);
  rotate(currentRotation);

  for (let i = 0; i < steps; i++) {
    let theta = map(i, 0, steps - 1, -angle / 2, angle / 2);
    let rOut = rOutBase + random(-jitter, jitter);

    let x1 = cos(theta) * rIn;
    let y1 = sin(theta) * rIn;
    let x2 = cos(theta) * rOut;
    let y2 = sin(theta) * rOut;

    stroke(0);
    strokeWeight(weight);
    line(x1, y1, x2, y2);

    // DIBUJO DE LETRA RECTA
    push();
    let lx = cos(theta) * (rOut + 25);
    let ly = sin(theta) * (rOut + 25);
    translate(lx, ly);
    
    // Cancelamos la rotación del brazo Y la rotación global del ratón
    rotate(-(theta + currentRotation));
    
    noStroke();
    fill(0);
    textSize(18);
    text(txt[i % txt.length], 0, 0);
    pop();
  }
}

function saveSVG() {
  save("polinizacion_vulf.svg");
}

function keyPressed() {
  if (key === 'r' || key === 'R') seed = millis();
}

function windowResized() {
  resizeCanvas(windowWidth - 300, windowHeight);
}