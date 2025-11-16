const R = 115; 
const BEAD_W = 20; 
const CHAIN_GAP = 10; 
let wheels = []; 
let chains = []; 
const BASE_CANVAS_SIZE = 800;
let zoom = 1;
let pan = { x: 0, y: 0 };

let animated = true;
let timeAcc = 0;
let dragging = false;
let dragIndex = -1;
let prevMouse = { x: 0, y: 0 };
let mouseVel = 0;

let maxBeadsPerCircle = 160; 

function setup() {
  createCanvas(windowWidth, windowHeight);
  randomSeed(); 
  angleMode(RADIANS);

  buildWheelsAndResolveChain(); 
  frameRate(60);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(37, 84, 125);
  const dt = deltaTime / 1000;
  timeAcc += dt;

  let mv = dist(mouseX, mouseY, prevMouse.x, prevMouse.y);
  mouseVel = lerp(mouseVel, mv / max(1, dt), 0.15);
  prevMouse.x = mouseX; prevMouse.y = mouseY;

  push();
  let baseScale = min(width, height) / BASE_CANVAS_SIZE;
  let s = baseScale * zoom;
  translate((width - BASE_CANVAS_SIZE * s) / 2 + pan.x, (height - BASE_CANVAS_SIZE * s) / 2 + pan.y);
  scale(s);

  wheels.forEach((w, i) => {
    if (animated) {
      w.rot += 0.008 + 0.00008 * mouseVel + 0.002 * sin(timeAcc + i * 0.3);
    }
    push();
    translate(w.x, w.y);
    rotate(w.rot);
    scale(w.r / 22);
    w.drawCore();
    pop();
  });

  chains = wheels.map((w, i) => {
    const amp = map(constrain(mouseVel, 0, 200), 0, 200, 0, 6);
    const r = R + CHAIN_GAP + sin(timeAcc * 2 + i * 0.6) * amp;
    return genTightChain(w.x, w.y, r, BEAD_W);
  });

  for (let j = 0; j < chains.length; j++) {
    const plist = chains[j];
    for (let i = 0; i < plist.length; i++) {
      const p = plist[i];
      const n = noise(p.x * 0.01, p.y * 0.01, timeAcc * 0.6);
      p.x += (n - 0.5) * 0.9;
      p.y += (n - 0.5) * 0.9;
    }
  }

  drawTightChain(chains);

  pop();
  if (!animated) {
    noLoop();
  }
}
function screenToLogic(px, py) {
  let baseScale = min(width, height) / BASE_CANVAS_SIZE;
  let s = baseScale * zoom;
  let lx = (px - ((width - BASE_CANVAS_SIZE * s) / 2 + pan.x)) / s;
  let ly = (py - ((height - BASE_CANVAS_SIZE * s) / 2 + pan.y)) / s;
  return { x: lx, y: ly };
}

function mousePressed() {
  let pos = screenToLogic(mouseX, mouseY);
  let best = -1, bestD = 1e9;
  for (let i = 0; i < wheels.length; i++) {
    let d = dist(pos.x, pos.y, wheels[i].x, wheels[i].y);
    if (d < bestD && d < R * 1.1) { bestD = d; best = i; }
  }
  if (best >= 0) {
    dragging = true;
    dragIndex = best;
  } else {
    if (mouseButton === CENTER || keyIsDown(ALT)) {
      dragging = true;
      dragIndex = -2; 
    }
  }
}

function mouseDragged() {
  if (!dragging) return;
  let pos = screenToLogic(mouseX, mouseY);
  if (dragIndex >= 0) {
    wheels[dragIndex].x = pos.x;
    wheels[dragIndex].y = pos.y;
  } else if (dragIndex === -2) {
    pan.x += movedX;
    pan.y += movedY;
  }
  if (!animated) redraw();
}

function mouseReleased() {
  dragging = false;
  dragIndex = -1;
}

function mouseWheel(event) {
  const zoomSpeed = 0.08;
  let factor = event.deltaY > 0 ? 1 - zoomSpeed : 1 + zoomSpeed;
  const before = screenToLogic(mouseX, mouseY);
  zoom = constrain(zoom * factor, 0.25, 3.5);
  const after = screenToLogic(mouseX, mouseY);
  let baseScale = min(width, height) / BASE_CANVAS_SIZE;
  let sNew = baseScale * zoom;
  let sOld = baseScale * (zoom / factor);
  pan.x += (after.x - before.x) * sNew;
  pan.y += (after.y - before.y) * sNew;
  return false;
}

function keyPressed() {
  if (key === ' ') {
    animated = !animated;
    if (animated) loop(); else noLoop();
  } else if (key === 'R') {
    wheels.forEach(w => {
      w.options.pal.center = [random(50, 255), random(30, 220), random(30, 240)];
    });
    redraw();
  } else if (key === 'S') {
    saveCanvas('pacita_anim', 'png');
  } else if (keyCode === LEFT_ARROW) {
    pan.x += 20;
  } else if (keyCode === RIGHT_ARROW) {
    pan.x -= 20;
  } else if (keyCode === UP_ARROW) {
    pan.y += 20;
  } else if (keyCode === DOWN_ARROW) {
    pan.y -= 20;
  }
}

function genTightChain(cx, cy, radius, beadW) {
  const circ = TWO_PI * max(1, radius);
  let nBeads = floor(circ / beadW);
  nBeads = min(nBeads, maxBeadsPerCircle);
  const stepA = TWO_PI / nBeads;
  let angle = 0;
  let plist = [];
  for (let i = 0; i < nBeads; i++) {
    const r = random(radius - 5, radius + 5);
    const x = cx + cos(angle) * r;
    const y = cy + sin(angle) * r;
    plist.push({ x, y, merge: false });
    angle += stepA;
  }
  return plist;
}
function drawTightChain(chainsLocal) {
  const colorsArr = [
    color(252, 11, 13),
    color(254, 155, 14),
    color(99, 153, 35),
    color(93, 192, 213),
  ];

  for (let j = 0; j < chainsLocal.length; j++) {
    const plist = chainsLocal[j];
    for (let c = 0; c < chainsLocal.length; c++) {
      if (j === c) continue;
      const otherPlist = chainsLocal[c];
      if (!otherPlist) continue;
      for (let i = 0; i < plist.length; i++) {
        for (let k = 0; k < otherPlist.length; k++) {
          const { x: x1, y: y1 } = plist[i];
          const { x: x2, y: y2, merge: merge2 } = otherPlist[k];
          if (dist(x1, y1, x2, y2) < 18) {
            plist[i].x = x2;
            plist[i].y = y2;
            plist[i].merge = !merge2;
            break;
          }
        }
      }
    }
  }

  for (let j = 0; j < chainsLocal.length; j++) {
    const plist = chainsLocal[j];
    for (let i = 0; i < plist.length; i++) {
      let next = plist[(i + 1) % plist.length];
      if (!next) continue;
      const { x: x1, y: y1, merge: merge1 } = plist[i];
      const { x: x2, y: y2, merge: merge2 } = next;
      if (merge1 && merge2) continue;

      push();
      stroke(255, 255, 255);
      strokeWeight(1.2);
      let cx = (x1 + x2) / 2;
      let cy = (y1 + y2) / 2;
      let size = dist(x1, y1, x2, y2);
      translate(cx, cy);
      rotate(atan2(y2 - y1, x2 - x1));
      if (i % 6 !== 0) {
        stroke(255, 255, 255, 180);
        fill(colorsArr[i % colorsArr.length]);
        ellipse(0, 0, size, min(size / 2, 12));
      }
      pop();
    }
  }

  for (let j = 0; j < chainsLocal.length; j++) {
    const plist = chainsLocal[j];
    for (let i = 0; i < plist.length; i++) {
      let next = plist[(i + 1) % plist.length];
      if (!next) continue;
      const { x: x1, y: y1, merge: merge1 } = plist[i];
      const { x: x2, y: y2, merge: merge2 } = next;
      if (merge1 && merge2) continue;

      push();
      stroke(255, 255, 255);
      strokeWeight(1.2);
      let cx = (x1 + x2) / 2;
      let cy = (y1 + y2) / 2;
      let size = dist(x1, y1, x2, y2);
      translate(cx, cy);
      rotate(atan2(y2 - y1, x2 - x1));
      if (i % 6 === 0) {
        fill(0);
        ellipse(0, 0, size, min(BEAD_W * 0.75, 12));
        fill(255);
        noStroke();
        ellipse(0, 0, 3, 3);
      }
      pop();
    }
  }
}

class Wheel {
  constructor(x, y, options) {
    this.x = x;
    this.y = y;
    this.r = R;
    this.isTypeI = options.isTypeI || false;
    this.rot = 0;
    this.options = {
      curved: false,
      curvedAngle: 0,
      variantCircle: "A",
      variantCirclePal: [30, 180, 90]
    };
    Object.assign(this.options, options);
  }

  displayWheel() {
    push();
    translate(this.x, this.y);
    rotate(this.rot);
    scale(this.r / 22);
    this.drawCore();
    pop();
  }
  drawCore() {
    withStyle(() => {
      noStroke();
      fill(color(...this.options.pal.bg));
      circle(0, 0, 40);
    });
    if (this.isTypeI) {
      drawStrongWavyRing({
        innerR: 10,
        outerR: 20,
        amp: 5,
        freq: 70,
        col: color(223, 50, 34),
      });
    } else {
      const radii = [11, 12.8, 14.6, 16.4, 18.2, 19.6];
      const col = color(...this.options.pal.stroke);
      radii.forEach((r) => dashedRing(r, col, [0.3, 2], 1));
    }
    const centerCol = color(...this.options.pal.center);
    withStyle(() => {
      stroke(centerCol);
      strokeWeight(1);
      fill(red(centerCol), green(centerCol), blue(centerCol), 0.8 * 255);
      circle(0, 0, 20);
    });
    drawVariantCircle(this.options.variantCircle, this.options.variantCirclePal);

    const dots = [
      { d: 11, col: this.options.pal.dot1 },
      { d: 8, col: this.options.pal.center },
      { d: 6, col: this.options.pal.dot2 },
      { d: 4, col: this.options.pal.dot3 },
      { d: 2, col: this.options.pal.dot4 },
    ];
    dots.forEach(({ d, col }) =>
      withStyle(() => {
        noStroke();
        fill(...col);
        circle(0, 0, d);
      })
    );

    if (this.options.curved) {
      drawRandomCurvedLine([255, 70, 130], this.options.curvedAngle);
    }
  }
}

function drawVariantCircle(force, variantCirclePal) {
  const pick = force
  if (pick === "A") return drawVariantA();
  if (pick === "B") return drawVariantB(variantCirclePal);
  return drawVariantC(variantCirclePal);
}
function drawVariantA() {
  drawWavyCircle({
    baseR: 5,
    amp: 4,
    freq: 20,
    col: color(255, 140, 0),
    sw: 0.5,
    step: 0.02,
  });
}
function drawVariantB(variantCirclePal) {
  const strokeCol = color([...variantCirclePal], 200);
  withStyle(() => {
    noFill();
    stroke(strokeCol);
    strokeWeight(1);
    for (let baseR = 6; baseR <= 10; baseR += 2) {
      const amp = random(1, 1.1),
        freq = floor(random(0, 2));
      beginShape();
      for (let a = 0; a <= TWO_PI + 0.05; a += 0.1)
        vertex(
          cos(a) * (baseR + sin(a * freq + random(-0.1, 0.1)) * amp),
          sin(a) * (baseR + sin(a * freq + random(-0.1, 0.1)) * amp)
        );
      endShape(CLOSE);
    }
  });
}
function drawVariantC(variantCirclePal) {
  const strokeCol = color([...variantCirclePal], 153);
  withDash([0.3, 1.8], () => {
    withStyle(() => {
      noFill();
      stroke(strokeCol);
      strokeWeight(1);
      for (let r = 6; r <= 10; r += 2) ellipse(0, 0, r * 1.8);
    });
  });
}
function withStyle(fn) {
  push();
  try {
    fn();
  } finally {
    pop();
  }
}
function withDash(arr, fn) {
  withStyle(() => {
    drawingContext.setLineDash(arr);
    try {
      fn();
    } finally {
      drawingContext.setLineDash([]);
    }
  });
}
function dashedRing(r, col, dash, sw) {
  withDash(dash, () => {
    withStyle(() => {
      noFill();
      stroke(col);
      strokeWeight(sw + 0.5);
      ellipse(0, 0, r * 2);
    });
  });
}
function drawWavyCircle({ baseR, amp, freq, col, sw = 0.5, step = 0.02 }) {
  withStyle(() => {
    noFill();
    stroke(col);
    strokeWeight(sw);
    beginShape();
    for (let a = 0; a <= TWO_PI + step; a += step)
      vertex(
        cos(a) * (baseR + sin(a * freq) * amp),
        sin(a) * (baseR + sin(a * freq) * amp)
      );
    endShape(CLOSE);
  });
}
function drawStrongWavyRing({
  innerR,
  outerR,
  amp,
  freq,
  col,
  sw = 0.5,
  steps = 180,
}) {
  const baseR = (innerR + outerR) / 2,
    stepA = TWO_PI / steps;
  withStyle(() => {
    noFill();
    stroke(col);
    strokeWeight(sw);
    beginShape();
    for (let a = 0; a <= TWO_PI + stepA; a += stepA)
      vertex(
        cos(a) * (baseR + sin(a * freq) * amp),
        sin(a) * (baseR + sin(a * freq) * amp)
      );
    endShape(CLOSE);
  });
}
function drawRandomCurvedLine(lineColor, curvedAngle) {
  withStyle(() => {
    stroke(...lineColor);
    strokeWeight(1);
    noFill();
    beginShape();
    vertex(0, 0);
    const angle = curvedAngle,
      len = 25,
      ctrlAngle = angle + random(-PI / 3, PI / 3),
      ctrlLen = len * 0.5,
      cx = cos(ctrlAngle) * ctrlLen,
      cy = sin(ctrlAngle) * ctrlLen,
      x = cos(angle) * len,
      y = sin(angle) * len;
    quadraticVertex(cx, cy, x, y);
    endShape();
  });
}
function distSq(a, b) {
  return sq(a.x - b.x) + sq(a.y - b.y);
}

function buildWheelsAndResolveChain() {
  wheels = []; // start fresh
  wheels.push(new Wheel(113, 104, {
    variantCircle: "B", curved: true, curvedAngle: PI / 2,
    variantCirclePal: [41, 92, 49],
    pal: {
      bg: [205, 225, 239],
      stroke: [10, 10, 104],
      center: [155, 78, 148],
      dot1: [184, 55, 36],
      dot2: [38, 84, 42],
      dot3: [0, 0, 0],
      dot4: [205, 225, 239],
    }
  }));
  wheels.push(new Wheel(346, 42, {
    variantCircle: "C", isTypeI: true,
    variantCirclePal: [200, 90, 163],
    pal: {
      bg: [242, 181, 64],
      stroke: [255, 25, 25],
      center: [230, 97, 47],
      dot1: [165, 162, 167],
      dot2: [0, 0, 0],
      dot3: [69, 137, 68],
      dot4: [165, 162, 167],
    }
  }));
  wheels.push(new Wheel(589, -13, {
    variantCircle: "B", curved: true, curvedAngle: PI / 4,
    variantCirclePal: [199, 98, 180],
    pal: {
      bg: [243, 240, 236],
      stroke: [218, 53, 35],
      center: [191, 94, 176],
      dot1: [192, 47, 42],
      dot2: [52, 92, 68],
      dot3: [0, 0, 0],
      dot4: [205, 225, 239],
    }
  }));
  wheels.push(new Wheel(30, 328, {
    variantCircle: "C",
    variantCirclePal: [204, 86, 139],
    pal: {
      bg: [242, 181, 64],
      stroke: [39, 82, 145],
      center: [229, 84, 67],
      dot1: [103, 104, 85],
      dot2: [19, 1, 0],
      dot3: [225, 90, 82],
      dot4: [178, 184, 198],
    }
  }));
  wheels.push(new Wheel(271, 287, {
    variantCircle: "B", curved: true, curvedAngle: -PI / 4,
    variantCirclePal: [230, 87, 75],
    pal: {
      bg: [225, 249, 247],
      stroke: [63, 139, 59],
      center: [204, 84, 160],
      dot1: [74, 73, 54],
      dot2: [199, 207, 200],
      dot3: [0, 0, 0],
      dot4: [68, 140, 59],
    }
  }));
  wheels.push(new Wheel(508, 215, {
    variantCircle: "B",
    variantCirclePal: [119, 175, 215],
    pal: {
      bg: [238, 181, 76],
      stroke: [196, 150, 214],
      center: [182, 76, 160],
      dot1: [184, 55, 36],
      dot2: [38, 84, 42],
      dot3: [0, 0, 0],
      dot4: [205, 225, 239],
    }
  }));
  wheels.push(new Wheel(758, 162, {
    variantCircle: "C",
    variantCirclePal: [238, 228, 243],
    pal: {
      bg: [242, 181, 64],
      stroke: [33, 62, 107],
      center: [169, 74, 146],
      dot1: [37, 6, 8],
      dot2: [70, 67, 49],
      dot3: [0, 0, 0],
      dot4: [225, 70, 54],
    }
  }));
  wheels.push(new Wheel(-48, 556, {
    variantCircle: "B", curved: true, curvedAngle: -PI / 4,
    variantCirclePal: [188, 71, 166],
    pal: {
      bg: [215, 252, 254],
      stroke: [66, 146, 149],
      center: [188, 71, 166],
      dot1: [184, 55, 36],
      dot2: [38, 84, 42],
      dot3: [0, 0, 0],
      dot4: [205, 225, 239],
    }
  }));
  wheels.push(new Wheel(193, 509.5, {
    variantCircle: "C", isTypeI: true,
    variantCirclePal: [223, 52, 42],
    pal: {
      bg: [242, 181, 64],
      stroke: [10, 10, 104],
      center: [226, 99, 176],
      dot1: [184, 55, 36],
      dot2: [38, 84, 42],
      dot3: [0, 0, 0],
      dot4: [205, 225, 239],
    }
  }));
  wheels.push(new Wheel(448, 445, {
    variantCircle: "A", curved: true, curvedAngle: 0,
    variantCirclePal: [226, 92, 72],
    pal: {
      bg: [247, 236, 238],
      stroke: [215, 65, 62],
      center: [224, 111, 174],
      dot1: [184, 55, 36],
      dot2: [38, 84, 42],
      dot3: [0, 0, 0],
      dot4: [205, 225, 239],
    }
  }));
  wheels.push(new Wheel(686, 390, {
    variantCircle: "B", curved: true, curvedAngle: -PI / 4,
    variantCirclePal: [41, 92, 49],
    pal: {
      bg: [240, 250, 248],
      stroke: [236, 148, 64],
      center: [155, 78, 148],
      dot1: [184, 55, 36],
      dot2: [38, 84, 42],
      dot3: [0, 0, 0],
      dot4: [205, 225, 239],
    }
  }));
  wheels.push(new Wheel(127, 739.5, {
    variantCircle: "B", curved: true, curvedAngle: PI / 4,
    variantCirclePal: [132, 177, 224],
    pal: {
      bg: [251, 235, 241],
      stroke: [225, 55, 41],
      center: [185, 89, 182],
      dot1: [71, 84, 63],
      dot2: [38, 84, 42],
      dot3: [0, 0, 0],
      dot4: [205, 225, 239],
    }
  }));
  wheels.push(new Wheel(372, 675.5, {
    variantCircle: "B",
    variantCirclePal: [226, 111, 195],
    pal: {
      bg: [242, 194, 93],
      stroke: [184, 49, 106],
      center: [226, 111, 195],
      dot1: [217, 203, 101],
      dot2: [89, 91, 78],
      dot3: [213, 48, 39],
      dot4: [205, 225, 239],
    }
  }));
  wheels.push(new Wheel(611, 625.5, {
    variantCircle: "B",
    variantCirclePal: [227, 88, 57],
    pal: {
      bg: [242, 181, 64],
      stroke: [49, 105, 169],
      center: [230, 107, 190],
      dot1: [84, 77, 64],
      dot2: [38, 84, 42],
      dot3: [216, 50, 38],
      dot4: [205, 225, 239],
    }
  }));
  wheels.push(new Wheel(845, 570, {
    variantCircle: "C", isTypeI: true,
    variantCirclePal: [41, 92, 49],
    pal: {
      bg: [242, 181, 64],
      stroke: [10, 10, 104],
      center: [155, 78, 148],
      dot1: [184, 55, 36],
      dot2: [38, 84, 42],
      dot3: [0, 0, 0],
      dot4: [205, 225, 239],
    }
  }));
  wheels.push(new Wheel(532, 859, {
    variantCircle: "B",
    variantCirclePal: [41, 92, 49],
    pal: {
      bg: [252, 240, 237],
      stroke: [229, 70, 54],
      center: [155, 78, 148],
      dot1: [184, 55, 36],
      dot2: [38, 84, 42],
      dot3: [0, 0, 0],
      dot4: [205, 225, 239],
    }
  }));
  wheels.push(new Wheel(768, 813, {
    variantCircle: "B",
    variantCirclePal: [41, 92, 49],
    pal: {
      bg: [252, 240, 237],
      stroke: [112, 192, 120],
      center: [221, 129, 210],
      dot1: [184, 55, 36],
      dot2: [38, 84, 42],
      dot3: [0, 0, 0],
      dot4: [205, 225, 239],
    }
  }));
}
