// 잔 정의. 각 잔은:
//   - SVG viewBox와 핵심 path 데이터
//   - 액체 fill 영역(clip 안쪽 + y 범위)
//   - rim 좌/우 위치 (overflow drip 시작점)
//   - 글자수 / 해금 조건
//   - drinks: 이 잔에 담을 수 있는 술 종류 (색상 다름)

export const GLASSES = {
  // 한국 육각 소주잔 — 정면 뷰
  soju: {
    id: 'soju',
    label: '소주잔',
    emoji: '🥃',
    unlockShots: 0,
    maxChars: 30,
    viewBox: '0 0 120 170',
    width: 200,
    outerPath:
      'M 22 18 L 98 18 L 96 130 L 102 132 L 102 152 L 18 152 L 18 132 L 24 130 Z',
    innerPath: 'M 28 22 L 92 22 L 90 124 L 30 124 Z',
    facets: [
      { x1: 40, y1: 20, x2: 41, y2: 130, opacity: 0.18 },
      { x1: 80, y1: 20, x2: 79, y2: 130, opacity: 0.18 },
    ],
    rim: { y: 20, leftX: 22, rightX: 98, innerLeftX: 28, innerRightX: 92 },
    liquidRange: { top: 22, bottom: 124 },
    groundY: 152,
    drinks: [
      { id: 'soju-chamisul', label: '참이슬', color: '#f7faf7', edge: '#cfe0d2' },
      { id: 'soju-chum', label: '처음처럼', color: '#f5fcfb', edge: '#b8d4d0' },
      { id: 'cheongju', label: '청주', color: '#fff4c4', edge: '#c5a82e' },
    ],
  },

  // 맥주잔(머그) — 두꺼운 손잡이 달린 jug
  beer: {
    id: 'beer',
    label: '맥주잔',
    emoji: '🍺',
    unlockShots: 3,
    maxChars: 100,
    viewBox: '0 0 160 200',
    width: 220,
    outerPath:
      'M 28 22 L 100 22 L 102 178 L 96 184 L 32 184 L 26 178 Z',
    innerPath: 'M 34 26 L 94 26 L 94 174 L 34 174 Z',
    facets: [
      { x1: 50, y1: 26, x2: 50, y2: 178, opacity: 0.12 },
      { x1: 78, y1: 26, x2: 78, y2: 178, opacity: 0.12 },
    ],
    extraPath:
      'M 102 60 C 138 60 138 144 102 144 L 102 134 C 126 134 126 70 102 70 Z',
    rim: { y: 24, leftX: 28, rightX: 100, innerLeftX: 34, innerRightX: 94 },
    liquidRange: { top: 26, bottom: 174 },
    groundY: 184,
    drinks: [
      { id: 'lager', label: '카스', color: '#f6c44b', edge: '#a87814' },
      { id: 'tera', label: '테라', color: '#d8d264', edge: '#7a7012' },
      { id: 'stout', label: '흑맥주', color: '#3b2210', edge: '#0e0703' },
      { id: 'makgeolli', label: '막걸리', color: '#f4ece0', edge: '#b8a780' },
    ],
  },

  // 와인잔 — 스템 + 보울
  wine: {
    id: 'wine',
    label: '와인잔',
    emoji: '🍷',
    unlockShots: 7,
    maxChars: 200,
    viewBox: '0 0 160 240',
    width: 220,
    outerPath:
      'M 32 22 C 32 90 42 130 70 132 L 70 200 L 38 218 L 38 226 L 122 226 L 122 218 L 90 200 L 90 132 C 118 130 128 90 128 22 Z',
    innerPath:
      'M 38 26 C 38 88 48 124 78 126 C 112 124 122 88 122 26 Z',
    facets: [],
    rim: { y: 24, leftX: 32, rightX: 128, innerLeftX: 38, innerRightX: 122 },
    liquidRange: { top: 26, bottom: 126 },
    groundY: 226,
    drinks: [
      { id: 'red', label: '레드', color: '#7a1736', edge: '#3a0815' },
      { id: 'white', label: '화이트', color: '#f0e3a8', edge: '#a48a2e' },
      { id: 'rose', label: '로제', color: '#e8a6b3', edge: '#a0455a' },
    ],
  },

  // 위스키잔(온더락 텀블러)
  whiskey: {
    id: 'whiskey',
    label: '위스키잔',
    emoji: '🥃',
    unlockShots: 15,
    maxChars: 500,
    viewBox: '0 0 160 160',
    width: 240,
    outerPath:
      'M 26 24 L 134 24 L 132 124 L 138 138 L 138 144 L 22 144 L 22 138 L 28 124 Z',
    innerPath: 'M 32 28 L 128 28 L 126 118 L 34 118 Z',
    facets: [
      { x1: 60, y1: 28, x2: 60, y2: 122, opacity: 0.1 },
      { x1: 100, y1: 28, x2: 100, y2: 122, opacity: 0.1 },
    ],
    rim: { y: 26, leftX: 26, rightX: 134, innerLeftX: 32, innerRightX: 128 },
    liquidRange: { top: 28, bottom: 118 },
    groundY: 144,
    iceCubes: true,
    drinks: [
      { id: 'jack', label: '잭다니엘', color: '#b97a2b', edge: '#5e3a0c' },
      { id: 'ballantine', label: '발렌타인', color: '#a0641c', edge: '#4a2a06' },
      { id: 'glenfiddich', label: '글렌피딕', color: '#d9952f', edge: '#7a4a0a' },
    ],
  },
}

export const GLASS_LIST = Object.values(GLASSES)

// 잔 id + 술 id로 색상 찾기
export function resolveDrink(glassId, drinkId) {
  const glass = GLASSES[glassId] ?? GLASSES.soju
  return glass.drinks.find((d) => d.id === drinkId) ?? glass.drinks[0]
}

// 잔의 기본 술 id
export function defaultDrinkOf(glassId) {
  return (GLASSES[glassId] ?? GLASSES.soju).drinks[0].id
}
