# Scraper UFRGS

CLI Node.js que lê um PDF de prova UFRGS, extrai questões e gera JSON pronto
pra importar pelo app (**Configurações → Importar JSON**).

## Uso

```bash
npm run scrape -- caminho/ou/url/da/prova.pdf \
  --gabarito caminho/do/gabarito.pdf \
  --subject "Biologia" \
  --year 2024 \
  --out scraper-out/bio-2024.json
```

### Opções

| Flag | Descrição |
| --- | --- |
| `--gabarito <path\|url>` | PDF (ou .txt) com as respostas |
| `--subject <nome>` | Nome da matéria (deve bater com uma já cadastrada no app) |
| `--year <YYYY>` | Ano da prova |
| `--source <label>` | Rótulo de fonte (default: `UFRGS`) |
| `--prefix <slug>` | Prefixo do `external_id` (default: `ufrgs`) — usado pra dedup |
| `--out <file>` | Caminho do JSON (default: `scraper-out/<basename>.json`) |
| `--dump` | Só joga o texto extraído no stdout (debug) |

## Atenção

PDFs científicos com fórmulas e figuras nunca são perfeitos:

- **Fórmulas** (LaTeX) costumam vir como glifos sem semântica.
- **Figuras e tabelas** são ignoradas.
- **Layouts em 2 colunas** podem misturar texto.

Por isso, **toda questão é importada com `needsReview=1`** — você revisa no
editor antes de incluir no estudo. O `external_id` evita duplicatas se você
re-importar a mesma prova depois de re-rodar o scraper.

## Estendendo

O arquivo `scrape-ufrgs.ts` tem heurísticas trocáveis:

- `parseQuestions(text)` — split por número de questão
- `splitAlternatives(chunk)` — separa enunciado das alternativas (A)–(E)
- `parseGabarito(text)` — extrai pares número → letra

Se uma prova específica tem layout diferente, ajuste essas funções.
