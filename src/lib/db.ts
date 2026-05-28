import { openDB, type IDBPDatabase } from 'idb'
import type { Sprint, DailyLog, UserProfile, AIReport } from '../types'

const DB_NAME = '36x10-db'
const DB_VERSION = 1

type Schema = {
  sprints: Sprint
  daylogs: DailyLog
  profile: UserProfile
  reports: AIReport
}

let db: IDBPDatabase<Schema> | null = null

async function getDB() {
  if (db) return db
  db = await openDB<Schema>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      database.createObjectStore('sprints', { keyPath: 'id' })
      database.createObjectStore('daylogs', { keyPath: 'id' })
      database.createObjectStore('profile', { keyPath: 'id' })
      database.createObjectStore('reports', { keyPath: 'id' })
    },
  })
  return db
}

// Sprints
export async function getSprints(): Promise<Sprint[]> {
  const database = await getDB()
  const all = await database.getAll('sprints')
  return all.sort((a, b) => a.index - b.index)
}

export async function saveSprint(sprint: Sprint): Promise<void> {
  const database = await getDB()
  await database.put('sprints', sprint)
}

export async function getSprint(id: string): Promise<Sprint | undefined> {
  const database = await getDB()
  return database.get('sprints', id)
}

// Day Logs (keyed by sprintId + date)
export async function getDayLog(sprintId: string, date: string): Promise<DailyLog | undefined> {
  const database = await getDB()
  return database.get('daylogs', `${sprintId}:${date}`)
}

export async function getDayLogsBySprintId(sprintId: string): Promise<DailyLog[]> {
  const database = await getDB()
  const all = await database.getAll('daylogs')
  return all.filter(l => l.sprintId === sprintId)
}

export async function saveDayLog(log: DailyLog): Promise<void> {
  const database = await getDB()
  await database.put('daylogs', log)
}

export async function getAllDayLogs(): Promise<DailyLog[]> {
  const database = await getDB()
  return database.getAll('daylogs')
}

// Profile
export async function getProfile(): Promise<UserProfile | undefined> {
  const database = await getDB()
  const all = await database.getAll('profile')
  return all[0]
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  const database = await getDB()
  await database.put('profile', profile)
}

// Reports
export async function getReports(): Promise<AIReport[]> {
  const database = await getDB()
  const all = await database.getAll('reports')
  return all.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
}

export async function getReportBySprintId(sprintId: string): Promise<AIReport | undefined> {
  const database = await getDB()
  const all = await database.getAll('reports')
  return all.find(r => r.sprintId === sprintId)
}

export async function saveReport(report: AIReport): Promise<void> {
  const database = await getDB()
  await database.put('reports', report)
}

// Export / Import
export async function exportAllData(): Promise<string> {
  const database = await getDB()
  const [sprints, daylogs, profile, reports] = await Promise.all([
    database.getAll('sprints'),
    database.getAll('daylogs'),
    database.getAll('profile'),
    database.getAll('reports'),
  ])
  return JSON.stringify({ sprints, daylogs, profile, reports, exportedAt: new Date().toISOString() }, null, 2)
}

export async function importAllData(json: string): Promise<void> {
  const data = JSON.parse(json)
  const database = await getDB()
  const tx = database.transaction(['sprints', 'daylogs', 'profile', 'reports'], 'readwrite')
  await Promise.all([
    ...data.sprints.map((s: Sprint) => tx.objectStore('sprints').put(s)),
    ...data.daylogs.map((d: DailyLog) => tx.objectStore('daylogs').put(d)),
    ...data.profile.map((p: UserProfile) => tx.objectStore('profile').put(p)),
    ...data.reports.map((r: AIReport) => tx.objectStore('reports').put(r)),
    tx.done,
  ])
}
