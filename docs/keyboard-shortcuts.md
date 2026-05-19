# Atalhos de teclado

## Sessão de estudo

| Tecla | Ação |
|---|---|
| `1` `2` `3` `4` `5` | Selecionar alternativa A / B / C / D / E |
| `1` `2` `3` (após responder) | Marcar confiança (baixa / média / alta) — auto-avança |
| `Enter` (após responder) | Avançar sem marcar confiança |
| `N` | Pular questão (registra como erro) |
| `Esc` | Sair da sessão |

## Editor de questões

| Tecla | Ação |
|---|---|
| `Ctrl+S` (`⌘S` no Mac) | Salvar |

## Navegação (global)

| Tecla | Ação |
|---|---|
| `F` | Modo foco (esconde sidebar + topbar, fonte ligeiramente maior) |
| `⌘K` / `Ctrl+K` | Busca rápida — *em breve* |

## Implementação

Atalhos centralizados em `src/lib/shortcuts.ts`:

```ts
useShortcuts({
  '1': () => pickAlt(0),
  '2': () => pickAlt(1),
  ...
  'enter': () => commitConfidence(null),
  'n': () => skip(),
  'escape': () => navigate({ to: '/study' }),
})
```

O hook ignora automaticamente quando o foco está em `INPUT`, `TEXTAREA` ou elemento `contenteditable` — então digitar no editor não dispara atalhos de sessão.
