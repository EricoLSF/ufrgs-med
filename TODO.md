# TODO

> Backlog ativo. Itens são removidos quando feitos (entram no `LOG.md`). Prioridade reflete impacto sobre estudar dia-a-dia.

## 🔴 Bloqueado em dependência externa

### API key da LLM — pedir ao **Carlos**
Sem isso, toda a camada Primo (P1-P9) fica parada. Detalhes e mensagem-modelo em [`PLAN.md → Dependências externas`](PLAN.md#dependencias-externas).

Quando a key chegar, destravam:
- [ ] **P1** Erro → 5 variantes (ROI mais alto — playbook chama de "feature de maior alavanca")
- [ ] **P2** Post-mortem socrático (chat que faz perguntas em vez de dar resposta)
- [ ] **P6** Coach de redação (rubrica UFRGS + reescrita de 1 parágrafo)
- [ ] **P8** Question of the Day (notificação diária com questão sintética nos seus pontos fracos)
- [ ] **P3** Feynman invertido
- [ ] **P4** Depth-bombing (10 questões progressivas)
- [ ] **P5** Síntese inter-disciplinar
- [ ] **P7** Companion das obras obrigatórias
- [ ] **P9** Heatmap de incidência por tópico

Arquitetura pré-pensada: `src/lib/llm/` + `src/features/primo/`. Detalhes em `PLAN.md`.

## Imediato

- [ ] Scrapear UFRGS 2023, 2022, 2021 — replicar o fluxo de 2024 pra cada ano. Cada `--out` vira um starter pack adicional em `public/`
- [ ] Preservar numeração de linha nos textos-base (Português "linha 03, 05 e 75" não tem como ser respondido sem isso)
- [ ] Tela "Por revisar" — filtro rápido pra `needsReview=1` direto no menu lateral; ao salvar no editor, oferecer "marcar como revisada"

## Curto prazo

- [ ] Imagens em questões: PDF → extrair como base64 → guardar no campo `images: string[]` no `Question`; renderer faz `<img src={...}>`
- [ ] `⌘K` busca global: FlexSearch indexa statementMd + alternatives + tags; abre command palette com `Ctrl+K`
- [ ] Auto-tag baseado em palavras-chave (heurística simples por dicionário por matéria — ex: "Mendel" → tag `genetica`)
- [ ] Botões LaTeX no editor: inserir `$$`, `\frac{}{}`, `\sqrt{}`, símbolos comuns
- [ ] Tópicos hierárquicos (já no schema): UI pra arrastar tópicos sob matérias; questões filtram por tópico

## Médio prazo

- [ ] Modo Foco: esconde sidebar+topbar, fonte 18px, layout centralizado pra leitura confortável
- [ ] Tema "leitura" (sépia, serif) pra textos-base longos
- [ ] Tags como entidades canônicas (atualmente strings livres): UI de gerenciar tags, sugestões auto-complete
- [ ] Sessão "errei nas últimas 7 dias" — drill de revisão recente
- [ ] Calibração de confiança avançada: alerta quando "alta confiança mas acerto < 70%"

## Engenharia

- [ ] CI GitHub Actions: build + lint no push pra main
- [ ] Smoke E2E (Playwright): "abre app vazio → carrega pacote → estuda 3 questões → checa stats"
- [ ] Code splitting: Recharts e KaTeX em chunks separados (lazy import)
- [ ] Lighthouse audit + ajustes (mobile)
- [ ] Deploy: GitHub Pages com base path correto

## Pesquisa / experimentos

- [ ] Embedding local pra "questões similares" — usar `@xenova/transformers` (roda no browser)
- [ ] PWA com share target — receber PDFs compartilhados de outros apps?
- [ ] Importar diretamente do COPERSE: catálogo dentro do app com lista de provas + botão "scrapear esta"

## Bugs conhecidos

- Scraper perde ~5 questões em provas com layout 2-colunas denso (ex: 2º DIA Inglês: 69/74)
- Detecção de texto-base pode falhar em formatações antigas (testar com 2019 ou anterior)
- Topbar mostra "sincronizado · HH:MM" mas não atualiza em tempo real após push silencioso (precisa recarregar)
