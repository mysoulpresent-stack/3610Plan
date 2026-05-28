export interface MicroGoal {
  id: string
  text: string
  mainCategory: string
  subCategory: string
  days: boolean[] // 10 booleans, one per sprint day
}

export interface DailyLog {
  id: string
  sprintId: string
  date: string // YYYY-MM-DD
  encouragement: string
  tasks: string[]
  taskStatus: boolean[]
  achievements: string[]
  gratitude: string[]
  reflection: string[]
  mood: string // emoji string
}

export interface Sprint {
  id: string
  index: number // 1-36
  microGoals: MicroGoal[]
  reflection: string
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
}

export interface UserProfile {
  id: string
  name: string
  tier: 'free' | 'paid'
  createdAt: string
  manifesto: string[] // year-level identity statements
}

export interface AIReport {
  id: string
  sprintId: string
  generatedAt: string
  sprintRange: { from: number; to: number }
  content: string
}
