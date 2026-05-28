import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'motion/react'
import { ChevronLeft, CheckCircle2, Circle, Plus, X } from 'lucide-react'
import { getDayLog, saveDayLog, getSprint } from '../lib/db'
import { getSprintInfo } from '../lib/sprints'
import type { DailyLog, Sprint } from '../types'

interface Props {
  sprintId: string
  date: string // YYYY-MM-DD
  onBack: () => void
}

const MOODS = [
  { emoji: '🥳', label: '兴奋' },
  { emoji: '😄', label: '开心' },
  { emoji: '😊', label: '满足' },
  { emoji: '😌', label: '平静' },
  { emoji: '⚖️', label: '有得有失' },
  { emoji: '🤔', label: '思考/困惑' },
  { emoji: '😫', label: '疲惫' },
  { emoji: '😰', label: '焦虑' },
  { emoji: '😔', label: '难过' },
  { emoji: '😠', label: '生气' },
]

function AutoTextarea({
  value, onChange, placeholder, className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = `${ref.current.scrollHeight}px`
    }
  }, [value])
  return (
    <textarea
      ref={ref}
      className={className}
      placeholder={placeholder}
      value={value}
      rows={1}
      onChange={e => onChange(e.target.value)}
      style={{ overflow: 'hidden' }}
    />
  )
}

function emptyLog(sprintId: string, date: string): DailyLog {
  return {
    id: `${sprintId}:${date}`,
    sprintId,
    date,
    encouragement: '',
    tasks: [''],
    taskStatus: [false],
    achievements: [''],
    gratitude: [''],
    reflection: [''],
    mood: '',
  }
}

export default function DayLogView({ sprintId, date, onBack }: Props) {
  const [sprint, setSprint] = useState<Sprint | null>(null)
  const [log, setLog] = useState<DailyLog | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    loadData()
  }, [sprintId, date])

  async function loadData() {
    const [s, existing] = await Promise.all([getSprint(sprintId), getDayLog(sprintId, date)])
    setSprint(s ?? null)
    setLog(existing ?? emptyLog(sprintId, date))
  }

  const autoSave = useCallback((updated: DailyLog) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => saveDayLog(updated), 600)
  }, [])

  function patch(updates: Partial<DailyLog>) {
    setLog(prev => {
      if (!prev) return prev
      const updated = { ...prev, ...updates }
      autoSave(updated)
      return updated
    })
  }

  function updateField<K extends keyof DailyLog>(key: K, value: DailyLog[K]) {
    patch({ [key]: value } as Partial<DailyLog>)
  }

  function updateArray(key: 'tasks' | 'achievements' | 'gratitude' | 'reflection', i: number, value: string) {
    if (!log) return
    const arr = [...(log[key] as string[])]
    arr[i] = value
    updateField(key, arr as DailyLog[typeof key])
  }

  function addArrayItem(key: 'tasks' | 'achievements' | 'gratitude' | 'reflection') {
    if (!log) return
    const arr = [...(log[key] as string[]), '']
    updateField(key, arr as DailyLog[typeof key])
    if (key === 'tasks') {
      const status = [...log.taskStatus, false]
      updateField('taskStatus', status)
    }
  }

  function removeArrayItem(key: 'tasks' | 'achievements' | 'gratitude' | 'reflection', i: number) {
    if (!log) return
    const arr = (log[key] as string[]).filter((_, idx) => idx !== i)
    updateField(key, (arr.length ? arr : ['']) as DailyLog[typeof key])
    if (key === 'tasks') {
      const status = log.taskStatus.filter((_, idx) => idx !== i)
      updateField('taskStatus', status.length ? status : [false])
    }
  }

  function toggleTask(i: number) {
    if (!log) return
    const status = [...log.taskStatus]
    status[i] = !status[i]
    updateField('taskStatus', status)
  }

  async function handleSaveAndBack() {
    if (log) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      await saveDayLog(log)
    }
    onBack()
  }

  if (!sprint || !log) return <div className="py-20 text-center text-slate-400">加载中…</div>

  const info = getSprintInfo(sprint)
  const displayDate = `${date.split('-')[1]}/${date.split('-')[2]}`

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 pb-20"
    >
      {/* Nav */}
      <nav className="flex items-center justify-between">
        <button
          onClick={handleSaveAndBack}
          className="p-2 -ml-2 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-full transition-colors flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium"
        >
          <ChevronLeft size={20} />
          <span>返回微计划打卡</span>
        </button>
        <div className="px-3 py-1 bg-brand-green-deep text-white rounded-full text-xs md:text-sm font-black tracking-widest uppercase">
          {info.monthName}{info.period} • {displayDate}
        </div>
      </nav>

      <div className="glass-card p-6 space-y-8 bg-gradient-to-br from-white to-brand-green/30 dark:from-slate-800 dark:to-slate-900/50">
        <div className="text-center py-2">
          <p className="text-lg md:text-xl font-black text-brand-green-deep dark:text-brand-green-dark tracking-tight">
            {date.split('-')[0]}年{parseInt(date.split('-')[1])}月{parseInt(date.split('-')[2])}日 • 我的日记
          </p>
        </div>

        {/* Encouragement */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
          <div className="flex items-center gap-2 ml-1">
            <span className="text-lg">💖</span>
            <label className="text-sm md:text-base font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">鼓励自己的话</label>
          </div>
          <AutoTextarea
            value={log.encouragement}
            onChange={v => updateField('encouragement', v)}
            placeholder="写下一句给自己的话…"
            className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm focus:ring-2 focus:ring-brand-green-light focus:border-brand-green-dark outline-none text-sm md:text-base font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-500 resize-none overflow-hidden"
          />
        </motion.div>

        {/* 2-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tasks */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-3">
            <div className="flex items-center gap-2 ml-1">
              <span className="text-lg">🎯</span>
              <label className="text-sm md:text-base font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">今日核心任务</label>
            </div>
            <div className="space-y-2">
              {log.tasks.map((task, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    onClick={() => toggleTask(i)}
                    className={`transition-colors shrink-0 ${log.taskStatus[i] ? 'text-brand-green-dark' : 'text-slate-200 dark:text-slate-600 hover:text-slate-300'}`}
                  >
                    {log.taskStatus[i] ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                  </button>
                  <AutoTextarea
                    value={task}
                    onChange={v => updateArray('tasks', i, v)}
                    placeholder={`任务 ${i + 1}…`}
                    className={`flex-1 bg-white dark:bg-slate-800 border border-slate-50 dark:border-slate-700 p-2 rounded-lg text-sm md:text-base font-medium focus:border-brand-green-dark outline-none transition-all resize-none overflow-hidden ${log.taskStatus[i] ? 'text-slate-300 dark:text-slate-500 line-through' : 'text-slate-600 dark:text-slate-300'}`}
                  />
                  <button onClick={() => removeArrayItem('tasks', i)} className="text-slate-300 dark:text-slate-500 hover:text-red-400 transition-colors p-1 shrink-0">
                    <X size={16} />
                  </button>
                </div>
              ))}
              <button onClick={() => addArrayItem('tasks')} className="flex items-center gap-1 text-sm font-bold text-brand-green-dark hover:text-brand-green-deep transition-colors mt-2 ml-7">
                <Plus size={16} /> 添加任务
              </button>
            </div>
          </motion.div>

          {/* Achievements */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-3">
            <div className="flex items-center gap-2 ml-1">
              <span className="text-lg">🏆</span>
              <label className="text-sm md:text-base font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">今日小成就</label>
            </div>
            <div className="space-y-2">
              {log.achievements.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm font-bold text-brand-green-deep dark:text-brand-green-dark w-4 shrink-0">{i + 1}。</span>
                  <AutoTextarea
                    value={item}
                    onChange={v => updateArray('achievements', i, v)}
                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-50 dark:border-slate-700 p-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 focus:border-brand-green-dark outline-none transition-colors resize-none overflow-hidden"
                  />
                  <button onClick={() => removeArrayItem('achievements', i)} className="text-slate-300 dark:text-slate-500 hover:text-red-400 transition-colors p-1 shrink-0">
                    <X size={16} />
                  </button>
                </div>
              ))}
              <button onClick={() => addArrayItem('achievements')} className="flex items-center gap-1 text-sm font-bold text-brand-green-dark hover:text-brand-green-deep transition-colors mt-2 ml-6">
                <Plus size={16} /> 添加成就
              </button>
            </div>
          </motion.div>

          {/* Gratitude */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-3">
            <div className="flex items-center gap-2 ml-1">
              <span className="text-lg">🌷</span>
              <label className="text-sm md:text-base font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">今日感恩</label>
            </div>
            <div className="space-y-2">
              {log.gratitude.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm font-bold text-brand-green-deep dark:text-brand-green-dark w-4 shrink-0">{i + 1}。</span>
                  <AutoTextarea
                    value={item}
                    onChange={v => updateArray('gratitude', i, v)}
                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-50 dark:border-slate-700 p-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 focus:border-brand-green-dark outline-none transition-colors resize-none overflow-hidden"
                  />
                  <button onClick={() => removeArrayItem('gratitude', i)} className="text-slate-300 dark:text-slate-500 hover:text-red-400 transition-colors p-1 shrink-0">
                    <X size={16} />
                  </button>
                </div>
              ))}
              <button onClick={() => addArrayItem('gratitude')} className="flex items-center gap-1 text-sm font-bold text-brand-green-dark hover:text-brand-green-deep transition-colors mt-2 ml-6">
                <Plus size={16} /> 添加感恩
              </button>
            </div>
          </motion.div>

          {/* Reflection */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="space-y-3">
            <div className="flex items-center gap-2 ml-1">
              <span className="text-lg">💡</span>
              <label className="text-sm md:text-base font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">今日反思</label>
            </div>
            <div className="space-y-2">
              {log.reflection.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm font-bold text-brand-green-deep dark:text-brand-green-dark w-4 shrink-0">{i + 1}。</span>
                  <AutoTextarea
                    value={item}
                    onChange={v => updateArray('reflection', i, v)}
                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-50 dark:border-slate-700 p-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 focus:border-brand-green-dark outline-none transition-colors resize-none overflow-hidden"
                  />
                  <button onClick={() => removeArrayItem('reflection', i)} className="text-slate-300 dark:text-slate-500 hover:text-red-400 transition-colors p-1 shrink-0">
                    <X size={16} />
                  </button>
                </div>
              ))}
              <button onClick={() => addArrayItem('reflection')} className="flex items-center gap-1 text-sm font-bold text-brand-green-dark hover:text-brand-green-deep transition-colors mt-2 ml-6">
                <Plus size={16} /> 添加反思
              </button>
            </div>
          </motion.div>
        </div>

        {/* Mood */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 ml-1">
            <label className="text-sm md:text-base font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">今日情绪</label>
            {log.mood && (
              <span className="text-sm md:text-base font-black text-brand-green-deep bg-brand-green/20 px-2 py-0.5 rounded-lg">
                {MOODS.find(m => m.emoji === log.mood)?.label}
              </span>
            )}
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {MOODS.map(m => (
              <button
                key={m.emoji}
                onClick={() => updateField('mood', m.emoji)}
                title={m.label}
                className={`aspect-square flex flex-col items-center justify-center rounded-xl transition-all ${
                  log.mood === m.emoji
                    ? 'bg-brand-green-dark text-white shadow-md scale-110'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <span className="text-xl">{m.emoji}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Save button */}
        <button
          onClick={handleSaveAndBack}
          className="w-full py-4 bg-brand-green-deep text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-green-dark transition-colors shadow-lg shadow-slate-200 dark:shadow-none"
        >
          <span>保存并返回</span>
          <CheckCircle2 size={18} />
        </button>
      </div>
    </motion.div>
  )
}
