import { SCOPE } from './types'

let token: string | null = null
let tokenExpiresAt = 0

export function getToken(): string | null {
  if (!token) return null
  if (Date.now() > tokenExpiresAt - 30_000) return null  // 30s safety
  return token
}

export function clearToken() {
  token = null
  tokenExpiresAt = 0
}

async function waitForGsi(timeoutMs = 5000): Promise<void> {
  if (window.google?.accounts?.oauth2) return
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const i = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(i)
        resolve()
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(i)
        reject(new Error('Google Identity Services não carregou (verifique conexão / bloqueador)'))
      }
    }, 100)
  })
}

export async function requestToken(clientId: string, opts: { silent?: boolean } = {}): Promise<string> {
  await waitForGsi()
  return new Promise<string>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error) {
          reject(new Error(resp.error_description ?? resp.error))
          return
        }
        if (!resp.access_token) {
          reject(new Error('sem access_token na resposta'))
          return
        }
        token = resp.access_token
        tokenExpiresAt = Date.now() + 60 * 60 * 1000  // tokens last ~1h
        resolve(token)
      },
      error_callback: (err) => reject(new Error(err.message ?? err.type)),
    })
    client.requestAccessToken({ prompt: opts.silent ? 'none' : '' })
  })
}

export async function revoke(): Promise<void> {
  if (!token) return
  await waitForGsi()
  await new Promise<void>((resolve) => window.google!.accounts.oauth2.revoke(token!, resolve))
  clearToken()
}
