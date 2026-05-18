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

## Roadmap

### Próximas (alta prioridade)
- [ ] Importar mais provas: scrape UFRGS 2023, 2022, 2021... (~700 questões adicionais)
- [ ] Tela de "questões pendentes de revisão" — filtra `needsReview=1` e flag manual de "revisada"
- [ ] Suporte a imagens em questões (PDF → extrair imagens → upload pra... onde?)
- [ ] Preservar numeração de linha em textos-base (Português referencia "linha 03")
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
- ~~Backend de IA pra gerar questões~~ — fora de escopo; melhor importar provas reais
