import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";
import { deserializeVapidKeys, sendPushNotification } from "https://esm.sh/web-push-browser@1.4.2";

type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  active: boolean;
};

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

function getVapidKeys(): { publicKey: string; privateKey: string; subject: string } | null {
  const publicKey = (Deno.env.get("VAPID_PUBLIC_KEY") ?? "").trim();
  const privateKey = (Deno.env.get("VAPID_PRIVATE_KEY") ?? "").trim();
  const subject = (Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@flux.app").trim();
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

function createServiceSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = getSupabaseUrl();
  const supabaseServiceKey = getServiceRoleKey();

  if (!supabaseUrl || !supabaseServiceKey) return null;

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function createAnonSupabaseClient(authHeader: string): SupabaseClient | null {
  const supabaseUrl = getSupabaseUrl();
  const anonKey = getAnonKey();

  if (!supabaseUrl || !anonKey) return null;

  return createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });
}

const supabase = createServiceSupabaseClient();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!supabase) {
    return new Response(
      JSON.stringify({ error: "Erro de configuração do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const vapid = getVapidKeys();
  if (!vapid) {
    return new Response(
      JSON.stringify({ error: "VAPID keys não configuradas" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const authHeader = req.headers.get("authorization") || "";
  const anon = createAnonSupabaseClient(authHeader);
  if (!anon) {
    return new Response(
      JSON.stringify({ error: "Erro de configuração do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { data: authData, error: authError } = await anon.auth.getUser();
  const user = authData?.user ?? null;
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Não autenticado" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const targetUserId = String(body?.user_id ?? user.id);
  if (targetUserId !== user.id) {
    return new Response(
      JSON.stringify({ error: "Não permitido" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const title = String(body?.title ?? "FLUX");
  const message = String(body?.body ?? "Você tem uma nova notificação.");
  const data = (body?.data && typeof body.data === "object") ? body.data : {};

  const { data: configRow } = await supabase
    .from("app_config")
    .select("notifications_enabled")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (configRow && configRow.notifications_enabled === false) {
    return new Response(
      JSON.stringify({ ok: true, sent: 0, reason: "disabled" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { data: subs, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth, active")
    .eq("user_id", targetUserId)
    .eq("active", true);

  if (subsError) {
    return new Response(
      JSON.stringify({ error: subsError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const list = (subs ?? []) as PushSubscriptionRow[];
  if (list.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, sent: 0, reason: "no_subscriptions" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const keyPair = await deserializeVapidKeys({
    publicKey: vapid.publicKey,
    privateKey: vapid.privateKey,
  });

  const payload = JSON.stringify({
    title,
    body: message,
    data,
  });

  let sent = 0;
  const failed: Array<{ id: string; status: number }> = [];

  for (const sub of list) {
    try {
      const res = await sendPushNotification(
        { publicKey: keyPair.publicKey, privateKey: keyPair.privateKey },
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        vapid.subject,
        payload,
        { algorithm: "aes128gcm", urgency: "high", ttl: 60 * 60 },
      );

      if (res.ok) {
        sent++;
        continue;
      }

      failed.push({ id: sub.id, status: res.status });

      if (res.status === 404 || res.status === 410) {
        await supabase.from("push_subscriptions").update({ active: false }).eq("id", sub.id);
      }
    } catch {
      failed.push({ id: sub.id, status: 0 });
    }
  }

  return new Response(
    JSON.stringify({ ok: true, sent, failed }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

