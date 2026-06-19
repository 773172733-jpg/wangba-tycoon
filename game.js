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
const SAFE_TOP = Math.max(systemInfo.statusBarHeight || 0, 34);
const HUD_HEIGHT = SAFE_TOP + 62;
const ACTION_BAR_HEIGHT = 58;

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
  cafeLevel: 1,
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
  procurementOpen: false,
  warehouseOpen: false,
  inventory: {},
  message: "客人进门、前台开机、上机读条、下机离场。",
  messageTimer: 5
};

const guestPalettes = [
  { shirt: "#e84855", hair: "#2d1e1a" },
  { shirt: "#70a1ff", hair: "#2d1e1a" },
  { shirt: "#5ec27f", hair: "#3d2b22" },
  { shirt: "#ffd166", hair: "#2d1e1a" }
];

const products = [
  { id: "noodle", name: "\u6ce1\u9762", unlockLevel: 1, cost: 20, quantity: 10, sellPrice: 6 },
  { id: "water", name: "\u77ff\u6cc9\u6c34", unlockLevel: 1, cost: 12, quantity: 12, sellPrice: 3 },
  { id: "sausage", name: "\u70e4\u80a0", unlockLevel: 1, cost: 18, quantity: 10, sellPrice: 5 },
  { id: "betel", name: "\u69df\u6994", unlockLevel: 1, cost: 30, quantity: 10, sellPrice: 7 },
  { id: "cigarette", name: "\u9999\u70df", unlockLevel: 1, cost: 45, quantity: 5, sellPrice: 18 },
  { id: "snack", name: "\u96f6\u98df\u5c0f\u5403", unlockLevel: 2, cost: 35, quantity: 10, sellPrice: 8 },
  { id: "drink", name: "\u591a\u54c1\u79cd\u996e\u6599", unlockLevel: 2, cost: 42, quantity: 12, sellPrice: 7 },
  { id: "meal", name: "\u9884\u5236\u5feb\u9910", unlockLevel: 3, cost: 80, quantity: 8, sellPrice: 18 },
  { id: "milkTea", name: "\u5976\u8336", unlockLevel: 4, cost: 120, quantity: 10, sellPrice: 22 }
];

const demandProductIds = [
  "noodle",
  "water",
  "sausage",
  "betel",
  "cigarette",
  "snack",
  "drink",
  "meal",
  "milkTea"
];

const ui = {
  procurementButton: null,
  closeProcurementButton: null,
  warehouseButton: null,
  closeWarehouseButton: null,
  warehouseProcurementButton: null,
  buyButtons: []
};

let lastFrameAt = Date.now();

function createLayout() {
  const roomY = HUD_HEIGHT + 18;
  const room = {
    x: 18,
    y: roomY,
    w: view.width - 36,
    h: Math.min(view.height - roomY - ACTION_BAR_HEIGHT - 48, view.width * 1.28)
  };
  room.y = Math.max(roomY, room.y);

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

function canBuyProduct(product) {
  return state.cafeLevel >= product.unlockLevel && state.cash >= product.cost;
}

function buyProduct(product) {
  if (state.cafeLevel < product.unlockLevel) {
    say(`\u7f51\u5427\u7b49\u7ea7\u4e0d\u8db3\uff0c${product.name}\u9700\u8981 ${product.unlockLevel} \u7ea7\u89e3\u9501\u3002`);
    return;
  }

  if (state.cash < product.cost) {
    say(`\u73b0\u91d1\u4e0d\u8db3\uff0c\u65e0\u6cd5\u91c7\u8d2d ${product.name}\u3002`);
    return;
  }

  state.cash -= product.cost;
  state.inventory[product.id] = (state.inventory[product.id] || 0) + product.quantity;
  say(`\u91c7\u8d2d ${product.name} x${product.quantity}\uff0c\u5e93\u5b58\u5df2\u5165\u8d26\u3002`);
}

function getProductById(id) {
  return products.find((product) => product.id === id);
}

function createDemand() {
  const id = demandProductIds[Math.floor(Math.random() * demandProductIds.length)];
  const product = getProductById(id);

  return {
    productId: id,
    productName: product.name,
    timer: 16,
    patience: 16,
    handled: false
  };
}

function tryCreateDemand(guest, dt) {
  if (guest.demand || guest.demandDone || guest.playTimer > guest.playDuration * 0.72) return;

  guest.demandRollTimer -= dt;
  if (guest.demandRollTimer > 0) return;

  guest.demandRollTimer = random(4, 7);
  if (Math.random() < 0.45) {
    guest.demand = createDemand();
    guest.demandDone = true;
    say(`\u987e\u5ba2 ${guest.id} \u60f3\u8981 ${guest.demand.productName}\uff0c\u70b9\u4ed6\u624b\u52a8\u9001\u8d27\u3002`);
  }
}

function updateDemand(guest, dt) {
  if (!guest.demand) return;

  guest.demand.timer -= dt;
  if (guest.demand.timer > 0) return;

  say(`\u987e\u5ba2 ${guest.id} \u7b49\u4e0d\u5230 ${guest.demand.productName}\uff0c\u8fd9\u5355\u6ca1\u8d5a\u5230\u3002`);
  guest.demand = null;
}

function serveGuestDemand(guest) {
  if (!guest || !guest.demand) return false;

  const product = getProductById(guest.demand.productId);
  if (!product) return false;

  if (state.cafeLevel < product.unlockLevel) {
    say(`${product.name} \u9700\u8981\u7f51\u5427 Lv.${product.unlockLevel}\uff0c\u76ee\u524d\u65e0\u6cd5\u63d0\u4f9b\u3002`);
    guest.demand = null;
    return true;
  }

  const stock = state.inventory[product.id] || 0;
  if (stock <= 0) {
    say(`${product.name} \u6ca1\u5e93\u5b58\uff0c\u5148\u53bb\u91c7\u8d2d\u9875\u8fdb\u8d27\u3002`);
    return true;
  }

  state.inventory[product.id] = stock - 1;
  state.cash += product.sellPrice;
  say(`\u9001\u51fa ${product.name}\uff0c\u989d\u5916\u6536\u5165 ${product.sellPrice} \u5143\u3002`);
  guest.demand = null;
  return true;
}

function findTappedGuest(x, y) {
  return state.guests.find((guest) => (
    guest.state === "playing" &&
    x >= guest.x - 18 &&
    x <= guest.x + 18 &&
    y >= guest.y - 42 &&
    y <= guest.y + 20
  ));
}

function isPointInRect(x, y, button) {
  return button &&
    x >= button.x &&
    x <= button.x + button.w &&
    y >= button.y &&
    y <= button.y + button.h;
}

function handleTouch(x, y) {
  if (state.procurementOpen) {
    if (isPointInRect(x, y, ui.closeProcurementButton)) {
      state.procurementOpen = false;
      return;
    }

    const buyButton = ui.buyButtons.find((button) => isPointInRect(x, y, button));
    if (buyButton) {
      buyProduct(buyButton.product);
    }
    return;
  }

  if (state.warehouseOpen) {
    if (isPointInRect(x, y, ui.closeWarehouseButton)) {
      state.warehouseOpen = false;
      return;
    }

    if (isPointInRect(x, y, ui.warehouseProcurementButton)) {
      state.warehouseOpen = false;
      state.procurementOpen = true;
    }
    return;
  }

  if (isPointInRect(x, y, ui.warehouseButton)) {
    state.warehouseOpen = true;
    return;
  }

  if (isPointInRect(x, y, ui.procurementButton)) {
    state.procurementOpen = true;
    return;
  }

  const guest = findTappedGuest(x, y);
  if (guest && serveGuestDemand(guest)) {
    return;
  }
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
    playDuration: random(28, 42),
    demandRollTimer: random(5, 9),
    demand: null,
    demandDone: false,
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
      tryCreateDemand(guest, dt);
      updateDemand(guest, dt);
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

  if (guest.state === "playing" && guest.demand) {
    drawDemandBubble(guest);
  }
}

function drawDemandBubble(guest) {
  const x = Math.round(guest.x);
  const y = Math.round(guest.y) - 48;
  const product = getProductById(guest.demand.productId);
  const label = product ? product.name : guest.demand.productName;
  const bubbleW = Math.max(48, label.length * 15 + 14);
  const bubbleX = Math.max(12, Math.min(view.width - bubbleW - 12, x - bubbleW / 2));
  const progress = Math.max(0, guest.demand.timer / guest.demand.patience);

  rect(bubbleX, y, bubbleW, 28, "#fff1c7");
  strokeRect(bubbleX, y, bubbleW, 28, COLORS.line, 2);
  text(label, bubbleX + bubbleW / 2, y + 4, 13, COLORS.line, "bold", "center");
  rect(bubbleX + 5, y + 22, bubbleW - 10, 3, "#8c6b4a");
  rect(bubbleX + 5, y + 22, (bubbleW - 10) * progress, 3, COLORS.red);
  rect(x - 3, y + 26, 6, 6, "#fff1c7");
}

function drawHud() {
  rect(0, 0, view.width, HUD_HEIGHT, "#273b35");
  rect(0, HUD_HEIGHT - 3, view.width, 3, COLORS.counterTop);
  text("\u5c0f\u9ed1\u7f51\u5427", 16, SAFE_TOP + 6, 20, COLORS.text, "bold");
  text(`\u73b0\u91d1 ${state.cash}`, 16, SAFE_TOP + 38, 13, COLORS.green, "bold");
  text(`\u63a5\u5f85 ${state.served}`, 112, SAFE_TOP + 38, 13, COLORS.blue, "bold");
  text(`\u6d41\u5931 ${state.lost}`, 220, SAFE_TOP + 38, 13, COLORS.red, "bold");

  if (state.messageTimer > 0) {
    rect(12, view.height - ACTION_BAR_HEIGHT - 38, view.width - 24, 26, "#4b3027");
    text(state.message, view.width / 2, view.height - ACTION_BAR_HEIGHT - 31, 11, COLORS.text, "normal", "center");
  }
}

function drawActionBar() {
  const y = view.height - ACTION_BAR_HEIGHT;
  rect(0, y, view.width, ACTION_BAR_HEIGHT, "#273b35");
  rect(0, y, view.width, 3, COLORS.counterTop);

  text(`\u7f51\u5427 Lv.${state.cafeLevel}`, 16, y + 11, 13, COLORS.yellow, "bold");

  const buttonW = 72;
  const buttonH = 34;
  ui.warehouseButton = { x: view.width - buttonW * 2 - 24, y: y + 12, w: buttonW, h: buttonH };
  ui.procurementButton = { x: view.width - buttonW - 14, y: y + 12, w: buttonW, h: buttonH };

  drawActionButton(ui.warehouseButton, "\u4ed3\u5e93");
  drawActionButton(ui.procurementButton, "\u91c7\u8d2d");
}

function drawActionButton(button, label) {
  rect(button.x, button.y, button.w, button.h, "#7f5635");
  strokeRect(button.x, button.y, button.w, button.h, COLORS.counterEdge, 2);
  text(label, button.x + button.w / 2, button.y + 8, 14, COLORS.text, "bold", "center");
}

function drawStockShelf() {
  const c = layout.counter;
  const x = c.x + c.w + 14;
  const y = c.y + 4;
  const shelfW = 46;
  const shelfH = 34;

  if (x + shelfW > layout.room.x + layout.room.w - 10) return;

  rect(x, y, shelfW, shelfH, "#6b3d29");
  strokeRect(x, y, shelfW, shelfH, COLORS.line, 2);
  rect(x + 5, y + 10, shelfW - 10, 3, COLORS.counterEdge);
  rect(x + 7, y + 5, 6, 7, COLORS.red);
  rect(x + 18, y + 5, 6, 7, COLORS.yellow);
  rect(x + 29, y + 5, 6, 7, COLORS.blue);
  rect(x + 10, y + 18, 7, 8, COLORS.green);
  rect(x + 23, y + 18, 7, 8, COLORS.red);
}

function getInventoryTotal() {
  return products.reduce((total, product) => total + (state.inventory[product.id] || 0), 0);
}

function getInventorySummary(limit = 4) {
  const stocked = products
    .map((product) => ({ product, stock: state.inventory[product.id] || 0 }))
    .filter((item) => item.stock > 0);

  if (stocked.length === 0) return "\u4ed3\u5e93\u6682\u65e0\u5e93\u5b58";

  const summary = stocked
    .slice(0, limit)
    .map((item) => `${item.product.name}${item.stock}`)
    .join("  ");
  return stocked.length > limit ? `${summary} ...` : summary;
}

function drawProcurementPanel() {
  if (!state.procurementOpen) return;

  ui.buyButtons.length = 0;

  rect(0, 0, view.width, view.height, "rgba(20, 18, 16, 0.72)");

  const panel = {
    x: 18,
    y: HUD_HEIGHT + 8,
    w: view.width - 36,
    h: view.height - HUD_HEIGHT - 18
  };

  rect(panel.x, panel.y, panel.w, panel.h, "#f0c98a");
  strokeRect(panel.x, panel.y, panel.w, panel.h, COLORS.wallDark, 4);
  rect(panel.x, panel.y, panel.w, 42, "#8c4f35");
  text("\u524d\u53f0\u91c7\u8d2d", panel.x + 16, panel.y + 11, 18, COLORS.text, "bold");
  text(`\u7f51\u5427\u7b49\u7ea7 Lv.${state.cafeLevel}`, panel.x + panel.w - 112, panel.y + 14, 12, COLORS.text, "bold");
  rect(panel.x + 10, panel.y + 46, panel.w - 20, 26, "#e3b86f");
  text(`\u4ed3\u5e93\uff1a${getInventorySummary(5)}  \u603b\u6570 ${getInventoryTotal()}`, panel.x + 18, panel.y + 52, 11, "#5d4532", "bold");

  ui.closeProcurementButton = { x: panel.x + panel.w - 50, y: panel.y + panel.h - 34, w: 38, h: 24 };

  const startY = panel.y + 78;
  const gap = 5;
  const cols = 2;
  const cardW = (panel.w - 26 - gap) / cols;
  const cardH = 72;
  products.forEach((product, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = panel.x + 10 + col * (cardW + gap);
    const y = startY + row * (cardH + gap);
    if (y + cardH > panel.y + panel.h - 36) return;

    const unlocked = state.cafeLevel >= product.unlockLevel;
    const stock = state.inventory[product.id] || 0;
    const unitCost = Math.ceil(product.cost / product.quantity * 10) / 10;
    const cardColor = unlocked ? "#f7dba5" : "#c5a575";
    rect(x, y, cardW, cardH, cardColor);
    strokeRect(x, y, cardW, cardH, unlocked ? "#9a7043" : "#80664f", 2);
    drawProductIcon(product, x + 10, y + 10, !unlocked);

    text(product.name, x + 50, y + 8, 14, unlocked ? COLORS.line : "#745a46", "bold");
    text(`\u5e93\u5b58 ${stock}`, x + 50, y + 26, 11, "#5d4532", "bold");
    text(`\u552e\u4ef7 ${product.sellPrice}`, x + 50, y + 42, 10, "#5d4532");
    text(`\u6210\u672c ${unitCost}\u5143/\u4e2a`, x + 8, y + 49, 10, "#5d4532");
    text(`\u8d77\u6279 ${product.quantity}`, x + 8, y + 61, 10, "#5d4532");

    const button = { x: x + cardW - 48, y: y + cardH - 25, w: 38, h: 20, product };
    ui.buyButtons.push(button);

    if (!unlocked) {
      rect(button.x, button.y, button.w, button.h, "#8d7b66");
      text(`Lv.${product.unlockLevel}`, button.x + button.w / 2, button.y + 5, 11, "#f8e0b0", "bold", "center");
      rect(x, y, cardW, cardH, "rgba(75, 59, 45, 0.18)");
    } else {
      rect(button.x, button.y, button.w, button.h, canBuyProduct(product) ? "#4e8f4f" : "#9a6b55");
      text("\u4e70", button.x + button.w / 2, button.y + 3, 14, COLORS.text, "bold", "center");
    }
  });

  rect(ui.closeProcurementButton.x, ui.closeProcurementButton.y, ui.closeProcurementButton.w, ui.closeProcurementButton.h, "#7f5635");
  strokeRect(ui.closeProcurementButton.x, ui.closeProcurementButton.y, ui.closeProcurementButton.w, ui.closeProcurementButton.h, COLORS.line, 2);
  text("\u5173\u95ed", ui.closeProcurementButton.x + ui.closeProcurementButton.w / 2, ui.closeProcurementButton.y + 4, 12, COLORS.text, "bold", "center");
}

function drawProductIcon(product, x, y, locked) {
  const fade = locked ? "#8c755f" : null;
  const main = fade || {
    noodle: "#d98236",
    water: "#58a6d6",
    sausage: "#b84e3e",
    betel: "#5f9f61",
    cigarette: "#e9dfc7",
    snack: "#e5b94d",
    drink: "#d85c73",
    meal: "#c7834b",
    milkTea: "#c98a62"
  }[product.id] || COLORS.yellow;

  rect(x, y, 32, 32, "#7b563b");
  strokeRect(x, y, 32, 32, COLORS.line, 2);

  if (product.id === "noodle") {
    rect(x + 6, y + 9, 20, 15, main);
    rect(x + 9, y + 12, 14, 2, COLORS.yellow);
    rect(x + 9, y + 17, 14, 2, COLORS.yellow);
  } else if (product.id === "water") {
    rect(x + 11, y + 5, 10, 22, main);
    rect(x + 13, y + 8, 6, 4, "#dff7ff");
    rect(x + 12, y + 3, 8, 3, "#dff7ff");
  } else if (product.id === "sausage") {
    rect(x + 8, y + 8, 16, 16, main);
    rect(x + 6, y + 11, 4, 10, "#e9b56a");
    rect(x + 22, y + 11, 4, 10, "#e9b56a");
  } else if (product.id === "betel") {
    rect(x + 8, y + 9, 16, 14, main);
    rect(x + 12, y + 6, 8, 4, "#85c86e");
    rect(x + 11, y + 14, 10, 3, "#dff0ba");
  } else if (product.id === "cigarette") {
    rect(x + 7, y + 10, 18, 12, main);
    rect(x + 20, y + 10, 5, 12, COLORS.red);
    rect(x + 10, y + 13, 8, 2, "#8b6b4d");
  } else if (product.id === "snack") {
    rect(x + 9, y + 7, 14, 18, main);
    rect(x + 11, y + 10, 10, 3, COLORS.red);
    rect(x + 12, y + 17, 8, 3, "#fff0c5");
  } else if (product.id === "drink") {
    rect(x + 10, y + 7, 12, 19, main);
    rect(x + 12, y + 4, 8, 4, "#f3d8b7");
    rect(x + 13, y + 13, 6, 5, "#fff0c5");
  } else if (product.id === "meal") {
    rect(x + 6, y + 9, 20, 14, main);
    rect(x + 9, y + 12, 7, 5, "#fff0c5");
    rect(x + 17, y + 12, 6, 5, COLORS.green);
  } else if (product.id === "milkTea") {
    rect(x + 10, y + 7, 12, 20, main);
    rect(x + 8, y + 6, 16, 4, "#f3d8b7");
    rect(x + 13, y + 12, 6, 3, "#fff0c5");
    rect(x + 13, y + 20, 3, 3, "#5d4532");
    rect(x + 17, y + 21, 3, 3, "#5d4532");
  }

  if (locked) {
    rect(x + 21, y + 20, 8, 8, "#5a4638");
    rect(x + 23, y + 16, 4, 7, "#5a4638");
  }
}

function drawWarehousePanel() {
  if (!state.warehouseOpen) return;

  rect(0, 0, view.width, view.height, "rgba(20, 18, 16, 0.72)");

  const panel = {
    x: 18,
    y: HUD_HEIGHT + 8,
    w: view.width - 36,
    h: view.height - HUD_HEIGHT - 18
  };

  rect(panel.x, panel.y, panel.w, panel.h, "#f0c98a");
  strokeRect(panel.x, panel.y, panel.w, panel.h, COLORS.wallDark, 4);
  rect(panel.x, panel.y, panel.w, 42, "#8c4f35");
  text("\u4ed3\u5e93", panel.x + 16, panel.y + 11, 18, COLORS.text, "bold");
  text(`\u603b\u5e93\u5b58 ${getInventoryTotal()}`, panel.x + panel.w - 100, panel.y + 14, 12, COLORS.text, "bold");

  const startY = panel.y + 56;
  const gap = 6;
  const cols = 2;
  const cardW = (panel.w - 26 - gap) / cols;
  const cardH = 58;

  products.forEach((product, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = panel.x + 10 + col * (cardW + gap);
    const y = startY + row * (cardH + gap);
    if (y + cardH > panel.y + panel.h - 44) return;

    const unlocked = state.cafeLevel >= product.unlockLevel;
    const stock = state.inventory[product.id] || 0;
    rect(x, y, cardW, cardH, unlocked ? "#f7dba5" : "#c5a575");
    strokeRect(x, y, cardW, cardH, "#9a7043", 2);
    drawProductIcon(product, x + 7, y + 11, !unlocked);
    text(product.name, x + 46, y + 8, 13, unlocked ? COLORS.line : "#745a46", "bold");
    text(`\u5e93\u5b58 ${stock}`, x + 46, y + 28, 12, stock > 0 ? COLORS.green : "#7a5d45", "bold");
    if (!unlocked) {
      text(`Lv.${product.unlockLevel}\u89e3\u9501`, x + cardW - 48, y + 30, 10, COLORS.red, "bold", "center");
    }
  });

  ui.warehouseProcurementButton = { x: panel.x + panel.w - 104, y: panel.y + panel.h - 34, w: 54, h: 24 };
  ui.closeWarehouseButton = { x: panel.x + panel.w - 46, y: panel.y + panel.h - 34, w: 34, h: 24 };

  rect(ui.warehouseProcurementButton.x, ui.warehouseProcurementButton.y, ui.warehouseProcurementButton.w, ui.warehouseProcurementButton.h, "#4e8f4f");
  strokeRect(ui.warehouseProcurementButton.x, ui.warehouseProcurementButton.y, ui.warehouseProcurementButton.w, ui.warehouseProcurementButton.h, COLORS.line, 2);
  text("\u53bb\u91c7\u8d2d", ui.warehouseProcurementButton.x + ui.warehouseProcurementButton.w / 2, ui.warehouseProcurementButton.y + 4, 12, COLORS.text, "bold", "center");

  rect(ui.closeWarehouseButton.x, ui.closeWarehouseButton.y, ui.closeWarehouseButton.w, ui.closeWarehouseButton.h, "#7f5635");
  strokeRect(ui.closeWarehouseButton.x, ui.closeWarehouseButton.y, ui.closeWarehouseButton.w, ui.closeWarehouseButton.h, COLORS.line, 2);
  text("\u5173", ui.closeWarehouseButton.x + ui.closeWarehouseButton.w / 2, ui.closeWarehouseButton.y + 4, 12, COLORS.text, "bold", "center");
}

function drawLegend() {
  text("入口", layout.room.x + 8, layout.entrance.y - 46, 11, COLORS.red, "bold");
  text("开局大厅 4 台机", layout.room.x + layout.room.w / 2, layout.pcs[2].y + 70, 11, COLORS.dimText, "bold", "center");
}

function render() {
  ctx.clearRect(0, 0, view.width, view.height);
  drawPixelFloor();
  drawCounter();
  drawStockShelf();
  layout.pcs.forEach(drawPc);
  drawLegend();
  state.guests.forEach(drawGuest);
  drawHud();
  drawActionBar();
  drawProcurementPanel();
  drawWarehousePanel();
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
  wx.onTouchStart((event) => {
    const touch = event.touches && event.touches[0];
    if (!touch) return;
    handleTouch(touch.clientX, touch.clientY);
  });

  loop();
} catch (error) {
  drawFatalError(error);
  throw error;
}
