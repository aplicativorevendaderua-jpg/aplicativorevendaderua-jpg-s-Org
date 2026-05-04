import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

interface WhatsAppConfig {
  id: string;
  user_id: string;
  service_provider?: string;
  api_url?: string;
  api_key?: string;
  instance_id?: string;
  owner_whatsapp_number: string;
  enable_owner_notifications: boolean;
  enable_customer_notifications: boolean;
}

interface OrderItem {
  id: string;
  quantity: number;
  price_at_time: number;
  products?: { name: string };
}

interface Order {
  id: string;
  user_id: string;
  public_customer_name?: string;
  public_customer_whatsapp?: string;
  public_customer_phone?: string;
  public_customer_rua?: string;
  public_customer_numero?: string;
  public_customer_bairro?: string;
  public_customer_city?: string;
  payment_method?: string;
  total: number;
  order_items?: OrderItem[];
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

function getSupabaseUrl(): string | null {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  return supabaseUrl ?? null;
}

function getServiceRoleKey(): string | null {
  return (
    Deno.env.get("SERVICE_ROLE_KEY") ??
    Deno.env.get("SB_SERVICE_ROLE_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("SUPABASE_SECRET_KEY") ??
    null
  );
}

function getAnonKey(): string | null {
  return (
    Deno.env.get("SUPABASE_ANON_KEY") ??
    Deno.env.get("SB_ANON_KEY") ??
    Deno.env.get("ANON_KEY") ??
    null
  );
}

function createServiceSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = getSupabaseUrl();
  const supabaseServiceKey = getServiceRoleKey();

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Erro: Variáveis de ambiente não definidas (SUPABASE_URL e SERVICE_ROLE_KEY/SB_SERVICE_ROLE_KEY)!");
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function createAnonSupabaseClient(authHeader: string): SupabaseClient | null {
  const supabaseUrl = getSupabaseUrl();
  const anonKey = getAnonKey();

  if (!supabaseUrl || !anonKey) {
    console.error("Erro: Variáveis de ambiente não definidas (SUPABASE_URL e SUPABASE_ANON_KEY)!");
    return null;
  }

  return createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });
}

const supabase = createServiceSupabaseClient();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!supabase) {
    return new Response(
      JSON.stringify({ error: "Erro de configuração do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return new Response(
        JSON.stringify({ error: "Content-Type deve ser application/json" }),
        { status: 415, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { type, table, record, test, orderId, recipientType, testNumber } = body;

    const webhookSecretHeader = req.headers.get("x-webhook-secret") || "";
    const webhookSecretEnv = (Deno.env.get("WHATSAPP_WEBHOOK_SECRET") || "").trim();

    const isWebhookEvent = type === "INSERT" && table === "orders" && record;

    if (isWebhookEvent) {
      if (!webhookSecretEnv || webhookSecretHeader !== webhookSecretEnv) {
        return new Response(
          JSON.stringify({ error: "Webhook não autorizado" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return await handleNewOrder(record);
    }

    if (test === true) {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Não autenticado" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return await handleTest(userId, testNumber);
    }

    const parsedRecipientType =
      recipientType === "owner" || recipientType === "customer" ? (recipientType as "owner" | "customer") : null;

    if (orderId && parsedRecipientType) {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Não autenticado" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return await handleSendMessage(orderId, userId, parsedRecipientType);
    }

    return new Response(
      JSON.stringify({ error: "Parâmetros inválidos ou incompletos" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro na função send-whatsapp-message:", error);
    return new Response(
      JSON.stringify({
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization") || "";
  const hasBearer = authHeader.toLowerCase().startsWith("bearer ");
  if (!hasBearer) return null;

  const anonClient = createAnonSupabaseClient(authHeader);
  if (!anonClient) return null;

  const { data, error } = await anonClient.auth.getUser();
  if (error || !data?.user?.id) return null;
  return data.user.id;
}

async function handleNewOrder(order: Order): Promise<Response> {
  if (!supabase) {
    return new Response(
      JSON.stringify({ error: "Erro de configuração do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const userId = order.user_id;
  const orderId = order.id;

  console.log(`Processando novo pedido ${orderId} para usuário ${userId}`);

  let ownerResult: SendResult = { success: false };
  let customerResult: SendResult = { success: false };

  try {
    ownerResult = await sendMessage(orderId, userId, "owner");
    console.log(`Resultado para dono (pedido ${orderId}):`, ownerResult);
  } catch (error) {
    console.error(`Erro ao enviar mensagem para dono:`, error);
    ownerResult = { success: false, error: error instanceof Error ? error.message : String(error) };
  }

  try {
    customerResult = await sendMessage(orderId, userId, "customer");
    console.log(`Resultado para cliente (pedido ${orderId}):`, customerResult);
  } catch (error) {
    console.error(`Erro ao enviar mensagem para cliente:`, error);
    customerResult = { success: false, error: error instanceof Error ? error.message : String(error) };
  }

  return new Response(
    JSON.stringify({
      success: ownerResult.success || customerResult.success,
      ownerResult,
      customerResult,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleTest(userId: string, testNumber?: string): Promise<Response> {
  if (!supabase) {
    return new Response(
      JSON.stringify({ error: "Erro de configuração do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const configResult = await getWhatsAppConfig(userId);
  if (!configResult.config) {
    return new Response(
      JSON.stringify({ error: configResult.error }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const config = configResult.config;
  const recipientNumber = testNumber || config.owner_whatsapp_number;

  if (!recipientNumber) {
    return new Response(
      JSON.stringify({ error: "Número de telefone não configurado" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const sendResult = await sendMessageViaProvider({ config, toNumber: recipientNumber, message: "Teste de envio via Evolution API" });

  await supabase.from("whatsapp_message_logs").insert({
    user_id: userId,
    recipient_type: "test",
    recipient_number: recipientNumber,
    message_type: "text",
    status: sendResult.success ? "sent" : "failed",
    error_message: sendResult.error,
    sent_at: sendResult.success ? new Date().toISOString() : null,
  });

  return new Response(
    JSON.stringify({
      success: sendResult.success,
      messageId: sendResult.messageId,
      message: sendResult.success ? "Mensagem de teste enviada" : sendResult.error,
    }),
    { status: sendResult.success ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleSendMessage(orderId: string, userId: string, recipientType: "owner" | "customer"): Promise<Response> {
  if (!supabase) {
    return new Response(
      JSON.stringify({ error: "Erro de configuração do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!orderId || !userId || !recipientType) {
    return new Response(
      JSON.stringify({ error: "Parâmetros orderId, userId e recipientType são obrigatórios" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const result = await sendMessage(orderId, userId, recipientType);

  return new Response(
    JSON.stringify(result),
    { status: result.success ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function getWhatsAppConfig(userId: string): Promise<{ config: WhatsAppConfig | null; error?: string }> {
  if (!supabase) {
    return { config: null, error: "Erro de configuração do servidor" };
  }

  const { data, error } = await supabase
    .from("whatsapp_config")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return { config: null, error: "Configuração de WhatsApp não encontrada" };
  }

  return { config: data as WhatsAppConfig };
}

async function sendMessage(orderId: string, userId: string, recipientType: "owner" | "customer"): Promise<SendResult> {
  if (!supabase) {
    return { success: false, error: "Erro de configuração do servidor" };
  }

  const configResult = await getWhatsAppConfig(userId);
  if (!configResult.config) {
    return { success: false, error: configResult.error };
  }
  const config = configResult.config;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*, order_items(*, products(name))")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return { success: false, error: "Pedido não encontrado" };
  }

  const orderData = order as Order;

  if (orderData.user_id !== userId) {
    return { success: false, error: "Pedido não pertence a este usuário" };
  }

  let recipientNumber = "";
  let message = "";

  if (recipientType === "owner") {
    if (!config.enable_owner_notifications) {
      return { success: true, error: undefined };
    }
    recipientNumber = config.owner_whatsapp_number;
    message = buildOwnerMessage(orderData);
    const result = await sendMessageViaProvider({
      config,
      toNumber: recipientNumber,
      message,
    });
    await supabase.from("whatsapp_message_logs").insert({
      user_id: userId,
      order_id: orderId,
      recipient_type: recipientType,
      recipient_number: recipientNumber,
      message_type: "text",
      status: result.success ? "sent" : "failed",
      error_message: result.error,
      sent_at: result.success ? new Date().toISOString() : null,
    });
    return result;
  } else {
    if (!config.enable_customer_notifications) {
      return { success: true, error: undefined };
    }
    recipientNumber = orderData.public_customer_whatsapp || orderData.public_customer_phone || "";
    message = buildCustomerMessage(orderData);
    if (!recipientNumber) {
      return { success: false, error: "Número do cliente não informado no pedido" };
    }
    const result = await sendMessageViaProvider({
      config,
      toNumber: recipientNumber,
      message,
    });
    await supabase.from("whatsapp_message_logs").insert({
      user_id: userId,
      order_id: orderId,
      recipient_type: recipientType,
      recipient_number: recipientNumber,
      message_type: "text",
      status: result.success ? "sent" : "failed",
      error_message: result.error,
      sent_at: result.success ? new Date().toISOString() : null,
    });
    return result;
  }
}

function formatCurrencyBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function buildOwnerMessage(order: Order): string {
  const itemsList = (order.order_items || [])
    .map((item) => `${item.quantity}x ${item.products?.name || "Produto"} - ${formatCurrencyBRL(item.quantity * item.price_at_time)}`)
    .join("\n");

  return [
    "Novo pedido recebido",
    `Pedido #${order.id.slice(0, 8)}`,
    order.public_customer_name ? `Cliente: ${order.public_customer_name}` : undefined,
    itemsList ? `Itens:\n${itemsList}` : undefined,
    `Total: ${formatCurrencyBRL(order.total)}`,
    order.payment_method ? `Pagamento: ${order.payment_method}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildCustomerMessage(order: Order): string {
  return [
    order.public_customer_name ? `Olá ${order.public_customer_name}, recebemos seu pedido!` : "Recebemos seu pedido!",
    `Pedido #${order.id.slice(0, 8)}`,
    `Total: ${formatCurrencyBRL(order.total)}`,
  ].join("\n");
}

async function sendMessageViaProvider(params: { config: WhatsAppConfig; toNumber: string; message: string }): Promise<SendResult> {
  try {
    const { config, toNumber, message } = params;
    const cleanNumber = toNumber.replace(/\D/g, "");
    const formattedNumber = cleanNumber.startsWith("55") ? cleanNumber : `55${cleanNumber}`;

    const apiUrl = (config.api_url || "").trim().replace(/\/+$/, "");
    const apiKey = (config.api_key || "").trim();
    const instanceId = (config.instance_id || "").trim();

    if (config.service_provider && config.service_provider !== "evolution") {
      return { success: false, error: "Provedor configurado não é Evolution API" };
    }
    if (!apiUrl) {
      return { success: false, error: "Configuração incompleta: informe a API URL (api_url)" };
    }
    if (!apiKey) {
      return { success: false, error: "Configuração incompleta: informe a API Key (api_key)" };
    }
    if (!instanceId) {
      return { success: false, error: "Configuração incompleta: informe a Instance ID (instance_id)" };
    }

    const url = `${apiUrl}/message/sendText/${encodeURIComponent(instanceId)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey,
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
      const errorText = await response.text();
      return { success: false, error: `Erro Evolution API: ${response.status} - ${errorText}` };
    }

    const responseData = await response.json();
    const messageId = responseData?.key?.id || responseData?.messageId || responseData?.id;
    return { success: true, messageId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" };
  }
}
