# Configuração completa de Push (PWA) + Badge + Tela Bloqueada (Supabase)

Este projeto já está com o código pronto para:

- Receber Web Push no celular (tela bloqueada)
- Mostrar badge numérico no ícone (quando suportado pelo Android/launcher)
- Abrir o app ao clicar na notificação

Você só precisa configurar o Supabase e as variáveis.

## 1) Banco (SQL)

1. Abra o Supabase do seu projeto
2. Vá em **SQL Editor**
3. Execute o arquivo [push_schema.sql](file:///d:/TRABALHOS%20COM%20CODIGOS%20HTML/APLICATIVO%20B2B/aplicativorevendaderua-jpg-s-Org-main/aplicativorevendaderua-jpg-s-Org-main/push_schema.sql)
4. Confirme em **Table Editor** que existe a tabela `push_subscriptions`

## 2) Gerar as chaves VAPID (uma vez)

No terminal, dentro da pasta do projeto:

```bash
npm run push:vapid
```

Guarde o `publicKey` e o `privateKey`. O `privateKey` nunca vai para o frontend.

## 3) Frontend (Vite) - variável pública

Crie/edite `.env.local` na raiz do projeto (não commitar):

```env
VITE_VAPID_PUBLIC_KEY=SUA_PUBLIC_KEY_AQUI
```

Se você faz deploy (Vercel/Netlify), configure a mesma variável no painel do deploy e faça redeploy.

## 4) Supabase Edge Function - secrets (privado)

No Supabase Dashboard, configure os secrets:

- `VAPID_PUBLIC_KEY` = sua publicKey
- `VAPID_PRIVATE_KEY` = sua privateKey
- `VAPID_SUBJECT` = `mailto:suporte@seudominio.com` (ou URL do seu site)

## 5) Deploy da Edge Function

1. Instale a CLI:

```bash
npm i -g supabase
```

2. Login:

```bash
supabase login
```

3. Link no projeto (use o seu project-ref do Supabase):

```bash
supabase link --project-ref SEU_PROJECT_REF
```

4. Deploy:

```bash
supabase functions deploy send-push-notification
```

## 6) Publicação (HTTPS obrigatório)

Web Push no celular exige o app rodando em HTTPS (Vercel/Netlify/Cloudflare/etc.).

## 7) No celular (Android/Chrome) - instalar e permitir

1. Abra o site (HTTPS) no Chrome
2. Menu ⋮ → **Instalar app** / **Adicionar à tela inicial**
3. Abra pelo ícone instalado
4. Permita notificações quando o app pedir
5. Em Configurações do Android → Apps → (seu app) → Notificações:
   - Permitir
   - Tela de bloqueio: habilitada
   - Som: habilitado

## 8) Teste

1. Faça login em 2 dispositivos com o mesmo usuário
2. Gere um pedido no dispositivo B
3. No dispositivo A deve aparecer:
   - Notificação do sistema na tela bloqueada
   - Badge no ícone (quando suportado)
   - Som padrão do sistema (quando não silenciado)

