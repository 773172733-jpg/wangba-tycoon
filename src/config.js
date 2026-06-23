const COLORS = {
  wall: "#f1d89b",
  wallTop: "#ffe6a8",
  wallDark: "#6b3f24",
  floor: "#d2a25f",
  floorAlt: "#d9ae68",
  floorLine: "#a8753e",
  counter: "#8b552b",
  counterTop: "#c5833d",
  counterEdge: "#e8c97a",
  pcDesk: "#9a642f",
  pcScreen: "#22313a",
  pcGlow: "#6faf45",
  line: "#3a2418",
  text: "#fff2d0",
  dimText: "#7b5634",
  red: "#c85a43",
  green: "#6faf45",
  yellow: "#f0b94a",
  blue: "#557c8c",
  plant: "#5f8f3b",
  shadow: "#261711",
  glass: "#9fb9a5",
  uiDark: "#3a2418",
  uiPanel: "#fff2d0"
};

const SPRITE_SCALE = {
  counter: 1,
  pc: 1,
  guest: 1,
  worker: 1,
  plant: 1,
  floor: 1
};

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

const staffTypes = [
  {
    id: "cashier",
    name: "\u6536\u94f6\u5458",
    hireCost: 120,
    salary: 80,
    desc: "\u8d1f\u8d23\u5f00\u5361\u548c\u9001\u9910\uff0c\u4eba\u591a\u65f6\u524d\u53f0\u66f4\u5feb\u3002"
  },
  {
    id: "floor",
    name: "\u5916\u573a",
    hireCost: 100,
    salary: 70,
    desc: "\u53ea\u6536\u62fe\u5ba2\u4eba\u4e0b\u673a\u540e\u7684\u673a\u4f4d\u3002"
  },
  {
    id: "cleaner",
    name: "\u4fdd\u6d01",
    hireCost: 90,
    salary: 65,
    desc: "\u62d6\u5730\u3001\u626b\u5395\u6240\uff0c\u4e0d\u6e05\u7406\u7535\u8111\u3002"
  },
  {
    id: "repairman",
    name: "\u7ef4\u4fee\u5458",
    hireCost: 180,
    salary: 120,
    desc: "\u81ea\u52a8\u7ef4\u4fee\u635f\u574f\u7535\u8111\uff0c\u4e0d\u518d\u4ea7\u751f\u5355\u6b21\u7ef4\u4fee\u8d39\u3002"
  },
  {
    id: "manager",
    name: "\u5e97\u957f",
    hireCost: 380,
    salary: 220,
    desc: "\u4ed3\u5e93\u8865\u8d27\u548c\u9001\u9910\uff0c\u4e0d\u4fee\u673a\u5668\u3002"
  },
  {
    id: "companion",
    name: "\u966a\u73a9",
    hireCost: 260,
    salary: 160,
    desc: "\u9ad8\u7aef\u5305\u95f4\u966a\u73a9\u670d\u52a1\uff0c\u9700\u5e97\u957f + Lv.3\u3002"
  }
];

const equipmentTiers = [
  { level: 1, name: "1080 + i3", pricePerPc: 0, hourlyRate: 5 },
  { level: 2, name: "2080 + i5", pricePerPc: 3000, hourlyRate: 8 },
  { level: 3, name: "3080 + i7", pricePerPc: 5000, hourlyRate: 12 },
  { level: 4, name: "4080 + i9", pricePerPc: 7000, hourlyRate: 16 },
  { level: 5, name: "5080 + R9", pricePerPc: 10000, hourlyRate: 22 }
];

const partitionTypes = [
  {
    id: "plant",
    name: "\u76c6\u683d\u9694\u65ad",
    cost: 160,
    w: 24,
    h: 24,
    blockMove: false,
    desc: "\u4fbf\u5b9c\u7eff\u5316\uff0c\u7528\u6765\u5207\u51fa\u5c0f\u533a\u57df\u3002"
  },
  {
    id: "woodScreen",
    name: "\u6728\u8d28\u5c4f\u98ce",
    cost: 360,
    w: 60,
    h: 12,
    blockMove: true,
    desc: "\u53ef\u6a2a\u5411\u6446\u653e\u7684\u57fa\u7840\u9694\u65ad\u3002"
  },
  {
    id: "soundWall",
    name: "\u9694\u97f3\u5899",
    cost: 680,
    w: 72,
    h: 14,
    blockMove: true,
    desc: "\u66f4\u9ad8\u7aef\u7684\u786c\u9694\u65ad\uff0c\u540e\u7eed\u63a5\u73af\u5883\u52a0\u6210\u3002"
  }
];

const expansionTypes = [
  {
    id: "multiRoom",
    name: "\u591a\u4eba\u95f4",
    pcOptions: [4, 6, 8],
    baseCost: 0,
    pricePerPc: 0,
    costByPcCount: { 4: 2200, 6: 1800, 8: 1400 },
    unlockLevel: 1,
    desc: "\u9002\u5408\u5c0f\u961f\u5f00\u9ed1\uff0c\u53ef\u81ea\u5b9a\u4e49 4-8 \u53f0\u673a\u3002"
  },
  {
    id: "doubleRoom",
    name: "\u53cc\u4eba\u95f4",
    pcOptions: [2],
    baseCost: 2600,
    pricePerPc: 0,
    unlockLevel: 2,
    desc: "\u53cc\u4eba\u5e76\u6392\uff0c\u540e\u7eed\u53ef\u63a5\u966a\u73a9\u548c\u60c5\u4fa3\u5ba2\u3002"
  },
  {
    id: "singleRoom",
    name: "\u5355\u4eba\u95f4",
    pcOptions: [1],
    baseCost: 3200,
    pricePerPc: 0,
    unlockLevel: 3,
    desc: "\u5b89\u9759\u79c1\u5bc6\uff0c\u540e\u7eed\u5438\u5f15\u9ad8\u7aef\u73a9\u5bb6\u3002"
  },
  {
    id: "capsuleRoom",
    name: "\u80f6\u56ca\u5355\u95f4",
    pcOptions: [1],
    baseCost: 4600,
    pricePerPc: 0,
    unlockLevel: 4,
    desc: "\u5e26\u4f11\u606f\u80f6\u56ca\uff0c\u4e3a\u5305\u591c\u73a9\u6cd5\u94fa\u8def\u3002"
  },
  {
    id: "showerRoom",
    name: "\u6dcb\u6d74\u623f",
    pcOptions: [0],
    baseCost: 3000,
    pricePerPc: 0,
    unlockLevel: 3,
    desc: "\u6d17\u6fa1\u914d\u5957\uff0c\u540e\u7eed\u63a5\u5165\u5305\u591c\u548c\u6e05\u6d01\u538b\u529b\u3002"
  },
  {
    id: "chessRoom",
    name: "\u68cb\u724c\u5ba4",
    pcOptions: [0],
    baseCost: 2800,
    pricePerPc: 0,
    unlockLevel: 2,
    desc: "\u975e\u4e0a\u673a\u6536\u5165\u533a\uff0c\u540e\u7eed\u63a5\u5165\u968f\u673a\u724c\u5c40\u4e8b\u4ef6\u3002"
  }
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

const guestTypes = [
  {
    id: "budgetHall",
    name: "\u4f4e\u6d88\u5927\u5385\u5ba2",
    areaPreference: "hall",
    maxRate: 8,
    minEquipmentLevel: 1,
    spendChance: 0.22,
    weight: 5
  },
  {
    id: "regularHall",
    name: "\u666e\u901a\u6563\u5ba2",
    areaPreference: "hall",
    maxRate: 12,
    minEquipmentLevel: 1,
    spendChance: 0.36,
    weight: 4
  },
  {
    id: "roomDuo",
    name: "\u7ec4\u961f\u5ba2",
    areaPreference: "any",
    maxRate: 22,
    minEquipmentLevel: 1,
    spendChance: 0.46,
    weight: 3.8
  },
  {
    id: "privateRoom",
    name: "\u9ad8\u6d88\u4f11\u95f2\u5ba2",
    areaPreference: "any",
    maxRate: 30,
    minEquipmentLevel: 1,
    spendChance: 0.5,
    weight: 1.8
  },
  {
    id: "highSpec",
    name: "\u914d\u7f6e\u515a",
    areaPreference: "any",
    maxRate: 32,
    minEquipmentLevel: 3,
    spendChance: 0.55,
    weight: 1.4
  }
];

const assetSources = {
  counter: "",
  pcStation: ""
};

module.exports = {
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
};
