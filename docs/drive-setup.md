# Setup do Google Drive Sync

Você só precisa fazer isso 1 vez. Leva ~5 minutos.

## 1. Criar projeto no Google Cloud

1. Acesse https://console.cloud.google.com/
2. Topo → seletor de projeto → **NEW PROJECT** (qualquer nome, ex: "ufrgs-med")
3. Aguarde criar e selecione o projeto

## 2. Habilitar Google Drive API

1. Menu lateral → **APIs & Services → Library**
2. Busca por "Google Drive API"
3. Clica → **ENABLE**

## 3. Tela de consentimento OAuth

1. **APIs & Services → OAuth consent screen**
2. User Type: **External** → Create
3. App name: `UFRGS Med` (ou o que quiser)
4. User support email: seu email
5. Developer contact: seu email
6. SAVE AND CONTINUE
7. Scopes: **Add or remove scopes** → busca `drive.file` → seleciona `.../auth/drive.file` → UPDATE → SAVE AND CONTINUE
8. Test users: **+ ADD USERS** → adiciona seu próprio email Google → SAVE AND CONTINUE

> O app fica em "Testing mode" — não precisa publicar pra uso pessoal. Tokens duram 7 dias, depois você reconecta.

## 4. Criar OAuth Client ID

1. **APIs & Services → Credentials**
2. **+ CREATE CREDENTIALS → OAuth client ID**
3. Application type: **Web application**
4. Name: `ufrgs-med-local` (qualquer nome)
5. **Authorized JavaScript origins → + ADD URI**: `http://localhost:5173`
6. (Se for hospedar em outro lugar depois, adiciona a URL aqui também)
7. **CREATE**
8. Copia o **Client ID** (formato: `123456-abcdef.apps.googleusercontent.com`)

## 5. Conectar no app

1. Abre o app → **Configurações → Sync — Google Drive**
2. Cola o Client ID
3. **Conectar** → popup do Google abre → escolhe sua conta → autoriza
4. Pronto. Topbar mostra "sincronizado", arquivo `ufrgs-med.json` aparece na raiz do seu Drive
5. Cada mudança no banco vai pro Drive em 5s. Boot puxa a versão mais recente automaticamente.

## Como funciona

- Scope `drive.file`: o app só vê arquivos que ele mesmo criou. Resto do seu Drive fica invisível pra ele
- Estratégia: **last-write-wins por timestamp**. Sem merge — se você editar em 2 devices sem sincronizar, o último a salvar sobrescreve
- IDs locais são remapeados ao baixar — attempts/SRS sobrevivem
- Sem token persistido em disco: a cada boot tenta reconectar silenciosamente; se a sessão Google expirou, você reconecta com 1 clique

## Outra máquina

Mesmo Client ID funciona em qualquer máquina (basta adicionar a URL nos "Authorized origins" se mudar de `localhost:5173` pra outro host). Cola o mesmo Client ID, conecta com a mesma conta Google, pull baixa o `ufrgs-med.json`.
