# Instruções para Configuração Completa do WhatsApp

## ✅ O que já foi implementado

1. **Tabelas no Banco de Dados** - Você já executou o SQL no Supabase
2. **Edge Functions** - Arquivos criados em `supabase/functions/`
3. **Frontend** - Páginas de configuração e logs implementadas
4. **Serviços** - Métodos no `supabaseService.ts` e tipos no `types.ts`

---

## 🚀 Próximos Passos

### 1. Instalar o Supabase CLI

Se você ainda não tem o Supabase CLI instalado:

**Windows (PowerShell):**
```powershell
winget install Supabase.cli
```

**Ou usando npm:**
```bash
npm install -g supabase
```

---

### 2. Logar no Supabase

```bash
supabase login
```

---

### 3. Linkar seu projeto

```bash
supabase link --project-ref SEU_PROJECT_ID
```

Você encontra o `project-ref` na URL do seu dashboard do Supabase (ex: `https://supabase.com/dashboard/project/abc123xyz`)

---

### 4. Deploy das Edge Functions

```bash
supabase functions deploy send-whatsapp-message
supabase functions deploy trigger-whatsapp-notifications
```

---

### 5. Configurar o Trigger no Supabase

Vá para o **SQL Editor** no Supabase e execute este comando para criar o trigger que dispara a função quando um novo pedido é criado:

```sql
-- Habilitar pg_net (se não estiver habilitado)
create extension if not exists pg_net;

-- Criar função para chamar a Edge Function
create or replace function trigger_whatsapp_on_new_order()
returns trigger as $$
begin
  perform
    net.http_post(
      url := 'https://SEU_PROJECT_ID.supabase.co/functions/v1/trigger-whatsapp-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer SEU_SERVICE_ROLE_KEY'
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'orders',
        'record', new
      )
    );
  return new;
end;
$$ language plpgsql security definer;

-- Criar o trigger
create trigger on_new_order_trigger
  after insert on orders
  for each row
  execute function trigger_whatsapp_on_new_order();
```

**Não se esqueça de substituir:**
- `SEU_PROJECT_ID` pelo seu ID do projeto
- `SEU_SERVICE_ROLE_KEY` pela sua service role key (encontrada em Settings → API)

---

### 6. Configurar no Aplicativo

1. Abra o aplicativo
2. Vá para **Ajustes**
3. Clique em **Configurar WhatsApp**
4. Preencha os dados do seu provedor (Z-API, Evolution API, etc.)
5. Salve e teste a configuração!

---

## 📋 Provedores Suportados

### Z-API (Recomendado para iniciantes)
- Site: https://z-api.io/
- Planos a partir de R$ 50/mês
- Fácil de configurar

### Evolution API (Auto-hospedado)
- Site: https://evolution-api.com/
- Open source e gratuito
- Requer hospedagem própria (ex: Digital Ocean, Vultr)

### Wati (Oficial WhatsApp Business)
- Site: https://www.wati.io/
- Oficial e seguro
- Planos mais caros

---

## 🔍 Troubleshooting

### Se as mensagens não estiverem sendo enviadas:
1. Verifique os logs no Supabase (Edge Functions → Logs)
2. Verifique a página de **Histórico WhatsApp** no aplicativo
3. Certifique-se de que a API Key e URL estão corretas
4. Verifique se o número está no formato correto (ex: 5511999999999)

---

## 📞 Suporte

Se precisar de ajuda:
- Consulte a documentação do provedor escolhido
- Verifique os logs das Edge Functions no Supabase
- Teste a configuração usando o botão "Testar Configuração" no aplicativo
