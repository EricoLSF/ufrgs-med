# Primeiros passos

## Carregar questões

1. Abra o app — se for um navegador novo (banco vazio), o Dashboard mostra um card grande **"Comece com UFRGS 2024"**
2. Clica **Carregar pacote** — em ~3 segundos você tem 127 questões reais importadas
3. Pronto pra estudar

Você também pode importar manualmente em **Configurações → Pacote inicial**.

## Modos de estudo

Vai em **Estudar** e escolhe:

| Modo | Quando usar |
|---|---|
| **Drill** | Foco numa matéria específica ou em uma tag (ex: `mendel`). Você define quantas questões |
| **Simulado** | Prova inteira de um ano, sequencial. Tem timer |
| **Rápido** | 10 questões aleatórias — ~10 min |
| **Revisão (SRS)** | Fila do dia gerada pelo FSRS — questões que o algoritmo acha que você está prestes a esquecer |

## Atalhos de teclado

Durante uma sessão:

- `1` `2` `3` `4` `5` — selecionar alternativa A-E
- Após responder, `1` `2` `3` — confiança (baixa / média / alta)
- `Enter` — avançar sem marcar confiança
- `N` — pular questão
- `Esc` — sair da sessão (mantém progresso até o momento)

No editor de questões:

- `Ctrl+S` (ou `⌘S`) — salvar

## Editor de questões

Em **Questões → Nova** (ou clica numa questão da lista):

- **Markdown** funciona no enunciado, alternativas e comentário
- **LaTeX** inline: `$f(x) = x^2$` ; bloco: `$$\int_0^1 x\,dx$$`
- Preview ao vivo do lado direito
- Botão verde "A B C D E" pra marcar a alternativa correta
- Tags separadas por vírgula viram chips

## Backup

Tudo fica no IndexedDB do seu navegador. **Faça backup**:

- **Configurações → Dados → Exportar tudo (JSON)** — baixa um `.json` com tudo
- Importa o mesmo arquivo em outro navegador pra "mudar de máquina"

Ou conecta o **Google Drive** (Configurações → Sync) pra sync automático.

## Adicionar mais provas

```bash
npm run scrape -- <url-do-PDF.pdf> \
  --gabarito <gabarito.txt> \
  --ranges "1-15:Português,16-30:Literatura,..." \
  --year 2023 \
  --prefix ufrgs-2023 \
  --out scraper-out/cv2023.json
```

Depois copia o JSON pra `public/` e importa pelo app em Configurações.

Detalhes em [scripts/README.md](../scripts/README.md).
