declare const Deno: {
  env: { get(key: string): string | undefined };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

declare module "https://esm.sh/@supabase/supabase-js@2.48.1" {
  export type SupabaseClient = any;
  export function createClient(...args: any[]): SupabaseClient;
}

declare module "https://esm.sh/web-push-browser@1.4.2" {
  export function deserializeVapidKeys(...args: any[]): Promise<any>;
  export function sendPushNotification(...args: any[]): Promise<Response>;
}

