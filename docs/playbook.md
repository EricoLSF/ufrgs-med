# Playbook UFRGS Medicina

> Fonte original (rich HTML): [/playbook.html](/playbook.html) — abre em nova aba pra ver com formatação completa.

Esse documento é a **diretriz mestre** das funcionalidades de IA do app. Tudo que envolve o assistente "Primo" deriva daqui.

## A meta

O cursinho cobre a base — todo mundo da sala vai ter. O diferencial real vem de:

1. **Ciclo erro → aprendizado curto e personalizado**
2. **Volume de prática no estilo UFRGS específico** (não só ENEM)
3. **Profundidade conceitual** em Bio/Quím/Fís (pesos altos no SISU saúde)
4. **Redação trabalhada de verdade**, semana após semana

O Primo (assistente do app) existe pra amplificar esses 4 vetores. Não substitui repetição, sono, calmaria.

## Camada base — sem volume nada funciona

- Provas anteriores UFRGS como dataset-mãe (8+ anos)
- Banco pessoal de questões com tracking ✅ *(implementado)*
- Simulado semanal cronometrado no formato UFRGS ✅ *(modo Simulado existe)*
- SRS pro long tail factual ✅ *(FSRS implementado)*

## Camada personalização — Primo como copiloto

Não usar IA pra pedir resposta. Usar pra coisas que humano-tutor cobraria R$200/h:

### 1. Erro → 5 variantes
Cola questão errada + sua resposta → Primo diagnostica gap conceitual + gera 5 questões novas atacando o gap, dificuldade crescente. **Cada erro vira 5 acertos próximos.**

### 2. Post-mortem socrático
Primo NÃO dá a resposta. Faz perguntas até você descobrir onde o raciocínio quebrou. Identifica se foi conceito, procedural, leitura, ansiedade, ou armadilha da banca.

### 3. Feynman invertido com pushback
Você explica o tópico ao Primo. Ele interrompe com "mas por quê?" até você bater no teto. Próxima coisa a estudar emerge sozinha.

### 4. Depth-bombing
10 questões sobre o mesmo conceito em dificuldade crescente. #10 = "pior questão UFRGS plausível sobre isso". Cura tópicos sabidos superficialmente.

### 5. Síntese inter-disciplinar
UFRGS gosta: bio+quím, fís+quím, fís+mat, geo+hist, port+lit. Pede 5 questões cross-domain por semana. **Quase ninguém treina isso.**

### 6. Coach de redação
Uma redação por semana. Primo avalia pela rubrica UFRGS, aponta os 3 problemas mais graves, reescreve UM parágrafo como referência (não a redação inteira).

### 7. Companion das obras obrigatórias
Tutor por obra de literatura. Quiza personagens, simbolismo, contexto histórico, ângulos UFRGS-style.

## Camada vibe-coded — ferramentas próprias

(Esse próprio app já cobre boa parte; o restante vira o roadmap.)

| Ferramenta | Status |
|---|---|
| Question Tracker | ✅ feito |
| Question of the Day | 🔜 precisa API key |
| Gerador erro → prática | 🔜 precisa API key (botão único: cola erro, recebe variantes) |
| SRS custom | ✅ feito (FSRS) |
| Gerador de simulado UFRGS-style | ⚠️ parcial — modo Simulado existe, falta gerar sintéticas |
| Coach de redação | 🔜 precisa API key |
| Heatmap de incidência por tópico | 🔜 precisa API key (auto-tag das provas) |

## Edges (vantagem sobre a massa)

- 1-2 **boss questions** por dia (frustrante de propósito)
- **Speed drills** (5 questões em 8min — calibrar quando pular)
- **Estudar a banca**, não só matéria (anuladas/polêmicas)
- **Redação loop disciplinado** (1/semana, sem exceção)
- Saúde física como decisão estratégica

## Ritmo semanal sugerido

| Quando | O quê |
|---|---|
| Diário | 15min SRS + 1 boss question à noite + todo erro vai pro tracker |
| Pós-aula | 30min depth-pass com Primo no tópico do dia |
| Ter/Qui | Bloco UFRGS: 1 matéria, 15 questões cronometradas. Erros geram sintéticas |
| Quarta | Redação semanal + revisão pela rubrica |
| Sábado | Simulado UFRGS-format 4h. Sem celular |
| Domingo | Post-mortem: cada erro vira tag + 3 sintéticas. Tarde livre |

## Biblioteca de prompts (a copiar pro Primo)

São os prompts base que o Primo vai usar/oferecer como templates:

- **Erro → 5 variantes** (mais alto ROI)
- **Post-mortem socrático**
- **Feynman invertido**
- **Depth-bombing**
- **Redação UFRGS**

Texto completo desses prompts está no [HTML original](/playbook.html), seção 06.

## Princípio orientador

> "O playbook é hipótese, não dogma — quanto mais cedo o primo questionar e adaptar, melhor."
