import { useState } from 'react'
import { motion } from 'motion/react'
import { Sprout, ArrowRight } from 'lucide-react'

interface Props {
  onComplete: (name: string) => void
}

export default function Onboarding({ onComplete }: Props) {
  const [name, setName] = useState('')

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-brand-beige dark:bg-slate-950">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-12 shadow-2xl w-full max-w-lg text-center space-y-8 relative overflow-hidden"
      >
        {/* Top gradient strip */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-green via-brand-yellow to-brand-green-dark" />

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
              <div className="space-y-1">
                <p className="font-bold text-slate-800 dark:text-slate-200">{item.title}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 text-left">
          <label className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">你叫什么名字？</label>
          <input
            className="input"
            placeholder="输入你的名字或昵称"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && onComplete(name.trim())}
            autoFocus
          />
        </div>

        <button
          onClick={() => name.trim() && onComplete(name.trim())}
          disabled={!name.trim()}
          className="w-full py-4 bg-brand-green-deep text-white rounded-2xl font-black text-lg shadow-lg shadow-brand-green/20 hover:bg-brand-green-dark hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
        >
          开启我的成长之旅 <ArrowRight size={20} />
        </button>

        <p className="text-xs text-slate-300 dark:text-slate-600">
          所有数据默认保存在本设备，不会上传到任何服务器。
        </p>
      </motion.div>
    </div>
  )
}
