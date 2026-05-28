import type { Sprint } from '../types'

export const MONTH_NAMES = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月',
]

export const ENERGY_QUOTES = [
  '你的能量是你的货币。请明智地使用它。',
  '专注于进步，而非完美。',
  '小步快跑，终成大器。',
  '今天是一个成长的全新机会。',
  '持之以恒是精通的关键。',
  '注意力所在，能量随之流动。',
  '成为你想吸引的那种能量。',
  '脚踏实地，专注当下。',
  '未来的你会感谢今天的自己。',
  '休息也是一种生产力。倾听身体的声音。',
]

export const MANIFESTO_LIBRARY: Record<string, string[]> = {
  '健康': [
    '我是一个重视身体的人',
    '我是一个保持规律作息的人',
    '我是一个愿意运动的人',
  ],
  '成长': [
    '我是一个持续学习的人',
    '我是一个每天都有进步的人',
    '我是一个不断提升自己的人',
  ],
  '事业': [
    '我是一个能把事情做好的人',
    '我是一个有执行力的人',
    '我是一个对工作负责的人',
  ],
  '关系': [
    '我是一个愿意表达关心的人',
    '我是一个珍惜身边人的人',
    '我是一个用心经营关系的人',
  ],
  '内在': [
    '我是一个情绪稳定的人',
    '我是一个对自己温柔的人',
    '我是一个接纳自己的人',
  ],
}

export const GOAL_TEMPLATES: Record<string, { color: string; subs: Record<string, string> }> = {
  '健康': {
    color: 'text-red-500 bg-red-50 dark:bg-red-900/20',
    subs: {
      '运动': '每天步行 ≥ 6000步',
      '睡眠': '12点前上床',
      '饮食': '每天至少吃一份蔬菜',
    },
  },
  '成长': {
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
    subs: {
      '学习': '每天学习20分钟',
      '阅读': '每天阅读10页',
      '输出': '每天记录1条笔记',
    },
  },
  '事业': {
    color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
    subs: {
      '主业提升': '每天完成1个高优先级任务',
      '副业探索': '每天投入20分钟',
      '财务记录': '每天记录一笔支出',
    },
  },
  '关系': {
    color: 'text-pink-500 bg-pink-50 dark:bg-pink-900/20',
    subs: {
      '家人': '每天与家人交流10分钟',
      '伴侣': '每天表达一次关心或感谢',
      '社交': '每天主动联系1人',
    },
  },
  '内在': {
    color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
    subs: {
      '情绪觉察': '每天记录一句感受',
      '放松': '每天10分钟无压力休息',
      '兴趣': '每天做一件让自己开心的事',
    },
  },
}

export const CATEGORIES = Object.keys(GOAL_TEMPLATES)

// Generate 36 calendar-aligned sprints for the current year
// 3 sprints per month: 1-10, 11-20, 21-end
export function generateSprints(year: number): Sprint[] {
  const sprints: Sprint[] = []
  let idx = 1

  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const ranges = [
      { start: 1, end: 10 },
      { start: 11, end: 20 },
      { start: 21, end: daysInMonth },
    ]
    for (const range of ranges) {
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(range.start).padStart(2, '0')}`
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(range.end).padStart(2, '0')}`
      sprints.push({
        id: `sprint-${idx}`,
        index: idx,
        microGoals: [],
        reflection: '',
        startDate,
        endDate,
      })
      idx++
    }
  }

  return sprints
}

export function getCurrentSprintIndex(sprints: Sprint[]): number {
  const today = new Date().toISOString().split('T')[0]
  const idx = sprints.findIndex(s => s.startDate <= today && s.endDate >= today)
  return idx >= 0 ? idx : -1
}

export function getSprintInfo(sprint: Sprint) {
  const start = new Date(sprint.startDate)
  const end = new Date(sprint.endDate)
  const monthIndex = start.getMonth()
  const sprintInMonth = Math.ceil(start.getDate() / 10)
  const period = ['上旬', '中旬', '下旬'][sprintInMonth - 1]
  const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1

  return {
    monthIndex,
    monthName: MONTH_NAMES[monthIndex],
    sprintInMonth,
    period,
    startDay: start.getDate(),
    endDay: end.getDate(),
    totalDays,
    year: start.getFullYear(),
    month: monthIndex,
  }
}

export function getSprintCompletion(sprint: Sprint): number {
  if (!sprint.microGoals.length) return 0
  const info = getSprintInfo(sprint)
  const totalSlots = sprint.microGoals.length * info.totalDays
  const checked = sprint.microGoals.reduce(
    (sum, g) => sum + g.days.filter(Boolean).length,
    0,
  )
  return totalSlots > 0 ? checked / totalSlots : 0
}
