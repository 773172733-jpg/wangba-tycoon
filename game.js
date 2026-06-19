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

const raf = typeof requestAnimationFrame === "function"
  ? requestAnimationFrame
  : (callback) => setTimeout(callback, 16);

const state = {
  cash: 100,
  reputation: 50,
  seats: 4,
  computerLevel: 1,
  networkLevel: 1,
  snackLevel: 0,
  customers: [],
  served: 0,
  totalEarned: 0,
  time: 0,
  lastSpawnAt: 0,
  message: "Cafe opened. Upgrade seats and PCs first.",
  messageTimer: 4
};

const customerTypes = [
  { name: "Student", color: "#64b5f6", patience: 8, spend: 14 },
  { name: "Worker", color: "#81c784", patience: 7, spend: 18 },
  { name: "Gamer", color: "#ffb74d", patience: 10, spend: 24 },
  { name: "Night Owl", color: "#ba68c8", patience: 12, spend: 30 }
];

const upgrades = [
  {
    label: "Seat",
    description: "Capacity +1",
    getCost: () => Math.floor(80 * Math.pow(1.38, state.seats - 4)),
    apply: () => {
      state.seats += 1;
      say("New seat installed. More guests can play.");
    }
  },
  {
    label: "PC",
    description: "Higher spend",
    getCost: () => Math.floor(120 * Math.pow(1.55, state.computerLevel - 1)),
    apply: () => {
      state.computerLevel += 1;
      say("PCs upgraded. Guests pay more per session.");
    }
  },
  {
    label: "Net",
    description: "Faster turnover",
    getCost: () => Math.floor(100 * Math.pow(1.5, state.networkLevel - 1)),
    apply: () => {
      state.networkLevel += 1;
      say("Network upgraded. Sessions finish faster.");
    }
  },
  {
    label: "Snack",
    description: "Extra income",
    getCost: () => Math.floor(90 * Math.pow(1.45, state.snackLevel)),
    apply: () => {
      state.snackLevel += 1;
      say("Snack shelf added. Extra sales unlocked.");
    }
  }
];

const buttons = [];
let lastFrameAt = Date.now();

function say(text) {
  state.message = text;
  state.messageTimer = 4;
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function spawnCustomer(now) {
  if (state.customers.length >= state.seats) return;

  const delay = Math.max(1.1, 3.25 - state.reputation / 55 - state.networkLevel * 0.08);
  if (now - state.lastSpawnAt < delay) return;

  const type = customerTypes[Math.floor(Math.random() * customerTypes.length)];
  const sessionTime = Math.max(3.5, type.patience - state.networkLevel * 0.45 + random(-0.8, 1.2));

  state.customers.push({
    type,
    progress: 0,
    sessionTime,
    wobble: random(0, Math.PI * 2)
  });
  state.lastSpawnAt = now;
}

function finishCustomer(customer) {
  const earned = customer.type.spend +
    state.computerLevel * 7 +
    state.snackLevel * Math.floor(random(3, 8)) +
    Math.floor(state.reputation / 25);

  state.cash += earned;
  state.totalEarned += earned;
  state.served += 1;
  state.reputation = Math.min(100, state.reputation + 0.35);

  if (state.served % 8 === 0) {
    say(`Served ${state.served} guests. Reputation is rising.`);
  }
}

function update(dt) {
  state.time += dt;
  state.messageTimer = Math.max(0, state.messageTimer - dt);
  spawnCustomer(state.time);

  for (let index = state.customers.length - 1; index >= 0; index -= 1) {
    const customer = state.customers[index];
    customer.progress += dt / customer.sessionTime;

    if (customer.progress >= 1) {
      finishCustomer(customer);
      state.customers.splice(index, 1);
    }
  }
}

function roundedRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function text(value, x, y, size, color, weight = "normal", align = "left") {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px Arial, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillText(value, x, y);
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, view.height);
  gradient.addColorStop(0, "#22313a");
  gradient.addColorStop(0.55, "#2c3f43");
  gradient.addColorStop(1, "#172027");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, view.width, view.height);

  ctx.fillStyle = "#314449";
  ctx.fillRect(0, view.height * 0.58, view.width, view.height * 0.42);

  roundedRect(26, 28, view.width - 52, 58, 8);
  ctx.fillStyle = "#191f27";
  ctx.fill();
  ctx.strokeStyle = "#ffc857";
  ctx.lineWidth = 3;
  ctx.stroke();
  text("Wangba Tycoon", view.width / 2, 45, 24, "#ffe8a3", "bold", "center");
}

function drawStats() {
  const stats = [
    `Cash $${state.cash}`,
    `Seats ${state.customers.length}/${state.seats}`,
    `PC Lv.${state.computerLevel}`,
    `Net Lv.${state.networkLevel}`,
    `Rep ${Math.floor(state.reputation)}`
  ];

  stats.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const cardWidth = (view.width - 48) / 2;
    const x = 18 + col * (cardWidth + 12);
    const y = 104 + row * 38;

    roundedRect(x, y, cardWidth, 28, 6);
    ctx.fillStyle = "#3b5058";
    ctx.fill();
    text(item, x + 10, y + 6, 14, "#fff6d6", "bold");
  });
}

function drawMessage() {
  if (state.messageTimer <= 0) return;

  roundedRect(18, 178, view.width - 36, 36, 8);
  ctx.fillStyle = "rgba(255, 232, 163, 0.18)";
  ctx.fill();
  text(state.message, view.width / 2, 188, 13, "#fff0b8", "normal", "center");
}

function drawCafeFloor() {
  const floorTop = 226;
  const floorBottom = view.height - 184;
  const floorHeight = Math.max(210, floorBottom - floorTop);

  roundedRect(18, floorTop, view.width - 36, floorHeight, 8);
  ctx.fillStyle = "#263841";
  ctx.fill();

  const cols = 2;
  const seatWidth = (view.width - 72) / cols;
  const seatHeight = 74;
  const startY = floorTop + 22;

  for (let index = 0; index < state.seats; index += 1) {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = 32 + col * (seatWidth + 18);
    const y = startY + row * (seatHeight + 14);
    const occupied = state.customers[index];

    roundedRect(x, y, seatWidth, seatHeight, 8);
    ctx.fillStyle = occupied ? "#3f626b" : "#30444c";
    ctx.fill();

    roundedRect(x + 14, y + 12, seatWidth - 28, 28, 4);
    ctx.fillStyle = "#111827";
    ctx.fill();
    ctx.fillStyle = occupied ? "#75e6a5" : "#647987";
    ctx.fillRect(x + 19, y + 17, seatWidth - 38, 18);

    if (occupied) {
      const bob = Math.sin(state.time * 4 + occupied.wobble) * 2;
      ctx.fillStyle = occupied.type.color;
      ctx.beginPath();
      ctx.arc(x + seatWidth / 2, y + 54 + bob, 12, 0, Math.PI * 2);
      ctx.fill();

      const barWidth = seatWidth - 24;
      ctx.fillStyle = "#172026";
      ctx.fillRect(x + 12, y + seatHeight - 10, barWidth, 4);
      ctx.fillStyle = "#ffe082";
      ctx.fillRect(x + 12, y + seatHeight - 10, barWidth * occupied.progress, 4);
    } else {
      text("Empty", x + seatWidth / 2, y + 48, 13, "#b7c7cf", "normal", "center");
    }
  }
}

function drawButtons() {
  buttons.length = 0;
  const panelTop = view.height - 172;

  ctx.fillStyle = "#121920";
  ctx.fillRect(0, panelTop, view.width, 172);
  text("Upgrades", 18, panelTop + 14, 18, "#f9e6a2", "bold");

  const buttonWidth = (view.width - 54) / 2;
  const buttonHeight = 52;

  upgrades.forEach((upgrade, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = 18 + col * (buttonWidth + 18);
    const y = panelTop + 46 + row * 60;
    const cost = upgrade.getCost();
    const canBuy = state.cash >= cost;

    roundedRect(x, y, buttonWidth, buttonHeight, 7);
    ctx.fillStyle = canBuy ? "#2f7d69" : "#34414a";
    ctx.fill();
    ctx.strokeStyle = canBuy ? "#86efac" : "#55636b";
    ctx.lineWidth = 1;
    ctx.stroke();

    text(upgrade.label, x + 10, y + 7, 15, "#ffffff", "bold");
    text(`${upgrade.description} $${cost}`, x + 10, y + 30, 12, canBuy ? "#def7ec" : "#b8c0c6");

    buttons.push({ x, y, width: buttonWidth, height: buttonHeight, upgrade });
  });
}

function render() {
  ctx.clearRect(0, 0, view.width, view.height);
  drawBackground();
  drawStats();
  drawMessage();
  drawCafeFloor();
  drawButtons();
}

function loop() {
  const now = Date.now();
  const dt = Math.min(0.05, (now - lastFrameAt) / 1000);
  lastFrameAt = now;

  update(dt);
  render();
  raf(loop);
}

function handleTouch(x, y) {
  const button = buttons.find((item) => (
    x >= item.x &&
    x <= item.x + item.width &&
    y >= item.y &&
    y <= item.y + item.height
  ));

  if (!button) return;

  const cost = button.upgrade.getCost();
  if (state.cash < cost) {
    say("Not enough cash. Serve more guests first.");
    return;
  }

  state.cash -= cost;
  button.upgrade.apply();
}

function drawFatalError(error) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#1b1b1b";
  ctx.fillRect(0, 0, view.width, view.height);
  text("Startup error", 24, 32, 22, "#ff7777", "bold");
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

