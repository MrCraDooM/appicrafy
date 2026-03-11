
-- Create project_shares table for QR code expiring share links
CREATE TABLE public.project_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own shares"
  ON public.project_shares FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can read share by token"
  ON public.project_shares FOR SELECT TO anon, authenticated
  USING (true);

CREATE INDEX idx_project_shares_token ON public.project_shares(token);
CREATE INDEX idx_project_shares_project_id ON public.project_shares(project_id);
