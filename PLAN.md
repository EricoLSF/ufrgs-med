# Plano

Visão geral da arquitetura, decisões tomadas, e o que vem a seguir.

## Princípios

1. **Local-first**: dados no navegador (IndexedDB), sem backend obrigatório. Sync opcional.
2. **Sem overengineering**: feature por pasta (`features/bank`, `features/study`...), zero acoplamento horizontal, sem DI framework, sem state machine pesada.
3. **Slick**: atalhos em tudo, dark/light com `oklch`, micro-interações sutis (transition-colors, fade no preview).
4. **Modular e extensível**: scraper plugável, schema versionado por Dexie, JSON import/export como protocolo de interop.

## Decisões arquiteturais

| Tema | Escolha | Por quê |
|---|---|---|
| Frontend | React 19 + Vite | Padrão atual, dev rápido, build pequeno |
| UI | Tailwind v4 + shadcn-style à mão | Tailwind v4 é ergonômico; copio componentes shadcn sem instalar a CLI pra ter controle |
| Routing | TanStack Router (file-based) | Type-safe, com plugin Vite que gera `routeTree.gen.ts` |
| Estado servidor | TanStack Query | Padrão, cache automático, integração com Dexie via useLiveQuery |
| Estado UI | Zustand | Mais leve que Redux, persist middleware pra theme |
| DB local | Dexie (IndexedDB) | Reativo via `useLiveQuery`, schema versionado, transações |
| Markdown+LaTeX | react-markdown + remark-math + rehype-katex | Combo padrão; KaTeX é rápido |
| SRS | ts-fsrs | FSRS > SM-2, mantido ativamente |
| PWA | vite-plugin-pwa | Manifest + service worker em uma config |
| Scraper | Node + pdfjs-dist | Sem Python; reusa o toolchain |
| Sync | Google Drive (OAuth scope `drive.file`) | Sem backend, "cloud grátis" via Drive do usuário |

## Schema (Dexie v1)

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

`*tags` = multi-entry index → busca por tag escala.
`&externalId` = unique → dedup em import/re-import.

## Fluxos principais

### Estudar
1. `/study` → escolhe modo + filtros → cria `session` com `configJson.ids` (lista de question IDs)
2. `/study/session/:id` → loop: pickAlt → confirma confiança → recordAttempt + reviewQuestion(FSRS) → próxima
3. Fim → summary (acerto, tempo médio)

### Importar prova
1. `npm run scrape -- <pdf-url> --gabarito <txt> --ranges "1-15:Mat,..." --year 2024 --prefix ufrgs-2024 --out scraper-out/x.json`
2. Move pra `public/`
3. App → Configurações → Pacote inicial → Importar
4. Dedup por `externalId`; atualiza statementMd se já existir

### Sync Drive
1. Settings → cola Client ID (vem pré-preenchido) → Conectar → OAuth popup
2. Boot: silent token refresh + pull (se remote modifiedTime > lastSyncAt)
3. Mudança local → Dexie hook marca dirty → debounce 5s → push (PATCH no Drive)
4. Conflito: last-write-wins por modifiedTime do Drive

## Camada IA — Primo

> O **Primo** é o assistente de IA do app. Nome vem do [playbook](docs/playbook.md), onde ele aparece como copiloto do "primo" (usuário-alvo). É a camada que diferencia o app de um banco de questões qualquer.

**Status: bloqueado em [dependência externa](#dependencias-externas) — API key da LLM com o Carlos.**

### Features do Primo (derivadas do playbook)

| # | Feature | Prioridade | Notas |
|---|---|---|---|
| P1 | **Erro → 5 variantes** | Alta | Botão "Gerar variantes" na tela de revisão pós-resposta. Diagnostica gap + gera 5 questões sintéticas dificuldade crescente. ROI mais alto |
| P2 | **Post-mortem socrático** | Alta | Chat: cola questão errada, Primo faz perguntas até você descobrir onde quebrou. Não dá resposta |
| P3 | **Feynman invertido** | Média | Você explica tópico, Primo pergunta "por quê?" até esgotar. Lista pontos onde travou |
| P4 | **Depth-bombing** | Média | 10 questões progressivas sobre 1 tópico, calibradas pra culminar em "pior questão UFRGS plausível" |
| P5 | **Síntese inter-disciplinar** | Média | 5 questões cross-domain/semana (bio+quím, fís+mat etc.) |
| P6 | **Coach de redação** | Alta | Cola redação → nota por critério UFRGS + 3 problemas + reescrita de UM parágrafo |
| P7 | **Companion das obras** | Baixa | Tutor por obra obrigatória de literatura |
| P8 | **Question of the Day** | Média | Background job diário: identifica 3 tópicos mais fracos do tracker, gera 1 questão, notifica |
| P9 | **Heatmap de incidência por tópico** | Baixa | Auto-tag das provas anteriores → mostra densidade de cobrança por matéria |

### Arquitetura proposta

```
src/lib/llm/                  # provider-agnostic
├── anthropic.ts              # Claude API client (default)
├── prompts.ts                # templates derivados do playbook
└── types.ts                  # Provider, Message

src/features/primo/
├── chat.tsx                  # chat UI básico
├── actions/                  # cada feature P1-P9 como ação
│   ├── error-variants.tsx
│   ├── socratic.tsx
│   ├── ...
└── question-of-day.ts        # job

src/routes/primo.tsx          # rota /primo
```

- API key fica em `db.settings` (igual Drive Client ID), nunca em código
- Provider abstraído: padrão Anthropic Claude (recomendado pelo playbook), mas dá pra trocar
- Chamadas direto do browser (CORS habilitado pela Anthropic com `anthropic-dangerous-direct-browser-access`)
- Cada ação tem prompt template editável em `prompts.ts`

### Integração com o resto do app

- **Editor de questões** ganha botão "Gerar variantes" (P1) usando a questão atual + atempt mais recente
- **Sessão de estudo** após errar mostra opção "Discutir com o Primo" (P2)
- **Dashboard** mostra Question of the Day (P8)
- **Stats** ganha aba "Heatmap UFRGS" (P9)

## Roadmap

### Bloqueado em API key (Primo)
- [ ] **P1** Erro → 5 variantes (botão na revisão pós-resposta)
- [ ] **P2** Post-mortem socrático (chat)
- [ ] **P6** Coach de redação (com rubrica UFRGS)
- [ ] **P8** Question of the Day

### Próximas (alta prioridade, NÃO bloqueado)
- [ ] Importar mais provas: scrape UFRGS 2023, 2022, 2021... (~700 questões adicionais)
- [ ] Tela de "questões pendentes de revisão" — filtra `needsReview=1` e flag manual de "revisada"
- [ ] Suporte a imagens em questões (PDF → extrair imagens → upload pra... onde?)
- [ ] Editor: WYSIWYG / split aprimorado com botões pra inserir LaTeX

### Médias
- [ ] Busca full-text (`⌘K`) com FlexSearch ou similar — atalho global pra "pular pra"
- [ ] Modo Foco real: sem sidebar, fonte maior, prep pra ler texto longo
- [ ] Tópicos hierárquicos (atualmente schema tem mas UI não usa) — auto-classificação por tags?
- [ ] Comparar com gabarito comentado (links externos pra Curso Anglo, etc.)
- [ ] Tema customizável (não só dark/light) — accent color por matéria

### Baixas / nice-to-have
- [ ] Code-splitting do bundle (atualmente 947KB; KaTeX e Recharts são os maiores)
- [ ] Mobile responsive review — testar com 360px width, ajustar touch targets
- [ ] CSV export pra análise externa (Excel/Sheets)
- [ ] Plugin de "questão similar" — clustering vetorial (sentence-transformers no client?)
- [ ] Suporte multi-banca (FUVEST, ENEM, USP) — só requer mais ranges no scraper

### Engenharia
- [ ] Tests: pelo menos smoke E2E (Playwright) pro happy path de estudar uma questão
- [ ] CI: GitHub Actions rodando build + lint no push
- [ ] Deploy: GitHub Pages ou Vercel (PWA estática) pra acessar de qualquer device

## Anti-roadmap (decidi NÃO fazer)

- ~~Backend Node + SQLite~~ — perderia local-first e PWA mobile
- ~~Tauri desktop~~ — install pesado (Rust + MSVC), zero ganho real vs PWA
- ~~OAuth login no app~~ — single-user; Drive já tem auth dele próprio
- ~~Multi-usuário / classes~~ — escopo pessoal
- ~~Backend de IA pra gerar questões~~ — fora de escopo (chamadas direto do browser pra LLM)

## Dependências externas

### API key da LLM — bloqueia camada Primo

**Responsável: Carlos.**

Pra ativar o Primo (P1-P9 acima) precisamos de uma API key. Recomendação:

- **Anthropic Claude API** (preferida — playbook foi escrito pra Claude)
  - https://console.anthropic.com → Settings → API Keys → Create Key
  - Modelos sugeridos: `claude-sonnet-4-6` (qualidade) ou `claude-haiku-4-5-20251001` (custo/latência)
  - Custo estimado: **~R$10-30/mês** pra uso pesado de 1 vestibulando (100-500 calls/dia)
  - Pré-pago, sem cartão de crédito travado

Alternativas aceitáveis:
- OpenAI (`gpt-5`) — qualidade similar, custo similar
- Google Gemini — mais barato, qualidade ligeiramente inferior pra raciocínio
- Self-hosted (Ollama) — grátis mas exige máquina rodando

**Sem essa key, o Primo fica desabilitado.** O resto do app funciona normalmente.

### Mensagem pro Carlos

> Salve, Carlos. Tô construindo um app de estudo pro vestibular UFRGS de Medicina. Preciso de uma API key da Anthropic (ou OpenAI/Gemini) pra integrar features de IA: gerar questões a partir dos meus erros, coach socrático, revisão de redação. Uso estimado R$10-30/mês — pré-pago, sem risco. Você consegue criar uma key em console.anthropic.com (Settings → API Keys) e me passar?
