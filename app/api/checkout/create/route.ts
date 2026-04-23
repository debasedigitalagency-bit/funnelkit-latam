// app/api/checkout/create/route.ts
// Crea una CheckoutConfiguration en Whop con el precio total dinámico
// (producto principal + order bumps seleccionados por el usuario)

import { NextRequest } from "next/server";
import { whopsdk, WHOP_COMPANY_ID } from "@/lib/whop";
import { createServerClient } from "@/lib/supabase";
import type { CreateCheckoutPayload, CreateCheckoutResponse } from "@/types";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body: CreateCheckoutPayload = await request.json();
    const { funnel_id, slug, selected_bump_ids } = body;

    if (!funnel_id || !slug) {
      return Response.json(
        { error: "Faltan parámetros requeridos: funnel_id y slug" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // ─── 1. Cargar el embudo y sus order bumps desde Supabase ────────────────
    const [funnelResult, bumpsResult] = await Promise.all([
      supabase
        .from("funnels")
        .select("id, config, status")
        .eq("id", funnel_id)
        .eq("slug", slug)
        .single(),
      supabase
        .from("order_bumps")
        .select("id, price, name, whop_plan_id")
        .eq("funnel_id", funnel_id)
        .in("id", selected_bump_ids.length > 0 ? selected_bump_ids : ["none"]),
    ]);

    if (funnelResult.error || !funnelResult.data) {
      return Response.json(
        { error: "Embudo no encontrado" },
        { status: 404 }
      );
    }

    const funnel = funnelResult.data;

    if (funnel.status !== "active") {
      return Response.json(
        { error: "Este embudo no está activo" },
        { status: 403 }
      );
    }

    const config = funnel.config as Record<string, unknown>;
    const mainProduct = config.main_product as { price: number };

    // ─── 2. Calcular precio total ─────────────────────────────────────────────
    const basePrice = mainProduct.price;
    const selectedBumps = bumpsResult.data ?? [];
    const bumpsTotal = selectedBumps.reduce((sum, b) => sum + b.price, 0);
    const totalPrice = basePrice + bumpsTotal;

    // ─── 3. Crear CheckoutConfiguration en Whop ──────────────────────────────
    // IMPORTANTE: setupFutureUsage permite el cobro off-session del upsell
    // El precio incluye el producto principal + bumps seleccionados en un solo cobro
    const checkoutConfig = await whopsdk.checkoutConfigurations.create({
      company_id: WHOP_COMPANY_ID,
      plan: {
        initial_price: totalPrice,
        plan_type: "one_time",
      },
      // Guardamos contexto en metadata para usarlo en el webhook
      metadata: {
        funnel_id,
        slug,
        base_price: String(basePrice),
        bumps_total: String(bumpsTotal),
        selected_bump_ids: selected_bump_ids.join(","),
        selected_bump_names: selectedBumps.map((b) => b.name).join(" | "),
      },
    });

    // ─── 4. Registrar visita al checkout en analytics ────────────────────────
    await supabase.from("analytics_events").insert({
      funnel_id,
      event: "checkout_view",
      metadata: {
        session_id: checkoutConfig.id,
        total_price: totalPrice,
        bumps_count: selectedBumps.length,
      },
    });

    const response: CreateCheckoutResponse = {
      session_id: checkoutConfig.id,
      plan_id: checkoutConfig.plan?.id ?? "",
      total_price: totalPrice,
    };

    return Response.json(response);
  } catch (error) {
    console.error("[checkout/create] Error:", error);
    return Response.json(
      { error: "Error interno al crear el checkout" },
      { status: 500 }
    );
  }
}
