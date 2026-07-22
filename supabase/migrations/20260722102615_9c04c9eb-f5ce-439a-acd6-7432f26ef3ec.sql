
CREATE TABLE public.telegram_webhook_logs (
  id BIGSERIAL PRIMARY KEY,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  from_id TEXT,
  from_name TEXT,
  chat_id TEXT,
  text TEXT,
  reply_to_text TEXT,
  status TEXT NOT NULL,
  detail TEXT,
  raw JSONB
);
CREATE INDEX idx_tg_webhook_logs_received_at ON public.telegram_webhook_logs (received_at DESC);
GRANT SELECT ON public.telegram_webhook_logs TO authenticated;
GRANT ALL ON public.telegram_webhook_logs TO service_role;
ALTER TABLE public.telegram_webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admin_read_webhook_logs" ON public.telegram_webhook_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
