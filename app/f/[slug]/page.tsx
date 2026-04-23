// app/f/[slug]/page.tsx
// Página pública del checkout — cargada server-side desde Supabase
// Renderiza el diseño personalizado + embed de Whop incrustado

import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import type { FunnelConfig } from "@/types";
import { CheckoutClient } from "./checkout-client";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ pid?: string }>;
}

export default async function CheckoutPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createServerClient();

  // Cargar embudo por slug
  const { data: funnel, error } = await supabase
    .from("funnels")
    .select("id, slug, config, status")
    .eq("slug", slug)
    .single();

  if (error || !funnel || funnel.status !== "active") {
    notFound();
  }

  // Cargar order bumps del embudo
  const { data: bumps } = await supabase
    .from("order_bumps")
    .select("id, name, description, price, display_order")
    .eq("funnel_id", funnel.id)
    .order("display_order", { ascending: true });

  const config = funnel.config as FunnelConfig;

  // Registrar visita (fire-and-forget — no bloquea el render)
  supabase.from("analytics_events").insert({
    funnel_id: funnel.id,
    event: "visit",
  }).then(() => {}).catch(() => {});

  return (
    <CheckoutClient
      funnelId={funnel.id}
      slug={slug}
      config={config}
      bumps={bumps ?? []}
    />
  );
}

// Metadata dinámica para SEO
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const supabase = createServerClient();

  const { data: funnel } = await supabase
    .from("funnels")
    .select("config")
    .eq("slug", slug)
    .single();

  if (!funnel) return { title: "Checkout" };

  const config = funnel.config as FunnelConfig;

  return {
    title: config.checkout.headline,
    description: config.main_product.description,
  };
}
