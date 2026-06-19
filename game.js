const canvas = wx.createCanvas();
const ctx = canvas.getContext("2d");
const systemInfo = wx.getSystemInfoSync();

const DPR = systemInfo.pixelRatio || 1;
canvas.width = systemInfo.windowWidth * DPR;
canvas.height = systemInfo.windowHeight * DPR;
ctx.scale(DPR, DPR);

const view = {
  width: systemInfo.windowWidth,
  height: systemInfo.windowHeight
};

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
  daySeconds: 0,
  lastSpawnAt: 0,
  message: "小网吧开张了，先把座位坐满赚钱。",
  messageTimer: 4,
  upgrades: [
    {
      id: "seat",
      label: "加座位",
      description: "容量 +1",
      baseCost: 80,
      getCost: () => Math.floor(80 * Math.pow(1.38, state.seats - 4)),
      apply: () => {
        state.seats += 1;
        say("多加了一台机位，晚高峰能多接一个人。");
      }
    },
    {
      id: "computer",
      label: "升电脑",
      description: "客单价提升",
      baseCost: 120,
      getCost: () => Math.floor(120 * Math.pow(1.55, state.computerLevel - 1)),
      apply: () => {
        state.computerLevel += 1;
        say("显卡和显示器升级了，顾客愿意多玩一会。");
      }
    },
    {
      id: "network",
      label: "升网速",
      description: "翻台更快",
      baseCost: 100,
      getCost: () => Math.floor(100 * Math.pow(1.5, state.networkLevel - 1)),
      apply: () => {
        state.networkLevel += 1;
        say("网速更稳了，抱怨少了，翻台也快。");
      }
    },
    {
      id: "snack",
      label: "零食区",
      description: "额外收入",
      baseCost: 90,
      getCost: () => Math.floor(90 * Math.pow(1.45, state.snackLevel)),
      apply: () => {
        state.snackLevel += 1;
        say("泡面、可乐、烤肠安排上了。");
      }
    }
  ]
};

const customerTypes = [
  { name: "学生党", color: "#64b5f6", patience: 8, spend: 14 },
  { name: "上班族", color: "#81c784", patience: 7, spend: 18 },
  { name: "电竞玩家", color: "#ffb74d", patience: 10, spend: 24 },
  { name: "包夜客", color: "#ba68c8", patience: 12, spend: 30 }
];

const buttons = [];
let lastTime = Date.now();

function say(text) {
  state.message = text;
  state.messageTimer = 4;
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function spawnCustomer(now) {
  if (state.customers.length >= state.seats) return;
  const spawnDelay = Math.max(1.15, 3.2 - state.reputation / 55 - state.networkLevel * 0.08);
  if (now - state.lastSpawnAt < spawnDelay) return;

  const type = customerTypes[Math.floor(Math.random() * customerTypes.length)];
  const sessionTime = Math.max(3.5, type.patience - state.networkLevel * 0.45 + rand(-0.8, 1.2));
  state.customers.push({
    type,
    progress: 0,
    sessionTime,
    wobble: rand(0, Math.PI * 2)
  });
  state.lastSpawnAt = now;
}

function finishCustomer(customer) {
  const base = customer.type.spend;
  const computerBonus = state.computerLevel * 7;
  const snackBonus = state.snackLevel * Math.floor(rand(3, 8));
  const reputationBonus = Math.floor(state.reputation / 25);
  const earned = base + computerBonus + snackBonus + reputationBonus;

  state.cash += earned;
  state.totalEarned += earned;
  state.served += 1;
  state.reputation = Math.min(100, state.reputation + 0.35);

  if (state.served % 8 === 0) {
    say(`今天已经接待 ${state.served} 位顾客，口碑慢慢起来了。`);
  }
}

function update(dt) {
  state.daySeconds += dt;
  state.messageTimer = Math.max(0, state.messageTimer - dt);
  spawnCustomer(state.daySeconds);

  for (let i = state.customers.length - 1; i >= 0; i -= 1) {
    const customer = state.customers[i];
    customer.progress += dt / customer.sessionTime;
    if (customer.progress >= 1) {
      finishCustomer(customer);
      state.customers.splice(i, 1);
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

function fillText(text, x, y, size = 16, color = "#f7f3e8", weight = "normal", align = "left") {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillText(text, x, y);
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, view.height);
  gradient.addColorStop(0, "#1f2933");
  gradient.addColorStop(0.52, "#26343a");
  gradient.addColorStop(1, "#182027");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, view.width, view.height);

  ctx.fillStyle = "#2f3f44";
  ctx.fillRect(0, view.height * 0.58, view.width, view.height * 0.42);

  ctx.fillStyle = "#ffc857";
  ctx.fillRect(22, 64, view.width - 44, 10);
  ctx.fillStyle = "#2d2a32";
  roundedRect(36, 34, view.width - 72, 48, 6);
  ctx.fill();
  fillText("网吧老板模拟器", view.width / 2, 46, 23, "#ffe8a3", "bold", "center");
}

function drawStats() {
  const top = 100;
  const stats = [
    `现金 ${state.cash}`,
    `座位 ${state.customers.length}/${state.seats}`,
    `电脑 Lv.${state.computerLevel}`,
    `网速 Lv.${state.networkLevel}`,
    `口碑 ${Math.floor(state.reputation)}`
  ];

  stats.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = 18 + col * ((view.width - 48) / 2 + 12);
    const y = top + row * 38;
    const w = (view.width - 48) / 2;
    roundedRect(x, y, w, 28, 6);
    ctx.fillStyle = "#344850";
    ctx.fill();
    fillText(item, x + 10, y + 6, 14, "#fff6d6", "bold");
  });
}

function drawCafeFloor() {
  const floorTop = 220;
  const floorHeight = Math.max(220, view.height - 420);
  roundedRect(18, floorTop, view.width - 36, floorHeight, 8);
  ctx.fillStyle = "#233037";
  ctx.fill();

  const cols = 2;
  const seatW = (view.width - 72) / cols;
  const seatH = 74;
  const startY = floorTop + 24;

  for (let i = 0; i < state.seats; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 32 + col * (seatW + 18);
    const y = startY + row * (seatH + 14);
    const occupied = state.customers[i];

    roundedRect(x, y, seatW, seatH, 8);
    ctx.fillStyle = occupied ? "#3a5662" : "#2b3b42";
    ctx.fill();

    ctx.fillStyle = "#111827";
    roundedRect(x + 14, y + 12, seatW - 28, 28, 4);
    ctx.fill();
    ctx.fillStyle = occupied ? "#75e6a5" : "#4f6470";
    ctx.fillRect(x + 19, y + 17, seatW - 38, 18);

    if (occupied) {
      const bob = Math.sin(state.daySeconds * 4 + occupied.wobble) * 2;
      ctx.fillStyle = occupied.type.color;
      ctx.beginPath();
      ctx.arc(x + seatW / 2, y + 54 + bob, 12, 0, Math.PI * 2);
      ctx.fill();

      const barW = seatW - 24;
      ctx.fillStyle = "#172026";
      ctx.fillRect(x + 12, y + seatH - 10, barW, 4);
      ctx.fillStyle = "#ffe082";
      ctx.fillRect(x + 12, y + seatH - 10, barW * occupied.progress, 4);
    } else {
      fillText("空位", x + seatW / 2, y + 48, 13, "#9fb0b9", "normal", "center");
    }
  }
}

function drawButtons() {
  buttons.length = 0;
  const panelTop = view.height - 172;
  ctx.fillStyle = "#121920";
  ctx.fillRect(0, panelTop, view.width, 172);

  fillText("升级经营", 18, panelTop + 14, 18, "#f9e6a2", "bold");

  const btnW = (view.width - 54) / 2;
  const btnH = 52;
  state.upgrades.forEach((upgrade, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = 18 + col * (btnW + 18);
    const y = panelTop + 46 + row * 60;
    const cost = upgrade.getCost();
    const canBuy = state.cash >= cost;

    roundedRect(x, y, btnW, btnH, 7);
    ctx.fillStyle = canBuy ? "#2f7d69" : "#34414a";
    ctx.fill();
    ctx.strokeStyle = canBuy ? "#86efac" : "#55636b";
    ctx.lineWidth = 1;
    ctx.stroke();

    fillText(upgrade.label, x + 10, y + 7, 15, "#ffffff", "bold");
    fillText(`${upgrade.description}  $${cost}`, x + 10, y + 30, 12, canBuy ? "#def7ec" : "#b8c0c6");

    buttons.push({ x, y, width: btnW, height: btnH, upgrade });
  });
}

function drawMessage() {
  if (state.messageTimer <= 0) return;
  const y = 176;
  roundedRect(18, y, view.width - 36, 34, 8);
  ctx.fillStyle = "rgba(255, 232, 163, 0.18)";
  ctx.fill();
  fillText(state.message, view.width / 2, y + 8, 13, "#fff0b8", "normal", "center");
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
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  update(dt);
  render();
  requestAnimationFrame(loop);
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
    say("现金不够，先多接待几位顾客。");
    return;
  }

  state.cash -= cost;
  button.upgrade.apply();
}

wx.onTouchStart((event) => {
  const touch = event.touches[0];
  if (!touch) return;
  handleTouch(touch.clientX, touch.clientY);
});

say("小网吧开张了，先升级座位和电脑。");
loop();

