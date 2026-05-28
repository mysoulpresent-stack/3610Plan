import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronLeft, Plus, X, Sparkles, Trophy, Activity, BookOpen, Briefcase, Users, Heart } from 'lucide-react'
import { getSprint, saveSprint, getDayLogsBySprintId, getReportBySprintId, saveReport } from '../lib/db'
import { getSprintInfo, CATEGORIES, GOAL_TEMPLATES } from '../lib/sprints'
import { generateAnalysis } from '../lib/ai'
import type { Sprint, MicroGoal, DailyLog, AIReport } from '../types'

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  '健康': <Activity size={20} />,
  '成长': <BookOpen size={20} />,
  '事业': <Briefcase size={20} />,
  '关系': <Users size={20} />,
  '内在': <Heart size={20} />,
}

interface Props {
  sprintId: string
  manifesto: string[]
  onBack: () => void
  onOpenDay: (sprintId: string, date: string) => void
}

export default function SprintView({ sprintId, manifesto, onBack, onOpenDay }: Props) {
  const [sprint, setSprint] = useState<Sprint | null>(null)
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [isSelectingGoal, setIsSelectingGoal] = useState(false)
  const [selectionStep, setSelectionStep] = useState<'main' | 'sub' | 'edit'>('main')
  const [selectedMain, setSelectedMain] = useState<string | null>(null)
  const [selectedSub, setSelectedSub] = useState<string | null>(null)
  const [tempGoalText, setTempGoalText] = useState('')
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null)
  const [manifestoIndex, setManifestoIndex] = useState(0)
  const [showUpgradeNote, setShowUpgradeNote] = useState(false)
  const [report, setReport] = useState<AIReport | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  const nonEmptyManifesto = manifesto.filter(m => m.trim())

  useEffect(() => {
    loadData()
  }, [sprintId])

  useEffect(() => {
    if (nonEmptyManifesto.length <= 1) return
    const t = setInterval(() => {
      setManifestoIndex(i => (i + 1) % nonEmptyManifesto.length)
    }, 4000)
    return () => clearInterval(t)
  }, [nonEmptyManifesto.length])

  async function loadData() {
    const [s, l, r] = await Promise.all([
      getSprint(sprintId),
      getDayLogsBySprintId(sprintId),
      getReportBySprintId(sprintId),
    ])
    if (s) setSprint(s)
    setLogs(l)
    if (r) setReport(r)
  }

  async function update(updates: Partial<Sprint>) {
    if (!sprint) return
    const updated = { ...sprint, ...updates }
    setSprint(updated)
    await saveSprint(updated)
  }

  function showFeedback() {
    const msgs = ['✨ 打卡成功！', '💪 坚持就是胜利！', '🌱 又进步了一点！', '🎉 加油！']
    setFeedbackMsg(msgs[Math.floor(Math.random() * msgs.length)])
    setTimeout(() => setFeedbackMsg(null), 2000)
  }

  async function toggleDay(goalIdx: number, dayIdx: number) {
    if (!sprint) return
    const newGoals = sprint.microGoals.map((g, i) => {
      if (i !== goalIdx) return g
      const newDays = [...(g.days || [])]
      while (newDays.length < info.totalDays) newDays.push(false)
      const wasChecked = newDays[dayIdx]
      newDays[dayIdx] = !newDays[dayIdx]
      if (!wasChecked) showFeedback()
      return { ...g, days: newDays }
    })
    await update({ microGoals: newGoals })
  }

  async function removeGoal(idx: number) {
    if (!sprint) return
    await update({ microGoals: sprint.microGoals.filter((_, i) => i !== idx) })
  }

  async function confirmGoal() {
    if (!sprint || !selectedMain || !selectedSub) return
    const goal: MicroGoal = {
      id: `goal-${Date.now()}`,
      text: tempGoalText || GOAL_TEMPLATES[selectedMain]?.subs[selectedSub] || '',
      mainCategory: selectedMain,
      subCategory: selectedSub,
      days: Array(info.totalDays).fill(false),
    }
    await update({ microGoals: [...sprint.microGoals, goal] })
    setIsSelectingGoal(false)
    setSelectionStep('main')
    setSelectedMain(null)
    setSelectedSub(null)
    setTempGoalText('')
  }

  async function handleAnalyze() {
    if (!sprint) return
    setAnalyzing(true)
    setAnalyzeError(null)
    const sprintInfo = getSprintInfo(sprint)
    try {
      const content = await generateAnalysis({
        sprintIndex: sprint.index,
        period: sprintInfo.period,
        monthName: sprintInfo.monthName,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        manifesto,
        goals: sprint.microGoals.map(g => ({
          text: g.text,
          category: `${g.mainCategory} · ${g.subCategory}`,
          completedDays: g.days.filter(Boolean).length,
          totalDays: g.days.length,
        })),
        dailyLogs: logs.map(l => ({
          date: l.date,
          mood: l.mood,
          encouragement: l.encouragement,
          tasks: l.tasks,
          taskStatus: l.taskStatus,
          achievements: l.achievements,
          gratitude: l.gratitude,
          reflection: l.reflection,
        })),
        reflection: sprint.reflection,
      })
      const newReport: AIReport = {
        id: `report-${sprintId}-${Date.now()}`,
        sprintId,
        generatedAt: new Date().toISOString(),
        sprintRange: { from: sprint.index, to: sprint.index },
        content,
      }
      await saveReport(newReport)
      setReport(newReport)
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : '分析失败，请稍后重试')
    } finally {
      setAnalyzing(false)
    }
  }

  if (!sprint) return <div className="py-20 text-center text-slate-400">加载中…</div>

  const info = getSprintInfo(sprint)
  const today = new Date()
  const isFinished = new Date(sprint.endDate) < today

  // Build calendar grid for the month
  const firstOfMonth = new Date(info.year, info.month, 1)
  const startWeekday = firstOfMonth.getDay()
  const daysInMonth = new Date(info.year, info.month + 1, 0).getDate()
  const calendarDays: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Feedback toast */}
      <AnimatePresence>
        {feedbackMsg && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[150] px-6 py-3 bg-brand-green-deep text-white rounded-full shadow-2xl flex items-center gap-3 border border-brand-green whitespace-nowrap"
          >
            <Sparkles className="text-brand-yellow w-5 h-5" />
            <span className="font-black tracking-tight">{feedbackMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav */}
      <nav className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-full transition-colors flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium"
        >
          <ChevronLeft size={20} />
          <span>返回主页</span>
        </button>
        <div className="px-3 py-1 bg-brand-green-deep text-white rounded-full text-xs md:text-sm font-black tracking-widest uppercase">
          {info.monthName}{info.period} • {info.startDay}/{info.monthIndex + 1} - {info.endDay}/{info.monthIndex + 1}
        </div>
      </nav>

      {/* Manifesto card */}
      <div className="glass-card p-6 bg-gradient-to-br from-white to-brand-green/30 dark:from-slate-800 dark:to-slate-900/50 relative overflow-hidden min-h-[140px] flex flex-col justify-center">
        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-brand-green-dark">
              <Sparkles size={18} fill="currentColor" />
              <span className="text-xs font-bold uppercase tracking-wider">{info.year} 年度个人宣言</span>
            </div>
            {nonEmptyManifesto.length > 1 && (
              <div className="flex gap-1">
                {nonEmptyManifesto.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all duration-500 ${i === manifestoIndex ? 'bg-brand-green-dark w-3' : 'bg-brand-green-dark/20 w-1'}`}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="relative h-16 flex items-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={manifestoIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5 }}
                className="text-lg md:text-xl font-bold text-slate-700 dark:text-slate-300 leading-relaxed"
              >
                {nonEmptyManifesto[manifestoIndex] || '开启你的成长之旅 ✨'}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
        <div className="absolute -right-4 -bottom-4 opacity-10 text-brand-green-dark">
          <Sparkles size={120} />
        </div>
      </div>

      {/* Main content card */}
      <div className="glass-card p-6 space-y-8 bg-gradient-to-br from-white to-brand-green/30 dark:from-slate-800 dark:to-slate-900/50">
        <div className="text-center py-2">
          <p className="text-lg md:text-xl font-black text-brand-green-deep dark:text-brand-green-dark tracking-tight">
            {info.year}年{info.month + 1}月{info.startDay}–{info.endDay}日 • 我的微计划打卡
          </p>
        </div>

        {/* Micro goals */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1 ml-1">
            <h4 className="text-sm md:text-base font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              第 {sprint.index} 周期微目标
            </h4>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">（💡 可先设置3个）</span>
              <button
                onClick={() => {
                  if (sprint.microGoals.length >= 3) {
                    setShowUpgradeNote(true)
                  } else {
                    setIsSelectingGoal(true)
                    setSelectionStep('main')
                    setSelectedMain(null)
                    setSelectedSub(null)
                    setTempGoalText('')
                  }
                }}
                className="text-sm md:text-base font-bold text-brand-green-dark flex items-center gap-1 hover:underline"
              >
                <Plus size={12} /> 添加目标
              </button>
            </div>
          </div>

          {showUpgradeNote && (
            <div className="p-3 bg-brand-yellow/30 border border-brand-yellow-dark/30 rounded-xl text-sm text-slate-600 dark:text-slate-400">
              免费版最多设置 3 个微目标。
              <button onClick={() => setShowUpgradeNote(false)} className="ml-2 text-brand-green-dark underline">知道了</button>
            </div>
          )}

          <div className="space-y-3">
            {sprint.microGoals.map((goal, idx) => {
              const days = goal.days || []
              return (
                <div key={goal.id} className="p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm group transition-all hover:border-slate-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="px-2 py-0.5 bg-brand-green/30 text-[10px] md:text-xs font-bold text-brand-green-deep dark:text-brand-green-dark rounded-full uppercase tracking-wider">
                          {goal.mainCategory} • {goal.subCategory}
                        </div>
                        <input
                          type="text"
                          placeholder="这10天你的重心是什么？"
                          value={goal.text}
                          onChange={async e => {
                            const newGoals = sprint.microGoals.map((g, i) =>
                              i === idx ? { ...g, text: e.target.value } : g,
                            )
                            await update({ microGoals: newGoals })
                          }}
                          className="flex-1 bg-transparent border-none focus:ring-0 outline-none placeholder:text-slate-300 dark:placeholder:text-slate-500 text-sm font-semibold text-slate-700 dark:text-slate-300 min-w-0"
                        />
                      </div>
                      {/* Per-goal day checkboxes */}
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from({ length: info.totalDays }, (_, dIdx) => {
                          const checked = days[dIdx] || false
                          const dayNum = info.startDay + dIdx
                          return (
                            <button
                              key={dIdx}
                              onClick={() => toggleDay(idx, dIdx)}
                              className={`w-6 h-6 md:w-7 md:h-7 rounded-md flex items-center justify-center transition-all text-xs font-bold ${
                                checked
                                  ? 'bg-brand-green-dark text-white shadow-sm'
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                              }`}
                            >
                              {dayNum}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <button
                      onClick={() => removeGoal(idx)}
                      className="text-slate-300 dark:text-slate-500 hover:text-red-400 transition-colors mt-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Goal selection modal */}
        <AnimatePresence>
          {isSelectingGoal && (
            <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl w-full max-w-md space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-brand-green-deep dark:text-brand-green-dark">
                    {selectionStep === 'main' && '选择一个方向'}
                    {selectionStep === 'sub' && `专注哪个${selectedMain}?`}
                    {selectionStep === 'edit' && '确认你的微目标'}
                  </h3>
                  <button onClick={() => setIsSelectingGoal(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>

                <div className="min-h-[240px]">
                  {selectionStep === 'main' && (
                    <div className="grid grid-cols-1 gap-3">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          onClick={() => { setSelectedMain(cat); setSelectionStep('sub') }}
                          className={`flex items-center gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-brand-green-dark hover:bg-brand-green/10 transition-all group`}
                        >
                          <div className={`p-3 rounded-xl ${GOAL_TEMPLATES[cat].color}`}>
                            {CATEGORY_ICONS[cat]}
                          </div>
                          <div className="text-left">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{cat}</div>
                            <div className="text-xs text-slate-400">点击选择子分类</div>
                          </div>
                          <ChevronLeft size={16} className="ml-auto rotate-180 text-slate-300 group-hover:text-brand-green-dark" />
                        </button>
                      ))}
                    </div>
                  )}

                  {selectionStep === 'sub' && selectedMain && (
                    <div className="space-y-3">
                      <button
                        onClick={() => setSelectionStep('main')}
                        className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600"
                      >
                        <ChevronLeft size={16} /> 返回
                      </button>
                      <div className="grid grid-cols-1 gap-3">
                        {Object.keys(GOAL_TEMPLATES[selectedMain].subs).map(sub => (
                          <button
                            key={sub}
                            onClick={() => {
                              setSelectedSub(sub)
                              setTempGoalText(GOAL_TEMPLATES[selectedMain].subs[sub])
                              setSelectionStep('edit')
                            }}
                            className="text-left p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-brand-green-dark hover:bg-brand-green/10 transition-all"
                          >
                            <div className="font-bold text-slate-800 dark:text-slate-200">{sub}</div>
                            <div className="text-xs text-slate-400 mt-1">{GOAL_TEMPLATES[selectedMain].subs[sub]}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectionStep === 'edit' && (
                    <div className="space-y-4">
                      <button
                        onClick={() => setSelectionStep('sub')}
                        className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600"
                      >
                        <ChevronLeft size={16} /> 返回
                      </button>
                      <div>
                        <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider font-bold">{selectedMain} • {selectedSub}</p>
                        <input
                          className="input"
                          value={tempGoalText}
                          onChange={e => setTempGoalText(e.target.value)}
                          placeholder="自定义目标描述…"
                          autoFocus
                        />
                      </div>
                      <button
                        onClick={confirmGoal}
                        className="w-full py-3 bg-brand-green-deep text-white rounded-xl font-black hover:bg-brand-green-dark transition-colors"
                      >
                        添加这个微目标
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Stage reflection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between ml-1">
            <label className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">阶段复盘</label>
            <span className="text-xs md:text-sm text-slate-400">记录本周期的感悟与成长</span>
          </div>
          <textarea
            value={sprint.reflection}
            onChange={e => update({ reflection: e.target.value })}
            placeholder="在这里记录你的阶段性反思…"
            className="textarea h-[140px] leading-relaxed placeholder:text-slate-300 dark:placeholder:text-slate-500"
          />
        </div>

        {/* AI Growth Report */}
        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between ml-1">
            <label className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={14} className="text-brand-green-dark" />
              AI 成长分析
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full normal-case tracking-normal">未来升级计划</span>
            </label>
            {report && !analyzing && (
              <button
                onClick={handleAnalyze}
                className="text-xs text-slate-400 hover:text-brand-green-dark transition-colors"
              >
                重新生成
              </button>
            )}
          </div>


          {!report && !analyzing && (
            <div className="w-full py-3 border-2 border-dashed border-slate-200 text-slate-300 font-bold rounded-xl flex items-center justify-center gap-2 text-sm cursor-not-allowed select-none">
              <Sparkles size={15} />
              生成 AI 成长分析
            </div>
          )}

          {analyzing && (
            <div className="p-4 bg-brand-green/10 rounded-xl flex items-center gap-3 text-brand-green-dark">
              <div className="w-4 h-4 border-2 border-brand-green-dark border-t-transparent rounded-full animate-spin shrink-0" />
              <span className="text-sm font-medium">正在分析你的成长记录…</span>
            </div>
          )}

          {report && (
            <div className="p-4 bg-brand-green/10 dark:bg-slate-800/60 rounded-xl space-y-2 border border-brand-green-dark/20">
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                生成于 {new Date(report.generatedAt).toLocaleString('zh-CN')}
              </p>
              <div className="space-y-1">
                {report.content.split('\n').map((line, i) => {
                  const header = line.match(/^\*\*(.+)\*\*$/)
                  if (header) {
                    return (
                      <p key={i} className="font-black text-brand-green-deep dark:text-brand-green-dark text-sm mt-4 first:mt-0">
                        {header[1]}
                      </p>
                    )
                  }
                  if (line.trim() === '') return <div key={i} className="h-1" />
                  return <p key={i} className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{line}</p>
                })}
              </div>
            </div>
          )}
        </div>

        {/* Finished trophy */}
        {isFinished && sprint.microGoals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-brand-green/50 p-6 rounded-2xl border border-brand-green-dark/20 text-center space-y-3"
          >
            <div className="flex justify-center text-brand-green-dark">
              <Trophy size={40} />
            </div>
            <h3 className="text-lg font-bold text-brand-green-dark">阶段完成！</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">你已成功完成本周期。花点时间反思你的成长。</p>
          </motion.div>
        )}

        {/* Monthly calendar */}
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between ml-1">
            <label className="text-sm md:text-base font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {info.monthName} 日记
            </label>
            <span className="text-xs md:text-sm text-slate-400 dark:text-slate-500">点击日期进入</span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="grid grid-cols-7 gap-1 md:gap-2 text-center mb-2">
              {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                <div key={d} className="text-xs font-bold text-slate-400 dark:text-slate-500 py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 md:gap-2 text-center">
              {calendarDays.map((day, idx) => {
                if (day === null) return <div key={`e-${idx}`} className="p-2" />
                const dateStr = `${info.year}-${String(info.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const hasLog = logs.some(l => l.date === dateStr)
                const isSprintDay = day >= info.startDay && day <= info.endDay
                const isToday = today.getFullYear() === info.year && today.getMonth() === info.month && today.getDate() === day

                return (
                  <button
                    key={day}
                    onClick={() => onOpenDay(sprintId, dateStr)}
                    className={`relative p-2 md:py-3 rounded-lg text-sm md:text-base font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                      isToday
                        ? 'bg-brand-green-deep text-white shadow-md hover:bg-brand-green-dark'
                        : isSprintDay
                        ? 'bg-brand-green/20 text-brand-green-dark hover:bg-brand-green/40'
                        : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{day}</span>
                    {hasLog && (
                      <div className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-white' : 'bg-brand-green-dark'}`} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
