# UFRGS Med

App de estudo para o vestibular UFRGS — foco em Medicina. Browser-first, local-first, sincronização opcional via Google Drive.

> **Quem é o usuário:** o desenvolvedor desta cópia. App é pessoal, não há multi-tenant nem auth de usuário.

## TL;DR

```bash
npm install
npm run dev    # http://localhost:5173
```

Na primeira vez, abra o app → clica **Carregar pacote** no Dashboard pra trazer 127 questões UFRGS 2024 já scrapeadas.

## O que ele faz

- Banco de questões pesquisável, editor com Markdown + LaTeX, preview ao vivo
- 4 modos de estudo: drill por matéria, simulado completo, sessão rápida (10 random), revisão SRS
- SRS com algoritmo **FSRS** (mais moderno que SM-2)
- Atalhos de teclado em tudo (`1-5` alternativas, `Enter` avança, `N` pula, `Esc` sai, `Ctrl+S` salva)
- Estatísticas: acerto por matéria, heatmap de atividade, calibração de confiança
- Pacotes iniciais (UFRGS 2024 1º e 2º dia) — 1 clique pra popular
- Scraper Node.js pra novas provas: `npm run scrape -- <pdf-url>`
- Sync opcional via Google Drive (OAuth, last-write-wins, debounced)

## Stack

- **React 19** + **TypeScript** + **Vite**
- **Tailwind v4** + componentes shadcn-style escritos à mão (`src/components/ui/`)
- **TanStack Router** (file-based) + **TanStack Query**
- **Dexie** (IndexedDB)
- **ts-fsrs** (SRS)
- **Recharts** (gráficos)
- **react-markdown** + **remark-math** + **rehype-katex** (renderização)
- **vite-plugin-pwa** (PWA instalável)
- **pdfjs-dist** (scraper de PDFs)

## Estrutura

```
src/
├── components/        # ui/ (shadcn-style), layout/ (sidebar, topbar), theme-provider
├── features/          # bank/, study/, stats/  -- agrupado por funcionalidade
├── lib/
│   ├── db/            # Dexie + schema + hooks + queries
│   ├── drive/         # Google Drive sync (auth, api, sync)
│   ├── markdown.tsx   # Renderer KaTeX
│   ├── srs.ts         # ts-fsrs wrapper
│   ├── shortcuts.ts   # useShortcuts hook
│   └── utils.ts       # cn()
├── routes/            # file-based routing (TanStack)
└── stores/            # zustand (UI state)

scripts/
└── scrape-ufrgs.ts    # CLI scraper

docs/                  # markdown — renderizado in-app em /help

public/
└── cv2024-*.json      # pacotes iniciais
```

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (porta 5173) |
| `npm run build` | Build de produção (`tsc -b && vite build`), gera PWA |
| `npm run preview` | Serve o build pra teste |
| `npm run lint` | ESLint |
| `npm run scrape -- <pdf> [opts]` | Scraper UFRGS (ver `scripts/README.md`) |

## Onde os dados ficam

Tudo no **IndexedDB do navegador** — não há backend. Implicações:

- **Cada navegador/perfil = banco separado.** Use o sync do Drive (Configurações) pra ter mesmo dado em vários devices
- Limpar dados do site = apagar tudo. **Exporte JSON com frequência** (Configurações → Dados → Exportar)
- Não há servidor pra cair. Funciona offline (PWA)

## Documentação

Toda documentação dentro do app em **/help** (renderiza os markdowns de `docs/`). Arquivos relevantes:

- [`docs/getting-started.md`](docs/getting-started.md) — primeiro uso, atalhos
- [`docs/architecture.md`](docs/architecture.md) — decisões, schemas, dependências
- [`docs/drive-setup.md`](docs/drive-setup.md) — setup OAuth do Google Drive
- [`scripts/README.md`](scripts/README.md) — uso do scraper
- [`PLAN.md`](PLAN.md) — roadmap + futuras features
- [`TODO.md`](TODO.md) — backlog priorizado
- [`LOG.md`](LOG.md) — diário de implementação

## Contribuindo (você mesmo, no futuro)

- Veja [`CLAUDE.md`](CLAUDE.md) — convenções de código e o "working agreement" comigo (Claude Code) pra sessões futuras
- Update [`LOG.md`](LOG.md) após mudanças relevantes; isso me ajuda a entender o histórico em próximas sessões
- Commits curtos e focados; PRs não obrigatórios pra repo solo
