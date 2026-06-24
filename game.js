let screenCanvas = (typeof canvas !== "undefined" && canvas) ? canvas : wx.createCanvas();

const ctx = screenCanvas.getContext("2d");
const systemInfo = wx.getSystemInfoSync();
const dpr = systemInfo.pixelRatio || 1;
const view = {
  width: systemInfo.windowWidth || 375,
  height: systemInfo.windowHeight || 667
};
const SAFE_TOP = Math.max(systemInfo.statusBarHeight || 0, 34);
const HUD_HEIGHT = SAFE_TOP + 126;
const MESSAGE_BAR_HEIGHT = 58;
const ACTION_BAR_HEIGHT = 104;
const STORAGE_KEY = "wangbaTycoonSaveV1";
const TEST_MODE_KEY = "wangbaTycoonTestMode";
const AUDIO_SETTINGS_KEY = "wangbaTycoonAudioSettings";
const AUDIO_SOURCES = {
  bgm: "audio/bgm.wav",
  click: "audio/click.wav"
};
const CODE_DRAWN_VISUALS_ONLY = true;
const GAME_VERSION = "Beta06250101Ds";
const SEAT_LAYOUT_VERSION = {
  stage: "Bate",
  modifiedAt: "2026-06-24 14:02",
  code: "06241402"
};
const PLAY_PROGRESS_COLOR = "#e83f3f";
const STUCK_REROUTE_SECONDS = 0.65;
const PERSON_PATH_MIN_WIDTH = 24;
const NAV_GRID_SIZE = 12;
const SOFT_MOVEMENT_COLLISION_SCALE = 2 / 3;
const PERSON_VISUAL_SCALE = 2 / 3;
const PC_AUTO_ALIGN_DISTANCE = 18;
const MANUAL_CHECKIN_DURATION = 1.25;
const DEMAND_WAIT_SECONDS = 60;
const BASE_OPERATIONAL_PCS = 4;
const MAX_OPERATIONAL_PCS = 96;
const WORLD_EXPANSION_MARGIN = 620;
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
const PUBLIC_FLOOR_SIZE = 60;
const PUBLIC_FLOOR_HALF = PUBLIC_FLOOR_SIZE / 2;
const PUBLIC_FLOOR_ATTACH_DISTANCE = 88;
const PUBLIC_FLOOR_COST = 120;
const SAVE_INTERVAL = 20;
const GAME_DAY_SECONDS = 360;
const GAME_MONTH_DAYS = 30;
const DAMAGE_THRESHOLD_SESSIONS = 30;
const DAMAGE_CHANCE_AFTER_THRESHOLD = 0.28;
const NEW_PC_BASE_COST = 1200;
const MAHJONG_TABLE_COST = 6800;
const MAHJONG_TABLE_SIZE = { w: 58, h: 46 };
const {
  COLORS,
  SPRITE_SCALE,
  assetSources,
  products,
  staffTypes,
  equipmentTiers,
  expansionTypes,
  partitionTypes,
  demandProductIds,
  guestTypes
} = require("./src/config");

const assets = {};

const layout = createLayout();
const state = {
  cash: 1000000,
  cafeLevel: 1,
  equipmentLevel: 1,
  cleanliness: 100,
  satisfaction: 100,
  served: 0,
  lost: 0,
  time: 0,
  lastPayrollMonth: 0,
  nextGuestAt: 5,
  guestId: 1,
  guests: [],
  frontDesk: {
    busyGuestId: null,
    timer: 0,
    duration: 1.15,
    manual: false,
    reservedPcId: null
  },
  toilet: {
    dirty: false,
    useCount: 0,
    busyGuestId: null,
    cleanWorkerId: null
  },
  floorCleaningWorkerId: null,
  procurementOpen: false,
  warehouseOpen: false,
  hiringOpen: false,
  equipmentOpen: false,
  expansionOpen: false,
  layoutOpen: false,
  ledgerOpen: false,
  pricingOpen: false,
  settingsOpen: false,
  audio: loadAudioSettings(),
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
  pendingPartitionTypeId: null,
  pendingPartitionOrientation: "horizontal",
  pendingPcPurchase: null,
  pendingMahjongPurchase: false,
  pendingEquipmentTierLevel: null,
  confirmDialog: null,
  pcActionMenu: null,
  partitionActionMenu: null,
  propActionMenu: null,
  pcUpgradeMenu: null,
  pcInfoBubble: null,
  doorTimers: {},
  purchaseQuantities: {},
  layoutToolActive: false,
  layoutMode: "area",
  selectedAreaId: null,
  selectedPcId: null,
  selectedPartitionId: null,
  selectedPropId: null,
  invalidFloorHint: null,
  camera: {
    x: WORLD_LEFT_MARGIN,
    y: WORLD_TOP_MARGIN
  },
  nextAreaId: 2,
  rentedAreas: [
    { id: 1, typeId: "livingRoom", name: "\u5ba2\u5385\u533a\u57df", pcCount: 4, pcCapacity: 8, hourlyRate: 5, x: 18, y: 0, w: 0, h: 0 }
  ],
  employees: {
    cashier: 0,
    floor: 0,
    cleaner: 0,
    repairman: 0,
    manager: 0,
    companion: 0
  },
  workerId: 1,
  workers: [],
  mahjongTables: [],
  publicFloors: [],
  purchasedFloorTileCount: 0,
  floorLayoutSession: null,
  partitions: [],
  propPositions: {},
  inventory: {},
  monthlyLedger: {
    monthIndex: 0,
    internet: 0,
    companion: 0,
    products: {},
    total: 0
  },
  message: "客人进门、前台开机、上机读条、下机结账。",
  businessOpen: true,
  messageTimer: 5
};
state.rentedAreas[0].x = layout.room.x;
state.rentedAreas[0].y = layout.room.y;
state.rentedAreas[0].w = layout.room.w;
state.rentedAreas[0].h = layout.room.h;

const guestPalettes = [
  { shirt: "#e84f4a", accent: "#ffd166", pants: "#24445c", hair: "#1f1511", skin: "#f3c596" },
  { shirt: "#2f9ed8", accent: "#fff2d0", pants: "#25364f", hair: "#231711", skin: "#f1bf91" },
  { shirt: "#52b94f", accent: "#dff7a8", pants: "#2d4056", hair: "#2d1b12", skin: "#eeb98b" },
  { shirt: "#ef8b2d", accent: "#fff2d0", pants: "#2a3750", hair: "#1f1511", skin: "#f0c090" },
  { shirt: "#b85be8", accent: "#ffd7f1", pants: "#29304d", hair: "#25151f", skin: "#f4c49c" },
  { shirt: "#29b8a7", accent: "#fff2d0", pants: "#24384a", hair: "#1b1b16", skin: "#eab88c" },
  { shirt: "#f0b94a", accent: "#c85a43", pants: "#2f4156", hair: "#302017", skin: "#f1bd8d" },
  { shirt: "#e66b9a", accent: "#fff2d0", pants: "#2b4054", hair: "#442316", skin: "#f0c49a" }
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
  closeLedgerButton: null,
  closeExpansionButton: null,
  closeLayoutButton: null,
  cancelMoveButton: null,
  layoutModeButtons: [],
  closeEquipmentButton: null,
  cancelEquipmentSelectionButton: null,
  closeSettingsButton: null,
  toggleTestModeButton: null,
  toggleMusicButton: null,
  toggleSfxButton: null,
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
  purchasePcButtons: [],
  purchaseMahjongButton: null,
  equipmentPcButtons: [],
  pcActionButtons: [],
  partitionActionButtons: [],
  propActionButtons: [],
  rotatePartitionButton: null,
  pcUpgradeButtons: [],
  pcInfoBubbleButton: null,
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
  invalidateMovablePropDefsCache();
  const roomY = HUD_HEIGHT + WORLD_TOP_MARGIN + 18;
  const roomW = Math.max(360, ceilToMultiple(view.width - 36, PUBLIC_FLOOR_SIZE));
  const targetRoomH = Math.max(420, Math.min(view.height - roomY - ACTION_BAR_HEIGHT - 48, view.width * 1.28));
  const room = {
    x: WORLD_LEFT_MARGIN + 18,
    y: roomY,
    w: roomW,
    h: ceilToMultiple(targetRoomH, PUBLIC_FLOOR_SIZE)
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

  const entranceCorridor = {
    id: "entranceCorridor",
    x: room.x - 96,
    y: entrance.y - 58,
    w: 92,
    h: 116
  };

  const queue = [
    { x: counter.x - 12, y: counter.y + counter.h + 26 },
    { x: counter.x - 40, y: counter.y + counter.h + 26 },
    { x: counter.x - 68, y: counter.y + counter.h + 26 }
  ];

  const pcTop = counter.y + 126;
  const pcGapX = room.w * 0.24;
  const pcGapY = 116;
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
    // Keep manager inside the counter and repairman beside the left edge so labels do not overlap.
    manager: { x: counter.x + 14, y: counter.y + 20 },
    repairman: { x: counter.x - 26, y: counter.y + 46 },
    companion: { x: room.x + room.w - 70, y: room.y + 90 }
  };

  return { room, counter, entrance, entranceCorridor, queue, pcs, toilet, staffHome };
}

function createPc(id, x, y, areaId = 1, areaName = "\u5ba2\u5385") {
  const pc = {
    id,
    x,
    y,
    w: 42,
    h: 36,
    seatX: x + 21,
    seatY: getPcSeatY(y),
    areaId,
    areaName,
    rotation: 0,
    occupiedBy: null,
    equipmentLevel: 1,
    sessionsServed: 0,
    broken: false,
    dirty: false
  };
  updatePcSeat(pc);
  return pc;
}

function getPcSeatY(pcY) {
  return pcY + 58;
}

function getNormalizedRotation(pc) {
  return 0;
}

function updatePcSeat(pc) {
  const rotation = getNormalizedRotation(pc);
  if (rotation === 90) {
    pc.seatX = pc.x - 16;
    pc.seatY = pc.y + pc.h / 2 + 16;
  } else if (rotation === 180) {
    pc.seatX = pc.x + pc.w / 2;
    pc.seatY = pc.y - 16;
  } else if (rotation === 270) {
    pc.seatX = pc.x + pc.w + 16;
    pc.seatY = pc.y + pc.h / 2 + 16;
  } else {
    pc.seatX = pc.x + pc.w / 2;
    pc.seatY = getPcSeatY(pc.y);
  }
}

function getExpansionType(typeId) {
  return expansionTypes.find((type) => type.id === typeId);
}

function getAreaRentCost(type, pcCount) {
  if (type.costByPcCount && Number.isFinite(type.costByPcCount[pcCount])) {
    return type.costByPcCount[pcCount];
  }
  return type.baseCost + type.pricePerPc * pcCount;
}

function getCafeLevelRequirement(level) {
  return Math.max(1, level) * 10;
}

function getCafeLevelForServed(served) {
  let level = 1;
  let remaining = Math.max(0, Math.floor(served || 0));
  while (remaining >= getCafeLevelRequirement(level) && level < 99) {
    remaining -= getCafeLevelRequirement(level);
    level += 1;
  }
  return level;
}

function getCafeLevelProgress() {
  let used = 0;
  for (let level = 1; level < state.cafeLevel; level += 1) {
    used += getCafeLevelRequirement(level);
  }
  const current = Math.max(0, state.served - used);
  const required = getCafeLevelRequirement(state.cafeLevel);
  return {
    current: Math.min(current, required),
    required
  };
}

function getMaxOperationalPcs() {
  const dynamicLimit = BASE_OPERATIONAL_PCS + state.cafeLevel * (state.cafeLevel - 1);
  return Math.min(MAX_OPERATIONAL_PCS, dynamicLimit);
}

function getAreaCapacity(area) {
  if (!area) return 0;
  if (area.typeId === "livingRoom") return Math.max(getMaxOperationalPcs(), area.pcCount || 0);
  const type = getExpansionType(area.typeId);
  if (Number.isFinite(area.pcCapacity)) return area.pcCapacity;
  const maxOption = type && Array.isArray(type.pcOptions) ? Math.max(...type.pcOptions) : 0;
  return Math.max(area.pcCount || 0, Number.isFinite(maxOption) ? maxOption : 0);
}

function getNewPcCost(tierLevel = 1) {
  return equipmentTiers
    .filter((tier) => tier.level > 1 && tier.level <= tierLevel)
    .reduce((total, tier) => total + tier.pricePerPc, NEW_PC_BASE_COST);
}

function getEquipmentHourlyRate(level) {
  const tier = getEquipmentTier(level);
  return tier && Number.isFinite(tier.hourlyRate) ? tier.hourlyRate : 5;
}

function getPartitionType(typeId) {
  return partitionTypes.find((type) => type.id === typeId);
}

function getPartitionCost(type) {
  return type ? type.cost : 0;
}

function getAreaSize(type, pcCount) {
  if (type.id === "multiRoom") {
    if (pcCount >= 8) return { w: 430, h: 260 };
    if (pcCount >= 6) return { w: 360, h: 250 };
    return { w: 300, h: 220 };
  }
  if (type.id === "doubleRoom") return { w: 210, h: 160 };
  if (type.id === "singleRoom") return { w: 150, h: 148 };
  if (type.id === "capsuleRoom") return { w: 170, h: 156 };
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
  const pc = layout.pcs.find((item) => item.areaId === areaId);
  return pc ? getPcHourlyRate(pc) : getEquipmentHourlyRate(1);
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
  const matchingPcCount = layout.pcs.filter((pc) => pc.equipmentLevel >= guestType.minEquipmentLevel).length;
  return matchingPcCount > 0 ? guestType.weight + matchingPcCount * 0.18 : guestType.weight * 0.25;
}

function pcMatchesGuest(pc, guestType) {
  const area = getAreaById(pc.areaId);
  if (!area) return false;
  if (pc.occupiedBy || pc.dirty || pc.broken) return false;
  if (pc.equipmentLevel < guestType.minEquipmentLevel) return false;
  if (getPcHourlyRate(pc) > guestType.maxRate) return false;
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
  return state.cafeLevel >= getExpansionUnlockLevel(type) && state.cash >= getAreaRentCost(type, pcCount);
}

function getExpansionUnlockLevel(type) {
  return Number.isFinite(type.unlockLevel) ? type.unlockLevel : 1;
}

function rentArea(type, pcCount) {
  const cost = getAreaRentCost(type, pcCount);
  const unlockLevel = getExpansionUnlockLevel(type);
  if (state.cafeLevel < unlockLevel) {
    say(`${type.name} \u9700\u8981\u7f51\u5427 Lv.${unlockLevel} \u624d\u80fd\u6269\u79df\u3002`);
    return;
  }
  if (state.cash < cost) {
    say(`\u73b0\u91d1\u4e0d\u8db3\uff0c\u6269\u79df ${type.name} \u9700\u8981 ${cost} \u5143\u3002`);
    return;
  }

  state.pendingExpansion = {
    typeId: type.id,
    pcCapacity: pcCount,
    cost
  };
  state.expansionOpen = false;
  say(`\u5df2\u9009\u62e9 ${type.name}${pcCount ? ` ${pcCount}\u4eba\u5bb9\u91cf` : ""}\uff0c\u56de\u5230\u5730\u56fe\u70b9\u51fb\u8d34\u5899\u653e\u7f6e\u3002`);
}

function getPendingExpansionType() {
  return state.pendingExpansion && getExpansionType(state.pendingExpansion.typeId);
}

function placePendingExpansion(worldX, worldY) {
  const pending = state.pendingExpansion;
  const type = getPendingExpansionType();
  if (!pending || !type) return false;

  if (state.cash < pending.cost) {
    say(`\u73b0\u91d1\u4e0d\u8db3\uff0c\u6269\u79df ${type.name} \u9700\u8981 ${pending.cost} \u5143\u3002`);
    state.pendingExpansion = null;
    return true;
  }

  const size = getAreaSize(type, pending.pcCapacity);
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
    pcCount: 0,
    pcCapacity: pending.pcCapacity
  });
  area.hourlyRate = getDefaultAreaRate(area.typeId);
  state.rentedAreas.push(area);
  state.pendingExpansion = null;
  updateEquipmentLevel();
  updateCafeLevel();
  markSaveDirty();
  say(`\u5df2\u653e\u7f6e\u7a7a\u7684 ${type.name}${pending.pcCapacity ? `\uff0c\u53ef\u653e ${pending.pcCapacity} \u53f0\u7535\u8111` : ""}\u3002`);
  return true;
}

function snapToGrid(value) {
  return Math.round(value / 24) * 24;
}

function ceilToMultiple(value, multiple) {
  return Math.ceil(value / multiple) * multiple;
}

function snapToHostTile(value, hostStart, min, max, size = PUBLIC_FLOOR_SIZE) {
  const snapped = hostStart + Math.round((value - hostStart) / size) * size;
  return clamp(snapped, min, max);
}

function snapToRoomTile(value, axis) {
  const origin = axis === "x" ? layout.room.x : layout.room.y;
  return origin + Math.round((value - origin) / PUBLIC_FLOOR_SIZE) * PUBLIC_FLOOR_SIZE;
}

function snapPcPosition(value) {
  return Math.round(value / 12) * 12;
}

function clampAreaToWorld(area) {
  const bounds = getExpandedWorldBounds();
  area.x = Math.max(bounds.minX, Math.min(bounds.maxX - area.w, area.x));
  area.y = Math.max(bounds.minY, Math.min(bounds.maxY - area.h, area.y));
}

function getWorldBoundItems() {
  const items = [layout.room, layout.toilet, layout.entranceCorridor]
    .concat(state ? state.rentedAreas : [])
    .concat(state ? state.publicFloors : [])
    .concat(state ? state.partitions : [])
    .concat(state ? state.mahjongTables : [])
    .concat(layout.pcs.map((pc) => getPcVisualBounds(pc)));
  return items.filter((item) => item && Number.isFinite(item.x) && Number.isFinite(item.y));
}

function getExpandedWorldBounds() {
  const items = getWorldBoundItems();
  const minX = Math.min(0, ...items.map((item) => item.x)) - WORLD_EXPANSION_MARGIN;
  const minY = Math.min(0, ...items.map((item) => item.y)) - WORLD_EXPANSION_MARGIN;
  const maxX = Math.max(WORLD.w, ...items.map((item) => item.x + item.w)) + WORLD_EXPANSION_MARGIN;
  const maxY = Math.max(WORLD.h, ...items.map((item) => item.y + item.h)) + WORLD_EXPANSION_MARGIN;
  return { minX, minY, maxX, maxY };
}

function getAttachedAreaCandidate(worldX, worldY, size, ignoreAreaId = null) {
  let best = null;
  getAttachableAreas().forEach((host) => {
    if (host.id === ignoreAreaId) return;
    if (!canAttachPrivateRoomToHost(host)) return;
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

function canAttachPrivateRoomToHost(host) {
  return host && (host.id === 1 || host.typeId === "publicFloor");
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

function rangesOverlap(aStart, aEnd, bStart, bEnd, padding = 0) {
  return Math.min(aEnd, bEnd) - Math.max(aStart, bStart) > -padding;
}

function getGapBetweenRects(a, b) {
  const xGap = a.x + a.w < b.x ? b.x - (a.x + a.w) : b.x + b.w < a.x ? a.x - (b.x + b.w) : 0;
  const yGap = a.y + a.h < b.y ? b.y - (a.y + a.h) : b.y + b.h < a.y ? a.y - (b.y + b.h) : 0;
  return { xGap, yGap };
}

function createsNarrowPathGap(a, b, minWidth = PERSON_PATH_MIN_WIDTH) {
  if (!a || !b) return false;
  if (rectanglesOverlap(a, b, 0)) return false;
  const xAligned = rangesOverlap(a.y, a.y + a.h, b.y, b.y + b.h, 4);
  const yAligned = rangesOverlap(a.x, a.x + a.w, b.x, b.x + b.w, 4);
  const gap = getGapBetweenRects(a, b);
  return xAligned && gap.xGap < minWidth || yAligned && gap.yGap < minWidth;
}

function createsNarrowPathToAreaEdge(rectValue, area, minWidth = PERSON_PATH_MIN_WIDTH) {
  if (!rectValue || !area) return false;
  const touchesVerticalSpan = rectValue.y < area.y + area.h - minWidth && rectValue.y + rectValue.h > area.y + minWidth;
  const touchesHorizontalSpan = rectValue.x < area.x + area.w - minWidth && rectValue.x + rectValue.w > area.x + minWidth;
  const gaps = [
    touchesVerticalSpan ? rectValue.x - area.x : minWidth,
    touchesVerticalSpan ? area.x + area.w - (rectValue.x + rectValue.w) : minWidth,
    touchesHorizontalSpan ? rectValue.y - area.y : minWidth,
    touchesHorizontalSpan ? area.y + area.h - (rectValue.y + rectValue.h) : minWidth
  ];
  return gaps.some((gap) => gap >= 0 && gap < minWidth);
}

function getPlacementSolidRects(ignore = {}) {
  const ignorePcId = Object.prototype.hasOwnProperty.call(ignore, "pcId") ? ignore.pcId : null;
  const ignorePartitionId = ignore.partitionId || null;
  const ignorePropId = ignore.propId || null;
  return []
    .concat(layout.pcs
      .filter((pc) => pc.id !== ignorePcId)
      .map((pc) => getPcVisualBounds(pc)))
    .concat(state.mahjongTables || [])
    .concat((state.partitions || [])
      .filter((partition) => partition.id !== ignorePartitionId)
      .filter((partition) => isBlockingPartition(partition)))
    .concat(getMovablePropDefinitions()
      .filter((prop) => prop.id !== ignorePropId && !isFreeMoveProp(prop))
      .map((prop) => getMovablePropHitBounds(getMovablePropRect(prop.id))));
}

function hasNarrowPlacementGap(rectValue, area = null, ignore = {}, options = {}) {
  if (!rectValue) return false;
  const minWidth = options.minWidth || PERSON_PATH_MIN_WIDTH;
  if (area && options.checkAreaEdges && createsNarrowPathToAreaEdge(rectValue, area, minWidth)) {
    return true;
  }
  return getPlacementSolidRects(ignore).some((solid) => createsNarrowPathGap(rectValue, solid, minWidth));
}

function isPointTooCloseToPlacementSolid(point, clearance = PERSON_PATH_MIN_WIDTH) {
  if (!point) return true;
  const probe = {
    x: point.x - clearance / 2,
    y: point.y - clearance / 2,
    w: clearance,
    h: clearance
  };
  return getPlacementSolidRects().some((solid) => rectanglesOverlap(probe, solid, 0));
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
  for (let index = state.publicFloors.length - 1; index >= 0; index -= 1) {
    const floor = state.publicFloors[index];
    if (isPointInsideRect(x, y, floor)) return createHallExtensionArea(floor);
  }
  return null;
}

function createHallExtensionArea(floor) {
  const hall = state.rentedAreas[0];
  return {
    id: 1,
    typeId: "livingRoom",
    name: "\u5927\u5385\u6269\u5c55",
    pcCount: hall ? hall.pcCount : layout.pcs.length,
    pcCapacity: getMaxOperationalPcs(),
    x: floor.x,
    y: floor.y,
    w: floor.w,
    h: floor.h,
    hostAreaId: 1,
    isPublicFloorExtension: true
  };
}

function getPersistentAreaForPlacement(area) {
  if (!area) return null;
  if (area.isPublicFloorExtension) return getAreaById(area.hostAreaId || 1);
  return getAreaById(area.id);
}

function getPcAtPoint(x, y) {
  return layout.pcs.find((pc) => isPointInsideRect(x, y, getPcVisualBounds(pc), 2));
}

function getPartitionAtPoint(x, y) {
  for (let index = state.partitions.length - 1; index >= 0; index -= 1) {
    const partition = state.partitions[index];
    if (isPointInsideRect(x, y, partition, 4)) return partition;
  }
  return null;
}

let _movablePropDefsCache = null;

function invalidateMovablePropDefsCache() {
  _movablePropDefsCache = null;
}

function getMovablePropDefinitions() {
  if (_movablePropDefsCache) return _movablePropDefsCache;
  const room = layout.room;
  const counter = layout.counter;
  _movablePropDefsCache = [
    {
      id: "counter",
      name: "\u524d\u53f0",
      x: counter.x,
      y: counter.y,
      w: counter.w,
      h: counter.h,
      movable: false,
      sellable: false
    },
    {
      id: "shopSign",
      name: "\u5c0f\u9ed1\u7f51\u5427",
      x: room.x + 22,
      y: room.y + 18,
      w: 72,
      h: 30,
      movable: false,
      sellable: false,
      placement: "free"
    },
    {
      id: "snackShelf",
      name: "\u96f6\u98df\u5c55\u793a\u67dc",
      x: room.x + 110,
      y: room.y + 20,
      w: 108,
      h: 34,
      movable: false,
      sellable: false,
      placement: "free"
    },
    {
      id: "happySign",
      name: "\u5feb\u4e50\u4e0a\u7f51\u724c",
      x: room.x + 228,
      y: room.y + 18,
      w: 52,
      h: 38,
      movable: false,
      sellable: false,
      placement: "free"
    },
    {
      id: "starterPlant",
      name: "\u521d\u59cb\u76c6\u683d",
      x: room.x + room.w - 136,
      y: room.y + 14,
      w: 40,
      h: 54,
      movable: false,
      sellable: false,
      placement: "free"
    }
  ];
  return _movablePropDefsCache;
}

function getMovablePropDefinition(propId) {
  return getMovablePropDefinitions().find((prop) => prop.id === propId) || null;
}

function getMovablePropRect(propId) {
  const definition = getMovablePropDefinition(propId);
  if (!definition) return null;
  const saved = state.propPositions[propId];
  if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
    return Object.assign({}, definition, { x: saved.x, y: saved.y });
  }
  return Object.assign({}, definition);
}

function getMovablePropAtPoint(x, y) {
  const props = getMovablePropDefinitions();
  for (let index = props.length - 1; index >= 0; index -= 1) {
    const prop = getMovablePropRect(props[index].id);
    if (prop && isPointInsideRect(x, y, getMovablePropHitBounds(prop), 4)) return prop;
  }
  return null;
}

function getMovablePropHitBounds(prop) {
  if (prop.id === "counter") {
    return { x: prop.x - 12, y: prop.y - 22, w: prop.w + 24, h: prop.h + 44 };
  }
  return prop;
}

function syncFrontDeskLayoutFromCounter() {
  const counter = layout.counter;
  layout.queue = [
    { x: counter.x - 12, y: counter.y + counter.h + 26 },
    { x: counter.x - 40, y: counter.y + counter.h + 26 },
    { x: counter.x - 68, y: counter.y + counter.h + 26 }
  ];
  layout.staffHome.cashier = { x: counter.x + counter.w - 22, y: counter.y + counter.h - 8 };
  layout.staffHome.manager = getManagerCounterStation();
}

function getManagerCounterStation() {
  const counter = layout.counter;
  return {
    x: counter.x + counter.w * 0.56,
    y: counter.y + 24
  };
}

function applyPropPositions() {
  const counterPosition = state.propPositions.counter;
  if (counterPosition && Number.isFinite(counterPosition.x) && Number.isFinite(counterPosition.y)) {
    layout.counter.x = counterPosition.x;
    layout.counter.y = counterPosition.y;
    syncFrontDeskLayoutFromCounter();
  }
}

function isMovingProp(propId) {
  return state.layoutToolActive && state.layoutMode === "propMove" && state.selectedPropId === propId;
}

function handleLayoutTouch(worldX, worldY) {
  if (state.layoutMode === "deleteArea") {
    deleteAreaLayout(worldX, worldY);
    return true;
  }

  if (state.layoutMode === "floor") {
    addPublicFloor(worldX, worldY);
    return true;
  }

  if (state.layoutMode === "partition") {
    addPartition(worldX, worldY);
    return true;
  }

  if (state.layoutMode === "partitionMove") {
    moveSelectedPartition(worldX, worldY);
    return true;
  }

  if (state.layoutMode === "propMove") {
    moveSelectedProp(worldX, worldY);
    return true;
  }

  if (state.layoutMode === "toiletMove") {
    moveToiletLayout();
    return true;
  }

  if (state.layoutMode === "pc") {
    if (state.selectedPcId) {
      const pc = getSelectedPc();
      if (pc) {
        const candidate = getPcMoveCandidate(pc);
        movePcLayout(candidate.x + pc.w / 2, candidate.y + pc.h / 2);
      }
    } else {
      movePcLayout(worldX, worldY);
    }
    return true;
  }

  if (state.selectedAreaId) {
    const area = getAreaById(state.selectedAreaId);
    if (area) {
      const candidate = getAreaMoveCandidate(area);
      moveAreaLayout(candidate.x + area.w / 2, candidate.y + area.h / 2);
    }
  } else {
    moveAreaLayout(worldX, worldY);
  }
  return true;
}

function clonePublicFloors(floors) {
  return (floors || []).map((floor) => Object.assign({}, floor));
}

function getFloorTileOwnedCount() {
  if (state.floorLayoutSession) return state.floorLayoutSession.ownedCount;
  return Math.max(state.purchasedFloorTileCount || 0, state.publicFloors.length);
}

function beginFloorLayoutSession() {
  if (state.floorLayoutSession) return;
  const ownedCount = getFloorTileOwnedCount();
  state.purchasedFloorTileCount = Math.max(state.purchasedFloorTileCount || 0, ownedCount);
  state.floorLayoutSession = {
    originalFloors: clonePublicFloors(state.publicFloors),
    ownedCount,
    startedCount: state.publicFloors.length
  };
}

function getFloorLayoutExtraCount(count = state.publicFloors.length) {
  return Math.max(0, count - getFloorTileOwnedCount());
}

function getFloorLayoutExtraCost(count = state.publicFloors.length) {
  return getFloorLayoutExtraCount(count) * PUBLIC_FLOOR_COST;
}

function getFloorLayoutPlacedCount() {
  return state.publicFloors.length;
}

function getFloorLayoutSessionCostText() {
  const extraCount = getFloorLayoutExtraCount();
  const cost = getFloorLayoutExtraCost();
  return {
    placedCount: getFloorLayoutPlacedCount(),
    ownedCount: getFloorTileOwnedCount(),
    extraCount,
    cost
  };
}

function enterFloorLayoutMode() {
  beginFloorLayoutSession();
  state.layoutToolActive = true;
  state.layoutMode = "floor";
  state.selectedAreaId = null;
  state.selectedPcId = null;
  state.selectedPartitionId = null;
  state.selectedPropId = null;
  state.pendingPartitionTypeId = null;
}

function finishFloorLayoutSession() {
  if (!state.floorLayoutSession) {
    state.layoutToolActive = false;
    state.layoutMode = "off";
    say("\u5df2\u9000\u51fa\u5e03\u5c40\u64cd\u4f5c\u3002");
    return true;
  }

  const summary = getFloorLayoutSessionCostText();
  if (summary.cost > state.cash) {
    say(`\u73b0\u91d1\u4e0d\u8db3\uff0c\u672c\u6b21\u65b0\u589e ${summary.extraCount} \u5757\u5730\u7816\u9700\u8981 ${summary.cost} \u5143\u3002`);
    return false;
  }

  const applyExit = () => {
    if (summary.cost > 0) {
      state.cash -= summary.cost;
    }
    state.purchasedFloorTileCount = Math.max(state.floorLayoutSession.ownedCount, state.publicFloors.length);
    state.floorLayoutSession = null;
    state.layoutToolActive = false;
    state.layoutMode = "off";
    state.selectedAreaId = null;
    state.selectedPcId = null;
    state.selectedPartitionId = null;
    state.selectedPropId = null;
    clearAllEntityNavigation();
    markSaveDirty();
    say(summary.extraCount > 0
      ? `\u5df2\u786e\u8ba4\u94fa\u8bbe ${summary.placedCount} \u5757\u5730\u7816\uff0c\u65b0\u589e ${summary.extraCount} \u5757\uff0c\u82b1\u8d39 ${summary.cost} \u5143\u3002`
      : `\u5df2\u8c03\u6574\u5730\u7816\u5e03\u5c40\uff0c\u5f53\u524d\u94fa\u8bbe ${summary.placedCount} \u5757\u3002`);
  };

  if (summary.extraCount > 0) {
    openConfirmDialog(
      "\u786e\u8ba4\u94fa\u7816",
      `\u672c\u6b21\u603b\u94fa\u8bbe ${summary.placedCount} \u5757\u5730\u7816\uff0c\u5df2\u8d2d ${summary.ownedCount} \u5757\uff0c\u65b0\u589e\u8d2d\u4e70 ${summary.extraCount} \u5757\uff0c\u603b\u8ba1\u82b1\u8d39 ${summary.cost} \u5143\u3002\u786e\u8ba4\u8d2d\u4e70\u5e76\u9000\u51fa\u5e03\u5c40\u5417\uff1f`,
      applyExit,
      () => {
        const session = state.floorLayoutSession;
        if (session) {
          state.publicFloors = clonePublicFloors(session.originalFloors);
        }
        state.floorLayoutSession = null;
        state.layoutToolActive = false;
        state.layoutMode = "off";
        state.selectedAreaId = null;
        state.selectedPcId = null;
        state.selectedPartitionId = null;
        state.selectedPropId = null;
        // Walls have just snapped back \u2014 rescue anyone that wandered into the draft area.
        clearAllEntityNavigation();
        rescueEntitiesOutsideWalkableArea();
        say("\u5df2\u53d6\u6d88\u672c\u6b21\u94fa\u7816\uff0c\u6062\u590d\u539f\u6765\u7684\u5730\u7816\u5e03\u5c40\u3002");
      }
    );
    return false;
  }

  applyExit();
  return true;
}

function getPublicFloorDraftCountAfterAdd() {
  return state.publicFloors.length + 1;
}

function addPublicFloor(worldX, worldY) {
  beginFloorLayoutSession();
  const existingIndex = state.publicFloors.findIndex((item) => (
    worldX >= item.x &&
    worldX <= item.x + item.w &&
    worldY >= item.y &&
    worldY <= item.y + item.h
  ));
  if (existingIndex >= 0) {
    state.publicFloors.splice(existingIndex, 1);
    clearAllEntityNavigation();
    const summary = getFloorLayoutSessionCostText();
    say(`\u5df2\u79fb\u9664\u8fd9\u5757\u516c\u533a\u5730\u7816\u3002\u5f53\u524d ${summary.placedCount} \u5757\uff0c\u5f85\u652f\u4ed8 ${summary.cost} \u5143\u3002`);
    return;
  }

  const projectedCost = getFloorLayoutExtraCost(getPublicFloorDraftCountAfterAdd());
  if (projectedCost > state.cash) {
    say(`\u73b0\u91d1\u4e0d\u8db3\uff0c\u672c\u6b21\u94fa\u8bbe\u540e\u9700\u652f\u4ed8 ${projectedCost} \u5143\u3002`);
    return;
  }

  const candidate = getPublicFloorCandidate(worldX, worldY);
  if (!candidate || !isPublicFloorPlacementFree(candidate.floor)) {
    state.invalidFloorHint = {
      x: snapToRoomTile(worldX - PUBLIC_FLOOR_HALF, "x"),
      y: snapToRoomTile(worldY - PUBLIC_FLOOR_HALF, "y"),
      timer: 1.2
    };
    say("\u516c\u533a\u5730\u7816\u5fc5\u987b\u8d34\u5899\u6216\u5bf9\u9f50\u4e0a\u4e00\u5757\u5730\u7816\uff0c\u8fd9\u91cc\u4e0d\u80fd\u94fa\u3002");
    return;
  }

  candidate.floor.id = `floor-${candidate.floor.x}-${candidate.floor.y}`;
  candidate.floor.typeId = "publicFloor";
  candidate.floor.name = "\u516c\u533a\u5730\u7816";
  state.publicFloors.push(candidate.floor);
  clearAllEntityNavigation();
  const summary = getFloorLayoutSessionCostText();
  say(candidate.hostType === "floor"
    ? `\u516c\u533a\u8fc7\u9053\u5df2\u5ef6\u5c55\u3002\u672c\u6b21\u65b0\u589e ${summary.extraCount} \u5757\uff0c\u5f85\u652f\u4ed8 ${summary.cost} \u5143\u3002`
    : `\u5df2\u94fa\u8bbe\u5730\u7816\u3002\u672c\u6b21\u65b0\u589e ${summary.extraCount} \u5757\uff0c\u5f85\u652f\u4ed8 ${summary.cost} \u5143\u3002`);
}

function addPartition(worldX, worldY) {
  const type = getPartitionType(state.pendingPartitionTypeId);
  if (!type) {
    say("\u5148\u5728\u5efa\u8bbe\u9762\u677f\u91cc\u9009\u62e9\u8981\u6446\u653e\u7684\u9694\u65ad\u3002");
    return;
  }

  const partition = getPartitionCandidate(type, worldX, worldY);
  if (!isPartitionPlacementValid(partition)) {
    say("\u8fd9\u91cc\u6446\u4e0d\u4e0b\u9694\u65ad\uff0c\u9700\u8981\u5728\u5df2\u94fa\u5730\u7816\u7684\u5ba4\u5185\u7a7a\u5730\u3002");
    return;
  }
  if (state.cash < type.cost) {
    say(`\u73b0\u91d1\u4e0d\u8db3\uff0c${type.name}\u9700\u8981 ${type.cost} \u5143\u3002`);
    return;
  }

  state.cash -= type.cost;
  partition.id = `partition-${Date.now()}-${state.partitions.length}`;
  state.partitions.push(partition);
  state.guests.forEach((g) => { if (rectanglesOverlap(g, partition, 0)) { const safe = getSafePointAroundRect(g, partition, { x: partition.x + partition.w / 2, y: partition.y + partition.h / 2 }); if (safe) { g.x = safe.x; g.y = safe.y; g.detourPoint = null; clearEntityNavigation(g); } } });
  state.workers.forEach((w) => { if (rectanglesOverlap(w, partition, 0)) { const safe = getSafePointAroundRect(w, partition, { x: partition.x + partition.w / 2, y: partition.y + partition.h / 2 }); if (safe) { w.x = safe.x; w.y = safe.y; w.detourPoint = null; clearEntityNavigation(w); } } });
  state.pendingPartitionTypeId = null;
  state.layoutToolActive = false;
  state.layoutMode = "off";
  markSaveDirty();
  say(`\u5df2\u6446\u653e ${type.name}\uff0c\u82b1\u8d39 ${type.cost} \u5143\u3002`);
}

function getPartitionDimensions(type, orientation = "horizontal") {
  const vertical = orientation === "vertical";
  return {
    w: vertical ? type.h : type.w,
    h: vertical ? type.w : type.h
  };
}

function togglePendingPartitionOrientation() {
  state.pendingPartitionOrientation = state.pendingPartitionOrientation === "vertical" ? "horizontal" : "vertical";
  say(state.pendingPartitionOrientation === "vertical" ? "\u9694\u65ad\u5df2\u5207\u6362\u4e3a\u7ad6\u5411\u6446\u653e\u3002" : "\u9694\u65ad\u5df2\u5207\u6362\u4e3a\u6a2a\u5411\u6446\u653e\u3002");
}

function getPublicFloorCandidate(worldX, worldY) {
  const size = { w: PUBLIC_FLOOR_SIZE, h: PUBLIC_FLOOR_SIZE };
  let best = null;

  getStructuralAreas().forEach((host) => {
    const candidates = getPublicFloorWallCandidates(host, worldX, worldY, size);
    candidates.forEach((candidate) => {
      clampAreaToWorld(candidate.area);
      if (!sharesWall(host, candidate.area)) return;
      const score = distanceToRectCenter(worldX, worldY, candidate.area);
      if (score > PUBLIC_FLOOR_ATTACH_DISTANCE) return;
      if (!best || score < best.score) {
        best = { floor: candidate.area, hostType: "wall", score };
      }
    });
  });

  state.publicFloors.forEach((host) => {
    const candidates = getPublicFloorExtensionCandidates(host, worldX, worldY, size);
    candidates.forEach((candidate) => {
      clampAreaToWorld(candidate.area);
      if (!sharesWall(host, candidate.area)) return;
      if (!isAlignedPublicFloor(host, candidate.area)) return;
      const score = distanceToRectCenter(worldX, worldY, candidate.area);
      if (score > PUBLIC_FLOOR_ATTACH_DISTANCE) return;
      if (!best || score < best.score) {
        best = { floor: candidate.area, hostType: "floor", score };
      }
    });
  });

  if (best && best.floor.y < layout.room.y) return null;
  return best;
}

function canAttachPublicFloor(floor) {
  const attachedToWall = getStructuralAreas().some((area) => sharesWall(area, floor));
  const attachedToFloor = state.publicFloors.some((item) => sharesWall(item, floor) && isAlignedPublicFloor(item, floor));
  return attachedToWall || attachedToFloor;
}

function getPartitionCandidate(type, worldX, worldY, orientation = state.pendingPartitionOrientation) {
  const size = getPartitionDimensions(type, orientation);
  return {
    typeId: type.id,
    x: snapPcPosition(worldX - size.w / 2),
    y: snapPcPosition(worldY - size.h / 2),
    w: size.w,
    h: size.h,
    orientation
  };
}

function isPartitionPlacementValid(partition, ignorePartitionId = null) {
  if (!partition) return false;
  const center = { x: partition.x + partition.w / 2, y: partition.y + partition.h / 2 };
  const area = getWalkableAreaAtPoint(center.x, center.y);
  if (!area || area.typeId === "toiletRoom") return false;
  if (layout.pcs.some((pc) => rectanglesOverlap(partition, getPcVisualBounds(pc), 2))) return false;
  if (state.mahjongTables.some((table) => rectanglesOverlap(partition, table, 2))) return false;
  if (state.partitions.some((item) => item.id !== ignorePartitionId && rectanglesOverlap(partition, item, 2))) return false;
  if (getMovablePropDefinitions().some((prop) => rectanglesOverlap(partition, getMovablePropHitBounds(getMovablePropRect(prop.id)), 2))) return false;
  return true;
}

function isRectInsideBuildableFloorNetwork(rectValue) {
  const inset = 3;
  const points = [
    { x: rectValue.x + inset, y: rectValue.y + inset },
    { x: rectValue.x + rectValue.w - inset, y: rectValue.y + inset },
    { x: rectValue.x + inset, y: rectValue.y + rectValue.h - inset },
    { x: rectValue.x + rectValue.w - inset, y: rectValue.y + rectValue.h - inset },
    { x: rectValue.x + rectValue.w / 2, y: rectValue.y + rectValue.h / 2 }
  ];
  return points.every((point) => {
    const pointArea = getWalkableAreaAtPoint(point.x, point.y);
    return pointArea && pointArea.typeId !== "toiletRoom";
  });
}

function getPublicFloorWallCandidates(host, worldX, worldY, size) {
  const alignedX = snapToHostTile(worldX - size.w / 2, host.x, host.x, host.x + host.w - size.w, size.w);
  const alignedY = snapToHostTile(worldY - size.h / 2, host.y, host.y, host.y + host.h - size.h, size.h);
  return [
    {
      side: "top",
      area: {
        x: alignedX,
        y: host.y - size.h,
        w: size.w,
        h: size.h
      }
    },
    {
      side: "bottom",
      area: {
        x: alignedX,
        y: host.y + host.h,
        w: size.w,
        h: size.h
      }
    },
    {
      side: "left",
      area: {
        x: host.x - size.w,
        y: alignedY,
        w: size.w,
        h: size.h
      }
    },
    {
      side: "right",
      area: {
        x: host.x + host.w,
        y: alignedY,
        w: size.w,
        h: size.h
      }
    }
  ];
}

function getPublicFloorExtensionCandidates(host, worldX, worldY, size) {
  const exactX = host.w === size.w;
  const exactY = host.h === size.h;
  return [
    {
      side: "top",
      area: {
        x: exactX ? host.x : snapToGrid(clamp(worldX - size.w / 2, host.x, host.x + host.w - size.w)),
        y: host.y - size.h,
        w: size.w,
        h: size.h
      }
    },
    {
      side: "bottom",
      area: {
        x: exactX ? host.x : snapToGrid(clamp(worldX - size.w / 2, host.x, host.x + host.w - size.w)),
        y: host.y + host.h,
        w: size.w,
        h: size.h
      }
    },
    {
      side: "left",
      area: {
        x: host.x - size.w,
        y: exactY ? host.y : snapToGrid(clamp(worldY - size.h / 2, host.y, host.y + host.h - size.h)),
        w: size.w,
        h: size.h
      }
    },
    {
      side: "right",
      area: {
        x: host.x + host.w,
        y: exactY ? host.y : snapToGrid(clamp(worldY - size.h / 2, host.y, host.y + host.h - size.h)),
        w: size.w,
        h: size.h
      }
    }
  ];
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
  const overlapsEntranceCorridor = rectanglesOverlap(floor, layout.entranceCorridor, 0);
  return !overlapsRoom && !overlapsFloor && !overlapsEntranceCorridor;
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
    if (pc.occupiedBy) {
      say("\u8fd9\u53f0\u673a\u6709\u4eba\u4e0a\u673a\uff0c\u5148\u7b49\u5ba2\u4eba\u4e0b\u673a\u518d\u79fb\u52a8\u3002");
      return;
    }
    state.selectedPcId = pc.id + 1;
    say(`${pc.id + 1} \u53f7\u673a\u5df2\u9009\u4e2d\uff0c\u62d6\u52a8\u5730\u56fe\u5bf9\u51c6\u9884\u89c8\u6846\uff0c\u70b9\u51fb\u653e\u7f6e\u3002`);
    return;
  }

  const pc = layout.pcs.find((item) => item.id + 1 === state.selectedPcId);
  if (!pc) {
    state.selectedPcId = null;
    return;
  }
  const area = getAreaAtPoint(worldX, worldY) || getAreaById(pc.areaId);
  if (!area) {
    say("\u7535\u8111\u9700\u8981\u653e\u5728\u5df2\u94fa\u5730\u7816\u7684\u533a\u57df\u5185\u3002");
    return;
  }

  const nextX = snapPcPosition(worldX - pc.w / 2);
  const nextY = snapPcPosition(worldY - pc.h / 2);
  const candidate = Object.assign({}, pc, {
    x: nextX,
    y: nextY
  });
  updatePcSeat(candidate);
  if (!isPcLayoutPositionValid(area, candidate, pc.id)) {
    say("\u7535\u8111\u9700\u8981\u7559\u51fa\u5ea7\u4f4d\u8fc7\u9053\uff0c\u4e0d\u80fd\u548c\u5899\u4f53\u6216\u5176\u4ed6\u8bbe\u5907\u91cd\u53e0\u3002");
    return;
  }

  const persistentArea = getPersistentAreaForPlacement(area);
  pc.x = nextX;
  pc.y = nextY;
  if (persistentArea && pc.areaId !== persistentArea.id) {
    const oldArea = getAreaById(pc.areaId);
    if (oldArea) oldArea.pcCount = Math.max(0, (oldArea.pcCount || 0) - 1);
    persistentArea.pcCount = (persistentArea.pcCount || 0) + 1;
    pc.areaId = persistentArea.id;
    pc.areaName = persistentArea.id === 1 ? "\u5ba2\u5385" : persistentArea.name;
  }
  updatePcSeat(pc);
  state.selectedPcId = null;
  state.layoutMode = "off";
  state.layoutToolActive = false;
  markSaveDirty();
  say(`${pc.id + 1} \u53f7\u673a\u4f4d\u7f6e\u5df2\u8c03\u6574\u3002`);
}

function moveSelectedPartition(worldX, worldY) {
  if (!state.selectedPartitionId) {
    const partition = getPartitionAtPoint(worldX, worldY);
    if (!partition) {
      say("\u5148\u70b9\u4e00\u4e2a\u8981\u79fb\u52a8\u7684\u9694\u65ad\u3002");
      return;
    }
    state.selectedPartitionId = partition.id;
    say("\u9694\u65ad\u5df2\u9009\u4e2d\uff0c\u62d6\u52a8\u5730\u56fe\u5bf9\u51c6\u9884\u89c8\u6846\uff0c\u70b9\u51fb\u653e\u7f6e\u3002");
    return;
  }

  const partition = state.partitions.find((item) => item.id === state.selectedPartitionId);
  const type = partition ? getPartitionType(partition.typeId) : null;
  if (!partition || !type) {
    state.selectedPartitionId = null;
    return;
  }

  const preview = getSelectedPartitionMoveCandidate();
  const candidate = preview || getPartitionCandidate(type, worldX, worldY, partition.orientation || "horizontal");
  candidate.id = partition.id;
  if (!isPartitionPlacementValid(candidate, partition.id)) {
    say("\u8fd9\u91cc\u653e\u4e0d\u4e0b\u9694\u65ad\uff0c\u9700\u8981\u7559\u51fa\u8bbe\u5907\u548c\u901a\u9053\u7a7a\u95f4\u3002");
    return;
  }

  partition.x = candidate.x;
  partition.y = candidate.y;
  partition.w = candidate.w;
  partition.h = candidate.h;
  partition.orientation = candidate.orientation;
  state.selectedPartitionId = null;
  state.layoutToolActive = false;
  state.layoutMode = "off";
  state.guests.forEach((g) => { if (rectanglesOverlap(g, partition, 0)) { const safe = getSafePointAroundRect(g, partition, { x: partition.x + partition.w / 2, y: partition.y + partition.h / 2 }); if (safe) { g.x = safe.x; g.y = safe.y; g.detourPoint = null; clearEntityNavigation(g); } } });
  state.workers.forEach((w) => { if (rectanglesOverlap(w, partition, 0)) { const safe = getSafePointAroundRect(w, partition, { x: partition.x + partition.w / 2, y: partition.y + partition.h / 2 }); if (safe) { w.x = safe.x; w.y = safe.y; w.detourPoint = null; clearEntityNavigation(w); } } });
    markSaveDirty();
  say("\u9694\u65ad\u4f4d\u7f6e\u5df2\u8c03\u6574\u3002");
}

function getSelectedPartitionMoveCandidate() {
  const partition = state.partitions.find((item) => item.id === state.selectedPartitionId);
  const type = partition ? getPartitionType(partition.typeId) : null;
  if (!partition || !type) return null;
  const worldX = state.camera.x + view.width / 2;
  const worldY = state.camera.y + (view.height - ACTION_BAR_HEIGHT + HUD_HEIGHT) / 2;
  const candidate = getPartitionCandidate(type, worldX, worldY, partition.orientation || "horizontal");
  candidate.id = partition.id;
  return candidate;
}

function rotatePartition(partition) {
  const type = partition ? getPartitionType(partition.typeId) : null;
  if (!partition || !type) return;
  const nextOrientation = partition.orientation === "vertical" ? "horizontal" : "vertical";
  const size = getPartitionDimensions(type, nextOrientation);
  const centerX = partition.x + partition.w / 2;
  const centerY = partition.y + partition.h / 2;
  const candidate = {
    id: partition.id,
    typeId: partition.typeId,
    x: snapPcPosition(centerX - size.w / 2),
    y: snapPcPosition(centerY - size.h / 2),
    w: size.w,
    h: size.h,
    orientation: nextOrientation
  };
  if (!isPartitionPlacementValid(candidate, partition.id)) {
    say("\u5f53\u524d\u4f4d\u7f6e\u65cb\u8f6c\u540e\u4f1a\u5361\u4f4f\u901a\u9053\u6216\u8bbe\u5907\uff0c\u5148\u79fb\u5f00\u518d\u65cb\u8f6c\u3002");
    return;
  }
  Object.assign(partition, candidate);
  markSaveDirty();
  say("\u9694\u65ad\u5df2\u65cb\u8f6c 90 \u5ea6\u3002");
}

function sellPartition(partition) {
  const type = partition ? getPartitionType(partition.typeId) : null;
  if (!partition || !type) return;
  const value = Math.floor(getPartitionCost(type) / 2);
  state.partitions = state.partitions.filter((item) => item.id !== partition.id);
  state.cash += value;
  state.selectedPartitionId = null;
  state.partitionActionMenu = null;
  markSaveDirty();
  say(`\u5df2\u51fa\u552e ${type.name}\uff0c\u56de\u6536 ${value} \u5143\u3002`);
}

function moveSelectedProp(worldX, worldY) {
  if (!state.selectedPropId) {
    const prop = getMovablePropAtPoint(worldX, worldY);
    if (!prop) {
      say("\u5148\u70b9\u4e00\u4e2a\u8981\u79fb\u52a8\u7684\u9053\u5177\u3002");
      return;
    }
    state.selectedPropId = prop.id;
    say(`${prop.name}\u5df2\u9009\u4e2d\uff0c\u62d6\u52a8\u5730\u56fe\u5bf9\u51c6\u9884\u89c8\u6846\uff0c\u70b9\u51fb\u653e\u7f6e\u3002`);
    return;
  }

  const prop = getMovablePropRect(state.selectedPropId);
  if (!prop) {
    state.selectedPropId = null;
    return;
  }
  const candidate = getSelectedPropMoveCandidate() || Object.assign({}, prop, {
    x: snapPcPosition(worldX - prop.w / 2),
    y: snapPcPosition(worldY - prop.h / 2)
  });
  if (!isMovablePropPlacementValid(candidate, prop.id)) {
    say(isFreeMoveProp(prop)
      ? "\u8fd9\u91cc\u653e\u4e0d\u4e0b\u8fd9\u4e2a\u6302\u4ef6\uff0c\u8bf7\u907f\u5f00\u5165\u53e3\u697c\u9053\u6216\u8fb9\u754c\u3002"
      : "\u8fd9\u91cc\u653e\u4e0d\u4e0b\u8fd9\u4e2a\u9053\u5177\uff0c\u9700\u8981\u653e\u5728\u5df2\u94fa\u7684\u5ba4\u5185\u5730\u9762\u4e0a\u3002");
    return;
  }

  state.propPositions[prop.id] = { x: candidate.x, y: candidate.y };
  if (prop.id === "counter") {
    layout.counter.x = candidate.x;
    layout.counter.y = candidate.y;
    syncFrontDeskLayoutFromCounter();
  }
  state.selectedPropId = null;
  state.layoutToolActive = false;
  state.layoutMode = "off";
  markSaveDirty();
  say(`${prop.name}\u4f4d\u7f6e\u5df2\u8c03\u6574\u3002`);
}

function getSelectedPropMoveCandidate() {
  const prop = getMovablePropRect(state.selectedPropId);
  if (!prop) return null;
  const worldX = state.camera.x + view.width / 2;
  const worldY = state.camera.y + (view.height - ACTION_BAR_HEIGHT + HUD_HEIGHT) / 2;
  return Object.assign({}, prop, {
    x: snapPcPosition(worldX - prop.w / 2),
    y: snapPcPosition(worldY - prop.h / 2)
  });
}

function isMovablePropPlacementValid(prop, ignorePropId = null) {
  if (!prop) return false;
  if (isFreeMoveProp(prop)) {
    if (rectanglesOverlap(prop, layout.entranceCorridor, 0)) return false;
    return isPropInsideWorldBounds(prop);
  }
  if (!isRectInsideBuildableFloorNetwork(prop)) return false;
  if (layout.pcs.some((pc) => rectanglesOverlap(prop, getPcVisualBounds(pc), 4))) return false;
  if (state.mahjongTables.some((table) => rectanglesOverlap(prop, table, 4))) return false;
  if (state.partitions.some((partition) => rectanglesOverlap(prop, partition, 4))) return false;
  if (getMovablePropDefinitions().some((item) => item.id !== ignorePropId && rectanglesOverlap(prop, getMovablePropHitBounds(getMovablePropRect(item.id)), 3))) return false;
  const area = getWalkableAreaAtPoint(prop.x + prop.w / 2, prop.y + prop.h / 2);
  if (hasNarrowPlacementGap(prop, area, { propId: ignorePropId }, { checkAreaEdges: Boolean(area && area.typeId !== "publicFloor") })) return false;
  if (getDoorAreaPairs().some(([a, b]) => {
    const door = getDoorGeometryBetween(a, b);
    return door && rectanglesOverlap(prop, door.rect, 6);
  })) return false;
  return !rectanglesOverlap(prop, layout.entranceCorridor, 0);
}

function isFreeMoveProp(prop) {
  const definition = prop ? getMovablePropDefinition(prop.id) : null;
  return definition && definition.placement === "free";
}

function isPropInsideWorldBounds(prop) {
  const bounds = getExpandedWorldBounds();
  return prop.x + prop.w / 2 >= bounds.minX &&
    prop.x + prop.w / 2 <= bounds.maxX &&
    prop.y + prop.h / 2 >= bounds.minY &&
    prop.y + prop.h / 2 <= bounds.maxY;
}

function getSelectedPc() {
  return layout.pcs.find((item) => item.id + 1 === state.selectedPcId) || null;
}

function getViewportWorldCenter() {
  return {
    x: state.camera.x + view.width / 2,
    y: state.camera.y + (view.height - ACTION_BAR_HEIGHT + HUD_HEIGHT) / 2
  };
}

function getPcMoveCandidate(pc) {
  const center = getViewportWorldCenter();
  const candidate = Object.assign({}, pc, {
    x: snapPcPosition(center.x - pc.w / 2),
    y: snapPcPosition(center.y - pc.h / 2)
  });
  updatePcSeat(candidate);
  return candidate;
}

function getAreaMoveCandidate(area) {
  const center = getViewportWorldCenter();
  const candidate = getAttachedAreaCandidate(center.x, center.y, { w: area.w, h: area.h }, area.id);
  return candidate ? candidate.area : {
    x: snapToGrid(center.x - area.w / 2),
    y: snapToGrid(center.y - area.h / 2),
    w: area.w,
    h: area.h
  };
}

function getToiletMoveCandidate() {
  const center = getViewportWorldCenter();
  const size = { w: layout.toilet.w, h: layout.toilet.h };
  const candidate = getAttachedAreaCandidate(center.x, center.y, size, layout.toilet.id);
  if (candidate) {
    return { area: candidate.area, attached: true };
  }
  return {
    area: {
      x: snapToGrid(center.x - size.w / 2),
      y: snapToGrid(center.y - size.h / 2),
      w: size.w,
      h: size.h
    },
    attached: false
  };
}

function isToiletMoveCandidateValid(candidate) {
  return Boolean(candidate && candidate.attached && isAreaPlacementFree(candidate.area, layout.toilet.id));
}

function moveToiletLayout() {
  if (state.toilet.busyGuestId || state.toilet.cleanWorkerId) {
    say("\u5395\u6240\u6b63\u5728\u4f7f\u7528\u6216\u6e05\u6d01\u4e2d\uff0c\u7a0d\u540e\u518d\u79fb\u52a8\u3002");
    return;
  }

  const candidate = getToiletMoveCandidate();
  if (!isToiletMoveCandidateValid(candidate)) {
    say("\u5395\u6240\u9700\u8981\u8d34\u7740\u5927\u5385\u6216\u516c\u533a\u5916\u5899\u653e\u7f6e\uff0c\u4e14\u4e0d\u80fd\u548c\u5176\u4ed6\u623f\u95f4\u91cd\u53e0\u3002");
    return;
  }

  moveAreaTo(layout.toilet, candidate.area.x, candidate.area.y);
  state.layoutToolActive = false;
  state.layoutMode = "off";
  markSaveDirty();
  say("\u5395\u6240\u4f4d\u7f6e\u5df2\u8c03\u6574\uff0c\u95e8\u6d1e\u4f1a\u81ea\u52a8\u91cd\u7b97\u3002");
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

function deleteAreaLayout(worldX, worldY) {
  const partition = getPartitionAtPoint(worldX, worldY);
  if (partition) {
    const type = getPartitionType(partition.typeId);
    const refund = Math.floor(getPartitionCost(type) / 2);
    state.partitions = state.partitions.filter((item) => item.id !== partition.id);
    state.cash += refund;
    markSaveDirty();
    say(`\u5df2\u79fb\u9664 ${type ? type.name : "\u9694\u65ad"}\uff0c\u56de\u6536 ${refund} \u5143\u3002`);
    return;
  }

  const area = getAreaAtPoint(worldX, worldY);
  if (!area || area.id === 1 || area.id === layout.toilet.id) {
    say("\u70b9\u51fb\u60f3\u5220\u9664\u7684\u9694\u65ad\u6216\u65e7\u5305\u95f4\u3002");
    return;
  }

  const pcsInArea = layout.pcs.filter((pc) => pc.areaId === area.id);
  if (pcsInArea.length) {
    say("\u8bf7\u5148\u79fb\u8d70\u6216\u51fa\u552e\u8be5\u5305\u95f4\u91cc\u7684\u7535\u8111\u3002");
    return;
  }

  const refund = getAreaRefund(area);
  openConfirmDialog(
    "\u5220\u9664\u5305\u95f4",
    `\u786e\u5b9a\u5220\u9664 ${area.name} \u5417\uff1f\u5c06\u8fd4\u8fd8 ${refund} \u5143\u3002`,
    () => deleteRentedArea(area, refund)
  );
}

function getAreaRefund(area) {
  const type = getExpansionType(area.typeId);
  if (!type) return 0;
  return Math.floor(getAreaRentCost(type, area.pcCapacity || area.pcCount || 0) / 2);
}

function deleteRentedArea(area, refund) {
  state.rentedAreas = state.rentedAreas.filter((item) => item.id !== area.id);
  state.cash += refund;
  state.layoutToolActive = false;
  state.layoutMode = "off";
  state.selectedAreaId = null;
  markSaveDirty();
  say(`\u5df2\u5220\u9664 ${area.name}\uff0c\u8fd4\u8fd8 ${refund} \u5143\u3002`);
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

function rebuildPcsFromAreas(savedPcs = []) {
  layout.pcs.length = 0;
  state.rentedAreas.forEach((area) => {
    for (let index = 0; index < area.pcCount; index += 1) {
      const position = getPcPositionInArea(area, index);
      const pc = createPc(layout.pcs.length, position.x, position.y, area.id, area.name);
      const savedPc = savedPcs[layout.pcs.length];
      if (savedPc) {
        pc.rotation = 0;
        if (Number.isFinite(savedPc.x) && Number.isFinite(savedPc.y)) {
          pc.x = savedPc.x;
          pc.y = savedPc.y;
          updatePcSeat(pc);
          if (!isPcPositionSafeForArea(pc, area)) {
            pc.x = position.x;
            pc.y = position.y;
            updatePcSeat(pc);
          }
        }
        pc.equipmentLevel = Number.isFinite(savedPc.equipmentLevel) ? savedPc.equipmentLevel : pc.equipmentLevel;
        updatePcSeat(pc);
        pc.sessionsServed = Number.isFinite(savedPc.sessionsServed) ? savedPc.sessionsServed : 0;
        pc.broken = Boolean(savedPc.broken);
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

  const count = Math.max(1, area.pcCount || 1);
  const cols = count >= 8 ? 4 : count >= 5 ? 3 : count >= 3 ? 2 : count;
  const rows = Math.ceil(count / cols);
  const col = index % cols;
  const row = Math.floor(index / cols);
  const minX = area.x + 30;
  const maxX = Math.max(minX, area.x + area.w - 72);
  const minY = area.y + 58;
  const maxY = Math.max(minY, area.y + area.h - 88);
  const gapX = cols > 1 ? (maxX - minX) / (cols - 1) : 0;
  const gapY = rows > 1 ? clamp((maxY - minY) / (rows - 1), 42, 86) : 0;
  return {
    x: Math.round(Math.min(maxX, minX + col * gapX)),
    y: Math.round(Math.min(maxY, minY + row * gapY))
  };
}

function normalizePublicFloor(floor) {
  const x = Number.isFinite(floor.x) ? snapToRoomTile(floor.x, "x") : layout.room.x;
  const y = Number.isFinite(floor.y) ? snapToRoomTile(floor.y, "y") : layout.room.y;
  return {
    id: `floor-${x}-${y}`,
    typeId: "publicFloor",
    name: "\u516c\u533a\u5730\u7816",
    x,
    y,
    w: PUBLIC_FLOOR_SIZE,
    h: PUBLIC_FLOOR_SIZE
  };
}

function normalizePartition(partition) {
  const type = getPartitionType(partition.typeId);
  if (!type) return null;
  const vertical = partition.orientation === "vertical";
  return {
    id: partition.id || `partition-${partition.x}-${partition.y}`,
    typeId: type.id,
    x: Number.isFinite(partition.x) ? partition.x : layout.room.x,
    y: Number.isFinite(partition.y) ? partition.y : layout.room.y,
    w: vertical ? type.h : type.w,
    h: vertical ? type.w : type.h,
    orientation: vertical ? "vertical" : "horizontal"
  };
}

function isPcPositionSafeForArea(pc, area) {
  const bounds = getPcVisualBounds(pc);
  return bounds.x >= area.x + 4 &&
    bounds.x + bounds.w <= area.x + area.w - 4 &&
    bounds.y >= area.y + 18 &&
    bounds.y + bounds.h <= area.y + area.h - 4;
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

function loadAudioSettings() {
  const settings = readStorage(AUDIO_SETTINGS_KEY);
  return {
    musicEnabled: !settings || settings.musicEnabled !== false,
    sfxEnabled: !settings || settings.sfxEnabled !== false
  };
}

function saveAudioSettings() {
  writeStorage(AUDIO_SETTINGS_KEY, {
    musicEnabled: state.audio.musicEnabled,
    sfxEnabled: state.audio.sfxEnabled
  });
}

const audioSystem = {
  initialized: false,
  bgm: null,
  click: null
};

function createAudio(src, options = {}) {
  if (!wx.createInnerAudioContext) return null;

  try {
    const audio = wx.createInnerAudioContext();
    audio.src = src;
    audio.loop = Boolean(options.loop);
    audio.volume = Number.isFinite(options.volume) ? options.volume : 1;
    audio.obeyMuteSwitch = false;
    return audio;
  } catch (error) {
    return null;
  }
}

function initAudioSystem() {
  if (audioSystem.initialized) return;
  audioSystem.initialized = true;

  audioSystem.bgm = createAudio(AUDIO_SOURCES.bgm, { loop: true, volume: 0.28 });
  audioSystem.click = createAudio(AUDIO_SOURCES.click, { loop: false, volume: 0.55 });
}

function syncMusicPlayback() {
  initAudioSystem();
  if (!audioSystem.bgm) return;

  try {
    if (state.audio.musicEnabled) {
      audioSystem.bgm.play();
    } else {
      audioSystem.bgm.stop();
    }
  } catch (error) {
    // Audio startup can fail before the first user gesture on some runtimes.
  }
}

function playClickSound() {
  if (!state.audio.sfxEnabled) return;
  initAudioSystem();
  if (!audioSystem.click) return;

  try {
    audioSystem.click.stop();
    audioSystem.click.seek(0);
    audioSystem.click.play();
  } catch (error) {
    // Click feedback should never block game input.
  }
}

function toggleMusicEnabled() {
  state.audio.musicEnabled = !state.audio.musicEnabled;
  saveAudioSettings();
  syncMusicPlayback();
  say(state.audio.musicEnabled ? "\u80cc\u666f\u97f3\u4e50\u5df2\u5f00\u542f\u3002" : "\u80cc\u666f\u97f3\u4e50\u5df2\u5173\u95ed\u3002");
}

function toggleSfxEnabled() {
  state.audio.sfxEnabled = !state.audio.sfxEnabled;
  saveAudioSettings();
  say(state.audio.sfxEnabled ? "\u6309\u952e\u70b9\u51fb\u58f0\u5df2\u5f00\u542f\u3002" : "\u6309\u952e\u70b9\u51fb\u58f0\u5df2\u5173\u95ed\u3002");
}

function buildSaveData() {
  const savedPublicFloors = state.floorLayoutSession
    ? state.floorLayoutSession.originalFloors
    : state.publicFloors;
  return {
    version: 1,
    cash: state.cash,
    cafeLevel: state.cafeLevel,
    equipmentLevel: state.equipmentLevel,
    cleanliness: state.cleanliness,
    satisfaction: state.satisfaction,
    served: state.served,
    lost: state.lost,
    time: state.time,
    lastPayrollMonth: state.lastPayrollMonth,
    monthlyLedger: normalizeMonthlyLedger(state.monthlyLedger),
    businessOpen: state.businessOpen,
    inventory: Object.assign({}, state.inventory),
    purchaseQuantities: Object.assign({}, state.purchaseQuantities),
    employees: Object.assign({}, state.employees),
    nextAreaId: state.nextAreaId,
    rentedAreas: state.rentedAreas.map((area) => Object.assign({}, area)),
    publicFloors: savedPublicFloors.map((floor) => Object.assign({}, floor)),
    purchasedFloorTileCount: Math.max(state.purchasedFloorTileCount || 0, savedPublicFloors.length),
    partitions: state.partitions.map((partition) => Object.assign({}, partition)),
    propPositions: Object.assign({}, state.propPositions),
    mahjongTables: state.mahjongTables.map((table) => Object.assign({}, table)),
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
      rotation: pc.rotation || 0,
      equipmentLevel: pc.equipmentLevel,
      sessionsServed: pc.sessionsServed,
      broken: pc.broken,
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

  state.cash = Number.isFinite(data.cash) ? Math.max(data.cash, 1000000) : state.cash;
  state.cafeLevel = Number.isFinite(data.cafeLevel) ? data.cafeLevel : state.cafeLevel;
  state.equipmentLevel = Number.isFinite(data.equipmentLevel) ? data.equipmentLevel : state.equipmentLevel;
  state.cleanliness = Number.isFinite(data.cleanliness) ? data.cleanliness : state.cleanliness;
  state.satisfaction = Number.isFinite(data.satisfaction) ? data.satisfaction : state.satisfaction;
  state.served = Number.isFinite(data.served) ? data.served : state.served;
  state.lost = Number.isFinite(data.lost) ? data.lost : state.lost;
  state.time = Number.isFinite(data.time) ? data.time : state.time;
  state.lastPayrollMonth = Number.isFinite(data.lastPayrollMonth) ? data.lastPayrollMonth : state.lastPayrollMonth;
  state.monthlyLedger = normalizeMonthlyLedger(data.monthlyLedger || data.dailyLedger, getMonthIndex());
  state.businessOpen = data.businessOpen !== undefined ? Boolean(data.businessOpen) : true;
  state.inventory = Object.assign({}, data.inventory || {});
  state.purchaseQuantities = Object.assign({}, data.purchaseQuantities || {});
  state.employees = Object.assign({}, state.employees, data.employees || {});
  state.nextAreaId = Number.isFinite(data.nextAreaId) ? data.nextAreaId : 2;
  state.rentedAreas = Array.isArray(data.rentedAreas) && data.rentedAreas.length
    ? data.rentedAreas.map((area) => {
      const restored = {
        id: area.id,
        typeId: area.typeId,
        name: area.name,
        pcCount: area.pcCount || 0,
        pcCapacity: Number.isFinite(area.pcCapacity) ? area.pcCapacity : getAreaCapacity(area),
        hourlyRate: Number.isFinite(area.hourlyRate) ? area.hourlyRate : getDefaultAreaRate(area.typeId),
        x: Number.isFinite(area.x) ? area.x : layout.room.x,
        y: Number.isFinite(area.y) ? area.y : layout.room.y,
        w: Number.isFinite(area.w) ? area.w : layout.room.w,
        h: Number.isFinite(area.h) ? area.h : layout.room.h
      };
      if (restored.id === 1) {
        restored.x = layout.room.x;
        restored.y = layout.room.y;
        restored.w = layout.room.w;
        restored.h = layout.room.h;
      }
      return restored;
    })
    : [{ id: 1, typeId: "livingRoom", name: "\u5ba2\u5385\u533a\u57df", pcCount: 4, pcCapacity: 8, hourlyRate: 5, x: layout.room.x, y: layout.room.y, w: layout.room.w, h: layout.room.h }];
  state.publicFloors = Array.isArray(data.publicFloors)
    ? data.publicFloors
      .map(normalizePublicFloor)
      .filter((floor, index, floors) => floors.findIndex((item) => item.x === floor.x && item.y === floor.y) === index)
    : [];
  state.purchasedFloorTileCount = Number.isFinite(data.purchasedFloorTileCount)
    ? Math.max(data.purchasedFloorTileCount, state.publicFloors.length)
    : state.publicFloors.length;
  state.partitions = Array.isArray(data.partitions)
    ? data.partitions.map(normalizePartition).filter(Boolean)
    : [];
  state.propPositions = data.propPositions && typeof data.propPositions === "object"
    ? Object.keys(data.propPositions).reduce((positions, key) => {
      const value = data.propPositions[key];
      if (value && Number.isFinite(value.x) && Number.isFinite(value.y)) {
        positions[key] = { x: value.x, y: value.y };
      }
      return positions;
    }, {})
    : {};
  applyPropPositions();
  state.mahjongTables = Array.isArray(data.mahjongTables)
    ? data.mahjongTables.map((table, index) => ({
      id: table.id || index + 1,
      areaId: Number.isFinite(table.areaId) ? table.areaId : 1,
      areaName: table.areaName || "\u68cb\u724c\u5ba4",
      x: Number.isFinite(table.x) ? table.x : layout.room.x + 80,
      y: Number.isFinite(table.y) ? table.y : layout.room.y + 120,
      w: Number.isFinite(table.w) ? table.w : MAHJONG_TABLE_SIZE.w,
      h: Number.isFinite(table.h) ? table.h : MAHJONG_TABLE_SIZE.h
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

function createDemand(guest) {
  const pc = guest ? layout.pcs[guest.pcId] : null;
  if (shouldCreateCompanionDemand(guest, pc)) {
    return {
      type: "companion",
      productId: "companionPlay",
      productName: "\u966a\u73a9",
      timer: DEMAND_WAIT_SECONDS,
      patience: DEMAND_WAIT_SECONDS,
      handled: false
    };
  }

  const id = pickWeightedDemandProductId(guest, pc);
  const product = getProductById(id);

  return {
    productId: id,
    productName: product.name,
    timer: DEMAND_WAIT_SECONDS,
    patience: DEMAND_WAIT_SECONDS,
    handled: false
  };
}

function tryCreateDemand(guest, dt) {
  if (guest.demand || guest.demandDone || guest.playTimer > guest.playDuration * 0.67) return;

  guest.demandRollTimer -= dt;
  if (guest.demandRollTimer > 0) return;

  guest.demandRollTimer = random(4, 7);
  const demandChance = guest.guestType ? guest.guestType.spendChance : 0.4;
  if (Math.random() < demandChance) {
    guest.demand = createDemand(guest);
    guest.demandDone = true;
    say(`\u987e\u5ba2 ${guest.id} \u60f3\u8981 ${guest.demand.productName}\uff0c\u70b9\u4ed6\u624b\u52a8\u9001\u8d27\u3002`);
  }
}

function updateDemand(guest, dt) {
  if (!guest.demand) return;

  guest.demand.timer -= dt;
  if (guest.demand.timer > 0) return;

  const satisfaction = Number.isFinite(state.satisfaction) ? state.satisfaction : 100;
  state.satisfaction = Math.max(0, satisfaction - 5);
  markSaveDirty();
  say(`\u987e\u5ba2 ${guest.id} \u7b49 ${guest.demand.productName} \u592a\u4e45\uff0c\u4e0d\u6ee1\u610f\u5730\u653e\u5f03\u4e86\u3002`);
  guest.demand = null;
}

function tryStartToiletEvent(guest, dt) {
  if (guest.toiletDone || guest.demand || guest.playTimer > guest.playDuration * 0.67) return;
  if (state.toilet.busyGuestId && state.toilet.busyGuestId !== guest.id) return;
  if (state.toilet.cleanWorkerId) return;

  guest.toiletRollTimer -= dt;
  if (guest.toiletRollTimer > 0) return;

  guest.toiletDone = true;
  if (Math.random() < 0.32) {
    state.toilet.busyGuestId = guest.id;
    guest.state = "toToilet";
    say(`\u987e\u5ba2 ${guest.id} \u53bb\u4e0a\u5395\u6240\u4e86\u3002`);
  }
}

function cancelAssignedDemandWorker(guest) {
  if (!guest || !guest.demand || !guest.demand.assignedWorkerId) return;
  const assignedWorker = state.workers.find((worker) => worker.id === guest.demand.assignedWorkerId);
  if (assignedWorker) {
    resetWorker(assignedWorker);
  }
  guest.demand.assignedWorkerId = null;
}

function serveGuestDemand(guest) {
  if (!guest || !guest.demand) return false;
  if (isCompanionDemand(guest.demand)) {
    cancelAssignedDemandWorker(guest);
    return serveCompanionDemand(guest, false);
  }

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

  cancelAssignedDemandWorker(guest);
  state.inventory[product.id] = stock - 1;
  state.cash += product.sellPrice;
  recordDailyRevenue("product", product.sellPrice, product.id);
  markSaveDirty();
  say(`\u9001\u51fa ${product.name}\uff0c\u989d\u5916\u6536\u5165 ${product.sellPrice} \u5143\u3002`);
  guest.demand = null;
  return true;
}

function getCompanionDemandRevenue(guest) {
  const pc = guest ? layout.pcs[guest.pcId] : null;
  return pc && pc.equipmentLevel >= 5 ? 138 : 88;
}

function serveCompanionDemand(guest, byWorker) {
  if (state.employees.companion < 1) {
    say("\u5e97\u91cc\u8fd8\u6ca1\u6709\u966a\u73a9\u5458\uff0c\u8fd9\u5355\u6682\u65f6\u63a5\u4e0d\u4e86\u3002");
    return true;
  }

  const revenue = getCompanionDemandRevenue(guest);
  state.cash += revenue;
  recordDailyRevenue("companion", revenue);
  markSaveDirty();
  say(`${byWorker ? "\u966a\u73a9\u5458" : "\u5df2"}\u5b8c\u6210\u966a\u73a9\u670d\u52a1\uff0c\u989d\u5916\u6536\u5165 ${revenue} \u5143\u3002`);
  guest.demand = null;
  return true;
}

function findTappedGuest(x, y) {
  const demandGuest = state.guests.find((guest) => (
    guest.state === "playing" &&
    guest.demand &&
    isPointInsideRect(x, y, getGuestDemandHitBounds(guest), 0)
  ));
  if (demandGuest) return demandGuest;

  return state.guests.find((guest) => (
    ["entering", "queueing", "checkingIn", "playing"].includes(guest.state) &&
    x >= guest.x - 28 &&
    x <= guest.x + 28 &&
    y >= guest.y - 64 &&
    y <= guest.y + 26
  ));
}

function getGuestDemandHitBounds(guest) {
  const label = getDemandBubbleLabel(guest);
  const bubbleW = Math.max(54, label.length * 15 + 18);
  return {
    x: guest.x - bubbleW / 2 - 8,
    y: guest.y - 68,
    w: bubbleW + 16,
    h: 44
  };
}

function getDemandBubbleLabel(guest) {
  if (!guest || !guest.demand) return "";
  const product = getProductById(guest.demand.productId);
  const baseLabel = product ? product.name : guest.demand.productName;
  return guest.demand.assignedWorkerId ? `${baseLabel}...` : baseLabel;
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

function findTappedBrokenPc(x, y) {
  return layout.pcs.find((pc) => (
    pc.broken &&
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

function isToiletNeedsCleaning() {
  return state.toilet.dirty || state.toilet.useCount > 0;
}

function cleanToilet() {
  if (!isToiletNeedsCleaning()) return false;

  state.toilet.dirty = false;
  state.toilet.useCount = 0;
  state.toilet.cleanWorkerId = null;
  state.cleanliness = Math.min(100, state.cleanliness + 12);
  markSaveDirty();
  say("\u5395\u6240\u5df2\u6e05\u6d01\uff0c\u5ba2\u4eba\u4f53\u9a8c\u597d\u4e86\u4e00\u70b9\u3002");
  return true;
}

function getToiletServicePoint() {
  const pairs = getAttachableAreas()
    .filter((area) => area.id !== layout.toilet.id && sharesWall(area, layout.toilet));
  for (let index = 0; index < pairs.length; index += 1) {
    const door = getDoorGeometryBetween(pairs[index], layout.toilet);
    if (door) {
      return getDoorInnerPoint(pairs[index], layout.toilet) || door.center;
    }
  }
  const toilet = layout.toilet;
  return {
    x: toilet.x + toilet.w / 2,
    y: toilet.y + toilet.h + 20
  };
}

function hasReachedToiletService(entity) {
  if (!entity) return false;
  // Only accept positions within the service point inside the toilet.
  // The old "doorArea.center <= 24" check could fire while the entity was still in the
  // main room (door center is on the wall boundary), causing invisible cleans.
  return distance(entity, getToiletServicePoint()) <= 20;
}

function startGuestUsingToilet(guest) {
  const servicePoint = getToiletServicePoint();
  guest.x = servicePoint.x;
  guest.y = servicePoint.y;
  guest.state = "usingToilet";
  guest.pathTimer = 0;
  guest.toiletTimer = random(4.2, 6.2);
  guest.detourPoint = null;
  guest.stuckTimer = 0;
  clearEntityNavigation(guest);
}

function pickWeightedDemandProductId(guest, pc) {
  const level = pc ? pc.equipmentLevel : state.equipmentLevel;
  const premiumBias = level >= 5 ? 3.3 : level >= 4 ? 2.4 : level >= 3 ? 1.45 : 1;
  const budgetBias = guest && guest.guestType && guest.guestType.id === "budgetHall" ? 1.6 : 1;
  const weights = {
    noodle: Math.max(1, 3.1 / premiumBias) * budgetBias,
    water: Math.max(1, 2.8 / premiumBias) * budgetBias,
    sausage: Math.max(1, 2.3 / premiumBias),
    betel: Math.max(0.7, 1.7 / premiumBias),
    cigarette: Math.max(0.6, 1.4 / premiumBias),
    snack: level >= 2 ? 1.4 * premiumBias : 0.4,
    drink: level >= 2 ? 1.5 * premiumBias : 0.5,
    meal: level >= 3 ? 1.15 * premiumBias : 0.25,
    milkTea: level >= 4 ? 1.25 * premiumBias : 0.15
  };
  const candidates = demandProductIds
    .map((id) => ({ id, product: getProductById(id), weight: weights[id] || 1 }))
    .filter((item) => item.product && state.cafeLevel >= item.product.unlockLevel && item.weight > 0);
  const pool = candidates.length
    ? candidates
    : demandProductIds.map((id) => ({ id, product: getProductById(id), weight: 1 })).filter((item) => item.product);
  const total = pool.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (let index = 0; index < pool.length; index += 1) {
    roll -= pool[index].weight;
    if (roll <= 0) return pool[index].id;
  }
  return pool[0].id;
}

function shouldCreateCompanionDemand(guest, pc) {
  if (!guest || !pc || pc.equipmentLevel < 4 || state.employees.companion < 1) return false;
  const chance = pc.equipmentLevel >= 5 ? 0.34 : 0.18;
  const guestBonus = guest.guestType && guest.guestType.id === "highSpec" ? 0.08 : 0;
  return Math.random() < chance + guestBonus;
}

function isCompanionDemand(demand) {
  return demand && demand.type === "companion";
}

function getRepairCost(pc) {
  return 60 + pc.equipmentLevel * 40;
}

function hasFreeRepairStaff() {
  return state.employees.repairman > 0;
}

function breakPc(pc) {
  pc.broken = true;
  pc.sessionsServed = 0;
  pc.repairWorkerId = null;
  markSaveDirty();
  say(`${pc.id + 1} \u53f7\u673a\u635f\u574f\uff0c\u6682\u65f6\u65e0\u6cd5\u63a5\u5f85\u5ba2\u4eba\u3002`);
}

function maybeBreakPc(pc) {
  if (!pc || pc.broken || pc.sessionsServed < DAMAGE_THRESHOLD_SESSIONS) return false;
  if (Math.random() < DAMAGE_CHANCE_AFTER_THRESHOLD) {
    breakPc(pc);
    return true;
  }
  return false;
}

function repairPc(pc, free = false) {
  if (!pc || !pc.broken) return false;

  const cost = getRepairCost(pc);
  const freeRepair = free || hasFreeRepairStaff();
  if (!freeRepair && state.cash < cost) {
    say(`\u7ef4\u4fee ${pc.id + 1} \u53f7\u673a\u9700\u8981 ${cost} \u5143\uff0c\u73b0\u91d1\u4e0d\u8db3\u3002`);
    return true;
  }

  if (!freeRepair) state.cash -= cost;
  pc.broken = false;
  pc.repairWorkerId = null;
  markSaveDirty();
  say(freeRepair ? `${pc.id + 1} \u53f7\u673a\u5df2\u514d\u8d39\u7ef4\u4fee\u3002` : `${pc.id + 1} \u53f7\u673a\u5df2\u7ef4\u4fee\uff0c\u82b1\u8d39 ${cost} \u5143\u3002`);
  return true;
}

function getCoreStaffCount() {
  return state.employees.cashier + state.employees.floor + state.employees.cleaner + state.employees.repairman;
}

function getEmployeeTotal() {
  return Object.keys(state.employees).reduce((total, key) => total + state.employees[key], 0);
}

function getStaffHireTotal(staff) {
  return staff.hireCost + staff.salary;
}

function getMonthlyPayrollTotal() {
  return staffTypes.reduce((total, staff) => total + (state.employees[staff.id] || 0) * staff.salary, 0);
}

function rebuildAfterLayoff() {
  rebuildWorkersFromEmployees();
  updateCafeLevel();
  markSaveDirty();
}

function layoffUntilPayrollAffordable() {
  const laidOff = [];
  const sorted = staffTypes.slice().sort((a, b) => b.salary - a.salary);

  while (getMonthlyPayrollTotal() > state.cash) {
    const target = sorted.find((staff) => (state.employees[staff.id] || 0) > 0);
    if (!target) break;
    state.employees[target.id] -= 1;
    laidOff.push(target.name);
  }

  if (laidOff.length > 0) rebuildAfterLayoff();
  return laidOff;
}

function processMonthlyPayroll() {
  const payroll = getMonthlyPayrollTotal();
  if (payroll <= 0) return;

  const laidOff = layoffUntilPayrollAffordable();
  const remainingPayroll = getMonthlyPayrollTotal();
  if (remainingPayroll <= 0) {
    if (laidOff.length > 0) {
      say(`\u73b0\u91d1\u4e0d\u8db3\uff0c${laidOff.join("\u3001")} \u79bb\u804c\u4e86\u3002`);
    }
    return;
  }

  state.cash -= remainingPayroll;
  markSaveDirty();
  say(laidOff.length > 0
    ? `\u73b0\u91d1\u4e0d\u8db3\uff0c${laidOff.join("\u3001")} \u79bb\u804c\uff1b\u5df2\u53d1\u5269\u4f59\u5de5\u8d44 ${remainingPayroll} \u5143\u3002`
    : `\u5df2\u9884\u53d1\u672c\u6708\u5de5\u8d44 ${remainingPayroll} \u5143\u3002`);
}

function updatePayroll() {
  const completedMonths = Math.floor(getDayIndex() / GAME_MONTH_DAYS);
  if (completedMonths <= state.lastPayrollMonth) return;

  state.lastPayrollMonth = completedMonths;
  processMonthlyPayroll();
  markSaveDirty();
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
  const candidates = layout.pcs.filter((pc) => tier.level > pc.equipmentLevel);
  const hasCandidate = candidates.length > 0;
  if (!hasCandidate) {
    say("\u6ca1\u6709\u53ef\u5347\u7ea7\u5230\u8be5\u6863\u4f4d\u7684\u673a\u5668\u3002");
    return;
  }

  const affordable = candidates.some((pc) => state.cash >= getPcUpgradeCost(pc, tier.level));
  if (!affordable) {
    const minCost = Math.min(...candidates.map((pc) => getPcUpgradeCost(pc, tier.level)));
    say(`\u73b0\u91d1\u4e0d\u8db3\uff0c\u5347\u7ea7\u5230 ${tier.name} \u81f3\u5c11\u9700\u8981 ${minCost} \u5143\u3002`);
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

  const cost = getPcUpgradeCost(pc, tier.level);
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

function startPcPurchase(tier) {
  const level = tier ? tier.level : 1;
  const cost = getNewPcCost(level);
  const maxPcs = getMaxOperationalPcs();
  if (layout.pcs.length >= maxPcs) {
    say(`\u5f53\u524d Lv.${state.cafeLevel} \u6700\u591a\u8fd0\u8425 ${maxPcs} \u53f0\u673a\uff0c\u63a5\u5f85\u66f4\u591a\u987e\u5ba2\u5347\u7ea7\u540e\u518d\u6269\u673a\u3002`);
    return;
  }
  if (state.cash < cost) {
    say(`\u73b0\u91d1\u4e0d\u8db3\uff0c\u65b0\u8d2d ${getEquipmentTier(level).name} \u9700\u8981 ${cost} \u5143\u3002`);
    return;
  }
  state.pendingPcPurchase = { equipmentLevel: level, cost };
  state.equipmentOpen = false;
  state.pendingEquipmentTierLevel = null;
  say(`\u5df2\u9009\u62e9\u65b0\u8d2d ${getEquipmentTier(level).name}\uff0c\u5728\u6709\u7a7a\u4f4d\u7684\u533a\u57df\u5185\u70b9\u51fb\u653e\u7f6e\u3002`);
}

function startMahjongPurchase() {
  if (state.cash < MAHJONG_TABLE_COST) {
    say(`\u73b0\u91d1\u4e0d\u8db3\uff0c\u8d2d\u4e70\u9ebb\u5c06\u684c\u9700\u8981 ${MAHJONG_TABLE_COST} \u5143\u3002`);
    return;
  }
  if (!state.rentedAreas.some((area) => area.typeId === "chessRoom")) {
    say("\u5148\u6269\u79df\u4e00\u95f4\u68cb\u724c\u5ba4\uff0c\u624d\u80fd\u6446\u653e\u9ebb\u5c06\u684c\u3002");
    return;
  }
  state.pendingMahjongPurchase = true;
  state.equipmentOpen = false;
  state.pendingEquipmentTierLevel = null;
  say(`\u5df2\u9009\u62e9\u9ebb\u5c06\u684c\uff0c\u8bf7\u5c06\u5730\u56fe\u4e2d\u5fc3\u5bf9\u51c6\u68cb\u724c\u5ba4\u5185\u7684\u7eff\u8272\u6846\u540e\u70b9\u51fb\u653e\u7f6e\u3002`);
}

function getPendingPcPurchaseTier() {
  return state.pendingPcPurchase && getEquipmentTier(state.pendingPcPurchase.equipmentLevel);
}

function getPcVisualBounds(pc) {
  const desk = getPcDeskBounds(pc);
  const seat = getPcSeatBounds(pc);
  const bounds = unionRects(desk, seat, 2);
  bounds.h += 10;
  return bounds;
}

function getPcSeatBounds(pc) {
  return {
    x: pc.seatX - 13,
    y: pc.seatY - 12,
    w: 26,
    h: 38
  };
}

function getPcSeatMovementBounds(pc) {
  const seat = getPcSeatBounds(pc);
  return {
    x: seat.x + 5,
    y: seat.y + 6,
    w: Math.max(8, seat.w - 10),
    h: Math.max(12, seat.h - 12)
  };
}

function getPcActualArea(pc) {
  if (!pc) return null;
  return getWalkableAreaAtPoint(pc.seatX, pc.seatY) ||
    getWalkableAreaAtPoint(pc.x + pc.w / 2, pc.y + pc.h / 2) ||
    getAreaById(pc.areaId) ||
    layout.room;
}

function unionRects(a, b, padding = 0) {
  const x = Math.min(a.x, b.x) - padding;
  const y = Math.min(a.y, b.y) - padding;
  const right = Math.max(a.x + a.w, b.x + b.w) + padding;
  const bottom = Math.max(a.y + a.h, b.y + b.h) + padding;
  return {
    x,
    y,
    w: right - x,
    h: bottom - y
  };
}

function getPcDefaultVisualBounds(pc) {
  return {
    x: pc.x - 10,
    y: pc.y - 8,
    w: pc.w + 20,
    h: pc.h + 76
  };
}

function getPcDeskBounds(pc) {
  return {
    x: pc.x - 5,
    y: pc.y - 8,
    w: pc.w + 10,
    h: pc.h + 20
  };
}

function getFixedPcPlacementObstacles() {
  const counter = layout.counter;
  return [
    { x: counter.x - 14, y: counter.y - 24, w: counter.w + 28, h: counter.h + 48 },
    { x: layout.entrance.x - 58, y: layout.entrance.y - 46, w: 112, h: 92 },
    layout.entranceCorridor
  ];
}

function isPcPlacementValid(area, pc) {
  if (!area || area.typeId === "toiletRoom" || getAreaCapacity(area) <= area.pcCount) return false;
  return isPcLayoutPositionValid(area, pc);
}

function isPcLayoutPositionValid(area, pc, ignorePcId = null) {
  const bounds = getPcVisualBounds(pc);
  const deskBounds = getPcDeskBounds(pc);
  const seatBounds = getPcSeatBounds(pc);
  const coreBounds = unionRects(deskBounds, seatBounds, 0);
  if (area.id === 1) {
    if (!isPcInsideHallNetwork(coreBounds)) return false;
  } else {
    if (!isPcPositionSafeForArea(pc, area)) return false;
    const safeArea = {
      x: area.x + 4,
      y: area.y + 18,
      w: area.w - 8,
      h: area.h - 18
    };
    if (bounds.x < safeArea.x || bounds.y < safeArea.y ||
        bounds.x + bounds.w > safeArea.x + safeArea.w ||
        bounds.y + bounds.h > safeArea.y + safeArea.h) {
      return false;
    }
  }

  const overlapsPc = layout.pcs.some((other) => {
    if (other.id === ignorePcId) return false;
    const otherDesk = getPcDeskBounds(other);
    const otherSeat = getPcSeatBounds(other);
    if (rectanglesOverlap(deskBounds, otherDesk, 1)) return true;
    if (rectanglesOverlap(seatBounds, otherDesk, -42)) return true;
    if (rectanglesOverlap(deskBounds, otherSeat, -42)) return true;
    return rectanglesOverlap(seatBounds, otherSeat, -20);
  });
  if (overlapsPc) return false;
  if (state.partitions.some((partition) => (
    rectanglesOverlap(deskBounds, partition, 1) ||
    rectanglesOverlap(seatBounds, partition, -2)
  ))) return false;

  const fixedObstacles = area.id === 1 ? getFixedPcPlacementObstacles() : [];
  const doorObstacles = getAreaDoorPlacementObstacles(area);
  const isPublicFloorPlacement = area.typeId === "publicFloor" || area.isPublicFloorExtension;
  const placementMinWidth = area.id === 1 || isPublicFloorPlacement ? 8 : PERSON_PATH_MIN_WIDTH;
  if (hasNarrowPlacementGap(coreBounds, area, { pcId: ignorePcId }, {
    checkAreaEdges: !isPublicFloorPlacement,
    minWidth: placementMinWidth
  })) {
    return false;
  }
  if (fixedObstacles.concat(doorObstacles).some((obstacle) => createsNarrowPathGap(bounds, obstacle))) {
    return false;
  }
  return !fixedObstacles.some((obstacle) => rectanglesOverlap(coreBounds, obstacle, 3)) &&
    !doorObstacles.some((obstacle) => rectanglesOverlap(coreBounds, obstacle, 2));
}

function isPcInsideHallNetwork(bounds) {
  const inset = 6;
  const points = [
    { x: bounds.x + inset, y: bounds.y + inset },
    { x: bounds.x + bounds.w - inset, y: bounds.y + inset },
    { x: bounds.x + inset, y: bounds.y + bounds.h - inset },
    { x: bounds.x + bounds.w - inset, y: bounds.y + bounds.h - inset },
    { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 }
  ];
  return points.every((point) => {
    const area = getWalkableAreaAtPoint(point.x, point.y);
    return area && (area.id === 1 || area.typeId === "publicFloor");
  });
}

function getAreaDoorPlacementObstacles(area) {
  const obstacles = [];
  if (!area) return obstacles;

  getDoorAreaPairs().forEach(([a, b]) => {
    if (a.id !== area.id && b.id !== area.id) return;
    const door = getDoorGeometryBetween(a, b);
    obstacles.push({
      x: door.rect.x - 8,
      y: door.rect.y - 8,
      w: door.rect.w + 16,
      h: door.rect.h + 16
    });
  });
  return obstacles;
}

function getPcAutoAlignment(x, y, ignorePcId = null) {
  let alignedX = x;
  let alignedY = y;
  let bestX = null;
  let bestY = null;

  layout.pcs.forEach((pc) => {
    if (pc.id === ignorePcId) return;
    const dx = Math.abs(x - pc.x);
    const dy = Math.abs(y - pc.y);
    if (dx <= PC_AUTO_ALIGN_DISTANCE && (!bestX || dx < bestX.distance)) {
      bestX = { value: pc.x, distance: dx };
    }
    if (dy <= PC_AUTO_ALIGN_DISTANCE && (!bestY || dy < bestY.distance)) {
      bestY = { value: pc.y, distance: dy };
    }
  });

  if (bestX) alignedX = bestX.value;
  if (bestY) alignedY = bestY.value;

  const vertical = Boolean(bestX);
  const horizontal = Boolean(bestY);
  const label = horizontal && vertical
    ? "\u5df2\u6a2a\u7ad6\u81ea\u52a8\u5bf9\u9f50"
    : horizontal
      ? "\u5df2\u6a2a\u5411\u81ea\u52a8\u5bf9\u9f50"
      : vertical
        ? "\u5df2\u7eb5\u5411\u81ea\u52a8\u5bf9\u9f50"
        : "";

  return { x: alignedX, y: alignedY, horizontal, vertical, label };
}

function getPcPurchaseCandidate(worldX, worldY) {
  const initialArea = getAreaAtPoint(worldX, worldY);
  if (!initialArea) {
    return { area: initialArea, pc: null, canPlace: false };
  }

  const alignment = getPcAutoAlignment(snapPcPosition(worldX - 21), snapPcPosition(worldY - 18));
  const area = getAreaAtPoint(alignment.x + 21, alignment.y + 18) || initialArea;
  if (area.pcCount >= getAreaCapacity(area)) {
    return { area, pc: null, canPlace: false, alignmentHint: alignment.label };
  }

  const x = alignment.x;
  const y = alignment.y;
  const pc = createPc(layout.pcs.length, x, y, area.id, area.name);
  pc.equipmentLevel = state.pendingPcPurchase ? state.pendingPcPurchase.equipmentLevel : 1;
  return {
    area,
    pc,
    canPlace: isPcPlacementValid(area, pc),
    alignmentHint: alignment.label
  };
}

function placePendingPcPurchase(worldX, worldY) {
  const pending = state.pendingPcPurchase;
  if (!pending) return false;

  const maxPcs = getMaxOperationalPcs();
  if (layout.pcs.length >= maxPcs) {
    say(`\u5f53\u524d Lv.${state.cafeLevel} \u6700\u591a\u8fd0\u8425 ${maxPcs} \u53f0\u673a\uff0c\u63a5\u5f85\u66f4\u591a\u987e\u5ba2\u5347\u7ea7\u540e\u518d\u6269\u673a\u3002`);
    state.pendingPcPurchase = null;
    return true;
  }
  if (state.cash < pending.cost) {
    say(`\u73b0\u91d1\u4e0d\u8db3\uff0c\u65b0\u8d2d\u7535\u8111\u9700\u8981 ${pending.cost} \u5143\u3002`);
    state.pendingPcPurchase = null;
    return true;
  }

  const candidate = getPcPurchaseCandidate(worldX, worldY);
  if (!candidate.canPlace || !candidate.area || !candidate.pc) {
    say("\u8fd9\u91cc\u653e\u4e0d\u4e0b\u7535\u8111\uff0c\u9700\u8981\u907f\u5f00\u5899\u4f53\u548c\u8bbe\u5907\uff0c\u5e76\u7559\u51fa\u4eba\u7269\u901a\u9053\u3002");
    return true;
  }

  state.cash -= pending.cost;
  const owningArea = getPersistentAreaForPlacement(candidate.area) || getAreaById(candidate.pc.areaId);
  if (owningArea) owningArea.pcCount += 1;
  candidate.pc.areaId = owningArea ? owningArea.id : candidate.pc.areaId;
  candidate.pc.areaName = candidate.pc.areaId === 1 ? "\u5ba2\u5385" : candidate.area.name;
  layout.pcs.push(candidate.pc);
  clearAllEntityNavigation();
  rescueEntitiesFromNewPc(candidate.pc);
  state.pendingPcPurchase = null;
  updateEquipmentLevel();
  updateCafeLevel();
  markSaveDirty();
  const alignNote = candidate.alignmentHint ? `\uff08${candidate.alignmentHint}\uff09` : "";
  say(`${candidate.area.name} \u5df2\u65b0\u8d2d ${getEquipmentTier(candidate.pc.equipmentLevel).name}\uff0c\u7f16\u53f7 ${candidate.pc.id + 1}${alignNote}\u3002`);
  return true;
}

function placePendingPcPurchaseAtPreview() {
  if (!state.pendingPcPurchase) return false;
  const center = getViewportWorldCenter();
  return placePendingPcPurchase(center.x, center.y);
}

function getMahjongPurchaseCandidate(worldX, worldY) {
  const area = getAreaAtPoint(worldX, worldY);
  const table = {
    id: state.mahjongTables.length + 1,
    areaId: area ? area.id : null,
    areaName: area ? area.name : "",
    x: snapPcPosition(worldX - MAHJONG_TABLE_SIZE.w / 2),
    y: snapPcPosition(worldY - MAHJONG_TABLE_SIZE.h / 2),
    w: MAHJONG_TABLE_SIZE.w,
    h: MAHJONG_TABLE_SIZE.h
  };
  return {
    area,
    table,
    canPlace: isMahjongPlacementValid(area, table)
  };
}

function isMahjongPlacementValid(area, table) {
  if (!area || area.typeId !== "chessRoom") return false;
  const safeArea = {
    x: area.x + 10,
    y: area.y + 32,
    w: area.w - 20,
    h: area.h - 42
  };
  if (table.x < safeArea.x || table.y < safeArea.y ||
      table.x + table.w > safeArea.x + safeArea.w ||
      table.y + table.h > safeArea.y + safeArea.h) {
    return false;
  }
  const overlapsPc = layout.pcs.some((pc) => rectanglesOverlap(table, getPcVisualBounds(pc), 2));
  const overlapsTable = state.mahjongTables.some((other) => rectanglesOverlap(table, other, 4));
  const overlapsPartition = state.partitions.some((partition) => rectanglesOverlap(table, partition, 4));
  const blocksDoor = getAreaDoorPlacementObstacles(area).some((obstacle) => rectanglesOverlap(table, obstacle, 4));
  const narrowGap = hasNarrowPlacementGap(table, area, {}, { checkAreaEdges: true }) ||
    getAreaDoorPlacementObstacles(area).some((obstacle) => createsNarrowPathGap(table, obstacle));
  return !overlapsPc && !overlapsTable && !overlapsPartition && !blocksDoor && !narrowGap;
}

function placePendingMahjongPurchase(worldX, worldY) {
  if (!state.pendingMahjongPurchase) return false;

  if (state.cash < MAHJONG_TABLE_COST) {
    say(`\u73b0\u91d1\u4e0d\u8db3\uff0c\u8d2d\u4e70\u9ebb\u5c06\u684c\u9700\u8981 ${MAHJONG_TABLE_COST} \u5143\u3002`);
    state.pendingMahjongPurchase = false;
    return true;
  }

  const candidate = getMahjongPurchaseCandidate(worldX, worldY);
  if (!candidate.canPlace) {
    say("\u9ebb\u5c06\u684c\u9700\u8981\u653e\u5728\u68cb\u724c\u5ba4\u5185\uff0c\u5e76\u907f\u5f00\u95e8\u6d1e\u548c\u8bbe\u5907\uff0c\u7559\u51fa\u901a\u9053\u3002");
    return true;
  }

  state.cash -= MAHJONG_TABLE_COST;
  state.mahjongTables.push(candidate.table);
  state.pendingMahjongPurchase = false;
  markSaveDirty();
  say(`${candidate.area.name} \u5df2\u6446\u653e\u9ebb\u5c06\u684c\u3002`);
  return true;
}

function placePendingMahjongPurchaseAtPreview() {
  const center = getViewportWorldCenter();
  return placePendingMahjongPurchase(center.x, center.y);
}

function createWorker(type) {
  const baseHome = layout.staffHome[type] || layout.staffHome.floor;
  const homeIndex = state.workers.filter((worker) => worker.type === type).length;
  const worker = {
    id: state.workerId++,
    type,
    x: baseHome.x,
    y: baseHome.y,
    homeIndex,
    stuckTimer: 0,
    pathTimer: 0,
    state: "station",
    taskTimer: 0,
    targetPcId: null,
    targetGuestId: null,
    targetProductId: null,
    idleTarget: null,
    idleTimer: Math.random() * 6
  };
  const home = getWorkerHome(worker);
  worker.x = home.x;
  worker.y = home.y;
  return worker;
}

function getWorkerHome(worker) {
  const room = layout.room;
  const counter = layout.counter;
  const index = worker.homeIndex || 0;

  function getWallPosition(offsetIndex) {
    const walls = [
      { x: room.x + 48, y: room.y + 120 },
      { x: room.x + room.w - 48, y: room.y + 120 },
      { x: room.x + 48, y: room.y + room.h - 60 },
      { x: room.x + room.w - 48, y: room.y + room.h - 60 },
      { x: room.x + room.w * 0.3, y: room.y + 120 },
      { x: room.x + room.w * 0.7, y: room.y + 120 },
      { x: room.x + room.w * 0.3, y: room.y + room.h - 60 },
      { x: room.x + room.w * 0.7, y: room.y + room.h - 60 }
    ];
    return walls[offsetIndex % walls.length];
  }

  const stationSets = {
    cashier: [
      { x: counter.x + counter.w - 22, y: counter.y + counter.h - 8 },
      { x: counter.x + counter.w - 48, y: counter.y + counter.h - 8 }
    ],
    manager: [getManagerCounterStation()],
    repairman: [
      { x: counter.x - 26, y: counter.y + counter.h - 4 },
      { x: counter.x - 48, y: counter.y + counter.h + 18 }
    ],
    companion: [
      { x: room.x + room.w - 64, y: room.y + 58 }
    ],
    cleaner: index === 0
      ? [{ x: counter.x + counter.w + 10, y: counter.y + counter.h + 24 }]
      : [getWallPosition(index)],
    floor: index === 0
      ? [{ x: counter.x + counter.w + 54, y: counter.y + counter.h + 24 }]
      : [getWallPosition(index + 4)]
  };
  const stations = stationSets[worker.type] || [{ x: counter.x + counter.w + 12, y: counter.y + counter.h - 8 }];
  const safeStations = stations.filter((station) => !isStationTooCloseToToilet(station));
  const usableStations = safeStations.length > 0 ? safeStations : stations;
  return usableStations[index % usableStations.length];
}

function getWorkerPatrolPoint(worker, offset) {
  const patrolPoints = getWorkerPatrolPoints();
  if (!patrolPoints.length) {
    const room = layout.room;
    return getAreaSafePoint(room, room.x + room.w / 2, room.y + room.h / 2);
  }
  const step = Math.floor((state.time || 0) / 5 + (worker.homeIndex || 0) * 2 + offset) % patrolPoints.length;
  return patrolPoints[step];
}

function getWorkerPatrolPoints() {
  const patrolAreas = [layout.room].concat(state.publicFloors || []);
  const points = [];
  patrolAreas.forEach((area, areaIndex) => {
    [
      { x: area.x + area.w * 0.2, y: area.y + area.h * 0.24 },
      { x: area.x + area.w * 0.5, y: area.y + area.h * 0.24 },
      { x: area.x + area.w * 0.8, y: area.y + area.h * 0.24 },
      { x: area.x + area.w * 0.8, y: area.y + area.h * 0.52 },
      { x: area.x + area.w * 0.8, y: area.y + area.h * 0.78 },
      { x: area.x + area.w * 0.5, y: area.y + area.h * 0.78 },
      { x: area.x + area.w * 0.2, y: area.y + area.h * 0.78 },
      { x: area.x + area.w * 0.2, y: area.y + area.h * 0.52 },
      { x: area.x + area.w * 0.5, y: area.y + area.h * 0.52 }
    ].forEach((point) => {
      const safe = getAreaSafePoint(area, point.x, point.y);
      if (!safe) return;
      if (isStationTooCloseToToilet(safe)) return;
      if (isPointTooCloseToPlacementSolid(safe, PERSON_PATH_MIN_WIDTH)) return;
      if (isWalkBlockingPoint(safe.x, safe.y)) return;
      if (!getWalkableAreaAtPoint(safe.x, safe.y)) return;
      const tooCloseToPc = layout.pcs.some((pc) => {
        const bounds = getPcDeskBounds(pc);
        const cx = bounds.x + bounds.w / 2;
        const cy = bounds.y + bounds.h / 2;
        return Math.hypot(safe.x - cx, safe.y - cy) < 60;
      });
      if (tooCloseToPc) return;
      points.push(Object.assign({ areaIndex }, safe));
    });
  });
  return points;
}

function shouldWorkerRoam(worker) {
  return worker && ["companion"].includes(worker.type);
}

function getWorkerRoamTarget(worker) {
  if (!shouldWorkerRoam(worker)) return getWorkerHome(worker);
  const points = getWorkerPatrolPoints();
  if (!points.length) return getWorkerHome(worker);
  const current = worker.idleTarget;
  const currentIndex = current
    ? points.findIndex((point) => Math.hypot(point.x - current.x, point.y - current.y) < 2)
    : -1;
  const offset = (worker.homeIndex || 0) % points.length;
  const nextIndex = currentIndex >= 0
    ? (currentIndex + 1) % points.length
    : (worker.id + offset + Math.floor((state.time || 0) / 7)) % points.length;
  worker.idleTarget = points[nextIndex];
  worker.idleTimer = 0;
  return worker.idleTarget;
}

function isStationTooCloseToToilet(point) {
  const toilet = layout.toilet;
  return point.x >= toilet.x - 44 &&
    point.x <= toilet.x + toilet.w + 44 &&
    point.y >= toilet.y - 44 &&
    point.y <= toilet.y + toilet.h + 44;
}

function canWorkerClean(worker) {
  return worker.type === "floor" || worker.type === "cleaner";
}

function canWorkerRepair(worker) {
  return worker.type === "repairman";
}

function canWorkerDeliver(worker) {
  return worker.type === "cashier" || worker.type === "manager" || worker.type === "companion";
}

function getWorkerFreeMovePcIds(worker) {
  return worker && (worker.type === "cleaner" || worker.type === "floor" || worker.type === "companion")
    ? layout.pcs.map((pc) => pc.id)
    : [];
}

function getWorkerLabel(type) {
  return {
    cashier: "\u6536\u94f6",
    floor: "\u5916\u573a",
    cleaner: "\u4fdd\u6d01",
    repairman: "\u7ef4\u4fee",
    manager: "\u5e97\u957f",
    companion: "\u966a\u73a9"
  }[type] || "\u5458\u5de5";
}

function getIdleWorkers() {
  return state.workers.filter((worker) => worker.state === "station");
}

function sanitizeWorkerTaskLocks() {
  layout.pcs.forEach((pc) => {
    if (!pc.dirty) {
      pc.cleanWorkerId = null;
      return;
    }
    if (pc.cleanWorkerId && !state.workers.some((worker) => (
      worker.id === pc.cleanWorkerId &&
      worker.targetPcId === pc.id &&
      (worker.state === "toCleanPc" || worker.state === "cleaningPc")
    ))) {
      pc.cleanWorkerId = null;
    }
  });

  if (!isToiletNeedsCleaning()) {
    state.toilet.cleanWorkerId = null;
  } else if (state.toilet.cleanWorkerId && !state.workers.some((worker) => (
    worker.id === state.toilet.cleanWorkerId &&
    (worker.state === "toCleanToilet" || worker.state === "cleaningToilet")
  ))) {
    state.toilet.cleanWorkerId = null;
  }

  if (state.toilet.busyGuestId && !state.guests.some((guest) => (
    guest.id === state.toilet.busyGuestId &&
    (guest.state === "toToilet" || guest.state === "usingToilet")
  ))) {
    state.toilet.busyGuestId = null;
  }

  if (state.floorCleaningWorkerId && !state.workers.some((worker) => (
    worker.id === state.floorCleaningWorkerId &&
    (worker.state === "toMopFloor" || worker.state === "moppingFloor")
  ))) {
    state.floorCleaningWorkerId = null;
  }
}

function calculateCafeLevel() {
  return getCafeLevelForServed(state.served);
}

function updateCafeLevel() {
  const nextLevel = calculateCafeLevel();
  if (nextLevel > state.cafeLevel) {
    say(`\u7f51\u5427\u5347\u5230 Lv.${nextLevel}\uff0c\u65b0\u529f\u80fd\u5c06\u9010\u6b65\u89e3\u9501\u3002`);
  }
  state.cafeLevel = nextLevel;
}

function getStaffRequirement(staff) {
  if (staff.id === "manager") {
    return state.employees.cashier >= 1 &&
      state.employees.floor >= 1 &&
      state.employees.cleaner >= 1 &&
      state.employees.repairman >= 1
      ? ""
      : "\u9700\u6536\u94f6+\u5916\u573a+\u4fdd\u6d01+\u7ef4\u4fee\u5404 1 \u4eba";
  }

  if (staff.id === "companion") {
    if (state.employees.manager < 1) return "\u9700\u5148\u62db\u8058\u5e97\u957f";
    if (state.cafeLevel < 3) return "\u9700\u7f51\u5427 Lv.3";
  }

  return "";
}

function canHireStaff(staff) {
  return !getStaffRequirement(staff) && state.cash >= getStaffHireTotal(staff);
}

function hireStaff(staff) {
  const requirement = getStaffRequirement(staff);
  if (requirement) {
    say(`${staff.name}\u62db\u8058\u5931\u8d25\uff1a${requirement}\u3002`);
    return;
  }

  const totalCost = getStaffHireTotal(staff);
  if (state.cash < totalCost) {
    say(`\u73b0\u91d1\u4e0d\u8db3\uff0c\u62db\u8058 ${staff.name} \u9700\u8981 ${totalCost} \u5143\uff08\u542b\u9996\u6708\u5de5\u8d44\uff09\u3002`);
    return;
  }

  state.cash -= totalCost;
  state.employees[staff.id] += 1;
  state.workers.push(createWorker(staff.id));
  updateCafeLevel();
  markSaveDirty();
  say(`\u5df2\u62db\u8058 ${staff.name}\uff0c\u5df2\u9884\u53d1\u9996\u6708\u5de5\u8d44\u3002`);
}

function isPointInRect(x, y, button) {
  return button &&
    x >= button.x &&
    x <= button.x + button.w &&
    y >= button.y &&
    y <= button.y + button.h;
}

function closePanels() {
  const keepFloorLayoutSession = Boolean(state.floorLayoutSession);
  state.procurementOpen = false;
  state.warehouseOpen = false;
  state.hiringOpen = false;
  state.equipmentOpen = false;
  state.expansionOpen = false;
  state.layoutOpen = false;
  state.ledgerOpen = false;
  state.pricingOpen = false;
  state.settingsOpen = false;
  state.pendingEquipmentTierLevel = null;
  state.pendingExpansion = null;
  state.pendingPartitionTypeId = null;
  state.pendingPcPurchase = null;
  state.pendingMahjongPurchase = false;
  state.pcActionMenu = null;
  state.partitionActionMenu = null;
  state.propActionMenu = null;
  state.pcUpgradeMenu = null;
  state.confirmDialog = null;
  state.layoutToolActive = keepFloorLayoutSession;
  state.selectedAreaId = null;
  state.selectedPcId = null;
  state.selectedPartitionId = null;
  state.selectedPropId = null;
  state.layoutMode = keepFloorLayoutSession ? "floor" : "off";
}

function clearActionButtons() {
  ui.procurementButton = null;
  ui.warehouseButton = null;
  ui.hiringButton = null;
  ui.equipmentButton = null;
  ui.expansionButton = null;
  ui.layoutButton = null;
  ui.settingsButton = null;
  ui.closeLedgerButton = null;
  ui.purchaseMahjongButton = null;
  ui.rotatePartitionButton = null;
}

function screenToWorld(x, y) {
  return {
    x: x + state.camera.x,
    y: y + state.camera.y
  };
}

function clampCamera() {
  const bounds = getExpandedWorldBounds();
  const minX = bounds.minX + 40;
  const minY = bounds.minY + 40;
  const maxX = Math.max(minX, bounds.maxX - view.width + 120);
  const maxY = Math.max(minY, bounds.maxY - (view.height - ACTION_BAR_HEIGHT) + HUD_HEIGHT + 120);
  state.camera.x = Math.max(minX, Math.min(maxX, state.camera.x));
  state.camera.y = Math.max(minY, Math.min(maxY, state.camera.y));
}

function isAnyPanelOpen() {
  return state.settingsOpen ||
    state.confirmDialog ||
    state.pcUpgradeMenu ||
    state.expansionOpen ||
    state.layoutOpen ||
    state.ledgerOpen ||
    state.pricingOpen ||
    state.procurementOpen ||
    state.warehouseOpen ||
    state.hiringOpen ||
    state.equipmentOpen;
}

function openConfirmDialog(title, body, onConfirm, onCancel = null) {
  state.confirmDialog = { title, body, onConfirm, onCancel };
}

function getPcPurchaseValue(level) {
  return getNewPcCost(level);
}

function getPcUpgradeCost(pc, targetLevel) {
  if (!pc || targetLevel <= pc.equipmentLevel) return 0;
  const targetValue = getPcPurchaseValue(targetLevel);
  const tradeIn = Math.floor(getPcPurchaseValue(pc.equipmentLevel) / 2);
  return Math.max(0, targetValue - tradeIn);
}

function getPcSellValue(pc) {
  return Math.floor(getPcPurchaseValue(pc.equipmentLevel) / 2);
}

function getPcHourlyRate(pc) {
  return pc ? getEquipmentHourlyRate(pc.equipmentLevel) : getEquipmentHourlyRate(1);
}

function openPcActionMenu(pc, screenX, screenY) {
  if (!pc) return;
  state.partitionActionMenu = null;
  state.propActionMenu = null;
  state.pcActionMenu = {
    pcId: pc.id,
    x: screenX,
    y: screenY
  };
}

function openPartitionActionMenu(partition, screenX, screenY) {
  if (!partition) return;
  state.pcActionMenu = null;
  state.propActionMenu = null;
  state.partitionActionMenu = {
    partitionId: partition.id,
    x: screenX,
    y: screenY
  };
}

function openPropActionMenu(prop, screenX, screenY) {
  if (!prop) return;
  state.pcActionMenu = null;
  state.partitionActionMenu = null;
  state.propActionMenu = {
    propId: prop.id,
    x: screenX,
    y: screenY
  };
}

function getPcFromActionMenu(menu = state.pcActionMenu) {
  if (!menu) return null;
  return layout.pcs.find((pc) => pc.id === menu.pcId) || null;
}

function getPartitionFromActionMenu(menu = state.partitionActionMenu) {
  if (!menu) return null;
  return state.partitions.find((partition) => partition.id === menu.partitionId) || null;
}

function getPropFromActionMenu(menu = state.propActionMenu) {
  if (!menu) return null;
  return getMovablePropRect(menu.propId);
}

function handlePcActionMenuButton(button) {
  const pc = button.pc;
  if (!pc) {
    state.pcActionMenu = null;
    return;
  }

  if (button.action === "info") {
    state.pcInfoBubble = { pcId: pc.id, timer: 3 };
    state.pcActionMenu = null;
    return;
  }

  if (button.action === "upgrade") {
    if (pc.occupiedBy) {
      say("\u8fd9\u53f0\u673a\u6709\u4eba\u4e0a\u673a\uff0c\u5148\u7b49\u5ba2\u4eba\u4e0b\u673a\u518d\u5347\u7ea7\u3002");
    } else if (!getUpgradeableTiers(pc).length) {
      say(`${pc.id + 1} \u53f7\u673a\u5df2\u662f\u5f53\u524d\u6700\u9ad8\u914d\u7f6e\u3002`);
    } else {
      state.pcUpgradeMenu = { pcId: pc.id };
    }
    state.pcActionMenu = null;
    return;
  }

  if (button.action === "move") {
    if (pc.occupiedBy) {
      say("\u8fd9\u53f0\u673a\u6709\u4eba\u4e0a\u673a\uff0c\u5148\u7b49\u5ba2\u4eba\u4e0b\u673a\u518d\u79fb\u52a8\u3002");
    } else {
      state.layoutToolActive = true;
      state.layoutMode = "pc";
      state.selectedPcId = pc.id + 1;
      say(`${pc.id + 1} \u53f7\u673a\u5df2\u9009\u4e2d\uff0c\u62d6\u52a8\u5730\u56fe\u5bf9\u51c6\u7eff\u8272\u6846\u540e\u70b9\u51fb\u653e\u7f6e\u3002`);
    }
    state.pcActionMenu = null;
    return;
  }

  if (button.action === "sell") {
    if (!canSellPc(pc)) {
      say("\u8fd9\u53f0\u673a\u6b63\u5728\u88ab\u4f7f\u7528\u6216\u6709\u4efb\u52a1\u5360\u7528\uff0c\u6682\u65f6\u4e0d\u80fd\u51fa\u552e\u3002");
    } else {
      const value = getPcSellValue(pc);
      openConfirmDialog(
        "\u51fa\u552e\u8bbe\u5907",
        `\u786e\u5b9a\u4ee5 ${value} \u5143\u51fa\u552e ${pc.id + 1} \u53f7\u673a\u5417\uff1f`,
        () => sellPc(pc)
      );
    }
    state.pcActionMenu = null;
  }
}

function handlePartitionActionMenuButton(button) {
  const partition = button.partition;
  if (!partition) {
    state.partitionActionMenu = null;
    return;
  }

  if (button.action === "move") {
    state.layoutToolActive = true;
    state.layoutMode = "partitionMove";
    state.selectedPartitionId = partition.id;
    state.partitionActionMenu = null;
    say("\u9694\u65ad\u5df2\u9009\u4e2d\uff0c\u62d6\u52a8\u5730\u56fe\u5bf9\u51c6\u7eff\u8272\u6846\u540e\u70b9\u51fb\u653e\u7f6e\u3002");
    return;
  }

  if (button.action === "rotate") {
    rotatePartition(partition);
    state.partitionActionMenu = null;
    return;
  }

  if (button.action === "sell") {
    const type = getPartitionType(partition.typeId);
    const value = Math.floor(getPartitionCost(type) / 2);
    openConfirmDialog(
      "\u51fa\u552e\u9694\u65ad",
      `\u786e\u5b9a\u4ee5 ${value} \u5143\u51fa\u552e ${type.name} \u5417\uff1f`,
      () => sellPartition(partition)
    );
    state.partitionActionMenu = null;
  }
}

function handlePropActionMenuButton(button) {
  const prop = button.prop;
  if (!prop) {
    state.propActionMenu = null;
    return;
  }

  if (button.action === "ledger") {
    state.ledgerOpen = true;
    state.propActionMenu = null;
    return;
  }

  if (button.action === "warehouse") {
    closePanels();
    state.warehouseOpen = true;
    state.propActionMenu = null;
    return;
  }

  if (button.action === "procurement") {
    closePanels();
    state.procurementOpen = true;
    state.propActionMenu = null;
    return;
  }

  if (button.action === "move") {
    state.layoutToolActive = true;
    state.layoutMode = "propMove";
    state.selectedPropId = prop.id;
    state.propActionMenu = null;
    say(`${prop.name}\u5df2\u9009\u4e2d\uff0c\u62d6\u52a8\u5730\u56fe\u5bf9\u51c6\u7eff\u8272\u6846\u540e\u70b9\u51fb\u653e\u7f6e\u3002`);
  }
}

function confirmPcUpgrade(pc, tier) {
  if (!pc || !tier) {
    state.pcUpgradeMenu = null;
    return;
  }

  const cost = getPcUpgradeCost(pc, tier.level);
  state.pcUpgradeMenu = null;
  if (state.cash < cost) {
    say(`\u73b0\u91d1\u4e0d\u8db3\uff0c\u5347\u7ea7\u9700\u8981 ${cost} \u5143\u3002`);
    return;
  }
  openConfirmDialog(
    "\u5347\u7ea7\u8bbe\u5907",
    `\u786e\u5b9a\u82b1\u8d39 ${cost} \u5143\u5c06 ${pc.id + 1} \u53f7\u673a\u5347\u7ea7\u5230 ${tier.name} \u5417\uff1f\u5df2\u6309\u65e7\u8bbe\u5907\u534a\u4ef7\u62b5\u6263\u3002`,
    () => upgradePcEquipment(pc, tier)
  );
}

function cancelLayoutTool() {
  if (state.layoutMode === "floor" && state.floorLayoutSession) {
    finishFloorLayoutSession();
    return;
  }
  state.layoutToolActive = false;
  state.selectedAreaId = null;
  state.selectedPcId = null;
  state.selectedPartitionId = null;
  state.selectedPropId = null;
  state.layoutMode = "off";
  rescueEntitiesOutsideWalkableArea();
  say("\u5df2\u9000\u51fa\u5e03\u5c40\u64cd\u4f5c\u3002");
}

function cancelPendingPurchase() {
  state.pendingPcPurchase = null;
  state.pendingMahjongPurchase = false;
  say("\u5df2\u9000\u51fa\u8d2d\u4e70\u653e\u7f6e\u3002");
}

function getUpgradeableTiers(pc) {
  return equipmentTiers.filter((tier) => tier.level > pc.equipmentLevel);
}

function canSellPc(pc) {
  if (!pc || pc.occupiedBy) return false;
  const hasGuestTarget = state.guests.some((guest) => guest.pcId === pc.id);
  const hasWorkerTarget = state.workers.some((worker) => worker.targetPcId === pc.id);
  return !hasGuestTarget && !hasWorkerTarget;
}

function sellPc(pc) {
  if (!canSellPc(pc)) {
    say("\u8fd9\u53f0\u673a\u6b63\u5728\u88ab\u4f7f\u7528\u6216\u6709\u4efb\u52a1\u5360\u7528\uff0c\u6682\u65f6\u4e0d\u80fd\u51fa\u552e\u3002");
    return;
  }

  const value = getPcSellValue(pc);
  const area = getAreaById(pc.areaId);
  const removedId = pc.id;
  layout.pcs = layout.pcs.filter((item) => item.id !== pc.id);
  if (area) {
    area.pcCount = Math.max(0, (area.pcCount || 0) - 1);
  }
  renumberPcs(removedId);
  state.selectedPcId = null;
  state.pcInfoBubble = null;
  state.pcActionMenu = null;
  state.pcUpgradeMenu = null;
  state.cash += value;
  updateEquipmentLevel();
  updateCafeLevel();
  markSaveDirty();
  say(`\u5df2\u51fa\u552e ${removedId + 1} \u53f7\u673a\uff0c\u56de\u6536 ${value} \u5143\u3002`);
}

function handleBuildOffer(offer) {
  if (!offer) return;
  state.expansionOpen = false;
  state.selectedAreaId = null;
  state.selectedPcId = null;
  state.pendingPartitionTypeId = null;
  if (offer.kind === "floor") {
    enterFloorLayoutMode();
    say(`\u5df2\u8fdb\u5165\u94fa\u5730\u7816\u6a21\u5f0f\uff0c\u6bcf\u5757 ${PUBLIC_FLOOR_COST} \u5143\uff0c\u70b9\u51fb\u5730\u56fe\u94fa\u8bbe\u3002`);
    return;
  }
  if (offer.kind === "partition") {
    const type = getPartitionType(offer.typeId);
    if (!type) return;
    state.pendingPartitionTypeId = type.id;
    state.pendingPartitionOrientation = "horizontal";
    state.layoutToolActive = true;
    state.layoutMode = "partition";
    say(`\u5df2\u9009\u62e9 ${type.name}\uff0c\u53ef\u70b9\u51fb\u65cb\u8f6c 90\u00b0 \u5207\u6362\u6a2a\u7ad6\uff0c\u5bf9\u51c6\u540e\u70b9\u51fb\u6446\u653e\u3002`);
  }
}

function renumberPcs(removedId = null) {
  const idMap = {};
  layout.pcs.forEach((pc, index) => {
    idMap[pc.id] = index;
    pc.id = index;
  });

  state.guests.forEach((guest) => {
    if (guest.pcId === removedId) guest.pcId = null;
    else if (Object.prototype.hasOwnProperty.call(idMap, guest.pcId)) guest.pcId = idMap[guest.pcId];
  });

  state.workers.forEach((worker) => {
    if (worker.targetPcId === removedId) worker.targetPcId = null;
    else if (Object.prototype.hasOwnProperty.call(idMap, worker.targetPcId)) worker.targetPcId = idMap[worker.targetPcId];
  });
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
  playClickSound();

  if (state.confirmDialog) {
    if (isPointInRect(x, y, ui.confirmNoButton)) {
      const dialog = state.confirmDialog;
      state.confirmDialog = null;
      if (dialog && typeof dialog.onCancel === "function") {
        dialog.onCancel();
      }
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

  if (state.pcInfoBubble && isPointInRect(x, y, ui.pcInfoBubbleButton)) {
    state.pcInfoBubble = null;
    return;
  }

  if (state.pcUpgradeMenu) {
    const upgradeButton = ui.pcUpgradeButtons.find((button) => isPointInRect(x, y, button));
    if (upgradeButton) {
      confirmPcUpgrade(upgradeButton.pc, upgradeButton.tier);
      return;
    }
    state.pcUpgradeMenu = null;
    return;
  }

  if (state.pcActionMenu) {
    const pcActionButton = ui.pcActionButtons.find((button) => isPointInRect(x, y, button));
    if (pcActionButton) {
      handlePcActionMenuButton(pcActionButton);
      return;
    }
    state.pcActionMenu = null;
    return;
  }

  if (state.partitionActionMenu) {
    const partitionActionButton = ui.partitionActionButtons.find((button) => isPointInRect(x, y, button));
    if (partitionActionButton) {
      handlePartitionActionMenuButton(partitionActionButton);
      return;
    }
    state.partitionActionMenu = null;
    return;
  }

  if (state.propActionMenu) {
    const propActionButton = ui.propActionButtons.find((button) => isPointInRect(x, y, button));
    if (propActionButton) {
      handlePropActionMenuButton(propActionButton);
      return;
    }
    state.propActionMenu = null;
    return;
  }

  const pageButton = ui.pageButtons.find((button) => isPointInRect(x, y, button));
  if (pageButton && handlePageButton(pageButton)) {
    return;
  }

  // Entrance door click — only in normal mode, not during layout/floor placement
  if (!state.layoutToolActive && !state.layoutOpen) {
    const wp = screenToWorld(x, y);
    const doorRect = { x: layout.entranceCorridor.x, y: layout.entranceCorridor.y, w: layout.entranceCorridor.w, h: layout.entranceCorridor.h };
    if (isPointInRect(wp.x, wp.y, doorRect)) {
    state.confirmDialog = {
      title: "营业管理",
      body: state.businessOpen
        ? "是否停止营业？"
        : "是否开始营业？",
      onConfirm: () => {
        state.businessOpen = !state.businessOpen;
        if (state.businessOpen) { state.nextGuestAt = state.time + 1.5; }
        markSaveDirty();
        say(state.businessOpen ? "网吧已开门营业。" : "网吧已暂停营业。");
      },
      onCancel: () => {}
    };
    return;
    }
  }

  if (state.ledgerOpen) {
    if (isPointInRect(x, y, ui.closeLedgerButton)) {
      state.ledgerOpen = false;
    }
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

    if (isPointInRect(x, y, ui.toggleMusicButton)) {
      toggleMusicEnabled();
      return;
    }

    if (isPointInRect(x, y, ui.toggleSfxButton)) {
      toggleSfxEnabled();
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

    const buildButton = ui.rentAreaButtons.find((button) => isPointInRect(x, y, button));
    if (buildButton) {
      handleBuildOffer(buildButton.offer);
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
      if (modeButton.mode === "floor") {
        enterFloorLayoutMode();
        state.layoutOpen = false;
        say(modeButton.message);
        return;
      }

      if (modeButton.mode === "off") {
        state.layoutOpen = false;
        cancelLayoutTool();
        return;
      }

      if (state.floorLayoutSession) {
        state.layoutOpen = false;
        finishFloorLayoutSession();
        return;
      }

      state.layoutMode = modeButton.mode;
      state.layoutToolActive = modeButton.mode !== "off";
      state.selectedAreaId = null;
      state.selectedPcId = null;
      state.selectedPartitionId = null;
      state.selectedPropId = null;
      if (modeButton.mode !== "partition") state.pendingPartitionTypeId = null;
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
        `\u786e\u5b9a\u82b1\u8d39 ${getStaffHireTotal(staff)} \u5143\u62db\u8058\u4e00\u4e2a ${staff.name} \u5417\uff1f\u8d39\u7528\u5df2\u5305\u542b\u9996\u6708\u5de5\u8d44\u3002`,
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
        confirmPcUpgrade(pcButton.pc, pendingTier);
      }
      return;
    }

    if (isPointInRect(x, y, ui.closeEquipmentButton)) {
      state.equipmentOpen = false;
      state.pendingEquipmentTierLevel = null;
      return;
    }

    if (isPointInRect(x, y, ui.purchaseMahjongButton)) {
      startMahjongPurchase();
      return;
    }

    const upgradeButton = ui.upgradeEquipmentButtons.find((button) => isPointInRect(x, y, button));
    if (upgradeButton) {
      openEquipmentPcSelection(upgradeButton.tier);
      return;
    }

    const purchasePcButton = ui.purchasePcButtons.find((button) => isPointInRect(x, y, button));
    if (purchasePcButton) {
      startPcPurchase(purchasePcButton.tier);
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

  if ((state.layoutToolActive || state.pendingPcPurchase || state.pendingMahjongPurchase) &&
      isPointInRect(x, y, ui.cancelMoveButton)) {
    if (state.pendingPcPurchase || state.pendingMahjongPurchase) {
      cancelPendingPurchase();
    } else {
      cancelLayoutTool();
    }
    return;
  }

  if (state.layoutToolActive && isPointInRect(x, y, ui.rotatePartitionButton)) {
    togglePendingPartitionOrientation();
    return;
  }

  const worldPoint = screenToWorld(x, y);
  if (state.layoutToolActive && handleLayoutTouch(worldPoint.x, worldPoint.y)) {
    return;
  }

  if (placePendingExpansion(worldPoint.x, worldPoint.y)) {
    return;
  }

  // Place at the tapped world position so the user can tap exactly where they want
  // the PC — avoids confusion caused by staff walking through the viewport center area.
  if (state.pendingPcPurchase) {
    placePendingPcPurchaseAtPreview();
    return;
  }

  if (state.pendingMahjongPurchase) {
    placePendingMahjongPurchase(worldPoint.x, worldPoint.y);
    return;
  }

  const brokenPc = findTappedBrokenPc(worldPoint.x, worldPoint.y);
  if (brokenPc) {
    repairPc(brokenPc, false);
    return;
  }

  const dirtyPc = findTappedDirtyPc(worldPoint.x, worldPoint.y);
  if (dirtyPc) {
    cleanPc(dirtyPc);
    return;
  }

  const tappedGuest = findTappedGuest(worldPoint.x, worldPoint.y);
  if (tappedGuest) {
    if (tryManualCheckInGuest(tappedGuest)) {
      return;
    }

    if (serveGuestDemand(tappedGuest)) {
      return;
    }
  }

  const tappedPc = getPcAtPoint(worldPoint.x, worldPoint.y);
  if (tappedPc) {
    openPcActionMenu(tappedPc, x, y);
    return;
  }

  const tappedPartition = getPartitionAtPoint(worldPoint.x, worldPoint.y);
  if (tappedPartition) {
    openPartitionActionMenu(tappedPartition, x, y);
    return;
  }

  const tappedProp = getMovablePropAtPoint(worldPoint.x, worldPoint.y);
  if (tappedProp) {
    if (tappedProp.id === "counter") {
      closePanels();
      state.ledgerOpen = true;
      return;
    }
    openPropActionMenu(tappedProp, x, y);
    return;
  }

  if (isToiletTapped(worldPoint.x, worldPoint.y) && cleanToilet()) {
    return;
  }

  const guest = tappedGuest || findTappedGuest(worldPoint.x, worldPoint.y);
  if (guest && serveGuestDemand(guest)) return;
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function seededUnit(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distanceToRect(point, rectValue) {
  const dx = Math.max(rectValue.x - point.x, 0, point.x - (rectValue.x + rectValue.w));
  const dy = Math.max(rectValue.y - point.y, 0, point.y - (rectValue.y + rectValue.h));
  return Math.hypot(dx, dy);
}

function isPointInsideRect(x, y, area, padding = 0) {
  return x >= area.x - padding &&
    x <= area.x + area.w + padding &&
    y >= area.y - padding &&
    y <= area.y + area.h + padding;
}

function inflateRect(rectValue, padding) {
  return {
    x: rectValue.x - padding,
    y: rectValue.y - padding,
    w: rectValue.w + padding * 2,
    h: rectValue.h + padding * 2
  };
}

function isBlockingPartition(partition) {
  const type = partition ? getPartitionType(partition.typeId) : null;
  return Boolean(partition && (!type || type.blockMove !== false));
}

function getBlockingPartitionAtPoint(x, y, padding = 3) {
  return state.partitions.find((partition) => (
    isBlockingPartition(partition) &&
    isPointInsideRect(x, y, partition, padding)
  )) || null;
}

function getMovementIgnoredPropIds(entity = null) {
  if (!entity || !entity.type) return [];
  if (entity.type === "manager" || entity.type === "cashier" || entity.type === "repairman") return ["counter"];
  return [];
}

function getMovementIgnoredPcIds(entity = null) {
  const ids = new Set();
  if (!entity) return ids;
  if (Number.isFinite(entity.movementIgnorePcId)) ids.add(entity.movementIgnorePcId);
  if (Array.isArray(entity.movementIgnorePcIds)) {
    entity.movementIgnorePcIds.forEach((id) => {
      if (Number.isFinite(id)) ids.add(id);
    });
  }
  return ids;
}

function isMovementBlockingProp(prop) {
  return Boolean(prop && !isFreeMoveProp(prop));
}

function getCenteredScaledRect(rectValue, scale) {
  if (!rectValue || !Number.isFinite(scale) || scale <= 0) return rectValue;
  const w = rectValue.w * scale;
  const h = rectValue.h * scale;
  return Object.assign({}, rectValue, {
    x: rectValue.x + (rectValue.w - w) / 2,
    y: rectValue.y + (rectValue.h - h) / 2,
    w,
    h
  });
}

function getPcMovementBounds(pc) {
  return getPcSeatMovementBounds(pc);
}

function getPropMovementBounds(prop) {
  return getMovablePropHitBounds(prop);
}

// Per-frame cache for the default (no entity overrides) movement blocking rects.
// Cleared at the top of update() each frame to stay consistent.
let _movementBlockingRectsCache = null;

function getMovementBlockingRects(entity = null) {
  const ignoredProps = getMovementIgnoredPropIds(entity);
  const ignoredPcIds = getMovementIgnoredPcIds(entity);
  // When no entity-specific overrides are needed, reuse the cached list for this frame.
  const hasOverrides = ignoredProps.length > 0 || ignoredPcIds.size > 0;
  if (!hasOverrides && _movementBlockingRectsCache) return _movementBlockingRectsCache;

  const result = []
    .concat((state.mahjongTables || []).map((table) => Object.assign({ blockType: "mahjong" }, table)))
    .concat((state.partitions || [])
      .filter(isBlockingPartition)
      .map((partition) => Object.assign({ blockType: "partition", blockId: partition.id }, partition)))
    .concat(getMovablePropDefinitions()
      .filter((prop) => !ignoredProps.includes(prop.id) && isMovementBlockingProp(prop))
      .map((prop) => Object.assign(
        { blockType: "prop", blockId: prop.id },
        getPropMovementBounds(getMovablePropRect(prop.id))
      )));

  if (!hasOverrides) _movementBlockingRectsCache = result;
  return result;
}

function getMovementBlockerAtPoint(x, y, entity = null, padding = 3) {
  return getMovementBlockingRects(entity).find((blocker) => (
    isPointInsideRect(x, y, blocker, padding)
  )) || null;
}

function isWalkBlockingPoint(x, y, entity = null) {
  return Boolean(getMovementBlockerAtPoint(x, y, entity));
}

function clearEntityNavigation(entity) {
  if (!entity) return;
  entity.navPath = null;
  entity.navIndex = 0;
  entity.navTargetKey = null;
  entity.detourPoint = null;
}

function clearAllEntityNavigation() {
  state.guests.forEach(clearEntityNavigation);
  state.workers.forEach((worker) => {
    worker.detourPoint = null;
    worker.idleTarget = null;
    worker.idleTimer = 0;
    worker.stuckTimer = 0;
    clearEntityNavigation(worker);
  });
  _movementBlockingRectsCache = null;
}

function getNavigationTargetKey(entity, target) {
  const ignoredPcs = Array.from(getMovementIgnoredPcIds(entity)).sort((a, b) => a - b).join(",");
  return `${Math.round(target.x)}:${Math.round(target.y)}:${ignoredPcs || "none"}`;
}

function canStandAtMovementPoint(entity, point) {
  if (!point || isWalkBlockingPoint(point.x, point.y, entity)) return false;
  return Boolean(getWalkableAreaAtPoint(point.x, point.y) || isEntranceWalkway(point.x, point.y) || isDoorwayPoint(point.x, point.y));
}

function canTraverseMovementSegment(entity, from, to) {
  if (!from || !to) return false;
  if (!canStandAtMovementPoint(entity, to)) return false;
  const blocker = getMovementBlockerForRoute(from, to, entity);
  if (blocker && !isPointInsideRect(to.x, to.y, blocker, 1)) return false;

  const steps = Math.max(2, Math.ceil(distance(from, to) / 7));
  let previousArea = getWalkableAreaAtPoint(from.x, from.y);
  for (let index = 1; index <= steps; index += 1) {
    const rate = index / steps;
    const point = {
      x: from.x + (to.x - from.x) * rate,
      y: from.y + (to.y - from.y) * rate
    };
    if (!canStandAtMovementPoint(entity, point)) return false;
    const area = getWalkableAreaAtPoint(point.x, point.y);
    if (previousArea && area && previousArea.id !== area.id && !isTransitionOpen(previousArea, area, point.x, point.y)) {
      return false;
    }
    if (area) previousArea = area;
  }
  return true;
}

function getNavigationBounds(from, target) {
  const world = getExpandedWorldBounds();
  const margin = 360;
  return {
    minX: Math.max(world.minX, Math.min(from.x, target.x) - margin),
    minY: Math.max(world.minY, Math.min(from.y, target.y) - margin),
    maxX: Math.min(world.maxX, Math.max(from.x, target.x) + margin),
    maxY: Math.min(world.maxY, Math.max(from.y, target.y) + margin)
  };
}

function getNearestNavigationPoint(entity, point, bounds) {
  if (canStandAtMovementPoint(entity, point)) return { x: point.x, y: point.y, direct: true };
  const baseCol = Math.round((point.x - bounds.minX) / NAV_GRID_SIZE);
  const baseRow = Math.round((point.y - bounds.minY) / NAV_GRID_SIZE);
  let best = null;
  for (let radius = 0; radius <= 7; radius += 1) {
    for (let row = baseRow - radius; row <= baseRow + radius; row += 1) {
      for (let col = baseCol - radius; col <= baseCol + radius; col += 1) {
        if (row !== baseRow - radius && row !== baseRow + radius && col !== baseCol - radius && col !== baseCol + radius) continue;
        const candidate = {
          x: bounds.minX + col * NAV_GRID_SIZE,
          y: bounds.minY + row * NAV_GRID_SIZE,
          col,
          row
        };
        if (candidate.x < bounds.minX || candidate.x > bounds.maxX || candidate.y < bounds.minY || candidate.y > bounds.maxY) continue;
        if (!canStandAtMovementPoint(entity, candidate)) continue;
        const score = distance(point, candidate);
        if (!best || score < best.score) best = Object.assign({ score }, candidate);
      }
    }
    if (best) return best;
  }
  return null;
}

function computeNavigationPath(entity, target) {
  const startPoint = { x: entity.x, y: entity.y };
  if (canTraverseMovementSegment(entity, startPoint, target)) return [target];

  const bounds = getNavigationBounds(startPoint, target);
  const start = getNearestNavigationPoint(entity, startPoint, bounds);
  const goal = getNearestNavigationPoint(entity, target, bounds);
  if (!start || !goal) return null;

  const keyOf = (col, row) => `${col}:${row}`;
  const startKey = keyOf(start.col || Math.round((start.x - bounds.minX) / NAV_GRID_SIZE), start.row || Math.round((start.y - bounds.minY) / NAV_GRID_SIZE));
  const goalCol = goal.col || Math.round((goal.x - bounds.minX) / NAV_GRID_SIZE);
  const goalRow = goal.row || Math.round((goal.y - bounds.minY) / NAV_GRID_SIZE);
  const goalKey = keyOf(goalCol, goalRow);
  const open = [{ key: startKey, col: Number(startKey.split(":")[0]), row: Number(startKey.split(":")[1]), g: 0, f: distance(start, goal) }];
  const cameFrom = {};
  const costs = { [startKey]: 0 };
  const closed = new Set();
  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1]
  ];
  let iterations = 0;

  while (open.length && iterations < 5200) {
    iterations += 1;
    const current = open.shift(); // open is kept sorted on insert below
    if (closed.has(current.key)) continue;
    if (current.key === goalKey) {
      const cells = [];
      let cursor = current.key;
      while (cursor) {
        const [col, row] = cursor.split(":").map(Number);
        cells.push({ col, row, x: bounds.minX + col * NAV_GRID_SIZE, y: bounds.minY + row * NAV_GRID_SIZE });
        cursor = cameFrom[cursor];
      }
      cells.reverse();
      const path = cells
        .map((cell) => ({ x: cell.x, y: cell.y }))
        .filter((point, index) => index > 0 || distance(point, startPoint) > 4);
      if (canTraverseMovementSegment(entity, path[path.length - 1] || startPoint, target)) path.push(target);
      return simplifyNavigationPath(entity, startPoint, path);
    }
    closed.add(current.key);

    dirs.forEach(([dc, dr]) => {
      const col = current.col + dc;
      const row = current.row + dr;
      const point = { x: bounds.minX + col * NAV_GRID_SIZE, y: bounds.minY + row * NAV_GRID_SIZE };
      if (point.x < bounds.minX || point.x > bounds.maxX || point.y < bounds.minY || point.y > bounds.maxY) return;
      const nextKey = keyOf(col, row);
      if (closed.has(nextKey)) return;
      const from = { x: bounds.minX + current.col * NAV_GRID_SIZE, y: bounds.minY + current.row * NAV_GRID_SIZE };
      if (!canTraverseMovementSegment(entity, from, point)) return;
      const moveCost = dc !== 0 && dr !== 0 ? 1.414 : 1;
      const nextCost = current.g + moveCost;
      if (costs[nextKey] !== undefined && nextCost >= costs[nextKey]) return;
      costs[nextKey] = nextCost;
      cameFrom[nextKey] = current.key;
      const newNode = { key: nextKey, col, row, g: nextCost, f: nextCost + Math.hypot(col - goalCol, row - goalRow) };
      // Binary-insert to keep open sorted by f — avoids O(n log n) full sort each iteration.
      let lo = 0; let hi = open.length;
      while (lo < hi) { const mid = (lo + hi) >>> 1; if (open[mid].f <= newNode.f) lo = mid + 1; else hi = mid; }
      open.splice(lo, 0, newNode);
    });
  }
  return null;
}

function simplifyNavigationPath(entity, start, path) {
  if (!path || path.length <= 2) return path || null;
  const simplified = [];
  let anchor = start;
  for (let index = 0; index < path.length; index += 1) {
    const next = path[index + 1];
    if (!next || !canTraverseMovementSegment(entity, anchor, next)) {
      simplified.push(path[index]);
      anchor = path[index];
    }
  }
  return simplified;
}

function getNavigationMoveTarget(entity, target) {
  const key = getNavigationTargetKey(entity, target);
  if (entity.navTargetKey !== key || !entity.navPath || !entity.navPath.length) {
    entity.navPath = computeNavigationPath(entity, target);
    entity.navIndex = 0;
    entity.navTargetKey = key;
  }
  if (!entity.navPath || !entity.navPath.length) return target;
  while (entity.navIndex < entity.navPath.length - 1 && distance(entity, entity.navPath[entity.navIndex]) <= 5) {
    entity.navIndex += 1;
  }
  const waypoint = entity.navPath[entity.navIndex] || target;
  if (distance(entity, waypoint) <= 5 && entity.navIndex >= entity.navPath.length - 1) {
    return target;
  }
  return waypoint;
}

function segmentIntersectsRect(from, to, rectValue, padding = 0) {
  const paddedRect = inflateRect(rectValue, padding);
  if (isPointInsideRect(from.x, from.y, paddedRect) ||
      isPointInsideRect(to.x, to.y, paddedRect)) {
    return true;
  }

  const steps = Math.max(4, Math.ceil(distance(from, to) / 8));
  for (let index = 1; index < steps; index += 1) {
    const rate = index / steps;
    const x = from.x + (to.x - from.x) * rate;
    const y = from.y + (to.y - from.y) * rate;
    if (isPointInsideRect(x, y, paddedRect)) return true;
  }
  return false;
}

function getBlockingPartitionForRoute(from, target) {
  let best = null;
  state.partitions.forEach((partition) => {
    if (!isBlockingPartition(partition)) return;
    if (!segmentIntersectsRect(from, target, partition, 7)) return;
    const score = distanceToRectCenter(from.x, from.y, partition);
    if (!best || score < best.score) {
      best = { partition, score };
    }
  });
  return best ? best.partition : null;
}

function getMovementBlockerForRoute(from, target, entity = null) {
  let best = null;
  getMovementBlockingRects(entity).forEach((blocker) => {
    if (!segmentIntersectsRect(from, target, blocker, 7)) return;
    const score = distanceToRectCenter(from.x, from.y, blocker);
    if (!best || score < best.score) {
      best = { blocker, score };
    }
  });
  return best ? best.blocker : null;
}

function isMovementPointUsable(entity, point) {
  if (!point || isWalkBlockingPoint(point.x, point.y, entity)) return false;
  return canMoveToPoint(entity, point.x, point.y) ||
    isDoorwayPoint(point.x, point.y) ||
    isEntranceWalkway(point.x, point.y);
}

function getMovementBlockerEscapePoint(entity) {
  const blocker = getMovementBlockerAtPoint(entity.x, entity.y, entity, 1);
  if (!blocker) return null;

  const gap = 14;
  const candidates = [
    { x: blocker.x - gap, y: clamp(entity.y, blocker.y - gap, blocker.y + blocker.h + gap) },
    { x: blocker.x + blocker.w + gap, y: clamp(entity.y, blocker.y - gap, blocker.y + blocker.h + gap) },
    { x: clamp(entity.x, blocker.x - gap, blocker.x + blocker.w + gap), y: blocker.y - gap },
    { x: clamp(entity.x, blocker.x - gap, blocker.x + blocker.w + gap), y: blocker.y + blocker.h + gap }
  ];

  return candidates
    .filter((point) => isMovementPointUsable(entity, point) && getWalkableAreaAtPoint(point.x, point.y))
    .sort((a, b) => distance(entity, a) - distance(entity, b))[0] || null;
}

function getPartitionEscapePoint(entity) {
  const partition = getBlockingPartitionAtPoint(entity.x, entity.y, 1);
  if (!partition) return null;

  const gap = 12;
  const candidates = [
    { x: partition.x - gap, y: clamp(entity.y, partition.y - gap, partition.y + partition.h + gap) },
    { x: partition.x + partition.w + gap, y: clamp(entity.y, partition.y - gap, partition.y + partition.h + gap) },
    { x: clamp(entity.x, partition.x - gap, partition.x + partition.w + gap), y: partition.y - gap },
    { x: clamp(entity.x, partition.x - gap, partition.x + partition.w + gap), y: partition.y + partition.h + gap }
  ];

  return candidates
    .filter((point) => !isWalkBlockingPoint(point.x, point.y, entity) && getWalkableAreaAtPoint(point.x, point.y))
    .sort((a, b) => distance(entity, a) - distance(entity, b))[0] || null;
}

function getPartitionDetourPoint(entity, target) {
  const partition = getBlockingPartitionForRoute(entity, target);
  if (!partition) return null;

  const gap = 22;
  const candidates = [
    { x: partition.x - gap, y: partition.y - gap },
    { x: partition.x + partition.w + gap, y: partition.y - gap },
    { x: partition.x - gap, y: partition.y + partition.h + gap },
    { x: partition.x + partition.w + gap, y: partition.y + partition.h + gap },
    { x: partition.x + partition.w / 2, y: partition.y - gap },
    { x: partition.x + partition.w / 2, y: partition.y + partition.h + gap },
    { x: partition.x - gap, y: partition.y + partition.h / 2 },
    { x: partition.x + partition.w + gap, y: partition.y + partition.h / 2 }
  ];

  return candidates
    .filter((point) => {
      if (!isMovementPointUsable(entity, point)) return false;
      return !segmentIntersectsRect(entity, point, partition, 4);
    })
    .map((point) => {
      const targetBlocked = segmentIntersectsRect(point, target, partition, 4);
      return {
        point,
        score: distance(entity, point) + distance(point, target) + (targetBlocked ? 120 : 0)
      };
    })
    .sort((a, b) => a.score - b.score)
    .map((item) => item.point)[0] || null;
}

function getMovementDetourPoint(entity, target) {
  const blocker = getMovementBlockerForRoute(entity, target, entity);
  if (!blocker) return null;

  const gap = blocker.blockType === "partition" ? 22 : 14;
  const candidates = [
    { x: blocker.x - gap, y: blocker.y - gap },
    { x: blocker.x + blocker.w + gap, y: blocker.y - gap },
    { x: blocker.x - gap, y: blocker.y + blocker.h + gap },
    { x: blocker.x + blocker.w + gap, y: blocker.y + blocker.h + gap },
    { x: blocker.x + blocker.w / 2, y: blocker.y - gap },
    { x: blocker.x + blocker.w / 2, y: blocker.y + blocker.h + gap },
    { x: blocker.x - gap, y: blocker.y + blocker.h / 2 },
    { x: blocker.x + blocker.w + gap, y: blocker.y + blocker.h / 2 },
    { x: blocker.x + blocker.w * 0.25, y: blocker.y - gap },
    { x: blocker.x + blocker.w * 0.75, y: blocker.y - gap },
    { x: blocker.x + blocker.w * 0.25, y: blocker.y + blocker.h + gap },
    { x: blocker.x + blocker.w * 0.75, y: blocker.y + blocker.h + gap },
    { x: blocker.x - gap, y: blocker.y + blocker.h * 0.25 },
    { x: blocker.x - gap, y: blocker.y + blocker.h * 0.75 },
    { x: blocker.x + blocker.w + gap, y: blocker.y + blocker.h * 0.25 },
    { x: blocker.x + blocker.w + gap, y: blocker.y + blocker.h * 0.75 }
  ];

  return candidates
    .filter((point) => {
      if (!isMovementPointUsable(entity, point)) return false;
      return !segmentIntersectsRect(entity, point, blocker, 4);
    })
    .map((point) => {
      const targetBlocked = segmentIntersectsRect(point, target, blocker, 4);
      return {
        point,
        score: distance(entity, point) + distance(point, target) + (targetBlocked ? 80 : 0)
      };
    })
    .sort((a, b) => a.score - b.score)
    .map((item) => item.point)[0] || null;
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
  const corridor = layout.entranceCorridor;
  return x >= corridor.x - 6 &&
    x <= layout.room.x + 42 &&
    y >= corridor.y - 6 &&
    y <= corridor.y + corridor.h + 6;
}

function isDoorwayPoint(x, y) {
  const pairs = getDoorAreaPairs();
  for (let index = 0; index < pairs.length; index += 1) {
    const door = getDoorGeometryBetween(pairs[index][0], pairs[index][1]);
    if (door && isPointInsideRect(x, y, door.rect)) return true;
  }
  return false;
}

function isTransitionOpen(fromArea, toArea, x, y) {
  if (!fromArea || !toArea || fromArea.id === toArea.id) return true;
  if (!sharesWall(fromArea, toArea)) return false;
  if (isFullOpenConnection(fromArea, toArea)) return true;

  const door = getDoorGeometryBetween(fromArea, toArea);
  return Boolean(door && isPointInsideRect(x, y, door.rect));
}

function getDoorPointBetween(fromArea, toArea) {
  const door = getDoorGeometryBetween(fromArea, toArea);
  return door ? door.center : null;
}

function getOpenConnectionPointBetween(fromArea, toArea) {
  if (!fromArea || !toArea || !sharesWall(fromArea, toArea)) return null;

  if (fromArea.y + fromArea.h === toArea.y || toArea.y + toArea.h === fromArea.y) {
    const boundaryY = fromArea.y + fromArea.h === toArea.y ? toArea.y : fromArea.y;
    const overlapStart = Math.max(fromArea.x + 12, toArea.x + 12);
    const overlapEnd = Math.min(fromArea.x + fromArea.w - 12, toArea.x + toArea.w - 12);
    if (overlapEnd <= overlapStart) return null;
    return { x: (overlapStart + overlapEnd) / 2, y: boundaryY };
  }

  if (fromArea.x + fromArea.w === toArea.x || toArea.x + toArea.w === fromArea.x) {
    const boundaryX = fromArea.x + fromArea.w === toArea.x ? toArea.x : fromArea.x;
    const overlapStart = Math.max(fromArea.y + 12, toArea.y + 12);
    const overlapEnd = Math.min(fromArea.y + fromArea.h - 12, toArea.y + toArea.h - 12);
    if (overlapEnd <= overlapStart) return null;
    return { x: boundaryX, y: (overlapStart + overlapEnd) / 2 };
  }

  return null;
}

function getTransitionPointBetween(fromArea, toArea) {
  return getDoorPointBetween(fromArea, toArea) ||
    (isFullOpenConnection(fromArea, toArea) ? getOpenConnectionPointBetween(fromArea, toArea) : null);
}

function getDoorGeometryBetween(fromArea, toArea) {
  if (!fromArea || !toArea || !sharesWall(fromArea, toArea)) return null;
  if (!shouldUseDoorBetweenAreas(fromArea, toArea)) return null;

  const doorW = 42;
  const doorH = 30;
  if (fromArea.y + fromArea.h === toArea.y || toArea.y + toArea.h === fromArea.y) {
    const boundaryY = fromArea.y + fromArea.h === toArea.y ? toArea.y : fromArea.y;
    const overlapStart = Math.max(fromArea.x + 16, toArea.x + 16);
    const overlapEnd = Math.min(fromArea.x + fromArea.w - 16, toArea.x + toArea.w - 16);
    if (overlapEnd - overlapStart < 28) return null;
    const centerX = (overlapStart + overlapEnd) / 2;
    return {
      center: { x: centerX, y: boundaryY },
      rect: { x: centerX - doorW / 2, y: boundaryY - 12, w: doorW, h: 24 },
      orientation: "horizontal"
    };
  }

  if (fromArea.x + fromArea.w === toArea.x || toArea.x + toArea.w === fromArea.x) {
    const boundaryX = fromArea.x + fromArea.w === toArea.x ? toArea.x : fromArea.x;
    const overlapStart = Math.max(fromArea.y + 28, toArea.y + 28);
    const overlapEnd = Math.min(fromArea.y + fromArea.h - 16, toArea.y + toArea.h - 16);
    if (overlapEnd - overlapStart < 28) return null;
    const centerY = (overlapStart + overlapEnd) / 2;
    return {
      center: { x: boundaryX, y: centerY },
      rect: { x: boundaryX - 12, y: centerY - doorH / 2, w: 24, h: doorH },
      orientation: "vertical"
    };
  }

  return null;
}

function isHallNetworkArea(area) {
  return area && (area.id === 1 || area.typeId === "publicFloor");
}

function isFullOpenConnection(a, b) {
  return isHallNetworkArea(a) && isHallNetworkArea(b);
}

function shouldUseDoorBetweenAreas(a, b) {
  if (!a || !b) return false;
  if (isFullOpenConnection(a, b)) return false;
  return isHallNetworkArea(a) || isHallNetworkArea(b);
}

function getDoorAreaPairs() {
  const pairs = [];
  const areas = getStructuralAreas();
  for (let i = 0; i < areas.length; i += 1) {
    for (let j = i + 1; j < areas.length; j += 1) {
      if (getDoorGeometryBetween(areas[i], areas[j])) pairs.push([areas[i], areas[j]]);
    }
  }
  areas.forEach((area) => {
    state.publicFloors.forEach((floor) => {
      if (getDoorGeometryBetween(area, floor)) pairs.push([area, floor]);
    });
  });
  return pairs;
}

function getDoorKey(a, b) {
  const ids = [String(a.id), String(b.id)].sort();
  return `${ids[0]}:${ids[1]}`;
}

function getDoorInwardArea(a, b) {
  if (a.id === 1 && b.id !== 1) return b;
  if (b.id === 1 && a.id !== 1) return a;
  if (a.typeId === "publicFloor" && b.typeId !== "publicFloor") return b;
  if (b.typeId === "publicFloor" && a.typeId !== "publicFloor") return a;
  if (a.typeId === "toiletRoom") return a;
  if (b.typeId === "toiletRoom") return b;
  const areaA = a.w * a.h;
  const areaB = b.w * b.h;
  return areaA <= areaB ? a : b;
}

function isDoorOpen(a, b) {
  return (state.doorTimers[getDoorKey(a, b)] || 0) > 0;
}

function updateDoorTimers(dt) {
  Object.keys(state.doorTimers).forEach((key) => {
    state.doorTimers[key] -= dt;
    if (state.doorTimers[key] <= 0) {
      delete state.doorTimers[key];
    }
  });

  const movers = state.guests.concat(state.workers);
  if (!movers.length) return;

  getDoorAreaPairs().forEach(([a, b]) => {
    const door = getDoorGeometryBetween(a, b);
    const active = movers.some((entity) => Math.hypot(entity.x - door.center.x, entity.y - door.center.y) <= 34);
    if (active) {
      state.doorTimers[getDoorKey(a, b)] = 0.85;
    }
  });
}

function getDoorInnerPoint(fromArea, toArea) {
  const door = getDoorGeometryBetween(fromArea, toArea);
  if (!door) return null;
  const point = { x: door.center.x, y: door.center.y };
  if (door.orientation === "horizontal") {
    point.y += toArea.y > fromArea.y ? 12 : -12;
  } else {
    point.x += toArea.x > fromArea.x ? 12 : -12;
  }
  return point;
}

function findAreaRoute(fromArea, toArea) {
  if (!fromArea || !toArea) return [];
  if (fromArea.id === toArea.id) return [fromArea];

  const areas = getAttachableAreas();
  const queue = [[fromArea]];
  const visited = new Set([fromArea.id]);

  while (queue.length) {
    const route = queue.shift();
    const current = route[route.length - 1];
    if (current.id === toArea.id) return route;

    areas.forEach((next) => {
      if (visited.has(next.id)) return;
      if (!sharesWall(current, next)) return;
      const transition = getTransitionPointBetween(current, next);
      if (!transition) return;
      visited.add(next.id);
      queue.push(route.concat(next));
    });
  }

  return [];
}

function getNextRouteTarget(entity, target) {
  if (entity.detourPoint) {
    if (distance(entity, entity.detourPoint) > 5) return entity.detourPoint;
    entity.detourPoint = null;
  }

  const fromArea = getWalkableAreaAtPoint(entity.x, entity.y);
  const toArea = getWalkableAreaAtPoint(target.x, target.y);
  let routeTarget = target;
  if (!fromArea || !toArea || fromArea.id === toArea.id) {
    routeTarget = target;
  } else {
    const route = findAreaRoute(fromArea, toArea);
    if (route.length >= 2) {
      const transition = getTransitionPointBetween(route[0], route[1]);
      if (transition && distance(entity, transition) > 5) {
        routeTarget = transition;
      } else {
        const innerPoint = getDoorInnerPoint(route[0], route[1]);
        routeTarget = innerPoint && distance(entity, innerPoint) > 4 ? innerPoint : target;
      }
    }
  }

  const detour = getMovementDetourPoint(entity, routeTarget) ||
    getPartitionDetourPoint(entity, routeTarget);
  if (detour) {
    entity.detourPoint = detour;
    return detour;
  }
  return routeTarget;
}

function canMoveToPoint(entity, x, y) {
  if (isWalkBlockingPoint(x, y, entity)) return false;
  const fromArea = getWalkableAreaAtPoint(entity.x, entity.y);
  const toArea = getWalkableAreaAtPoint(x, y);
  if (!toArea && !isEntranceWalkway(x, y) && !isDoorwayPoint(x, y)) return false;
  if (fromArea && toArea && !isTransitionOpen(fromArea, toArea, x, y)) return false;
  return true;
}

function getAreaSafePoint(area, x, y) {
  if (!area) return null;
  return {
    x: Math.max(area.x + 14, Math.min(area.x + area.w - 14, x)),
    y: Math.max(area.y + 20, Math.min(area.y + area.h - 18, y))
  };
}

function getUnstuckPoint(entity, target) {
  const blockerEscape = getMovementBlockerEscapePoint(entity);
  if (blockerEscape) return blockerEscape;

  const partitionEscape = getPartitionEscapePoint(entity);
  if (partitionEscape) return partitionEscape;

  const currentArea = getWalkableAreaAtPoint(entity.x, entity.y);
  const targetArea = getWalkableAreaAtPoint(target.x, target.y);
  if (!currentArea && targetArea) {
    const entranceDistance = Math.hypot(entity.x - layout.entrance.x, entity.y - layout.entrance.y);
    if (targetArea.id === 1 || entranceDistance < 160) {
      return { x: layout.entrance.x + 18, y: layout.entrance.y };
    }
  }

  let routeRecovery = null;
  if (currentArea && targetArea && currentArea.id !== targetArea.id) {
    const route = findAreaRoute(currentArea, targetArea);
    if (route.length >= 2) {
      routeRecovery = getDoorInnerPoint(route[0], route[1]) || getTransitionPointBetween(route[0], route[1]);
    }
  }

  const detour = getMovementDetourPoint(entity, routeRecovery || target) ||
    getPartitionDetourPoint(entity, routeRecovery || target);
  if (detour) return detour;
  if (routeRecovery) return routeRecovery;

  if (currentArea) {
    const safe = getAreaSafePoint(currentArea, entity.x, entity.y);
    if (safe && Math.hypot(safe.x - entity.x, safe.y - entity.y) > 1) return safe;
    const targetSafe = getAreaSafePoint(currentArea, target.x, target.y);
    return targetSafe && !getMovementBlockerForRoute(entity, targetSafe, entity) ? targetSafe : null;
  }

  if (targetArea) {
    return getAreaSafePoint(targetArea, target.x, target.y);
  }

  if (isEntranceWalkway(target.x, target.y)) {
    return { x: layout.entrance.x, y: layout.entrance.y };
  }

  if (isEntranceWalkway(entity.x, entity.y)) {
    return { x: layout.entrance.x, y: layout.entrance.y };
  }
  return null;
}

function getEmergencyReroutePoint(entity, target, routedTarget) {
  return getMovementBlockerEscapePoint(entity) ||
    getPartitionEscapePoint(entity) ||
    getMovementDetourPoint(entity, routedTarget) ||
    getMovementDetourPoint(entity, target) ||
    getPartitionDetourPoint(entity, routedTarget) ||
    getPartitionDetourPoint(entity, target) ||
    getUnstuckPoint(entity, routedTarget) ||
    getUnstuckPoint(entity, target);
}

function moveToward(entity, target, speed, dt) {
  const routedTarget = getNextRouteTarget(entity, target);
  const moveTarget = getNavigationMoveTarget(entity, routedTarget);
  const dx = moveTarget.x - entity.x;
  const dy = moveTarget.y - entity.y;
  const len = Math.hypot(dx, dy);

  if (len < 1) {
    entity.x = moveTarget.x;
    entity.y = moveTarget.y;
    entity.stuckTimer = 0;
    if (moveTarget === entity.detourPoint) entity.detourPoint = null;
    if (entity.navPath && entity.navIndex < entity.navPath.length - 1) {
      entity.navIndex += 1;
      return false;
    }
    return routedTarget === target && distance(entity, target) <= 5;
  }

  const step = Math.min(len, speed * dt);
  const nx = dx / len;
  const ny = dy / len;

  // Try direct movement first
  const directX = entity.x + nx * step;
  const directY = entity.y + ny * step;

  let movedX = entity.x;
  let movedY = entity.y;
  let moved = false;

  if (canMoveToPoint(entity, directX, directY)) {
    movedX = directX;
    movedY = directY;
    moved = true;
  } else {
    // Slide along X or Y axis — pick the one that gets closer to the target.
    // Never use perpendicular-rotation candidates: they cause visible oscillation.
    const canSlideX = Math.abs(nx) > 0.01 && canMoveToPoint(entity, entity.x + nx * step, entity.y);
    const canSlideY = Math.abs(ny) > 0.01 && canMoveToPoint(entity, entity.x, entity.y + ny * step);

    if (canSlideX && canSlideY) {
      const dX = Math.hypot(moveTarget.x - (entity.x + nx * step), moveTarget.y - entity.y);
      const dY = Math.hypot(moveTarget.x - entity.x, moveTarget.y - (entity.y + ny * step));
      if (dX <= dY) { movedX = entity.x + nx * step; } else { movedY = entity.y + ny * step; }
      moved = true;
    } else if (canSlideX) {
      movedX = entity.x + nx * step;
      moved = true;
    } else if (canSlideY) {
      movedY = entity.y + ny * step;
      moved = true;
    }
  }

  if (moved) {
    const previousTargetDistance = len;
    entity.x = movedX;
    entity.y = movedY;
    // Sliding only resets the stuck timer when it really gets closer to the route target.
    const nextTargetDistance = distance(entity, moveTarget);
    if (nextTargetDistance < previousTargetDistance - 0.2) {
      entity.stuckTimer = 0;
    } else {
      entity.stuckTimer = (entity.stuckTimer || 0) + dt * 0.5;
    }
    if (entity.navPath && distance(entity, moveTarget) <= 5 && entity.navIndex < entity.navPath.length - 1) {
      entity.navIndex += 1;
    }
  } else {
    entity.stuckTimer = (entity.stuckTimer || 0) + dt;
  }

  if (entity.stuckTimer > STUCK_REROUTE_SECONDS) {
    const recovery = getEmergencyReroutePoint(entity, target, routedTarget);
    entity.detourPoint = null;
    if (recovery && !isWalkBlockingPoint(recovery.x, recovery.y, entity)) {
      entity.x = recovery.x;
      entity.y = recovery.y;
      entity.stuckTimer = 0;
      clearEntityNavigation(entity);
      return false;
    }
    entity.stuckTimer = STUCK_REROUTE_SECONDS * 0.5;
  } else if (entity.stuckTimer > 0.25 && len <= 18 && (
    isDoorwayPoint(routedTarget.x, routedTarget.y) ||
    (canMoveToPoint(entity, routedTarget.x, routedTarget.y) && !getMovementBlockerForRoute(entity, routedTarget, entity))
  )) {
    entity.x = routedTarget.x;
    entity.y = routedTarget.y;
    entity.stuckTimer = 0;
  } else if (entity.stuckTimer > 0.85 && len <= 52 && isDoorwayPoint(routedTarget.x, routedTarget.y)) {
    entity.x = routedTarget.x;
    entity.y = routedTarget.y;
    entity.stuckTimer = 0;
  } else if (entity.stuckTimer > 0.35) {
    const recovery = getUnstuckPoint(entity, routedTarget);
    if (recovery && Math.hypot(recovery.x - entity.x, recovery.y - entity.y) > 1) {
      if (canMoveToPoint(entity, recovery.x, recovery.y) ||
          isDoorwayPoint(recovery.x, recovery.y) ||
          (getWalkableAreaAtPoint(recovery.x, recovery.y) && !isWalkBlockingPoint(recovery.x, recovery.y, entity))) {
        entity.x = recovery.x;
        entity.y = recovery.y;
        entity.stuckTimer = 0;
        clearEntityNavigation(entity);
      }
    }
  } else if (entity.stuckTimer > 0.2 && !getWalkableAreaAtPoint(entity.x, entity.y) && !isEntranceWalkway(entity.x, entity.y)) {
    const recovery = getUnstuckPoint(entity, routedTarget);
    if (recovery) {
      entity.x = recovery.x;
      entity.y = recovery.y;
      entity.stuckTimer = 0;
      clearEntityNavigation(entity);
    }
  }
  return routedTarget === target && distance(entity, target) <= Math.max(5, step + 1);
}

function getPcAccessPoint(pc) {
  const area = getPcActualArea(pc);
  const rotation = getNormalizedRotation(pc);
  const point = { x: pc.seatX, y: pc.seatY };
  if (rotation === 90) {
    point.x -= 18;
  } else if (rotation === 180) {
    point.y -= 18;
  } else if (rotation === 270) {
    point.x += 18;
  } else {
    point.y += 18;
  }
  return {
    x: Math.max(area.x + 16, Math.min(area.x + area.w - 16, point.x)),
    y: Math.max(area.y + 36, Math.min(area.y + area.h - 16, point.y))
  };
}

function getNearbyPcIgnoreIds(point, radius = 88, requiredId = null) {
  if (!point) return Number.isFinite(requiredId) ? [requiredId] : [];
  const ids = [];
  layout.pcs.forEach((pc) => {
    if (pc.id === requiredId ||
        distance(point, getPcAccessPoint(pc)) <= radius ||
        distanceToRect(point, getPcMovementBounds(pc)) <= radius * 0.45) {
      ids.push(pc.id);
    }
  });
  return Array.from(new Set(ids));
}

function runWithIgnoredPcs(entity, pcIds, callback) {
  if (!entity || !Array.isArray(pcIds) || pcIds.length === 0) return callback();
  const previousIgnoredPcId = entity.movementIgnorePcId;
  const previousIgnoredPcIds = entity.movementIgnorePcIds;
  entity.movementIgnorePcId = null;
  entity.movementIgnorePcIds = Array.from(new Set(pcIds.filter((id) => Number.isFinite(id))));
  try {
    return callback();
  } finally {
    entity.movementIgnorePcId = previousIgnoredPcId;
    entity.movementIgnorePcIds = previousIgnoredPcIds;
  }
}

function moveToPcSeat(entity, pc, speed, dt) {
  if (!pc) return false;
  const previousIgnoredPcId = entity.movementIgnorePcId;
  entity.movementIgnorePcId = pc.id;
  const seat = { x: pc.seatX, y: pc.seatY };
  if (distance(entity, seat) <= 22) {
    entity.x = seat.x;
    entity.y = seat.y;
    entity.detourPoint = null;
    entity.stuckTimer = 0;
    entity.movementIgnorePcId = previousIgnoredPcId;
    return true;
  }

  const accessPoint = getPcAccessPoint(pc);
  if (distance(entity, accessPoint) <= 30 || (entity.stuckTimer || 0) > 0.45 && distance(entity, seat) <= 44) {
    entity.x = seat.x;
    entity.y = seat.y;
    entity.detourPoint = null;
    entity.stuckTimer = 0;
    entity.movementIgnorePcId = previousIgnoredPcId;
    return true;
  }

  moveToward(entity, accessPoint, speed, dt);
  entity.movementIgnorePcId = previousIgnoredPcId;
  return false;
}

function isCloseEnoughToServicePc(entity, pc) {
  if (!entity || !pc) return false;
  return distance(entity, getPcAccessPoint(pc)) <= 10 ||
    distance(entity, { x: pc.seatX, y: pc.seatY }) <= 12;
}

function getPcServicePointCandidates(pc) {
  const area = getPcActualArea(pc);
  const bounds = getPcVisualBounds(pc);
  const rawPoints = [
    getPcAccessPoint(pc),
    { x: pc.x + pc.w / 2, y: pc.y - 22 },
    { x: pc.x + pc.w / 2, y: pc.y + pc.h + 28 },
    { x: bounds.x - 18, y: bounds.y + bounds.h / 2 },
    { x: bounds.x + bounds.w + 18, y: bounds.y + bounds.h / 2 },
    { x: pc.seatX - 22, y: pc.seatY + 8 },
    { x: pc.seatX + 22, y: pc.seatY + 8 }
  ];
  return rawPoints.map((point) => getAreaSafePoint(area, point.x, point.y)).filter(Boolean);
}

function getBestPcServicePoint(entity, pc) {
  if (!entity || !pc) return null;
  const ignoreIds = getNearbyPcIgnoreIds(getPcAccessPoint(pc), 88, pc.id)
    .concat(getNearbyPcIgnoreIds(entity, 54));
  return runWithIgnoredPcs(entity, ignoreIds, () => {
    const candidates = getPcServicePointCandidates(pc)
      .filter((point) => canStandAtMovementPoint(entity, point))
      .map((point) => ({
        point,
        score: distance(entity, point) + (getMovementBlockerForRoute(entity, point, entity) ? 120 : 0)
      }))
      .sort((a, b) => a.score - b.score);
    return candidates.length ? candidates[0].point : getPcAccessPoint(pc);
  });
}

function moveToPcServicePoint(entity, pc, speed, dt) {
  if (!entity || !pc) return false;
  if (isCloseEnoughToServicePc(entity, pc)) return true;
  const servicePoint = getBestPcServicePoint(entity, pc);
  const ignoreIds = getNearbyPcIgnoreIds(servicePoint || getPcAccessPoint(pc), 88, pc.id)
    .concat(getNearbyPcIgnoreIds(entity, 54));
  const arrived = runWithIgnoredPcs(entity, ignoreIds, () => (
    servicePoint && (distance(entity, servicePoint) <= 26 || moveToward(entity, servicePoint, speed, dt))
  ));
  return Boolean(arrived || isCloseEnoughToServicePc(entity, pc));
}

function findFreePc(guest = null) {
  if (guest && guest.guestType) {
    return layout.pcs.find((pc) => pcMatchesGuest(pc, guest.guestType));
  }
  return layout.pcs.find((pc) => !pc.occupiedBy && !pc.dirty && !pc.broken);
}

function getGuestPlayDuration(guestType) {
  if (!guestType) return random(28, 42);
  switch (guestType.id) {
    case "budgetHall": return random(20, 32);
    case "regularHall": return random(28, 44);
    case "roomDuo": return random(34, 54);
    case "privateRoom": return random(42, 68);
    case "highSpec": return random(50, 82);
    default: return random(28, 42);
  }
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
    playDuration: getGuestPlayDuration(guestType),
    demandRollTimer: random(5, 9),
    demand: null,
    demandDone: false,
    toiletRollTimer: random(8, 15),
    toiletTimer: 0,
    toiletDone: false,
    stuckTimer: 0,
    guestType,
    speed: random(44, 58),
    palette
  });
  state.guestId += 1;
}

function updateSpawn() {
  if (!state.businessOpen) return;
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

function getMonthIndex() {
  return Math.floor(getDayIndex() / GAME_MONTH_DAYS);
}

function getDayIndex() {
  return Math.floor(state.time / GAME_DAY_SECONDS);
}

function getCurrentDayOfMonth() {
  return getDayIndex() % GAME_MONTH_DAYS + 1;
}

function getCurrentMonth() {
  return Math.floor(getDayIndex() / GAME_MONTH_DAYS) + 1;
}

function getWeekdayIndex() {
  return getDayIndex() % 7;
}

function getWeekdayName() {
  return ["\u5468\u4e00", "\u5468\u4e8c", "\u5468\u4e09", "\u5468\u56db", "\u5468\u4e94", "\u5468\u516d", "\u5468\u65e5"][getWeekdayIndex()];
}

function getCurrentHour() {
  return Math.floor((state.time % GAME_DAY_SECONDS) / GAME_DAY_SECONDS * 24);
}

function createMonthlyLedger(monthIndex = getMonthIndex()) {
  return {
    monthIndex,
    internet: 0,
    companion: 0,
    products: {},
    total: 0
  };
}

function createDailyLedger(dayIndex = getDayIndex()) {
  return {
    dayIndex,
    internet: 0,
    companion: 0,
    products: {},
    total: 0
  };
}

function normalizeMonthlyLedger(ledger, monthIndex = getMonthIndex()) {
  if (!ledger || ledger.monthIndex !== monthIndex) return createMonthlyLedger(monthIndex);
  const normalizedProducts = Object.keys(ledger.products || {}).reduce((result, id) => {
    result[id] = Number.isFinite(ledger.products[id]) ? ledger.products[id] : 0;
    return result;
  }, {});
  const normalized = {
    monthIndex,
    internet: Number.isFinite(ledger.internet) ? ledger.internet : 0,
    companion: Number.isFinite(ledger.companion) ? ledger.companion : 0,
    products: normalizedProducts,
    total: Number.isFinite(ledger.total) ? ledger.total : 0
  };
  normalized.total = normalized.internet + normalized.companion +
    Object.values(normalized.products).reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
  return normalized;
}

function normalizeDailyLedger(ledger, dayIndex = getDayIndex()) {
  if (!ledger) return createDailyLedger(dayIndex);
  const normalizedProducts = Object.keys(ledger.products || {}).reduce((result, id) => {
    result[id] = Number.isFinite(ledger.products[id]) ? ledger.products[id] : 0;
    return result;
  }, {});
  const normalized = {
    dayIndex,
    internet: Number.isFinite(ledger.internet) ? ledger.internet : 0,
    companion: Number.isFinite(ledger.companion) ? ledger.companion : 0,
    products: normalizedProducts,
    total: Number.isFinite(ledger.total) ? ledger.total : 0
  };
  normalized.total = normalized.internet + normalized.companion +
    Object.values(normalized.products).reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
  return normalized;
}

function ensureMonthlyLedger() {
  const monthIndex = getMonthIndex();
  if (!state.monthlyLedger || state.monthlyLedger.monthIndex !== monthIndex) {
    state.monthlyLedger = createMonthlyLedger(monthIndex);
  }
}

function recordDailyRevenue(kind, amount, productId = null) {
  ensureMonthlyLedger();
  const value = Math.max(0, Math.floor(amount || 0));
  if (value <= 0) return;

  if (kind === "internet") {
    state.monthlyLedger.internet += value;
  } else if (kind === "companion") {
    state.monthlyLedger.companion += value;
  } else if (kind === "product" && productId) {
    state.monthlyLedger.products[productId] = (state.monthlyLedger.products[productId] || 0) + value;
  }
  state.monthlyLedger.total += value;
}

function isWeekendRushDay() {
  return getWeekdayIndex() >= 4;
}

function isGoldenHour() {
  const hour = getCurrentHour();
  return hour >= 17 && hour < 20;
}

function isLateNight() {
  const hour = getCurrentHour();
  return hour >= 23 || hour < 7;
}

function getTimeTrafficFactor() {
  let factor = isWeekendRushDay() ? 1.45 : 1;
  if (isGoldenHour()) factor *= isWeekendRushDay() ? 1.75 : 1.35;
  if (isLateNight()) factor *= 0.46;
  return factor;
}

function getTrafficPower() {
  const equipmentAverage = layout.pcs.reduce((sum, pc) => sum + pc.equipmentLevel, 0) / Math.max(1, layout.pcs.length);
  const cleanlinessFactor = 0.35 + state.cleanliness / 100 * 0.75;
  const equipmentFactor = 0.65 + equipmentAverage * 0.18;
  const scaleFactor = 0.62 + Math.min(layout.pcs.length, 12) * 0.05;
  return cleanlinessFactor * equipmentFactor * scaleFactor * getTimeTrafficFactor() * getActivityTrafficFactor();
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

function getExitOutsidePoint() {
  return { x: layout.entrance.x - 42, y: layout.entrance.y, outside: true };
}

function getExitInsideCandidates() {
  const room = layout.room;
  return [
    { x: room.x + 18, y: layout.entrance.y },
    { x: room.x + 34, y: layout.entrance.y - 24 },
    { x: room.x + 34, y: layout.entrance.y + 24 },
    { x: room.x + 56, y: layout.entrance.y },
    { x: room.x + 64, y: layout.entrance.y - 36 },
    { x: room.x + 64, y: layout.entrance.y + 36 }
  ].map((point) => getAreaSafePoint(room, point.x, point.y)).filter(Boolean);
}

function isExitCandidateUsable(entity, point) {
  if (!point || isWalkBlockingPoint(point.x, point.y, entity)) return false;
  if (!getWalkableAreaAtPoint(point.x, point.y) && !isEntranceWalkway(point.x, point.y)) return false;
  return !getMovementBlockerForRoute(entity, point, entity);
}

function getGuestExitInsidePoint(guest) {
  const candidates = getExitInsideCandidates()
    .map((point) => ({
      point,
      usable: isExitCandidateUsable(guest, point),
      score: Math.hypot(guest.x - point.x, guest.y - point.y)
    }))
    .sort((a, b) => (a.usable === b.usable ? a.score - b.score : a.usable ? -1 : 1));
  return candidates[0] ? candidates[0].point : { x: layout.room.x + 18, y: layout.entrance.y };
}

function getGuestExitTarget(guest) {
  if (guest.exitStage === "outside" ||
      (isEntranceWalkway(guest.x, guest.y) && guest.x <= layout.room.x + 6)) {
    return getExitOutsidePoint();
  }
  const inside = getGuestExitInsidePoint(guest);
  return { x: inside.x, y: inside.y, outside: false };
}

function updateLeavingGuest(guest, index, dt) {
  guest.pathTimer = (guest.pathTimer || 0) + dt;
  guest.exitReleaseTimer = (guest.exitReleaseTimer || 0) + dt;
  const target = getGuestExitTarget(guest);
  const left = moveToward(guest, target, guest.speed + 8, dt);

  if (left && target.outside) {
    if (guest.demand) {
      cancelAssignedDemandWorker(guest);
      guest.demand = null;
    }
    state.guests.splice(index, 1);
    return;
  }

  if (left) {
    guest.exitStage = "outside";
    guest.pathTimer = 0;
    guest.exitReleaseTimer = 0;
    guest.detourPoint = null;
    return;
  }

  const pc = layout.pcs[guest.pcId];
  if (pc && guest.exitStage !== "outside" &&
      guest.exitReleaseTimer > 3 &&
      distanceToRect(guest, getPcVisualBounds(pc)) <= 70) {
    const releasePoint = getSafePointAroundRect(guest, getPcVisualBounds(pc), getPcAccessPoint(pc));
    if (releasePoint) {
      guest.x = releasePoint.x;
      guest.y = releasePoint.y;
      guest.exitReleaseTimer = 0;
      guest.stuckTimer = 0;
      guest.detourPoint = null;
      clearEntityNavigation(guest);
      return;
    }
  }

  if (guest.pathTimer > 2.4 || (guest.stuckTimer || 0) > 1.6) {
    guest.exitStage = "inside";
    guest.detourPoint = null;
    const reroute = getEmergencyReroutePoint(guest, getGuestExitInsidePoint(guest), target);
    if (reroute && !isWalkBlockingPoint(reroute.x, reroute.y, guest)) {
      guest.detourPoint = reroute;
    }
    guest.pathTimer = 0;
  }
}

function getFrontDeskStaffCounts() {
  const workerCashiers = state.workers.filter((worker) => worker.type === "cashier").length;
  const workerManagers = state.workers.filter((worker) => worker.type === "manager").length;
  return {
    cashier: Math.max(state.employees.cashier || 0, workerCashiers),
    manager: Math.max(state.employees.manager || 0, workerManagers)
  };
}

function hasFrontDeskStaff() {
  const counts = getFrontDeskStaffCounts();
  return counts.cashier > 0 || counts.manager > 0;
}

function getFrontDeskDuration() {
  const counts = getFrontDeskStaffCounts();
  const staffPower = counts.cashier * 1 + counts.manager * 0.75;
  if (staffPower > 0) return Math.max(0.32, 1.08 - staffPower * 0.16);
  return 0;
}

function getFrontDeskServicePoint() {
  return layout.queue[0] || {
    x: layout.counter.x - 12,
    y: layout.counter.y + layout.counter.h + 26
  };
}

function assignGuestToPc(guest, pc, manual = false) {
  if (!guest || !pc) return false;
  pc.occupiedBy = guest.id;
  guest.pcId = pc.id;
  guest.state = "toPc";
  guest.pathTimer = 0;
  guest.queueIndex = -1;
  guest.manualCheckInPrompted = false;
  guest.detourPoint = null;
  guest.stuckTimer = 0;
  say(`顾客 ${guest.id} ${manual ? "已手动开卡" : "已开卡"}，分配到 ${pc.id + 1} 号机。`);
  return true;
}

function getFirstWaitingCheckInGuest() {
  return state.guests
    .filter((guest) => guest.state === "queueing" || guest.state === "entering")
    .sort((a, b) => {
      const aIndex = Number.isFinite(a.queueIndex) && a.queueIndex >= 0 ? a.queueIndex : 99;
      const bIndex = Number.isFinite(b.queueIndex) && b.queueIndex >= 0 ? b.queueIndex : 99;
      return aIndex - bIndex || distance(a, getFrontDeskServicePoint()) - distance(b, getFrontDeskServicePoint());
    })[0] || null;
}

function isGuestReadyForCheckIn(guest) {
  if (!guest) return false;
  if (guest.state === "queueing") return true;
  const servicePoint = layout.queue[guest.queueIndex] || getFrontDeskServicePoint();
  return distance(guest, servicePoint) <= 18;
}

function startFrontDeskCheckIn(guest, manual = false, reservedPc = null) {
  if (!guest || state.frontDesk.busyGuestId) return false;
  const pc = reservedPc || findFreePc(guest);
  if (!pc) return false;
  const duration = manual ? MANUAL_CHECKIN_DURATION : getFrontDeskDuration();
  if (duration <= 0) return false;
  guest.state = "checkingIn";
  guest.pathTimer = 0;
  guest.detourPoint = null;
  guest.stuckTimer = 0;
  state.frontDesk.busyGuestId = guest.id;
  state.frontDesk.timer = duration;
  state.frontDesk.duration = duration;
  state.frontDesk.manual = manual;
  state.frontDesk.reservedPcId = pc.id;
  return true;
}

function tryManualCheckInGuest(guest) {
  if (!guest || (guest.state !== "queueing" && guest.state !== "entering")) return false;

  const frontGuest = getFirstWaitingCheckInGuest();
  if (frontGuest && frontGuest.id !== guest.id) {
    say("先给排在最前面的顾客开卡。");
    return true;
  }

  const servicePoint = layout.queue[guest.queueIndex] || getFrontDeskServicePoint();
  if (guest.state === "entering" && distance(guest, servicePoint) > 36) {
    say("等顾客走到前台后，再点击开卡。");
    return true;
  }

  const manual = !hasFrontDeskStaff();
  const pc = findFreePc(guest);
  if (!pc) {
    say("没有符合这位顾客要求的空机器。");
    return true;
  }

  if (!startFrontDeskCheckIn(guest, manual, pc)) {
    say("前台正在处理上一位顾客。");
  }
  return true;
}

function updateFrontDesk(dt) {
  if (!state.frontDesk.busyGuestId) {
    state.frontDesk.duration = getFrontDeskDuration();
    state.frontDesk.manual = false;
  }

  if (state.frontDesk.busyGuestId) {
    state.frontDesk.timer -= dt;
    if (state.frontDesk.timer > 0) return;

    const guest = state.guests.find((item) => item.id === state.frontDesk.busyGuestId);
    const reservedPc = layout.pcs.find((item) => item.id === state.frontDesk.reservedPcId);
    const pc = reservedPc && guest && pcMatchesGuest(reservedPc, guest.guestType) ? reservedPc : findFreePc(guest);

    if (guest && pc) {
      assignGuestToPc(guest, pc, Boolean(state.frontDesk.manual));
    } else if (guest) {
      guest.state = "queueing";
      guest.manualCheckInPrompted = false;
    }

    state.frontDesk.busyGuestId = null;
    state.frontDesk.timer = 0;
    state.frontDesk.manual = false;
    state.frontDesk.reservedPcId = null;
  }

  if (!hasFrontDeskStaff()) {
    const waitingGuest = getFirstWaitingCheckInGuest();
    if (waitingGuest && findFreePc(waitingGuest) && !waitingGuest.manualCheckInPrompted) {
      waitingGuest.manualCheckInPrompted = true;
      say("没有收银员或店长，点击前台顾客手动开卡。");
    }
    return;
  }

  const nextGuest = getFirstWaitingCheckInGuest();
  if (!isGuestReadyForCheckIn(nextGuest)) return;
  const pc = nextGuest && findFreePc(nextGuest);
  if (!nextGuest || !pc) return;

  startFrontDeskCheckIn(nextGuest, false, pc);
}

function updateQueueTargets() {
  const waiting = state.guests.filter((guest) => (
    guest.state === "entering" ||
    guest.state === "queueing" ||
    guest.state === "checkingIn"
  ));

  waiting.forEach((guest, index) => {
    guest.queueIndex = Math.min(index, layout.queue.length - 1);
    if (guest.state === "entering" && distance(guest, layout.queue[guest.queueIndex]) < 12) {
      guest.state = "queueing";
    }
  });
}

function finishPlaying(guest, pc) {
  const hourlyRate = getPcHourlyRate(pc);
  const hoursPlayed = Math.max(1, Math.round(guest.playDuration / 15));
  const income = hourlyRate * hoursPlayed;

  state.cash += income;
  recordDailyRevenue("internet", income);
  state.served += 1;
  updateCafeLevel();
  pc.sessionsServed += 1;
  pc.occupiedBy = null;
  pc.dirty = true;
  if (state.toilet.busyGuestId === guest.id) {
    state.toilet.busyGuestId = null;
  }
  guest.state = "leaving";
  guest.exitStage = "inside";
  if (guest.demand) {
    cancelAssignedDemandWorker(guest);
    guest.demand = null;
  }
  guest.pathTimer = 0;
  guest.exitReleaseTimer = 0;
  guest.detourPoint = null;
  state.cleanliness = Math.max(0, state.cleanliness - 3);
  markSaveDirty();
  if (!maybeBreakPc(pc)) {
    say("顾客 " + guest.id + " 下机结账，收入 " + income + " 元。机位需要清理。");
  }
}

function updateCleanliness(dt) {
  const dirtyPcCount = layout.pcs.filter((pc) => pc.dirty).length;
  const activeGuests = state.guests.filter((guest) => (
    guest.state === "playing" ||
    guest.state === "toToilet" ||
    guest.state === "usingToilet" ||
    guest.state === "backToPc"
  )).length;
  const toiletPenalty = isToiletNeedsCleaning() ? 0.026 : 0;
  const floorWear = activeGuests > 0 ? 0.001 + activeGuests * 0.0007 : 0;
  const decay = (0.0015 * activeGuests + 0.012 * dirtyPcCount + toiletPenalty + floorWear) * dt;

  state.cleanliness = Math.max(0, state.cleanliness - decay);
}

function assignWorkerTasks() {
  sanitizeWorkerTaskLocks();
  getIdleWorkers().forEach((worker) => {
    if (canWorkerRepair(worker) && assignRepairTask(worker)) return;
    if (canWorkerDeliver(worker) && assignDeliveryTask(worker)) return;
    if (canWorkerClean(worker) && assignCleaningTask(worker)) return;
  });
}

function assignRepairTask(worker) {
  const pc = layout.pcs.find((item) => item.broken && !item.repairWorkerId);
  if (!pc) return false;

  pc.repairWorkerId = worker.id;
  worker.state = "toRepairPc";
  worker.targetPcId = pc.id;
  worker.pathTimer = 0;
  clearEntityNavigation(worker);
  return true;
}

function assignDeliveryTask(worker) {
  const guest = state.guests.find((item) => (
    item.state === "playing" &&
    item.demand &&
    !item.demand.assignedWorkerId &&
    canServeDemandAutomatically(item, worker) &&
    (!item.demand.blockedWorkerIds || !item.demand.blockedWorkerIds.includes(worker.id))
  ));

  if (!guest) return false;

  const deliveryPoint = getGuestDeliveryPoint(guest, worker);
  if (!deliveryPoint || !canStandAtMovementPoint(worker, deliveryPoint) ||
      isWalkBlockingPoint(deliveryPoint.x, deliveryPoint.y, worker)) {
    return false;
  }

  guest.demand.assignedWorkerId = worker.id;
  worker.state = "toDeliver";
  worker.targetGuestId = guest.id;
  worker.targetProductId = guest.demand.productId;
  worker.targetPcId = Number.isFinite(guest.pcId) ? guest.pcId : null;
  worker.pathTimer = 0;
  clearEntityNavigation(worker);
  return true;
}

function getGuestDeliveryPoint(guest, entity = null) {
  const pc = guest ? layout.pcs[guest.pcId] : null;
  if (pc) {
    const worker = entity;
    const servicePoint = worker ? getBestPcServicePoint(worker, pc) : null;
    const accessPoint = getPcAccessPoint(pc);
    const candidate = servicePoint || accessPoint;
    if (candidate && canStandAtMovementPoint(worker || guest, candidate) &&
        !isWalkBlockingPoint(candidate.x, candidate.y, worker || guest)) {
      return candidate;
    }
    return accessPoint;
  }
  return guest ? { x: guest.x, y: guest.y + 18 } : null;
}

function isWorkerCloseEnoughToDeliver(worker, guest, target) {
  if (!worker || !guest || !target) return false;
  // Removed "distance(worker, guest) <= 24" — that check triggered delivery when the
  // worker passed beside the PC without reaching the access point, causing mid-air handoffs.
  return distance(worker, target) <= 6;
}

function canServeDemandAutomatically(guest, worker) {
  if (isCompanionDemand(guest.demand)) {
    return worker && worker.type === "companion" && state.employees.companion > 0;
  }
  if (!worker || (worker.type !== "cashier" && worker.type !== "manager")) return false;
  const product = getProductById(guest.demand.productId);
  return product &&
    state.cafeLevel >= product.unlockLevel &&
    (state.inventory[product.id] || 0) > 0;
}

function assignCleaningTask(worker) {
  if (worker.type === "floor") {
    return assignPcCleaningTask(worker);
  }

  if (worker.type === "cleaner") {
    return assignToiletCleaningTask(worker) || assignFloorMopTask(worker);
  }

  return false;
}

function assignPcCleaningTask(worker) {
  const pc = layout.pcs
    .filter((item) => item.dirty && !item.cleanWorkerId)
    .sort((a, b) => distance(worker, getPcAccessPoint(a)) - distance(worker, getPcAccessPoint(b)))[0];
  if (!pc) return false;

  pc.cleanWorkerId = worker.id;
  worker.state = "toCleanPc";
  worker.targetPcId = pc.id;
  worker.pathTimer = 0;
  clearEntityNavigation(worker);
  return true;
}

function assignToiletCleaningTask(worker) {
  if (!isToiletNeedsCleaning() || state.toilet.cleanWorkerId || state.toilet.busyGuestId) return false;

  state.toilet.cleanWorkerId = worker.id;
  worker.state = "toCleanToilet";
  worker.pathTimer = 0;
  clearEntityNavigation(worker);
  return true;
}

function assignFloorMopTask(worker) {
  if (state.cleanliness >= 96 || state.floorCleaningWorkerId) return false;

  state.floorCleaningWorkerId = worker.id;
  worker.state = "toMopFloor";
  worker.pathTimer = 0;
  clearEntityNavigation(worker);
  return true;
}

function getFloorMopPoint(worker) {
  const room = layout.room;
  const candidates = getWorkerPatrolPoints();
  const start = worker.homeIndex || 0;
  for (let offset = 0; offset < candidates.length; offset += 1) {
    const point = candidates[(start + offset) % candidates.length];
    if (point) return point;
  }
  return getAreaSafePoint(room, room.x + 44, room.y + room.h - 48);
}

function updateWorkers(dt) {
  assignWorkerTasks();
  updateManagerRestock(dt);

  state.workers.forEach((worker) => {
    if (updateWorkerEntrapment(worker, dt)) return;

    if (worker.state === "station") {
      if (shouldWorkerRoam(worker)) {
        worker.idleTimer = (worker.idleTimer || 0) + dt;
        const target = worker.idleTarget || getWorkerRoamTarget(worker);
        if (worker.type === "floor" && (worker.idleTimer || 0) > 2) {
          const nearbyDirtyPc = layout.pcs
            .filter((pc) => pc.dirty && !pc.cleanWorkerId)
            .find((pc) => distance(worker, getPcAccessPoint(pc)) < 80);
          if (nearbyDirtyPc) {
            nearbyDirtyPc.cleanWorkerId = worker.id;
            worker.state = "toCleanPc";
            worker.targetPcId = nearbyDirtyPc.id;
            worker.pathTimer = 0;
            worker.stuckTimer = 0;
            clearEntityNavigation(worker);
            return;
          }
        }
        const arrived = runWithIgnoredPcs(worker, getWorkerFreeMovePcIds(worker), () => moveToward(worker, target, 22, dt));
        if (arrived || distance(worker, target) <= 8 || worker.idleTimer > 12) {
          worker.stuckTimer = 0;
          worker.detourPoint = null;
          clearEntityNavigation(worker);
          getWorkerRoamTarget(worker);
        }
      } else {
        const home = getWorkerHome(worker);
        // Validate home: standable AND reachable via navigation
        const homeStandable = canStandAtMovementPoint(worker, home) && !isWalkBlockingPoint(home.x, home.y, worker);
        const homeReachable = homeStandable && computeNavigationPath(worker, home) !== null;
        const effectiveHome = homeReachable
          ? home
          : getWorkerFallbackPoint(worker);
        // If already at effective home, stay still
        if (distance(worker, effectiveHome) <= 6) {
          worker.x = effectiveHome.x;
          worker.y = effectiveHome.y;
          worker.pathTimer = 0;
          worker.stuckTimer = 0;
          worker.detourPoint = null;
          clearEntityNavigation(worker);
          return;
        }
        worker.pathTimer = (worker.pathTimer || 0) + dt;
        const ignoreIds = (worker.type === "cleaner" || worker.type === "floor")
          ? layout.pcs.map((pc) => pc.id)
          : (worker.type === "manager" || worker.type === "cashier")
            ? getNearbyPcIgnoreIds(worker, 72)
            : [];
        const arrived = runWithIgnoredPcs(worker, ignoreIds, () => moveToward(worker, effectiveHome, 36, dt));
        if (arrived || distance(worker, effectiveHome) <= 8) {
          worker.pathTimer = 0;
          worker.stuckTimer = 0;
          worker.detourPoint = null;
          clearEntityNavigation(worker);
        } else {
          // Stuck tiered recovery: 0.5s clear nav, 1.0s nudge, 2.0s teleport
          worker.stuckTimer = (worker.stuckTimer || 0) + dt;
          if (worker.stuckTimer >= 2.0) {
            resetWorkerToFallback(worker);
          } else if (worker.stuckTimer >= 1.0) {
            nudgeWorkerToSafePoint(worker);
          } else if (worker.stuckTimer >= 0.5) {
            clearEntityNavigation(worker);
          }
        }
      }
      return;
    }

    if (worker.state === "toCleanPc") {
      worker.pathTimer = (worker.pathTimer || 0) + dt;
      const pc = layout.pcs[worker.targetPcId];
      if (!pc || !pc.dirty) {
        resetWorker(worker);
        return;
      }
      const cleanTarget = worker.type === "floor"
        ? { x: pc.seatX + 14, y: pc.seatY }
        : null;
      const arrived = cleanTarget
        ? (distance(worker, cleanTarget) <= 6 || moveToward(worker, cleanTarget, 58, dt))
        : moveToPcServicePoint(worker, pc, 58, dt);
      if (arrived) {
        worker.state = "cleaningPc";
        worker.pathTimer = 0;
        worker.taskTimer = 1.6;
      } else if (worker.pathTimer > 5) {
        resetWorker(worker);
      }
      return;
    }

    if (worker.state === "toRepairPc") {
      worker.pathTimer = (worker.pathTimer || 0) + dt;
      const pc = layout.pcs[worker.targetPcId];
      if (!pc || !pc.broken) {
        resetWorker(worker);
        return;
      }
      if (moveToPcServicePoint(worker, pc, 58, dt)) {
        worker.state = "repairingPc";
        worker.pathTimer = 0;
        worker.taskTimer = 1.25;
      } else if (worker.pathTimer > 5) {
        resetWorker(worker);
      }
      return;
    }

    if (worker.state === "repairingPc") {
      worker.taskTimer -= dt;
      if (worker.taskTimer <= 0) {
        const pc = layout.pcs[worker.targetPcId];
        if (pc && pc.broken) {
          repairPc(pc, true);
        }
        resetWorker(worker);
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
      worker.pathTimer = (worker.pathTimer || 0) + dt;
      if (!isToiletNeedsCleaning()) {
        resetWorker(worker);
        return;
      }
      const maxWait = state.toilet.busyGuestId ? 20 : 8;
      if (worker.pathTimer > maxWait) {
        resetWorker(worker);
        return;
      }
      const toiletServicePoint = getToiletServicePoint();
      // Cleaners ignore all PCs when walking to the toilet so they don't get stuck
      // at desk corners (e.g. PC #3 blocking the right-wall route).
      const toiletArrived = runWithIgnoredPcs(worker, layout.pcs.map((pc) => pc.id), () => (
        moveToward(worker, toiletServicePoint, 58, dt)
      ));
      // True fallback: only after 7 seconds of pathTimer AND still very close to the toilet
      // (toilet actual bounds, no inflation) — prevents completing from outside the door.
      const toiletActualBounds = layout.toilet;
      const blockedNearToilet = distanceToRect(worker, toiletActualBounds) <= 36 && worker.pathTimer > 7.0;
      if (toiletArrived || hasReachedToiletService(worker) || blockedNearToilet) {
        // Snap worker inside the toilet so they are visually present before cleaning animation.
        worker.x = toiletServicePoint.x;
        worker.y = toiletServicePoint.y;
        worker.state = "cleaningToilet";
        worker.pathTimer = 0;
        worker.taskTimer = 1.2;
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

    if (worker.state === "toMopFloor") {
      worker.pathTimer = (worker.pathTimer || 0) + dt;
      if (state.cleanliness >= 99 || worker.pathTimer > 5) {
        resetWorker(worker);
        return;
      }
      const arrived = runWithIgnoredPcs(worker, getWorkerFreeMovePcIds(worker), () => moveToward(worker, getFloorMopPoint(worker), 38, dt));
      if (arrived) {
        worker.state = "moppingFloor";
        worker.pathTimer = 0;
        worker.taskTimer = 1.4;
      }
      return;
    }

    if (worker.state === "moppingFloor") {
      worker.taskTimer -= dt;
      if (worker.taskTimer <= 0) {
        cleanFloorByWorker();
        resetWorker(worker);
      }
      return;
    }

    if (worker.state === "toDeliver") {
      worker.pathTimer = (worker.pathTimer || 0) + dt;
      const guest = state.guests.find((item) => item.id === worker.targetGuestId);
      const deliveryPoint = getGuestDeliveryPoint(guest, worker);
      if (!guest || !guest.demand || guest.demand.productId !== worker.targetProductId || !deliveryPoint) {
        resetWorker(worker);
        return;
      }

      const ignoreIds = Number.isFinite(guest.pcId)
        ? getNearbyPcIgnoreIds(deliveryPoint, 88, guest.pcId).concat(getNearbyPcIgnoreIds(worker, 54))
        : [];
      const arrived = runWithIgnoredPcs(worker, ignoreIds, () => moveToward(worker, deliveryPoint, 62, dt));

      if (arrived || isWorkerCloseEnoughToDeliver(worker, guest, deliveryPoint)) {
        worker.state = "delivering";
        worker.pathTimer = 0;
        worker.taskTimer = 0.7;
      } else if (worker.pathTimer > 5) {
        const failedGuest = state.guests.find((item) => item.id === worker.targetGuestId);
        if (failedGuest && failedGuest.demand) {
          if (!failedGuest.demand.blockedWorkerIds) failedGuest.demand.blockedWorkerIds = [];
          failedGuest.demand.blockedWorkerIds.push(worker.id);
          failedGuest.demand.assignedWorkerId = null;
        }
        resetWorker(worker);
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

function cleanFloorByWorker() {
  state.floorCleaningWorkerId = null;
  state.cleanliness = Math.min(100, state.cleanliness + 8);
  markSaveDirty();
  say("\u4fdd\u6d01\u5df2\u62d6\u5730\uff0c\u4e0a\u7f51\u533a\u66f4\u5e72\u51c0\u4e86\u3002");
}

function serveGuestDemandByWorker(guest) {
  if (isCompanionDemand(guest.demand)) {
    return serveCompanionDemand(guest, true);
  }

  const product = getProductById(guest.demand.productId);
  if (!product || (state.inventory[product.id] || 0) <= 0 || state.cafeLevel < product.unlockLevel) {
    if (guest.demand) guest.demand.assignedWorkerId = null;
    return false;
  }

  state.inventory[product.id] -= 1;
  state.cash += product.sellPrice;
  recordDailyRevenue("product", product.sellPrice, product.id);
  markSaveDirty();
  say(`\u5458\u5de5\u9001\u51fa ${product.name}\uff0c\u989d\u5916\u6536\u5165 ${product.sellPrice} \u5143\u3002`);
  guest.demand = null;
  return true;
}

// Called after any layout change that could shrink the walkable area (e.g. cancelling a
// floor-tile draft). Teleports entities that ended up outside walkable bounds to their
// home position so they are not permanently stuck inside walls.
function rescueEntitiesOutsideWalkableArea() {
  const roomCenter = { x: layout.room.x + layout.room.w / 2, y: layout.room.y + layout.room.h / 2 };

  state.workers.forEach((worker) => {
    if (!getWalkableAreaAtPoint(worker.x, worker.y) && !isEntranceWalkway(worker.x, worker.y)) {
      const home = getWorkerHome(worker);
      const safePos = (home && getWalkableAreaAtPoint(home.x, home.y)) ? home : roomCenter;
      worker.x = safePos.x;
      worker.y = safePos.y;
      worker.stuckTimer = 0;
      worker.detourPoint = null;
      clearEntityNavigation(worker);
      resetWorker(worker);
    }
  });

  state.guests.forEach((guest) => {
    if (!getWalkableAreaAtPoint(guest.x, guest.y) && !isEntranceWalkway(guest.x, guest.y)) {
      // Send displaced guests back toward the entrance to leave naturally.
      guest.x = layout.entrance.x + 4;
      guest.y = layout.entrance.y;
      guest.state = "leaving";
      guest.stuckTimer = 0;
      guest.detourPoint = null;
      clearEntityNavigation(guest);
      if (guest.demand) {
        cancelAssignedDemandWorker(guest);
        guest.demand = null;
      }
    }
  });
}

function getWorkerFallbackPoint(worker, allowHome = true) {
  if (allowHome) {
    const home = getWorkerHome(worker);
    if (home && canStandAtMovementPoint(worker, home) && computeNavigationPath(worker, home) !== null) return home;
  }

  const counter = layout.counter;
  const fallback = getAreaSafePoint(layout.room, counter.x + 42, counter.y + counter.h + 34);
  if (fallback && canStandAtMovementPoint(worker, fallback)) return fallback;

  return getAreaSafePoint(layout.room, layout.room.x + layout.room.w / 2, layout.room.y + 108) ||
    { x: layout.entrance.x + 18, y: layout.entrance.y };
}

function resetWorkerToFallback(worker) {
  const fallback = getWorkerFallbackPoint(worker, false);
  resetWorker(worker);
  worker.x = fallback.x;
  worker.y = fallback.y;
  worker.trappedTimer = 0;
  worker.stuckTimer = 0;
  worker.detourPoint = null;
  clearEntityNavigation(worker);
}

function getSafePointAroundRect(entity, rectValue, fallbackPoint = null) {
  const gap = 18;
  const candidates = [
    { x: rectValue.x - gap, y: rectValue.y + rectValue.h / 2 },
    { x: rectValue.x + rectValue.w + gap, y: rectValue.y + rectValue.h / 2 },
    { x: rectValue.x + rectValue.w / 2, y: rectValue.y - gap },
    { x: rectValue.x + rectValue.w / 2, y: rectValue.y + rectValue.h + gap },
    { x: rectValue.x - gap, y: rectValue.y - gap },
    { x: rectValue.x + rectValue.w + gap, y: rectValue.y - gap },
    { x: rectValue.x - gap, y: rectValue.y + rectValue.h + gap },
    { x: rectValue.x + rectValue.w + gap, y: rectValue.y + rectValue.h + gap }
  ];
  if (fallbackPoint) candidates.push(fallbackPoint);

  return candidates
    .map((point) => {
      const area = getWalkableAreaAtPoint(point.x, point.y);
      return area ? getAreaSafePoint(area, point.x, point.y) : point;
    })
    .filter((point) => point && canStandAtMovementPoint(entity, point))
    .sort((a, b) => distance(entity, a) - distance(entity, b))[0] || fallbackPoint;
}

function rescueEntitiesFromRect(rectValue) {
  if (!rectValue) return;
  const padded = inflateRect(rectValue, 2);

  state.workers.forEach((worker) => {
    if (!isPointInsideRect(worker.x, worker.y, padded)) return;
    const fallback = getWorkerFallbackPoint(worker);
    const point = getSafePointAroundRect(worker, padded, fallback) || fallback;
    resetWorker(worker);
    worker.x = point.x;
    worker.y = point.y;
    worker.trappedTimer = 0;
    clearEntityNavigation(worker);
  });

  state.guests.forEach((guest) => {
    if (guest.state === "playing" || !isPointInsideRect(guest.x, guest.y, padded)) return;
    const fallback = { x: layout.entrance.x + 18, y: layout.entrance.y };
    const point = getSafePointAroundRect(guest, padded, fallback) || fallback;
    guest.x = point.x;
    guest.y = point.y;
    guest.stuckTimer = 0;
    guest.detourPoint = null;
    clearEntityNavigation(guest);
  });
}

function rescueEntitiesFromNewPc(pc) {
  rescueEntitiesFromRect(getPcVisualBounds(pc));
}

function nudgeWorkerToSafePoint(worker) {
  const candidates = [
    { x: worker.x + 20, y: worker.y },
    { x: worker.x - 20, y: worker.y },
    { x: worker.x, y: worker.y + 20 },
    { x: worker.x, y: worker.y - 20 },
    { x: worker.x + 14, y: worker.y + 14 },
    { x: worker.x - 14, y: worker.y + 14 },
    { x: worker.x + 14, y: worker.y - 14 },
    { x: worker.x - 14, y: worker.y - 14 }
  ];
  for (let i = 0; i < candidates.length; i++) {
    const pt = candidates[i];
    if (canStandAtMovementPoint(worker, pt)) {
      worker.x = pt.x;
      worker.y = pt.y;
      worker.stuckTimer = 0;
      worker.detourPoint = null;
      clearEntityNavigation(worker);
      return true;
    }
  }
  return false;
}

function updateWorkerEntrapment(worker, dt) {
  const trapped = (!getWalkableAreaAtPoint(worker.x, worker.y) && !isEntranceWalkway(worker.x, worker.y)) ||
    isWalkBlockingPoint(worker.x, worker.y, worker);
  if (!trapped) {
    worker.trappedTimer = 0;
    return false;
  }

  worker.trappedTimer = (worker.trappedTimer || 0) + dt;
  if (worker.trappedTimer < 0.5) return false;

  const nudged = nudgeWorkerToSafePoint(worker);
  if (nudged) {
    worker.trappedTimer = 0;
  } else {
    resetWorkerToFallback(worker);
  }
  return true;
}

function resetWorker(worker) {
  const pc = layout.pcs[worker.targetPcId];
  if (pc && pc.cleanWorkerId === worker.id) pc.cleanWorkerId = null;
  if (pc && pc.repairWorkerId === worker.id) pc.repairWorkerId = null;
  if (state.toilet.cleanWorkerId === worker.id) state.toilet.cleanWorkerId = null;
  if (state.floorCleaningWorkerId === worker.id) state.floorCleaningWorkerId = null;
  const guest = state.guests.find((item) => item.id === worker.targetGuestId);
  if (guest && guest.demand && guest.demand.assignedWorkerId === worker.id) {
    guest.demand.assignedWorkerId = null;
  }

  worker.targetPcId = null;
  worker.targetGuestId = null;
  worker.targetProductId = null;
  worker.taskTimer = 0;
  worker.pathTimer = 0;
  worker.stuckTimer = 0;
  worker.detourPoint = null;
  worker.movementIgnorePcId = null;
  worker.movementIgnorePcIds = null;
  clearEntityNavigation(worker);
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
      moveToward(guest, getFrontDeskServicePoint(), guest.speed, dt);
      continue;
    }

    if (guest.state === "toPc") {
      const pc = layout.pcs[guest.pcId];
      const arrived = moveToPcSeat(guest, pc, guest.speed, dt);
      guest.pathTimer = (guest.pathTimer || 0) + dt;
      const distToSeat = pc ? distance(guest, { x: pc.seatX, y: pc.seatY }) : 999;
      if (arrived || (guest.pathTimer > 4.5 && distToSeat <= 50)) {
        if (pc) {
          guest.x = pc.seatX;
          guest.y = pc.seatY;
        }
        guest.state = "playing";
        guest.playTimer = guest.playDuration;
        guest.pathTimer = 0;
        guest._navClearedOnce = false;
        clearEntityNavigation(guest);
      } else if (guest.pathTimer > 8 && distToSeat > 50) {
        if (pc) pc.occupiedBy = null;
        guest.pcId = null;
        guest.state = "leaving";
        guest.pathTimer = 0;
        clearEntityNavigation(guest);
      } else if (guest.pathTimer > 4.5 && distToSeat > 50 && !guest._navClearedOnce) {
        clearEntityNavigation(guest);
        guest._navClearedOnce = true;
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
      guest.pathTimer = (guest.pathTimer || 0) + dt;
      const toiletPoint = getToiletServicePoint();
      const arrived = moveToward(guest, toiletPoint, guest.speed, dt);
      if (arrived || hasReachedToiletService(guest)) {
        startGuestUsingToilet(guest);
      } else if (guest.pathTimer > 8) {
        if (distance(guest, toiletPoint) <= 90) {
          startGuestUsingToilet(guest);
        } else {
          if (state.toilet.busyGuestId === guest.id) {
            state.toilet.busyGuestId = null;
          }
          guest.state = "backToPc";
          guest.pathTimer = 0;
          clearEntityNavigation(guest);
        }
      }
      continue;
    }

    if (guest.state === "usingToilet") {
      guest.toiletTimer -= dt;
      if (guest.toiletTimer <= 0) {
        state.toilet.useCount += 1;
        state.toilet.dirty = state.toilet.useCount >= 2 || Math.random() < 0.35;
        if (state.toilet.busyGuestId === guest.id) {
          state.toilet.busyGuestId = null;
        }
        state.cleanliness = Math.max(0, state.cleanliness - 4);
        guest.state = "backToPc";
        markSaveDirty();
        say("\u5395\u6240\u88ab\u4f7f\u7528\u4e86\uff0c\u6e05\u6d01\u503c\u4e0b\u964d\u3002");
      }
      continue;
    }

    if (guest.state === "backToPc") {
      guest.pathTimer = (guest.pathTimer || 0) + dt;
      const pc = layout.pcs[guest.pcId];
      if (!pc) {
        guest.state = "playing";
        guest.pathTimer = 0;
        guest.movementIgnorePcId = null;
        clearEntityNavigation(guest);
        continue;
      }
      guest.movementIgnorePcId = pc.id;
      const arrived = moveToPcSeat(guest, pc, guest.speed, dt);
      const distToPc = distance(guest, { x: pc.seatX, y: pc.seatY });
      if (arrived || (guest.pathTimer > 8 && distToPc <= 50)) {
        guest.x = pc.seatX;
        guest.y = pc.seatY;
        guest.state = "playing";
        guest.pathTimer = 0;
        guest.movementIgnorePcId = null;
        guest._navClearedOnce = false;
        clearEntityNavigation(guest);
      } else if (guest.pathTimer > 10 && distToPc > 50) {
        if (pc) pc.occupiedBy = null;
        guest.pcId = null;
        guest.state = "leaving";
        guest.pathTimer = 0;
        guest.movementIgnorePcId = null;
        guest._navClearedOnce = false;
        clearEntityNavigation(guest);
      } else if (guest.pathTimer > 8 && distToPc > 50 && !guest._navClearedOnce) {
        clearEntityNavigation(guest);
        guest._navClearedOnce = true;
      }
      continue;
    }

    if (guest.state === "leaving") {
      updateLeavingGuest(guest, index, dt);
    }
  }
}

function update(dt) {
  // Clear per-frame movement cache so each frame gets fresh obstacle data.
  _movementBlockingRectsCache = null;

  state.time += dt;
  ensureMonthlyLedger();
  state.messageTimer = Math.max(0, state.messageTimer - dt);
  // updateEquipmentLevel / updateCafeLevel removed from the hot loop —
  // they are now called only when purchases, upgrades, or hiring actually happen.
  updateSpawn();
  updateQueueTargets();
  updateFrontDesk(dt);
  updateGuests(dt);
  updateWorkers(dt);
  updateDoorTimers(dt);
  updateCleanliness(dt);
  updatePayroll();
  updateLayoutHints(dt);
  updateAutoSave(dt);
}

function updateLayoutHints(dt) {
  if (state.invalidFloorHint) {
    state.invalidFloorHint.timer -= dt;
    if (state.invalidFloorHint.timer <= 0) {
      state.invalidFloorHint = null;
    }
  }
  if (state.pcInfoBubble) {
    state.pcInfoBubble.timer -= dt;
    if (state.pcInfoBubble.timer <= 0) {
      state.pcInfoBubble = null;
    }
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

function pixelPanel(x, y, w, h, fill, light = COLORS.counterEdge, dark = COLORS.line) {
  rect(x + 4, y + 4, w, h, "rgba(38, 23, 17, 0.42)");
  rect(x, y, w, h, dark);
  rect(x + 4, y + 4, w - 8, h - 8, fill);
  rect(x + 4, y + 4, w - 8, 4, light);
  rect(x + 4, y + h - 8, w - 8, 4, "rgba(58, 36, 24, 0.42)");
  rect(x + 8, y + 8, 8, 8, "rgba(255, 242, 208, 0.14)");
  rect(x + w - 16, y + 8, 8, 8, "rgba(255, 242, 208, 0.1)");
}

function woodPanel(x, y, w, h, fill = COLORS.counter, light = COLORS.counterEdge) {
  pixelPanel(x, y, w, h, fill, light, COLORS.line);
  rect(x + 8, y + 10, w - 16, 2, "rgba(255, 244, 207, 0.16)");
  rect(x + 8, y + h - 13, w - 16, 2, "rgba(42, 19, 13, 0.28)");
}

function drawWoodPlanks(x, y, w, h, plankH = 18) {
  for (let row = 0; row < h; row += plankH) {
    drawWoodPlankRow(x, y + row, w, Math.min(plankH, h - row), row, plankH);
  }
  rect(x, y + h - 2, w, 2, "rgba(201, 153, 85, 0.58)");
}

function drawGlobalWoodPlanks(area) {
  const plankH = 14;
  const boardW = 72;
  const startRow = Math.floor(area.y / plankH) * plankH;
  const endY = area.y + area.h;
  for (let rowY = startRow; rowY < endY; rowY += plankH) {
    drawWoodPlankRow(area.x, rowY, area.w, plankH, rowY, plankH, boardW);
  }
  rect(area.x, area.y + area.h - 2, area.w, 2, "rgba(113, 73, 38, 0.32)");
}

function drawWoodPlankRow(x, y, w, h, rowSeed, plankH, boardW = 96) {
  const rowIndex = Math.floor(rowSeed / plankH);
  const fill = rowIndex % 2 === 0 ? "#c49350" : "#d0a05a";
  rect(x, y, w, h, fill);
  rect(x, y, w, 2, "rgba(96, 58, 31, 0.34)");

  const offset = (rowIndex % 3) * Math.floor(boardW / 3);
  const startX = Math.floor((x - offset) / boardW) * boardW + offset;
  for (let col = startX; col < x + w; col += boardW) {
    const boardX = Math.max(x, col);
    const boardWClipped = Math.min(col + boardW, x + w) - boardX;
    const tone = seededUnit(rowIndex * 97 + Math.floor(col / boardW) * 31);
    const shade = tone < 0.34 ? "rgba(74, 44, 26, 0.16)" : tone > 0.74 ? "rgba(255, 242, 208, 0.05)" : "rgba(0, 0, 0, 0)";
    rect(boardX, y + 2, boardWClipped, Math.max(2, h - 3), shade);
    if (col > x) {
      rect(col, y + 2, 2, Math.max(4, h - 4), "rgba(96, 58, 31, 0.30)");
    }
  }
}

function drawTinyPlant(x, y, scale = 1) {
  const s = scale;
  rect(x - 8 * s, y + 7 * s, 16 * s, 11 * s, "#7a4a24");
  rect(x - 5 * s, y + 2 * s, 10 * s, 8 * s, "#b87333");
  rect(x - 4 * s, y - 10 * s, 8 * s, 16 * s, COLORS.plant);
  rect(x - 12 * s, y - 5 * s, 10 * s, 9 * s, "#4d7b31");
  rect(x + 2 * s, y - 7 * s, 12 * s, 10 * s, "#76a94f");
  rect(x - 7 * s, y - 15 * s, 14 * s, 8 * s, "#5f8f3b");
}

function isAssetReady(name) {
  return assets[name] && assets[name].ready;
}

function loadAssets() {
  if (CODE_DRAWN_VISUALS_ONLY) return;

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
  if (CODE_DRAWN_VISUALS_ONLY) return false;

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
  drawPixelMeadowBackground();
  drawEntranceCorridor();
  rect(room.x - 8, room.y - 8, room.w + 16, room.h + 16, COLORS.wallDark);
  drawTiledArea(room);

  drawPublicFloors();
  drawDoor();
  drawIndoorDetailsModern();
  drawRentedAreaRooms();
  drawToilet();
  drawSharedStructuralWalls();
  drawAreaDoorways();
  drawInvalidFloorHint();
  drawLayoutSelection();
  drawPlacementHint();
  drawPcPurchaseHint();
  drawMahjongPurchaseHint();
}

function drawPixelMeadowBackground() {
  const hour = getCurrentHour();
  const night = hour >= 19 || hour < 6;
  const bounds = getExpandedWorldBounds();
  const minX = Math.floor(bounds.minX / 24) * 24;
  const minY = Math.floor(bounds.minY / 24) * 24;
  const maxX = Math.ceil(bounds.maxX / 24) * 24;
  const maxY = Math.ceil(bounds.maxY / 24) * 24;
  verticalGradientRect(minX, minY, maxX - minX, maxY - minY, night ? "#1c3529" : "#2e4f2e", night ? "#254528" : "#416a32");
  const step = 24;
  for (let y = minY; y < maxY; y += step) {
    for (let x = minX + ((y / step) % 2 ? 8 : 0); x < maxX; x += step) {
      const tone = night
        ? ((x + y) % 72 === 0 ? "#365f36" : (x + y) % 48 === 0 ? "#183b2a" : "#2c5530")
        : ((x + y) % 72 === 0 ? "#5f8f3b" : (x + y) % 48 === 0 ? "#315a2f" : "#477a36");
      rect(x, y, 6, 6, tone);
      if ((x + y) % 96 === 0) {
        rect(x + 8, y + 10, 4, 4, night ? "#9a7d32" : "#f0b94a");
      }
    }
  }
  if (night) {
    rect(minX, minY, maxX - minX, maxY - minY, "rgba(19, 22, 38, 0.18)");
  }
}

function drawWallPattern(x, y, w, h) {
  rect(x, y, w, h, COLORS.wall);
  for (let row = 0; row < h; row += 22) {
    rect(x, y + row, w, 2, "rgba(213, 180, 111, 0.52)");
    const offset = row % 44 === 0 ? 0 : 34;
    for (let col = offset; col < w; col += 68) {
      rect(x + col, y + row + 2, 2, 20, "rgba(213, 180, 111, 0.32)");
    }
  }
}

function drawTiledArea(area) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(Math.round(area.x), Math.round(area.y), Math.round(area.w), Math.round(area.h));
  ctx.clip();
  rect(area.x, area.y, area.w, area.h, COLORS.floor);
  drawGlobalWoodPlanks(area);
  rect(area.x, area.y, area.w, Math.min(10, area.h), "rgba(255, 242, 208, 0.1)");
  ctx.restore();
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
  const topSegments = drawWallSegments(floor, "top");
  const bottomSegments = drawWallSegments(floor, "bottom");
  const leftSegments = drawWallSegments(floor, "left");
  const rightSegments = drawWallSegments(floor, "right");

  topSegments.forEach((segment) => drawHorizontalWall(segment.start, floor.y - 6, segment.end - segment.start));
  bottomSegments.forEach((segment) => drawHorizontalWall(segment.start, floor.y + floor.h, segment.end - segment.start));
  leftSegments.forEach((segment) => drawVerticalWall(floor.x - 6, segment.start, segment.end - segment.start));
  rightSegments.forEach((segment) => drawVerticalWall(floor.x + floor.w, segment.start, segment.end - segment.start));

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
    if (!isFullOpenConnection(floor, other)) return;

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
  rect(hint.x, hint.y, PUBLIC_FLOOR_SIZE, PUBLIC_FLOOR_SIZE, "rgba(217, 74, 69, 0.22)");
  strokeRect(hint.x, hint.y, PUBLIC_FLOOR_SIZE, PUBLIC_FLOOR_SIZE, COLORS.red, 3);
  text("\u65e0\u6cd5\u94fa\u8bbe", hint.x + PUBLIC_FLOOR_HALF, hint.y + PUBLIC_FLOOR_HALF - 7, 12, COLORS.text, "bold", "center");
}

function drawEntranceCorridor() {
  const corridor = layout.entranceCorridor;
  rect(corridor.x - 6, corridor.y - 6, corridor.w + 10, corridor.h + 12, "#221a18");
  rect(corridor.x, corridor.y, corridor.w, corridor.h, "#182126");
  for (let y = corridor.y + 8; y < corridor.y + corridor.h; y += 18) {
    rect(corridor.x + 8, y, corridor.w - 16, 2, "rgba(82, 74, 64, 0.32)");
  }
  rect(corridor.x + corridor.w - 6, corridor.y, 6, corridor.h, COLORS.wallDark);
  rect(corridor.x + 10, corridor.y + 10, corridor.w - 24, 24, "#2f2621");
  text("\u5165\u53e3", corridor.x + 22, corridor.y + 15, 13, COLORS.text, "bold");
  rect(corridor.x + 12, corridor.y + corridor.h - 32, corridor.w - 28, 12, "#2f2621");
  rect(corridor.x + 18, corridor.y + corridor.h - 28, corridor.w - 40, 4, "#48382d");

  // Door at entrance — open/close based on businessOpen
  const entrance = layout.entrance;
  const doorW = 22;
  const doorH = 52;
  const doorX = entrance.x - 6;
  const doorY = entrance.y - doorH / 2;
  if (state.businessOpen) {
    // Open door — door leaf swung to the left
    rect(doorX - doorW + 6, doorY, 6, doorH, "#7a5c3e");
    rect(doorX - doorW + 10, doorY + 4, 10, doorH - 8, "#9a7b4a");
    rect(doorX - doorW + 14, doorY + 12, 2, doorH - 24, "#d4a85c");
    // Open gap
    rect(doorX, doorY, doorW, doorH, "#0f1518");
  } else {
    // Closed door — solid door blocking entrance
    rect(doorX, doorY, doorW, doorH, "#5a3d28");
    rect(doorX + 4, doorY + 4, doorW - 8, doorH - 8, "#7a5c3e");
    rect(doorX + 8, doorY + 8, doorW - 16, doorH - 16, "#9a7b4a");
    rect(doorX + 12, doorY + 18, 2, doorH - 36, "#d4a85c");
    // Door handle
    rect(doorX + doorW - 8, doorY + doorH / 2 - 3, 4, 6, "#c9a44a");
  }
}

function drawRentedAreaRooms() {
  state.rentedAreas.forEach((area) => {
    if (area.id === 1) return;
    drawTiledArea(area);
    drawRoomOuterWalls(area);
    drawRoomNamePlate(area);
    if (area.typeId === "capsuleRoom") {
      rect(area.x + area.w - 38, area.y + area.h - 36, 26, 20, "#4b3027");
      rect(area.x + area.w - 34, area.y + area.h - 32, 18, 12, COLORS.red);
    } else if (area.typeId === "showerRoom") {
      rect(area.x + area.w / 2 - 13, area.y + 48, 26, 34, "#88c7dc");
      rect(area.x + area.w / 2 - 8, area.y + 42, 16, 8, "#dff7ff");
    }
  });
}

function drawRoomNamePlate(area) {
  const w = Math.min(area.w - 20, Math.max(58, area.name.length * 13 + 18));
  const plate = getRoomNamePlateRect(area, w);
  const x = plate.x;
  const y = plate.y;
  pixelPanel(x, y, w, 24, COLORS.counter, COLORS.counterEdge, COLORS.line);
  text(area.name, area.x + area.w / 2, y + 5, 11, COLORS.text, "bold", "center");
}

function getRoomNamePlateRect(area, w) {
  let y = area.y + 8;
  if (hasStructuralNeighborOnSide(area, "top") && area.h >= 76) {
    y = area.y + area.h - 34;
  }
  if (hasStructuralNeighborOnSide(area, "bottom") && y > area.y + area.h - 46) {
    y = area.y + 8;
  }
  return {
    x: area.x + area.w / 2 - w / 2,
    y
  };
}

function drawRoomOuterWalls(area) {
  if (!hasStructuralNeighborOnSide(area, "top")) {
    drawWallSegments(area, "top").forEach((segment) => drawHorizontalWall(segment.start, area.y - 6, segment.end - segment.start));
  }
  if (!hasStructuralNeighborOnSide(area, "bottom")) {
    drawWallSegments(area, "bottom").forEach((segment) => drawHorizontalWall(segment.start, area.y + area.h, segment.end - segment.start));
  }
  if (!hasStructuralNeighborOnSide(area, "left")) {
    drawWallSegments(area, "left").forEach((segment) => drawVerticalWall(area.x - 6, segment.start, segment.end - segment.start));
  }
  if (!hasStructuralNeighborOnSide(area, "right")) {
    drawWallSegments(area, "right").forEach((segment) => drawVerticalWall(area.x + area.w, segment.start, segment.end - segment.start));
  }
}

function hasStructuralNeighborOnSide(area, side) {
  return getStructuralAreas().some((other) => (
    other.id !== area.id &&
    other.typeId !== "publicFloor" &&
    touchesSide(area, other, side)
  ));
}

function drawHorizontalWall(x, y, w) {
  if (w <= 0) return;
  rect(x, y, w, 6, COLORS.wallDark);
}

function drawVerticalWall(x, y, h) {
  if (h <= 0) return;
  rect(x, y, 6, h, COLORS.wallDark);
}

function drawWallSegments(area, side) {
  const horizontal = side === "top" || side === "bottom";
  const start = horizontal ? area.x : area.y;
  const end = horizontal ? area.x + area.w : area.y + area.h;
  const covered = [];

  getAttachableAreas().forEach((other) => {
    if (other.id === area.id) return;
    if (!touchesSide(area, other, side)) return;
    let overlapStart = horizontal ? Math.max(area.x, other.x) : Math.max(area.y, other.y);
    let overlapEnd = horizontal ? Math.min(area.x + area.w, other.x + other.w) : Math.min(area.y + area.h, other.y + other.h);

    if (isFullOpenConnection(area, other)) {
      covered.push({ start: overlapStart, end: overlapEnd });
      return;
    }

    const door = getDoorGeometryBetween(area, other);
    if (door) {
      overlapStart = horizontal ? door.rect.x : door.rect.y;
      overlapEnd = horizontal ? door.rect.x + door.rect.w : door.rect.y + door.rect.h;
      covered.push({ start: overlapStart, end: overlapEnd });
    }
  });

  return subtractSegments(start, end, covered);
}

function drawSharedStructuralWalls() {
  const areas = getStructuralAreas();
  for (let i = 0; i < areas.length; i += 1) {
    for (let j = i + 1; j < areas.length; j += 1) {
      const a = areas[i];
      const b = areas[j];
      if (!sharesWall(a, b)) continue;
      drawSharedWallBetweenAreas(a, b);
    }
  }
}

function drawSharedWallBetweenAreas(a, b) {
  const door = getDoorGeometryBetween(a, b);
  if (a.y + a.h === b.y || b.y + b.h === a.y) {
    const y = a.y + a.h === b.y ? b.y : a.y;
    const start = Math.max(a.x, b.x);
    const end = Math.min(a.x + a.w, b.x + b.w);
    const gaps = door ? [{ start: door.rect.x, end: door.rect.x + door.rect.w }] : [];
    subtractSegments(start, end, gaps).forEach((segment) => {
      drawHorizontalWall(segment.start, y - 3, segment.end - segment.start);
    });
    return;
  }

  if (a.x + a.w === b.x || b.x + b.w === a.x) {
    const x = a.x + a.w === b.x ? b.x : a.x;
    const start = Math.max(a.y, b.y);
    const end = Math.min(a.y + a.h, b.y + b.h);
    const gaps = door ? [{ start: door.rect.y, end: door.rect.y + door.rect.h }] : [];
    subtractSegments(start, end, gaps).forEach((segment) => {
      drawVerticalWall(x - 3, segment.start, segment.end - segment.start);
    });
  }
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
  const door = getDoorGeometryBetween(a, b);
  if (!door) return;

  drawTiledArea(door.rect);
  drawRoomDoorLeaf(door, a, b, isDoorOpen(a, b));
}

function drawRoomDoorLeaf(door, a, b, open) {
  const inwardArea = getDoorInwardArea(a, b);
  if (door.orientation === "horizontal") {
    rect(door.rect.x + 4, door.center.y - 2, door.rect.w - 8, 4, "#d6a862");
    const opensDown = inwardArea && inwardArea.y > door.center.y;
    if (open) {
      const leafY = opensDown ? door.center.y + 2 : door.center.y - 30;
      rect(door.rect.x + 6, leafY, 8, 28, COLORS.line);
      rect(door.rect.x + 8, leafY + 2, 4, 24, "#9a642f");
      rect(door.rect.x + 9, leafY + 5, 2, 14, "#c5833d");
    } else {
      rect(door.rect.x + 7, door.center.y - 6, door.rect.w - 14, 12, COLORS.line);
      rect(door.rect.x + 9, door.center.y - 4, door.rect.w - 18, 8, "#9a642f");
      rect(door.rect.x + door.rect.w - 15, door.center.y - 1, 3, 3, COLORS.yellow);
    }
    return;
  }

  rect(door.center.x - 2, door.rect.y + 4, 4, door.rect.h - 8, "#d6a862");
  const opensRight = inwardArea && inwardArea.x > door.center.x;
  if (open) {
    const leafX = opensRight ? door.center.x + 2 : door.center.x - 30;
    rect(leafX, door.rect.y + 6, 28, 8, COLORS.line);
    rect(leafX + 2, door.rect.y + 8, 24, 4, "#9a642f");
    rect(leafX + 6, door.rect.y + 9, 14, 2, "#c5833d");
  } else {
    rect(door.center.x - 6, door.rect.y + 7, 12, door.rect.h - 14, COLORS.line);
    rect(door.center.x - 4, door.rect.y + 9, 8, door.rect.h - 18, "#9a642f");
    rect(door.center.x - 1, door.rect.y + door.rect.h - 15, 3, 3, COLORS.yellow);
  }
}

function drawPublicFloorDoorways() {
  getStructuralAreas().forEach((area) => {
    state.publicFloors.forEach((floor) => {
      if (!sharesWall(area, floor)) return;
      if (!isFullOpenConnection(area, floor)) drawDoorwayBetweenAreas(area, floor);
    });
  });

  // Public floor tiles are rendered as one open hall network, so no doorway
  // overlay is needed between them.
}

function drawPlacementHint() {
  const pending = state.pendingExpansion;
  const type = getPendingExpansionType();
  if (!pending || !type) return;

  const size = getAreaSize(type, pending.pcCapacity);
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

function drawPcPurchaseHint() {
  if (!state.pendingPcPurchase) return;

  const worldX = state.camera.x + view.width / 2;
  const worldY = state.camera.y + (view.height - ACTION_BAR_HEIGHT + HUD_HEIGHT) / 2;
  const candidate = getPcPurchaseCandidate(worldX, worldY);
  const fallbackAlignment = getPcAutoAlignment(snapPcPosition(worldX - 21), snapPcPosition(worldY - 18));
  const pc = candidate.pc || createPc(-1, fallbackAlignment.x, fallbackAlignment.y, 1, "");
  const bounds = getPcVisualBounds(pc);
  const canPlace = Boolean(candidate.canPlace);
  rect(bounds.x, bounds.y, bounds.w, bounds.h, canPlace ? "rgba(105, 185, 109, 0.28)" : "rgba(217, 74, 69, 0.28)");
  strokeRect(bounds.x, bounds.y, bounds.w, bounds.h, canPlace ? COLORS.green : COLORS.red, 3);
  const label = canPlace
    ? (candidate.alignmentHint || "\u70b9\u51fb\u653e\u7f6e\u7535\u8111")
    : "\u65e0\u6cd5\u653e\u7f6e";
  text(label, bounds.x + bounds.w / 2, bounds.y + bounds.h / 2 - 12, 12, COLORS.text, "bold", "center");
  if (canPlace && candidate.alignmentHint) {
    text("\u9760\u8fd1\u8bbe\u5907\uff0c\u5df2\u5438\u9644\u5bf9\u9f50", bounds.x + bounds.w / 2, bounds.y + bounds.h / 2 + 6, 10, COLORS.text, "bold", "center");
  }
}

function drawMahjongPurchaseHint() {
  if (!state.pendingMahjongPurchase) return;

  const worldX = state.camera.x + view.width / 2;
  const worldY = state.camera.y + (view.height - ACTION_BAR_HEIGHT + HUD_HEIGHT) / 2;
  const candidate = getMahjongPurchaseCandidate(worldX, worldY);
  const table = candidate.table;
  const canPlace = Boolean(candidate.canPlace);
  rect(table.x, table.y, table.w, table.h, canPlace ? "rgba(105, 185, 109, 0.28)" : "rgba(217, 74, 69, 0.28)");
  strokeRect(table.x, table.y, table.w, table.h, canPlace ? COLORS.green : COLORS.red, 3);
  text(canPlace ? "\u70b9\u51fb\u6446\u653e" : "\u9700\u68cb\u724c\u5ba4", table.x + table.w / 2, table.y + table.h / 2 - 7, 12, COLORS.text, "bold", "center");
}

function drawLayoutSelection() {
  if (!state.layoutToolActive) return;

  if (state.layoutMode === "area" && state.selectedAreaId) {
    const area = getAreaById(state.selectedAreaId);
    if (area) {
      const candidate = getAreaMoveCandidate(area);
      const free = isAreaPlacementFree(candidate, area.id);
      rect(candidate.x, candidate.y, candidate.w, candidate.h, free ? "rgba(105, 185, 109, 0.25)" : "rgba(217, 74, 69, 0.28)");
      strokeRect(candidate.x, candidate.y, candidate.w, candidate.h, free ? COLORS.green : COLORS.red, 3);
      text(free ? "\u53ef\u91cd\u6446" : "\u4e0d\u53ef\u91cd\u6446", candidate.x + candidate.w / 2, candidate.y + candidate.h / 2 - 8, 12, COLORS.text, "bold", "center");
    }
  }

  if (state.layoutMode === "pc" && state.selectedPcId) {
    const pc = getSelectedPc();
    if (pc) {
      const candidate = getPcMoveCandidate(pc);
      const area = getAreaAtPoint(candidate.x + candidate.w / 2, candidate.y + candidate.h / 2) || getAreaById(pc.areaId);
      const canPlace = Boolean(area) && isPcLayoutPositionValid(area, candidate, pc.id);
      const bounds = getPcVisualBounds(candidate);
      rect(bounds.x, bounds.y, bounds.w, bounds.h, canPlace ? "rgba(105, 185, 109, 0.25)" : "rgba(217, 74, 69, 0.28)");
      strokeRect(bounds.x, bounds.y, bounds.w, bounds.h, canPlace ? COLORS.green : COLORS.red, 3);
      text(canPlace ? "\u53ef\u79fb\u52a8" : "\u4e0d\u53ef\u79fb\u52a8", bounds.x + bounds.w / 2, bounds.y + bounds.h / 2 - 8, 12, COLORS.text, "bold", "center");
    }
  }

  if (state.layoutMode === "floor") {
    drawPublicFloorPlacementHint();
    text(`\u5efa\u8bbe\uff1a\u94fa\u8bbe\u5730\u7816 ${PUBLIC_FLOOR_COST}/\u5757`, state.camera.x + view.width / 2, state.camera.y + HUD_HEIGHT + 8, 12, COLORS.yellow, "bold", "center");
  }

  if (state.layoutMode === "partition") {
    drawPartitionPlacementHint();
    const type = getPartitionType(state.pendingPartitionTypeId);
    const direction = state.pendingPartitionOrientation === "vertical" ? "\u7ad6\u5411" : "\u6a2a\u5411";
    text(`\u5efa\u8bbe\uff1a${type ? type.name : "\u9694\u65ad"} ${direction}\uff0c\u70b9\u51fb\u653e\u7f6e`, state.camera.x + view.width / 2, state.camera.y + HUD_HEIGHT + 8, 12, COLORS.yellow, "bold", "center");
  }

  if (state.layoutMode === "partitionMove" && state.selectedPartitionId) {
    const candidate = getSelectedPartitionMoveCandidate();
    if (candidate) {
      const canPlace = isPartitionPlacementValid(candidate, candidate.id);
      rect(candidate.x, candidate.y, candidate.w, candidate.h, canPlace ? "rgba(105, 185, 109, 0.25)" : "rgba(217, 74, 69, 0.28)");
      strokeRect(candidate.x, candidate.y, candidate.w, candidate.h, canPlace ? COLORS.green : COLORS.red, 3);
      text(canPlace ? "\u53ef\u79fb\u52a8" : "\u4e0d\u53ef\u79fb\u52a8", candidate.x + candidate.w / 2, candidate.y - 17, 12, COLORS.text, "bold", "center");
    }
  }

  if (state.layoutMode === "propMove" && state.selectedPropId) {
    const candidate = getSelectedPropMoveCandidate();
    if (candidate) {
      const canPlace = isMovablePropPlacementValid(candidate, state.selectedPropId);
      const bounds = getMovablePropHitBounds(candidate);
      rect(bounds.x, bounds.y, bounds.w, bounds.h, canPlace ? "rgba(105, 185, 109, 0.2)" : "rgba(217, 74, 69, 0.24)");
      strokeRect(bounds.x, bounds.y, bounds.w, bounds.h, canPlace ? COLORS.green : COLORS.red, 3);
      text(canPlace ? "\u53ef\u79fb\u52a8" : "\u4e0d\u53ef\u79fb\u52a8", bounds.x + bounds.w / 2, bounds.y - 17, 12, COLORS.text, "bold", "center");
    }
  }

  if (state.layoutMode === "toiletMove") {
    const candidate = getToiletMoveCandidate();
    const area = candidate.area;
    const canPlace = isToiletMoveCandidateValid(candidate);
    rect(area.x, area.y, area.w, area.h, canPlace ? "rgba(105, 185, 109, 0.25)" : "rgba(217, 74, 69, 0.28)");
    strokeRect(area.x, area.y, area.w, area.h, canPlace ? COLORS.green : COLORS.red, 3);
    text(canPlace ? "\u53ef\u79fb\u52a8\u5395\u6240" : "\u9700\u8d34\u5899\u653e\u7f6e", area.x + area.w / 2, area.y + area.h / 2 - 8, 12, COLORS.text, "bold", "center");
    text("\u5e03\u5c40\uff1a\u70b9\u51fb\u786e\u8ba4\u5395\u6240\u65b0\u4f4d\u7f6e", state.camera.x + view.width / 2, state.camera.y + HUD_HEIGHT + 8, 12, COLORS.yellow, "bold", "center");
  }

  if (state.layoutMode === "deleteArea") {
    text("\u5e03\u5c40\uff1a\u70b9\u51fb\u9694\u65ad\u6216\u65e7\u5305\u95f4\u5220\u9664", state.camera.x + view.width / 2, state.camera.y + HUD_HEIGHT + 8, 12, COLORS.yellow, "bold", "center");
  }
}

function drawPublicFloorPlacementHint() {
  const worldX = state.camera.x + view.width / 2;
  const worldY = state.camera.y + (view.height - ACTION_BAR_HEIGHT + HUD_HEIGHT) / 2;
  const candidate = getPublicFloorCandidate(worldX, worldY);
  const floor = candidate ? candidate.floor : {
    x: snapToRoomTile(worldX - PUBLIC_FLOOR_HALF, "x"),
    y: snapToRoomTile(worldY - PUBLIC_FLOOR_HALF, "y"),
    w: PUBLIC_FLOOR_SIZE,
    h: PUBLIC_FLOOR_SIZE
  };
  clampAreaToWorld(floor);
  const canPlace = Boolean(candidate) &&
    isPublicFloorPlacementFree(floor) &&
    getFloorLayoutExtraCost(getPublicFloorDraftCountAfterAdd()) <= state.cash;
  rect(floor.x, floor.y, floor.w, floor.h, canPlace ? "rgba(105, 185, 109, 0.28)" : "rgba(217, 74, 69, 0.28)");
  strokeRect(floor.x, floor.y, floor.w, floor.h, canPlace ? COLORS.green : COLORS.red, 3);
  text(canPlace ? "\u53ef\u94fa\u8bbe" : "\u65e0\u6cd5\u94fa\u8bbe", floor.x + floor.w / 2, floor.y + floor.h / 2 - 8, 12, COLORS.text, "bold", "center");
}

function drawPartitionPlacementHint() {
  const type = getPartitionType(state.pendingPartitionTypeId);
  if (!type) return;
  const worldX = state.camera.x + view.width / 2;
  const worldY = state.camera.y + (view.height - ACTION_BAR_HEIGHT + HUD_HEIGHT) / 2;
  const partition = getPartitionCandidate(type, worldX, worldY);
  const canPlace = isPartitionPlacementValid(partition) && state.cash >= type.cost;
  rect(partition.x, partition.y, partition.w, partition.h, canPlace ? "rgba(105, 185, 109, 0.3)" : "rgba(217, 74, 69, 0.3)");
  strokeRect(partition.x, partition.y, partition.w, partition.h, canPlace ? COLORS.green : COLORS.red, 3);
  text(canPlace ? "\u53ef\u6446\u653e" : "\u4e0d\u53ef\u6446\u653e", partition.x + partition.w / 2, partition.y - 17, 12, COLORS.text, "bold", "center");
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
  const y = layout.entrance.y;
  rect(room.x - 10, y - 42, 18, 84, COLORS.floor);
  rect(room.x - 10, y - 42, 6, 84, COLORS.wallDark);
  rect(room.x - 10, y - 42, 22, 6, COLORS.wallDark);
  rect(room.x - 10, y + 36, 22, 6, COLORS.wallDark);
  rect(room.x - 46, y - 34, 36, 14, COLORS.line);
  rect(room.x - 42, y - 30, 28, 8, "#9a642f");
  rect(room.x - 38, y - 28, 18, 4, "#c5833d");
  rect(room.x - 46, y + 20, 36, 14, COLORS.line);
  rect(room.x - 42, y + 24, 28, 8, "#9a642f");
  rect(room.x - 38, y + 26, 18, 4, "#c5833d");
  rect(room.x - 8, y - 2, 4, 4, COLORS.yellow);
}

function drawIndoorDetails() {
  const room = layout.room;
  rect(room.x + 22, room.y + 14, 42, 18, "#4b3027");
  strokeRect(room.x + 22, room.y + 14, 42, 18, "#d7a85b", 2);
  text("小黑网吧", room.x + 43, room.y + 17, 12, COLORS.text, "bold", "center");

  rect(room.x + room.w - 52, room.y + room.h - 54, 22, 30, "#7b5a35");
  rect(room.x + room.w - 48, room.y + room.h - 64, 14, 14, COLORS.plant);
  rect(room.x + room.w - 56, room.y + room.h - 58, 14, 12, COLORS.plant);
  rect(room.x + room.w - 38, room.y + room.h - 58, 14, 12, COLORS.plant);
}

function drawCounter() {
  if (isMovingProp("counter")) return;
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

  rect(c.x - 6, c.y + 10, c.w + 12, c.h - 2, COLORS.line);
  rect(c.x, c.y + 14, c.w, c.h - 10, "#9a642f");
  rect(c.x + 6, c.y + 18, c.w - 12, 6, COLORS.counterTop);
  rect(c.x + 10, c.y + c.h - 6, c.w - 20, 8, "#6b3f24");
  rect(c.x + 18, c.y - 13, 24, 30, COLORS.line);
  rect(c.x + 21, c.y - 10, 18, 24, "#fff2d0");
  rect(c.x + 24, c.y - 8, 12, 3, "#c5833d");
  text("\u5427", c.x + 30, c.y - 5, 10, COLORS.line, "bold", "center");
  text("\u53f0", c.x + 30, c.y + 5, 10, COLORS.line, "bold", "center");
  rect(c.x + 22, c.y + 16, 16, 4, COLORS.line);

  rect(c.x + c.w - 39, c.y - 8, 30, 21, COLORS.line);
  rect(c.x + c.w - 35, c.y - 4, 22, 13, COLORS.pcScreen);
  rect(c.x + c.w - 32, c.y - 1, 16, 7, COLORS.pcGlow);
  rect(c.x + c.w - 28, c.y + 13, 8, 4, COLORS.line);

  if (state.frontDesk.busyGuestId) {
    const progress = 1 - state.frontDesk.timer / state.frontDesk.duration;
    rect(c.x + 8, c.y + c.h + 13, c.w - 16, 6, COLORS.line);
    rect(c.x + 9, c.y + c.h + 14, Math.max(0, (c.w - 18) * progress), 4, COLORS.yellow);
  }
}

function drawPc(pc) {
  const assetW = 76 * SPRITE_SCALE.pc;
  const assetH = assetW * 383 / 419;
  if (drawAsset("pcStation", pc.seatX - assetW / 2 + 1, pc.seatY - assetH + 14, assetW, assetH)) {
    drawPcDeskNumber(pc);
    if (pc.areaId !== 1) {
      text(pc.areaName, pc.x + pc.w / 2, pc.y - 34, 9, COLORS.yellow, "bold", "center");
    }
    if (pc.broken) {
      rect(pc.x + pc.w - 12, pc.y + 25, 10, 12, COLORS.red);
      text("!", pc.x + pc.w - 7, pc.y + 24, 13, COLORS.text, "bold", "center");
      drawCleanBubble(pc.x + pc.w / 2, pc.y - 44, "\u7ef4\u4fee");
    } else if (pc.dirty) {
      rect(pc.x + pc.w - 11, pc.y + 27, 8, 8, COLORS.red);
      drawCleanBubble(pc.x + pc.w / 2, pc.y - 44, "\u6e05\u6d01");
    }
    const guest = state.guests.find((item) => item.id === pc.occupiedBy && item.state === "playing");
    if (guest) {
      const progress = 1 - guest.playTimer / guest.playDuration;
      rect(pc.x, pc.y - 14, pc.w, 5, "rgba(20, 31, 37, 0.38)");
      rect(pc.x, pc.y - 14, Math.round(pc.w * progress), 5, PLAY_PROGRESS_COLOR);
    }
    return;
  }

  if (getNormalizedRotation(pc) !== 0) {
    drawOrientedPc(pc);
    return;
  }

  const vx = pc.x - 5;
  const vy = pc.y - 4;
  const vw = pc.w + 10;
  const vh = pc.h + 8;
  ellipse(pc.seatX, pc.seatY + 9, 20, 7, "rgba(58, 36, 24, 0.22)");
  rect(pc.seatX - 13, pc.seatY - 3, 26, 18, COLORS.line);
  rect(pc.seatX - 10, pc.seatY, 20, 13, "#557c8c");
  rect(pc.seatX - 7, pc.seatY - 7, 14, 8, "#6a9aa2");
  rect(pc.seatX - 3, pc.seatY + 14, 6, 12, COLORS.line);
  rect(pc.seatX - 12, pc.seatY + 23, 24, 3, COLORS.line);
  rect(vx - 3, vy + 22, vw + 6, 20, COLORS.line);
  rect(vx, vy + 25, vw, 15, COLORS.pcDesk);
  rect(vx + 4, vy + 25, vw - 8, 3, COLORS.counterEdge);
  rect(vx + 4, vy + 40, 5, 15, COLORS.line);
  rect(vx + vw - 9, vy + 40, 5, 15, COLORS.line);
  rect(vx + 5, vy + 34, 28, 6, COLORS.line);
  rect(vx + 8, vy + 35, 22, 3, "#3f3a31");
  rect(vx + vw - 18, vy + 33, 8, 8, COLORS.line);
  rect(vx + vw - 16, vy + 35, 4, 4, "#3f3a31");
  drawPcBodyByLevel(pc);

  drawPcDeskNumber(pc);
  if (pc.areaId !== 1) {
    text(pc.areaName, pc.x + pc.w / 2, pc.y - 30, 9, COLORS.yellow, "bold", "center");
  }

  if (pc.broken) {
    roundedRect(pc.x + pc.w - 13, pc.y + 25, 10, 12, 3, COLORS.red);
    text("!", pc.x + pc.w - 8, pc.y + 24, 13, COLORS.text, "bold", "center");
    drawCleanBubble(pc.x + pc.w / 2, pc.y - 40, "\u7ef4\u4fee");
  } else if (pc.dirty) {
    roundedRect(pc.x + pc.w - 11, pc.y + 27, 8, 8, 3, COLORS.red);
    drawCleanBubble(pc.x + pc.w / 2, pc.y - 40, "\u6e05\u6d01");
  }

  const guest = state.guests.find((item) => item.id === pc.occupiedBy && item.state === "playing");
  if (guest) {
    const progress = 1 - guest.playTimer / guest.playDuration;
    rect(pc.x, pc.y - 12, pc.w, 5, "rgba(20, 31, 37, 0.38)");
    rect(pc.x, pc.y - 12, Math.round(pc.w * progress), 5, PLAY_PROGRESS_COLOR);
  }
}

function getPcScreenColor(pc) {
  if (pc.broken) return "#8a4a3d";
  if (pc.dirty) return "#707864";
  if (pc.equipmentLevel >= 5) return "#8fd7ff";
  if (pc.equipmentLevel >= 4) return "#b9e3d1";
  if (pc.equipmentLevel >= 3) return "#72c05a";
  return COLORS.pcGlow;
}

function drawPcBodyByLevel(pc) {
  const level = pc.equipmentLevel || 1;
  const screen = getPcScreenColor(pc);

  if (level >= 5) {
    rect(pc.x + 1, pc.y + 5, pc.w - 2, 22, "#cfd6d0");
    strokeRect(pc.x + 1, pc.y + 5, pc.w - 2, 22, COLORS.line, 2);
    rect(pc.x + 5, pc.y + 8, pc.w - 10, 15, screen);
    rect(pc.x + 9, pc.y + 10, 9, 3, "#f4fff1");
    rect(pc.x + 18, pc.y + 28, 8, 7, "#cfd6d0");
    rect(pc.x + 11, pc.y + 35, 22, 3, COLORS.line);
    rect(pc.x + pc.w - 7, pc.y + pc.h + 11, 5, 12, "#dbe0dc");
    strokeRect(pc.x + pc.w - 9, pc.y + pc.h + 8, 9, 18, COLORS.line, 2);
    return;
  }

  if (level >= 4) {
    rect(pc.x + 3, pc.y + 4, pc.w - 6, 23, "#d8d0bd");
    strokeRect(pc.x + 3, pc.y + 4, pc.w - 6, 23, COLORS.line, 2);
    rect(pc.x + 7, pc.y + 8, pc.w - 14, 15, screen);
    rect(pc.x + 10, pc.y + 10, 8, 3, "#f4fff1");
    rect(pc.x + 18, pc.y + 28, 8, 7, "#d8d0bd");
    rect(pc.x + 12, pc.y + 35, 20, 3, COLORS.line);
    rect(pc.x + pc.w - 9, pc.y + pc.h + 8, 10, 18, COLORS.line);
    rect(pc.x + pc.w - 6, pc.y + pc.h + 11, 5, 11, "#5f6b66");
    return;
  }

  if (level >= 3) {
    rect(pc.x + pc.w - 10, pc.y + pc.h + 6, 12, 19, COLORS.line);
    rect(pc.x + pc.w - 7, pc.y + pc.h + 9, 7, 13, "#2d332e");
    rect(pc.x + pc.w - 5, pc.y + pc.h + 11, 3, 9, "#65c05a");
    rect(pc.x + 2, pc.y + 1, pc.w - 4, 27, COLORS.line);
    rect(pc.x + 6, pc.y + 5, pc.w - 12, 19, "#253131");
    rect(pc.x + 9, pc.y + 8, pc.w - 18, 13, screen);
    rect(pc.x + 12, pc.y + 10, 9, 3, "#e5f6d7");
    rect(pc.x + 18, pc.y + 29, 8, 7, "#1d272e");
    return;
  }

  rect(pc.x + pc.w - 10, pc.y + pc.h + 6, 12, 19, COLORS.line);
  rect(pc.x + pc.w - 7, pc.y + pc.h + 9, 7, 13, "#2d332e");
  rect(pc.x + 5, pc.y + 1, pc.w - 10, 4, COLORS.line);
  rect(pc.x + 12, pc.y + 5, pc.w - 24, 7, COLORS.line);
  rect(pc.x + 4, pc.y + 4, pc.w - 8, 24, COLORS.line);
  rect(pc.x + 8, pc.y + 8, pc.w - 16, 16, screen);
  rect(pc.x + 10, pc.y + 10, 7, 3, "#e5f6d7");
  rect(pc.x + 18, pc.y + 29, 8, 7, "#1d272e");
}

function drawOrientedPc(pc) {
  const rotation = getNormalizedRotation(pc);
  ellipse(pc.seatX, pc.seatY + 8, 18, 6, "rgba(58, 36, 24, 0.22)");
  rect(pc.seatX - 12, pc.seatY - 3, 24, 17, COLORS.line);
  rect(pc.seatX - 9, pc.seatY, 18, 12, "#557c8c");

  if (rotation === 180) {
    rect(pc.x - 8, pc.y - 12, pc.w + 16, 18, COLORS.line);
    rect(pc.x - 5, pc.y - 9, pc.w + 10, 12, COLORS.pcDesk);
    rect(pc.x + 4, pc.y + 8, pc.w - 8, 24, COLORS.line);
    rect(pc.x + 8, pc.y + 12, pc.w - 16, 15, pc.broken ? "#8a4a3d" : pc.dirty ? "#707864" : COLORS.pcGlow);
    rect(pc.x + 18, pc.y + 33, 8, 7, "#1d272e");
  } else {
    const leftFacing = rotation === 90;
    const deskX = leftFacing ? pc.x - 8 : pc.x + pc.w - 10;
    rect(deskX, pc.y - 4, 20, pc.h + 28, COLORS.line);
    rect(deskX + 3, pc.y, 14, pc.h + 20, COLORS.pcDesk);
    rect(leftFacing ? pc.x + 8 : pc.x + 1, pc.y + 4, 28, 24, COLORS.line);
    rect(leftFacing ? pc.x + 12 : pc.x + 5, pc.y + 8, 20, 15, pc.broken ? "#8a4a3d" : pc.dirty ? "#707864" : COLORS.pcGlow);
    rect(leftFacing ? pc.x + 37 : pc.x - 5, pc.y + 14, 8, 7, "#1d272e");
  }

  drawPcDeskNumber(pc);
  if (pc.areaId !== 1) {
    text(pc.areaName, pc.x + pc.w / 2, pc.y - 30, 9, COLORS.yellow, "bold", "center");
  }
  if (pc.broken) {
    drawCleanBubble(pc.x + pc.w / 2, pc.y - 40, "\u7ef4\u4fee");
  } else if (pc.dirty) {
    drawCleanBubble(pc.x + pc.w / 2, pc.y - 40, "\u6e05\u6d01");
  }
  const guest = state.guests.find((item) => item.id === pc.occupiedBy && item.state === "playing");
  if (guest) {
    const progress = 1 - guest.playTimer / guest.playDuration;
    rect(pc.x, pc.y - 12, pc.w, 5, "rgba(20, 31, 37, 0.38)");
    rect(pc.x, pc.y - 12, Math.round(pc.w * progress), 5, PLAY_PROGRESS_COLOR);
  }
}

function drawPcDeskNumber(pc) {
  const x = pc.x + 7;
  const y = pc.y + 8;
  rect(x, y, 12, 10, COLORS.line);
  rect(x + 2, y + 2, 8, 6, COLORS.counterEdge);
  text(String(pc.id + 1), x + 6, y - 1, 9, COLORS.line, "bold", "center");
}

function drawCleanBubble(x, y, label) {
  const bubbleW = 44;
  rect(x - bubbleW / 2 - 1, y - 1, bubbleW + 2, 26, COLORS.line);
  rect(x - bubbleW / 2, y, bubbleW, 24, COLORS.text);
  text(label, x, y + 4, 12, COLORS.red, "bold", "center");
  rect(x - 3, y + 22, 6, 6, COLORS.text);
}

function drawPcInfoBubble() {
  ui.pcInfoBubbleButton = null;
  if (!state.pcInfoBubble) return;
  const pc = layout.pcs.find((item) => item.id === state.pcInfoBubble.pcId);
  if (!pc) {
    state.pcInfoBubble = null;
    return;
  }

  const tier = getEquipmentTier(pc.equipmentLevel);
  const label = `${pc.id + 1}\u53f7 ${getPcAreaLabel(pc)}  ${tier.name}  ${getPcHourlyRate(pc)}\u5143/\u5c0f\u65f6`;
  const bubbleW = Math.min(view.width - 24, Math.max(180, label.length * 10 + 18));
  const x = clamp(pc.x + pc.w / 2 - state.camera.x - bubbleW / 2, 12, view.width - bubbleW - 12);
  const y = clamp(pc.y - state.camera.y - 54, HUD_HEIGHT + 8, view.height - ACTION_BAR_HEIGHT - 42);
  ui.pcInfoBubbleButton = { x, y, w: bubbleW, h: 34 };
  rect(x - 1, y - 1, bubbleW + 2, 36, COLORS.line);
  rect(x, y, bubbleW, 34, "#fff7dd");
  text(label, x + bubbleW / 2, y + 8, 12, COLORS.line, "bold", "center");
  rect(x + bubbleW / 2 - 4, y + 32, 8, 8, "#fff7dd");
}

function drawPcUpgradeMenu() {
  ui.pcUpgradeButtons.length = 0;
  if (!state.pcUpgradeMenu) return;
  const pc = layout.pcs.find((item) => item.id === state.pcUpgradeMenu.pcId);
  if (!pc) {
    state.pcUpgradeMenu = null;
    return;
  }

  const tiers = getUpgradeableTiers(pc);
  const panelW = Math.min(view.width - 44, 280);
  const panelH = 68 + tiers.length * 38;
  const x = (view.width - panelW) / 2;
  const y = Math.max(HUD_HEIGHT + 28, view.height / 2 - panelH / 2);
  rect(0, 0, view.width, view.height, "rgba(20, 18, 16, 0.45)");
  pixelPanel(x, y, panelW, panelH, "#fff2d0", "#e8c97a", COLORS.line);
  text(`${pc.id + 1}\u53f7\u673a\u5347\u7ea7\u5230`, x + panelW / 2, y + 14, 15, COLORS.line, "bold", "center");
  text("\u70b9\u9009\u6863\u4f4d\u540e\u518d\u786e\u8ba4\u6263\u6b3e", x + panelW / 2, y + 36, 11, "#7b5634", "bold", "center");

  tiers.forEach((tier, index) => {
    const cost = getPcUpgradeCost(pc, tier.level);
    const button = {
      x: x + 16,
      y: y + 58 + index * 36,
      w: panelW - 32,
      h: 28,
      pc,
      tier
    };
    ui.pcUpgradeButtons.push(button);
    drawWidePanelButton(button, `${tier.name}  ${cost}\u5143`, state.cash >= cost ? "#8b552b" : "#9a6b55");
  });
}

function drawLayoutToolControls() {
  ui.cancelMoveButton = null;
  ui.rotatePartitionButton = null;
  const placingPurchase = Boolean(state.pendingPcPurchase || state.pendingMahjongPurchase);
  if (!state.layoutToolActive && !placingPurchase) return;
  const label = placingPurchase
    ? "\u9000\u51fa\u8d2d\u4e70"
    : state.layoutMode === "pc" ? "\u9000\u51fa\u79fb\u52a8" : state.layoutMode === "deleteArea" ? "\u9000\u51fa\u5220\u9664" : "\u9000\u51fa\u5e03\u5c40";
  const messageY = view.height - ACTION_BAR_HEIGHT - MESSAGE_BAR_HEIGHT - 10;
  ui.cancelMoveButton = {
    x: Math.round(view.width / 2 - 58),
    y: messageY - 48,
    w: 116,
    h: 30
  };
  drawWidePanelButton(ui.cancelMoveButton, label, "#7f5635");

  if (state.layoutMode === "floor") {
    const summary = getFloorLayoutSessionCostText();
    const boxW = Math.min(view.width - 46, 270);
    const boxX = Math.round(view.width / 2 - boxW / 2);
    const boxY = ui.cancelMoveButton.y - 44;
    rect(boxX, boxY, boxW, 34, "rgba(255, 242, 208, 0.94)");
    strokeRect(boxX, boxY, boxW, 34, COLORS.wallDark, 2);
    text(`\u5f53\u524d ${summary.placedCount} \u5757 / \u5df2\u8d2d ${summary.ownedCount} \u5757`, boxX + boxW / 2, boxY + 5, 11, COLORS.line, "bold", "center");
    text(`\u672c\u6b21\u65b0\u589e ${summary.extraCount} \u5757  \u5f85\u652f\u4ed8 ${summary.cost} \u5143`, boxX + boxW / 2, boxY + 19, 11, summary.cost > state.cash ? COLORS.red : COLORS.text, "bold", "center");
  }

  if (state.layoutMode === "partition") {
    ui.rotatePartitionButton = {
      x: Math.round(view.width / 2 - 58),
      y: messageY - 84,
      w: 116,
      h: 30
    };
    drawWidePanelButton(ui.rotatePartitionButton, "\u65cb\u8f6c 90\u00b0", "#8b552b");
  }
}

function drawPcActionMenu() {
  ui.pcActionButtons.length = 0;
  const pc = getPcFromActionMenu();
  if (!pc) {
    state.pcActionMenu = null;
    return;
  }

  const panelW = 96;
  const panelH = 142;
  const sx = pc.x + pc.w + 12 - state.camera.x;
  const sy = pc.y - 24 - state.camera.y;
  const panelX = clamp(sx, 8, view.width - panelW - 8);
  const panelY = clamp(sy, HUD_HEIGHT + 6, view.height - ACTION_BAR_HEIGHT - panelH - 8);

  pixelPanel(panelX, panelY, panelW, panelH, "#fff2d0", "#e8c97a", COLORS.line);
  text(`${pc.id + 1} \u53f7\u673a`, panelX + panelW / 2, panelY + 10, 12, COLORS.line, "bold", "center");

  const actions = [
    { action: "info", label: "\u8bbe\u5907\u4fe1\u606f" },
    { action: "upgrade", label: "\u5347\u7ea7\u8bbe\u5907" },
    { action: "move", label: "\u79fb\u52a8\u8bbe\u5907" },
    { action: "sell", label: "\u51fa\u552e\u8bbe\u5907" }
  ];

  actions.forEach((item, index) => {
    const button = {
      x: panelX + 10,
      y: panelY + 34 + index * 24,
      w: panelW - 20,
      h: 22,
      action: item.action,
      pc
    };
    ui.pcActionButtons.push(button);
    drawWidePanelButton(button, item.label, item.action === "info" ? "#6b3f24" : "#8b552b");
  });
}

function drawPartitionActionMenu() {
  ui.partitionActionButtons.length = 0;
  const partition = getPartitionFromActionMenu();
  if (!partition) {
    state.partitionActionMenu = null;
    return;
  }

  const type = getPartitionType(partition.typeId);
  const panelW = 96;
  const panelH = 118;
  const sx = partition.x + partition.w + 10 - state.camera.x;
  const sy = partition.y - 18 - state.camera.y;
  const panelX = clamp(sx, 8, view.width - panelW - 8);
  const panelY = clamp(sy, HUD_HEIGHT + 6, view.height - ACTION_BAR_HEIGHT - panelH - 8);

  pixelPanel(panelX, panelY, panelW, panelH, "#fff2d0", "#e8c97a", COLORS.line);
  text(type ? type.name : "\u9694\u65ad", panelX + panelW / 2, panelY + 10, 12, COLORS.line, "bold", "center");

  [
    { action: "move", label: "\u79fb\u52a8" },
    { action: "rotate", label: "\u65cb\u8f6c" },
    { action: "sell", label: "\u51fa\u552e" }
  ].forEach((item, index) => {
    const button = {
      x: panelX + 10,
      y: panelY + 34 + index * 24,
      w: panelW - 20,
      h: 22,
      action: item.action,
      partition
    };
    ui.partitionActionButtons.push(button);
    drawWidePanelButton(button, item.label, item.action === "sell" ? "#9a553a" : "#8b552b");
  });
}

function drawPropActionMenu() {
  ui.propActionButtons.length = 0;
  const prop = getPropFromActionMenu();
  if (!prop) {
    state.propActionMenu = null;
    return;
  }

  const bounds = getMovablePropHitBounds(prop);
  const panelW = 104;
  const actions = prop.id === "counter"
    ? [
      { action: "ledger", label: "\u8d26\u672c" },
      { action: "move", label: "\u79fb\u52a8" }
    ]
    : prop.id === "snackShelf"
      ? [
        { action: "warehouse", label: "\u67e5\u5e93\u5b58" },
        { action: "procurement", label: "\u53bb\u91c7\u8d2d" },
        { action: "move", label: "\u79fb\u52a8" }
      ]
      : [
        { action: "move", label: "\u79fb\u52a8" }
      ];
  const panelH = 48 + actions.length * 24;
  const sx = bounds.x + bounds.w + 10 - state.camera.x;
  const sy = bounds.y - 14 - state.camera.y;
  const panelX = clamp(sx, 8, view.width - panelW - 8);
  const panelY = clamp(sy, HUD_HEIGHT + 6, view.height - ACTION_BAR_HEIGHT - panelH - 8);

  pixelPanel(panelX, panelY, panelW, panelH, "#fff2d0", "#e8c97a", COLORS.line);
  text(prop.name, panelX + panelW / 2, panelY + 10, 12, COLORS.line, "bold", "center");

  actions.forEach((item, index) => {
    const button = {
      x: panelX + 12,
      y: panelY + 34 + index * 24,
      w: panelW - 24,
      h: 22,
      action: item.action,
      prop
    };
    ui.propActionButtons.push(button);
    drawWidePanelButton(button, item.label, item.action === "move" ? "#8b552b" : "#4e8f4f");
  });
}

function drawScaledPerson(x, y, drawFn) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(PERSON_VISUAL_SCALE, PERSON_VISUAL_SCALE);
  ctx.translate(-x, -y);
  drawFn();
  ctx.restore();
}

function drawGuest(guest) {
  const x = Math.round(guest.x);
  const y = Math.round(guest.y);
  if (guest.state === "playing") {
    drawSeatedGuest(guest, x, y);
    return;
  }

  const assetW = 31 * PERSON_VISUAL_SCALE;
  const assetH = 50 * PERSON_VISUAL_SCALE;
  if (drawAsset("guest", x - assetW / 2, y - assetH, assetW, assetH)) {
    if (guest.state === "queueing") {
      text("...", x, y - 42, 11, COLORS.text, "bold", "center");
    }
    if (guest.state === "playing" && guest.demand) {
      drawDemandBubble(guest);
    }
    return;
  }

  const palette = guest.palette || guestPalettes[0];
  const skin = palette.skin || "#f3c596";
  const pants = palette.pants || "#24384a";
  const accent = palette.accent || "rgba(255, 242, 208, 0.42)";
  drawScaledPerson(x, y, () => {
    ellipse(x, y + 9, 15, 6, "rgba(38, 23, 17, 0.36)");
    roundedRect(x - 12, y - 11, 24, 23, 8, "#2b1711");
    roundedRect(x - 11, y - 8, 22, 18, 6, palette.shirt);
    rect(x - 9, y - 8, 18, 2, "rgba(255, 242, 208, 0.24)");
    rect(x - 3, y - 6, 6, 15, accent);
    rect(x - 8, y - 3, 5, 3, "rgba(255, 242, 208, 0.34)");
    circle(x, y - 16, 10, COLORS.line);
    circle(x, y - 16, 8, skin);
    roundedRect(x - 8, y - 25, 16, 9, 5, palette.hair);
    rect(x - 9, y - 19, 18, 4, palette.hair);
    roundedRect(x - 11, y - 5, 4, 12, 3, skin);
    roundedRect(x + 7, y - 5, 4, 12, 3, skin);
    roundedRect(x - 7, y + 6, 6, 10, 3, pants);
    roundedRect(x + 1, y + 6, 6, 10, 3, pants);
    circle(x - 2, y - 14, 1, "#203544");
    circle(x + 3, y - 14, 1, "#203544");
  });

  if (guest.state === "queueing") {
    text("...", x, y - 26, 11, COLORS.text, "bold", "center");
  }

  if (guest.state === "playing" && guest.demand) {
    drawDemandBubble(guest);
  }
}

function drawSeatedGuest(guest, x, y) {
  const palette = guest.palette || guestPalettes[0];
  const skin = palette.skin || "#f0c090";
  drawScaledPerson(x, y, () => {
    ellipse(x, y + 8, 14, 5, "rgba(38, 23, 17, 0.34)");
    rect(x - 12, y - 4, 24, 16, "#2b1711");
    rect(x - 10, y - 3, 20, 14, palette.pants || "#557c8c");
    rect(x - 8, y - 8, 16, 9, palette.shirt);
    rect(x - 3, y - 7, 6, 8, palette.accent || "rgba(255, 242, 208, 0.28)");
    circle(x, y - 17, 10, COLORS.line);
    circle(x, y - 17, 8, skin);
    roundedRect(x - 9, y - 25, 18, 8, 4, palette.hair);
    rect(x - 8, y - 20, 16, 4, palette.hair);
    rect(x - 6, y - 21, 12, 3, "rgba(255, 242, 208, 0.28)");
    rect(x - 4, y - 12, 8, 4, "#d99a65");
  });
  if (guest.demand) {
    drawDemandBubble(guest);
  }
}

function drawDemandBubble(guest) {
  const x = Math.round(guest.x);
  const y = Math.round(guest.y) - 38;
  const label = getDemandBubbleLabel(guest);
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
  rect(0, 0, view.width, HUD_HEIGHT, "#261711");
  rect(0, HUD_HEIGHT - 4, view.width, 4, COLORS.counterEdge);

  const panel = {
    x: 18,
    y: SAFE_TOP + 14,
    w: Math.min(view.width - 114, 286),
    h: 78
  };
  pixelPanel(panel.x, panel.y, panel.w, panel.h, COLORS.uiDark, COLORS.counterEdge, COLORS.line);

  const titleW = Math.min(118, Math.max(98, panel.w * 0.44));
  const cleanLabelX = panel.x + titleW + 18;
  const cleanBarX = cleanLabelX + 56;
  const cleanBarW = Math.max(20, panel.x + panel.w - cleanBarX - 12);
  rect(panel.x + 10, panel.y + 10, titleW, 22, "#2f1d14");
  strokeRect(panel.x + 10, panel.y + 10, titleW, 22, COLORS.text, 2);
  text("\u5c0f\u9ed1\u7f51\u5427", panel.x + 10 + titleW / 2, panel.y + 13, 15, COLORS.text, "bold", "center");

  text("\u6e05\u6d01\u503c", cleanLabelX, panel.y + 13, 13, COLORS.red, "bold");
  drawCleanlinessBar(cleanBarX, panel.y + 18, cleanBarW, 9);

  drawCashHud(panel.x + 14, panel.y + 45);
  const calendarW = Math.min(130, Math.max(82, panel.w * 0.43));
  drawCalendarHud(panel.x + panel.w - calendarW - 10, panel.y + 45, calendarW);
}

function drawCashHud(x, y) {
  rect(x - 4, y - 4, 28, 28, "#6b3f24");
  rect(x, y, 20, 20, COLORS.yellow);
  text("$", x + 10, y + 1, 17, COLORS.line, "bold", "center");
  text(`${state.cash}`, x + 42, y + 4, 15, COLORS.green, "bold");
}

function drawCalendarHud(x, y, w) {
  const fullLabel = `${getWeekdayName()}  ${getCurrentMonth()}\u6708${getCurrentDayOfMonth()}\u65e5`;
  const shortLabel = `${getWeekdayName()} ${getCurrentDayOfMonth()}\u65e5`;
  const dayLabel = w < 118 ? shortLabel : fullLabel;
  const iconColor = isLateNight() ? COLORS.blue : COLORS.yellow;

  rect(x, y, w, 24, COLORS.text);
  strokeRect(x, y, w, 24, COLORS.line, 2);
  if (isLateNight()) {
    circle(x + 13, y + 12, 6, iconColor);
    rect(x + 14, y + 6, 6, 12, COLORS.text);
  } else {
    circle(x + 13, y + 12, 5, iconColor);
    rect(x + 12, y + 4, 2, 4, iconColor);
    rect(x + 12, y + 18, 2, 4, iconColor);
    rect(x + 5, y + 11, 4, 2, iconColor);
    rect(x + 18, y + 11, 4, 2, iconColor);
  }
  text(fitTextToWidth(dayLabel, w - 30, 13, "bold"), x + 26, y + 5, 13, COLORS.red, "bold");
}

function drawCleanlinessBar(x, y, w, h) {
  const ratio = Math.max(0, Math.min(1, state.cleanliness / 100));
  const fillColor = ratio > 0.55 ? COLORS.green : ratio > 0.3 ? COLORS.yellow : COLORS.red;
  rect(x, y, w, h, COLORS.text);
  strokeRect(x, y, w, h, COLORS.line, 1);
  rect(x + 2, y + 2, Math.max(0, (w - 4) * ratio), Math.max(1, h - 4), fillColor);
}

function drawSystemMessageBar() {
  const y = view.height - ACTION_BAR_HEIGHT - MESSAGE_BAR_HEIGHT - 10;
  const x = 20;
  const w = view.width - 40;
  rect(0, y - 12, view.width, MESSAGE_BAR_HEIGHT + 22, "#261711");
  rect(x + 4, y + 4, w, 42, "rgba(58, 36, 24, 0.36)");
  rect(x, y, w, 42, COLORS.text);
  strokeRect(x, y, w, 42, COLORS.wallDark, 4);
  rect(x + 6, y + 6, w - 12, 2, "#fff9df");
  const label = state.messageTimer > 0 ? state.message : "\u7cfb\u7edf\u63d0\u793a\u6d88\u606f";
  text(fitTextToWidth(label, w - 24, 15, "bold"), x + w / 2, y + 12, 15, COLORS.red, "bold", "center");
}

function drawActionBar() {
  const y = view.height - ACTION_BAR_HEIGHT;
  clearActionButtons();
  rect(0, y, view.width, ACTION_BAR_HEIGHT, "#261711");
  rect(0, y, view.width, 4, COLORS.counterEdge);
  rect(20, y + 16, view.width - 40, ACTION_BAR_HEIGHT - 26, "#f6e4b8");
  strokeRect(20, y + 16, view.width - 40, ACTION_BAR_HEIGHT - 26, COLORS.wallDark, 4);
  rect(26, y + 22, view.width - 52, 3, COLORS.text);

  text(`\u7b49\u7ea7 Lv.${state.cafeLevel}`, 30, y + 28, 15, COLORS.line, "bold");
  const xp = getCafeLevelProgress();
  const xpX = 112;
  const xpY = y + 34;
  const xpW = 62;
  rect(xpX, xpY, xpW, 8, COLORS.line);
  rect(xpX + 2, xpY + 2, xpW - 4, 4, "#ead19a");
  rect(xpX + 2, xpY + 2, Math.max(0, Math.round((xpW - 4) * xp.current / Math.max(1, xp.required))), 4, COLORS.green);
  text(`${xp.current}/${xp.required}`, xpX + xpW / 2, y + 44, 9, COLORS.line, "bold", "center");
  rect(30, y + 58, 138, 26, "#ead19a");
  strokeRect(30, y + 58, 138, 26, COLORS.line, 2);

  const groupY = y + 59;
  const groupW = 44;
  const groupGap = 2;
  ui.dailyGroupButton = { x: 31, y: groupY, w: groupW, h: 24 };
  ui.buildGroupButton = { x: 31 + (groupW + groupGap), y: groupY, w: groupW, h: 24 };
  ui.systemGroupButton = { x: 31 + (groupW + groupGap) * 2, y: groupY, w: groupW, h: 24 };
  drawActionButton(ui.dailyGroupButton, "\u65e5", state.actionGroup === "daily");
  drawActionButton(ui.buildGroupButton, "\u5efa", state.actionGroup === "build");
  drawActionButton(ui.systemGroupButton, "\u7cfb", state.actionGroup === "system");

  const buttonW = view.width < 350 ? 38 : 48;
  const gap = view.width < 350 ? 6 : 12;
  const buttonH = 50;
  const actionSets = {
    daily: [
      ["warehouseButton", "\u4ed3\u5e93"],
      ["hiringButton", "\u62db\u8058"],
      ["procurementButton", "\u91c7\u8d2d"]
    ],
    build: [
      ["equipmentButton", "\u8bbe\u5907"],
      ["expansionButton", "\u5efa\u8bbe"],
      ["layoutButton", "\u5e03\u5c40", state.layoutToolActive]
    ],
    system: [
      ["settingsButton", "\u8bbe\u7f6e"]
    ]
  };
  const actions = actionSets[state.actionGroup] || actionSets.daily;
  const startX = Math.max(view.width < 350 ? 170 : 184, view.width - 28 - buttonW * actions.length - gap * (actions.length - 1));

  actions.forEach((action, index) => {
    const button = { x: startX + (buttonW + gap) * index, y: y + 30, w: buttonW, h: buttonH };
    ui[action[0]] = button;
    drawActionButton(button, action[1], Boolean(action[2]));
  });
}

function drawActionButton(button, label, active = false) {
  pixelPanel(button.x, button.y, button.w, button.h, active ? "#5f8f3b" : COLORS.counter, active ? "#a7d96a" : COLORS.counterEdge, COLORS.line);
  if (button.h >= 30) {
    drawActionIcon(label, button.x + button.w / 2, button.y + 10, active);
    const size = button.w < 44 ? 10 : 11;
    text(label, button.x + button.w / 2, button.y + button.h - 14, size, COLORS.text, "bold", "center");
  } else {
    const size = button.w < 36 ? 11 : 12;
    text(label, button.x + button.w / 2, button.y + (button.h - size) / 2, size, COLORS.text, "bold", "center");
  }
}

function drawActionIcon(label, x, y, active) {
  const dark = COLORS.line;
  const light = active ? COLORS.text : COLORS.counterEdge;
  if (label === "\u4ed3\u5e93") {
    rect(x - 10, y - 2, 20, 14, dark);
    rect(x - 7, y + 1, 14, 9, "#b97635");
    rect(x - 3, y - 5, 6, 4, light);
  } else if (label === "\u62db\u8058") {
    circle(x, y + 1, 6, "#f3c596");
    rect(x - 8, y + 7, 16, 8, dark);
    rect(x - 5, y + 8, 10, 6, "#203544");
  } else if (label === "\u91c7\u8d2d") {
    rect(x - 10, y + 1, 19, 10, dark);
    rect(x - 7, y + 3, 13, 6, "#78a365");
    rect(x - 7, y - 4, 4, 6, light);
    circle(x - 6, y + 13, 2, dark);
    circle(x + 6, y + 13, 2, dark);
  } else if (label === "\u8bbe\u5907") {
    rect(x - 10, y - 4, 20, 13, dark);
    rect(x - 7, y - 1, 14, 7, COLORS.pcGlow);
    rect(x - 4, y + 10, 8, 3, dark);
  } else if (label === "\u6269\u79df" || label === "\u5efa\u8bbe") {
    rect(x - 10, y - 4, 17, 17, dark);
    rect(x - 7, y - 1, 11, 11, COLORS.floor);
    rect(x + 6, y + 2, 6, 3, light);
    rect(x + 9, y - 1, 3, 9, light);
  } else if (label === "\u5e03\u5c40") {
    rect(x - 10, y - 4, 8, 8, dark);
    rect(x + 2, y - 4, 8, 8, dark);
    rect(x - 10, y + 8, 8, 8, dark);
    rect(x + 2, y + 8, 8, 8, dark);
  } else if (label === "\u8bbe\u7f6e") {
    rect(x - 8, y - 5, 16, 16, dark);
    rect(x - 4, y - 1, 8, 8, light);
    rect(x - 1, y + 2, 2, 2, dark);
  }
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
  const needsCleaning = isToiletNeedsCleaning();
  const flushWithRoomRight = toilet.x === layout.room.x + layout.room.w && verticalOverlap(toilet, layout.room) > 0;
  if (flushWithRoomRight) {
    roundedRect(toilet.x, toilet.y - 6, toilet.w + 6, toilet.h + 12, 6, COLORS.wallDark);
  } else {
    roundedRect(toilet.x - 6, toilet.y - 6, toilet.w + 12, toilet.h + 12, 6, COLORS.wallDark);
  }
  roundedRect(toilet.x, toilet.y, toilet.w, toilet.h, 5, COLORS.wall);
  roundedRect(toilet.x + 4, toilet.y + 4, toilet.w - 8, 22, 4, needsCleaning ? "#b16b66" : COLORS.wallTop);
  const toiletFloor = { x: toilet.x + 9, y: toilet.y + 32, w: toilet.w - 18, h: toilet.h - 42 };
  drawTiledArea(toiletFloor);
  if (needsCleaning) {
    rect(toiletFloor.x, toiletFloor.y, toiletFloor.w, toiletFloor.h, "rgba(139, 85, 43, 0.28)");
  }
  strokeRoundedRect(toilet.x, toilet.y, toilet.w, toilet.h, 5, COLORS.line, 2);
  rect(toilet.x + 12, toilet.y + 6, toilet.w - 24, 18, COLORS.line);
  rect(toilet.x + 14, toilet.y + 8, toilet.w - 28, 14, COLORS.text);
  text("\u5395\u6240", toilet.x + toilet.w / 2, toilet.y + 8, 12, COLORS.line, "bold", "center");
  roundedRect(toilet.x + toilet.w / 2 - 13, toilet.y + 50, 26, 18, 4, "#d7dfe1");
  roundedRect(toilet.x + toilet.w / 2 - 8, toilet.y + 44, 16, 10, 3, COLORS.glass);
  if (state.toilet.useCount > 0) {
    const px = toilet.x + toilet.w / 2 + 4;
    const py = toilet.y + 55;
    rect(px - 5, py + 4, 10, 4, "#7b4a22");
    rect(px - 3, py, 6, 5, "#8b552b");
    rect(px - 1, py - 3, 4, 4, "#9a642f");
  }

  if (needsCleaning) {
    rect(toilet.x + toilet.w - 15, toilet.y + 30, 8, 8, COLORS.red);
    drawCleanBubble(toilet.x + toilet.w / 2, toilet.y - 38, "\u6e05\u5395\u6240");
  }
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

function getPcAreaLabel(pc) {
  const area = getAreaById(pc.areaId);
  if (!area || area.id === 1) return "\u5927\u5385";
  return `${area.name}#${area.id}`;
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
  text(`\u5458\u5de5 ${getEmployeeTotal()}  \u7f51\u5427 Lv.${state.cafeLevel}`, panel.x + panel.w - 132, panel.y + 14, 12, COLORS.text, "bold");

  rect(panel.x + 10, panel.y + 48, panel.w - 20, 34, "#e3b86f");
  const xp = getCafeLevelProgress();
  text(`\u5347\u7ea7\u7ecf\u9a8c\uff1a\u63a5\u5f85 ${xp.current}/${xp.required} \u4f4d\u987e\u5ba2\uff0c\u4e0b\u4e00\u7ea7\u89e3\u9501\u66f4\u591a\u673a\u4f4d`, panel.x + 18, panel.y + 56, 12, "#5d4532", "bold");

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
    text(`\u5165\u804c ${getStaffHireTotal(staff)}  \u6708\u85aa ${staff.salary}`, panel.x + 62, y + 26, 10, "#5d4532", "bold");
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

function drawLedgerPanel() {
  if (!state.ledgerOpen) return;
  ensureMonthlyLedger();

  rect(0, 0, view.width, view.height, "rgba(20, 18, 16, 0.72)");
  const panel = {
    x: 20,
    y: HUD_HEIGHT + 16,
    w: view.width - 40,
    h: Math.min(view.height - HUD_HEIGHT - ACTION_BAR_HEIGHT - 34, 360)
  };
  pixelPanel(panel.x, panel.y, panel.w, panel.h, "#fff2d0", "#e8c97a", COLORS.line);
  text("\u672c\u6708\u8d26\u5355", panel.x + panel.w / 2, panel.y + 14, 18, COLORS.line, "bold", "center");
  text(`${getWeekdayName()}  ${getCurrentMonth()}\u6708${getCurrentDayOfMonth()}\u65e5  \u622a\u6b62 ${String(getCurrentHour()).padStart(2, "0")}:00`, panel.x + panel.w / 2, panel.y + 42, 12, "#7b5634", "bold", "center");

  const rows = [
    { label: "\u7f51\u8d39\u6536\u76ca", value: state.monthlyLedger.internet }
  ];
  products.forEach((product) => {
    const value = state.monthlyLedger.products[product.id] || 0;
    if (value > 0) rows.push({ label: `${product.name}\u6d88\u8d39`, value });
  });
  rows.push({ label: "\u966a\u73a9\u6536\u76ca", value: state.monthlyLedger.companion });

  const rowY = panel.y + 72;
  const rowH = Math.max(18, Math.min(25, Math.floor((panel.h - 160) / Math.max(1, rows.length))));
  rows.forEach((row, index) => {
    const y = rowY + index * rowH;
    rect(panel.x + 16, y - 4, panel.w - 32, Math.max(14, rowH - 5), index % 2 === 0 ? "#f6e4b8" : "#ead19a");
    text(row.label, panel.x + 26, y, 12, COLORS.line, "bold");
    text(`${row.value}\u5143`, panel.x + panel.w - 28, y, 12, row.value > 0 ? COLORS.red : "#7b5634", "bold", "right");
  });

  const totalY = panel.y + panel.h - 78;
  rect(panel.x + 16, totalY, panel.w - 32, 34, COLORS.counter);
  strokeRect(panel.x + 16, totalY, panel.w - 32, 34, COLORS.line, 3);
  text("\u672c\u6708\u5408\u8ba1", panel.x + 30, totalY + 8, 14, COLORS.text, "bold");
  text(`${state.monthlyLedger.total}\u5143`, panel.x + panel.w - 30, totalY + 8, 14, COLORS.yellow, "bold", "right");
  text("\u8fc7\u4e86 24 \u70b9\u4f1a\u81ea\u52a8\u6e05\u96f6\uff0c\u4e0d\u7559\u5386\u53f2\u8bb0\u5f55\u3002", panel.x + panel.w / 2, totalY + 42, 10, "#7b5634", "bold", "center");

  ui.closeLedgerButton = { x: panel.x + panel.w - 66, y: panel.y + panel.h - 36, w: 48, h: 26 };
  drawWidePanelButton(ui.closeLedgerButton, "\u5173\u95ed", "#7f5635");
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
  text("\u81ea\u7531\u5efa\u8bbe", panel.x + 16, panel.y + 11, 18, COLORS.text, "bold");
  text(`\u5730\u7816 ${state.publicFloors.length}`, panel.x + panel.w - 88, panel.y + 14, 12, COLORS.text, "bold");

  rect(panel.x + 10, panel.y + 48, panel.w - 20, 38, "#e3b86f");
  text(`\u5730\u7816\u6bcf\u5757 ${PUBLIC_FLOOR_COST}\u5143\uff0c\u7528\u9694\u65ad\u81ea\u7531\u505a\u5305\u95f4`, panel.x + 18, panel.y + 56, 11, "#5d4532", "bold");
  text("\u4e0a\u673a\u6536\u8d39\u7531\u7535\u8111\u914d\u7f6e\u51b3\u5b9a\uff0c\u4e0d\u518d\u6309\u5305\u95f4\u533a\u5206", panel.x + 18, panel.y + 72, 10, "#5d4532");

  const offers = getBuildOffers();
  const startY = panel.y + 96;
  const cardH = 54;
  const pageSize = Math.max(1, Math.floor((panel.y + panel.h - 42 - startY) / (cardH + 6)));
  const pageCount = getPageCount(offers.length, pageSize);
  const page = getPanelPage("expansion", pageCount);
  const visibleOffers = offers.slice(page * pageSize, page * pageSize + pageSize);

  visibleOffers.forEach((offer, index) => {
    const y = startY + index * (cardH + 6);
    if (y + cardH > panel.y + panel.h - 42) return;

    const affordable = state.cash >= offer.cost;
    rect(panel.x + 10, y, panel.w - 20, cardH, affordable ? "#f7dba5" : "#c5a575");
    strokeRect(panel.x + 10, y, panel.w - 20, cardH, "#9a7043", 2);
    drawBuildOfferIcon(offer, panel.x + 30, y + 26, !affordable);
    text(offer.name, panel.x + 58, y + 7, 13, COLORS.line, "bold");
    text(`\u82b1\u8d39 ${offer.cost}`, panel.x + 58, y + 24, 10, "#5d4532", "bold");
    text(fitTextToWidth(offer.desc, panel.w - 138, 9), panel.x + 58, y + 38, 9, "#5d4532");

    const button = { x: panel.x + panel.w - 52, y: y + 13, w: 34, h: 26, offer };
    ui.rentAreaButtons.push(button);
    rect(button.x, button.y, button.w, button.h, affordable ? "#4e8f4f" : "#9a6b55");
    strokeRect(button.x, button.y, button.w, button.h, COLORS.line, 2);
    text("\u5efa", button.x + button.w / 2, button.y + 6, 12, COLORS.text, "bold", "center");
  });

  ui.closeExpansionButton = { x: panel.x + panel.w - 50, y: panel.y + panel.h - 34, w: 38, h: 24 };
  drawPanelPager("expansion", panel, page, pageCount);
  rect(ui.closeExpansionButton.x, ui.closeExpansionButton.y, ui.closeExpansionButton.w, ui.closeExpansionButton.h, "#7f5635");
  strokeRect(ui.closeExpansionButton.x, ui.closeExpansionButton.y, ui.closeExpansionButton.w, ui.closeExpansionButton.h, COLORS.line, 2);
  text("\u5173\u95ed", ui.closeExpansionButton.x + ui.closeExpansionButton.w / 2, ui.closeExpansionButton.y + 4, 12, COLORS.text, "bold", "center");
}

function getBuildOffers() {
  return [
    {
      kind: "floor",
      id: "floor",
      name: "\u94fa\u8bbe\u5730\u7816",
      cost: PUBLIC_FLOOR_COST,
      desc: "\u5411\u5916\u6269\u5927\u5927\u5385\uff0c\u6bcf\u6b21\u94fa\u4e00\u5757\u3002"
    }
  ].concat(partitionTypes.map((type) => ({
    kind: "partition",
    id: type.id,
    typeId: type.id,
    name: type.name,
    cost: type.cost,
    desc: type.desc
  })));
}

function drawBuildOfferIcon(offer, x, y, dimmed) {
  rect(x - 14, y - 14, 28, 28, "#7b563b");
  strokeRect(x - 14, y - 14, 28, 28, COLORS.line, 2);
  if (offer.kind === "floor") {
    rect(x - 9, y - 8, 18, 18, dimmed ? "#8c755f" : COLORS.floor);
    rect(x - 9, y - 2, 18, 2, COLORS.floorLine);
    rect(x - 3, y - 8, 2, 18, COLORS.floorLine);
    return;
  }
  if (offer.typeId === "plant") {
    drawTinyPlant(x, y + 4, dimmed ? 0.55 : 0.65);
    return;
  }
  const fill = dimmed ? "#8c755f" : offer.typeId === "soundWall" ? "#6f6657" : COLORS.pcDesk;
  rect(x - 11, y - 5, 22, 10, fill);
  rect(x - 10, y - 3, 20, 2, COLORS.counterEdge);
  rect(x - 3, y - 8, 2, 16, COLORS.line);
}

function getExpansionOffers() {
  const offers = [];
  expansionTypes.forEach((type) => {
    type.pcOptions.forEach((pcCount) => {
      offers.push({ type, pcCount });
    });
  });
  return offers.sort((a, b) => {
    const unlockDelta = getExpansionUnlockLevel(a.type) - getExpansionUnlockLevel(b.type);
    if (unlockDelta !== 0) return unlockDelta;
    return getAreaRentCost(a.type, a.pcCount) - getAreaRentCost(b.type, b.pcCount);
  });
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
    h: 354
  };

  rect(panel.x, panel.y, panel.w, panel.h, "#f0c98a");
  strokeRect(panel.x, panel.y, panel.w, panel.h, COLORS.wallDark, 4);
  rect(panel.x, panel.y, panel.w, 42, "#8c4f35");
  text("\u81ea\u5b9a\u4e49\u5e03\u5c40", panel.x + 16, panel.y + 11, 18, COLORS.text, "bold");

  rect(panel.x + 12, panel.y + 54, panel.w - 24, 42, "#e3b86f");
  const activeText = state.layoutToolActive ? getLayoutModeLabel(state.layoutMode) : "\u672a\u5f00\u542f";
  text(`\u5f53\u524d\uff1a${activeText}`, panel.x + 22, panel.y + 63, 13, "#5d4532", "bold");
  text("\u9009\u62e9\u6a21\u5f0f\u540e\u5728\u5730\u56fe\u4e0a\u70b9\u51fb\u64cd\u4f5c", panel.x + 22, panel.y + 80, 10, "#5d4532");

  const fullX = panel.x + 18;
  const fullW = panel.w - 36;
  const halfW = Math.floor((fullW - 8) / 2);
  const buttons = [
    {
      x: fullX,
      y: panel.y + 110,
      w: fullW,
      mode: "pc",
      label: "\u79fb\u52a8\u7535\u8111",
      message: "\u5e03\u5c40\uff1a\u70b9\u7535\u8111\u9009\u4e2d\uff0c\u62d6\u52a8\u5730\u56fe\u5bf9\u51c6\u9884\u89c8\u6846\u3002"
    },
    {
      x: fullX,
      y: panel.y + 148,
      w: halfW,
      mode: "floor",
      label: "\u94fa\u516c\u533a\u5730\u7816",
      message: `\u5e03\u5c40\uff1a\u70b9\u5730\u56fe\u94fa\u5730\u7816\uff0c\u6bcf\u5757 ${PUBLIC_FLOOR_COST} \u5143\u3002`
    },
    {
      x: fullX + halfW + 8,
      y: panel.y + 148,
      w: halfW,
      mode: "deleteArea",
      label: "\u5220\u9664\u88c5\u4fee",
      message: "\u5e03\u5c40\uff1a\u70b9\u9694\u65ad\u53ef\u5220\u9664\uff0c\u65e7\u5305\u95f4\u4e5f\u53ef\u517c\u5bb9\u5220\u9664\u3002"
    },
    {
      x: fullX,
      y: panel.y + 186,
      w: fullW,
      mode: "toiletMove",
      label: "\u79fb\u52a8\u5395\u6240",
      message: "\u5e03\u5c40\uff1a\u62d6\u52a8\u5730\u56fe\u5bf9\u51c6\u5395\u6240\u9884\u89c8\u6846\uff0c\u70b9\u5730\u56fe\u786e\u8ba4\u4f4d\u7f6e\u3002"
    },
    {
      x: fullX,
      y: panel.y + 224,
      w: fullW,
      mode: "off",
      label: "\u9000\u51fa\u5e03\u5c40",
      message: "\u5df2\u9000\u51fa\u5e03\u5c40\u6a21\u5f0f\u3002"
    }
  ];

  buttons.forEach((button) => {
    const rectButton = {
      x: button.x,
      y: button.y,
      w: button.w,
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
    area: "\u91cd\u6446\u65e7\u5305\u95f4",
    deleteArea: "\u5220\u9664\u88c5\u4fee",
    pc: "\u79fb\u52a8\u7535\u8111",
    floor: "\u94fa\u516c\u533a\u5730\u7816",
    partition: "\u6446\u653e\u9694\u65ad",
    partitionMove: "\u79fb\u52a8\u9694\u65ad",
    propMove: "\u79fb\u52a8\u9053\u5177",
    toiletMove: "\u79fb\u52a8\u5395\u6240"
  }[mode] || "\u672a\u5f00\u542f";
}

function drawEquipmentPanel() {
  if (!state.equipmentOpen) return;

  ui.upgradeEquipmentButtons.length = 0;
  ui.purchasePcButtons.length = 0;
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
  const maxPcs = getMaxOperationalPcs();
  text(`\u673a\u5668 ${layout.pcs.length}/${maxPcs} / \u5747\u6863 ${state.equipmentLevel} / \u6700\u4f4e L${minimumLevel}`, panel.x + 18, panel.y + 58, 12, "#5d4532", "bold");
  text("\u7f51\u5427\u7b49\u7ea7\u6309\u5e73\u5747\u8bbe\u5907\u8bc4\u4f30\uff0c\u5df2\u89e3\u9501\u4e0d\u56de\u9000", panel.x + 18, panel.y + 74, 11, "#5d4532");
  ui.purchaseMahjongButton = null;

  const startY = panel.y + 104;
  const cardH = 62;
  const tierOptions = equipmentTiers;
  const pageSize = Math.max(1, Math.floor((panel.y + panel.h - 42 - startY) / (cardH + 8)));
  const pageCount = getPageCount(tierOptions.length, pageSize);
  const page = getPanelPage("equipment", pageCount);
  const visibleTiers = tierOptions.slice(page * pageSize, page * pageSize + pageSize);

  visibleTiers.forEach((tier, index) => {
    const y = startY + index * (cardH + 8);
    if (y + cardH > panel.y + panel.h - 42) return;

    const canUpgradeTier = tier.level > 1;
    const upgradeCandidates = canUpgradeTier ? layout.pcs.filter((pc) => tier.level > pc.equipmentLevel) : [];
    const hasCandidate = upgradeCandidates.length > 0;
    const allUpgraded = canUpgradeTier && layout.pcs.length > 0 && layout.pcs.every((pc) => pc.equipmentLevel >= tier.level);
    const minUpgradeCost = hasCandidate ? Math.min(...upgradeCandidates.map((pc) => getPcUpgradeCost(pc, tier.level))) : 0;
    const affordableUpgrade = hasCandidate && state.cash >= minUpgradeCost;
    const purchaseCost = getNewPcCost(tier.level);
    const affordablePurchase = state.cash >= purchaseCost && layout.pcs.length < maxPcs;

    rect(panel.x + 10, y, panel.w - 20, cardH, affordablePurchase || hasCandidate ? "#f7dba5" : "#c5a575");
    strokeRect(panel.x + 10, y, panel.w - 20, cardH, "#9a7043", 2);
    drawEquipmentIcon(panel.x + 30, y + 17, tier.level, canUpgradeTier ? allUpgraded : false);
    text(tier.name, panel.x + 68, y + 8, 15, COLORS.line, "bold");
    text(`\u65b0\u8d2d ${purchaseCost} / \u6536\u8d39 ${tier.hourlyRate}\u5143h`, panel.x + 68, y + 28, 11, "#5d4532", "bold");
    const upgradeDesc = hasCandidate
      ? `\u5347\u7ea7\u4f4e\u81f3 ${minUpgradeCost} / \u53ef\u9009\u673a\u5668`
      : allUpgraded ? "\u5168\u90e8\u5df2\u8fbe\u6210" : "\u6ca1\u6709\u53ef\u5347\u7ea7\u673a\u5668";
    text(canUpgradeTier ? upgradeDesc : "\u57fa\u7840\u65b0\u673a\uff0c\u9700\u5730\u56fe\u653e\u7f6e", panel.x + 68, y + 45, 10, hasCandidate ? COLORS.green : "#745a46");

    if (canUpgradeTier) {
      const upgradeButton = { x: panel.x + panel.w - 92, y: y + 16, w: 34, h: 26, tier };
      ui.upgradeEquipmentButtons.push(upgradeButton);
      rect(upgradeButton.x, upgradeButton.y, upgradeButton.w, upgradeButton.h, hasCandidate && affordableUpgrade ? "#4e8f4f" : "#9a6b55");
      strokeRect(upgradeButton.x, upgradeButton.y, upgradeButton.w, upgradeButton.h, COLORS.line, 2);
      text(allUpgraded ? "\u5df2" : "\u5347", upgradeButton.x + upgradeButton.w / 2, upgradeButton.y + 5, 13, COLORS.text, "bold", "center");
    }

    const purchaseButton = { x: panel.x + panel.w - 52, y: y + 16, w: 34, h: 26, tier };
    ui.purchasePcButtons.push(purchaseButton);
    rect(purchaseButton.x, purchaseButton.y, purchaseButton.w, purchaseButton.h, affordablePurchase ? "#4e8f4f" : "#9a6b55");
    strokeRect(purchaseButton.x, purchaseButton.y, purchaseButton.w, purchaseButton.h, COLORS.line, 2);
    text("\u8d2d", purchaseButton.x + purchaseButton.w / 2, purchaseButton.y + 5, 13, COLORS.text, "bold", "center");
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
  text("\u8d39\u7528\u5df2\u6309\u65e7\u8bbe\u5907\u534a\u4ef7\u62b5\u6263", panel.x + panel.w / 2, panel.y + 125, 12, COLORS.text, "bold", "center");

  const cardW = panel.w - 56;
  const startY = panel.y + 152;
  const rowH = 52;
  const pageSize = Math.max(1, Math.floor((panel.y + panel.h - 92 - startY) / rowH));
  const pageCount = getPageCount(layout.pcs.length, pageSize);
  const page = getPanelPage("equipmentPc", pageCount);
  const visiblePcs = layout.pcs.slice(page * pageSize, page * pageSize + pageSize);

  visiblePcs.forEach((pc, index) => {
    const x = panel.x + 28;
    const y = startY + index * rowH;
    const currentTier = getEquipmentTier(pc.equipmentLevel);
    const upgradeCost = getPcUpgradeCost(pc, tier.level);
    const canUpgrade = tier.level > pc.equipmentLevel && state.cash >= upgradeCost;

    rect(x, y, cardW, 44, canUpgrade ? "#f7dba5" : "#c5a575");
    strokeRect(x, y, cardW, 44, "#9a7043", 2);
    text(`${pc.id + 1} \u53f7\u673a  ${getPcAreaLabel(pc)}`, x + 10, y + 6, 13, COLORS.line, "bold");
    text(`\u5f53\u524d ${currentTier.name} / \u5347\u7ea7 ${upgradeCost}`, x + 10, y + 25, 10, "#5d4532", "bold");

    const button = { x: x + cardW - 50, y: y + 8, w: 40, h: 28, pc };
    ui.equipmentPcButtons.push(button);
    rect(button.x, button.y, button.w, button.h, canUpgrade ? "#4e8f4f" : "#9a6b55");
    strokeRect(button.x, button.y, button.w, button.h, COLORS.line, 2);
    text("\u5347", button.x + button.w / 2, button.y + 7, 12, COLORS.text, "bold", "center");
  });

  drawPanelPager("equipmentPc", { x: panel.x + 16, y: panel.y + 92, w: panel.w - 32, h: panel.h - 138 }, page, pageCount);

  ui.cancelEquipmentSelectionButton = { x: panel.x + panel.w - 66, y: panel.y + panel.h - 68, w: 48, h: 24 };
  rect(ui.cancelEquipmentSelectionButton.x, ui.cancelEquipmentSelectionButton.y, ui.cancelEquipmentSelectionButton.w, ui.cancelEquipmentSelectionButton.h, "#7f5635");
  strokeRect(ui.cancelEquipmentSelectionButton.x, ui.cancelEquipmentSelectionButton.y, ui.cancelEquipmentSelectionButton.w, ui.cancelEquipmentSelectionButton.h, COLORS.line, 2);
  text("\u8fd4\u56de", ui.cancelEquipmentSelectionButton.x + ui.cancelEquipmentSelectionButton.w / 2, ui.cancelEquipmentSelectionButton.y + 4, 12, COLORS.text, "bold", "center");
}

function drawEquipmentIcon(x, y, level, dimmed) {
  const glow = dimmed ? "#7b8c76" : COLORS.pcGlow;
  const body = level >= 4 ? "#d8d0bd" : "#17222a";
  const w = level >= 4 ? 32 : 28;
  const h = level >= 4 ? 18 : 20;
  rect(x - w / 2, y - 8, w, h, body);
  strokeRect(x - w / 2, y - 8, w, h, COLORS.line, 2);
  rect(x - w / 2 + 4, y - 4, w - 8, level >= 4 ? 10 : 11, level >= 5 ? "#8fd7ff" : glow);
  if (level >= 3 && level < 4) {
    rect(x + 18, y - 4, 7, 18, COLORS.line);
    rect(x + 20, y - 1, 3, 11, "#65c05a");
  }
  rect(x - 2, y + 12, 8, 7, level >= 4 ? "#d8d0bd" : "#2d2522");
  text(`L${level}`, x + 1, y + 21, 10, COLORS.line, "bold", "center");
}

function drawSettingsPanel() {
  if (!state.settingsOpen) return;

  rect(0, 0, view.width, view.height, "rgba(20, 18, 16, 0.72)");

  const panel = {
    x: 22,
    y: HUD_HEIGHT + 34,
    w: view.width - 44,
    h: Math.min(view.height - HUD_HEIGHT - 28, 472)
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

  const versionBox = { x: panel.x + 12, y: panel.y + 136, w: panel.w - 24, h: 52 };
  rect(versionBox.x, versionBox.y, versionBox.w, versionBox.h, "#f7dba5");
  strokeRect(versionBox.x, versionBox.y, versionBox.w, versionBox.h, "#9a7043", 2);
  rect(versionBox.x + 4, versionBox.y + 4, versionBox.w - 8, 18, "#8c4f35");
  text("\u7248\u672c\u4fe1\u606f", versionBox.x + 12, versionBox.y + 7, 12, COLORS.text, "bold");
  text(
    `\u6e38\u620f\u7248\u672c\uff1a${GAME_VERSION}`,
    versionBox.x + 12,
    versionBox.y + 30,
    11,
    COLORS.line,
    "bold"
  );
  ui.toggleTestModeButton = { x: panel.x + 18, y: panel.y + 190, w: panel.w - 36, h: 32 };
  ui.toggleMusicButton = { x: panel.x + 18, y: panel.y + 226, w: panel.w - 36, h: 32 };
  ui.toggleSfxButton = { x: panel.x + 18, y: panel.y + 262, w: panel.w - 36, h: 32 };
  ui.pricingButton = { x: panel.x + 18, y: panel.y + 298, w: panel.w - 36, h: 32 };
  ui.saveGameButton = { x: panel.x + 18, y: panel.y + 334, w: panel.w - 36, h: 32 };
  ui.clearSaveButton = { x: panel.x + 18, y: panel.y + panel.h - 42, w: panel.w - 94, h: 30 };
  ui.closeSettingsButton = { x: panel.x + panel.w - 66, y: panel.y + panel.h - 42, w: 48, h: 30 };

  drawWidePanelButton(
    ui.toggleTestModeButton,
    state.testMode ? "\u5173\u95ed\u6d4b\u8bd5\u6a21\u5f0f" : "\u5f00\u542f\u6d4b\u8bd5\u6a21\u5f0f",
    state.testMode ? COLORS.green : "#9a6b55"
  );
  drawWidePanelButton(
    ui.toggleMusicButton,
    state.audio.musicEnabled ? "\u80cc\u666f\u97f3\u4e50\uff1a\u5f00" : "\u80cc\u666f\u97f3\u4e50\uff1a\u5173",
    state.audio.musicEnabled ? COLORS.green : "#9a6b55"
  );
  drawWidePanelButton(
    ui.toggleSfxButton,
    state.audio.sfxEnabled ? "\u6309\u952e\u70b9\u51fb\u58f0\uff1a\u5f00" : "\u6309\u952e\u70b9\u51fb\u58f0\uff1a\u5173",
    state.audio.sfxEnabled ? COLORS.green : "#9a6b55"
  );
  drawWidePanelButton(ui.pricingButton, "\u914d\u7f6e\u8ba1\u8d39", "#4e8f4f");
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
  text("\u914d\u7f6e\u8ba1\u8d39", panel.x + 16, panel.y + 11, 18, COLORS.text, "bold");
  text("\u73b0\u5728\u4e0a\u673a\u6536\u8d39\u53ea\u7531\u7535\u8111\u914d\u7f6e\u51b3\u5b9a", panel.x + 16, panel.y + 52, 11, "#5d4532", "bold");

  ui.priceButtons = [];
  const tiers = equipmentTiers.slice(0, 6);
  const rowH = 48;
  tiers.forEach((tier, index) => {
    const rowY = panel.y + 76 + index * rowH;
    rect(panel.x + 12, rowY, panel.w - 24, 40, "#f7dba5");
    strokeRect(panel.x + 12, rowY, panel.w - 24, 40, "#9a7043", 2);
    drawEquipmentIcon(panel.x + 34, rowY + 12, tier.level, false);
    text(tier.name, panel.x + 62, rowY + 7, 13, COLORS.line, "bold");
    text(`${tier.hourlyRate}\u5143/\u5c0f\u65f6  \u65b0\u8d2d ${getNewPcCost(tier.level)}\u5143`, panel.x + 62, rowY + 25, 10, "#5d4532", "bold");
  });

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
    repairman: "#d88435",
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
    repairman: "#d88435",
    manager: COLORS.yellow,
    companion: COLORS.red
  }[type] || COLORS.counterEdge;
}

function drawWorker(worker) {
  const x = Math.round(worker.x);
  const y = Math.round(worker.y);
  const hat = getWorkerHatColor(worker.type);
  const workerAsset = worker.type === "cashier" ? "cashier" : worker.type === "cleaner" ? "cleaner" : "";
  const assetW = (worker.type === "cleaner" ? 28 : 27) * PERSON_VISUAL_SCALE;
  const assetH = (worker.type === "cleaner" ? 50 : 49) * PERSON_VISUAL_SCALE;
  if (workerAsset && drawAsset(workerAsset, x - assetW / 2, y - assetH, assetW, assetH)) {
    const label = getWorkerLabel(worker.type);
    const bubbleW = Math.max(32, label.length * 13 + 8);
    roundedRect(x - bubbleW / 2, y - 50, bubbleW, 17, 5, "#fff7dd");
    strokeRoundedRect(x - bubbleW / 2, y - 50, bubbleW, 17, 5, "rgba(25, 36, 43, 0.28)", 1);
    text(label, x, y - 48, 10, COLORS.line, "bold", "center");
    return;
  }

  const isMopping = worker.state === "moppingFloor" || worker.state === "toMopFloor";

  drawScaledPerson(x, y, () => {
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

    if (isMopping) {
      // Mop handle: oscillates left-right using state.time
      const swing = Math.sin(state.time * 5) * 5;
      const hx = x + 12 + swing;
      rect(hx - 1, y - 22, 2, 30, "#8b6c45");
      // Mop head (wider wet strip at bottom)
      rect(hx - 8, y + 7, 16, 5, "#7fc4de");
      rect(hx - 6, y + 10, 12, 2, "#aadff5");
      // Water sparkle dots
      if (Math.sin(state.time * 7 + 1) > 0.3) {
        circle(hx - 10 + Math.abs(swing), y + 14, 2, "rgba(100,200,240,0.7)");
      }
      if (Math.sin(state.time * 7 - 0.5) > 0.4) {
        circle(hx + 8 - Math.abs(swing) * 0.5, y + 13, 1.5, "rgba(100,200,240,0.6)");
      }
    }
  });

  const label = isMopping ? "拖地中" : getWorkerLabel(worker.type);
  const bubbleW = Math.max(32, label.length * 13 + 8);
  rect(x - bubbleW / 2 - 1, y - 35, bubbleW + 2, 19, COLORS.line);
  rect(x - bubbleW / 2, y - 34, bubbleW, 17, isMopping ? "#d4f0ff" : "#fff7dd");
  text(label, x, y - 32, 10, COLORS.line, "bold", "center");
}

function drawLegend() {
  // 暂不显示入口标注。
}

function drawIndoorDetailsModern() {
  const room = layout.room;
  drawWallPattern(room.x + 8, room.y + 8, room.w - 16, 54);
  const shopSign = getMovablePropRect("shopSign");
  if (!isMovingProp("shopSign")) {
    pixelPanel(shopSign.x, shopSign.y, shopSign.w, shopSign.h, COLORS.counter, COLORS.counterEdge, COLORS.line);
    text("\u5c0f\u9ed1\u7f51\u5427", shopSign.x + shopSign.w / 2, shopSign.y + 7, 13, COLORS.text, "bold", "center");
  }

  const snackShelf = getMovablePropRect("snackShelf");
  if (!isMovingProp("snackShelf")) drawSnackDisplay(snackShelf.x, snackShelf.y);

  const happySign = getMovablePropRect("happySign");
  if (!isMovingProp("happySign")) {
    rect(happySign.x, happySign.y, happySign.w, happySign.h, COLORS.line);
    rect(happySign.x + 3, happySign.y + 3, happySign.w - 6, happySign.h - 6, COLORS.text);
    text("\u4e0a\u7f51", happySign.x + happySign.w / 2, happySign.y + 8, 11, COLORS.dimText, "bold", "center");
    text("\u5feb\u4e50", happySign.x + happySign.w / 2, happySign.y + 21, 11, COLORS.dimText, "bold", "center");
  }

  const starterPlant = getMovablePropRect("starterPlant");
  if (!isMovingProp("starterPlant") && !drawAsset("plant", starterPlant.x, starterPlant.y, starterPlant.w, starterPlant.h)) {
    drawTinyPlant(starterPlant.x + starterPlant.w / 2 + 6, starterPlant.y + starterPlant.h - 34, 1.45);
  }
}

function drawFloorLamp(x, y) {
  rect(x - 18, y - 28, 36, 30, "rgba(240, 185, 74, 0.16)");
  rect(x - 2, y - 8, 4, 24, COLORS.line);
  rect(x - 10, y + 14, 20, 4, COLORS.line);
  rect(x - 16, y - 24, 32, 16, COLORS.line);
  rect(x - 12, y - 20, 24, 10, "#f0c16f");
  rect(x - 8, y - 18, 16, 4, "#fff2d0");
  rect(x - 4, y + 16, 8, 5, "#8b552b");
}

function drawSnackDisplay(x, y) {
  rect(x - 3, y - 13, 30, 16, COLORS.line);
  rect(x, y - 10, 24, 10, COLORS.text);
  text("\u96f6\u98df", x + 12, y - 10, 9, COLORS.line, "bold", "center");
  rect(x, y, 108, 28, COLORS.line);
  rect(x + 3, y + 3, 102, 22, "#7b563b");
  rect(x + 6, y + 6, 96, 3, COLORS.counterEdge);
  rect(x + 9, y + 12, 14, 8, COLORS.red);
  rect(x + 27, y + 12, 14, 8, COLORS.yellow);
  rect(x + 45, y + 12, 14, 8, COLORS.green);
  rect(x + 63, y + 12, 14, 8, COLORS.blue);
  rect(x + 81, y + 12, 14, 8, "#d98236");
}

function drawMahjongTables() {
  state.mahjongTables.forEach((table) => {
    ellipse(table.x + table.w / 2, table.y + table.h - 2, table.w / 2, 7, "rgba(58, 36, 24, 0.2)");
    rect(table.x - 2, table.y + 8, table.w + 4, table.h - 4, COLORS.line);
    rect(table.x + 2, table.y + 12, table.w - 4, table.h - 12, "#6b3f24");
    rect(table.x + 8, table.y + 16, table.w - 16, table.h - 20, "#2f6b3f");
    strokeRect(table.x + 8, table.y + 16, table.w - 16, table.h - 20, "#1e3b28", 2);
    rect(table.x + 15, table.y + 21, 8, 5, "#fff2d0");
    rect(table.x + 27, table.y + 21, 8, 5, "#fff2d0");
    rect(table.x + 39, table.y + 21, 8, 5, "#fff2d0");
    rect(table.x + 15, table.y + 30, 8, 5, "#fff2d0");
    rect(table.x + 39, table.y + 30, 8, 5, "#fff2d0");
    text("\u9ebb", table.x + table.w / 2, table.y + table.h / 2 - 9, 11, "#f8e6a9", "bold", "center");
  });
}

function drawPartitions() {
  state.partitions.forEach((partition) => {
    const type = getPartitionType(partition.typeId);
    ellipse(partition.x + partition.w / 2, partition.y + partition.h, Math.max(10, partition.w / 2), 5, "rgba(58, 36, 24, 0.18)");
    if (partition.typeId === "plant") {
      drawTinyPlant(partition.x + partition.w / 2, partition.y + partition.h - 12, 0.95);
      return;
    }
    const fill = partition.typeId === "soundWall" ? "#6f6657" : "#9a642f";
    rect(partition.x - 2, partition.y - 2, partition.w + 4, partition.h + 4, COLORS.line);
    rect(partition.x, partition.y, partition.w, partition.h, fill);
    const horizontal = partition.w >= partition.h;
    const slatCount = Math.max(2, Math.floor((horizontal ? partition.w : partition.h) / 14));
    for (let i = 1; i < slatCount; i += 1) {
      if (horizontal) rect(partition.x + i * 14, partition.y + 1, 2, partition.h - 2, COLORS.counterEdge);
      else rect(partition.x + 1, partition.y + i * 14, partition.w - 2, 2, COLORS.counterEdge);
    }
    if (type) {
      const label = type.name.slice(0, 2);
      text(label, partition.x + partition.w / 2, partition.y - 15, 10, COLORS.dimText, "bold", "center");
    }
  });
}

function render() {
  ctx.clearRect(0, 0, view.width, view.height);
  ui.pageButtons.length = 0;
  ui.pcActionButtons.length = 0;
  ui.partitionActionButtons.length = 0;
  ui.propActionButtons.length = 0;
  beginWorldDraw();
  drawPixelFloor();
  drawCounter();
  drawMahjongTables();
  drawPartitions();
  layout.pcs.forEach(drawPc);
  drawLegend();
  state.workers.forEach(drawWorker);
  state.guests.forEach(drawGuest);
  endWorldDraw();
  drawHud();
  drawPcInfoBubble();
  drawPcActionMenu();
  drawPartitionActionMenu();
  drawPropActionMenu();
  drawLayoutToolControls();
  drawSystemMessageBar();
  drawActionBar();
  if (state.procurementOpen) drawProcurementPanel();
  if (state.warehouseOpen) drawWarehousePanel();
  if (state.hiringOpen) drawHiringPanel();
  if (state.ledgerOpen) drawLedgerPanel();
  if (state.expansionOpen) drawExpansionPanel();
  if (state.layoutOpen) drawLayoutPanel();
  if (state.equipmentOpen) drawEquipmentPanel();
  if (state.settingsOpen) drawSettingsPanel();
  if (state.pricingOpen) drawPricingPanel();
  drawPcUpgradeMenu();
  drawConfirmDialog();
}

function loop() {
  const now = Date.now();
  const dt = Math.min(0.1, (now - lastFrameAt) / 1000);
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
syncMusicPlayback();

try {
  if (wx.onShow) {
    wx.onShow(syncMusicPlayback);
  }

  if (wx.onHide) {
    wx.onHide(() => {
      if (audioSystem.bgm) {
        try {
          audioSystem.bgm.pause();
        } catch (error) {
          // Ignore lifecycle audio errors.
        }
      }
    });
  }

  wx.onTouchStart(handleTouchStartEvent);
  wx.onTouchMove(handleTouchMoveEvent);
  wx.onTouchEnd(handleTouchEndEvent);
  wx.onTouchCancel(handleTouchEndEvent);

  loop();
} catch (error) {
  drawFatalError(error);
  throw error;
}
