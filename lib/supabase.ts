import { createClient } from "@supabase/supabase-js";

// ─── Server-side (con service key, acceso total) ─────────────────────────────
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ─── Client-side (con anon key, respeta RLS) ─────────────────────────────────
export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Tipos de las tablas (se pueden expandir con supabase gen types)
export interface FunnelRow {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  config: Record<string, unknown>;
  status: string;
  created_at: string;
}

export interface OrderBumpRow {
  id: string;
  funnel_id: string;
  whop_plan_id: string;
  name: string;
  description: string;
  price: number;
  display_order: number;
}

export interface PaymentMethodRow {
  id: string;
  member_id: string;
  payment_method_id: string;
  funnel_id: string;
  created_at: string;
}

export interface AnalyticsEventRow {
  id: string;
  funnel_id: string;
  event: string;
  payment_id?: string;
  member_id?: string;
  amount?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
}
