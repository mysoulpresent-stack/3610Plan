import 'dotenv/config'
import express from 'express'
import Anthropic from '@anthropic-ai/sdk'

const app = express()
app.use(express.json({ limit: '1mb' }))

// CORS for dev (Vite proxy handles prod)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') { res.sendStatus(200); return }
  next()
})

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface GoalContext {
  text: string
  category: string
  completedDays: number
  totalDays: number
}

interface LogContext {
  date: string
  mood: string
  encouragement: string
  tasks: string[]
  taskStatus: boolean[]
  achievements: string[]
  gratitude: string[]
  reflection: string[]
}

interface SprintContext {
  sprintIndex: number
  period: string
  monthName: string
  startDate: string
  endDate: string
  manifesto: string[]
  goals: GoalContext[]
  dailyLogs: LogContext[]
  reflection: string
}

function buildPrompt(ctx: SprintContext): string {
  const manifestoText = ctx.manifesto.filter(Boolean).length > 0
    ? ctx.manifesto.filter(Boolean).map(m => `- ${m}`).join('\n')
    : '（未设定年度宣言）'

  const goalsText = ctx.goals.length > 0
    ? ctx.goals.map((g, i) => {
        const pct = g.totalDays === 0 ? 0 : Math.round(g.completedDays / g.totalDays * 100)
        return `目标${i + 1}：${g.text}（${g.category}）\n  完成：${g.completedDays}/${g.totalDays} 天（${pct}%）`
      }).join('\n')
    : '（本周期未设定微目标）'

  const logsText = ctx.dailyLogs.length > 0
    ? ctx.dailyLogs.map(l => {
        const parts: string[] = []
        if (l.encouragement) parts.push(`  鼓励自己：${l.encouragement}`)
        const doneTasks = l.tasks.filter((_, i) => l.taskStatus[i]).filter(Boolean)
        if (doneTasks.length > 0) parts.push(`  完成任务：${doneTasks.join('、')}`)
        const ach = l.achievements.filter(Boolean)
        if (ach.length > 0) parts.push(`  小成就：${ach.join('、')}`)
        const grat = l.gratitude.filter(Boolean)
        if (grat.length > 0) parts.push(`  感恩：${grat.join('、')}`)
        const ref = l.reflection.filter(Boolean)
        if (ref.length > 0) parts.push(`  反思：${ref.join('、')}`)
        const body = parts.length > 0 ? parts.join('\n') : '  （仅记录了情绪）'
        return `${l.date}（情绪：${l.mood}）\n${body}`
      }).join('\n\n')
    : '（本周期暂无日记记录）'

  return `你是一位温暖、专业的个人成长教练。以下是用户在一个10天成长周期内的完整记录。请用真诚、鼓励的语气，以中文写一份简洁有力的成长分析报告（不超过450字）。

【周期信息】
第 ${ctx.sprintIndex} 周期 · ${ctx.monthName}${ctx.period}（${ctx.startDate} 至 ${ctx.endDate}）

【年度个人宣言】
${manifestoText}

【本周期微目标完成情况】
${goalsText}

【每日记录】
${logsText}

【阶段复盘（用户自述）】
${ctx.reflection || '（用户未填写阶段复盘）'}

---

请按以下结构输出报告，直接写内容，不需要前置说明：

**✨ 这段时间你做到了**
（结合具体数据，肯定用户的付出与成就，1-2句话）

**🔍 我观察到的规律**
（从日记情绪、任务完成、反思内容中发现2-3个规律，每条一行）

**🌱 下个周期的建议**
（基于本周期表现，给出3条具体、可执行的建议，每条一行）

**💬 想对你说**
（像朋友一样说一段真诚温暖的话，2-3句）`
}

app.post('/api/analyze', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: '未配置 ANTHROPIC_API_KEY，请在 .env 文件中填写' })
    return
  }

  const ctx = req.body as SprintContext
  if (!ctx || typeof ctx.sprintIndex !== 'number') {
    res.status(400).json({ error: '请求数据格式错误' })
    return
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: buildPrompt(ctx) }],
    })

    const block = message.content[0]
    if (block.type !== 'text') {
      res.status(500).json({ error: '意外的响应格式' })
      return
    }

    res.json({ content: block.text })
  } catch (err) {
    console.error('Claude API error:', err)
    res.status(500).json({ error: '分析生成失败，请稍后重试' })
  }
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`🤖 AI 分析服务已启动 → http://localhost:${PORT}`)
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  ANTHROPIC_API_KEY 未设置，请在 .env 文件中配置')
  }
})
