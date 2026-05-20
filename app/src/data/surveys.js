// 설문 데이터 (데모).
// 구조:
//   ROLE_PROBE: 주니어/시니어 판별 1문항
//   BOTTLES: 4병 × 5문항. 주니어/시니어로 분기되는 병은 questionsByRole, 공통이면 questions
// 한 병 완료 → 술 1병(5잔) 인벤토리 적립.

export const ROLE_PROBE = {
  id: 'role-probe',
  prompt: '지금 직장에서 본인의 위치는?',
  options: [
    { idx: 0, label: '입사 1년 이하', role: 'junior' },
    { idx: 1, label: '1~5년 (주니어)', role: 'junior' },
    { idx: 2, label: '6~10년 (미들)', role: 'junior' }, // 미들은 일단 주니어 문항으로 라우트
    { idx: 3, label: '11~15년 (시니어)', role: 'senior' },
    { idx: 4, label: '15년 이상 (베테랑)', role: 'senior' },
  ],
}

export const BOTTLES = [
  {
    id: 'work',
    title: '업무·역량',
    sub: '일이 막힐 때, 시간이 부족할 때',
    icon: '💼',
    rewardDrinks: ['soju-chamisul', 'lager', 'red', 'jack'], // 5번째 잔 보상 선택지
    questionsByRole: {
      junior: [
        {
          id: 'work-j-1',
          prompt: '일이 막혔을 때 가장 큰 어려움은?',
          options: [
            '어디서부터 손대야 할지 모르겠다',
            '누구한테 물어봐야 할지 모름',
            '한심해 보일까 봐 못 물어봄',
            '참고할 자료가 없다',
            '시간이 부족하다',
          ],
        },
        {
          id: 'work-j-2',
          prompt: '시간이 부족할 때 보통 원인은?',
          options: [
            '일이 그냥 많다',
            '우선순위가 안 잡힌다',
            '의사결정 대기',
            '다른 사람 일까지 떠넘겨짐',
            '미루다 보니',
          ],
        },
        {
          id: 'work-j-3',
          prompt: '피드백을 받을 때 힘든 점은?',
          options: [
            '무엇을 고쳐야 하는지 모호함',
            '인격 공격성',
            '안 줌',
            '너무 자주 줌',
            '공개적으로 줌',
          ],
        },
        {
          id: 'work-j-4',
          prompt: '회의에서 제일 답답할 때는?',
          options: [
            '발언을 못 함',
            '발언이 무시당함',
            '결론 없이 끝남',
            '너무 길다',
            '결정난 게 또 뒤집힘',
          ],
        },
        {
          id: 'work-j-5',
          prompt: '새 업무가 들어왔을 때?',
          options: [
            '설명이 부족',
            '마감만 정해줌',
            '기대 결과물이 불명확',
            '일정이 비현실적',
            '거절할 수 없음',
          ],
        },
      ],
      senior: [
        {
          id: 'work-s-1',
          prompt: '요즘 가장 큰 업무 부담은?',
          options: [
            '책임만 많고 권한이 없음',
            '위·아래 다 챙겨야 함',
            '보고서가 너무 많다',
            '의사결정이 더디다',
            '본인 업무에 집중 못함',
          ],
        },
        {
          id: 'work-s-2',
          prompt: '주니어 지도에서 어려운 점?',
          options: [
            '동기부여',
            '기본기 부족',
            '가르칠 시간 부족',
            '가르쳐도 이직',
            '갈등',
          ],
        },
        {
          id: 'work-s-3',
          prompt: '위(경영진)와의 관계?',
          options: [
            '비현실적 목표',
            '자원 부족',
            '책임 떠넘김',
            '의사결정 늦음',
            '잘 통함',
          ],
        },
        {
          id: 'work-s-4',
          prompt: '본인의 성장은?',
          options: [
            '정체된 느낌',
            '새로 배울 게 없다',
            '배울 시간 없음',
            '충분히 성장 중',
            '잘 모르겠다',
          ],
        },
        {
          id: 'work-s-5',
          prompt: '권한 위임은?',
          options: [
            '위임할 사람이 없음',
            '위임 후에도 결과는 내가 책임',
            '위임 잘 됨',
            '위임할 줄 모름',
            '위임받지 못함',
          ],
        },
      ],
    },
  },

  {
    id: 'culture',
    title: '관계·문화',
    sub: '회식·정치·휴가의 진실',
    icon: '🫂',
    rewardDrinks: ['lager', 'tera', 'red', 'white'],
    questions: [
      {
        id: 'culture-1',
        prompt: '회사에서 가장 불편한 관계는?',
        options: ['직속 상사', '동료', '후배', '타팀', '외부 클라이언트'],
      },
      {
        id: 'culture-2',
        prompt: '회식/워크샵에 대한 솔직한 느낌?',
        options: [
          '즐겁다',
          '부담이다',
          '거절 못 한다',
          '안 한다',
          '보상이 필요하다',
        ],
      },
      {
        id: 'culture-3',
        prompt: '휴가를 쓸 때?',
        options: ['자유롭다', '눈치 본다', '쓰지 않는다', '쓰고도 일한다', '못 쓴다'],
      },
      {
        id: 'culture-4',
        prompt: '사내 정치?',
        options: [
          '전혀 없다',
          '있지만 무관',
          '영향 받는다',
          '휘말렸다',
          '적응했다',
        ],
      },
      {
        id: 'culture-5',
        prompt: '회사의 가치관?',
        options: [
          '공감한다',
          '모르겠다',
          '안 맞는다',
          '위선적이다',
          '신경 안 쓴다',
        ],
      },
    ],
  },

  {
    id: 'growth',
    title: '성장·미래',
    sub: '1년 뒤의 나',
    icon: '🌱',
    rewardDrinks: ['cheongju', 'wine', 'rose', 'glenfiddich'],
    questions: [
      {
        id: 'growth-1',
        prompt: '1년 뒤 본인의 모습은?',
        options: [
          '이 회사',
          '같은 업계 다른 회사',
          '다른 업계',
          '자영업·창업',
          '모르겠다',
        ],
      },
      {
        id: 'growth-2',
        prompt: '가장 큰 커리어 고민?',
        options: ['이직 시기', '연봉', '직무 변경', '학위·자격증', '휴직'],
      },
      {
        id: 'growth-3',
        prompt: '사이드 프로젝트는?',
        options: ['안 함', '가끔', '정기적', '본업과 연계', '본업화 시도'],
      },
      {
        id: 'growth-4',
        prompt: '연봉에 대한 만족?',
        options: [
          '충분',
          '부족',
          '협상 중',
          '협상 거절당함',
          '협상한 적 없음',
        ],
      },
      {
        id: 'growth-5',
        prompt: '회사를 그만두고 싶을 때 1순위 이유?',
        options: ['사람', '일', '보상', '비전', '본인의 변화'],
      },
    ],
  },

  {
    id: 'mental',
    title: '정신·신체',
    sub: '몸과 마음의 신호',
    icon: '🌙',
    rewardDrinks: ['stout', 'makgeolli', 'jack', 'ballantine'],
    questions: [
      {
        id: 'mental-1',
        prompt: '최근 한 달 수면은?',
        options: ['충분', '부족', '자다 깬다', '약 복용', '잘 자는 편'],
      },
      {
        id: 'mental-2',
        prompt: '출근 직전의 기분은?',
        options: [
          '괜찮다',
          '무겁다',
          '가슴이 답답',
          '자주 결근하고 싶다',
          '우울',
        ],
      },
      {
        id: 'mental-3',
        prompt: '운동/식사 관리?',
        options: ['관리한다', '시간 없다', '폭식', '거른다', '술로 푼다'],
      },
      {
        id: 'mental-4',
        prompt: '휴일에는?',
        options: [
          '충전된다',
          '누워만 있다',
          '일 생각',
          '불안',
          '회복 안 된다',
        ],
      },
      {
        id: 'mental-5',
        prompt: '누구에게 털어놓는가?',
        options: ['가족', '친구', '동료', '혼자', '상담사'],
      },
    ],
  },
]

export const BOTTLE_BY_ID = Object.fromEntries(BOTTLES.map((b) => [b.id, b]))

// 한 병의 진행률 (응답 수 / 5)
export function bottleProgress(bottleId, answeredQuestionIds) {
  const bottle = BOTTLE_BY_ID[bottleId]
  if (!bottle) return 0
  const allQs = bottle.questions ?? [
    ...(bottle.questionsByRole?.junior ?? []),
    ...(bottle.questionsByRole?.senior ?? []),
  ]
  const set = new Set(answeredQuestionIds)
  const matched = allQs.filter((q) => set.has(q.id)).length
  return Math.min(matched / 5, 1)
}

// 역할에 맞는 질문 목록을 반환
export function questionsForBottle(bottle, role) {
  if (bottle.questions) return bottle.questions
  return bottle.questionsByRole?.[role] ?? bottle.questionsByRole?.junior ?? []
}
