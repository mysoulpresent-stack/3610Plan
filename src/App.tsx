import { useState, useEffect } from 'react'
import { Moon, Sun, Settings } from 'lucide-react'
import { getProfile, saveProfile, exportAllData } from './lib/db'
import { syncIfAuthorized, getLastSyncTime } from './lib/googleDrive'
import type { UserProfile } from './types'
import YearView from './components/YearView'
import SprintView from './components/SprintView'
import DayLogView from './components/DayLogView'
import SettingsView from './components/SettingsView'
import Onboarding from './components/Onboarding'

export type View =
  | { name: 'year' }
  | { name: 'sprint'; sprintId: string }
  | { name: 'daylog'; sprintId: string; date: string }
  | { name: 'settings' }

export default function App() {
  const [dark, setDark] = useState(false)
  const [view, setView] = useState<View>({ name: 'year' })
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getProfile().then(p => {
      if (p && !p.manifesto) p.manifesto = []
      setProfile(p ?? null)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!getLastSyncTime()) return
    const run = async () => {
      const json = await exportAllData()
      await syncIfAuthorized(json)
    }
    const interval = setInterval(run, 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  async function handleOnboardingComplete(name: string) {
    const newProfile: UserProfile = {
      id: 'local-user',
      name,
      tier: 'free',
      createdAt: new Date().toISOString(),
      manifesto: [],
    }
    await saveProfile(newProfile)
    setProfile(newProfile)
  }

  async function handleUpdateProfile(updates: Partial<UserProfile>) {
    if (!profile) return
    const updated = { ...profile, ...updates }
    await saveProfile(updated)
    setProfile(updated)
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-brand-beige dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-green-deep border-t-transparent" />
      </div>
    )
  }

  if (!profile) {
    return <Onboarding onComplete={handleOnboardingComplete} />
  }

  return (
    <>
    <div className={`fixed inset-0 -z-10 ${dark ? 'scene-galaxy' : 'scene-dawn'}`} />
    <div className="min-h-screen pb-24">
      <main className="mx-auto max-w-2xl px-4 py-6">
        {view.name === 'year' && (
          <YearView
            profile={profile}
            onSelectSprint={id => setView({ name: 'sprint', sprintId: id })}
            onUpdateManifesto={m => handleUpdateProfile({ manifesto: m })}
          />
        )}
        {view.name === 'sprint' && (
          <SprintView
            sprintId={view.sprintId}
            manifesto={profile.manifesto}
            onBack={() => setView({ name: 'year' })}
            onOpenDay={(sprintId, date) => setView({ name: 'daylog', sprintId, date })}
          />
        )}
        {view.name === 'daylog' && (
          <DayLogView
            sprintId={view.sprintId}
            date={view.date}
            onBack={() => setView({ name: 'sprint', sprintId: view.sprintId })}
          />
        )}
        {view.name === 'settings' && (
          <SettingsView profile={profile} onBack={() => setView({ name: 'year' })} />
        )}
      </main>

      {/* Floating action buttons — bottom right */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        <button
          onClick={() => setDark(d => !d)}
          className="p-3 bg-white/80 backdrop-blur-md border border-slate-100 rounded-full shadow-lg text-slate-400 hover:text-brand-green-dark transition-colors"
          title={dark ? '切换到晨曦模式' : '切换到夜晚模式'}
        >
          {dark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button
          onClick={() => setView({ name: 'settings' })}
          className="p-3 bg-white/80 backdrop-blur-md border border-slate-100 rounded-full shadow-lg text-slate-400 hover:text-brand-green-dark transition-colors"
          title="设置"
        >
          <Settings size={20} />
        </button>
      </div>
    </div>
    </>
  )
}
