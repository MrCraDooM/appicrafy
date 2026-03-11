-- Add gemini_api_key to user_plans so paid users can use their own key
ALTER TABLE public.user_plans ADD COLUMN IF NOT EXISTS gemini_api_key TEXT;
