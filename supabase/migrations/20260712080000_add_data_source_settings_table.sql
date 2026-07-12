-- Data source mode settings for alternative data adapters
CREATE TABLE public.data_source_settings (
  source text PRIMARY KEY,
  mode text NOT NULL DEFAULT 'mock',
  base_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_source_settings TO authenticated;
GRANT ALL ON public.data_source_settings TO service_role;
ALTER TABLE public.data_source_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated select" ON public.data_source_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated insert" ON public.data_source_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated update" ON public.data_source_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated delete" ON public.data_source_settings FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.touch_updated_at_data_source_settings()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER data_source_settings_updated_at
BEFORE UPDATE ON public.data_source_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_data_source_settings();

INSERT INTO public.data_source_settings (source)
VALUES ('gst'), ('upi'), ('aa'), ('epfo'), ('electricity')
ON CONFLICT (source) DO NOTHING;
