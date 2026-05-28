export interface SprintAnalysisRequest {
  sprintIndex: number
  period: string
  monthName: string
  startDate: string
  endDate: string
  manifesto: string[]
  goals: Array<{
    text: string
    category: string
    completedDays: number
    totalDays: number
  }>
  dailyLogs: Array<{
    date: string
    mood: string
    encouragement: string
    tasks: string[]
    taskStatus: boolean[]
    achievements: string[]
    gratitude: string[]
    reflection: string[]
  }>
  reflection: string
}

export async function generateAnalysis(ctx: SprintAnalysisRequest): Promise<string> {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ctx),
  })

  const data = await res.json().catch(() => ({ error: '网络请求失败' }))
  if (!res.ok) throw new Error(data.error ?? '分析生成失败')
  return data.content as string
}
