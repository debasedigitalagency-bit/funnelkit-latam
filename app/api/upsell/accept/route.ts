// app/api/upsell/accept/route.ts
// Cobra el upsell directamente usando el payment_method guardado
// El cliente NO necesita ingresar su tarjeta de nuevo — one-click real

import { NextRequest } from "next/server";
import { whopsdk, WHOP_COMPANY_ID } from "@/lib/whop";
import { createServerClient } from "@/lib/supabase";
import type { AcceptUpsellPayload, AcceptUpsellResponse } from "@/types";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body: AcceptUpsellPayload = await request.json();
    const { member_id, funnel_id, payment_id } = body;

    if (!member_id || !funnel_id) {
      return Response.json(
        { error: "Faltan parámetros: member_id y funnel_id son requeridos" } as AcceptUpsellResponse,
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // ─── 1. Obtener el método de pago guardado ────────────────────────────────
    const { data: pmData, error: pmError } = await supabase
      .from("payment_methods")
      .select("payment_method_id")
      .eq("member_id", member_id)
      .eq("funnel_id", funnel_id)
      .single();

    if (pmError || !pmData) {
      console.error("[upsell/accept] No se encontró payment_method:", { member_id, funnel_id });
      return Response.json(
        {
          success: false,
          error: "No se encontró método de pago guardado. El cliente debe completar el pago principal primero.",
        } as AcceptUpsellResponse,
        { status: 404 }
      );
    }

    // ─── 2. Obtener el precio del upsell desde el config del embudo ───────────
    const { data: funnelData } = await supabase
      .from("funnels")
      .select("config")
      .eq("id", funnel_id)
      .single();

    const config = funnelData?.config as Record<string, unknown>;
    const upsell = config?.upsell as { price: number; name: string } | undefined;

    if (!upsell) {
      return Response.json(
        { success: false, error: "Este embudo no tiene upsell configurado" } as AcceptUpsellResponse,
        { status: 400 }
      );
    }

    // ─── 3. Cobrar off-session — sin interacción del cliente ─────────────────
    // Este es el núcleo del one-click upsell:
    // Whop cobra directamente usando el payment_method guardado
    const upsellPayment = await whopsdk.payments.create({
      plan: {
        initial_price: upsell.price,
        currency: "usd",
        plan_type: "one_time",
      },
      company_id: WHOP_COMPANY_ID,
      member_id: member_id,
      payment_method_id: pmData.payment_method_id,
    });

    // ─── 4. Registrar en analytics ────────────────────────────────────────────
    await supabase.from("analytics_events").insert({
      funnel_id,
      event: "upsell_accepted",
      payment_id: String(upsellPayment.id),
      member_id,
      amount: upsell.price,
      metadata: {
        original_payment_id: payment_id,
        upsell_name: upsell.name,
        payment_method_id: pmData.payment_method_id,
      },
    });

    console.log("[upsell/accept] Upsell cobrado exitosamente:", {
      upsell_payment_id: upsellPayment.id,
      member_id,
      amount: upsell.price,
    });

    return Response.json({
      success: true,
      upsell_payment_id: String(upsellPayment.id),
    } as AcceptUpsellResponse);
  } catch (error) {
    console.error("[upsell/accept] Error al cobrar upsell:", error);
    return Response.json(
      {
        success: false,
        error: "Error al procesar el upsell. El pago principal no fue afectado.",
      } as AcceptUpsellResponse,
      { status: 500 }
    );
  }
}
