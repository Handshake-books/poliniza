let font;
let seed = 0;
let currentRotation = 0;
let fontLoaded = false;

function preload() {
  // Cargamos la fuente con callbacks para evitar el cuelgue en "Loading"
  font = loadFont('./VulfMono-Bold.otf', 
    () => { fontLoaded = true; console.log("Fuente cargada correctamente"); },
    () => { fontLoaded = false; console.warn("Fallo al cargar fuente, usando Courier"); }
  );
}

function setup() {
  let canvas = createCanvas(windowWidth - 320, windowHeight, SVG);
  canvas.parent('canvas-parent');
  textAlign(CENTER, CENTER);
}

function draw() {
  clear();
  background(255);
  randomSeed(seed);

  // Fuente de respaldo si falla la carga
  if (fontLoaded) textFont(font);
  else textFont('Courier New');

  // Solo rotar si el click es en el lienzo
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
    // 1. Calculamos el ángulo de la línea (incluyendo la rotación global)
    let theta = (steps > 1) ? map(i, 0, steps - 1, -angle/2, angle/2) : 0;
    let finalAngle = theta + currentRotation;
    
    let rVar = rOutBase + random(-jitter, jitter);

    // DIBUJO DE LÍNEA
    push();
    rotate(finalAngle);
    stroke(0);
    strokeWeight(weight);
    if (lStyle === 'dashed') {
      drawingContext.setLineDash([dashSize, dashSize]);
    } else {
      drawingContext.setLineDash([]);
    }
    line(40, 0, rVar, 0); // Línea desde el hueco central hasta rVar
    pop();

    // DIBUJO DE LETRA (Posición calculada, pero rotación 0)
    push();
    // Calculamos la posición X e Y final de la línea rotada
    let lx = cos(finalAngle) * (rVar + 30);
    let ly = sin(finalAngle) * (rVar + 30);
    
    translate(lx, ly);
    // IMPORTANTE: Aquí NO rotamos nada, se queda en 0 grados
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