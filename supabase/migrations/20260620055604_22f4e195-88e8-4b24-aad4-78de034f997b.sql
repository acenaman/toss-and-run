CREATE TABLE public.cloud_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  teams jsonb NOT NULL DEFAULT '[]'::jsonb,
  matches jsonb NOT NULL DEFAULT '[]'::jsonb,
  active_match_id text,
  device_id text NOT NULL DEFAULT '',
  client_updated_at bigint NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cloud_snapshots_user_id_key UNIQUE (user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cloud_snapshots TO authenticated;
GRANT ALL ON public.cloud_snapshots TO service_role;

ALTER TABLE public.cloud_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cricket snapshot"
ON public.cloud_snapshots
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cricket snapshot"
ON public.cloud_snapshots
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cricket snapshot"
ON public.cloud_snapshots
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cricket snapshot"
ON public.cloud_snapshots
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_cloud_snapshots_updated_at
BEFORE UPDATE ON public.cloud_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();