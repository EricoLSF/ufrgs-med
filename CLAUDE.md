# CLAUDE.md

Working agreement for Claude Code sessions on this repo. Read this **first** — it shapes how I (Claude) should behave, what to take initiative on, and what to defer to the user.

## Who I'm working with

- **Single developer**, owner of the repo, building this for himself. Pessoal, não comercial.
- Idioma preferido nas respostas: **português** (PT-BR).
- Estilo: direto, sem rodeios. Não infla análises. Sugere antes de implementar quando a decisão é grande.

## The project in one paragraph

App web local-first pra estudar pro vestibular UFRGS (Medicina). Stack: React 19 + TS + Vite + Tailwind v4 + Dexie (IndexedDB) + TanStack Router + ts-fsrs. PWA instalável. Sync opcional via Google Drive (OAuth, scope `drive.file`). Scraper Node em `scripts/` extrai questões de PDFs do COPERSE. Sem backend.

Pra contexto mais profundo, leia em ordem: `README.md` → `PLAN.md` → `LOG.md` (últimas entradas) → `docs/architecture.md`.

## Como trabalhar nesse repo

### Tome iniciativa (não pergunte permissão pra essas)

- Corrigir um bug óbvio que você encontrou no caminho de outra tarefa
- Adicionar tipos faltando / consertar erros de TS estritamente locais
- Refatorar pra reusar `cn()`, `Button`, `Card` em vez de markup duplicado
- Quebrar componente em sub-componentes quando passar de ~200 linhas
- Atualizar `LOG.md` após qualquer mudança não-trivial
- Atualizar `TODO.md`: marcar item como feito ou adicionar novo descoberto
- Mover item de "Imediato" pra "Médio prazo" se outra coisa virou prioridade
- Sugerir e fazer um `git commit` após bloco coerente de trabalho (não a cada arquivo)

### Não tome iniciativa sem perguntar primeiro

- Adicionar nova dependência (npm install) — pergunte e justifique
- Mudar a stack ou trocar uma lib por outra
- Mudar o schema do banco (Dexie version bump) — pode quebrar dados existentes
- `git push --force`, deletar branches, qualquer coisa destrutiva remota
- Refatorar massivamente (>500 linhas em vários arquivos sem pedido)
- Mudar comportamento de sync/Drive (afeta dados em produção do usuário)

### Quando atualizar este CLAUDE.md

Se durante a sessão você descobrir um padrão útil — uma convenção que faltava, uma armadilha que pegou tempo pra desvendar, uma preferência que o usuário expressou — **edite este arquivo** e adicione. Mantém ele como memória viva do projeto. Coloca no commit junto com a mudança que motivou.

Exemplos do que vale adicionar:
- "Sempre rode `npm run build` antes de pedir review — type errors só aparecem lá"
- "Preview tool não mostra layout desktop bem; assume responsivo OK e confirma via preview_eval"
- "Usuário prefere export/import JSON sobre re-scrape pra mudanças pontuais"

Não polua: edita só se a info salva tempo numa sessão futura.

## Convenções de código

### TypeScript

- `verbatimModuleSyntax` ativo: SEMPRE `import type` pra type-only imports
- `noUnusedLocals`/`noUnusedParameters` ativos: prefixe com `_` o que precisar manter (`_id`)
- Sem `any`. Se precisar escapar tipos, use `unknown` + narrowing
- Evite `as` casts — refatore o tipo se possível

### React

- React 19: prefira `ref` como prop (não `forwardRef`)
- Componentes funcionais; `function Foo()` em vez de `const Foo = () =>` no top-level
- Hooks sempre no topo, depois early returns, depois render
- Sem `default export` exceto em route files (TanStack pede)

### Estilo

- Tailwind v4 com tokens em `oklch`; cores semânticas (`bg-card`, `text-muted-foreground`) — evite `gray-500` cru
- Use `cn()` pra concatenar classes
- Componentes shadcn-style em `src/components/ui/` — primitivos puros, zero domínio
- Features ficam em `src/features/<feature>/` — não importem entre features

### Dexie

- Schema é v1 (`src/lib/db/index.ts`). Pra mudar, bumpe a versão e adicione migração. **Pergunte antes**
- `useLiveQuery` pra reads reativos em React; queries puras em `src/lib/db/queries.ts` pra writes/uma vez
- Sempre que adicionar tabela: documente no `docs/architecture.md` no schema

### Scraper

- Heurísticas regex em `scripts/scrape-ufrgs.ts`. Cada cv-XXXX pode ter quirks
- Toda questão importada vem com `needsReview: 1` por padrão — não confiamos cegamente no parser
- Smoke test (`scripts/smoke-test.ts`) deve passar antes de mudar parsing

### Drive sync

- Não persista access tokens em disco/Dexie — só em memória (`src/lib/drive/auth.ts`)
- OAuth flow é implicit (gsi) — `requestAccessToken({ prompt: 'none' })` pra silent refresh
- Conflitos: last-write-wins. Não tente CRDT a menos que peça

## Comandos úteis

```bash
npm run dev                       # dev server :5173
npm run build                     # tsc -b + vite build (sempre faça antes de commitar)
npm run scrape -- <pdf> [opts]    # scraper
npx tsx scripts/smoke-test.ts     # valida parsing
```

## Git workflow

- Branch: trabalha direto em `main` (repo solo, sem PRs)
- Commits: pequenos e focados. Mensagem em português imperativo: "Adiciona X", "Corrige Y"
- **Commit + push após bloco coerente** de trabalho. Não acumule muito sem push (perde sync com remoto)
- Não use `--no-verify` nunca
- Antes de push: roda `npm run build` mentalmente; se TS quebrou, conserta
- Não tem CI ainda (TODO) — você é o CI

## Verificação antes de marcar feito

Para mudanças observáveis no browser: o servidor de preview tá rodando, use:
- `mcp__Claude_Preview__preview_eval` pra ler estado/DOM/db
- `mcp__Claude_Preview__preview_screenshot` pra UI (sabendo que o viewport é estreito)
- `mcp__Claude_Preview__preview_console_logs` com `level: 'error'` pra checar regressões

Pra mudanças de tipo/build: `npm run build` rodando até "✓ built in..." sem erro.

Pra mudanças no scraper: smoke test passa + 1 re-scrape real (ver as estatísticas printadas).

## O que o usuário NUNCA quer

- Análises longas como resposta. Se a pergunta é "como faço X" e você sabe, faz. Se há trade-off, 1-2 linhas e pergunta.
- Emojis (a menos que ele use primeiro)
- Recriar README ou docs do zero quando bastaria editar
- "Pra ficar mais robusto vou adicionar tratamento de erro..." em fluxos internos sem necessidade
- Mocks/stubs em vez de pedir o dado real
- Backends, microservices, ou "preparar pra escalar" — é uso pessoal

## Quando você (Claude) não souber

Pergunte. Especialmente:
- "Você quer manter os dados ou pode resetar o DB?"
- "Vou adicionar dependência X pra Y. Quer ou prefere implementar à mão?"
- "Essa decisão é arquitetural — quer que eu siga ou prefere discutir antes?"

Não invente fatos sobre o estado do repo. Leia arquivo se não tiver certeza.
