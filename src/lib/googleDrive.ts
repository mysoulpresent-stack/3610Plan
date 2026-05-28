const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
const BACKUP_FILE = '3610plan_backup.json'
const LAST_SYNC_KEY = 'gdrive_last_sync'

let cachedToken: string | null = null
let tokenExpiry: number = 0

declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: { access_token?: string; error?: string }) => void
          }) => {
            requestAccessToken: () => void
            callback: (r: { access_token?: string; error?: string }) => void
          }
        }
      }
    }
  }
}

function getTokenClient() {
  return window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    callback: () => {},
  })
}

function requestToken(client: ReturnType<typeof getTokenClient>, silent = false): Promise<string> {
  return new Promise((resolve, reject) => {
    client.callback = (res) => {
      if (res.error) reject(new Error(res.error))
      else {
        cachedToken = res.access_token!
        tokenExpiry = Date.now() + 55 * 60 * 1000 // 55 minutes
        resolve(res.access_token!)
      }
    }
    client.requestAccessToken(silent ? { prompt: '' } : undefined)
  })
}

function getValidToken(): string | null {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken
  return null
}

async function findFileId(token: string): Promise<string | null> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${BACKUP_FILE}'&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const data = await res.json()
  return data.files?.[0]?.id ?? null
}

// Silent auto-sync — only runs if we already have a valid token (no popup)
export async function syncIfAuthorized(jsonData: string): Promise<boolean> {
  const token = getValidToken()
  if (!token || !getLastSyncTime()) return false
  try {
    const fileId = await findFileId(token)
    if (fileId) {
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: jsonData,
      })
    } else {
      const metadata = { name: BACKUP_FILE, parents: ['appDataFolder'] }
      const form = new FormData()
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
      form.append('file', new Blob([jsonData], { type: 'application/json' }))
      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
    }
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString())
    return true
  } catch {
    return false
  }
}

export async function syncToGoogleDrive(jsonData: string): Promise<void> {
  const client = getTokenClient()
  const token = await requestToken(client)
  const fileId = await findFileId(token)

  if (fileId) {
    await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: jsonData,
    })
  } else {
    const metadata = { name: BACKUP_FILE, parents: ['appDataFolder'] }
    const form = new FormData()
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    form.append('file', new Blob([jsonData], { type: 'application/json' }))
    await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
  }

  localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString())
}

export async function restoreFromGoogleDrive(): Promise<string | null> {
  const client = getTokenClient()
  const token = await requestToken(client)
  const fileId = await findFileId(token)
  if (!fileId) return null

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return await res.text()
}

export function getLastSyncTime(): string | null {
  return localStorage.getItem(LAST_SYNC_KEY)
}

export function isGoogleLoaded(): boolean {
  return typeof window.google !== 'undefined' && !!window.google?.accounts?.oauth2
}
