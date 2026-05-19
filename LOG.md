# Log de Implementação

Diário de mudanças relevantes, em ordem cronológica reversa. Cada entrada tem data, escopo e razão.

> **Como usar:** quando fizer uma mudança não-trivial, adicione uma entrada aqui antes de commitar. Isso ajuda o Claude (e você futuro) a entender por que algo foi feito.

---

## 2026-05-18

### Phase 15 — UX: Por revisar + Modo Foco
- `QuestionList` ganha toggle "Por revisar" (filtra `needsReview=1`) com contador no badge
- Cards de questão mostram badge "revisar" amarelo
- `QuestionEditor` ganha botão "Marcar revisada" quando `needsReview=1` (clica → seta 0 + autosave)
- Modo Foco: atalho global `F` no `__root.tsx` esconde sidebar+topbar, fonte 17px, hint discreto bottom-right pra sair

### Phase 14 — Deploy GitHub Pages + CI
- `.github/workflows/deploy.yml`: build no push pra `main`, sobe pra `gh-pages` via deploy-pages
- `vite.config.ts`: `base` lê de `VITE_BASE` env (CI passa `/ufrgs-med/`)
- `main.tsx`: router.basepath = `import.meta.env.BASE_URL`
- Fetches em routes/{index,settings,help} usam `BASE_URL` como prefixo
- 404.html copiado de index.html no build (SPA fallback)
- `configure-pages` com `enablement: true` tenta auto-habilitar Pages
- **Bloqueio**: GitHub Pages em repo privado exige Pro plan. Usuário escolheu tornar repo público

### Phase 13 — Scrape UFRGS 2023 e 2022
- 4 PDFs (1º e 2º dia INGLES de cada ano), 259 questões adicionais (total 386)
- Texto-base detectado: 2022 dia1 (1-9, 10-15), 2023 dia1 (1-8), 2022 dia2 (1-8), 2023 dia2 (1-7, 8-15)
- Anuladas puladas: 2023#20, 2022#25 + #60
- 2021 não existe (UFRGS pulou de cv-2020 pra cv-2022 por causa de pandemia)
- `STARTER_PACKS` em Settings agora tem 6 entradas; Dashboard CTA importa todos os 6

### Plano — Primo (assistente IA) + integração do playbook
- Playbook `playbook-ufrgs-medicina.html` (do Downloads) preservado em `public/playbook.html` + resumo em `docs/playbook.md`
- `PLAN.md`: nova seção "Camada IA — Primo" mapeando P1-P9 (erro→variantes, post-mortem socrático, Feynman invertido, depth-bombing, redação, etc.)
- `PLAN.md`: nova seção "Dependências externas" com mensagem-modelo pro Carlos pedindo API key da Anthropic/OpenAI
- `TODO.md`: bloco "Bloqueado em dependência externa" no topo com os 9 itens do Primo
- Arquitetura proposta (não implementada): `src/lib/llm/` (provider-agnostic) + `src/features/primo/` (chat + actions). Chamadas direto do browser
- Nome "Primo" vem do contexto do playbook (escrito pra usuário-alvo chamado primo)

### Scraper — numeração de linhas em textos-base
- `numberLines()` em `scripts/scrape-ufrgs.ts` prefixa cada linha não-vazia com `NN  `
- Texto-base é renderizado em code-block markdown (monospace, alinhamento perfeito de coluna)
- Questões UFRGS de Português/Inglês que pedem "linha 03" agora ficam respondíveis
- Re-scrape + re-import: dedup por `external_id` atualiza statementMd, mantém SRS/attempts

### Phase 9-11 — Documentação + GitHub
- Adicionado `README.md`, `PLAN.md`, `TODO.md`, `LOG.md`, `CLAUDE.md`
- Rota `/help` renderiza markdowns de `docs/` via `import.meta.glob` raw
- Repo Git inicial + push pro GitHub privado

### Phase 8 — Sync Google Drive
- OAuth via Google Identity Services (gsi/client)
- Scope `drive.file`, arquivo `ufrgs-med.json` na raiz do Drive
- Sync strategy: pull no boot + watch nas tabelas Dexie + debounced push (5s)
- Conflito: last-write-wins por `modifiedTime`
- Replace mantém SRS/attempts/notes via remapping de IDs antigos→novos
- `DEFAULT_CLIENT_ID` em `src/lib/drive/types.ts` (Client ID é público; safe)
- Indicador de status na topbar
- Doc completa em `docs/drive-setup.md`

### Phase 7 + extensions — Scraper
- CLI Node em `scripts/scrape-ufrgs.ts` (pdfjs-dist legacy build)
- Suporte a `--ranges` pra múltiplas matérias por PDF (UFRGS empacota 4-5 por dia)
- Dedup por número de questão (PDF 2-colunas dispara falsos positivos)
- Detecção de "Texto-base" via regex `quest[õo]es\s+(?:de\s+)?(\d+)\s+a\s+(\d+)` + keyword guard (`texto|abaixo|...`)
- Prefere range mais específico quando há sobreposição (Inglês: 1-15 contém 1-7 e 8-15)
- Pacotes iniciais: UFRGS 2024 1º DIA (60 questões) + 2º DIA INGLES (69 questões); ANULADAS puladas
- Smoke test em `scripts/smoke-test.ts`

### Phase 6 — Settings + import/export
- `/settings` com Aparência (tema, font scale), Atalhos (referência), Dados (export/import JSON, reset DB)
- "Pacote inicial" card com 1-clique pra carregar UFRGS 2024 (importa de `/public/cv2024-*.json`)
- Empty-state CTA no Dashboard quando banco vazio (aparece em browser novo)
- Reset com double-confirm + reload

### Phase 5 — SRS + Stats + Dashboard
- `src/lib/srs.ts`: wrapper sobre ts-fsrs, mapeia `Confidence (1-3)` + correto/errado → `Rating (Again/Hard/Good/Easy)`
- Após cada attempt: `reviewQuestion(qId, grade)` cria/atualiza `srs_state`
- Stats: KPIs (acerto geral, streak, due hoje, total), acerto por matéria (barras coloridas), heatmap GitHub-style (12 semanas), calibração de confiança
- Dashboard wireado com dados reais; cálculo de weak spots (3 matérias com menor acerto, min 3 tentativas)

### Phase 4 — Modos de estudo
- 4 modos: drill (filtro por matéria/tag), simulado (ano específico), quick (10 aleatórias), srs (fila de hoje)
- Sessão persistida em `db.sessions` com `configJson.ids` (lista pré-gerada)
- UI da sessão: progress bar, atalhos 1-5/N/Enter/Esc, picker de confiança após responder
- Summary final (acerto %, respondidas, tempo médio)
- `useShortcuts` hook centralizado, ignora inputs/textareas/contenteditable

### Phase 3 — Bank + Editor
- `/questions` lista com filtros (matéria, ano, search, tag, favoritas, arquivadas)
- `/questions/new` + `/questions/$id` reutilizam `QuestionEditor` (split form/preview)
- Preview live com `Markdown` (react-markdown + remark-math + rehype-katex)
- CSS `.md` em `index.css` substitui plugin de typography (mais leve)
- Atalho `Ctrl+S` salva; `correctAlt` selecionável clicando no badge da alternativa

### Phase 2 — Data layer
- Dexie schema v1 com 8 tabelas (subjects, topics, questions, alternatives embed, sessions, attempts, notes, srs, settings)
- `db.on('populate')` seeda 9 matérias UFRGS com cores em oklch
- Hooks reativos em `src/lib/db/hooks.ts` via `useLiveQuery`
- Queries helpers em `src/lib/db/queries.ts` (não-reativos)

### Phase 1 — Skeleton
- Vite + React 19 + TS + Tailwind v4 (`@tailwindcss/vite` + CSS vars em oklch)
- TanStack Router file-based (plugin gera `routeTree.gen.ts`)
- Layout: Sidebar 240px + Topbar + Outlet, `md:` breakpoint pra sidebar
- Theme provider com toggle (sistema/claro/escuro) persistido em localStorage
- shadcn-style components escritos à mão: Button, Card, Input, Label, Select, Textarea, Badge, Separator
- PWA via vite-plugin-pwa (manifest + autoUpdate)
- Path alias `@/*` → `src/*`
- Decisão chave: pivot inicial de Tauri → web app PWA (Tauri pediria 5GB de Rust + MSVC; PWA dá quase mesma experiência sem custo)

---

## Convenções

- **Cabeçalho por dia** (`## YYYY-MM-DD`), **subseção por mudança lógica** (`### Tema — título curto`)
- Bullets: o que mudou + por que (se não-óbvio)
- Cita arquivos com path relativo (`src/foo.ts`)
- Não duplica info de commit message — foco em "por quê" e contexto
