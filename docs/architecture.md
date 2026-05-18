# Arquitetura

## Camadas

```
┌─────────────────────────────────────────────────┐
│  UI (React 19 + Tailwind v4 + shadcn-style)     │
├─────────────────────────────────────────────────┤
│  Routes (TanStack Router file-based)            │
├─────────────────────────────────────────────────┤
│  Features (bank, study, stats — por funcionali- │
│            dade, não por camada técnica)         │
├──────────────────────┬──────────────────────────┤
│  lib/db (Dexie)      │  lib/drive (Drive sync)  │
│  lib/srs (ts-fsrs)   │  lib/markdown            │
├──────────────────────┴──────────────────────────┤
│  IndexedDB (navegador)                          │
└─────────────────────────────────────────────────┘
```

Sem backend. Tudo roda em browser. Drive é opcional e atua só como blob storage.

## Schema do banco (Dexie v1)

```
subjects     ++id, &name, displayOrder
topics       ++id, subjectId, parentId, [subjectId+parentId], name
questions    ++id, &externalId, subjectId, topicId, year, source, difficulty,
             *tags, isFavorite, isArchived, needsReview, createdAt
sessions     ++id, type, startedAt
attempts     ++id, sessionId, questionId, attemptedAt,
             [sessionId+attemptedAt], [questionId+attemptedAt]
notes        questionId (PK), updatedAt
srs          questionId (PK), dueAt, state
settings     key (PK)
```

Observações:
- `*tags` = multi-entry index — busca por tag é O(log n)
- `&externalId` = unique → dedup no import, evita duplicatas ao re-scrape
- `notes` e `srs` são 1:1 com `questions`, então PK é `questionId` (sem auto-inc)
- `settings` é key-value (theme, drive config, font scale)

## Convenção de pastas

- `src/components/ui/` — primitivos visuais reusáveis (Button, Card, etc.), zero dependência de domínio
- `src/components/layout/` — sidebar, topbar, theme provider
- `src/features/<feature>/` — agrupa componentes, hooks, queries de UMA feature. Não importa de outras `features/`
- `src/lib/` — código não-React (DB, SRS, markdown, utils, drive, shortcuts)
- `src/routes/` — só monta features em rotas; pouca lógica
- `src/stores/` — Zustand stores (apenas UI state; dados ficam em Dexie)

## Fluxo: estudar uma questão

```
user click "Iniciar sessão"
    ↓
StudySetup → createSession(type, config={ ids: [...] })
    ↓
navigate('/study/session/:id')
    ↓
StudySession loads session via useLiveQuery
    ↓
loop:
  show question (Markdown + KaTeX)
  user picks alt → setSelectedAlt(i), setPhase('post')
  show feedback (correct/wrong + comentário)
  user picks confidence 1/2/3 → recordAttempt() + reviewQuestion(grade)
                                  ↓                ↓
                            db.attempts        FSRS card update
                                                  ↓
                                            db.srs.put(...)
  advance idx
    ↓
done → SessionSummary
```

`reviewQuestion(grade)` em `lib/srs.ts`:
- Lê estado FSRS atual (`db.srs.get(questionId)`) ou cria card vazio
- Chama `fsrs().next(card, now, grade)`
- Persiste novo estado

## Fluxo: sync Drive

```
boot
 ├── loadDriveSettings() → settings from db.settings
 ├── if clientId: requestToken(silent: true) — tenta refresh
 │   └── if success: api.metadata(fileId) → compare modifiedTime
 │                  ├── newer than lastSyncAt: api.download → replaceLocalDb
 │                  └── same: skip
 └── watchChanges() — instala Dexie hooks em todas tabelas
                       └── any change → markDirty → debounce 5s → push()
```

`push()`:
1. `exportAll()` serializa tudo
2. `api.upload(fileId, json)` faz PATCH no Drive
3. Salva `modifiedTime` retornado como novo `lastSyncAt`

`replaceLocalDb()` ao puxar:
1. Limpa tabelas (subjects, topics, questions, sessions, attempts, notes, srs)
2. Re-cria subjects → mapeia old subjectId → new local ID
3. Re-cria questions → mapeia old questionId → new local ID
4. Re-cria sessions, remapeia `configJson.ids`
5. Attempts/notes/srs → usa qMap pra refazer foreign keys

Conflitos: last-write-wins por `modifiedTime` do Drive. Se 2 devices editarem offline simultaneamente, último a sincronizar sobrescreve.

## Dependências principais — por quê

| Lib | Por quê |
|---|---|
| `dexie` + `dexie-react-hooks` | API reativa em cima de IndexedDB; transações; schema versionado |
| `@tanstack/react-router` | Type-safe routing, plugin Vite gera tree, mais robusto que react-router |
| `@tanstack/react-query` | Cache automático pra dados não-reativos (mais usado no futuro) |
| `zustand` | Estado UI mínimo (theme, focus mode); persist no localStorage |
| `react-markdown` + `remark-math` + `rehype-katex` | Combo padrão pra MD + fórmulas |
| `ts-fsrs` | Algoritmo FSRS mantido; melhor que SM-2 |
| `recharts` | Charts declarativos, integra fácil |
| `vite-plugin-pwa` | Manifest + service worker numa config |
| `pdfjs-dist` (dev) | Extração de texto de PDFs sem precisar Python |
| `tsx` (dev) | Roda TS direto sem build (scraper) |

## Convenções de código

- TS estrito (`noUnusedLocals`, `verbatimModuleSyntax`, etc.) — força tipos limpos
- `import type` pra type-only imports (verbatimModuleSyntax pede)
- React 19: prefiro `ref` como prop (não `forwardRef`)
- Sem `barrel exports` (`index.ts` que re-exporta); imports diretos pra paths claros
- Sem comentários de "o quê" — só "por quê" se não-óbvio
- `cn()` em vez de string concat pra classes Tailwind
