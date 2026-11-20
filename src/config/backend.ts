/**
 * Match Control backend (Supabase project "Match Coontrol", dedicated to this event).
 * The publishable key is designed to be public: it can only call the functions granted to
 * anonymous users (reading the schedule and results). Never put a secret or service-role key here.
 */
export const SUPABASE = {
  url: 'https://dbtviepuwvtvslhgfolh.supabase.co',
  publishableKey: 'sb_publishable_Kp88gRMfpPIgg5_IvRxKKg_FI51FUBI',
} as const
