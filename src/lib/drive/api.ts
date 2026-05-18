import { getToken } from './auth'
import { FILE_NAME } from './types'

const API = 'https://www.googleapis.com/drive/v3'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3'

function authHeaders(): HeadersInit {
  const t = getToken()
  if (!t) throw new Error('Sem token. Conecte-se ao Drive.')
  return { Authorization: `Bearer ${t}` }
}

async function check(res: Response): Promise<Response> {
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Drive API ${res.status}: ${body.slice(0, 200)}`)
  }
  return res
}

export interface DriveFile {
  id: string
  name: string
  modifiedTime: string
}

export async function findOrCreate(): Promise<DriveFile> {
  const q = `name='${FILE_NAME}' and trashed=false`
  const list = await check(
    await fetch(`${API}/files?q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime)&pageSize=1`, {
      headers: authHeaders(),
    }),
  )
  const { files } = (await list.json()) as { files: DriveFile[] }
  if (files?.length) return files[0]

  const created = await check(
    await fetch(`${API}/files?fields=id,name,modifiedTime`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: FILE_NAME, mimeType: 'application/json' }),
    }),
  )
  return (await created.json()) as DriveFile
}

export async function metadata(fileId: string): Promise<DriveFile> {
  const res = await check(
    await fetch(`${API}/files/${fileId}?fields=id,name,modifiedTime`, { headers: authHeaders() }),
  )
  return (await res.json()) as DriveFile
}

export async function download(fileId: string): Promise<string> {
  const res = await check(await fetch(`${API}/files/${fileId}?alt=media`, { headers: authHeaders() }))
  return await res.text()
}

export async function upload(fileId: string, content: string): Promise<DriveFile> {
  const res = await check(
    await fetch(`${UPLOAD}/files/${fileId}?uploadType=media&fields=id,name,modifiedTime`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: content,
    }),
  )
  return (await res.json()) as DriveFile
}
