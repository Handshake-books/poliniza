let font;
let seed = 0;
let currentRotation = 0;

function preload() {
  // Asegúrate de que el nombre coincida con el de tu repositorio
  font = loadFont('./VulfMono-Bold.otf');
}

function setup() {
  let canvas = createCanvas(windowWidth - 320, windowHeight, SVG);
  canvas.parent('canvas-parent');
  textFont(font);
  textAlign(CENTER, CENTER);
}

function draw() {
  clear();
  background(255);
  randomSeed(seed);

  // Rotación interactiva: solo si se hace click en el área blanca
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
  
  // Aplicamos la rotación global para las líneas
  push();
  rotate(currentRotation);

  for (let i = 0; i < steps; i++) {
    let theta = (steps > 1) ? map(i, 0, steps - 1, -angle / 2, angle / 2) : 0;
    let rVar = rOutBase + random(-jitter, jitter);

    // Dibujo de línea
    stroke(0);
    strokeWeight(weight);
    if (lStyle === 'dashed') {
      drawingContext.setLineDash([dashSize, dashSize]);
    } else {
      drawingContext.setLineDash([]);
    }

    let x1 = cos(theta) * 40; // Hueco central
    let y1 = sin(theta) * 40;
    let x2 = cos(theta) * rOut;
    let y2 = sin(theta) * rOut;
    line(x1, y1, x2, y2);

    // --- DIBUJO DE LETRA ---
    // Salimos de la rotación de la línea pero mantenemos la posición
    push();
    let lx = cos(theta) * (rOut + 30);
    let ly = sin(theta) * (rOut + 30);
    
    // Para que la letra esté SIEMPRE a 0º:
    // 1. Movemos al punto final de la línea rotada
    // 2. Aplicamos la rotación inversa (negativa) del sistema Y del brazo
    translate(lx, ly);
    rotate(-(theta + currentRotation));
    
    noStroke();
    fill(0);
    drawingContext.setLineDash([]); // Reset para el texto
    textSize(20);
    // Usamos el módulo para repetir la palabra si hay más líneas que letras
    text(txt[i % txt.length], 0, 0);
    pop();
  }
  pop();
}

function saveSVG() {
  save("vulf_design_vector.svg");
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