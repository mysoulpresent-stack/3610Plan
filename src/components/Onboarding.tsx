import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Sprout, ArrowRight, Cloud, ChevronLeft } from 'lucide-react'
import { isGoogleLoaded } from '../lib/googleDrive'

interface Props {
  onComplete: (name: string, connectDrive: boolean) => void
}

export default function Onboarding({ onComplete }: Props) {
  const [name, setName] = useState('')
  const [step, setStep] = useState<'name' | 'drive'>('name')
  const [googleReady, setGoogleReady] = useState(isGoogleLoaded())

  useEffect(() => {
    if (googleReady) return
    const timer = setInterval(() => {
      if (isGoogleLoaded()) { setGoogleReady(true); clearInterval(timer) }
    }, 500)
    return () => clearInterval(timer)
  }, [googleReady])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-brand-beige dark:bg-slate-950">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-12 shadow-2xl w-full max-w-lg text-center space-y-8 relative overflow-hidden"
      >
        {/* Top gradient strip */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-green via-brand-yellow to-brand-green-dark" />

        <AnimatePresence mode="wait">
          {step === 'name' && (
            <motion.div
              key="name"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <div className="w-20 h-20 bg-brand-green/40 rounded-3xl flex items-center justify-center mx-auto text-brand-green-deep rotate-3">
                  <Sprout size={48} />
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-brand-green-deep tracking-tight">
                  欢迎开启<br />你的成长之旅
                </h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-xs mx-auto">
                  原来，1年并非漫长的 365 天，<br />而是 36 个触手可及的「10天」！
                </p>
              </div>

              <div className="space-y-6 text-left">
                {[
                  { n: '1', title: '36个微周期', desc: '专注 36 次更新迭代的机会，让成长在 10 天的节奏中自然发生。' },
                  { n: '2', title: '身份导向', desc: '通过「我是一个……的人」建立身份认同，让微小的行动塑造真实的自己。' },
                  { n: '3', title: '每日觉察', desc: '记录每一天的成就与反思。数据保存在本设备，随时可导出备份。' },
                ].map(item => (
                  <div key={item.n} className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0 text-brand-green-dark font-bold shadow-sm">
                      {item.n}
                    </div>
                    <div className="space-y-1 text-left">
                      <p className="font-bold text-slate-800 dark:text-slate-200">{item.title}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 text-left">
                <label className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">怎么称呼你？</label>
                <input
                  className="input"
                  placeholder="输入你的名字或昵称"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && name.trim() && setStep('drive')}
                  autoFocus
                />
              </div>

              <button
                onClick={() => name.trim() && setStep('drive')}
                disabled={!name.trim()}
                className="w-full py-4 bg-brand-green-deep text-white rounded-2xl font-black text-lg shadow-lg shadow-brand-green/20 hover:bg-brand-green-dark hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
              >
                开启我的成长之旅 <ArrowRight size={20} />
              </button>

              <p className="text-xs text-slate-300 dark:text-slate-600">
                所有数据默认保存在本设备，不会上传到任何服务器。
              </p>
            </motion.div>
          )}

          {step === 'drive' && (
            <motion.div
              key="drive"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto text-blue-500">
                  <Cloud size={40} />
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-brand-green-deep tracking-tight">
                  保护你的数据
                </h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-xs mx-auto">
                  连接 Google Drive，数据自动备份到云端，换设备也不怕丢失。
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5 text-left space-y-3">
                {[
                  '每 15 分钟自动静默同步，无需手动操作',
                  '数据仅存在你自己的 Google Drive，私密安全',
                  '可随时在设置里断开连接',
                ].map((t, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-brand-green-dark font-bold mt-0.5">✓</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => onComplete(name.trim(), true)}
                  disabled={!googleReady}
                  className="w-full py-4 bg-brand-green-deep text-white rounded-2xl font-black text-lg shadow-lg shadow-brand-green/20 hover:bg-brand-green-dark hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Cloud size={20} /> 连接 Google Drive
                </button>
                <button
                  onClick={() => onComplete(name.trim(), false)}
                  className="w-full py-3 text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors"
                >
                  暂时跳过，稍后在设置里连接
                </button>
              </div>

              <button
                onClick={() => setStep('name')}
                className="flex items-center gap-1 text-xs text-slate-300 hover:text-slate-500 transition-colors mx-auto"
              >
                <ChevronLeft size={14} /> 返回修改名字
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
