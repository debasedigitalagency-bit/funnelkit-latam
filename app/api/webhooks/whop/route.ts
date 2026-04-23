// app/api/webhooks/whop/route.ts
// Recibe y procesa todos los webhooks de Whop
// CRÍTICO: debe responder 200 rápido — usar waitUntil para procesamiento async

import { waitUntil } from "@vercel/functions";
import type { NextRequest } from "next/server";
import { whopsdk } from "@/lib/whop";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: NextRequest): Promise<Response> {
  let webhookData: Awaited<ReturnType<typeof whopsdk.webhooks.unwrap>>;

  try {
    const requestBodyText = await request.text();
    const headers = Object.fromEntries(request.headers);

    // Validar firma del webhook — OBLIGATORIO según la documentación de Whop
    webhookData = whopsdk.webhooks.unwrap(requestBodyText, { headers });
  } catch (err) {
    // Firma inválida → rechazar
    console.error("[webhook] Firma inválida:", err);
    return new Response("Unauthorized", { status: 401 });
  }

  // Responder 200 inmediatamente — el procesamiento ocurre en background
  switch (webhookData.type) {
    case "payment.succeeded":
      waitUntil(handlePaymentSucceeded(webhookData.data as Record<string, unknown>));
      break;

    case "setup_intent.succeeded":
      // Este evento llega porque usamos setupFutureUsage="off_session"
      // Aquí guardamos el payment_method_id para cobrar el upsell después
      waitUntil(handleSetupIntentSucceeded(webhookData.data as Record<string, unknown>));
      break;

    case "membership.went_valid":
      // Membresía activada → aquí podrías disparar Connect WA
      waitUntil(handleMembershipActivated(webhookData.data as Record<string, unknown>));
      break;

    case "payment.failed":
      waitUntil(handlePaymentFailed(webhookData.data as Record<string, unknown>));
      break;

    default:
      // Evento no manejado — registrar para debugging
      console.log("[webhook] Evento no manejado:", webhookData.type);
  }

  return new Response("OK", { status: 200 });
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handlePaymentSucceeded(payment: Record<string, unknown>) {
  const supabase = createServerClient();

  const metadata = payment.metadata as Record<string, string> | null;
  const funnel_id = metadata?.funnel_id;
  const member = payment.member as { id: string; email?: string } | null;

  console.log("[webhook] payment.succeeded", {
    payment_id: payment.id,
    amount: payment.amount,
    member_id: member?.id,
    funnel_id,
  });

  // Registrar conversión en analytics
  await supabase.from("analytics_events").insert({
    funnel_id: funnel_id ?? null,
    event: "conversion",
    payment_id: String(payment.id),
    member_id: member?.id ?? null,
    amount: Number(payment.amount),
    metadata: {
      currency: payment.currency,
      selected_bump_ids: metadata?.selected_bump_ids,
      selected_bump_names: metadata?.selected_bump_names,
      session_id: metadata?.session_id,
    },
  });
}

async function handleSetupIntentSucceeded(setupIntent: Record<string, unknown>) {
  const supabase = createServerClient();

  // setupIntent.payment_method.id — necesario para el cobro off-session del upsell
  const paymentMethod = setupIntent.payment_method as { id: string } | null;
  const member = setupIntent.member as { id: string } | null;
  const metadata = setupIntent.metadata as Record<string, string> | null;
  const funnel_id = metadata?.funnel_id;

  if (!paymentMethod?.id || !member?.id) {
    console.error("[webhook] setup_intent sin payment_method o member:", setupIntent);
    return;
  }

  console.log("[webhook] setup_intent.succeeded", {
    payment_method_id: paymentMethod.id,
    member_id: member.id,
    funnel_id,
  });

  // Guardar método de pago para uso posterior en el upsell one-click
  // upsert: si ya existe para este member+funnel, actualizar
  const { error } = await supabase.from("payment_methods").upsert(
    {
      member_id: member.id,
      payment_method_id: paymentMethod.id,
      funnel_id: funnel_id ?? null,
    },
    { onConflict: "member_id, funnel_id" }
  );

  if (error) {
    console.error("[webhook] Error guardando payment_method:", error);
  }
}

async function handleMembershipActivated(membership: Record<string, unknown>) {
  // Aquí puedes conectar con Connect WA para enviar mensaje de bienvenida
  // por WhatsApp en el momento exacto en que se activa la membresía
  const member = membership.member as { id: string; email?: string } | null;

  console.log("[webhook] membership.went_valid — member:", member?.id);

  // TODO: llamar a Connect WA API para enviar mensaje de bienvenida
  // await sendWhatsAppWelcome({ member_id: member?.id, ... });
}

async function handlePaymentFailed(payment: Record<string, unknown>) {
  const member = payment.member as { email?: string } | null;
  const metadata = payment.metadata as Record<string, string> | null;

  console.error("[webhook] payment.failed", {
    payment_id: payment.id,
    failure_message: payment.failure_message,
    member_email: member?.email,
    funnel_id: metadata?.funnel_id,
  });

  // TODO: notificar al usuario por email/WhatsApp que el pago falló
}
