import { Level } from '../models/level.model';

export const LEVELS: Level[] = [
  {
    id: 1,
    name: '关卡 1',
    width: 800,
    height: 600,
    staticBodies: [
      { x: 400, y: 580, width: 800, height: 40 } // 地面
    ],
    blueBall: { x: 200, y: 200, radius: 20 },
    orangeBall: { x: 600, y: 200, radius: 20 }
  },
  {
    id: 2,
    name: '关卡 2',
    width: 800,
    height: 600,
    staticBodies: [
      { x: 400, y: 580, width: 800, height: 40 } // 地面
    ],
    blueBall: { x: 150, y: 150, radius: 20 },
    orangeBall: { x: 650, y: 150, radius: 20 }
  },
  {
    id: 3,
    name: '关卡 3',
    width: 800,
    height: 600,
    staticBodies: [
      { x: 400, y: 580, width: 800, height: 40 }, // 地面
      { x: 200, y: 400, width: 150, height: 20 }, // 左侧平台
      { x: 600, y: 350, width: 150, height: 20 }  // 右侧平台
    ],
    blueBall: { x: 200, y: 300, radius: 20 },
    orangeBall: { x: 600, y: 250, radius: 20 }
  },
  {
    id: 4,
    name: '关卡 4',
    width: 800,
    height: 600,
    staticBodies: [
      { x: 400, y: 580, width: 800, height: 40 }, // 地面
      { x: 300, y: 450, width: 200, height: 20 }, // 中间平台
      { x: 100, y: 350, width: 100, height: 20 }, // 左侧小平台
      { x: 700, y: 300, width: 100, height: 20 }  // 右侧小平台
    ],
    blueBall: { x: 150, y: 200, radius: 20 },
    orangeBall: { x: 650, y: 150, radius: 20 }
  },
  {
    id: 5,
    name: '关卡 5',
    width: 800,
    height: 600,
    staticBodies: [
      { x: 400, y: 580, width: 800, height: 40 }, // 地面
      { x: 150, y: 500, width: 100, height: 20 }, // 左下平台
      { x: 400, y: 400, width: 200, height: 20 }, // 中间平台
      { x: 650, y: 300, width: 100, height: 20 }  // 右上平台
    ],
    blueBall: { x: 100, y: 350, radius: 20 },
    orangeBall: { x: 700, y: 200, radius: 20 }
  }
];

