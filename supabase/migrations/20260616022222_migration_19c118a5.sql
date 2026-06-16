-- Add tarikh_tandatangan_c1 to osc_decisions table
ALTER TABLE public.osc_decisions 
ADD COLUMN IF NOT EXISTS tarikh_tandatangan_c1 DATE;

COMMENT ON COLUMN public.osc_decisions.tarikh_tandatangan_c1 IS 
'Tarikh Borang C1 ditandatangani oleh YDP (Yang Dipertua Majlis)';