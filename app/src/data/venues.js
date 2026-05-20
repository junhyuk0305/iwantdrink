// 장소별 데이터.
// 배경 사진은 public/venues/{id}.png 에 들어 있으면 자동 로드됩니다.
// 사진이 없으면 fallback 그라데이션으로 자동 폴백.

export const VENUES = {
  pojangmacha: {
    id: 'pojangmacha',
    label: '동네 포장마차',
    sub: '비 오는 주황색 천막 아래',
    bg: '/venues/pojangmacha.png',
    fallback: {
      base: 'linear-gradient(180deg, #1a0d08 0%, #2a1208 40%, #4a1a0a 75%, #1a0905 100%)',
      glow: 'radial-gradient(ellipse 60% 50% at 50% 35%, rgba(255,140,60,0.35), transparent 70%)',
    },
    accent: '#ff8a3d',
    icon: '🏮',
    short: '포차',
    rain: true,
  },
  hof: {
    id: 'hof',
    label: '동네 호프집',
    sub: '치킨 한 마리에 시원한 한 잔',
    bg: '/venues/hof.png',
    fallback: {
      base: 'linear-gradient(180deg, #1a1208 0%, #2a1f10 50%, #3a2812 100%)',
      glow: 'radial-gradient(ellipse 60% 45% at 50% 40%, rgba(255,180,90,0.28), transparent 70%)',
    },
    accent: '#ffc66b',
    icon: '🍺',
    short: '호프',
    rain: false,
  },
  spanishbar: {
    id: 'spanishbar',
    label: '스페인 와인바',
    sub: '대리석 카운터, 플라멩코 한 곡',
    bg: '/venues/spanishbar.png',
    fallback: {
      base: 'linear-gradient(180deg, #0e070a 0%, #1f0d15 50%, #2e1320 100%)',
      glow: 'radial-gradient(ellipse 55% 45% at 50% 40%, rgba(190,80,110,0.22), transparent 70%)',
    },
    accent: '#d07a99',
    icon: '🍷',
    short: '스페인',
    rain: false,
  },
  rooftop: {
    id: 'rooftop',
    label: '옥상 바',
    sub: '도시 야경이 펼쳐지는 루프탑',
    bg: '/venues/rooftop.png',
    fallback: {
      base: 'linear-gradient(180deg, #050810 0%, #0a1428 40%, #1a2a48 70%, #050810 100%)',
      glow: 'radial-gradient(ellipse 65% 55% at 50% 55%, rgba(120,170,255,0.18), transparent 70%)',
    },
    accent: '#7eb5ff',
    icon: '🌃',
    short: '옥상',
    rain: false,
  },
}

export const VENUE_LIST = Object.values(VENUES)
