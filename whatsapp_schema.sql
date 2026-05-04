-- WHATSAPP INTEGRATION SCHEMA
-- This script adds tables for WhatsApp notifications integration.
-- SAFE TO RUN MULTIPLE TIMES (Idempotent)

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLES

-- WhatsApp Config (User-specific WhatsApp integration settings)
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  service_provider TEXT NOT NULL DEFAULT 'evolution', -- 'evolution'
  api_key TEXT,
  api_url TEXT,
  instance_id TEXT,
  owner_template_name TEXT,
  customer_template_name TEXT,
  cloud_api_version TEXT DEFAULT 'v20.0',
  owner_whatsapp_number TEXT,
  enable_owner_notifications BOOLEAN DEFAULT true,
  enable_customer_notifications BOOLEAN DEFAULT true,
  customer_notification_delay_minutes INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Backward/forward compatible: ensure new columns exist even if table was created previously
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS owner_template_name TEXT;
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS customer_template_name TEXT;
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS cloud_api_version TEXT;
ALTER TABLE whatsapp_config ALTER COLUMN cloud_api_version SET DEFAULT 'v20.0';
ALTER TABLE whatsapp_config ALTER COLUMN service_provider SET DEFAULT 'evolution';

-- WhatsApp Message Logs (History of all sent messages)
CREATE TABLE IF NOT EXISTS whatsapp_message_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  recipient_type TEXT NOT NULL, -- 'owner' or 'customer'
  recipient_number TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'image', 'document'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. INDEXES (For performance)
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_user_id ON whatsapp_config(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_user_id ON whatsapp_message_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_order_id ON whatsapp_message_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status ON whatsapp_message_logs(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created_at ON whatsapp_message_logs(created_at DESC);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_message_logs ENABLE ROW LEVEL SECURITY;

-- Policies for whatsapp_config
DROP POLICY IF EXISTS "Usuários veem apenas suas configurações de WhatsApp" ON whatsapp_config;
CREATE POLICY "Usuários veem apenas suas configurações de WhatsApp"
  ON whatsapp_config
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for whatsapp_message_logs
DROP POLICY IF EXISTS "Usuários veem apenas seus logs de WhatsApp" ON whatsapp_message_logs;
CREATE POLICY "Usuários veem apenas seus logs de WhatsApp"
  ON whatsapp_message_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. UPDATED_AT TRIGGER FUNCTION (Reusable)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. TRIGGERS FOR updated_at
DROP TRIGGER IF EXISTS update_whatsapp_config_updated_at ON whatsapp_config;
CREATE TRIGGER update_whatsapp_config_updated_at
  BEFORE UPDATE ON whatsapp_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. COMMENTS
COMMENT ON TABLE whatsapp_config IS 'Configurações de integração com WhatsApp por usuário';
COMMENT ON TABLE whatsapp_message_logs IS 'Histórico de todas as mensagens WhatsApp enviadas';
COMMENT ON COLUMN whatsapp_config.service_provider IS 'Provedor de API WhatsApp: evolution';
COMMENT ON COLUMN whatsapp_message_logs.recipient_type IS 'Tipo de destinatário: owner (dono da loja) ou customer (cliente)';
COMMENT ON COLUMN whatsapp_message_logs.status IS 'Status da mensagem: pending, sent, delivered, failed';
