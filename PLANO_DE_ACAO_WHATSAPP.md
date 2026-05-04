# PLANO DE AÇÃO - SISTEMA DE MENSAGENS VIA WHATSAPP

## Objetivo
Implementar um sistema de envio automático de mensagens via WhatsApp para:
1. **Dono da loja**: Receber notificação instantânea quando um novo pedido for feito pelo catálogo público
2. **Cliente**: Receber confirmação do pedido com comprovante após alguns minutos

---

## ARQUITETURA DO SISTEMA

### Componentes Necessários
1. **Supabase Edge Functions**: Para processar pedidos e enviar mensagens em background
2. **Serviço de WhatsApp**: Integração com uma API de WhatsApp (ex: Z-API, Wati, Evolution API, etc.)
3. **Tabela de Configurações**: Para armazenar chaves de API e preferências do usuário
4. **Tabela de Logs**: Para registrar todas as mensagens enviadas e seus status

---

## PASSO 1: ESCOLHER E INTEGRAR UM SERVIÇO DE WHATSAPP

### Opções Recomendadas
| Serviço | Vantagens | Desvantagens |
|---------|-----------|---------------|
| **Z-API** | Fácil de usar, boa documentação, preço acessível | Pago |
| **Evolution API** | Open source, auto-hospedável | Requer configuração mais técnica |
| **Wati** | Oficial WhatsApp Business API, escalável | Mais caro |
| **Twilio** | Confiável, integração fácil | Mais caro para volumes altos |

### Recomendação: Z-API ou Evolution API
- **Z-API**: Para quem não quer se preocupar com hospedagem
- **Evolution API**: Para quem quer economia e controle total

---

## PASSO 2: CRIAR TABELAS NO SUPABASE

### Tabela 1: `whatsapp_config` (Configurações do usuário)
```sql
CREATE TABLE whatsapp_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service_provider TEXT NOT NULL, -- 'zapi', 'evolution', 'wati', etc.
  api_key TEXT NOT NULL,
  api_url TEXT NOT NULL,
  instance_id TEXT,
  owner_whatsapp_number TEXT NOT NULL, -- Número do dono da loja
  enable_owner_notifications BOOLEAN DEFAULT true,
  enable_customer_notifications BOOLEAN DEFAULT true,
  customer_notification_delay_minutes INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### Tabela 2: `whatsapp_message_logs` (Logs de mensagens)
```sql
CREATE TABLE whatsapp_message_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL, -- 'owner' or 'customer'
  recipient_number TEXT NOT NULL,
  message_type TEXT NOT NULL, -- 'text', 'image', 'document'
  status TEXT NOT NULL, -- 'pending', 'sent', 'delivered', 'failed'
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Habilitar Row Level Security (RLS)
```sql
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem apenas suas configurações" 
  ON whatsapp_config FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Usuários veem apenas seus logs" 
  ON whatsapp_message_logs FOR ALL USING (auth.uid() = user_id);
```

---

## PASSO 3: CRIAR SUPABASE EDGE FUNCTIONS

### Função 1: `send-whatsapp-message`
Arquivo: `supabase/functions/send-whatsapp-message/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    const { orderId, userId, recipientType } = await req.json();

    // 1. Buscar configurações do WhatsApp do usuário
    const { data: config, error: configError } = await supabase
      .from("whatsapp_config")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (configError || !config) {
      return new Response(
        JSON.stringify({ error: "Configuração de WhatsApp não encontrada" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Buscar dados do pedido
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, order_items(*, products(name))")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Pedido não encontrado" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Construir mensagem
    let message = "";
    let recipientNumber = "";

    if (recipientType === "owner") {
      if (!config.enable_owner_notifications) {
        return new Response(
          JSON.stringify({ message: "Notificações para dono desativadas" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      recipientNumber = config.owner_whatsapp_number;
      message = buildOwnerMessage(order);
    } else {
      if (!config.enable_customer_notifications) {
        return new Response(
          JSON.stringify({ message: "Notificações para cliente desativadas" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      recipientNumber = order.public_customer_whatsapp || order.public_customer_phone;
      message = buildCustomerMessage(order);
    }

    if (!recipientNumber) {
      return new Response(
        JSON.stringify({ error: "Número de telefone não encontrado" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Enviar mensagem via API do provedor
    const sendResult = await sendMessageViaProvider(
      config,
      recipientNumber,
      message
    );

    // 5. Registrar log
    await supabase.from("whatsapp_message_logs").insert({
      user_id: userId,
      order_id: orderId,
      recipient_type: recipientType,
      recipient_number: recipientNumber,
      message_type: "text",
      status: sendResult.success ? "sent" : "failed",
      error_message: sendResult.error,
      sent_at: sendResult.success ? new Date().toISOString() : null,
    });

    return new Response(
      JSON.stringify({ 
        success: sendResult.success, 
        message: sendResult.success ? "Mensagem enviada" : sendResult.error 
      }),
      { status: sendResult.success ? 200 : 500, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

function buildOwnerMessage(order: any): string {
  const itemsList = order.order_items
    .map((item: any) => `${item.quantity}x ${item.products.name} - R$ ${(item.quantity * item.price_at_time).toFixed(2)}`)
    .join("\\n");

  return `🔔 NOVO PEDIDO RECEBIDO! 🔔

📋 Pedido #${order.id.slice(0, 8)}
👤 Cliente: ${order.public_customer_name}
📞 Telefone: ${order.public_customer_whatsapp || order.public_customer_phone}
📍 Endereço: ${order.public_customer_rua}, ${order.public_customer_numero} - ${order.public_customer_bairro}, ${order.public_customer_city}
💳 Pagamento: ${order.payment_method}

📦 Itens:
${itemsList}

💰 Total: R$ ${order.total.toFixed(2)}

Acesse o app para ver mais detalhes!`;
}

function buildCustomerMessage(order: any): string {
  const itemsList = order.order_items
    .map((item: any) => `${item.quantity}x ${item.products.name} - R$ ${(item.quantity * item.price_at_time).toFixed(2)}`)
    .join("\\n");

  return `Olá ${order.public_customer_name}! 👋

Obrigado pelo seu pedido! 🛒

📋 Pedido #${order.id.slice(0, 8)}
📦 Itens:
${itemsList}

💰 Total: R$ ${order.total.toFixed(2)}
💳 Pagamento: ${order.payment_method}

Em breve entraremos em contato para confirmar os detalhes!

Atenciosamente,
${order.store_name || "Nossa Loja"}`;
}

async function sendMessageViaProvider(config: any, number: string, message: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanNumber = number.replace(/\D/g, "");
    const formattedNumber = cleanNumber.startsWith("55") ? cleanNumber : `55${cleanNumber}`;

    if (config.service_provider === "zapi") {
      // Z-API
      const response = await fetch(`${config.api_url}/send-text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Client-Token": config.api_key,
          "Instance-Id": config.instance_id || "",
        },
        body: JSON.stringify({
          number: formattedNumber,
          message: message,
        }),
      });

      if (!response.ok) {
        return { success: false, error: `Erro Z-API: ${response.status}` };
      }
      return { success: true };
    } else if (config.service_provider === "evolution") {
      // Evolution API
      const response = await fetch(`${config.api_url}/message/sendText/${config.instance_id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": config.api_key,
        },
        body: JSON.stringify({
          number: formattedNumber,
          options: {
            delay: 1200,
            presence: "composing",
          },
          textMessage: {
            text: message,
          },
        }),
      });

      if (!response.ok) {
        return { success: false, error: `Erro Evolution API: ${response.status}` };
      }
      return { success: true };
    }

    return { success: false, error: "Provedor não suportado" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" };
  }
}
```

### Função 2: `trigger-whatsapp-notifications` (Trigger para novo pedido)
Arquivo: `supabase/functions/trigger-whatsapp-notifications/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    const { type, table, record } = await req.json();

    if (type !== "INSERT" || table !== "orders") {
      return new Response(JSON.stringify({ message: "Evento não tratado" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const order = record;
    const userId = order.user_id;

    // 1. Enviar mensagem instantânea para o DONO
    await supabase.functions.invoke("send-whatsapp-message", {
      body: {
        orderId: order.id,
        userId: userId,
        recipientType: "owner",
      },
    });

    // 2. Verificar se deve enviar mensagem para o CLIENTE (com delay)
    const { data: config } = await supabase
      .from("whatsapp_config")
      .select("customer_notification_delay_minutes")
      .eq("user_id", userId)
      .single();

    const delayMinutes = config?.customer_notification_delay_minutes || 5;

    // Para implementar o delay, podemos usar o pg_cron do Supabase
    // Ou criar uma tabela de tarefas pendentes
    // Por simplicidade, vamos enviar imediatamente (você pode ajustar depois)

    await supabase.functions.invoke("send-whatsapp-message", {
      body: {
        orderId: order.id,
        userId: userId,
        recipientType: "customer",
      },
    });

    return new Response(
      JSON.stringify({ success: true, message: "Notificações disparadas" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro no trigger:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
```

---

## PASSO 4: CRIAR PÁGINA DE CONFIGURAÇÃO NO APP

Adicionar uma seção na página de Ajustes para configuração do WhatsApp.

### Funcionalidades da Página:
1. Escolha do provedor (Z-API, Evolution, etc.)
2. Campo para API Key
3. Campo para API URL
4. Campo para Instance ID (se necessário)
5. Campo para número do WhatsApp do dono
6. Toggle para ativar/desativar notificações para dono
7. Toggle para ativar/desativar notificações para cliente
8. Campo para definir delay das mensagens ao cliente
9. Botão para testar configuração

---

## PASSO 5: CRIAR PÁGINA DE LOGS

Adicionar uma página para visualizar o histórico de mensagens enviadas, incluindo:
- Status da mensagem (enviada, falha, etc.)
- Número do destinatário
- Tipo de destinatário (dono/cliente)
- Data e hora
- Mensagem de erro (se houver)

---

## PASSO 6: TESTAR O SISTEMA

### Checklist de Testes:
1. [ ] Configurar provedor de WhatsApp no app
2. [ ] Fazer um pedido pelo catálogo público
3. [ ] Verificar se a mensagem chega no WhatsApp do dono **instantaneamente**
4. [ ] Verificar se a mensagem chega no WhatsApp do cliente (com o delay configurado)
5. [ ] Verificar se os logs são registrados corretamente
6. [ ] Testar desativação das notificações
7. [ ] Testar diferentes provedores

---

## CUSTOS ESTIMADOS

### Opção 1: Z-API (Pago)
- Plano básico: ~R$ 50/mês
- Inclui: 1 número, 500 mensagens/dia
- Ideal para pequenos negócios

### Opção 2: Evolution API (Auto-hospedado)
- Hospedagem VPS: ~R$ 30/mês (ex: Digital Ocean, Vultr)
- Código: Gratuito (open source)
- Ideal para quem quer economia e controle

### Opção 3: Wati (WhatsApp Business API Oficial)
- Plano básico: ~R$ 150/mês
- Inclui: Número verificado, suporte oficial
- Ideal para negócios em crescimento

---

## IMPLEMENTAÇÃO PASSO A PASSO (RESUMO)

1. **Configurar Supabase**:
   - Criar tabelas no SQL Editor
   - Habilitar RLS

2. **Configurar Edge Functions**:
   - Instalar Supabase CLI
   - Criar e deployar as funções

3. **Configurar Provedor de WhatsApp**:
   - Escolher e se cadastrar em um provedor
   - Obter API Key e credenciais

4. **Implementar no Frontend**:
   - Adicionar página de configuração
   - Adicionar página de logs
   - Integrar com a API

5. **Testar**:
   - Fazer pedidos de teste
   - Verificar recebimento das mensagens
   - Ajustar conforme necessário

---

## DICAS IMPORTANTES

1. **Testes em Desenvolvimento**: Use números de teste antes de usar o número oficial
2. **Backup**: Sempre faça backup do banco de dados antes de alterar estruturas
3. **Documentação**: Leia a documentação do provedor de WhatsApp escolhido
4. **Suporte**: Use o suporte do provedor se precisar de ajuda com a integração
5. **Monitoramento**: Verifique os logs regularmente para garantir que as mensagens estão sendo enviadas

---

## PRÓXIMOS PASSOS

Se quiser prosseguir com a implementação, podemos:
1. Começar criando as tabelas no Supabase
2. Implementar a página de configuração no app
3. Configurar o provedor de WhatsApp
4. Deployar as Edge Functions

Qual etapa você quer começar primeiro?
