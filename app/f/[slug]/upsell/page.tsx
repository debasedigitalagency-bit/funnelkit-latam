"use client";

// app/f/[slug]/upsell/page.tsx
// Página de upsell one-click
// El cliente ya pagó — aquí le ofrecemos el producto adicional
// con UN SOLO CLIC, sin volver a ingresar la tarjeta

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// En producción esto vendría del servidor vía params/props
// Por ahora se lee desde searchParams para el MVP
export default function UpsellPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("pid") ?? "";
  const memberId = searchParams.get("mid") ?? "";

  const [slug, setSlug] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10 * 60); // 10 min urgencia

  useEffect(() => {
    params.then((p) => setSlug(p.slug));
  }, [params]);

  // Countdown de urgencia en el upsell
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // ─── Aceptar upsell — cobro off-session ────────────────────────────────────
  const handleAccept = async () => {
    if (!memberId) {
      // Si no tenemos member_id en la URL, redirigir a gracias
      // (el webhook ya guardó el payment_method, pero necesitamos el member_id)
      router.push(`/f/${slug}/gracias?pid=${paymentId}&upsell=accepted`);
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch("/api/upsell/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: memberId,
          funnel_id: "", // TODO: pasar funnel_id via searchParams
          payment_id: paymentId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setIsAccepted(true);
        setTimeout(() => {
          router.push(`/f/${slug}/gracias?pid=${paymentId}&upsell=accepted`);
        }, 1500);
      } else {
        // Si falla el cobro off-session, igual redirigir a gracias
        // El upsell es adicional — nunca bloquear la experiencia principal
        console.error("Error en upsell:", data.error);
        router.push(`/f/${slug}/gracias?pid=${paymentId}&upsell=failed`);
      }
    } catch (err) {
      console.error("Error aceptando upsell:", err);
      router.push(`/f/${slug}/gracias?pid=${paymentId}&upsell=failed`);
    }
  };

  // ─── Rechazar upsell ───────────────────────────────────────────────────────
  const handleDecline = async () => {
    // Registrar rechazo en analytics (fire-and-forget)
    fetch("/api/upsell/decline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        member_id: memberId,
        funnel_id: "",
        payment_id: paymentId,
      }),
    }).catch(() => {});

    router.push(`/f/${slug}/gracias?pid=${paymentId}&upsell=declined`);
  };

  const accentColor = "#F5A623"; // TODO: cargar desde config del embudo

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A0A0A",
        color: "#F0EDE8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        fontFamily: "'DM Sans', 'Inter', sans-serif",
      }}
    >
      <div style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>

        {/* Badge de urgencia */}
        <div
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: `${accentColor}15`,
            border: `1px solid ${accentColor}4D`,
            borderRadius: 20, padding: "6px 16px",
            fontSize: 11, fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase",
            color: accentColor, marginBottom: 24,
          }}
        >
          ⚡ Oferta única · Desaparece en {formatTime(timeLeft)}
        </div>

        {/* Headline */}
        <h1
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 34, fontWeight: 900,
            lineHeight: 1.2, marginBottom: 12,
          }}
        >
          ¿Quieres acelerar{" "}
          <em style={{ color: accentColor, fontStyle: "italic" }}>
            tus resultados
          </em>
          ?
        </h1>

        <p style={{ fontSize: 15, color: "#7A7570", lineHeight: 1.7, marginBottom: 32 }}>
          Añade el <strong style={{ color: "#F0EDE8" }}>Workshop Avanzado de Claude Code</strong> a
          tu pedido ahora con el precio especial de lanzamiento. Esta oferta{" "}
          <strong style={{ color: accentColor }}>solo aparece una vez</strong> y
          desaparece cuando salgas de esta página.
        </p>

        {/* Caja de la oferta */}
        <div
          style={{
            background: "#111",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 16, padding: "24px 28px",
            marginBottom: 28, textAlign: "left",
          }}
        >
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {[
              "3 horas de implementación en vivo con Claude Code",
              "Configuración de MCP servers para tu negocio",
              "Templates de agentes listos para producción",
              "Acceso de por vida + grabación del taller",
            ].map((item, i) => (
              <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#7A7570" }}>
                <span style={{ color: accentColor, fontWeight: 700 }}>→</span>
                {item}
              </li>
            ))}
          </ul>

          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 36, fontWeight: 700, color: accentColor,
              }}
            >
              $47
            </span>
            <span style={{ fontSize: 18, color: "#4A4540", textDecoration: "line-through" }}>
              $127
            </span>
            <span
              style={{
                background: "#2ECC7120", color: "#2ECC71",
                border: "1px solid #2ECC7130",
                borderRadius: 20, padding: "3px 10px",
                fontSize: 12, fontWeight: 600,
              }}
            >
              63% OFF
            </span>
          </div>
        </div>

        {/* Botón Aceptar */}
        <button
          onClick={handleAccept}
          disabled={isProcessing || isAccepted}
          style={{
            width: "100%",
            background: isAccepted ? "#2ECC71" : isProcessing ? "#333" : accentColor,
            color: "#0A0A0A",
            border: "none", borderRadius: 12,
            padding: "18px 24px",
            fontSize: 16, fontWeight: 700,
            cursor: isProcessing || isAccepted ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            marginBottom: 12,
          }}
        >
          {isAccepted
            ? "✓ ¡Añadido a tu pedido!"
            : isProcessing
            ? "Procesando tu pago..."
            : `Sí, añadir Workshop por $47 →`}
        </button>

        {/* Nota de one-click */}
        <p style={{ fontSize: 12, color: "#4A4540", marginBottom: 20 }}>
          🔐 Un solo clic · Se cobra con el mismo método de pago · Sin ingresar datos nuevamente
        </p>

        {/* Botón Rechazar */}
        <button
          onClick={handleDecline}
          disabled={isProcessing}
          style={{
            width: "100%",
            background: "transparent", border: "none",
            color: "#4A4540", fontSize: 12,
            cursor: isProcessing ? "not-allowed" : "pointer",
            padding: "8px",
            fontFamily: "'DM Sans', sans-serif",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#7A7570")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#4A4540")}
        >
          No gracias, no necesito acelerar mis resultados
        </button>
      </div>
    </div>
  );
}
