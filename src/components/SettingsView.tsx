import { useState, useRef, useEffect } from 'react'
import { motion } from 'motion/react'
import { ChevronLeft, Download, Upload, AlertTriangle, Crown, Cloud, CloudOff, RefreshCw } from 'lucide-react'
import { exportAllData, importAllData } from '../lib/db'
import { syncToGoogleDrive, restoreFromGoogleDrive, getLastSyncTime, isGoogleLoaded } from '../lib/googleDrive'
import type { UserProfile } from '../types'

interface Props {
  profile: UserProfile
  onBack: () => void
}

export default function SettingsView({ profile, onBack }: Props) {
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [lastSync, setLastSync] = useState<string | null>(getLastSyncTime())
  const [googleReady, setGoogleReady] = useState(isGoogleLoaded())
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (googleReady) return
    const timer = setInterval(() => {
      if (isGoogleLoaded()) { setGoogleReady(true); clearInterval(timer) }
    }, 500)
    return () => clearInterval(timer)
  }, [googleReady])

  function showMsg(type: 'success' | 'error', text: string) {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  async function handleGdriveSync() {
    setSyncing(true)
    try {
      const json = await exportAllData()
      await syncToGoogleDrive(json)
      setLastSync(getLastSyncTime())
      showMsg('success', '已成功同步到 Google Drive ✓')
    } catch (e) {
      showMsg('error', '同步失败，请重试')
    }
    setSyncing(false)
  }

  async function handleGdriveRestore() {
    setRestoring(true)
    try {
      const json = await restoreFromGoogleDrive()
      if (!json) { showMsg('error', 'Google Drive 上没有找到备份'); setRestoring(false); return }
      await importAllData(json)
      showMsg('success', '云端数据恢复成功，请刷新页面')
    } catch {
      showMsg('error', '恢复失败，请重试')
    }
    setRestoring(false)
  }

  async function handleExport() {
    setExporting(true)
    try {
      const json = await exportAllData()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `36x10-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      showMsg('success', '备份文件已下载到你的设备')
    } catch {
      showMsg('error', '导出失败，请重试')
    }
    setExporting(false)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      await importAllData(text)
      showMsg('success', '数据恢复成功，请刷新页面')
    } catch {
      showMsg('error', '文件格式错误，请使用正确的备份文件')
    }
    setImporting(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <nav className="flex items-center">
        <button
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-full transition-colors flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium"
        >
          <ChevronLeft size={20} />
          <span>返回主页</span>
        </button>
      </nav>

      <div>
        <h2 className="text-2xl font-black text-brand-green-deep dark:text-brand-green-dark tracking-tight">设置</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">你好，{profile.name}</p>
      </div>

      {/* Storage notice */}
      <div className="glass-card p-5 bg-gradient-to-br from-white to-brand-green/30 dark:from-slate-800 dark:to-slate-900/50 space-y-3">
        <h3 className="font-black text-sm text-slate-700 dark:text-slate-200">数据存储</h3>
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 p-4 text-sm">
          <AlertTriangle size={18} className="shrink-0 text-amber-500 mt-0.5" />
          <p className="text-amber-700 dark:text-amber-400">
            你的数据保存在本设备的浏览器数据库（IndexedDB）。
            清除「网站数据」可能导致数据丢失，建议定期导出备份。
          </p>
        </div>
      </div>

      {/* Google Drive Sync */}
      <div className="glass-card p-5 bg-gradient-to-br from-white to-brand-green/30 space-y-4">
        <div className="flex items-center gap-2">
          <Cloud size={16} className="text-brand-green-dark" />
          <h3 className="font-black text-sm text-slate-700">Google Drive 自动备份</h3>
        </div>

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </motion.div>
        )}

        {lastSync && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              上次同步：{new Date(lastSync).toLocaleString('zh-CN')}
            </p>
            <p className="text-xs text-brand-green-dark font-medium">每 15 分钟自动同步 ✓</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleGdriveSync}
            disabled={!googleReady || syncing}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-green-deep text-white rounded-xl text-sm font-bold hover:bg-brand-green-dark transition-colors disabled:opacity-40"
          >
            {syncing
              ? <><RefreshCw size={14} className="animate-spin" /> 同步中…</>
              : <><Cloud size={14} /> {lastSync ? '立即同步' : '连接并同步'}</>
            }
          </button>
          <button
            onClick={handleGdriveRestore}
            disabled={!googleReady || restoring}
            className="flex-1 flex items-center justify-center gap-2 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors disabled:opacity-40"
          >
            {restoring
              ? <><RefreshCw size={14} className="animate-spin" /> 恢复中…</>
              : <><CloudOff size={14} /> 从云端恢复</>
            }
          </button>
        </div>
        {!googleReady && (
          <p className="text-xs text-slate-300 text-center">Google 服务加载中…</p>
        )}
      </div>

      {/* Backup & Restore */}
      <div className="glass-card p-5 bg-gradient-to-br from-white to-brand-green/30 dark:from-slate-800 dark:to-slate-900/50 space-y-4">
        <h3 className="font-black text-sm text-slate-700 dark:text-slate-200">备份与恢复</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4">
            <div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">导出备份</p>
              <p className="text-xs text-slate-400 mt-0.5">将所有数据下载为 JSON 文件</p>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-brand-green-deep text-white rounded-xl text-sm font-bold hover:bg-brand-green-dark transition-colors disabled:opacity-50"
            >
              <Download size={14} />
              {exporting ? '导出中…' : '导出'}
            </button>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4">
            <div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">恢复数据</p>
              <p className="text-xs text-slate-400 mt-0.5">从备份 JSON 文件中恢复</p>
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <Upload size={14} />
              {importing ? '恢复中…' : '恢复'}
            </button>
            <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          </div>
        </div>
      </div>

      {/* Pro upgrade */}
      <div className="glass-card p-6 space-y-4 bg-gradient-to-br from-white to-brand-green/20 dark:from-slate-800 dark:to-slate-900/50 border-2 border-brand-green/30 dark:border-brand-green/20">
        <div className="flex items-center gap-2">
          <Crown size={20} className="text-brand-yellow-dark" />
          <h3 className="font-black text-sm text-brand-green-deep dark:text-brand-green-dark">升级到付费版</h3>
        </div>
        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <p>✦ 账号登录，数据跨设备无缝同步</p>
          <p>✦ 每周 AI 成长分析报告</p>
          <p>✦ AI 根据日记分析成长轨迹与建议</p>
          <p>✦ 解锁全部历史数据回顾</p>
        </div>
        <button className="w-full py-4 bg-brand-green-deep text-white rounded-2xl font-black text-lg shadow-lg shadow-brand-green/20 hover:bg-brand-green-dark hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
          <Crown size={18} />
          即将开放，敬请期待
        </button>
      </div>

      <div className="text-center text-xs text-slate-300 dark:text-slate-600 pb-6">
        36×10 微计划 v0.1.0 · 把一年折叠成36个微计划
      </div>
    </motion.div>
  )
}
