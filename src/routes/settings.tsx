import { useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Cloud, CloudOff, Download, RotateCw, Sparkles, Trash2, Upload, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUI, type Theme } from '@/stores/ui'
import { downloadJson, exportAll, importQuestions, resetDatabase, type ImportReport } from '@/lib/io'
import { connect, disconnect, loadDriveSettings, pull, push, useSync, watchChanges } from '@/lib/drive/sync'
import { DEFAULT_CLIENT_ID } from '@/lib/drive/types'
import { DEFAULT_LLM_SETTINGS, loadLLMSettings, saveLLMSettings, type LLMSettings } from '@/lib/llm'
import { cn } from '@/lib/utils'

const STARTER_PACKS = [
  { label: 'UFRGS 2024 — 1º Dia (Port/Lit/Hist/Mat)', file: 'cv2024-dia1.json' },
  { label: 'UFRGS 2024 — 2º Dia (LE/Fís/Quím/Geo/Bio)', file: 'cv2024-dia2.json' },
  { label: 'UFRGS 2023 — 1º Dia', file: 'cv2023-dia1.json' },
  { label: 'UFRGS 2023 — 2º Dia', file: 'cv2023-dia2.json' },
  { label: 'UFRGS 2022 — 1º Dia', file: 'cv2022-dia1.json' },
  { label: 'UFRGS 2022 — 2º Dia', file: 'cv2022-dia2.json' },
]

export const Route = createFileRoute('/settings')({ component: Settings })

function Settings() {
  const { theme, setTheme, fontScale, setFontScale } = useUI()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importReport, setImportReport] = useState<ImportReport | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  async function onExport() {
    const payload = await exportAll()
    downloadJson(payload)
  }

  async function onImportFile(file: File) {
    setImportError(null)
    try {
      const text = await file.text()
      const payload = JSON.parse(text)
      if (!payload.version || !Array.isArray(payload.questions)) throw new Error('Arquivo inválido.')
      const report = await importQuestions(payload)
      setImportReport(report)
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e))
    }
  }

  async function onReset() {
    if (!confirm('Apagar TODOS os dados? Esta ação não pode ser desfeita. Você pode exportar antes.')) return
    if (!confirm('Tem certeza absoluta? Última chance.')) return
    await resetDatabase()
  }

  async function loadStarter(file: string) {
    setImportError(null)
    try {
      const payload = await (await fetch(import.meta.env.BASE_URL + file)).json()
      const report = await importQuestions(payload)
      setImportReport(report)
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6 md:p-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Aparência, dados e atalhos.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Aparência</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Row label="Tema">
            <div className="flex gap-2">
              {(['system', 'light', 'dark'] as Theme[]).map((t) => (
                <Button
                  key={t}
                  variant={theme === t ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme(t)}
                  className="capitalize"
                >
                  {t === 'system' ? 'Sistema' : t === 'light' ? 'Claro' : 'Escuro'}
                </Button>
              ))}
            </div>
          </Row>
          <Row label="Tamanho do texto">
            <div className="flex items-center gap-2">
              {[0.9, 1, 1.1, 1.25].map((s) => (
                <Button
                  key={s}
                  variant={Math.abs(fontScale - s) < 0.01 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setFontScale(s)
                    document.documentElement.style.fontSize = `${s * 16}px`
                  }}
                >
                  {Math.round(s * 100)}%
                </Button>
              ))}
            </div>
          </Row>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Atalhos de teclado</CardTitle>
          <CardDescription>Disponíveis durante uma sessão de estudo.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
            <Shortcut k="1–5" desc="Selecionar alternativa A–E" />
            <Shortcut k="1/2/3" desc="Após responder: confiança (baixa/média/alta)" />
            <Shortcut k="Enter" desc="Avançar (após responder)" />
            <Shortcut k="N" desc="Pular questão" />
            <Shortcut k="Esc" desc="Sair da sessão" />
            <Shortcut k="Ctrl+S" desc="Salvar (no editor)" />
          </ul>
        </CardContent>
      </Card>

      <PrimoCard />

      <DriveCard />

      <Card>
        <CardHeader>
          <CardTitle>Pacote inicial</CardTitle>
          <CardDescription>
            Provas UFRGS 2024 já scrapeadas. Todas vêm com <code>needsReview</code> pra você revisar antes de estudar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {STARTER_PACKS.map((p) => (
            <div key={p.file} className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
              <span>{p.label}</span>
              <Button variant="secondary" size="sm" onClick={() => loadStarter(p.file)}>
                <Sparkles /> Importar
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dados</CardTitle>
          <CardDescription>
            Tudo fica no seu navegador (IndexedDB). Exporte com frequência pra backup ou pra mover entre máquinas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={onExport}>
              <Download /> Exportar tudo (JSON)
            </Button>
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
            >
              <Upload /> Importar JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onImportFile(f)
                e.target.value = ''
              }}
            />
          </div>

          {importReport && (
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
              Importado: +{importReport.questionsAdded} adicionadas, {importReport.questionsUpdated} atualizadas, +{importReport.subjectsAdded} matérias.
            </div>
          )}
          {importError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              Erro ao importar: {importError}
            </div>
          )}

          <div className="border-t border-border pt-4">
            <Row label="Zona de risco">
              <Button variant="destructive" size="sm" onClick={onReset}>
                <Trash2 /> Apagar todos os dados
              </Button>
            </Row>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        UFRGS Med · v0.1 · local-first PWA
      </p>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex items-center justify-between gap-4')}>
      <div className="text-sm font-medium">{label}</div>
      {children}
    </div>
  )
}

function PrimoCard() {
  const [s, setS] = useState<LLMSettings>(DEFAULT_LLM_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [showKey, setShowKey] = useState(false)

  useEffect(() => { loadLLMSettings().then(setS) }, [])

  async function save() {
    setSaving(true)
    try {
      await saveLLMSettings(s)
      setSavedAt(Date.now())
    } finally {
      setSaving(false)
    }
  }

  const configured = !!s.apiKey

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--color-warning)]" />
          Primo — assistente IA
        </CardTitle>
        <CardDescription>
          Cola sua chave Gemini pra ativar geração de variantes, post-mortem socrático e outras
          features do <a className="underline" href={import.meta.env.BASE_URL + 'playbook.html'} target="_blank" rel="noreferrer">playbook</a>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>API key Gemini (Google AI Studio)</Label>
          <div className="flex gap-2">
            <Input
              value={s.apiKey ?? ''}
              onChange={(e) => setS({ ...s, apiKey: e.target.value || null })}
              placeholder="AIzaSy..."
              type={showKey ? 'text' : 'password'}
              className="font-mono text-xs"
            />
            <Button variant="outline" size="sm" onClick={() => setShowKey((v) => !v)}>
              {showKey ? 'Ocultar' : 'Mostrar'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Pegue uma em <a className="underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a> (grátis). Salva no IndexedDB, sincroniza via Drive.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Modelo</Label>
          <select
            value={s.model}
            onChange={(e) => setS({ ...s, model: e.target.value })}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="gemini-2.5-flash">gemini-2.5-flash (rápido, barato)</option>
            <option value="gemini-2.5-pro">gemini-2.5-pro (melhor qualidade, mais caro)</option>
            <option value="gemini-2.0-flash-exp">gemini-2.0-flash-exp (experimental)</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {savedAt && Date.now() - savedAt < 3000
              ? '✓ Salvo'
              : configured ? 'Primo está pronto.' : 'Sem chave configurada — Primo desabilitado.'}
          </span>
          <Button size="sm" onClick={save} disabled={saving}>Salvar</Button>
        </div>
      </CardContent>
    </Card>
  )
}

function DriveCard() {
  const sync = useSync()
  const [clientId, setClientId] = useState(DEFAULT_CLIENT_ID)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    loadDriveSettings().then((s) => setClientId(s.clientId ?? DEFAULT_CLIENT_ID))
  }, [])

  useEffect(() => {
    if (sync.settings.clientId) setClientId(sync.settings.clientId)
  }, [sync.settings.clientId])

  const connected = sync.state !== 'disabled' && !!sync.settings.fileId

  async function onConnect() {
    setBusy(true); setErr(null)
    try {
      await connect(clientId.trim())
      await pull()
      watchChanges()
    } catch (e) {
      setErr((e as Error).message)
    } finally { setBusy(false) }
  }

  async function onDisconnect() {
    setBusy(true)
    try { await disconnect() } finally { setBusy(false) }
  }

  async function onPushNow() { setBusy(true); try { await push() } finally { setBusy(false) } }
  async function onPullNow() { setBusy(true); try { await pull() } finally { setBusy(false) } }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {connected ? <Cloud className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
          Sync — Google Drive
        </CardTitle>
        <CardDescription>
          Salva um arquivo <code>ufrgs-med.json</code> na raiz do seu Drive. Outras máquinas com a mesma conta puxam dele automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>OAuth Client ID (Google Cloud Console)</Label>
          <div className="flex gap-2">
            <Input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="123-xxxxx.apps.googleusercontent.com"
              disabled={connected || busy}
              className="font-mono text-xs"
            />
            {connected ? (
              <Button variant="outline" onClick={onDisconnect} disabled={busy}>
                Desconectar
              </Button>
            ) : (
              <Button onClick={onConnect} disabled={!clientId.trim() || busy}>
                <Zap /> Conectar
              </Button>
            )}
          </div>
          {!connected && (
            <p className="text-xs text-muted-foreground">
              Como obter: <a className="underline" href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">Google Cloud Console</a> → criar OAuth Client (Web app) → autorizar <code>http://localhost:5173</code>. Habilite o <em>Google Drive API</em> antes.
            </p>
          )}
        </div>

        {connected && (
          <>
            <Row label="Arquivo">
              <code className="rounded bg-muted px-2 py-0.5 text-xs">ufrgs-med.json</code>
            </Row>
            <Row label="Última sync">
              <span className="text-xs text-muted-foreground">
                {sync.settings.lastSyncAt ? new Date(sync.settings.lastSyncAt).toLocaleString('pt-BR') : '—'}
              </span>
            </Row>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={onPushNow} disabled={busy || sync.state === 'syncing'}>
                <Upload /> Enviar agora
              </Button>
              <Button variant="secondary" size="sm" onClick={onPullNow} disabled={busy || sync.state === 'syncing'}>
                <RotateCw /> Baixar agora
              </Button>
            </div>
          </>
        )}

        {err && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {err}
          </div>
        )}
        {sync.state === 'error' && sync.message && !err && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {sync.message}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Shortcut({ k, desc }: { k: string; desc: string }) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-md border border-border p-2">
      <span className="text-muted-foreground">{desc}</span>
      <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px]">{k}</kbd>
    </li>
  )
}
