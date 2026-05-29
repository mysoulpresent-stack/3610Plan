import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Trophy, TrendingUp, Info, Plus, X, Sparkles, Activity, BookOpen, Briefcase, Users, Heart } from 'lucide-react'
import { getSprints, saveSprint } from '../lib/db'
import {
  generateSprints, getCurrentSprintIndex, getSprintCompletion,
  MONTH_NAMES, MANIFESTO_LIBRARY,
} from '../lib/sprints'
import type { Sprint, UserProfile } from '../types'

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  '健康': <Activity size={14} />,
  '成长': <BookOpen size={14} />,
  '事业': <Briefcase size={14} />,
  '关系': <Users size={14} />,
  '内在': <Heart size={14} />,
}

const CATEGORY_COLORS: Record<string, string> = {
  '健康': 'text-red-500',
  '成长': 'text-blue-500',
  '事业': 'text-amber-500',
  '关系': 'text-pink-500',
  '内在': 'text-purple-500',
}

const MANIFESTO_CATEGORY: Record<string, string> = Object.fromEntries(
  Object.entries(MANIFESTO_LIBRARY).flatMap(([cat, items]) => items.map(item => [item, cat]))
)

interface Props {
  profile: UserProfile
  onSelectSprint: (id: string) => void
  onUpdateManifesto: (m: string[]) => void
}

export default function YearView({ profile, onSelectSprint, onUpdateManifesto }: Props) {
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [loading, setLoading] = useState(true)
  const [showLibrary, setShowLibrary] = useState(false)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')
  const year = new Date().getFullYear()

  useEffect(() => { loadSprints() }, [])

  async function loadSprints() {
    let data = await getSprints()
    // Regenerate if empty or old format (missing microGoals)
    if (data.length === 0 || !('microGoals' in data[0])) {
      const generated = generateSprints(year)
      await Promise.all(generated.map(saveSprint))
      data = generated
    }
    setSprints(data)
    setLoading(false)
  }

  function addManifesto(text: string) {
    const updated = [...profile.manifesto.filter(m => m.trim()), text]
    onUpdateManifesto(updated)
    setShowLibrary(false)
  }

  function saveEdit(i: number) {
    const trimmed = editingText.trim()
    if (trimmed) {
      const updated = profile.manifesto.map((m, idx) => idx === i ? trimmed : m)
      onUpdateManifesto(updated)
    }
    setEditingIdx(null)
  }

  function removeManifesto(i: number) {
    const updated = profile.manifesto.filter((_, idx) => idx !== i)
    onUpdateManifesto(updated)
  }

  if (loading) return <div className="py-20 text-center text-slate-400">加载中…</div>

  const currentIdx = getCurrentSprintIndex(sprints)
  const currentSprintNum = currentIdx >= 0 ? sprints[currentIdx].index : 0

  // Stats
  const totalCheckins = sprints.reduce(
    (sum, s) => sum + (s.microGoals ?? []).reduce((gs, g) => gs + (g.days ?? []).filter(Boolean).length, 0),
    0,
  )
  const totalGoalsAchieved = sprints.reduce((sum, s) => sum + (s.microGoals ?? []).length, 0)
  // Simple streak: consecutive days with at least one check-in
  let currentStreak = 0
  const today = new Date()
  for (let i = 0; i < 30; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const sprint = sprints.find(s => s.startDate <= dateStr && s.endDate >= dateStr)
    if (sprint && sprint.microGoals.some(g => {
      const dayOffset = Math.round((d.getTime() - new Date(sprint.startDate).getTime()) / 86400000)
      return g.days[dayOffset]
    })) {
      currentStreak++
    } else if (i > 0) break
  }

  const motivationMsg = currentStreak > 7
    ? `连续 ${currentStreak} 天！你的坚持令人敬佩。`
    : currentStreak > 3
    ? `${currentStreak} 天连胜！保持节奏。`
    : totalCheckins > 0
    ? '每一次打卡都是对自己的承诺。'
    : '开始你的第一次打卡吧！'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* Year header */}
      <header className="glass-card p-6 bg-gradient-to-br from-white to-brand-green/30 dark:from-slate-800 dark:to-slate-900/50">
        <div className="space-y-1">
          <p className="text-sm font-bold text-brand-green-dark tracking-wide">你好，{profile.name} 👋</p>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-brand-green-deep dark:text-brand-green-dark leading-none">
            {year}
          </h1>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-200 leading-tight">
            36X10。1年36周期。个人成长微计划 & 日记
          </h2>
        </div>
      </header>

      {/* Manifesto */}
      <div className="glass-card p-6 bg-gradient-to-br from-white to-brand-green/30 dark:from-slate-800 dark:to-slate-900/50 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-brand-green-deep dark:text-brand-green-dark">
            <h3 className="text-lg font-black tracking-tight">{year} 年度个人宣言</h3>
            <button
              onClick={() => setShowLibrary(v => !v)}
              className="p-1 text-brand-green-deep/60 hover:text-brand-green-deep dark:hover:text-white transition-colors"
            >
              <Info size={16} />
            </button>
          </div>
          {profile.manifesto.filter(m => m.trim()).length >= 5 ? (
            <span className="text-xs text-slate-300 font-medium">已达上限 5/5</span>
          ) : (
            <button
              onClick={() => setShowLibrary(v => !v)}
              className="flex items-center gap-1 text-sm font-bold text-brand-green-dark hover:text-brand-green-deep transition-colors"
            >
              <Plus size={14} /> 添加宣言
            </button>
          )}
        </div>

        {profile.manifesto.filter(m => m.trim()).length === 0 && (
          <p className="text-sm text-slate-400 dark:text-slate-500 italic">还没有宣言。点击「添加宣言」开始…</p>
        )}

        <div className="space-y-2">
          {profile.manifesto.map((m, i) =>
            m.trim() ? (
              <div key={i} className="flex items-center gap-3">
                <span className={`shrink-0 ${CATEGORY_COLORS[MANIFESTO_CATEGORY[m]] ?? 'text-brand-green-dark'}`}>
                  {CATEGORY_ICONS[MANIFESTO_CATEGORY[m]] ?? <Sparkles size={14} />}
                </span>
                {editingIdx === i ? (
                  <input
                    autoFocus
                    className="flex-1 text-sm font-medium text-slate-700 bg-transparent border-b border-brand-green-dark outline-none pb-0.5"
                    value={editingText}
                    onChange={e => setEditingText(e.target.value)}
                    onBlur={() => saveEdit(i)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveEdit(i)
                      if (e.key === 'Escape') setEditingIdx(null)
                    }}
                  />
                ) : (
                  <p
                    className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-text hover:text-brand-green-deep transition-colors"
                    onClick={() => { setEditingIdx(i); setEditingText(m) }}
                  >
                    {m}
                  </p>
                )}
                <button
                  onClick={() => removeManifesto(i)}
                  className="text-slate-300 hover:text-red-400 transition-colors shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            ) : null,
          )}
        </div>

        {/* Library dropdown */}
        <AnimatePresence>
          {showLibrary && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden"
            >
              {Object.entries(MANIFESTO_LIBRARY).map(([cat, items]) => (
                <div key={cat} className="p-3 border-b border-slate-50 dark:border-slate-800 last:border-0">
                  <div className={`flex items-center gap-1.5 mb-2 ${CATEGORY_COLORS[cat] ?? 'text-slate-400'}`}>
                    {CATEGORY_ICONS[cat]}
                    <p className="text-xs font-bold uppercase tracking-wider">{cat}</p>
                  </div>
                  <div className="space-y-1">
                    {items.map(item => {
                      const alreadyAdded = profile.manifesto.includes(item)
                      return (
                        <button
                          key={item}
                          onClick={() => !alreadyAdded && addManifesto(item)}
                          disabled={alreadyAdded}
                          className={`flex items-center justify-between w-full text-left text-sm px-2 py-1 rounded-lg transition-all ${
                            alreadyAdded
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-slate-600 dark:text-slate-300 hover:text-brand-green-deep dark:hover:text-brand-green-dark hover:bg-brand-green/20'
                          }`}
                        >
                          {item}
                          {alreadyAdded && <span className="text-brand-green-dark text-xs">✓</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
              <div className="p-3">
                <input
                  className="input text-sm"
                  placeholder="或者输入自定义宣言…"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      addManifesto(e.currentTarget.value.trim())
                      e.currentTarget.value = ''
                    }
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Motivation card — only show if there's activity */}
      {totalCheckins > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-6 bg-gradient-to-br from-white to-brand-green/30 space-y-4 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <TrendingUp size={120} />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-green rounded-xl flex items-center justify-center">
              <Trophy size={20} className="text-brand-green-deep" />
            </div>
            <div>
              <p className="text-xs font-bold text-brand-green-dark uppercase tracking-widest">成长动力</p>
              <p className="font-bold text-lg leading-tight text-slate-700">{motivationMsg}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-2 border-t border-brand-green">
            {[
              { label: '累计打卡', value: totalCheckins, unit: '天' },
              { label: '目标数量', value: totalGoalsAchieved, unit: '个' },
              { label: '当前连胜', value: currentStreak, unit: '天' },
            ].map(stat => (
              <div key={stat.label} className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-black text-brand-green-deep">
                  {stat.value}
                  <span className="text-xs ml-1 font-normal text-slate-400">{stat.unit}</span>
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 36-sprint grid grouped by month */}
      <div className="glass-card p-6 space-y-4 bg-gradient-to-br from-white to-brand-green/30 dark:from-slate-800 dark:to-slate-900/50">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-black text-brand-green-deep dark:text-brand-green-dark tracking-tight">
            你现在正处于{' '}
            <span className="text-brand-green-dark dark:text-brand-green text-xl">{currentSprintNum}</span>
            {' '}/ 36
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-x-3 gap-y-4">
          {Array.from({ length: 12 }, (_, mIdx) => {
            const monthSprints = [mIdx * 3 + 1, mIdx * 3 + 2, mIdx * 3 + 3]
            return (
              <div key={mIdx} className="space-y-0.5">
                <div className="flex justify-between items-center px-0.5">
                  <h3 className="text-xs md:text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight">
                    {MONTH_NAMES[mIdx]}
                  </h3>
                </div>
                <div className="flex gap-1">
                  {monthSprints.map(sprintNum => {
                    const sprint = sprints.find(s => s.index === sprintNum)
                    const isCurrent = sprintNum === currentSprintNum
                    const isPast = sprint ? new Date(sprint.endDate) < today && !isCurrent : false
                    const completion = sprint ? getSprintCompletion(sprint) : 0
                    const hasGoals = sprint && sprint.microGoals.length > 0

                    let bgColor = 'bg-slate-100 border-slate-100 text-slate-400'
                    if (isCurrent) {
                      bgColor = 'bg-amber-400 border-amber-300 text-white z-10 shadow-lg ring-2 ring-amber-400 ring-offset-1'
                    } else if (isPast) {
                      if (completion >= 0.8) bgColor = 'bg-green-700/70 border-green-700/50 text-white/90'
                      else if (completion >= 0.4) bgColor = 'bg-green-500/60 border-green-500/40 text-white/90'
                      else if (completion > 0) bgColor = 'bg-green-300/60 border-green-300/40 text-white/90'
                      else if (hasGoals) bgColor = 'bg-brand-green/70 border-brand-green-dark/20 text-brand-green-deep/70'
                      else bgColor = 'bg-slate-100/80 border-slate-100 text-slate-300'
                    } else if (hasGoals && completion === 0) {
                      bgColor = 'bg-brand-green border-brand-green-dark/30 text-brand-green-deep'
                    } else if (completion > 0) {
                      if (completion < 0.4) bgColor = 'bg-green-300 border-green-300 text-white'
                      else if (completion < 0.8) bgColor = 'bg-green-500 border-green-500 text-white'
                      else bgColor = 'bg-green-700 border-green-700 text-white'
                    }

                    return (
                      <motion.div
                        key={sprintNum}
                        whileHover={{ scale: 1.1, y: -1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => sprint && onSelectSprint(sprint.id)}
                        className={`flex-1 aspect-square flex flex-col items-center justify-center rounded-lg transition-all duration-300 cursor-pointer border text-sm md:text-base font-black leading-none ${bgColor}`}
                      >
                        {sprintNum}
                        {isPast && <span className="text-[8px] leading-none mt-0.5 opacity-75">💎</span>}
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Heat map legend */}
        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-200" /> 未开始
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-brand-green border border-green-300" /> 有目标
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-green-300" /> &lt;40%完成
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-green-500" /> 40–80%完成
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-green-700" /> &gt;80%完成
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-amber-400" /> 就是现在！
          </div>
          <div className="flex items-center gap-1.5">
            <span>💎</span> 精彩过去
          </div>
        </div>
      </div>
    </motion.div>
  )
}
