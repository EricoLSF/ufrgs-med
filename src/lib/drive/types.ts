export const FILE_NAME = 'ufrgs-med.json'
export const SCOPE = 'https://www.googleapis.com/auth/drive.file'

// Pre-filled Client ID (OAuth Web client; safe to ship in browser code).
// Replace if you create your own.
export const DEFAULT_CLIENT_ID = '587740387377-2bb8vdiocdvhlkof35vr6j2j27sukkg0.apps.googleusercontent.com'

export interface DriveSettings {
  clientId: string | null
  fileId: string | null
  lastSyncAt: string | null     // ISO; mirrors remote modifiedTime after last successful pull/push
  remoteModifiedTime: string | null
}

export interface SyncStatus {
  state: 'idle' | 'connecting' | 'syncing' | 'error' | 'disabled'
  message?: string
  lastSyncAt?: string | null
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (resp: { access_token?: string; error?: string; error_description?: string }) => void
            error_callback?: (err: { type: string; message?: string }) => void
          }) => { requestAccessToken: (overrides?: { prompt?: string }) => void }
          revoke: (token: string, done: () => void) => void
        }
      }
    }
  }
}
