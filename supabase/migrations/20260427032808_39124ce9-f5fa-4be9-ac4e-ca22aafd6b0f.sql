
CREATE TABLE public.nasabah (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nama TEXT NOT NULL,
  item_dibeli TEXT NOT NULL,
  uang_muka NUMERIC NOT NULL DEFAULT 0,
  jumlah_angsuran INTEGER NOT NULL,
  rp_per_angsuran NUMERIC NOT NULL,
  tgl_mulai DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'aktif',
  whatsapp TEXT,
  username TEXT UNIQUE,
  password TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.angsuran (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nasabah_id UUID NOT NULL REFERENCES public.nasabah(id) ON DELETE CASCADE,
  nomor_angsuran INTEGER NOT NULL,
  tanggal DATE NOT NULL,
  rp NUMERIC NOT NULL,
  keterangan TEXT,
  status_bayar TEXT NOT NULL DEFAULT 'belum',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (nasabah_id, nomor_angsuran)
);

CREATE TABLE public.keuangan (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  kategori TEXT NOT NULL,
  nominal NUMERIC NOT NULL,
  keterangan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_angsuran_nasabah ON public.angsuran(nasabah_id);
CREATE INDEX idx_nasabah_username ON public.nasabah(username);

ALTER TABLE public.nasabah ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.angsuran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keuangan ENABLE ROW LEVEL SECURITY;

-- App uses hardcoded demo accounts (no Supabase auth). Open access via anon key.
CREATE POLICY "open read nasabah" ON public.nasabah FOR SELECT USING (true);
CREATE POLICY "open write nasabah" ON public.nasabah FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "open read angsuran" ON public.angsuran FOR SELECT USING (true);
CREATE POLICY "open write angsuran" ON public.angsuran FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "open read keuangan" ON public.keuangan FOR SELECT USING (true);
CREATE POLICY "open write keuangan" ON public.keuangan FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_nasabah_updated BEFORE UPDATE ON public.nasabah
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_angsuran_updated BEFORE UPDATE ON public.angsuran
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
