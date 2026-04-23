"use client";

// app/f/[slug]/gracias/page.tsx
// Página de confirmación final
// Muestra resumen del pedido y siguiente paso de acceso

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function GraciasPage({ params }: { params: Promise<{ slug: string }> }) {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("pid") ?? "";
  const upsellStatus = searchParams.get("upsell"); // "accepted" | "declined" | "failed" | null
  const [slug, setSlug] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    params.then((p) => setSlug(p.slug));
    // Animación de entrada
    setTimeout(() => setVisible(true), 100);
  }, [params]);

  const upsellAccepted = upsellStatus === "accepted";
  const accentColor = "#F5A623";

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
      <div
        style={{
          maxWidth: 520, width: "100%", textAlign: "center",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.5s ease",
        }}
      >
        {/* Ícono animado */}
        <div style={{ fontSize: 64, marginBottom: 24, display: "block" }}>
          🎉
        </div>

        {/* Headline */}
        <h1
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 40, fontWeight: 900,
            lineHeight: 1.2, marginBottom: 12,
          }}
        >
          ¡Bienvenido al{" "}
          <em style={{ color: accentColor, fontStyle: "italic" }}>Arsenal</em>!
        </h1>

        <p style={{ fontSize: 15, color: "#7A7570", lineHeight: 1.7, marginBottom: 32 }}>
          Tu acceso está siendo activado ahora mismo. En los próximos minutos
          recibirás un <strong style={{ color: "#F0EDE8" }}>mensaje de WhatsApp</strong> con
          las instrucciones para acceder a la comunidad en Whop.
        </p>

        {/* Resumen del pedido */}
        <div
          style={{
            background: "#111",
            border: `1px solid ${accentColor}4D`,
            borderRadius: 16, padding: "20px 24px",
            marginBottom: 28, textAlign: "left",
          }}
        >
          <div
            style={{
              fontSize: 11, fontWeight: 700,
              letterSpacing: "0.15em", textTransform: "uppercase",
              color: accentColor, marginBottom: 14,
            }}
          >
            Tu pedido confirmado
          </div>

          {/* Items — en producción vendría del backend */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#7A7570", padding: "4px 0" }}>
            <span>El Arsenal del Operador I.A.</span>
            <span style={{ color: "#F0EDE8" }}>$17.00</span>
          </div>

          {upsellAccepted && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#7A7570", padding: "4px 0" }}>
              <span>Workshop Avanzado Claude Code</span>
              <span style={{ color: accentColor }}>$47.00</span>
            </div>
          )}

          <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "10px 0" }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#F0EDE8" }}>Total cobrado</span>
            <span
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 24, fontWeight: 700, color: accentColor,
              }}
            >
              ${upsellAccepted ? "64.00" : "17.00"}
            </span>
          </div>
        </div>

        {/* ID de referencia */}
        {paymentId && (
          <p style={{ fontSize: 11, color: "#4A4540", marginBottom: 24 }}>
            Referencia de pago: <code style={{ fontFamily: "monospace", color: "#7A7570" }}>{paymentId}</code>
          </p>
        )}

        {/* CTA */}
        <button
          onClick={() => window.location.href = "https://whop.com/dashboard"}
          style={{
            display: "inline-block",
            background: accentColor, color: "#0A0A0A",
            borderRadius: 12, padding: "14px 32px",
            fontSize: 15, fontWeight: 700,
            border: "none", cursor: "pointer",
            transition: "all 0.2s",
            fontFamily: "'DM Sans', sans-serif",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
            (e.currentTarget as HTMLButtonElement).style.background = "#FFBC42";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLButtonElement).style.background = accentColor;
          }}
        >
          Ir a mi acceso en Whop →
        </button>
      </div>
    </div>
  );
}
