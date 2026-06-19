let screenCanvas;

try {
  screenCanvas = canvas;
} catch (error) {
  screenCanvas = wx.createCanvas();
}

const ctx = screenCanvas.getContext("2d");
const systemInfo = wx.getSystemInfoSync();
const dpr = systemInfo.pixelRatio || 1;
const view = {
  width: systemInfo.windowWidth || 375,
  height: systemInfo.windowHeight || 667
};

screenCanvas.width = view.width * dpr;
screenCanvas.height = view.height * dpr;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
ctx.imageSmoothingEnabled = false;

const raf = typeof requestAnimationFrame === "function"
  ? requestAnimationFrame
  : (callback) => setTimeout(callback, 16);

const TILE = 12;
const COLORS = {
  wall: "#7b4d36",
  wallTop: "#a76a43",
  wallDark: "#3a2520",
  floor: "#d9b47d",
  floorAlt: "#cfa66e",
  floorLine: "#b88759",
  counter: "#8c4f35",
  counterTop: "#c98954",
  counterEdge: "#f0c16f",
  pcDesk: "#6f472d",
  pcScreen: "#17222a",
  pcGlow: "#79e7a4",
  line: "#2b1b18",
  text: "#fff0c5",
  dimText: "#7e5b42",
  red: "#d94a45",
  green: "#69b96d",
  yellow: "#f4c95d",
  blue: "#5f9ed1",
  plant: "#4e8f4f"
};

const layout = createLayout();
const state = {
  cash: 100,
  served: 0,
  lost: 0,
  time: 0,
  nextGuestAt: 1,
  guestId: 1,
  guests: [],
  frontDesk: {
    busyGuestId: null,
    timer: 0,
    duration: 1.15
  },
  message: "客人进门、前台开机、上机读条、下机离场。",
  messageTimer: 5
};

const guestPalettes = [
  { shirt: "#e84855", hair: "#2d1e1a" },
  { shirt: "#70a1ff", hair: "#2d1e1a" },
  { shirt: "#5ec27f", hair: "#3d2b22" },
  { shirt: "#ffd166", hair: "#2d1e1a" }
];

let lastFrameAt = Date.now();

function createLayout() {
  const room = {
    x: 18,
    y: 86,
    w: view.width - 36,
    h: Math.min(view.height - 132, view.width * 1.28)
  };
  room.y = Math.max(76, (view.height - room.h) / 2 + 14);

  const counter = {
    x: room.x + room.w * 0.32,
    y: room.y + 52,
    w: room.w * 0.42,
    h: 38
  };

  const entrance = {
    x: room.x - 4,
    y: counter.y + 52
  };

  const queue = [
    { x: counter.x - 12, y: counter.y + counter.h + 26 },
    { x: counter.x - 40, y: counter.y + counter.h + 26 },
    { x: counter.x - 68, y: counter.y + counter.h + 26 }
  ];

  const pcTop = counter.y + 126;
  const pcGapX = room.w * 0.24;
  const pcGapY = 80;
  const pcLeft = room.x + room.w * 0.28;

  const pcs = [
    createPc(0, pcLeft, pcTop),
    createPc(1, pcLeft + pcGapX, pcTop),
    createPc(2, pcLeft, pcTop + pcGapY),
    createPc(3, pcLeft + pcGapX, pcTop + pcGapY)
  ];

  return { room, counter, entrance, queue, pcs };
}

function createPc(id, x, y) {
  return {
    id,
    x,
    y,
    w: 52,
    h: 44,
    seatX: x + 26,
    seatY: y + 48,
    occupiedBy: null,
    dirty: false
  };
}

function say(text) {
  state.message = text;
  state.messageTimer = 4;
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function moveToward(entity, target, speed, dt) {
  const dx = target.x - entity.x;
  const dy = target.y - entity.y;
  const len = Math.hypot(dx, dy);

  if (len < 1) {
    entity.x = target.x;
    entity.y = target.y;
    return true;
  }

  const step = Math.min(len, speed * dt);
  entity.x += dx / len * step;
  entity.y += dy / len * step;
  return len <= step + 0.5;
}

function findFreePc() {
  return layout.pcs.find((pc) => !pc.occupiedBy && !pc.dirty);
}

function spawnGuest() {
  const palette = guestPalettes[Math.floor(Math.random() * guestPalettes.length)];
  state.guests.push({
    id: state.guestId,
    x: layout.entrance.x - 34,
    y: layout.entrance.y,
    state: "entering",
    queueIndex: -1,
    pcId: null,
    playTimer: 0,
    playDuration: random(8, 13),
    speed: random(44, 58),
    palette
  });
  state.guestId += 1;
}

function updateSpawn() {
  if (state.time < state.nextGuestAt) return;

  const waitingGuests = state.guests.filter((guest) => (
    guest.state === "entering" ||
    guest.state === "queueing" ||
    guest.state === "checkingIn"
  )).length;

  if (waitingGuests < 5) {
    spawnGuest();
  } else {
    state.lost += 1;
  }

  state.nextGuestAt = state.time + random(2.3, 3.7);
}

function updateFrontDesk(dt) {
  if (state.frontDesk.busyGuestId) {
    state.frontDesk.timer -= dt;
    if (state.frontDesk.timer > 0) return;

    const guest = state.guests.find((item) => item.id === state.frontDesk.busyGuestId);
    const pc = findFreePc();

    if (guest && pc) {
      pc.occupiedBy = guest.id;
      guest.pcId = pc.id;
      guest.state = "toPc";
      guest.queueIndex = -1;
      say(`顾客 ${guest.id} 已开机，分配到 ${pc.id + 1} 号机。`);
    } else if (guest) {
      guest.state = "queueing";
    }

    state.frontDesk.busyGuestId = null;
    state.frontDesk.timer = 0;
  }

  const nextGuest = state.guests.find((guest) => guest.state === "queueing" && guest.queueIndex === 0);
  if (!nextGuest || !findFreePc()) return;

  nextGuest.state = "checkingIn";
  state.frontDesk.busyGuestId = nextGuest.id;
  state.frontDesk.timer = state.frontDesk.duration;
}

function updateQueueTargets() {
  const waiting = state.guests.filter((guest) => (
    guest.state === "entering" ||
    guest.state === "queueing"
  ));

  waiting.forEach((guest, index) => {
    guest.queueIndex = Math.min(index, layout.queue.length - 1);
    if (guest.state === "entering" && distance(guest, layout.queue[guest.queueIndex]) < 2) {
      guest.state = "queueing";
    }
  });
}

function finishPlaying(guest, pc) {
  const hourlyRate = 5;
  const sessionHours = 2;
  const income = hourlyRate * sessionHours;

  state.cash += income;
  state.served += 1;
  pc.occupiedBy = null;
  pc.dirty = true;
  guest.state = "leaving";
  say(`顾客 ${guest.id} 下机结账，收入 ${income} 元。机位需要清理。`);
}

function autoClean(dt) {
  layout.pcs.forEach((pc) => {
    if (!pc.dirty) return;

    pc.cleanTimer = (pc.cleanTimer || 2.2) - dt;
    if (pc.cleanTimer <= 0) {
      pc.dirty = false;
      pc.cleanTimer = 0;
    }
  });
}

function updateGuests(dt) {
  updateQueueTargets();

  for (let index = state.guests.length - 1; index >= 0; index -= 1) {
    const guest = state.guests[index];

    if (guest.state === "entering" || guest.state === "queueing") {
      const target = layout.queue[guest.queueIndex] || layout.queue[layout.queue.length - 1];
      moveToward(guest, target, guest.speed, dt);
      continue;
    }

    if (guest.state === "checkingIn") {
      moveToward(guest, { x: layout.counter.x + 14, y: layout.counter.y + layout.counter.h + 18 }, guest.speed, dt);
      continue;
    }

    if (guest.state === "toPc") {
      const pc = layout.pcs[guest.pcId];
      const arrived = moveToward(guest, { x: pc.seatX, y: pc.seatY }, guest.speed, dt);
      if (arrived) {
        guest.state = "playing";
        guest.playTimer = guest.playDuration;
      }
      continue;
    }

    if (guest.state === "playing") {
      const pc = layout.pcs[guest.pcId];
      guest.x = pc.seatX;
      guest.y = pc.seatY;
      guest.playTimer -= dt;
      if (guest.playTimer <= 0) {
        finishPlaying(guest, pc);
      }
      continue;
    }

    if (guest.state === "leaving") {
      const left = moveToward(guest, { x: layout.entrance.x - 42, y: layout.entrance.y }, guest.speed + 8, dt);
      if (left) {
        state.guests.splice(index, 1);
      }
    }
  }
}

function update(dt) {
  state.time += dt;
  state.messageTimer = Math.max(0, state.messageTimer - dt);
  updateSpawn();
  updateFrontDesk(dt);
  updateGuests(dt);
  autoClean(dt);
}

function rect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function strokeRect(x, y, w, h, color, lineWidth = 2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function text(value, x, y, size, color, weight = "normal", align = "left") {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "Microsoft YaHei", "PingFang SC", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillText(value, x, y);
}

function drawPixelFloor() {
  const room = layout.room;
  rect(0, 0, view.width, view.height, "#1d2b2c");
  rect(room.x - 8, room.y - 8, room.w + 16, room.h + 16, COLORS.wallDark);
  rect(room.x, room.y, room.w, room.h, COLORS.wall);
  rect(room.x, room.y, room.w, 42, COLORS.wallTop);
  rect(room.x + 8, room.y + 42, room.w - 16, 5, "#5d382b");

  for (let y = room.y + 48; y < room.y + room.h - TILE; y += TILE) {
    for (let x = room.x + TILE; x < room.x + room.w - TILE; x += TILE) {
      const color = ((x / TILE + y / TILE) % 2 === 0) ? COLORS.floor : COLORS.floorAlt;
      rect(x, y, TILE, TILE, color);
      rect(x, y + TILE - 1, TILE, 1, COLORS.floorLine);
      rect(x + TILE - 1, y, 1, TILE, COLORS.floorLine);
    }
  }

  drawWindow(room.x + room.w - 86, room.y + 10);
  drawDoor();
  drawIndoorDetails();
}

function drawWindow(x, y) {
  rect(x, y, 58, 26, "#4f78a0");
  strokeRect(x, y, 58, 26, "#f0c16f", 3);
  rect(x + 27, y + 3, 3, 20, "#f0c16f");
  rect(x + 4, y + 11, 50, 3, "#f0c16f");
  rect(x + 7, y + 5, 14, 5, "#8ecae6");
}

function drawDoor() {
  const room = layout.room;
  rect(room.x - 10, layout.entrance.y - 28, 18, 56, "#1d2b2c");
  rect(room.x - 30, layout.entrance.y - 20, 28, 40, "#7a4a2c");
  rect(room.x - 26, layout.entrance.y - 16, 20, 32, "#a86a3c");
  rect(room.x - 9, layout.entrance.y - 1, 4, 4, COLORS.yellow);
  rect(room.x - 52, layout.entrance.y - 5, 26, 10, COLORS.red);
  rect(room.x - 30, layout.entrance.y - 13, 10, 26, COLORS.red);
}

function drawIndoorDetails() {
  const room = layout.room;
  rect(room.x + 22, room.y + 14, 42, 18, "#4b3027");
  strokeRect(room.x + 22, room.y + 14, 42, 18, "#d7a85b", 2);
  text("黑网吧", room.x + 43, room.y + 17, 12, COLORS.text, "bold", "center");

  rect(room.x + room.w - 52, room.y + room.h - 54, 22, 30, "#7b5a35");
  rect(room.x + room.w - 48, room.y + room.h - 64, 14, 14, COLORS.plant);
  rect(room.x + room.w - 56, room.y + room.h - 58, 14, 12, COLORS.plant);
  rect(room.x + room.w - 38, room.y + room.h - 58, 14, 12, COLORS.plant);
}

function drawCounter() {
  const c = layout.counter;
  rect(c.x, c.y, c.w, c.h, COLORS.counter);
  rect(c.x, c.y, c.w, 10, COLORS.counterTop);
  rect(c.x + 6, c.y + c.h - 7, c.w - 12, 4, COLORS.counterEdge);
  strokeRect(c.x, c.y, c.w, c.h, COLORS.line, 3);
  text("前台", c.x + c.w / 2, c.y + 11, 16, COLORS.text, "bold", "center");

  rect(c.x + c.w - 28, c.y + 12, 18, 16, "#20262b");
  rect(c.x + c.w - 24, c.y + 16, 10, 6, COLORS.pcGlow);

  if (state.frontDesk.busyGuestId) {
    const progress = 1 - state.frontDesk.timer / state.frontDesk.duration;
    rect(c.x + 8, c.y + c.h + 6, c.w - 16, 6, "#3a2b26");
    rect(c.x + 8, c.y + c.h + 6, (c.w - 16) * progress, 6, COLORS.yellow);
  }
}

function drawPc(pc) {
  rect(pc.x + 6, pc.y + pc.h - 2, pc.w - 12, 8, "#523421");
  rect(pc.x, pc.y, pc.w, pc.h, COLORS.pcDesk);
  strokeRect(pc.x, pc.y, pc.w, pc.h, COLORS.line, 3);
  rect(pc.x + 8, pc.y + 7, pc.w - 16, 22, COLORS.pcScreen);
  rect(pc.x + 12, pc.y + 11, pc.w - 24, 14, pc.dirty ? "#6a5a4a" : COLORS.pcGlow);
  rect(pc.x + 15, pc.y + 14, 10, 3, "#dfffe7");
  rect(pc.x + 21, pc.y + 31, 10, 8, "#2d2522");

  text(`${pc.id + 1}号`, pc.x + pc.w / 2, pc.y - 17, 11, COLORS.dimText, "bold", "center");

  if (pc.dirty) {
    rect(pc.x + pc.w - 12, pc.y + 32, 8, 8, COLORS.red);
  }

  const guest = state.guests.find((item) => item.id === pc.occupiedBy && item.state === "playing");
  if (guest) {
    const progress = 1 - guest.playTimer / guest.playDuration;
    rect(pc.x, pc.y + pc.h + 15, pc.w, 5, "#3a2b26");
    rect(pc.x, pc.y + pc.h + 15, pc.w * progress, 5, COLORS.yellow);
  }
}

function drawGuest(guest) {
  const x = Math.round(guest.x);
  const y = Math.round(guest.y);

  rect(x - 5, y - 18, 10, 8, "#f3c596");
  rect(x - 6, y - 21, 12, 5, guest.palette.hair);
  rect(x - 7, y - 10, 14, 14, guest.palette.shirt);
  rect(x - 8, y + 3, 6, 10, "#273444");
  rect(x + 2, y + 3, 6, 10, "#273444");

  if (guest.state === "queueing") {
    text("...", x, y - 36, 11, COLORS.text, "bold", "center");
  }
}

function drawHud() {
  rect(0, 0, view.width, 72, "#273b35");
  rect(0, 70, view.width, 3, COLORS.counterTop);
  text("小黑网吧", 16, 12, 20, COLORS.text, "bold");
  text(`现金 ${state.cash}`, 16, 42, 13, COLORS.green, "bold");
  text(`接待 ${state.served}`, 112, 42, 13, COLORS.blue, "bold");
  text(`流失 ${state.lost}`, 220, 42, 13, COLORS.red, "bold");

  if (state.messageTimer > 0) {
    rect(12, view.height - 38, view.width - 24, 26, "#4b3027");
    text(state.message, view.width / 2, view.height - 31, 11, COLORS.text, "normal", "center");
  }
}

function drawLegend() {
  text("入口", layout.room.x + 8, layout.entrance.y - 46, 11, COLORS.red, "bold");
  text("开局大厅 4 台机", layout.room.x + layout.room.w / 2, layout.pcs[2].y + 70, 11, COLORS.dimText, "bold", "center");
}

function render() {
  ctx.clearRect(0, 0, view.width, view.height);
  drawPixelFloor();
  drawCounter();
  layout.pcs.forEach(drawPc);
  drawLegend();
  state.guests.forEach(drawGuest);
  drawHud();
}

function loop() {
  const now = Date.now();
  const dt = Math.min(0.05, (now - lastFrameAt) / 1000);
  lastFrameAt = now;

  update(dt);
  render();
  raf(loop);
}

function drawFatalError(error) {
  rect(0, 0, view.width, view.height, "#1b1b1b");
  text("启动错误", 24, 32, 22, "#ff7777", "bold");
  text(String(error && error.message ? error.message : error), 24, 72, 14, "#ffffff");
}

try {
  loop();
} catch (error) {
  drawFatalError(error);
  throw error;
}
