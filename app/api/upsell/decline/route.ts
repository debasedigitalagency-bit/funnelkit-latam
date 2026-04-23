// app/api/upsell/decline/route.ts
// Registra cuando el cliente rechaza el upsell
// Útil para medir tasa de conversión del upsell

import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const { member_id, funnel_id, payment_id } = await request.json();

    const supabase = createServerClient();

    await supabase.from("analytics_events").insert({
      funnel_id,
      event: "upsell_declined",
      member_id,
      metadata: { original_payment_id: payment_id },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("[upsell/decline] Error:", error);
    // No falla en silencio — el usuario siempre continua a la página de gracias
    return Response.json({ success: true });
  }
}
