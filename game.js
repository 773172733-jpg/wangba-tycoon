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
const STORAGE_KEY = "wangbaTycoonSaveV1";
const TEST_MODE_KEY = "wangbaTycoonTestMode";
const MAX_OPERATIONAL_PCS = 12;
const WORLD_LEFT_MARGIN = 220;
const WORLD_TOP_MARGIN = 180;
const WORLD = {
  w: Math.max(view.width * 2.7, 1040),
  h: Math.max(view.height * 2.2, 1260)
};

screenCanvas.width = view.width * dpr;
screenCanvas.height = view.height * dpr;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
ctx.imageSmoothingEnabled = false;

const raf = typeof requestAnimationFrame === "function"
  ? requestAnimationFrame
  : (callback) => setTimeout(callback, 16);

const TILE = 12;
const SAVE_INTERVAL = 20;
const {
  COLORS,
  SPRITE_SCALE,
  assetSources,
  products,
  staffTypes,
  equipmentTiers,
  expansionTypes,
  demandProductIds,
  guestTypes
} = require("./src/config");

const assets = {};

const layout = createLayout();
const state = {
  cash: 10000,
  cafeLevel: 1,
  equipmentLevel: 1,
  cleanliness: 100,
  served: 0,
  lost: 0,
  time: 0,
  nextGuestAt: 5,
  guestId: 1,
  guests: [],
  frontDesk: {
    busyGuestId: null,
    timer: 0,
    duration: 1.15
  },
  toilet: {
    dirty: false,
    useCount: 0
  },
  procurementOpen: false,
  warehouseOpen: false,
  hiringOpen: false,
  equipmentOpen: false,
  expansionOpen: false,
  layoutOpen: false,
  pricingOpen: false,
  settingsOpen: false,
  testMode: loadTestModeSetting(),
  saveTimer: 0,
  saveDirty: false,
  actionGroup: "daily",
  panelPages: {
    procurement: 0,
    warehouse: 0,
    hiring: 0,
    expansion: 0,
    equipment: 0,
    equipmentPc: 0
  },
  pendingExpansion: null,
  confirmDialog: null,
  purchaseQuantities: {},
  layoutToolActive: false,
  layoutMode: "area",
  selectedAreaId: null,
  selectedPcId: null,
  invalidFloorHint: null,
  camera: {
    x: WORLD_LEFT_MARGIN,
    y: WORLD_TOP_MARGIN
  },
  nextAreaId: 2,
  rentedAreas: [
    { id: 1, typeId: "livingRoom", name: "\u5ba2\u5385\u533a\u57df", pcCount: 4, hourlyRate: 5, x: 18, y: 0, w: 0, h: 0 }
  ],
  employees: {
    cashier: 0,
    floor: 0,
    cleaner: 0,
    manager: 0,
    companion: 0
  },
  workerId: 1,
  workers: [],
  publicFloors: [],
  inventory: {},
  message: "客人进门、前台开机、上机读条、下机离场。",
  messageTimer: 5
};
state.rentedAreas[0].x = layout.room.x;
state.rentedAreas[0].y = layout.room.y;
state.rentedAreas[0].w = layout.room.w;
state.rentedAreas[0].h = layout.room.h;

const guestPalettes = [
  { shirt: "#e84855", hair: "#2d1e1a" },
  { shirt: "#70a1ff", hair: "#2d1e1a" },
  { shirt: "#5ec27f", hair: "#3d2b22" },
  { shirt: "#ffd166", hair: "#2d1e1a" }
];

const ui = {
  procurementButton: null,
  dailyGroupButton: null,
  buildGroupButton: null,
  systemGroupButton: null,
  closeProcurementButton: null,
  warehouseButton: null,
  closeWarehouseButton: null,
  warehouseProcurementButton: null,
  hiringButton: null,
  closeHiringButton: null,
  equipmentButton: null,
  expansionButton: null,
  layoutButton: null,
  settingsButton: null,
  closeExpansionButton: null,
  closeLayoutButton: null,
  layoutModeButtons: [],
  closeEquipmentButton: null,
  cancelEquipmentSelectionButton: null,
  closeSettingsButton: null,
  toggleTestModeButton: null,
  saveGameButton: null,
  clearSaveButton: null,
  pricingButton: null,
  closePricingButton: null,
  confirmYesButton: null,
  confirmNoButton: null,
  priceButtons: [],
  pageButtons: [],
  purchaseBatchButtons: [],
  rentAreaButtons: [],
  upgradeEquipmentButtons: [],
  equipmentPcButtons: [],
  hireButtons: [],
  buyButtons: []
};

let lastFrameAt = Date.now();
const touchState = {
  active: false,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  moved: false
};

function createLayout() {
  const roomY = HUD_HEIGHT + WORLD_TOP_MARGIN + 18;
  const room = {
    x: WORLD_LEFT_MARGIN + 18,
    y: roomY,
    w: Math.max(360, view.width - 36),
    h: Math.max(420, Math.min(view.height - roomY - ACTION_BAR_HEIGHT - 48, view.width * 1.28))
  };
  room.y = Math.max(roomY, room.y);

  const counter = {
    x: room.x + room.w * 0.32,
    y: room.y + 76,
    w: room.w * 0.42,
    h: 44
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
    createPc(0, pcLeft, pcTop, 1, "\u5ba2\u5385"),
    createPc(1, pcLeft + pcGapX, pcTop, 1, "\u5ba2\u5385"),
    createPc(2, pcLeft, pcTop + pcGapY, 1, "\u5ba2\u5385"),
    createPc(3, pcLeft + pcGapX, pcTop + pcGapY, 1, "\u5ba2\u5385")
  ];

  const toilet = {
    id: "toilet",
    typeId: "toiletRoom",
    name: "\u5395\u6240",
    pcCount: 0,
    x: room.x + room.w,
    y: room.y + room.h - 126,
    w: 78,
    h: 92,
    standX: room.x + room.w + 39,
    standY: room.y + room.h - 72
  };

  const staffHome = {
    cashier: { x: counter.x + counter.w - 22, y: counter.y + counter.h - 8 },
    floor: { x: room.x + 34, y: room.y + room.h - 76 },
    cleaner: { x: room.x + room.w - 34, y: room.y + room.h - 76 },
    manager: { x: counter.x + 18, y: counter.y + counter.h - 8 },
    companion: { x: room.x + room.w - 70, y: room.y + 90 }
  };

  return { room, counter, entrance, queue, pcs, toilet, staffHome };
}

function createPc(id, x, y, areaId = 1, areaName = "\u5ba2\u5385") {
  return {
    id,
    x,
    y,
    w: 42,
    h: 36,
    seatX: x + 21,
    seatY: getPcSeatY(y),
    areaId,
    areaName,
    occupiedBy: null,
    equipmentLevel: 1,
    dirty: false
  };
}

function getPcSeatY(pcY) {
  return pcY + 58;
}

function getExpansionType(typeId) {
  return expansionTypes.find((type) => type.id === typeId);
}

function getAreaRentCost(type, pcCount) {
  return type.baseCost + type.pricePerPc * pcCount;
}

function getAreaSize(type, pcCount) {
  if (type.id === "multiRoom") return { w: pcCount >= 8 ? 270 : 220, h: pcCount >= 8 ? 190 : 150 };
  if (type.id === "doubleRoom") return { w: 160, h: 120 };
  if (type.id === "singleRoom") return { w: 116, h: 112 };
  if (type.id === "capsuleRoom") return { w: 132, h: 120 };
  if (type.id === "showerRoom") return { w: 126, h: 108 };
  if (type.id === "chessRoom") return { w: 170, h: 130 };
  return { w: 140, h: 120 };
}

function getRentedAmenityCount(typeId) {
  return state.rentedAreas.filter((area) => area.typeId === typeId).length;
}

function getDefaultAreaRate(typeId) {
  return {
    livingRoom: 5,
    multiRoom: 12,
    doubleRoom: 14,
    singleRoom: 16,
    capsuleRoom: 20,
    showerRoom: 0,
    chessRoom: 0
  }[typeId] || 8;
}

function isHallArea(area) {
  return area && area.typeId === "livingRoom";
}

function isRoomArea(area) {
  return area && area.typeId !== "livingRoom" && area.pcCount > 0;
}

function getAreaHourlyRate(areaId) {
  const area = getAreaById(areaId);
  return area && Number.isFinite(area.hourlyRate) ? area.hourlyRate : getDefaultAreaRate(area && area.typeId);
}

function chooseWeightedGuestType() {
  const total = guestTypes.reduce((sum, type) => sum + getGuestTypeWeight(type), 0);
  let roll = Math.random() * total;
  for (let index = 0; index < guestTypes.length; index += 1) {
    roll -= getGuestTypeWeight(guestTypes[index]);
    if (roll <= 0) return guestTypes[index];
  }
  return guestTypes[0];
}

function getGuestTypeWeight(guestType) {
  const roomPcCount = layout.pcs.filter((pc) => isRoomArea(getAreaById(pc.areaId))).length;
  if (guestType.areaPreference === "room") {
    return roomPcCount > 0 ? guestType.weight + roomPcCount * 0.85 : guestType.weight * 0.18;
  }
  if (guestType.areaPreference === "any" && roomPcCount > 0) {
    return guestType.weight + roomPcCount * 0.25;
  }
  return guestType.weight;
}

function pcMatchesGuest(pc, guestType) {
  const area = getAreaById(pc.areaId);
  if (!area) return false;
  if (pc.occupiedBy || pc.dirty) return false;
  if (pc.equipmentLevel < guestType.minEquipmentLevel) return false;
  if (getAreaHourlyRate(pc.areaId) > guestType.maxRate) return false;
  if (guestType.areaPreference === "hall" && !isHallArea(area)) return false;
  if (guestType.areaPreference === "room" && !isRoomArea(area)) return false;
  return true;
}

function hasPcForGuestType(guestType) {
  return layout.pcs.some((pc) => pcMatchesGuest(pc, guestType));
}

function adjustAreaRate(area, delta) {
  if (!area || area.pcCount <= 0) return;
  const current = getAreaHourlyRate(area.id);
  area.hourlyRate = Math.max(3, Math.min(60, current + delta));
  markSaveDirty();
  say(`${area.name} \u8ba1\u8d39\u8c03\u6574\u4e3a ${area.hourlyRate} \u5143/\u5c0f\u65f6\u3002`);
}

function canRentArea(type, pcCount) {
  if (layout.pcs.length + pcCount > MAX_OPERATIONAL_PCS) return false;
  return state.cash >= getAreaRentCost(type, pcCount);
}

function rentArea(type, pcCount) {
  const cost = getAreaRentCost(type, pcCount);
  if (layout.pcs.length + pcCount > MAX_OPERATIONAL_PCS) {
    say(`\u5f53\u524d\u6700\u591a\u5148\u8fd0\u8425 ${MAX_OPERATIONAL_PCS} \u53f0\u673a\uff0c\u540e\u7eed\u518d\u5f00\u653e\u697c\u5c42\u7cfb\u7edf\u3002`);
    return;
  }

  if (state.cash < cost) {
    say(`\u73b0\u91d1\u4e0d\u8db3\uff0c\u6269\u79df ${type.name} \u9700\u8981 ${cost} \u5143\u3002`);
    return;
  }

  state.pendingExpansion = {
    typeId: type.id,
    pcCount,
    cost
  };
  state.expansionOpen = false;
  say(`\u5df2\u9009\u62e9 ${type.name}\uff0c\u62d6\u52a8\u5730\u56fe\u627e\u5899\u8fb9\uff0c\u70b9\u51fb\u8d34\u5899\u653e\u7f6e\u3002`);
}

function getPendingExpansionType() {
  return state.pendingExpansion && getExpansionType(state.pendingExpansion.typeId);
}

function placePendingExpansion(worldX, worldY) {
  const pending = state.pendingExpansion;
  const type = getPendingExpansionType();
  if (!pending || !type) return false;

  if (layout.pcs.length + pending.pcCount > MAX_OPERATIONAL_PCS) {
    say(`\u5f53\u524d\u6700\u591a\u5148\u8fd0\u8425 ${MAX_OPERATIONAL_PCS} \u53f0\u673a\u3002`);
    state.pendingExpansion = null;
    return true;
  }

  if (state.cash < pending.cost) {
    say(`\u73b0\u91d1\u4e0d\u8db3\uff0c\u6269\u79df ${type.name} \u9700\u8981 ${pending.cost} \u5143\u3002`);
    state.pendingExpansion = null;
    return true;
  }

  const size = getAreaSize(type, pending.pcCount);
  const candidate = getAttachedAreaCandidate(worldX, worldY, size);
  if (!candidate) {
    say("\u65b0\u533a\u57df\u9700\u8981\u8d34\u7740\u5df2\u6709\u5916\u5899\uff0c\u9760\u8fd1\u5927\u5385\u5899\u8fb9\u518d\u70b9\u3002");
    return true;
  }

  if (!isAreaPlacementFree(candidate.area)) {
    say("\u8fd9\u4fa7\u5899\u5916\u5df2\u7ecf\u6709\u623f\u95f4\u4e86\uff0c\u6362\u4e00\u9762\u5899\u518d\u8bd5\u3002");
    return true;
  }

  state.cash -= pending.cost;
  state.nextAreaId += 1;
  const area = Object.assign(candidate.area, {
    id: state.nextAreaId - 1,
    typeId: type.id,
    name: type.name,
    pcCount: pending.pcCount
  });
  area.hourlyRate = getDefaultAreaRate(area.typeId);
  state.rentedAreas.push(area);
  addAreaPcs(area);
  state.pendingExpansion = null;
  updateEquipmentLevel();
  updateCafeLevel();
  markSaveDirty();
  say(`\u5df2\u653e\u7f6e ${type.name}${pending.pcCount ? ` ${pending.pcCount} \u53f0\u673a` : ""}\uff0c\u65b0\u533a\u57df\u5f00\u5f20\u3002`);
  return true;
}

function snapToGrid(value) {
  return Math.round(value / 24) * 24;
}

function clampAreaToWorld(area) {
  area.x = Math.max(12, Math.min(WORLD.w - area.w - 12, area.x));
  area.y = Math.max(HUD_HEIGHT + 12, Math.min(WORLD.h - ACTION_BAR_HEIGHT - area.h - 12, area.y));
}

function getAttachedAreaCandidate(worldX, worldY, size, ignoreAreaId = null) {
  let best = null;
  getAttachableAreas().forEach((host) => {
    if (host.id === ignoreAreaId) return;
    const candidates = getAttachedCandidatesForHost(host, worldX, worldY, size);
    candidates.forEach((candidate) => {
      clampAreaToWorld(candidate.area);
      if (!sharesWall(host, candidate.area)) return;
      const score = distanceToRectCenter(worldX, worldY, candidate.area);
      if (score > 190) return;
      if (!best || score < best.score) {
        best = { area: candidate.area, host, side: candidate.side, score };
      }
    });
  });
  return best;
}

function clamp(value, min, max) {
  if (max < min) return min;
  return Math.max(min, Math.min(max, value));
}

function sharesWall(a, b) {
  const horizontalTouch = a.y + a.h === b.y || b.y + b.h === a.y;
  const verticalOverlap = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const verticalTouch = a.x + a.w === b.x || b.x + b.w === a.x;
  const horizontalOverlap = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return horizontalTouch && verticalOverlap >= 36 || verticalTouch && horizontalOverlap >= 36;
}

function isAreaPlacementFree(area, ignoreAreaId = null) {
  return !getAttachableAreas().some((other) => other.id !== ignoreAreaId && rectanglesOverlap(area, other, 0));
}

function rectanglesOverlap(a, b, padding = 0) {
  return a.x < b.x + b.w + padding &&
    a.x + a.w + padding > b.x &&
    a.y < b.y + b.h + padding &&
    a.y + a.h + padding > b.y;
}

function getAreaById(id) {
  if (id === layout.toilet.id) return layout.toilet;
  return state.rentedAreas.find((area) => area.id === id);
}

function getStructuralAreas() {
  return state.rentedAreas.concat([layout.toilet]);
}

function getAttachableAreas() {
  return getStructuralAreas().concat(state.publicFloors);
}

function distanceToRectCenter(x, y, rectValue) {
  return Math.hypot(x - (rectValue.x + rectValue.w / 2), y - (rectValue.y + rectValue.h / 2));
}

function getAreaAtPoint(x, y) {
  if (x >= layout.toilet.x && x <= layout.toilet.x + layout.toilet.w &&
      y >= layout.toilet.y && y <= layout.toilet.y + layout.toilet.h) {
    return layout.toilet;
  }

  for (let index = state.rentedAreas.length - 1; index >= 0; index -= 1) {
    const area = state.rentedAreas[index];
    if (x >= area.x && x <= area.x + area.w && y >= area.y && y <= area.y + area.h) {
      return area;
    }
  }
  return null;
}

function getPcAtPoint(x, y) {
  return layout.pcs.find((pc) => (
    x >= pc.x - 8 &&
    x <= pc.x + pc.w + 8 &&
    y >= pc.y - 20 &&
    y <= pc.y + pc.h + 16
  ));
}

function handleLayoutTouch(worldX, worldY) {
  if (state.layoutMode === "floor") {
    addPublicFloor(worldX, worldY);
    return true;
  }

  if (state.layoutMode === "pc") {
    movePcLayout(worldX, worldY);
    return true;
  }

  moveAreaLayout(worldX, worldY);
  return true;
}

function addPublicFloor(worldX, worldY) {
  const existingIndex = state.publicFloors.findIndex((item) => (
    worldX >= item.x &&
    worldX <= item.x + item.w &&
    worldY >= item.y &&
    worldY <= item.y + item.h
  ));
  if (existingIndex >= 0) {
    state.publicFloors.splice(existingIndex, 1);
    markSaveDirty();
    say("\u5df2\u79fb\u9664\u8fd9\u5757\u516c\u533a\u5730\u7816\u3002");
    return;
  }

  const candidate = getPublicFloorCandidate(worldX, worldY);
  if (!candidate || !isPublicFloorPlacementFree(candidate.floor)) {
    state.invalidFloorHint = {
      x: snapToGrid(worldX - 36),
      y: snapToGrid(worldY - 36),
      timer: 1.2
    };
    say("\u516c\u533a\u5730\u7816\u5fc5\u987b\u8d34\u5899\u6216\u5bf9\u9f50\u4e0a\u4e00\u5757\u5730\u7816\uff0c\u8fd9\u91cc\u4e0d\u80fd\u94fa\u3002");
    return;
  }

  candidate.floor.id = `floor-${candidate.floor.x}-${candidate.floor.y}`;
  candidate.floor.typeId = "publicFloor";
  candidate.floor.name = "\u516c\u533a\u5730\u7816";
  state.publicFloors.push(candidate.floor);
  markSaveDirty();
  say(candidate.hostType === "floor" ? "\u516c\u533a\u8fc7\u9053\u5df2\u5bf9\u9f50\u5ef6\u5c55\u3002" : "\u5df2\u8d34\u5899\u94fa\u8bbe\u516c\u533a\u5730\u7816\uff0c\u5899\u4f53\u5df2\u6253\u901a\u3002");
}

function getPublicFloorCandidate(worldX, worldY) {
  const size = { w: 72, h: 72 };
  let best = null;
  const snapped = {
    x: snapToGrid(worldX - size.w / 2),
    y: snapToGrid(worldY - size.h / 2),
    w: size.w,
    h: size.h
  };
  clampAreaToWorld(snapped);
  if (canAttachPublicFloor(snapped)) {
    return {
      floor: snapped,
      hostType: state.publicFloors.some((floor) => sharesWall(floor, snapped)) ? "floor" : "wall",
      score: distanceToRectCenter(worldX, worldY, snapped)
    };
  }

  getStructuralAreas().forEach((host) => {
    const candidates = getAttachedCandidatesForHost(host, worldX, worldY, size);
    candidates.forEach((candidate) => {
      clampAreaToWorld(candidate.area);
      if (!sharesWall(host, candidate.area)) return;
      const score = distanceToRectCenter(worldX, worldY, candidate.area);
      if (score > 95) return;
      if (!best || score < best.score) {
        best = { floor: candidate.area, hostType: "wall", score };
      }
    });
  });

  state.publicFloors.forEach((host) => {
    const candidates = getAttachedCandidatesForHost(host, worldX, worldY, size);
    candidates.forEach((candidate) => {
      clampAreaToWorld(candidate.area);
      if (!sharesWall(host, candidate.area)) return;
      if (!isAlignedPublicFloor(host, candidate.area)) return;
      const score = distanceToRectCenter(worldX, worldY, candidate.area);
      if (score > 95) return;
      if (!best || score < best.score) {
        best = { floor: candidate.area, hostType: "floor", score };
      }
    });
  });

  return best;
}

function canAttachPublicFloor(floor) {
  const attachedToWall = getStructuralAreas().some((area) => sharesWall(area, floor));
  const attachedToFloor = state.publicFloors.some((item) => sharesWall(item, floor) && isAlignedPublicFloor(item, floor));
  return attachedToWall || attachedToFloor;
}

function getAttachedCandidatesForHost(host, worldX, worldY, size) {
  return [
    {
      side: "top",
      area: {
        x: snapToGrid(clamp(worldX - size.w / 2, host.x, host.x + host.w - size.w)),
        y: host.y - size.h,
        w: size.w,
        h: size.h
      }
    },
    {
      side: "bottom",
      area: {
        x: snapToGrid(clamp(worldX - size.w / 2, host.x, host.x + host.w - size.w)),
        y: host.y + host.h,
        w: size.w,
        h: size.h
      }
    },
    {
      side: "left",
      area: {
        x: host.x - size.w,
        y: snapToGrid(clamp(worldY - size.h / 2, host.y, host.y + host.h - size.h)),
        w: size.w,
        h: size.h
      }
    },
    {
      side: "right",
      area: {
        x: host.x + host.w,
        y: snapToGrid(clamp(worldY - size.h / 2, host.y, host.y + host.h - size.h)),
        w: size.w,
        h: size.h
      }
    }
  ];
}

function isPublicFloorPlacementFree(floor) {
  const overlapsRoom = getStructuralAreas().some((area) => rectanglesOverlap(floor, area, 0));
  const overlapsFloor = state.publicFloors.some((item) => rectanglesOverlap(floor, item, 0));
  return !overlapsRoom && !overlapsFloor;
}

function isAlignedPublicFloor(host, floor) {
  return host.x === floor.x || host.y === floor.y;
}

function movePcLayout(worldX, worldY) {
  if (!state.selectedPcId) {
    const pc = getPcAtPoint(worldX, worldY);
    if (!pc) {
      say("\u5148\u70b9\u4e00\u53f0\u8981\u79fb\u52a8\u7684\u7535\u8111\u3002");
      return;
    }
    state.selectedPcId = pc.id + 1;
    say(`${pc.id + 1} \u53f7\u673a\u5df2\u9009\u4e2d\uff0c\u5728\u5b83\u6240\u5c5e\u533a\u57df\u5185\u70b9\u65b0\u4f4d\u7f6e\u3002`);
    return;
  }

  const pc = layout.pcs[state.selectedPcId - 1];
  const area = pc && getAreaById(pc.areaId);
  if (!pc || !area) {
    state.selectedPcId = null;
    return;
  }

  const nextX = snapToGrid(worldX - pc.w / 2);
  const nextY = snapToGrid(worldY - pc.h / 2);
  const nextSeatY = getPcSeatY(nextY);
  if (nextX < area.x + 12 || nextX + pc.w > area.x + area.w - 12 ||
      nextY < area.y + 34 || nextY + pc.h > area.y + area.h - 12 ||
      nextSeatY > area.y + area.h - 10) {
    say("\u7535\u8111\u53ea\u80fd\u5728\u6240\u5c5e\u533a\u57df\u5185\u5fae\u8c03\u3002");
    return;
  }

  pc.x = nextX;
  pc.y = nextY;
  pc.seatX = pc.x + pc.w / 2;
  pc.seatY = getPcSeatY(pc.y);
  state.selectedPcId = null;
  markSaveDirty();
  say(`${pc.id + 1} \u53f7\u673a\u4f4d\u7f6e\u5df2\u8c03\u6574\u3002`);
}

function moveAreaLayout(worldX, worldY) {
  if (!state.selectedAreaId) {
    const area = getAreaAtPoint(worldX, worldY);
    if (!area || area.id === 1) {
      say("\u5148\u70b9\u4e00\u4e2a\u5df2\u6269\u79df\u7684\u533a\u57df\u6216\u5395\u6240\u3002");
      return;
    }
    state.selectedAreaId = area.id;
    say(`${area.name} \u5df2\u9009\u4e2d\uff0c\u9760\u8fd1\u5176\u4ed6\u5899\u8fb9\u70b9\u51fb\u91cd\u65b0\u8d34\u653e\u3002`);
    return;
  }

  const area = getAreaById(state.selectedAreaId);
  if (!area) {
    state.selectedAreaId = null;
    return;
  }

  const candidate = getAttachedAreaCandidate(worldX, worldY, { w: area.w, h: area.h }, area.id);
  if (!candidate || !isAreaPlacementFree(candidate.area, area.id)) {
    say("\u9700\u8981\u8d34\u7740\u5176\u4ed6\u5df2\u6709\u5899\u9762\uff0c\u4e14\u4e0d\u80fd\u548c\u623f\u95f4\u91cd\u53e0\u3002");
    return;
  }

  moveAreaTo(area, candidate.area.x, candidate.area.y);
  state.selectedAreaId = null;
  markSaveDirty();
  say(`${area.name} \u5df2\u91cd\u65b0\u6446\u653e\uff0c\u95e8\u6d1e\u4f1a\u81ea\u52a8\u91cd\u7b97\u3002`);
}

function moveAreaTo(area, nextX, nextY) {
  const dx = nextX - area.x;
  const dy = nextY - area.y;
  area.x = nextX;
  area.y = nextY;
  if (area.id === layout.toilet.id) {
    area.standX += dx;
    area.standY += dy;
  }
  layout.pcs.forEach((pc) => {
    if (pc.areaId === area.id) {
      pc.x += dx;
      pc.y += dy;
      pc.seatX += dx;
      pc.seatY += dy;
    }
  });
}

function addAreaPcs(area) {
  for (let index = 0; index < area.pcCount; index += 1) {
    const position = getPcPositionInArea(area, index);
    const pc = createPc(layout.pcs.length, position.x, position.y, area.id, area.name);
    layout.pcs.push(pc);
  }
}

function rebuildPcsFromAreas(savedPcs = []) {
  layout.pcs.length = 0;
  state.rentedAreas.forEach((area) => {
    for (let index = 0; index < area.pcCount; index += 1) {
      const position = getPcPositionInArea(area, index);
      const pc = createPc(layout.pcs.length, position.x, position.y, area.id, area.name);
      const savedPc = savedPcs[layout.pcs.length];
      if (savedPc) {
        if (Number.isFinite(savedPc.x) && Number.isFinite(savedPc.y)) {
          pc.x = savedPc.x;
          pc.y = savedPc.y;
          pc.seatX = pc.x + pc.w / 2;
          pc.seatY = getPcSeatY(pc.y);
        }
        pc.equipmentLevel = Number.isFinite(savedPc.equipmentLevel) ? savedPc.equipmentLevel : pc.equipmentLevel;
        pc.dirty = Boolean(savedPc.dirty);
      }
      layout.pcs.push(pc);
    }
  });
}

function getPcPositionInArea(area, index) {
  if (area.id === 1) {
    const cols = 2;
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      x: area.x + area.w * 0.31 + col * 76,
      y: area.y + 202 + row * 68
    };
  }

  const cols = area.pcCount <= 2 ? area.pcCount || 1 : Math.ceil(Math.sqrt(area.pcCount));
  const col = index % cols;
  const row = Math.floor(index / cols);
  const gapX = Math.max(54, (area.w - 62) / Math.max(1, cols - 1));
  const gapY = 58;
  return {
    x: area.x + 18 + col * gapX,
    y: area.y + 42 + row * gapY
  };
}

function say(text) {
  state.message = text;
  state.messageTimer = 4;
}

function markSaveDirty() {
  state.saveDirty = true;
}

function getPanelPage(key, pageCount) {
  const raw = state.panelPages[key] || 0;
  return Math.max(0, Math.min(Math.max(0, pageCount - 1), raw));
}

function setPanelPage(key, page, pageCount) {
  state.panelPages[key] = Math.max(0, Math.min(Math.max(0, pageCount - 1), page));
}

function getPageCount(total, pageSize) {
  return Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
}

function drawPanelPager(key, panel, page, pageCount) {
  if (pageCount <= 1) return;

  const y = panel.y + panel.h - 34;
  const prevButton = { x: panel.x + 12, y, w: 42, h: 24, pageKey: key, delta: -1, pageCount };
  const nextButton = { x: panel.x + 58, y, w: 42, h: 24, pageKey: key, delta: 1, pageCount };
  ui.pageButtons.push(prevButton, nextButton);

  drawWidePanelButton(prevButton, "\u4e0a\u9875", page > 0 ? "#7f5635" : "#9a6b55");
  drawWidePanelButton(nextButton, "\u4e0b\u9875", page < pageCount - 1 ? "#4e8f4f" : "#9a6b55");
  text(`${page + 1}/${pageCount}`, panel.x + 112, y + 5, 12, COLORS.line, "bold");
}

function handlePageButton(button) {
  if (!button) return false;

  const page = getPanelPage(button.pageKey, button.pageCount);
  setPanelPage(button.pageKey, page + button.delta, button.pageCount);
  return true;
}

function readStorage(key) {
  try {
    return wx.getStorageSync(key);
  } catch (error) {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    wx.setStorageSync(key, value);
    return true;
  } catch (error) {
    return false;
  }
}

function removeStorage(key) {
  try {
    wx.removeStorageSync(key);
    return true;
  } catch (error) {
    return false;
  }
}

function loadTestModeSetting() {
  return readStorage(TEST_MODE_KEY) !== false;
}

function buildSaveData() {
  return {
    version: 1,
    cash: state.cash,
    cafeLevel: state.cafeLevel,
    equipmentLevel: state.equipmentLevel,
    cleanliness: state.cleanliness,
    served: state.served,
    lost: state.lost,
    inventory: Object.assign({}, state.inventory),
    purchaseQuantities: Object.assign({}, state.purchaseQuantities),
    employees: Object.assign({}, state.employees),
    nextAreaId: state.nextAreaId,
    rentedAreas: state.rentedAreas.map((area) => Object.assign({}, area)),
    publicFloors: state.publicFloors.map((floor) => Object.assign({}, floor)),
    toilet: {
      dirty: state.toilet.dirty,
      useCount: state.toilet.useCount,
      x: layout.toilet.x,
      y: layout.toilet.y,
      w: layout.toilet.w,
      h: layout.toilet.h
    },
    pcs: layout.pcs.map((pc) => ({
      x: pc.x,
      y: pc.y,
      equipmentLevel: pc.equipmentLevel,
      dirty: pc.dirty
    }))
  };
}

function saveGame(silent = false) {
  if (state.testMode) {
    if (!silent) {
      say("\u6d4b\u8bd5\u6a21\u5f0f\u4e0b\u4e0d\u4fdd\u5b58\uff0c\u5173\u95ed\u6d4b\u8bd5\u6a21\u5f0f\u540e\u542f\u7528\u5b58\u6863\u3002");
    }
    return false;
  }

  const saved = writeStorage(STORAGE_KEY, buildSaveData());
  if (!silent) {
    say(saved ? "\u5df2\u4fdd\u5b58\u5f53\u524d\u7f51\u5427\u8fdb\u5ea6\u3002" : "\u5b58\u6863\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u5fae\u4fe1\u5b58\u50a8\u6743\u9650\u3002");
  }
  if (saved) {
    state.saveDirty = false;
    state.saveTimer = 0;
  }
  return saved;
}

function restoreGame() {
  if (state.testMode) return;

  const data = readStorage(STORAGE_KEY);
  if (!data || data.version !== 1) {
    say("\u5b58\u6863\u6a21\u5f0f\u5df2\u5f00\uff0c\u6682\u65e0\u65e7\u5b58\u6863\u3002");
    return;
  }

  state.cash = Number.isFinite(data.cash) ? data.cash : state.cash;
  state.cafeLevel = Number.isFinite(data.cafeLevel) ? data.cafeLevel : state.cafeLevel;
  state.equipmentLevel = Number.isFinite(data.equipmentLevel) ? data.equipmentLevel : state.equipmentLevel;
  state.cleanliness = Number.isFinite(data.cleanliness) ? data.cleanliness : state.cleanliness;
  state.served = Number.isFinite(data.served) ? data.served : state.served;
  state.lost = Number.isFinite(data.lost) ? data.lost : state.lost;
  state.inventory = Object.assign({}, data.inventory || {});
  state.purchaseQuantities = Object.assign({}, data.purchaseQuantities || {});
  state.employees = Object.assign({}, state.employees, data.employees || {});
  state.nextAreaId = Number.isFinite(data.nextAreaId) ? data.nextAreaId : 2;
  state.rentedAreas = Array.isArray(data.rentedAreas) && data.rentedAreas.length
    ? data.rentedAreas.map((area) => ({
      id: area.id,
      typeId: area.typeId,
      name: area.name,
      pcCount: area.pcCount || 0,
      hourlyRate: Number.isFinite(area.hourlyRate) ? area.hourlyRate : getDefaultAreaRate(area.typeId),
      x: Number.isFinite(area.x) ? area.x : layout.room.x,
      y: Number.isFinite(area.y) ? area.y : layout.room.y,
      w: Number.isFinite(area.w) ? area.w : layout.room.w,
      h: Number.isFinite(area.h) ? area.h : layout.room.h
    }))
    : [{ id: 1, typeId: "livingRoom", name: "\u5ba2\u5385\u533a\u57df", pcCount: 4, hourlyRate: 5, x: layout.room.x, y: layout.room.y, w: layout.room.w, h: layout.room.h }];
  state.publicFloors = Array.isArray(data.publicFloors)
    ? data.publicFloors.map((floor) => ({
      id: floor.id || `floor-${floor.x}-${floor.y}`,
      typeId: "publicFloor",
      name: "\u516c\u533a\u5730\u7816",
      x: Number.isFinite(floor.x) ? floor.x : layout.room.x,
      y: Number.isFinite(floor.y) ? floor.y : layout.room.y,
      w: Number.isFinite(floor.w) ? floor.w : 72,
      h: Number.isFinite(floor.h) ? floor.h : 72
    }))
    : [];
  state.toilet.dirty = Boolean(data.toilet && data.toilet.dirty);
  state.toilet.useCount = data.toilet && Number.isFinite(data.toilet.useCount) ? data.toilet.useCount : 0;
  if (data.toilet && Number.isFinite(data.toilet.x) && Number.isFinite(data.toilet.y)) {
    layout.toilet.x = data.toilet.x;
    layout.toilet.y = data.toilet.y;
    layout.toilet.w = Number.isFinite(data.toilet.w) ? data.toilet.w : layout.toilet.w;
    layout.toilet.h = Number.isFinite(data.toilet.h) ? data.toilet.h : layout.toilet.h;
    layout.toilet.standX = layout.toilet.x + layout.toilet.w / 2;
    layout.toilet.standY = layout.toilet.y + layout.toilet.h - 20;
  }

  rebuildPcsFromAreas(Array.isArray(data.pcs) ? data.pcs : []);

  rebuildWorkersFromEmployees();
  updateEquipmentLevel();
  updateCafeLevel();
  say("\u5df2\u8bfb\u53d6\u672c\u5730\u5b58\u6863\uff0c\u7ee7\u7eed\u7ecf\u8425\u3002");
}

function rebuildWorkersFromEmployees() {
  state.workers = [];
  state.workerId = 1;
  Object.keys(state.employees).forEach((type) => {
    for (let index = 0; index < state.employees[type]; index += 1) {
      state.workers.push(createWorker(type));
    }
  });
}

function setTestMode(enabled) {
  state.testMode = enabled;
  writeStorage(TEST_MODE_KEY, enabled);

  if (enabled) {
    say("\u5df2\u5f00\u542f\u6d4b\u8bd5\u6a21\u5f0f\uff0c\u5237\u65b0\u540e\u56de\u5230\u6d4b\u8bd5\u5f00\u5c40\u3002");
  } else {
    markSaveDirty();
    saveGame(true);
    say("\u5df2\u5173\u95ed\u6d4b\u8bd5\u6a21\u5f0f\uff0c\u672c\u5730\u5b58\u6863\u5df2\u542f\u7528\u3002");
  }
}

function clearSaveGame() {
  const removed = removeStorage(STORAGE_KEY);
  say(removed ? "\u5df2\u5220\u9664\u672c\u5730\u5b58\u6863\uff0c\u5237\u65b0\u540e\u91cd\u65b0\u5f00\u59cb\u3002" : "\u5220\u9664\u5b58\u6863\u5931\u8d25\u3002");
}

function getProductUnitCost(product) {
  return product.cost / product.quantity;
}

function getPurchaseQuantity(product) {
  const quantity = state.purchaseQuantities[product.id];
  return Number.isFinite(quantity) && quantity >= product.quantity ? quantity : product.quantity;
}

function getPurchaseCost(product, quantity = getPurchaseQuantity(product)) {
  return Math.ceil(getProductUnitCost(product) * quantity);
}

function canBuyProduct(product, quantity = getPurchaseQuantity(product)) {
  return state.cafeLevel >= product.unlockLevel && state.cash >= getPurchaseCost(product, quantity);
}

function adjustPurchaseQuantity(product, delta) {
  const current = getPurchaseQuantity(product);
  const next = Math.max(product.quantity, Math.min(999, current + delta));
  state.purchaseQuantities[product.id] = next;
  say(`${product.name}\u91c7\u8d2d\u6570\u91cf\u8c03\u6574\u4e3a ${next}\u3002`);
}

function buyProduct(product, quantity = getPurchaseQuantity(product)) {
  if (state.cafeLevel < product.unlockLevel) {
    say(`\u7f51\u5427\u7b49\u7ea7\u4e0d\u8db3\uff0c${product.name}\u9700\u8981 ${product.unlockLevel} \u7ea7\u89e3\u9501\u3002`);
    return;
  }

  const cost = getPurchaseCost(product, quantity);
  if (state.cash < cost) {
    say(`\u73b0\u91d1\u4e0d\u8db3\uff0c\u65e0\u6cd5\u91c7\u8d2d ${product.name}\u3002`);
    return;
  }

  state.cash -= cost;
  state.inventory[product.id] = (state.inventory[product.id] || 0) + quantity;
  markSaveDirty();
  say(`\u91c7\u8d2d ${product.name} x${quantity}\uff0c\u5e93\u5b58\u5df2\u5165\u8d26\u3002`);
}

function restockProduct(product, silent = false) {
  if (state.cafeLevel < product.unlockLevel || state.cash < product.cost) return false;

  state.cash -= product.cost;
  state.inventory[product.id] = (state.inventory[product.id] || 0) + product.quantity;
  markSaveDirty();
  if (!silent) {
    say(`\u5e97\u957f\u81ea\u52a8\u8865\u8d27 ${product.name} x${product.quantity}\u3002`);
  }
  return true;
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
  const demandChance = guest.guestType ? guest.guestType.spendChance : 0.4;
  if (Math.random() < demandChance) {
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

function tryStartToiletEvent(guest, dt) {
  if (guest.toiletDone || guest.demand || guest.playTimer > guest.playDuration * 0.68) return;

  guest.toiletRollTimer -= dt;
  if (guest.toiletRollTimer > 0) return;

  guest.toiletDone = true;
  if (Math.random() < 0.32) {
    guest.state = "toToilet";
    say(`\u987e\u5ba2 ${guest.id} \u53bb\u4e0a\u5395\u6240\u4e86\u3002`);
  }
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
  markSaveDirty();
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

function findTappedDirtyPc(x, y) {
  return layout.pcs.find((pc) => (
    pc.dirty &&
    x >= pc.x - 8 &&
    x <= pc.x + pc.w + 8 &&
    y >= pc.y - 36 &&
    y <= pc.y + pc.h + 18
  ));
}

function cleanPc(pc) {
  pc.dirty = false;
  pc.cleanTimer = 0;
  pc.cleanWorkerId = null;
  state.cleanliness = Math.min(100, state.cleanliness + 8);
  markSaveDirty();
  say(`\u5df2\u6e05\u6d01 ${pc.id + 1} \u53f7\u673a\uff0c\u6e05\u6d01\u503c\u56de\u5347\u3002`);
}

function isToiletTapped(x, y) {
  const toilet = layout.toilet;
  return x >= toilet.x - 8 &&
    x <= toilet.x + toilet.w + 8 &&
    y >= toilet.y - 28 &&
    y <= toilet.y + toilet.h + 10;
}

function cleanToilet() {
  if (!state.toilet.dirty) return false;

  state.toilet.dirty = false;
  state.toilet.useCount = 0;
  state.toilet.cleanWorkerId = null;
  state.cleanliness = Math.min(100, state.cleanliness + 12);
  markSaveDirty();
  say("\u5395\u6240\u5df2\u6e05\u6d01\uff0c\u5ba2\u4eba\u4f53\u9a8c\u597d\u4e86\u4e00\u70b9\u3002");
  return true;
}

function getCoreStaffCount() {
  return state.employees.cashier + state.employees.floor;
}

function getEmployeeTotal() {
  return Object.keys(state.employees).reduce((total, key) => total + state.employees[key], 0);
}

function getEquipmentTier(level) {
  return equipmentTiers.find((tier) => tier.level === level) || equipmentTiers[0];
}

function getAverageEquipmentLevel() {
  if (layout.pcs.length === 0) return 1;
  const total = layout.pcs.reduce((sum, pc) => sum + pc.equipmentLevel, 0);
  return total / layout.pcs.length;
}

function getMinimumEquipmentLevel() {
  if (layout.pcs.length === 0) return 1;
  return Math.min(...layout.pcs.map((pc) => pc.equipmentLevel));
}

function updateEquipmentLevel() {
  state.equipmentLevel = Math.max(1, Math.floor(getAverageEquipmentLevel()));
}

function openEquipmentPcSelection(tier) {
  const hasCandidate = layout.pcs.some((pc) => pc.equipmentLevel + 1 === tier.level);
  if (!hasCandidate) {
    say("\u6ca1\u6709\u53ef\u5347\u7ea7\u5230\u8be5\u6863\u4f4d\u7684\u673a\u5668\u3002");
    return;
  }

  if (state.cash < tier.pricePerPc) {
    say(`\u73b0\u91d1\u4e0d\u8db3\uff0c\u5355\u53f0\u5347\u7ea7\u9700\u8981 ${tier.pricePerPc} \u5143\u3002`);
    return;
  }

  state.pendingEquipmentTierLevel = tier.level;
}

function getPendingEquipmentTier() {
  return equipmentTiers.find((tier) => tier.level === state.pendingEquipmentTierLevel);
}

function upgradePcEquipment(pc, tier) {
  if (!pc || !tier) return;

  if (tier.level <= pc.equipmentLevel) {
    say(`${pc.id + 1} \u53f7\u673a\u5df2\u7ecf\u8fbe\u5230\u8be5\u6863\u4f4d\u3002`);
    return;
  }

  if (tier.level !== pc.equipmentLevel + 1) {
    say(`${pc.id + 1} \u53f7\u673a\u9700\u8981\u6309\u6863\u9010\u7ea7\u5347\u7ea7\u3002`);
    return;
  }

  const cost = tier.pricePerPc;
  if (state.cash < cost) {
    say(`\u73b0\u91d1\u4e0d\u8db3\uff0c\u5347\u7ea7 ${pc.id + 1} \u53f7\u673a\u9700\u8981 ${cost} \u5143\u3002`);
    return;
  }

  state.cash -= cost;
  pc.equipmentLevel = tier.level;
  updateEquipmentLevel();
  updateCafeLevel();
  state.pendingEquipmentTierLevel = null;
  markSaveDirty();
  say(`${pc.id + 1} \u53f7\u673a\u5347\u7ea7\u5230 ${tier.name}\u3002`);
}

function createWorker(type) {
  const home = layout.staffHome[type] || layout.staffHome.floor;
  return {
    id: state.workerId++,
    type,
    x: home.x,
    y: home.y,
    state: "station",
    taskTimer: 0,
    targetPcId: null,
    targetGuestId: null,
    targetProductId: null
  };
}

function canWorkerClean(worker) {
  return worker.type === "floor" || worker.type === "cleaner" || worker.type === "manager";
}

function canWorkerDeliver(worker) {
  return worker.type === "cashier" || worker.type === "manager";
}

function getWorkerLabel(type) {
  return {
    cashier: "\u6536\u94f6",
    floor: "\u5916\u573a",
    cleaner: "\u4fdd\u6d01",
    manager: "\u5e97\u957f",
    companion: "\u966a\u73a9"
  }[type] || "\u5458\u5de5";
}

function getIdleWorkers() {
  return state.workers.filter((worker) => worker.state === "station");
}

function calculateCafeLevel() {
  const employeeTotal = getEmployeeTotal();
  const machineCount = layout.pcs.length;
  const equipmentAverage = getAverageEquipmentLevel();

  if (employeeTotal >= 6 && machineCount >= 10 && equipmentAverage >= 3.5) return 4;
  if (employeeTotal >= 4 && machineCount >= 8 && equipmentAverage >= 2.6) return 3;
  if (employeeTotal >= 2 && machineCount >= 6 && equipmentAverage >= 1.6) return 2;
  return 1;
}

function updateCafeLevel() {
  const nextLevel = calculateCafeLevel();
  if (nextLevel > state.cafeLevel) {
    say(`\u7f51\u5427\u5347\u5230 Lv.${nextLevel}\uff0c\u65b0\u529f\u80fd\u5c06\u9010\u6b65\u89e3\u9501\u3002`);
  }
  state.cafeLevel = Math.max(state.cafeLevel, nextLevel);
}

function getStaffRequirement(staff) {
  if (staff.id === "manager") {
    return getCoreStaffCount() >= 3 ? "" : "\u9700\u6536\u94f6+\u5916\u573a\u81f3\u5c11 3 \u4eba";
  }

  if (staff.id === "companion") {
    if (state.employees.manager < 1) return "\u9700\u5148\u62db\u8058\u5e97\u957f";
    if (state.cafeLevel < 3) return "\u9700\u7f51\u5427 Lv.3";
  }

  return "";
}

function canHireStaff(staff) {
  return !getStaffRequirement(staff) && state.cash >= staff.hireCost;
}

function hireStaff(staff) {
  const requirement = getStaffRequirement(staff);
  if (requirement) {
    say(`${staff.name}\u62db\u8058\u5931\u8d25\uff1a${requirement}\u3002`);
    return;
  }

  if (state.cash < staff.hireCost) {
    say(`\u73b0\u91d1\u4e0d\u8db3\uff0c\u62db\u8058 ${staff.name} \u9700\u8981 ${staff.hireCost} \u5143\u3002`);
    return;
  }

  state.cash -= staff.hireCost;
  state.employees[staff.id] += 1;
  state.workers.push(createWorker(staff.id));
  updateCafeLevel();
  markSaveDirty();
  say(`\u5df2\u62db\u8058 ${staff.name}\uff0c\u5f53\u524d\u5458\u5de5 ${getEmployeeTotal()} \u4eba\u3002`);
}

function isPointInRect(x, y, button) {
  return button &&
    x >= button.x &&
    x <= button.x + button.w &&
    y >= button.y &&
    y <= button.y + button.h;
}

function closePanels() {
  state.procurementOpen = false;
  state.warehouseOpen = false;
  state.hiringOpen = false;
  state.equipmentOpen = false;
  state.expansionOpen = false;
  state.layoutOpen = false;
  state.pricingOpen = false;
  state.settingsOpen = false;
  state.pendingEquipmentTierLevel = null;
  state.pendingExpansion = null;
  state.confirmDialog = null;
  state.layoutToolActive = false;
  state.selectedAreaId = null;
  state.selectedPcId = null;
}

function clearActionButtons() {
  ui.procurementButton = null;
  ui.warehouseButton = null;
  ui.hiringButton = null;
  ui.equipmentButton = null;
  ui.expansionButton = null;
  ui.layoutButton = null;
  ui.settingsButton = null;
}

function screenToWorld(x, y) {
  return {
    x: x + state.camera.x,
    y: y + state.camera.y
  };
}

function clampCamera() {
  const maxX = Math.max(0, WORLD.w - view.width);
  const maxY = Math.max(0, WORLD.h - view.height + ACTION_BAR_HEIGHT);
  state.camera.x = Math.max(0, Math.min(maxX, state.camera.x));
  state.camera.y = Math.max(0, Math.min(maxY, state.camera.y));
}

function isAnyPanelOpen() {
  return state.settingsOpen ||
    state.confirmDialog ||
    state.expansionOpen ||
    state.layoutOpen ||
    state.pricingOpen ||
    state.procurementOpen ||
    state.warehouseOpen ||
    state.hiringOpen ||
    state.equipmentOpen;
}

function openConfirmDialog(title, body, onConfirm) {
  state.confirmDialog = { title, body, onConfirm };
}

function getFirstTouch(event) {
  return event.touches && event.touches[0] || event.changedTouches && event.changedTouches[0];
}

function handleTouchStartEvent(event) {
  const touch = getFirstTouch(event);
  if (!touch) return;

  touchState.active = true;
  touchState.startX = touch.clientX;
  touchState.startY = touch.clientY;
  touchState.lastX = touch.clientX;
  touchState.lastY = touch.clientY;
  touchState.moved = false;
}

function handleTouchMoveEvent(event) {
  const touch = getFirstTouch(event);
  if (!touch || !touchState.active || isAnyPanelOpen()) return;
  if (touchState.startY >= view.height - ACTION_BAR_HEIGHT) return;

  const dx = touch.clientX - touchState.lastX;
  const dy = touch.clientY - touchState.lastY;
  if (Math.abs(touch.clientX - touchState.startX) + Math.abs(touch.clientY - touchState.startY) > 7) {
    touchState.moved = true;
  }

  state.camera.x -= dx;
  state.camera.y -= dy;
  clampCamera();
  touchState.lastX = touch.clientX;
  touchState.lastY = touch.clientY;
}

function handleTouchEndEvent(event) {
  const touch = getFirstTouch(event);
  if (!touchState.active) return;

  const x = touch ? touch.clientX : touchState.startX;
  const y = touch ? touch.clientY : touchState.startY;
  const moved = touchState.moved;
  touchState.active = false;

  if (!moved) {
    handleTouch(x, y);
  }
}

function handleTouch(x, y) {
  if (state.confirmDialog) {
    if (isPointInRect(x, y, ui.confirmNoButton)) {
      state.confirmDialog = null;
      return;
    }

    if (isPointInRect(x, y, ui.confirmYesButton)) {
      const dialog = state.confirmDialog;
      state.confirmDialog = null;
      if (dialog && typeof dialog.onConfirm === "function") {
        dialog.onConfirm();
      }
      return;
    }
    return;
  }

  const pageButton = ui.pageButtons.find((button) => isPointInRect(x, y, button));
  if (pageButton && handlePageButton(pageButton)) {
    return;
  }

  if (state.settingsOpen) {
    if (isPointInRect(x, y, ui.closeSettingsButton)) {
      state.settingsOpen = false;
      return;
    }

    if (isPointInRect(x, y, ui.pricingButton)) {
      state.settingsOpen = false;
      state.pricingOpen = true;
      return;
    }

    if (isPointInRect(x, y, ui.toggleTestModeButton)) {
      setTestMode(!state.testMode);
      return;
    }

    if (isPointInRect(x, y, ui.saveGameButton)) {
      saveGame();
      return;
    }

    if (isPointInRect(x, y, ui.clearSaveButton)) {
      clearSaveGame();
      return;
    }
    return;
  }

  if (state.pricingOpen) {
    if (isPointInRect(x, y, ui.closePricingButton)) {
      state.pricingOpen = false;
      return;
    }

    const priceButton = ui.priceButtons.find((button) => isPointInRect(x, y, button));
    if (priceButton) {
      adjustAreaRate(priceButton.area, priceButton.delta);
    }
    return;
  }

  if (state.expansionOpen) {
    if (isPointInRect(x, y, ui.closeExpansionButton)) {
      state.expansionOpen = false;
      return;
    }

    const rentButton = ui.rentAreaButtons.find((button) => isPointInRect(x, y, button));
    if (rentButton) {
      rentArea(rentButton.type, rentButton.pcCount);
    }
    return;
  }

  if (state.layoutOpen) {
    if (isPointInRect(x, y, ui.closeLayoutButton)) {
      state.layoutOpen = false;
      return;
    }

    const modeButton = ui.layoutModeButtons.find((button) => isPointInRect(x, y, button));
    if (modeButton) {
      state.layoutMode = modeButton.mode;
      state.layoutToolActive = modeButton.mode !== "off";
      state.selectedAreaId = null;
      state.selectedPcId = null;
      state.layoutOpen = false;
      say(modeButton.message);
    }
    return;
  }

  if (state.procurementOpen) {
    if (isPointInRect(x, y, ui.closeProcurementButton)) {
      state.procurementOpen = false;
      return;
    }

    const batchButton = ui.purchaseBatchButtons.find((button) => isPointInRect(x, y, button));
    if (batchButton) {
      adjustPurchaseQuantity(batchButton.product, batchButton.delta);
      return;
    }

    const buyButton = ui.buyButtons.find((button) => isPointInRect(x, y, button));
    if (buyButton) {
      const product = buyButton.product;
      const quantity = getPurchaseQuantity(product);
      const cost = getPurchaseCost(product, quantity);
      if (!canBuyProduct(product, quantity)) {
        buyProduct(product, quantity);
        return;
      }
      openConfirmDialog(
        "\u786e\u8ba4\u91c7\u8d2d",
        `\u786e\u5b9a\u82b1\u8d39 ${cost} \u5143\u8d2d\u4e70 ${product.name} x${quantity} \u5417\uff1f`,
        () => buyProduct(product, quantity)
      );
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

  if (state.hiringOpen) {
    if (isPointInRect(x, y, ui.closeHiringButton)) {
      state.hiringOpen = false;
      return;
    }

    const hireButton = ui.hireButtons.find((button) => isPointInRect(x, y, button));
    if (hireButton) {
      const staff = hireButton.staff;
      if (!canHireStaff(staff)) {
        hireStaff(staff);
        return;
      }
      openConfirmDialog(
        "\u786e\u8ba4\u62db\u8058",
        `\u786e\u5b9a\u82b1\u8d39 ${staff.hireCost} \u5143\u62db\u8058\u4e00\u4e2a ${staff.name} \u5417\uff1f`,
        () => hireStaff(staff)
      );
    }
    return;
  }

  if (state.equipmentOpen) {
    const pendingTier = getPendingEquipmentTier();
    if (pendingTier) {
      if (isPointInRect(x, y, ui.cancelEquipmentSelectionButton)) {
        state.pendingEquipmentTierLevel = null;
        return;
      }

      const pcButton = ui.equipmentPcButtons.find((button) => isPointInRect(x, y, button));
      if (pcButton) {
        upgradePcEquipment(pcButton.pc, pendingTier);
      }
      return;
    }

    if (isPointInRect(x, y, ui.closeEquipmentButton)) {
      state.equipmentOpen = false;
      state.pendingEquipmentTierLevel = null;
      return;
    }

    const upgradeButton = ui.upgradeEquipmentButtons.find((button) => isPointInRect(x, y, button));
    if (upgradeButton) {
      openEquipmentPcSelection(upgradeButton.tier);
    }
    return;
  }

  const groupButtons = [
    { button: ui.dailyGroupButton, group: "daily" },
    { button: ui.buildGroupButton, group: "build" },
    { button: ui.systemGroupButton, group: "system" }
  ];
  const groupHit = groupButtons.find((item) => isPointInRect(x, y, item.button));
  if (groupHit) {
    state.actionGroup = groupHit.group;
    return;
  }

  if (isPointInRect(x, y, ui.warehouseButton)) {
    closePanels();
    state.warehouseOpen = true;
    return;
  }

  if (isPointInRect(x, y, ui.hiringButton)) {
    closePanels();
    state.hiringOpen = true;
    return;
  }

  if (isPointInRect(x, y, ui.equipmentButton)) {
    closePanels();
    state.equipmentOpen = true;
    return;
  }

  if (isPointInRect(x, y, ui.expansionButton)) {
    closePanels();
    state.expansionOpen = true;
    return;
  }

  if (isPointInRect(x, y, ui.layoutButton)) {
    closePanels();
    state.layoutOpen = true;
    return;
  }

  if (isPointInRect(x, y, ui.procurementButton)) {
    closePanels();
    state.procurementOpen = true;
    return;
  }

  if (isPointInRect(x, y, ui.settingsButton)) {
    closePanels();
    state.settingsOpen = true;
    return;
  }

  const worldPoint = screenToWorld(x, y);
  if (state.layoutToolActive && handleLayoutTouch(worldPoint.x, worldPoint.y)) {
    return;
  }

  if (placePendingExpansion(worldPoint.x, worldPoint.y)) {
    return;
  }

  const dirtyPc = findTappedDirtyPc(worldPoint.x, worldPoint.y);
  if (dirtyPc) {
    cleanPc(dirtyPc);
    return;
  }

  if (isToiletTapped(worldPoint.x, worldPoint.y) && cleanToilet()) {
    return;
  }

  const guest = findTappedGuest(worldPoint.x, worldPoint.y);
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

function isPointInsideRect(x, y, area, padding = 0) {
  return x >= area.x - padding &&
    x <= area.x + area.w + padding &&
    y >= area.y - padding &&
    y <= area.y + area.h + padding;
}

function getWalkableAreaAtPoint(x, y) {
  for (let index = state.publicFloors.length - 1; index >= 0; index -= 1) {
    const floor = state.publicFloors[index];
    if (isPointInsideRect(x, y, floor)) return floor;
  }

  const structuralAreas = getStructuralAreas();
  for (let index = structuralAreas.length - 1; index >= 0; index -= 1) {
    const area = structuralAreas[index];
    if (isPointInsideRect(x, y, area)) return area;
  }
  return null;
}

function isEntranceWalkway(x, y) {
  return x >= layout.room.x - 58 &&
    x <= layout.room.x + 22 &&
    y >= layout.entrance.y - 36 &&
    y <= layout.entrance.y + 36;
}

function isPcSeatTarget(x, y) {
  return layout.pcs.some((pc) => Math.hypot(x - pc.seatX, y - pc.seatY) <= 10);
}

function isMachineBlockingPoint(x, y) {
  if (isPcSeatTarget(x, y)) return false;
  return layout.pcs.some((pc) => (
    x >= pc.x - 5 &&
    x <= pc.x + pc.w + 5 &&
    y >= pc.y - 5 &&
    y <= pc.y + pc.h - 2
  ));
}

function isTransitionOpen(fromArea, toArea, x, y) {
  if (!fromArea || !toArea || fromArea.id === toArea.id) return true;
  if (!sharesWall(fromArea, toArea)) return false;
  if (fromArea.typeId === "publicFloor" || toArea.typeId === "publicFloor") return true;

  if (fromArea.y + fromArea.h === toArea.y || toArea.y + toArea.h === fromArea.y) {
    const overlapStart = Math.max(fromArea.x + 16, toArea.x + 16);
    const overlapEnd = Math.min(fromArea.x + fromArea.w - 16, toArea.x + toArea.w - 16);
    if (overlapEnd - overlapStart < 28) return false;
    const center = (overlapStart + overlapEnd) / 2;
    return x >= center - 19 && x <= center + 19;
  }

  if (fromArea.x + fromArea.w === toArea.x || toArea.x + toArea.w === fromArea.x) {
    const overlapStart = Math.max(fromArea.y + 28, toArea.y + 28);
    const overlapEnd = Math.min(fromArea.y + fromArea.h - 16, toArea.y + toArea.h - 16);
    if (overlapEnd - overlapStart < 28) return false;
    const center = (overlapStart + overlapEnd) / 2;
    return y >= center - 11 && y <= center + 11;
  }

  return false;
}

function canMoveToPoint(entity, x, y) {
  if (isMachineBlockingPoint(x, y)) return false;

  const fromArea = getWalkableAreaAtPoint(entity.x, entity.y);
  const toArea = getWalkableAreaAtPoint(x, y);
  if (!toArea && !isEntranceWalkway(x, y)) return false;
  if (fromArea && toArea && !isTransitionOpen(fromArea, toArea, x, y)) return false;
  return true;
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
  const nx = dx / len;
  const ny = dy / len;
  const candidates = [
    { x: entity.x + nx * step, y: entity.y + ny * step },
    { x: entity.x + nx * step, y: entity.y },
    { x: entity.x, y: entity.y + ny * step },
    { x: entity.x - ny * step, y: entity.y + nx * step },
    { x: entity.x + ny * step, y: entity.y - nx * step }
  ];

  const next = candidates.find((candidate) => canMoveToPoint(entity, candidate.x, candidate.y));
  if (next) {
    entity.x = next.x;
    entity.y = next.y;
  }
  return len <= step + 0.5;
}

function getPcAccessPoint(pc) {
  const area = getAreaById(pc.areaId) || layout.room;
  const side = pc.seatX < area.x + area.w / 2 ? -1 : 1;
  const point = {
    x: side < 0 ? pc.x - 18 : pc.x + pc.w + 18,
    y: pc.seatY
  };
  return {
    x: Math.max(area.x + 16, Math.min(area.x + area.w - 16, point.x)),
    y: Math.max(area.y + 36, Math.min(area.y + area.h - 16, point.y))
  };
}

function getPcPathCorridorX(pc) {
  return getPcAccessPoint(pc).x;
}

function moveToPcSeat(entity, pc, speed, dt) {
  if (!pc) return false;
  const seat = { x: pc.seatX, y: pc.seatY };
  if (distance(entity, seat) <= 14) {
    entity.x = seat.x;
    entity.y = seat.y;
    return true;
  }

  const accessPoint = getPcAccessPoint(pc);
  const corridorX = getPcPathCorridorX(pc);
  if (Math.abs(entity.x - corridorX) > 6) {
    moveToward(entity, { x: corridorX, y: entity.y }, speed, dt);
    return false;
  }

  if (Math.abs(entity.y - accessPoint.y) > 6) {
    moveToward(entity, { x: corridorX, y: accessPoint.y }, speed, dt);
    return false;
  }

  if (distance(entity, accessPoint) > 5) {
    moveToward(entity, accessPoint, speed, dt);
    return false;
  }

  entity.x = seat.x;
  entity.y = seat.y;
  return true;
}

function findFreePc(guest = null) {
  if (guest && guest.guestType) {
    return layout.pcs.find((pc) => pcMatchesGuest(pc, guest.guestType));
  }
  return layout.pcs.find((pc) => !pc.occupiedBy && !pc.dirty);
}

function spawnGuest(guestType) {
  const palette = guestPalettes[Math.floor(Math.random() * guestPalettes.length)];
  state.guests.push({
    id: state.guestId,
    x: layout.entrance.x - 34,
    y: layout.entrance.y,
    state: "entering",
    queueIndex: -1,
    pcId: null,
    pathTimer: 0,
    playTimer: 0,
    playDuration: random(28, 42),
    demandRollTimer: random(5, 9),
    demand: null,
    demandDone: false,
    toiletRollTimer: random(8, 15),
    toiletTimer: 0,
    toiletDone: false,
    guestType,
    speed: random(44, 58),
    palette
  });
  state.guestId += 1;
}

function updateSpawn() {
  if (state.time < state.nextGuestAt) return;

  if (state.guestId === 1 && state.guests.length === 0) {
    const firstGuestType = guestTypes.find((type) => hasPcForGuestType(type));
    if (firstGuestType) {
      spawnGuest(firstGuestType);
    }
    state.nextGuestAt = state.time + getNextGuestInterval();
    return;
  }

  const guestType = chooseWeightedGuestType();
  const spawnChance = getGuestArrivalChance(guestType);
  const waitingGuests = state.guests.filter((guest) => (
    guest.state === "entering" ||
    guest.state === "queueing" ||
    guest.state === "checkingIn"
  )).length;

  if (Math.random() < spawnChance && waitingGuests < getMaxWaitingGuests() && hasPcForGuestType(guestType)) {
    spawnGuest(guestType);
  } else {
    if (Math.random() < 0.35) state.lost += 1;
  }

  state.nextGuestAt = state.time + getNextGuestInterval();
}

function getDayFactor() {
  const dayTime = state.time % 120;
  if (dayTime < 25) return 0.55;
  if (dayTime < 85) return 1.15;
  return 0.75;
}

function getTrafficPower() {
  const equipmentAverage = layout.pcs.reduce((sum, pc) => sum + pc.equipmentLevel, 0) / Math.max(1, layout.pcs.length);
  const cleanlinessFactor = 0.35 + state.cleanliness / 100 * 0.75;
  const equipmentFactor = 0.65 + equipmentAverage * 0.18;
  const scaleFactor = 0.62 + Math.min(layout.pcs.length, 12) * 0.05;
  return cleanlinessFactor * equipmentFactor * scaleFactor * getDayFactor() * getActivityTrafficFactor();
}

function getActivityTrafficFactor() {
  return 1;
}

function getGuestArrivalChance(guestType) {
  const base = guestType.areaPreference === "room" ? 0.45 : 0.62;
  const randomNoise = random(0.78, 1.18);
  return Math.max(0.08, Math.min(0.86, base * getTrafficPower() * randomNoise));
}

function getNextGuestInterval() {
  const traffic = getTrafficPower();
  return random(4.8, 8.6) / Math.max(0.6, traffic);
}

function getMaxWaitingGuests() {
  return Math.max(2, Math.min(6, Math.floor(layout.pcs.length / 3) + 1));
}

function updateFrontDesk(dt) {
  state.frontDesk.duration = state.employees.cashier > 0 ? 0.72 : 1.15;

  if (state.frontDesk.busyGuestId) {
    state.frontDesk.timer -= dt;
    if (state.frontDesk.timer > 0) return;

    const guest = state.guests.find((item) => item.id === state.frontDesk.busyGuestId);
    const pc = findFreePc(guest);

    if (guest && pc) {
      pc.occupiedBy = guest.id;
      guest.pcId = pc.id;
      guest.state = "toPc";
      guest.pathTimer = 0;
      guest.queueIndex = -1;
      say(`顾客 ${guest.id} 已开机，分配到 ${pc.id + 1} 号机。`);
    } else if (guest) {
      guest.state = "queueing";
    }

    state.frontDesk.busyGuestId = null;
    state.frontDesk.timer = 0;
  }

  const nextGuest = state.guests.find((guest) => guest.state === "queueing" && guest.queueIndex === 0);
  if (!nextGuest || !findFreePc(nextGuest)) return;

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
  const hourlyRate = getAreaHourlyRate(pc.areaId);
  const sessionHours = 2;
  const income = hourlyRate * sessionHours;

  state.cash += income;
  state.served += 1;
  pc.occupiedBy = null;
  pc.dirty = true;
  guest.state = "leaving";
  state.cleanliness = Math.max(0, state.cleanliness - 3);
  markSaveDirty();
  say(`顾客 ${guest.id} 下机结账，收入 ${income} 元。机位需要清理。`);
}

function updateCleanliness(dt) {
  const dirtyPcCount = layout.pcs.filter((pc) => pc.dirty).length;
  const activeGuests = state.guests.filter((guest) => (
    guest.state === "playing" ||
    guest.state === "toToilet" ||
    guest.state === "usingToilet" ||
    guest.state === "backToPc"
  )).length;
  const toiletPenalty = state.toilet.dirty ? 0.01 : 0;
  const decay = (0.0012 * activeGuests + 0.006 * dirtyPcCount + toiletPenalty) * dt;

  state.cleanliness = Math.max(0, state.cleanliness - decay);
}

function assignWorkerTasks() {
  getIdleWorkers().forEach((worker) => {
    if (canWorkerDeliver(worker) && assignDeliveryTask(worker)) return;
    if (canWorkerClean(worker) && assignCleaningTask(worker)) return;

    const home = layout.staffHome[worker.type] || layout.staffHome.floor;
    moveToward(worker, home, 34, 1 / 60);
  });
}

function assignDeliveryTask(worker) {
  const guest = state.guests.find((item) => (
    item.state === "playing" &&
    item.demand &&
    !item.demand.assignedWorkerId &&
    canServeDemandAutomatically(item)
  ));

  if (!guest) return false;

  guest.demand.assignedWorkerId = worker.id;
  worker.state = "toDeliver";
  worker.targetGuestId = guest.id;
  worker.targetProductId = guest.demand.productId;
  return true;
}

function canServeDemandAutomatically(guest) {
  const product = getProductById(guest.demand.productId);
  return product &&
    state.cafeLevel >= product.unlockLevel &&
    (state.inventory[product.id] || 0) > 0;
}

function assignCleaningTask(worker) {
  const pc = layout.pcs.find((item) => item.dirty && !item.cleanWorkerId);
  if (pc) {
    pc.cleanWorkerId = worker.id;
    worker.state = "toCleanPc";
    worker.targetPcId = pc.id;
    return true;
  }

  if (state.toilet.dirty && !state.toilet.cleanWorkerId) {
    state.toilet.cleanWorkerId = worker.id;
    worker.state = "toCleanToilet";
    return true;
  }

  return false;
}

function updateWorkers(dt) {
  assignWorkerTasks();
  updateManagerRestock(dt);

  state.workers.forEach((worker) => {
    if (worker.state === "station") {
      const home = layout.staffHome[worker.type] || layout.staffHome.floor;
      moveToward(worker, home, 36, dt);
      return;
    }

    if (worker.state === "toCleanPc") {
      const pc = layout.pcs[worker.targetPcId];
      if (!pc || !pc.dirty) {
        resetWorker(worker);
        return;
      }
      if (moveToPcSeat(worker, pc, 58, dt)) {
        worker.state = "cleaningPc";
        worker.taskTimer = worker.type === "cleaner" ? 1.1 : 1.6;
      }
      return;
    }

    if (worker.state === "cleaningPc") {
      worker.taskTimer -= dt;
      if (worker.taskTimer <= 0) {
        const pc = layout.pcs[worker.targetPcId];
        if (pc && pc.dirty) {
          cleanPcByWorker(pc);
        }
        resetWorker(worker);
      }
      return;
    }

    if (worker.state === "toCleanToilet") {
      if (!state.toilet.dirty) {
        resetWorker(worker);
        return;
      }
      if (moveToward(worker, { x: layout.toilet.standX, y: layout.toilet.standY }, 58, dt)) {
        worker.state = "cleaningToilet";
        worker.taskTimer = worker.type === "cleaner" ? 1.2 : 1.8;
      }
      return;
    }

    if (worker.state === "cleaningToilet") {
      worker.taskTimer -= dt;
      if (worker.taskTimer <= 0) {
        cleanToiletByWorker();
        resetWorker(worker);
      }
      return;
    }

    if (worker.state === "toDeliver") {
      const guest = state.guests.find((item) => item.id === worker.targetGuestId);
      if (!guest || !guest.demand || guest.demand.productId !== worker.targetProductId) {
        resetWorker(worker);
        return;
      }
      if (moveToward(worker, { x: guest.x, y: guest.y + 10 }, 62, dt)) {
        worker.state = "delivering";
        worker.taskTimer = 0.7;
      }
      return;
    }

    if (worker.state === "delivering") {
      worker.taskTimer -= dt;
      if (worker.taskTimer <= 0) {
        const guest = state.guests.find((item) => item.id === worker.targetGuestId);
        if (guest && guest.demand) {
          serveGuestDemandByWorker(guest);
        }
        resetWorker(worker);
      }
    }
  });
}

function cleanPcByWorker(pc) {
  pc.dirty = false;
  pc.cleanWorkerId = null;
  state.cleanliness = Math.min(100, state.cleanliness + 7);
  markSaveDirty();
  say(`\u5458\u5de5\u5df2\u6e05\u7406 ${pc.id + 1} \u53f7\u673a\u3002`);
}

function cleanToiletByWorker() {
  state.toilet.dirty = false;
  state.toilet.useCount = 0;
  state.toilet.cleanWorkerId = null;
  state.cleanliness = Math.min(100, state.cleanliness + 10);
  markSaveDirty();
  say("\u5458\u5de5\u5df2\u6e05\u7406\u5395\u6240\u3002");
}

function serveGuestDemandByWorker(guest) {
  const product = getProductById(guest.demand.productId);
  if (!product || (state.inventory[product.id] || 0) <= 0 || state.cafeLevel < product.unlockLevel) {
    if (guest.demand) guest.demand.assignedWorkerId = null;
    return false;
  }

  state.inventory[product.id] -= 1;
  state.cash += product.sellPrice;
  markSaveDirty();
  say(`\u5458\u5de5\u9001\u51fa ${product.name}\uff0c\u989d\u5916\u6536\u5165 ${product.sellPrice} \u5143\u3002`);
  guest.demand = null;
  return true;
}

function resetWorker(worker) {
  const pc = layout.pcs[worker.targetPcId];
  if (pc && pc.cleanWorkerId === worker.id) pc.cleanWorkerId = null;
  if (state.toilet.cleanWorkerId === worker.id) state.toilet.cleanWorkerId = null;

  worker.targetPcId = null;
  worker.targetGuestId = null;
  worker.targetProductId = null;
  worker.taskTimer = 0;
  worker.state = "station";
}

function updateManagerRestock(dt) {
  if (state.employees.manager < 1) return;

  state.managerRestockTimer = (state.managerRestockTimer || 0) - dt;
  if (state.managerRestockTimer > 0) return;
  state.managerRestockTimer = 5;

  const product = products.find((item) => (
    state.cafeLevel >= item.unlockLevel &&
    (state.inventory[item.id] || 0) <= 1 &&
    state.cash >= item.cost
  ));

  if (product) {
    restockProduct(product);
  }
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
      const arrived = moveToPcSeat(guest, pc, guest.speed, dt);
      guest.pathTimer = (guest.pathTimer || 0) + dt;
      if (arrived || guest.pathTimer > 8) {
        if (pc) {
          guest.x = pc.seatX;
          guest.y = pc.seatY;
        }
        guest.state = "playing";
        guest.playTimer = guest.playDuration;
        guest.pathTimer = 0;
      }
      continue;
    }

    if (guest.state === "playing") {
      const pc = layout.pcs[guest.pcId];
      guest.x = pc.seatX;
      guest.y = pc.seatY;
      tryCreateDemand(guest, dt);
      updateDemand(guest, dt);
      tryStartToiletEvent(guest, dt);
      if (guest.state !== "playing") {
        continue;
      }
      guest.playTimer -= dt;
      if (guest.playTimer <= 0) {
        finishPlaying(guest, pc);
      }
      continue;
    }

    if (guest.state === "toToilet") {
      const arrived = moveToward(guest, { x: layout.toilet.standX, y: layout.toilet.standY }, guest.speed, dt);
      if (arrived) {
        guest.state = "usingToilet";
        guest.toiletTimer = random(3.2, 5.2);
      }
      continue;
    }

    if (guest.state === "usingToilet") {
      guest.toiletTimer -= dt;
      if (guest.toiletTimer <= 0) {
        state.toilet.useCount += 1;
        state.toilet.dirty = state.toilet.useCount >= 2 || Math.random() < 0.35;
        state.cleanliness = Math.max(0, state.cleanliness - 4);
        guest.state = "backToPc";
        markSaveDirty();
        say("\u5395\u6240\u88ab\u4f7f\u7528\u4e86\uff0c\u6e05\u6d01\u503c\u4e0b\u964d\u3002");
      }
      continue;
    }

    if (guest.state === "backToPc") {
      const pc = layout.pcs[guest.pcId];
      const arrived = moveToPcSeat(guest, pc, guest.speed, dt);
      if (arrived) {
        guest.state = "playing";
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
  updateEquipmentLevel();
  updateCafeLevel();
  updateSpawn();
  updateFrontDesk(dt);
  updateGuests(dt);
  updateWorkers(dt);
  updateCleanliness(dt);
  updateLayoutHints(dt);
  updateAutoSave(dt);
}

function updateLayoutHints(dt) {
  if (!state.invalidFloorHint) return;
  state.invalidFloorHint.timer -= dt;
  if (state.invalidFloorHint.timer <= 0) {
    state.invalidFloorHint = null;
  }
}

function updateAutoSave(dt) {
  if (state.testMode) return;
  if (!state.saveDirty) return;

  state.saveTimer += dt;
  if (state.saveTimer >= SAVE_INTERVAL) {
    saveGame(true);
  }
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

function roundedRect(x, y, w, h, r, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function strokeRoundedRect(x, y, w, h, r, color, lineWidth = 2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function softCard(x, y, w, h, r, color, stroke) {
  const borderColor = stroke || "#2B1B17";
  ctx.fillStyle = borderColor;
  ctx.fillRect(Math.round(x - 1), Math.round(y - 1), Math.round(w + 2), Math.round(h + 2));
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x + 1), Math.round(y + 1), Math.round(w - 2), Math.round(h - 2));
}

function circle(x, y, radius, color) {
  if (radius <= 3) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x - radius), Math.round(y - radius), Math.round(radius * 2), Math.round(radius * 2));
  } else {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function ellipse(x, y, radiusX, radiusY, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x - radiusX), Math.round(y - radiusY), Math.round(radiusX * 2), Math.round(radiusY * 2));
}

function verticalGradientRect(x, y, w, h, topColor, bottomColor) {
  const midY = y + h / 2;
  ctx.fillStyle = topColor;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(midY - y));
  ctx.fillStyle = bottomColor;
  ctx.fillRect(Math.round(x), Math.round(midY), Math.round(w), Math.round(y + h - midY));
}

function isAssetReady(name) {
  return assets[name] && assets[name].ready;
}

function loadAssets() {
  Object.keys(assetSources).forEach((name) => {
    const src = assetSources[name];
    if (!src) return;

    const image = typeof wx.createImage === "function"
      ? wx.createImage()
      : typeof screenCanvas.createImage === "function"
        ? screenCanvas.createImage()
        : null;
    if (!image) return;

    assets[name] = { image, ready: false, failed: false };
    image.onload = () => {
      assets[name].ready = true;
    };
    image.onerror = () => {
      assets[name].failed = true;
    };
    image.src = src;
  });
}

function drawAsset(name, x, y, w, h) {
  const asset = assets[name];
  if (!asset || !asset.ready) return false;
  ctx.drawImage(asset.image, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  return true;
}

function drawAssetCentered(name, x, y, w, h) {
  return drawAsset(name, x - w / 2, y - h / 2, w, h);
}

function drawAssetTiled(name, area, tileW, tileH) {
  const asset = assets[name];
  if (!asset || !asset.ready) return false;
  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.w, area.h);
  ctx.clip();
  const startX = Math.floor(area.x / tileW) * tileW;
  const startY = Math.floor(area.y / tileH) * tileH;
  for (let y = startY; y < area.y + area.h; y += tileH) {
    for (let x = startX; x < area.x + area.w; x += tileW) {
      ctx.drawImage(asset.image, Math.round(x), Math.round(y), Math.round(tileW), Math.round(tileH));
    }
  }
  ctx.restore();
  return true;
}

function text(value, x, y, size, color, weight = "normal", align = "left") {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "SimHei", "Microsoft YaHei", monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillText(value, x, y);
}

function beginWorldDraw() {
  ctx.save();
  ctx.translate(-Math.round(state.camera.x), -Math.round(state.camera.y));
}

function endWorldDraw() {
  ctx.restore();
}

function drawPixelFloor() {
  const room = layout.room;
  verticalGradientRect(0, 0, WORLD.w, WORLD.h, "#0f2529", "#183136");
  roundedRect(room.x - 16, room.y - 16, room.w + 32, room.h + 32, 12, "rgba(6, 18, 22, 0.5)");
  roundedRect(room.x - 10, room.y - 10, room.w + 20, room.h + 20, 10, COLORS.wallDark);
  roundedRect(room.x - 4, room.y - 4, room.w + 8, room.h + 8, 8, COLORS.wall);
  drawTiledArea(room);

  drawPublicFloors();
  drawDoor();
  drawIndoorDetailsModern();
  drawRentedAreaRooms();
  drawToilet();
  drawAreaDoorways();
  drawInvalidFloorHint();
  drawLayoutSelection();
  drawPlacementHint();
}

function drawTiledArea(area) {
  roundedRect(area.x, area.y, area.w, area.h, 5, COLORS.floor);
  if (isAssetReady("floorTile")) {
    drawAssetTiled("floorTile", area, 58 * SPRITE_SCALE.floor, 74 * SPRITE_SCALE.floor);
  } else {
    rect(area.x, area.y, area.w, Math.min(18, area.h), "rgba(255,255,255,0.18)");
  }
  const startX = Math.floor(area.x / TILE) * TILE;
  const startY = Math.floor(area.y / TILE) * TILE;
  const endX = area.x + area.w;
  const endY = area.y + area.h;

  for (let y = startY; y < endY; y += TILE) {
    for (let x = startX; x < endX; x += TILE) {
      const tileX = Math.max(x, area.x);
      const tileY = Math.max(y, area.y);
      const tileW = Math.min(x + TILE, endX) - tileX;
      const tileH = Math.min(y + TILE, endY) - tileY;
      if (tileW <= 0 || tileH <= 0) continue;

      if ((Math.floor(x / TILE) + Math.floor(y / TILE)) % 2 === 0) rect(tileX, tileY, tileW, tileH, COLORS.floorAlt);
    }
  }

  for (let y = Math.ceil(area.y / TILE) * TILE; y < endY; y += TILE) {
    rect(area.x, y, area.w, 1, COLORS.floorLine);
  }

  for (let x = Math.ceil(area.x / TILE) * TILE; x < endX; x += TILE) {
    rect(x, area.y, 1, area.h, COLORS.floorLine);
  }
}

function drawPublicFloors() {
  state.publicFloors.forEach((floor) => {
    drawTiledArea(floor);
  });

  state.publicFloors.forEach((floor) => {
    drawPublicFloorOuterWalls(floor);
  });
}

function drawPublicFloorOuterWalls(floor) {
  const topSegments = getPublicFloorWallSegments(floor, "top");
  const bottomSegments = getPublicFloorWallSegments(floor, "bottom");
  const leftSegments = getPublicFloorWallSegments(floor, "left");
  const rightSegments = getPublicFloorWallSegments(floor, "right");

  topSegments.forEach((segment) => rect(segment.start, floor.y - 6, segment.end - segment.start, 6, COLORS.wallDark));
  bottomSegments.forEach((segment) => rect(segment.start, floor.y + floor.h, segment.end - segment.start, 6, COLORS.wallDark));
  leftSegments.forEach((segment) => rect(floor.x - 6, segment.start, 6, segment.end - segment.start, COLORS.wallDark));
  rightSegments.forEach((segment) => rect(floor.x + floor.w, segment.start, 6, segment.end - segment.start, COLORS.wallDark));

  if (segmentCovers(topSegments, floor.x) && segmentCovers(leftSegments, floor.y)) {
    rect(floor.x - 6, floor.y - 6, 6, 6, COLORS.wallDark);
  }
  if (segmentCovers(topSegments, floor.x + floor.w - 1) && segmentCovers(rightSegments, floor.y)) {
    rect(floor.x + floor.w, floor.y - 6, 6, 6, COLORS.wallDark);
  }
  if (segmentCovers(bottomSegments, floor.x) && segmentCovers(leftSegments, floor.y + floor.h - 1)) {
    rect(floor.x - 6, floor.y + floor.h, 6, 6, COLORS.wallDark);
  }
  if (segmentCovers(bottomSegments, floor.x + floor.w - 1) && segmentCovers(rightSegments, floor.y + floor.h - 1)) {
    rect(floor.x + floor.w, floor.y + floor.h, 6, 6, COLORS.wallDark);
  }
}

function getPublicFloorWallSegments(floor, side) {
  const horizontal = side === "top" || side === "bottom";
  const start = horizontal ? floor.x : floor.y;
  const end = horizontal ? floor.x + floor.w : floor.y + floor.h;
  const covered = [];

  getAttachableAreas().forEach((other) => {
    if (other.id === floor.id) return;
    if (!touchesSide(floor, other, side)) return;

    const overlapStart = horizontal ? Math.max(floor.x, other.x) : Math.max(floor.y, other.y);
    const overlapEnd = horizontal ? Math.min(floor.x + floor.w, other.x + other.w) : Math.min(floor.y + floor.h, other.y + other.h);
    if (overlapEnd > overlapStart) {
      covered.push({ start: overlapStart, end: overlapEnd });
    }
  });

  return subtractSegments(start, end, covered);
}

function subtractSegments(start, end, covered) {
  if (!covered.length) return [{ start, end }];

  const merged = covered
    .map((segment) => ({
      start: Math.max(start, segment.start),
      end: Math.min(end, segment.end)
    }))
    .filter((segment) => segment.end > segment.start)
    .sort((a, b) => a.start - b.start)
    .reduce((result, segment) => {
      const last = result[result.length - 1];
      if (last && segment.start <= last.end) {
        last.end = Math.max(last.end, segment.end);
      } else {
        result.push(segment);
      }
      return result;
    }, []);

  const walls = [];
  let cursor = start;
  merged.forEach((segment) => {
    if (segment.start > cursor) {
      walls.push({ start: cursor, end: segment.start });
    }
    cursor = Math.max(cursor, segment.end);
  });
  if (cursor < end) {
    walls.push({ start: cursor, end });
  }
  return walls;
}

function segmentCovers(segments, point) {
  return segments.some((segment) => point >= segment.start && point < segment.end);
}

function touchesSide(area, other, side) {
  if (side === "top") {
    return other.y + other.h === area.y && horizontalOverlap(area, other) >= 1;
  }
  if (side === "bottom") {
    return area.y + area.h === other.y && horizontalOverlap(area, other) >= 1;
  }
  if (side === "left") {
    return other.x + other.w === area.x && verticalOverlap(area, other) >= 1;
  }
  return area.x + area.w === other.x && verticalOverlap(area, other) >= 1;
}

function horizontalOverlap(a, b) {
  return Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
}

function verticalOverlap(a, b) {
  return Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
}

function drawInvalidFloorHint() {
  const hint = state.invalidFloorHint;
  if (!hint) return;
  rect(hint.x, hint.y, 72, 72, "rgba(217, 74, 69, 0.22)");
  strokeRect(hint.x, hint.y, 72, 72, COLORS.red, 3);
  text("\u65e0\u6cd5\u94fa\u8bbe", hint.x + 36, hint.y + 29, 12, COLORS.text, "bold", "center");
}

function drawRentedAreaRooms() {
  state.rentedAreas.forEach((area) => {
    if (area.id === 1) return;
    roundedRect(area.x - 6, area.y - 6, area.w + 12, area.h + 12, 7, COLORS.wallDark);
    roundedRect(area.x, area.y, area.w, area.h, 5, COLORS.wall);
    roundedRect(area.x + 4, area.y + 4, area.w - 8, 24, 4, COLORS.wallTop);
    drawTiledArea({ x: area.x + 8, y: area.y + 32, w: area.w - 16, h: area.h - 40 });
    strokeRoundedRect(area.x, area.y, area.w, area.h, 5, COLORS.line, 2);
    text(area.name, area.x + area.w / 2, area.y + 6, 12, COLORS.text, "bold", "center");
    if (area.typeId === "capsuleRoom") {
      rect(area.x + area.w - 38, area.y + area.h - 36, 26, 20, "#4b3027");
      rect(area.x + area.w - 34, area.y + area.h - 32, 18, 12, COLORS.red);
    } else if (area.typeId === "showerRoom") {
      rect(area.x + area.w / 2 - 13, area.y + 48, 26, 34, "#88c7dc");
      rect(area.x + area.w / 2 - 8, area.y + 42, 16, 8, "#dff7ff");
    } else if (area.typeId === "chessRoom") {
      rect(area.x + area.w / 2 - 24, area.y + 50, 48, 32, "#7b5a35");
      rect(area.x + area.w / 2 - 14, area.y + 58, 8, 8, COLORS.text);
      rect(area.x + area.w / 2 + 6, area.y + 66, 8, 8, COLORS.line);
    }
  });
}

function drawAreaDoorways() {
  const areas = getStructuralAreas();
  for (let i = 0; i < areas.length; i += 1) {
    for (let j = i + 1; j < areas.length; j += 1) {
      const a = areas[i];
      const b = areas[j];
      drawDoorwayBetweenAreas(a, b);
    }
  }
  drawPublicFloorDoorways();
}

function drawDoorwayBetweenAreas(a, b) {
  const doorW = 34;
  const doorH = 18;
  if (a.y + a.h === b.y || b.y + b.h === a.y) {
    const y = a.y + a.h === b.y ? b.y : a.y;
    const overlapStart = Math.max(a.x + 16, b.x + 16);
    const overlapEnd = Math.min(a.x + a.w - 16, b.x + b.w - 16);
    if (overlapEnd - overlapStart < 28) return;
    const x = (overlapStart + overlapEnd) / 2 - doorW / 2;
    rect(x, y - 5, doorW, 10, COLORS.floor);
    rect(x, y - 1, doorW, 2, COLORS.floorLine);
    return;
  }

  if (a.x + a.w === b.x || b.x + b.w === a.x) {
    const x = a.x + a.w === b.x ? b.x : a.x;
    const overlapStart = Math.max(a.y + 28, b.y + 28);
    const overlapEnd = Math.min(a.y + a.h - 16, b.y + b.h - 16);
    if (overlapEnd - overlapStart < 28) return;
    const y = (overlapStart + overlapEnd) / 2 - doorH / 2;
    rect(x - 5, y, 10, doorH, COLORS.floor);
    rect(x - 1, y, 2, doorH, COLORS.floorLine);
  }
}

function drawPublicFloorDoorways() {
  getStructuralAreas().forEach((area) => {
    state.publicFloors.forEach((floor) => {
      if (sharesWall(area, floor)) {
        drawFloorOpening(area, floor);
      }
    });
  });

  for (let i = 0; i < state.publicFloors.length; i += 1) {
    for (let j = i + 1; j < state.publicFloors.length; j += 1) {
      const a = state.publicFloors[i];
      const b = state.publicFloors[j];
      if (sharesWall(a, b)) {
        drawFloorOpening(a, b);
      }
    }
  }
}

function drawFloorOpening(area, floor) {
  if (area.y + area.h === floor.y || floor.y + floor.h === area.y) {
    const y = area.y + area.h === floor.y ? floor.y : area.y;
    const overlapStart = Math.max(area.x, floor.x);
    const overlapEnd = Math.min(area.x + area.w, floor.x + floor.w);
    if (overlapEnd - overlapStart < 8) return;
    drawTiledArea({ x: overlapStart - 1, y: y - 8, w: overlapEnd - overlapStart + 2, h: 16 });
    return;
  }

  if (area.x + area.w === floor.x || floor.x + floor.w === area.x) {
    const x = area.x + area.w === floor.x ? floor.x : area.x;
    const overlapStart = Math.max(area.y, floor.y);
    const overlapEnd = Math.min(area.y + area.h, floor.y + floor.h);
    if (overlapEnd - overlapStart < 8) return;
    drawTiledArea({ x: x - 8, y: overlapStart - 1, w: 16, h: overlapEnd - overlapStart + 2 });
  }
}

function drawPlacementHint() {
  const pending = state.pendingExpansion;
  const type = getPendingExpansionType();
  if (!pending || !type) return;

  const size = getAreaSize(type, pending.pcCount);
  const x = state.camera.x + view.width / 2 - size.w / 2;
  const y = state.camera.y + (view.height - ACTION_BAR_HEIGHT + HUD_HEIGHT) / 2 - size.h / 2;
  const candidate = getAttachedAreaCandidate(x + size.w / 2, y + size.h / 2, size);
  const area = candidate ? candidate.area : { x: snapToGrid(x), y: snapToGrid(y), w: size.w, h: size.h };
  if (!candidate) clampAreaToWorld(area);
  const free = Boolean(candidate) && isAreaPlacementFree(area);
  rect(area.x, area.y, area.w, area.h, free ? "rgba(105, 185, 109, 0.28)" : "rgba(217, 74, 69, 0.28)");
  strokeRect(area.x, area.y, area.w, area.h, free ? COLORS.green : COLORS.red, 3);
  text(free ? "\u70b9\u51fb\u8d34\u5899\u653e\u7f6e" : "\u9700\u8d34\u4f4f\u65e7\u5899", area.x + area.w / 2, area.y + area.h / 2 - 8, 13, COLORS.text, "bold", "center");
}

function drawLayoutSelection() {
  if (!state.layoutToolActive) return;

  if (state.layoutMode === "area" && state.selectedAreaId) {
    const area = getAreaById(state.selectedAreaId);
    if (area) {
      strokeRect(area.x - 5, area.y - 5, area.w + 10, area.h + 10, COLORS.yellow, 3);
      text("\u5df2\u9009\u533a\u57df", area.x + area.w / 2, area.y - 22, 12, COLORS.yellow, "bold", "center");
    }
  }

  if (state.layoutMode === "pc" && state.selectedPcId) {
    const pc = layout.pcs[state.selectedPcId - 1];
    if (pc) {
      strokeRect(pc.x - 6, pc.y - 6, pc.w + 12, pc.h + 12, COLORS.yellow, 3);
    }
  }

  if (state.layoutMode === "floor") {
    drawPublicFloorPlacementHint();
    text("\u5e03\u5c40\uff1a\u8d34\u5899\u6216\u5bf9\u9f50\u4e0a\u4e00\u5757\u5730\u7816", state.camera.x + view.width / 2, state.camera.y + HUD_HEIGHT + 8, 12, COLORS.yellow, "bold", "center");
  }
}

function drawPublicFloorPlacementHint() {
  const worldX = state.camera.x + view.width / 2;
  const worldY = state.camera.y + (view.height - ACTION_BAR_HEIGHT + HUD_HEIGHT) / 2;
  const candidate = getPublicFloorCandidate(worldX, worldY);
  const floor = candidate ? candidate.floor : {
    x: snapToGrid(worldX - 36),
    y: snapToGrid(worldY - 36),
    w: 72,
    h: 72
  };
  clampAreaToWorld(floor);
  const canPlace = Boolean(candidate) && isPublicFloorPlacementFree(floor);
  rect(floor.x, floor.y, floor.w, floor.h, canPlace ? "rgba(105, 185, 109, 0.28)" : "rgba(217, 74, 69, 0.28)");
  strokeRect(floor.x, floor.y, floor.w, floor.h, canPlace ? COLORS.green : COLORS.red, 3);
  text(canPlace ? "\u53ef\u94fa\u8fc7\u9053" : "\u65e0\u6cd5\u94fa\u8bbe", floor.x + floor.w / 2, floor.y + floor.h / 2 - 8, 12, COLORS.text, "bold", "center");
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
  roundedRect(room.x - 12, layout.entrance.y - 32, 20, 64, 4, "#10252b");
  softCard(room.x - 32, layout.entrance.y - 24, 30, 48, 4, "#6b8ea0");
  roundedRect(room.x - 27, layout.entrance.y - 18, 20, 36, 3, "#9ec3cf");
  rect(room.x - 10, layout.entrance.y - 1, 4, 4, COLORS.yellow);
  roundedRect(room.x - 54, layout.entrance.y - 5, 28, 10, 4, "#e65b63");
  roundedRect(room.x - 31, layout.entrance.y - 14, 10, 28, 4, "#e65b63");
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
  const assetW = (c.w + 92) * SPRITE_SCALE.counter;
  const assetH = assetW * 424 / 541;
  if (drawAsset("counter", c.x - 34, c.y - 38, assetW, assetH)) {
    if (state.frontDesk.busyGuestId) {
      const progress = 1 - state.frontDesk.timer / state.frontDesk.duration;
      roundedRect(c.x + 8, c.y + c.h + 8, c.w - 16, 6, 3, "rgba(20, 31, 37, 0.38)");
      roundedRect(c.x + 8, c.y + c.h + 8, (c.w - 16) * progress, 6, 3, COLORS.yellow);
    }
    return;
  }

  softCard(c.x - 38, c.y + 1, 30, c.h + 22, 5, "#304750");
  roundedRect(c.x - 31, c.y + 12, 18, 4, 2, COLORS.counterEdge);
  roundedRect(c.x - 31, c.y + 28, 18, 4, 2, COLORS.counterEdge);
  roundedRect(c.x - 29, c.y + 6, 6, 7, 2, COLORS.red);
  roundedRect(c.x - 19, c.y + 6, 6, 7, 2, COLORS.yellow);
  roundedRect(c.x - 29, c.y + 20, 6, 7, 2, COLORS.green);
  roundedRect(c.x - 19, c.y + 20, 6, 7, 2, COLORS.blue);

  softCard(c.x - 6, c.y - 4, c.w + 12, c.h + 10, 8, "#345565");
  verticalGradientRect(c.x, c.y, c.w, c.h, "#5e8791", "#3b6675");
  roundedRect(c.x + 8, c.y + 7, c.w - 16, 9, 5, "rgba(255,255,255,0.2)");
  roundedRect(c.x + 10, c.y + c.h - 9, c.w - 20, 5, 3, COLORS.counterEdge);
  text("\u524d\u53f0", c.x + c.w / 2, c.y + 12, 18, COLORS.text, "bold", "center");

  roundedRect(c.x + c.w - 34, c.y + 12, 24, 19, 4, "#16252b");
  roundedRect(c.x + c.w - 28, c.y + 16, 13, 8, 2, COLORS.pcGlow);

  if (state.frontDesk.busyGuestId) {
    const progress = 1 - state.frontDesk.timer / state.frontDesk.duration;
    rect(c.x + 8, c.y + c.h + 6, c.w - 16, 6, "#3a2b26");
    rect(c.x + 8, c.y + c.h + 6, (c.w - 16) * progress, 6, COLORS.yellow);
  }
}

function drawPc(pc) {
  const assetW = 76 * SPRITE_SCALE.pc;
  const assetH = assetW * 383 / 419;
  if (drawAsset("pcStation", pc.seatX - assetW / 2 + 1, pc.seatY - assetH + 14, assetW, assetH)) {
    text(`${pc.id + 1}\u53f7 L${pc.equipmentLevel}`, pc.x + pc.w / 2, pc.y - 22, 10, COLORS.dimText, "bold", "center");
    if (pc.areaId !== 1) {
      text(pc.areaName, pc.x + pc.w / 2, pc.y - 34, 9, COLORS.yellow, "bold", "center");
    }
    if (pc.dirty) {
      rect(pc.x + pc.w - 11, pc.y + 27, 8, 8, COLORS.red);
      drawCleanBubble(pc.x + pc.w / 2, pc.y - 44, "\u6e05\u6d01");
    }
    const guest = state.guests.find((item) => item.id === pc.occupiedBy && item.state === "playing");
    if (guest) {
      const progress = 1 - guest.playTimer / guest.playDuration;
      rect(pc.x, pc.y - 14, pc.w, 5, "rgba(20, 31, 37, 0.38)");
      rect(pc.x, pc.y - 14, Math.round(pc.w * progress), 5, COLORS.yellow);
    }
    return;
  }

  const vx = pc.x - 5;
  const vy = pc.y - 4;
  const vw = pc.w + 10;
  const vh = pc.h + 8;
  ellipse(pc.seatX, pc.seatY + 8, 18, 7, "rgba(18, 30, 36, 0.18)");
  rect(pc.seatX - 11, pc.seatY - 4, 22, 16, "#4a5e68");
  rect(pc.x + 5, pc.y + pc.h + 1, pc.w - 10, 9, "rgba(20, 31, 37, 0.38)");
  rect(vx - 1, vy - 1, vw + 2, vh + 2, COLORS.line);
  rect(vx, vy, vw, vh, "#3d4a54");
  rect(vx + 4, vy + 4, vw - 8, vh - 8, "#2e3a43");
  rect(pc.x + 4, pc.y + 4, pc.w - 8, 22, "#101d24");
  rect(pc.x + 8, pc.y + 8, pc.w - 16, 12, pc.dirty ? "#707a7c" : COLORS.pcGlow);
  rect(pc.x + 10, pc.y + 10, 6, 2, "#ecfff5");
  rect(pc.x + 17, pc.y + 29, 8, 7, "#1d272e");

  text(`${pc.id + 1}\u53f7 L${pc.equipmentLevel}`, pc.x + pc.w / 2, pc.y - 20, 10, COLORS.dimText, "bold", "center");
  if (pc.areaId !== 1) {
    text(pc.areaName, pc.x + pc.w / 2, pc.y - 30, 9, COLORS.yellow, "bold", "center");
  }

  if (pc.dirty) {
    roundedRect(pc.x + pc.w - 11, pc.y + 27, 8, 8, 3, COLORS.red);
    drawCleanBubble(pc.x + pc.w / 2, pc.y - 40, "\u6e05\u6d01");
  }

  const guest = state.guests.find((item) => item.id === pc.occupiedBy && item.state === "playing");
  if (guest) {
    const progress = 1 - guest.playTimer / guest.playDuration;
    rect(pc.x, pc.y - 12, pc.w, 5, "rgba(20, 31, 37, 0.38)");
    rect(pc.x, pc.y - 12, Math.round(pc.w * progress), 5, COLORS.yellow);
  }
}

function drawCleanBubble(x, y, label) {
  const bubbleW = 44;
  rect(x - bubbleW / 2 - 1, y - 1, bubbleW + 2, 26, COLORS.line);
  rect(x - bubbleW / 2, y, bubbleW, 24, "#fff7dd");
  text(label, x, y + 4, 12, COLORS.red, "bold", "center");
  rect(x - 3, y + 22, 6, 6, "#fff7dd");
}

function drawGuest(guest) {
  const x = Math.round(guest.x);
  const y = Math.round(guest.y);
  if (drawAsset("guest", x - 15, y - 50, 31, 50)) {
    if (guest.state === "queueing") {
      text("...", x, y - 62, 11, COLORS.text, "bold", "center");
    }
    if (guest.state === "playing" && guest.demand) {
      drawDemandBubble(guest);
    }
    return;
  }

  ellipse(x, y + 8, 13, 5, "rgba(18, 30, 36, 0.2)");
  circle(x, y - 15, 7, "#f3c596");
  roundedRect(x - 8, y - 22, 16, 7, 5, guest.palette.hair);
  roundedRect(x - 9, y - 8, 18, 17, 7, guest.palette.shirt);
  roundedRect(x - 11, y - 5, 4, 12, 3, "#f3c596");
  roundedRect(x + 7, y - 5, 4, 12, 3, "#f3c596");
  roundedRect(x - 7, y + 6, 6, 10, 3, "#24384a");
  roundedRect(x + 1, y + 6, 6, 10, 3, "#24384a");
  circle(x - 2, y - 14, 1, "#203544");
  circle(x + 3, y - 14, 1, "#203544");

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

  rect(bubbleX - 1, y - 1, bubbleW + 2, 30, COLORS.line);
  rect(bubbleX, y, bubbleW, 28, "#fff7dd");
  text(label, bubbleX + bubbleW / 2, y + 4, 13, COLORS.line, "bold", "center");
  rect(bubbleX + 5, y + 22, bubbleW - 10, 3, "#8c6b4a");
  rect(bubbleX + 5, y + 22, Math.round((bubbleW - 10) * progress), 3, COLORS.red);
  rect(x - 3, y + 26, 6, 6, "#fff7dd");
}

function drawHud() {
  rect(0, 0, view.width, HUD_HEIGHT, COLORS.uiDark);
  rect(0, HUD_HEIGHT - 3, view.width, 3, COLORS.counterTop);
  text("\u5c0f\u9ed1\u7f51\u5427", 16, SAFE_TOP + 5, 21, COLORS.text, "bold");
  rect(14, SAFE_TOP + 35, 96, 22, "rgba(105, 185, 109, 0.14)");
  text(`\u73b0\u91d1 ${state.cash}`, 24, SAFE_TOP + 39, 13, COLORS.green, "bold");
  drawCleanlinessBar();

  if (state.messageTimer > 0) {
    rect(12, view.height - ACTION_BAR_HEIGHT - 40, view.width - 24, 28, "rgba(28, 48, 56, 0.88)");
    text(state.message, view.width / 2, view.height - ACTION_BAR_HEIGHT - 31, 11, COLORS.text, "normal", "center");
  }
}

function drawActionBar() {
  const y = view.height - ACTION_BAR_HEIGHT;
  clearActionButtons();
  rect(0, y, view.width, ACTION_BAR_HEIGHT, COLORS.uiDark);
  rect(0, y, view.width, 3, COLORS.counterTop);

  text(`\u7f51\u5427 Lv.${state.cafeLevel}`, 16, y + 11, 13, COLORS.yellow, "bold");

  const groupY = y + 31;
  const groupW = 34;
  const groupGap = 4;
  ui.dailyGroupButton = { x: 14, y: groupY, w: groupW, h: 20 };
  ui.buildGroupButton = { x: 14 + (groupW + groupGap), y: groupY, w: groupW, h: 20 };
  ui.systemGroupButton = { x: 14 + (groupW + groupGap) * 2, y: groupY, w: groupW, h: 20 };
  drawActionButton(ui.dailyGroupButton, "\u65e5", state.actionGroup === "daily");
  drawActionButton(ui.buildGroupButton, "\u5efa", state.actionGroup === "build");
  drawActionButton(ui.systemGroupButton, "\u7cfb", state.actionGroup === "system");

  const buttonW = view.width < 350 ? 42 : 48;
  const gap = view.width < 350 ? 5 : 6;
  const buttonH = 34;
  const actionSets = {
    daily: [
      ["warehouseButton", "\u4ed3\u5e93"],
      ["hiringButton", "\u62db\u8058"],
      ["procurementButton", "\u91c7\u8d2d"]
    ],
    build: [
      ["equipmentButton", "\u8bbe\u5907"],
      ["expansionButton", "\u6269\u79df"],
      ["layoutButton", "\u5e03\u5c40", state.layoutToolActive]
    ],
    system: [
      ["settingsButton", "\u8bbe\u7f6e"]
    ]
  };
  const actions = actionSets[state.actionGroup] || actionSets.daily;
  const startX = Math.max(126, view.width - (buttonW + gap) * actions.length - 8);

  actions.forEach((action, index) => {
    const button = { x: startX + (buttonW + gap) * index, y: y + 12, w: buttonW, h: buttonH };
    ui[action[0]] = button;
    drawActionButton(button, action[1], Boolean(action[2]));
  });
}

function drawActionButton(button, label, active = false) {
  rect(button.x - 1, button.y - 1, button.w + 2, button.h + 2, COLORS.line);
  rect(button.x, button.y, button.w, button.h, active ? "#4e9f74" : "#5D4037");
  const size = button.w < 36 ? 11 : 12;
  text(label, button.x + button.w / 2, button.y + (button.h - size) / 2, size, COLORS.text, "bold", "center");
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

function drawToilet() {
  const toilet = layout.toilet;
  const flushWithRoomRight = toilet.x === layout.room.x + layout.room.w && verticalOverlap(toilet, layout.room) > 0;
  if (flushWithRoomRight) {
    roundedRect(toilet.x, toilet.y - 6, toilet.w + 6, toilet.h + 12, 6, COLORS.wallDark);
  } else {
    roundedRect(toilet.x - 6, toilet.y - 6, toilet.w + 12, toilet.h + 12, 6, COLORS.wallDark);
  }
  roundedRect(toilet.x, toilet.y, toilet.w, toilet.h, 5, COLORS.wall);
  roundedRect(toilet.x + 4, toilet.y + 4, toilet.w - 8, 22, 4, state.toilet.dirty ? "#b16b66" : COLORS.wallTop);
  if (state.toilet.dirty) {
    rect(toilet.x + 9, toilet.y + 32, toilet.w - 18, toilet.h - 42, "#b58b68");
  } else {
    drawTiledArea({ x: toilet.x + 9, y: toilet.y + 32, w: toilet.w - 18, h: toilet.h - 42 });
  }
  strokeRoundedRect(toilet.x, toilet.y, toilet.w, toilet.h, 5, COLORS.line, 2);
  text("\u5395\u6240", toilet.x + toilet.w / 2, toilet.y + 6, 13, COLORS.text, "bold", "center");
  roundedRect(toilet.x + toilet.w / 2 - 13, toilet.y + 50, 26, 18, 4, "#d7dfe1");
  roundedRect(toilet.x + toilet.w / 2 - 8, toilet.y + 44, 16, 10, 3, COLORS.glass);

  if (state.toilet.dirty) {
    rect(toilet.x + toilet.w - 15, toilet.y + 30, 8, 8, COLORS.red);
    drawCleanBubble(toilet.x + toilet.w / 2, toilet.y - 38, "\u6e05\u5395\u6240");
  }
}

function drawCleanlinessBar() {
  const x = Math.min(view.width - 150, 148);
  const y = SAFE_TOP + 17;
  const w = 82;
  const h = 9;
  const ratio = Math.max(0, Math.min(1, state.cleanliness / 100));
  const fillColor = ratio > 0.55 ? COLORS.green : ratio > 0.3 ? COLORS.yellow : COLORS.red;

  text("\u6e05\u6d01", x, y - 15, 10, COLORS.text, "bold");
  rect(x - 1, y - 1, w + 2, h + 2, COLORS.line);
  rect(x, y, w, h, "rgba(10, 24, 28, 0.55)");
  rect(x + 1, y + 1, Math.max(0, Math.floor((w - 2) * ratio)), h - 2, fillColor);
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
  ui.purchaseBatchButtons.length = 0;

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
  const cardH = 92;
  const rows = Math.max(1, Math.floor((panel.y + panel.h - 42 - startY) / (cardH + gap)));
  const pageSize = rows * cols;
  const pageCount = getPageCount(products.length, pageSize);
  const page = getPanelPage("procurement", pageCount);
  const visibleProducts = products.slice(page * pageSize, page * pageSize + pageSize);

  visibleProducts.forEach((product, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = panel.x + 10 + col * (cardW + gap);
    const y = startY + row * (cardH + gap);
    if (y + cardH > panel.y + panel.h - 36) return;

    const unlocked = state.cafeLevel >= product.unlockLevel;
    const stock = state.inventory[product.id] || 0;
    const quantity = getPurchaseQuantity(product);
    const unitCost = Math.ceil(getProductUnitCost(product) * 10) / 10;
    const cardColor = unlocked ? "#f7dba5" : "#c5a575";
    rect(x, y, cardW, cardH, cardColor);
    strokeRect(x, y, cardW, cardH, unlocked ? "#9a7043" : "#80664f", 2);
    drawProductIcon(product, x + 10, y + 10, !unlocked);

    text(fitTextToWidth(product.name, cardW - 100, 14, "bold"), x + 50, y + 8, 14, unlocked ? COLORS.line : "#745a46", "bold");
    text(`\u5e93\u5b58 ${stock}`, x + 50, y + 26, 11, "#5d4532", "bold");
    text(`\u552e\u4ef7 ${product.sellPrice}`, x + 50, y + 42, 10, "#5d4532");
    text(`\u6210\u672c ${unitCost}\u5143/\u4e2a`, x + 8, y + 54, 10, "#5d4532");
    text(`\u8d77\u6279 ${product.quantity}  \u672c\u6b21 ${quantity}`, x + 8, y + 67, 10, "#5d4532", "bold");

    const plus10Button = { x: x + 8, y: y + cardH - 24, w: 34, h: 18, product, delta: 10 };
    const plus20Button = { x: x + 46, y: y + cardH - 24, w: 34, h: 18, product, delta: 20 };
    const button = { x: x + cardW - 52, y: y + cardH - 25, w: 42, h: 20, product };

    if (!unlocked) {
      ui.buyButtons.push(button);
      rect(button.x, button.y, button.w, button.h, "#8d7b66");
      text(`Lv.${product.unlockLevel}`, button.x + button.w / 2, button.y + 5, 11, "#f8e0b0", "bold", "center");
      rect(x, y, cardW, cardH, "rgba(75, 59, 45, 0.18)");
    } else {
      ui.purchaseBatchButtons.push(plus10Button, plus20Button);
      ui.buyButtons.push(button);
      rect(plus10Button.x, plus10Button.y, plus10Button.w, plus10Button.h, "#7f5635");
      strokeRect(plus10Button.x, plus10Button.y, plus10Button.w, plus10Button.h, COLORS.line, 1);
      text("+10", plus10Button.x + plus10Button.w / 2, plus10Button.y + 3, 10, COLORS.text, "bold", "center");
      rect(plus20Button.x, plus20Button.y, plus20Button.w, plus20Button.h, "#7f5635");
      strokeRect(plus20Button.x, plus20Button.y, plus20Button.w, plus20Button.h, COLORS.line, 1);
      text("+20", plus20Button.x + plus20Button.w / 2, plus20Button.y + 3, 10, COLORS.text, "bold", "center");
      rect(button.x, button.y, button.w, button.h, canBuyProduct(product, quantity) ? "#4e8f4f" : "#9a6b55");
      text("\u4e70", button.x + button.w / 2, button.y + 3, 13, COLORS.text, "bold", "center");
    }
  });

  drawPanelPager("procurement", panel, page, pageCount);

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
  const rows = Math.max(1, Math.floor((panel.y + panel.h - 44 - startY) / (cardH + gap)));
  const pageSize = rows * cols;
  const pageCount = getPageCount(products.length, pageSize);
  const page = getPanelPage("warehouse", pageCount);
  const visibleProducts = products.slice(page * pageSize, page * pageSize + pageSize);

  visibleProducts.forEach((product, index) => {
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

  drawPanelPager("warehouse", panel, page, pageCount);

  rect(ui.warehouseProcurementButton.x, ui.warehouseProcurementButton.y, ui.warehouseProcurementButton.w, ui.warehouseProcurementButton.h, "#4e8f4f");
  strokeRect(ui.warehouseProcurementButton.x, ui.warehouseProcurementButton.y, ui.warehouseProcurementButton.w, ui.warehouseProcurementButton.h, COLORS.line, 2);
  text("\u53bb\u91c7\u8d2d", ui.warehouseProcurementButton.x + ui.warehouseProcurementButton.w / 2, ui.warehouseProcurementButton.y + 4, 12, COLORS.text, "bold", "center");

  rect(ui.closeWarehouseButton.x, ui.closeWarehouseButton.y, ui.closeWarehouseButton.w, ui.closeWarehouseButton.h, "#7f5635");
  strokeRect(ui.closeWarehouseButton.x, ui.closeWarehouseButton.y, ui.closeWarehouseButton.w, ui.closeWarehouseButton.h, COLORS.line, 2);
  text("\u5173", ui.closeWarehouseButton.x + ui.closeWarehouseButton.w / 2, ui.closeWarehouseButton.y + 4, 12, COLORS.text, "bold", "center");
}

function drawHiringPanel() {
  if (!state.hiringOpen) return;

  ui.hireButtons.length = 0;
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
  text("\u5458\u5de5\u62db\u8058", panel.x + 16, panel.y + 11, 18, COLORS.text, "bold");
  text(`\u5458\u5de5 ${getEmployeeTotal()}  \u7f51\u5427 Lv.${state.cafeLevel}/4`, panel.x + panel.w - 132, panel.y + 14, 12, COLORS.text, "bold");

  rect(panel.x + 10, panel.y + 48, panel.w - 20, 34, "#e3b86f");
  text(`\u5347\u7ea7\u6761\u4ef6\uff1a\u5458\u5de5 ${getEmployeeTotal()} / \u8bbe\u5907 ${state.equipmentLevel} / \u673a\u5668 ${layout.pcs.length}`, panel.x + 18, panel.y + 56, 12, "#5d4532", "bold");

  const startY = panel.y + 88;
  const cardH = 62;
  const pageSize = Math.max(1, Math.floor((panel.y + panel.h - 42 - startY) / (cardH + 6)));
  const pageCount = getPageCount(staffTypes.length, pageSize);
  const page = getPanelPage("hiring", pageCount);
  const visibleStaff = staffTypes.slice(page * pageSize, page * pageSize + pageSize);

  visibleStaff.forEach((staff, index) => {
    const y = startY + index * (cardH + 6);
    if (y + cardH > panel.y + panel.h - 42) return;

    const count = state.employees[staff.id];
    const requirement = getStaffRequirement(staff);
    const canHire = canHireStaff(staff);
    rect(panel.x + 10, y, panel.w - 20, cardH, requirement ? "#c5a575" : "#f7dba5");
    strokeRect(panel.x + 10, y, panel.w - 20, cardH, "#9a7043", 2);
    drawStaffIcon(staff, panel.x + 22, y + 17, Boolean(requirement));
    text(`${staff.name} x${count}`, panel.x + 62, y + 7, 14, COLORS.line, "bold");
    text(`\u62db ${staff.hireCost}  \u6708\u85aa ${staff.salary}`, panel.x + 62, y + 26, 10, "#5d4532", "bold");
    const button = { x: panel.x + panel.w - 54, y: y + 10, w: 38, h: 24, staff };
    const desc = fitTextToWidth(requirement || staff.desc, button.x - (panel.x + 62) - 8, 9);
    text(desc, panel.x + 62, y + 42, 9, requirement ? COLORS.red : "#5d4532");
    ui.hireButtons.push(button);
    rect(button.x, button.y, button.w, button.h, canHire ? "#4e8f4f" : "#9a6b55");
    strokeRect(button.x, button.y, button.w, button.h, COLORS.line, 2);
    text("\u62db", button.x + button.w / 2, button.y + 5, 14, COLORS.text, "bold", "center");
  });

  ui.closeHiringButton = { x: panel.x + panel.w - 50, y: panel.y + panel.h - 34, w: 38, h: 24 };
  drawPanelPager("hiring", panel, page, pageCount);
  rect(ui.closeHiringButton.x, ui.closeHiringButton.y, ui.closeHiringButton.w, ui.closeHiringButton.h, "#7f5635");
  strokeRect(ui.closeHiringButton.x, ui.closeHiringButton.y, ui.closeHiringButton.w, ui.closeHiringButton.h, COLORS.line, 2);
  text("\u5173\u95ed", ui.closeHiringButton.x + ui.closeHiringButton.w / 2, ui.closeHiringButton.y + 4, 12, COLORS.text, "bold", "center");
}

function drawExpansionPanel() {
  if (!state.expansionOpen) return;

  ui.rentAreaButtons.length = 0;
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
  text("\u6269\u79df\u533a\u57df", panel.x + 16, panel.y + 11, 18, COLORS.text, "bold");
  text(`\u673a\u4f4d ${layout.pcs.length}/${MAX_OPERATIONAL_PCS}`, panel.x + panel.w - 98, panel.y + 14, 12, COLORS.text, "bold");

  rect(panel.x + 10, panel.y + 48, panel.w - 20, 38, "#e3b86f");
  text(`\u5df2\u79df\uff1a${getRentedAreaSummary()}`, panel.x + 18, panel.y + 56, 11, "#5d4532", "bold");
  text("\u9009\u65b9\u6848\u540e\u56de\u5230\u5730\u56fe\uff0c\u70b9\u7a7a\u5730\u653e\u7f6e", panel.x + 18, panel.y + 72, 10, "#5d4532");

  const offers = getExpansionOffers();
  const startY = panel.y + 96;
  const cardH = 54;
  const pageSize = Math.max(1, Math.floor((panel.y + panel.h - 42 - startY) / (cardH + 6)));
  const pageCount = getPageCount(offers.length, pageSize);
  const page = getPanelPage("expansion", pageCount);
  const visibleOffers = offers.slice(page * pageSize, page * pageSize + pageSize);

  visibleOffers.forEach((offer, index) => {
    const y = startY + index * (cardH + 6);
    if (y + cardH > panel.y + panel.h - 42) return;

    const cost = getAreaRentCost(offer.type, offer.pcCount);
    const overLimit = layout.pcs.length + offer.pcCount > MAX_OPERATIONAL_PCS;
    const affordable = state.cash >= cost;
    const canRent = !overLimit && affordable;
    const areaCount = getRentedAmenityCount(offer.type.id);
    const title = offer.pcCount
      ? `${offer.type.name} ${offer.pcCount}\u673a`
      : `${offer.type.name} x${areaCount}`;

    rect(panel.x + 10, y, panel.w - 20, cardH, canRent ? "#f7dba5" : "#c5a575");
    strokeRect(panel.x + 10, y, panel.w - 20, cardH, "#9a7043", 2);
    drawExpansionIcon(offer.type, panel.x + 30, y + 26, !canRent);
    text(title, panel.x + 58, y + 7, 13, COLORS.line, "bold");
    text(`\u79df\u91d1 ${cost}`, panel.x + 58, y + 24, 10, "#5d4532", "bold");
    const note = overLimit
      ? "\u673a\u4f4d\u5df2\u8fbe\u4e0a\u9650"
      : offer.pcCount ? `\u653e\u7f6e\u540e\u589e\u52a0 ${offer.pcCount} \u4e2a\u673a\u4f4d` : "\u653e\u7f6e\u529f\u80fd\u533a\uff0c\u540e\u7eed\u63a5\u4e8b\u4ef6";
    text(note, panel.x + 58, y + 38, 9, overLimit ? COLORS.red : "#5d4532");

    const button = { x: panel.x + panel.w - 52, y: y + 13, w: 34, h: 26, type: offer.type, pcCount: offer.pcCount };
    ui.rentAreaButtons.push(button);
    rect(button.x, button.y, button.w, button.h, canRent ? "#4e8f4f" : "#9a6b55");
    strokeRect(button.x, button.y, button.w, button.h, COLORS.line, 2);
    text("\u79df", button.x + button.w / 2, button.y + 6, 12, COLORS.text, "bold", "center");
  });

  ui.closeExpansionButton = { x: panel.x + panel.w - 50, y: panel.y + panel.h - 34, w: 38, h: 24 };
  drawPanelPager("expansion", panel, page, pageCount);
  rect(ui.closeExpansionButton.x, ui.closeExpansionButton.y, ui.closeExpansionButton.w, ui.closeExpansionButton.h, "#7f5635");
  strokeRect(ui.closeExpansionButton.x, ui.closeExpansionButton.y, ui.closeExpansionButton.w, ui.closeExpansionButton.h, COLORS.line, 2);
  text("\u5173\u95ed", ui.closeExpansionButton.x + ui.closeExpansionButton.w / 2, ui.closeExpansionButton.y + 4, 12, COLORS.text, "bold", "center");
}

function getExpansionOffers() {
  const offers = [];
  expansionTypes.forEach((type) => {
    type.pcOptions.forEach((pcCount) => {
      offers.push({ type, pcCount });
    });
  });
  return offers;
}

function getRentedAreaSummary() {
  const counts = {};
  state.rentedAreas.forEach((area) => {
    counts[area.name] = (counts[area.name] || 0) + 1;
  });

  return Object.keys(counts).map((name) => (
    counts[name] > 1 ? `${name}x${counts[name]}` : name
  )).join(" / ");
}

function drawExpansionIcon(type, x, y, dimmed) {
  const color = dimmed ? "#8c755f" : {
    multiRoom: COLORS.blue,
    doubleRoom: COLORS.green,
    singleRoom: COLORS.yellow,
    capsuleRoom: COLORS.red,
    showerRoom: "#88c7dc",
    chessRoom: "#8c4f35"
  }[type.id] || COLORS.counterEdge;

  rect(x - 14, y - 14, 28, 28, "#7b563b");
  strokeRect(x - 14, y - 14, 28, 28, COLORS.line, 2);
  rect(x - 9, y - 8, 18, 12, color);
  rect(x - 7, y + 6, 14, 4, "#3a2520");
  if (type.id === "showerRoom") {
    rect(x - 3, y - 11, 6, 7, "#dff7ff");
    rect(x - 8, y - 1, 16, 2, "#dff7ff");
  } else if (type.id === "chessRoom") {
    rect(x - 8, y - 5, 5, 5, COLORS.text);
    rect(x + 3, y, 5, 5, COLORS.line);
  }
}

function drawLayoutPanel() {
  if (!state.layoutOpen) return;

  ui.layoutModeButtons.length = 0;
  rect(0, 0, view.width, view.height, "rgba(20, 18, 16, 0.72)");

  const panel = {
    x: 22,
    y: HUD_HEIGHT + 34,
    w: view.width - 44,
    h: 276
  };

  rect(panel.x, panel.y, panel.w, panel.h, "#f0c98a");
  strokeRect(panel.x, panel.y, panel.w, panel.h, COLORS.wallDark, 4);
  rect(panel.x, panel.y, panel.w, 42, "#8c4f35");
  text("\u81ea\u5b9a\u4e49\u5e03\u5c40", panel.x + 16, panel.y + 11, 18, COLORS.text, "bold");

  rect(panel.x + 12, panel.y + 54, panel.w - 24, 42, "#e3b86f");
  const activeText = state.layoutToolActive ? getLayoutModeLabel(state.layoutMode) : "\u672a\u5f00\u542f";
  text(`\u5f53\u524d\uff1a${activeText}`, panel.x + 22, panel.y + 63, 13, "#5d4532", "bold");
  text("\u9009\u62e9\u6a21\u5f0f\u540e\u5728\u5730\u56fe\u4e0a\u70b9\u51fb\u64cd\u4f5c", panel.x + 22, panel.y + 80, 10, "#5d4532");

  const buttons = [
    {
      mode: "area",
      label: "\u91cd\u6446\u5305\u95f4",
      message: "\u5e03\u5c40\uff1a\u70b9\u5305\u95f4\u9009\u4e2d\uff0c\u518d\u70b9\u5176\u4ed6\u5899\u8fb9\u91cd\u65b0\u8d34\u653e\u3002"
    },
    {
      mode: "pc",
      label: "\u79fb\u52a8\u7535\u8111",
      message: "\u5e03\u5c40\uff1a\u70b9\u7535\u8111\u9009\u4e2d\uff0c\u518d\u5728\u6240\u5c5e\u533a\u57df\u5185\u70b9\u65b0\u4f4d\u7f6e\u3002"
    },
    {
      mode: "floor",
      label: "\u94fa\u516c\u533a\u5730\u7816",
      message: "\u5e03\u5c40\uff1a\u70b9\u5730\u56fe\u94fa\u516c\u533a\u5730\u7816\uff0c\u518d\u70b9\u540c\u4f4d\u7f6e\u53ef\u79fb\u9664\u3002"
    },
    {
      mode: "off",
      label: "\u9000\u51fa\u5e03\u5c40",
      message: "\u5df2\u9000\u51fa\u5e03\u5c40\u6a21\u5f0f\u3002"
    }
  ];

  buttons.forEach((button, index) => {
    const y = panel.y + 110 + index * 38;
    const rectButton = {
      x: panel.x + 18,
      y,
      w: panel.w - 36,
      h: 30,
      mode: button.mode,
      message: button.message
    };
    ui.layoutModeButtons.push(rectButton);
    const active = state.layoutToolActive && state.layoutMode === button.mode;
    drawWidePanelButton(rectButton, button.label, active ? "#4e8f4f" : "#7f5635");
  });

  ui.closeLayoutButton = { x: panel.x + panel.w - 66, y: panel.y + panel.h - 38, w: 48, h: 26 };
  drawWidePanelButton(ui.closeLayoutButton, "\u5173\u95ed", "#7f5635");
}

function getLayoutModeLabel(mode) {
  return {
    area: "\u91cd\u6446\u5305\u95f4",
    pc: "\u79fb\u52a8\u7535\u8111",
    floor: "\u94fa\u516c\u533a\u5730\u7816"
  }[mode] || "\u672a\u5f00\u542f";
}

function drawEquipmentPanel() {
  if (!state.equipmentOpen) return;

  ui.upgradeEquipmentButtons.length = 0;
  rect(0, 0, view.width, view.height, "rgba(20, 18, 16, 0.72)");

  const panel = {
    x: 18,
    y: HUD_HEIGHT + 8,
    w: view.width - 36,
    h: view.height - HUD_HEIGHT - 18
  };

  updateEquipmentLevel();
  const averageLevel = getAverageEquipmentLevel();
  const minimumLevel = getMinimumEquipmentLevel();
  rect(panel.x, panel.y, panel.w, panel.h, "#f0c98a");
  strokeRect(panel.x, panel.y, panel.w, panel.h, COLORS.wallDark, 4);
  rect(panel.x, panel.y, panel.w, 42, "#8c4f35");
  text("\u8bbe\u5907\u5347\u7ea7", panel.x + 16, panel.y + 11, 18, COLORS.text, "bold");
  text(`\u5e73\u5747 ${averageLevel.toFixed(1)}`, panel.x + panel.w - 92, panel.y + 14, 12, COLORS.text, "bold");

  rect(panel.x + 10, panel.y + 50, panel.w - 20, 42, "#e3b86f");
  text(`\u673a\u5668 ${layout.pcs.length} \u53f0 / \u5747\u6863 ${state.equipmentLevel} / \u6700\u4f4e L${minimumLevel}`, panel.x + 18, panel.y + 58, 12, "#5d4532", "bold");
  text("\u7f51\u5427\u7b49\u7ea7\u6309\u5e73\u5747\u8bbe\u5907\u8bc4\u4f30\uff0c\u5df2\u89e3\u9501\u4e0d\u56de\u9000", panel.x + 18, panel.y + 74, 11, "#5d4532");

  const startY = panel.y + 108;
  const cardH = 62;
  const tierOptions = equipmentTiers.slice(1);
  const pageSize = Math.max(1, Math.floor((panel.y + panel.h - 42 - startY) / (cardH + 8)));
  const pageCount = getPageCount(tierOptions.length, pageSize);
  const page = getPanelPage("equipment", pageCount);
  const visibleTiers = tierOptions.slice(page * pageSize, page * pageSize + pageSize);

  visibleTiers.forEach((tier, index) => {
    const y = startY + index * (cardH + 8);
    if (y + cardH > panel.y + panel.h - 42) return;

    const hasCandidate = layout.pcs.some((pc) => pc.equipmentLevel + 1 === tier.level);
    const allUpgraded = layout.pcs.every((pc) => pc.equipmentLevel >= tier.level);
    const affordable = state.cash >= tier.pricePerPc;

    rect(panel.x + 10, y, panel.w - 20, cardH, hasCandidate ? "#f7dba5" : "#c5a575");
    strokeRect(panel.x + 10, y, panel.w - 20, cardH, "#9a7043", 2);
    drawEquipmentIcon(panel.x + 30, y + 17, tier.level, allUpgraded);
    text(tier.name, panel.x + 68, y + 8, 15, COLORS.line, "bold");
    text(`\u5355\u53f0 ${tier.pricePerPc}`, panel.x + 68, y + 30, 11, "#5d4532", "bold");
    text(hasCandidate ? "\u53ef\u9009\u673a\u5668" : allUpgraded ? "\u5168\u90e8\u5df2\u8fbe\u6210" : "\u9700\u5148\u5347\u4e0a\u4e00\u6863", panel.x + 68, y + 45, 10, hasCandidate ? COLORS.green : "#745a46");

    const button = { x: panel.x + panel.w - 58, y: y + 16, w: 42, h: 26, tier };
    ui.upgradeEquipmentButtons.push(button);
    rect(button.x, button.y, button.w, button.h, hasCandidate && affordable ? "#4e8f4f" : "#9a6b55");
    strokeRect(button.x, button.y, button.w, button.h, COLORS.line, 2);
    text(allUpgraded ? "\u5df2" : "\u5347", button.x + button.w / 2, button.y + 5, 13, COLORS.text, "bold", "center");
  });

  if (!getPendingEquipmentTier()) {
    ui.closeEquipmentButton = { x: panel.x + panel.w - 50, y: panel.y + panel.h - 34, w: 38, h: 24 };
    drawPanelPager("equipment", panel, page, pageCount);
    rect(ui.closeEquipmentButton.x, ui.closeEquipmentButton.y, ui.closeEquipmentButton.w, ui.closeEquipmentButton.h, "#7f5635");
    strokeRect(ui.closeEquipmentButton.x, ui.closeEquipmentButton.y, ui.closeEquipmentButton.w, ui.closeEquipmentButton.h, COLORS.line, 2);
    text("\u5173\u95ed", ui.closeEquipmentButton.x + ui.closeEquipmentButton.w / 2, ui.closeEquipmentButton.y + 4, 12, COLORS.text, "bold", "center");
  }

  drawEquipmentPcSelection(panel);
}

function drawEquipmentPcSelection(panel) {
  const tier = getPendingEquipmentTier();
  if (!tier) return;

  ui.equipmentPcButtons.length = 0;
  rect(panel.x + 16, panel.y + 92, panel.w - 32, panel.h - 138, "rgba(77, 52, 35, 0.92)");
  strokeRect(panel.x + 16, panel.y + 92, panel.w - 32, panel.h - 138, COLORS.line, 3);
  text(`\u9009\u62e9\u8981\u5347\u7ea7\u5230 ${tier.name} \u7684\u673a\u5668`, panel.x + panel.w / 2, panel.y + 104, 14, COLORS.text, "bold", "center");
  text(`\u5355\u53f0\u8d39\u7528 ${tier.pricePerPc}`, panel.x + panel.w / 2, panel.y + 125, 12, COLORS.text, "bold", "center");

  const cols = 2;
  const cardW = (panel.w - 56) / cols;
  const startY = panel.y + 152;
  const rows = Math.max(1, Math.floor((panel.y + panel.h - 92 - startY) / 58));
  const pageSize = rows * cols;
  const pageCount = getPageCount(layout.pcs.length, pageSize);
  const page = getPanelPage("equipmentPc", pageCount);
  const visiblePcs = layout.pcs.slice(page * pageSize, page * pageSize + pageSize);

  visiblePcs.forEach((pc, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = panel.x + 28 + col * (cardW + 8);
    const y = startY + row * 58;
    const currentTier = getEquipmentTier(pc.equipmentLevel);
    const canUpgrade = pc.equipmentLevel + 1 === tier.level && state.cash >= tier.pricePerPc;

    rect(x, y, cardW, 48, canUpgrade ? "#f7dba5" : "#c5a575");
    strokeRect(x, y, cardW, 48, "#9a7043", 2);
    text(`${pc.id + 1} \u53f7\u673a`, x + 10, y + 7, 13, COLORS.line, "bold");
    text(currentTier.name, x + 10, y + 26, 10, "#5d4532", "bold");

    const button = { x: x + cardW - 42, y: y + 10, w: 32, h: 26, pc };
    ui.equipmentPcButtons.push(button);
    rect(button.x, button.y, button.w, button.h, canUpgrade ? "#4e8f4f" : "#9a6b55");
    strokeRect(button.x, button.y, button.w, button.h, COLORS.line, 2);
    text("\u5347", button.x + button.w / 2, button.y + 6, 12, COLORS.text, "bold", "center");
  });

  drawPanelPager("equipmentPc", { x: panel.x + 16, y: panel.y + 92, w: panel.w - 32, h: panel.h - 138 }, page, pageCount);

  ui.cancelEquipmentSelectionButton = { x: panel.x + panel.w - 66, y: panel.y + panel.h - 68, w: 48, h: 24 };
  rect(ui.cancelEquipmentSelectionButton.x, ui.cancelEquipmentSelectionButton.y, ui.cancelEquipmentSelectionButton.w, ui.cancelEquipmentSelectionButton.h, "#7f5635");
  strokeRect(ui.cancelEquipmentSelectionButton.x, ui.cancelEquipmentSelectionButton.y, ui.cancelEquipmentSelectionButton.w, ui.cancelEquipmentSelectionButton.h, COLORS.line, 2);
  text("\u8fd4\u56de", ui.cancelEquipmentSelectionButton.x + ui.cancelEquipmentSelectionButton.w / 2, ui.cancelEquipmentSelectionButton.y + 4, 12, COLORS.text, "bold", "center");
}

function drawEquipmentIcon(x, y, level, dimmed) {
  const glow = dimmed ? "#7b8c76" : COLORS.pcGlow;
  rect(x - 13, y - 8, 28, 20, "#17222a");
  strokeRect(x - 13, y - 8, 28, 20, COLORS.line, 2);
  rect(x - 9, y - 4, 20, 11, glow);
  rect(x - 2, y + 12, 8, 7, "#2d2522");
  text(`L${level}`, x + 1, y + 21, 10, COLORS.line, "bold", "center");
}

function drawSettingsPanel() {
  if (!state.settingsOpen) return;

  rect(0, 0, view.width, view.height, "rgba(20, 18, 16, 0.72)");

  const panel = {
    x: 22,
    y: HUD_HEIGHT + 34,
    w: view.width - 44,
    h: 330
  };

  rect(panel.x, panel.y, panel.w, panel.h, "#f0c98a");
  strokeRect(panel.x, panel.y, panel.w, panel.h, COLORS.wallDark, 4);
  rect(panel.x, panel.y, panel.w, 42, "#8c4f35");
  text("\u8bbe\u7f6e", panel.x + 16, panel.y + 11, 18, COLORS.text, "bold");

  const modeLabel = state.testMode ? "\u6d4b\u8bd5\u6a21\u5f0f" : "\u672c\u5730\u5b58\u6863";
  const modeDesc = state.testMode
    ? "\u5237\u65b0\u540e\u91cd\u7f6e\uff0c\u9002\u5408\u8c03\u6570\u503c\u3002"
    : "\u81ea\u52a8\u4fdd\u5b58\uff0c\u5237\u65b0\u540e\u7ee7\u7eed\u7ecf\u8425\u3002";

  rect(panel.x + 12, panel.y + 56, panel.w - 24, 70, "#f7dba5");
  strokeRect(panel.x + 12, panel.y + 56, panel.w - 24, 70, "#9a7043", 2);
  text(`\u5f53\u524d\uff1a${modeLabel}`, panel.x + 24, panel.y + 66, 15, COLORS.line, "bold");
  text(modeDesc, panel.x + 24, panel.y + 93, 11, "#5d4532", "bold");

  ui.toggleTestModeButton = { x: panel.x + 18, y: panel.y + 146, w: panel.w - 36, h: 34 };
  ui.pricingButton = { x: panel.x + 18, y: panel.y + 188, w: panel.w - 36, h: 34 };
  ui.saveGameButton = { x: panel.x + 18, y: panel.y + 230, w: panel.w - 36, h: 34 };
  ui.clearSaveButton = { x: panel.x + 18, y: panel.y + 276, w: panel.w - 94, h: 30 };
  ui.closeSettingsButton = { x: panel.x + panel.w - 66, y: panel.y + 276, w: 48, h: 30 };

  drawWidePanelButton(
    ui.toggleTestModeButton,
    state.testMode ? "\u5173\u95ed\u6d4b\u8bd5\u6a21\u5f0f" : "\u5f00\u542f\u6d4b\u8bd5\u6a21\u5f0f",
    state.testMode ? COLORS.green : "#9a6b55"
  );
  drawWidePanelButton(ui.pricingButton, "\u533a\u57df\u8ba1\u8d39", "#4e8f4f");
  drawWidePanelButton(ui.saveGameButton, "\u624b\u52a8\u4fdd\u5b58", state.testMode ? "#9a6b55" : "#4e8f4f");
  drawWidePanelButton(ui.clearSaveButton, "\u5220\u9664\u5b58\u6863", "#9a6b55");
  drawWidePanelButton(ui.closeSettingsButton, "\u5173\u95ed", "#7f5635");
}

function getPricingAreas() {
  return state.rentedAreas.filter((area) => area.pcCount > 0);
}

function getAreaPcSummary(area) {
  const pcs = layout.pcs.filter((pc) => pc.areaId === area.id);
  if (pcs.length === 0) return "\u65e0\u8bbe\u5907";
  const minLevel = pcs.reduce((min, pc) => Math.min(min, pc.equipmentLevel), pcs[0].equipmentLevel);
  const maxLevel = pcs.reduce((max, pc) => Math.max(max, pc.equipmentLevel), pcs[0].equipmentLevel);
  return minLevel === maxLevel ? `L${minLevel}` : `L${minLevel}-L${maxLevel}`;
}

function drawPricingPanel() {
  if (!state.pricingOpen) return;

  rect(0, 0, view.width, view.height, "rgba(20, 18, 16, 0.72)");

  const panel = {
    x: 18,
    y: HUD_HEIGHT + 26,
    w: view.width - 36,
    h: Math.min(view.height - HUD_HEIGHT - ACTION_BAR_HEIGHT - 42, 420)
  };

  rect(panel.x, panel.y, panel.w, panel.h, "#f0c98a");
  strokeRect(panel.x, panel.y, panel.w, panel.h, COLORS.wallDark, 4);
  rect(panel.x, panel.y, panel.w, 42, "#8c4f35");
  text("\u533a\u57df\u8ba1\u8d39", panel.x + 16, panel.y + 11, 18, COLORS.text, "bold");
  text("\u4ef7\u683c\u4f1a\u5f71\u54cd\u987e\u5ba2\u662f\u5426\u5165\u5ea7", panel.x + 16, panel.y + 52, 11, "#5d4532", "bold");

  ui.priceButtons = [];
  const areas = getPricingAreas().slice(0, 6);
  const rowH = 48;
  areas.forEach((area, index) => {
    const rowY = panel.y + 76 + index * rowH;
    rect(panel.x + 12, rowY, panel.w - 24, 40, "#f7dba5");
    strokeRect(panel.x + 12, rowY, panel.w - 24, 40, "#9a7043", 2);
    text(area.name, panel.x + 24, rowY + 7, 13, COLORS.line, "bold");
    text(`${area.pcCount} \u53f0 / ${getAreaPcSummary(area)} / ${getAreaHourlyRate(area.id)}\u5143/\u5c0f\u65f6`, panel.x + 24, rowY + 25, 10, "#5d4532", "bold");

    const minusButton = { x: panel.x + panel.w - 94, y: rowY + 7, w: 30, h: 26, area, delta: -1 };
    const plusButton = { x: panel.x + panel.w - 54, y: rowY + 7, w: 30, h: 26, area, delta: 1 };
    ui.priceButtons.push(minusButton, plusButton);
    rect(minusButton.x, minusButton.y, minusButton.w, minusButton.h, "#9a6b55");
    strokeRect(minusButton.x, minusButton.y, minusButton.w, minusButton.h, COLORS.line, 2);
    text("-", minusButton.x + minusButton.w / 2, minusButton.y + 5, 15, COLORS.text, "bold", "center");
    rect(plusButton.x, plusButton.y, plusButton.w, plusButton.h, "#4e8f4f");
    strokeRect(plusButton.x, plusButton.y, plusButton.w, plusButton.h, COLORS.line, 2);
    text("+", plusButton.x + plusButton.w / 2, plusButton.y + 5, 15, COLORS.text, "bold", "center");
  });

  if (getPricingAreas().length > areas.length) {
    text("\u66f4\u591a\u533a\u57df\u5f85\u63a5\u5165\u6eda\u52a8\u9762\u677f", panel.x + 16, panel.y + panel.h - 72, 11, "#5d4532", "bold");
  }

  ui.closePricingButton = { x: panel.x + panel.w - 70, y: panel.y + panel.h - 42, w: 52, h: 28 };
  drawWidePanelButton(ui.closePricingButton, "\u5173\u95ed", "#7f5635");
}

function drawWidePanelButton(button, label, color) {
  rect(button.x, button.y, button.w, button.h, color);
  strokeRect(button.x, button.y, button.w, button.h, COLORS.line, 2);
  text(label, button.x + button.w / 2, button.y + 8, 13, COLORS.text, "bold", "center");
}

function drawConfirmDialog() {
  if (!state.confirmDialog) return;

  rect(0, 0, view.width, view.height, "rgba(20, 18, 16, 0.62)");
  const panel = {
    x: 34,
    y: Math.max(HUD_HEIGHT + 80, view.height / 2 - 86),
    w: view.width - 68,
    h: 166
  };

  rect(panel.x, panel.y, panel.w, panel.h, "#f0c98a");
  strokeRect(panel.x, panel.y, panel.w, panel.h, COLORS.wallDark, 4);
  rect(panel.x, panel.y, panel.w, 38, "#8c4f35");
  text(state.confirmDialog.title, panel.x + panel.w / 2, panel.y + 10, 16, COLORS.text, "bold", "center");
  drawWrappedText(state.confirmDialog.body, panel.x + 18, panel.y + 55, panel.w - 36, 14, COLORS.line, "bold", 21);

  ui.confirmNoButton = { x: panel.x + 22, y: panel.y + panel.h - 48, w: 78, h: 30 };
  ui.confirmYesButton = { x: panel.x + panel.w - 100, y: panel.y + panel.h - 48, w: 78, h: 30 };
  drawWidePanelButton(ui.confirmNoButton, "\u53d6\u6d88", "#9a6b55");
  drawWidePanelButton(ui.confirmYesButton, "\u786e\u5b9a", "#4e8f4f");
}

function drawWrappedText(value, x, y, maxW, size, color, weight = "normal", lineH = 18) {
  const textValue = String(value);
  let line = "";
  let lineIndex = 0;
  ctx.font = `${weight} ${size}px sans-serif`;
  for (let index = 0; index < textValue.length; index += 1) {
    const next = line + textValue[index];
    if (ctx.measureText(next).width > maxW && line) {
      text(line, x, y + lineIndex * lineH, size, color, weight);
      line = textValue[index];
      lineIndex += 1;
    } else {
      line = next;
    }
  }
  if (line) {
    text(line, x, y + lineIndex * lineH, size, color, weight);
  }
}

function fitTextToWidth(value, maxW, size, weight = "normal") {
  let result = String(value);
  ctx.font = `${weight} ${size}px sans-serif`;
  while (result.length > 1 && ctx.measureText(`${result}...`).width > maxW) {
    result = result.slice(0, -1);
  }
  return result.length < String(value).length ? `${result}...` : result;
}

function drawStaffIcon(staff, x, y, locked) {
  const shirt = locked ? "#8c755f" : {
    cashier: COLORS.blue,
    floor: COLORS.green,
    cleaner: "#9dd3df",
    manager: COLORS.yellow,
    companion: COLORS.red
  }[staff.id];
  const hat = locked ? "#6b6258" : getWorkerHatColor(staff.id);

  rect(x - 10, y - 18, 20, 32, "#7b563b");
  strokeRect(x - 10, y - 18, 20, 32, COLORS.line, 2);
  rect(x - 7, y - 20, 14, 5, hat);
  rect(x - 5, y - 24, 10, 5, hat);
  rect(x - 5, y - 12, 10, 8, "#f3c596");
  rect(x - 7, y - 4, 14, 13, shirt);
  rect(x - 6, y - 3, 12, 11, "#1f1b18");
  rect(x - 5, y - 1, 10, 3, COLORS.yellow);
  rect(x - 7, y + 8, 5, 6, "#273444");
  rect(x + 2, y + 8, 5, 6, "#273444");
}

function getWorkerHatColor(type) {
  return {
    cashier: COLORS.blue,
    floor: COLORS.green,
    cleaner: "#f2f2f2",
    manager: COLORS.yellow,
    companion: COLORS.red
  }[type] || COLORS.counterEdge;
}

function drawWorker(worker) {
  const x = Math.round(worker.x);
  const y = Math.round(worker.y);
  const hat = getWorkerHatColor(worker.type);
  const workerAsset = worker.type === "cashier" ? "cashier" : worker.type === "cleaner" ? "cleaner" : "";
  if (workerAsset && drawAsset(workerAsset, x - 16, y - 58, worker.type === "cleaner" ? 28 : 27, worker.type === "cleaner" ? 50 : 49)) {
    const label = getWorkerLabel(worker.type);
    const bubbleW = Math.max(32, label.length * 13 + 8);
    roundedRect(x - bubbleW / 2, y - 72, bubbleW, 17, 5, "#fff7dd");
    strokeRoundedRect(x - bubbleW / 2, y - 72, bubbleW, 17, 5, "rgba(25, 36, 43, 0.28)", 1);
    text(label, x, y - 70, 10, COLORS.line, "bold", "center");
    return;
  }

  ellipse(x, y + 8, 13, 5, "rgba(18, 30, 36, 0.2)");
  circle(x, y - 15, 7, "#f3c596");
  roundedRect(x - 8, y - 24, 16, 6, 4, hat);
  roundedRect(x - 5, y - 29, 10, 6, 3, hat);
  roundedRect(x - 9, y - 8, 18, 17, 7, "#203544");
  roundedRect(x - 8, y - 5, 16, 4, 2, COLORS.yellow);
  roundedRect(x - 3, y - 8, 6, 17, 3, COLORS.yellow);
  roundedRect(x - 11, y - 5, 4, 12, 3, "#f3c596");
  roundedRect(x + 7, y - 5, 4, 12, 3, "#f3c596");
  roundedRect(x - 7, y + 6, 6, 10, 3, "#24384a");
  roundedRect(x + 1, y + 6, 6, 10, 3, "#24384a");

  const label = getWorkerLabel(worker.type);
  const bubbleW = Math.max(32, label.length * 13 + 8);
  rect(x - bubbleW / 2 - 1, y - 43, bubbleW + 2, 19, COLORS.line);
  rect(x - bubbleW / 2, y - 42, bubbleW, 17, "#fff7dd");
  text(label, x, y - 40, 10, COLORS.line, "bold", "center");
}

function drawLegend() {
  text("入口", layout.room.x + 8, layout.entrance.y - 46, 11, COLORS.red, "bold");
  text(`\u5ba2\u5385\u8d77\u6b65 / \u5df2\u5f00 ${layout.pcs.length} \u53f0\u673a`, layout.room.x + layout.room.w / 2, layout.room.y + layout.room.h - 24, 11, COLORS.dimText, "bold", "center");
}

function drawIndoorDetailsModern() {
  const room = layout.room;
  rect(room.x + 20, room.y + 12, 58, 26, COLORS.line);
  rect(room.x + 22, room.y + 14, 54, 22, "#2f5968");
  text("\u9ed1\u7f51\u5427", room.x + 49, room.y + 18, 12, COLORS.text, "bold", "center");

  if (!drawAsset("plant", room.x + room.w - 78, room.y + room.h - 90, 58, 78)) {
    roundedRect(room.x + room.w - 54, room.y + room.h - 54, 24, 32, 4, "#8a6a45");
    roundedRect(room.x + room.w - 49, room.y + room.h - 66, 16, 18, 8, COLORS.plant);
    roundedRect(room.x + room.w - 59, room.y + room.h - 58, 16, 13, 7, COLORS.plant);
    roundedRect(room.x + room.w - 39, room.y + room.h - 58, 16, 13, 7, COLORS.plant);
  }
}

function render() {
  ctx.clearRect(0, 0, view.width, view.height);
  ui.pageButtons.length = 0;
  beginWorldDraw();
  drawPixelFloor();
  drawCounter();
  layout.pcs.forEach(drawPc);
  drawLegend();
  state.workers.forEach(drawWorker);
  state.guests.forEach(drawGuest);
  endWorldDraw();
  drawHud();
  drawActionBar();
  drawProcurementPanel();
  drawWarehousePanel();
  drawHiringPanel();
  drawExpansionPanel();
  drawLayoutPanel();
  drawEquipmentPanel();
  drawSettingsPanel();
  drawPricingPanel();
  drawConfirmDialog();
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

loadAssets();
restoreGame();

try {
  wx.onTouchStart(handleTouchStartEvent);
  wx.onTouchMove(handleTouchMoveEvent);
  wx.onTouchEnd(handleTouchEndEvent);
  wx.onTouchCancel(handleTouchEndEvent);

  loop();
} catch (error) {
  drawFatalError(error);
  throw error;
}

