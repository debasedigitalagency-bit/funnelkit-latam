// ─── Tipos base del sistema FunnelKit ───────────────────────────────────────

export type FunnelStatus = "draft" | "active" | "archived";
export type AnalyticsEvent = "visit" | "checkout_view" | "conversion" | "upsell_accepted" | "upsell_declined";

export interface OrderBump {
  id: string;
  funnel_id: string;
  whop_plan_id: string;
  name: string;
  description: string;
  price: number;
  display_order: number;
}

export interface FunnelConfig {
  // Producto principal
  main_product: {
    whop_plan_id: string;
    name: string;
    description: string;
    price: number;
    original_price?: number;
    image_url?: string;
    benefits: string[];
  };
  // Upsell post-pago
  upsell?: {
    whop_plan_id: string;
    name: string;
    description: string;
    price: number;
    original_price?: number;
    benefits: string[];
  };
  // Apariencia
  branding: {
    accent_color: string;       // default: #F5A623
    logo_url?: string;
    company_name: string;
  };
  // Configuración de checkout
  checkout: {
    headline: string;
    subheadline?: string;
    cta_text: string;
    countdown_minutes?: number;  // si se define, muestra countdown
    testimonials?: Testimonial[];
    trust_seals?: TrustSeal[];
  };
  // Redirección
  confirmation_url?: string;    // si no, usa /f/[slug]/gracias
}

export interface Testimonial {
  name: string;
  role: string;
  avatar_initials: string;
  text: string;
  rating: number;
}

export interface TrustSeal {
  icon: string;
  label: string;
}

export interface Funnel {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  config: FunnelConfig;
  status: FunnelStatus;
  created_at: string;
}

// ─── Payload para crear checkout ─────────────────────────────────────────────
export interface CreateCheckoutPayload {
  funnel_id: string;
  slug: string;
  selected_bump_ids: string[];  // IDs de order bumps seleccionados
}

export interface CreateCheckoutResponse {
  session_id: string;   // checkoutConfig.id → WhopCheckoutEmbed sessionId
  plan_id: string;      // para el embed HTML fallback
  total_price: number;
}

// ─── Payload para aceptar upsell ─────────────────────────────────────────────
export interface AcceptUpsellPayload {
  member_id: string;
  funnel_id: string;
  payment_id: string;   // payment_id del pago principal (para trazabilidad)
}

export interface AcceptUpsellResponse {
  success: boolean;
  upsell_payment_id?: string;
  error?: string;
}
