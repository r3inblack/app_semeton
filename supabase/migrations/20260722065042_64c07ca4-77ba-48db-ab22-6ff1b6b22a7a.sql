ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS telegram_group_bot_token text,
  ADD COLUMN IF NOT EXISTS telegram_group_chat_id text;