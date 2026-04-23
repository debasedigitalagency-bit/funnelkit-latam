"use client";

// app/f/[slug]/checkout-client.tsx
// Client Component: lógica interactiva del checkout
// - Selección de order bumps con precio dinámico
// - Creación del CheckoutConfiguration vía API propia
// - Renderizado del WhopCheckoutEmbed
// - Redirección al upsell tras pago exitoso

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import type { FunnelConfig } from "@/types";

interface OrderBumpOption {
  id: string;
  name: string;
  description: string;
  price: number;
}

interface Props {
  funnelId: string;
  slug: string;
  config: FunnelConfig;
  bumps: OrderBumpOption[];
}

export function CheckoutClient({ funnelId, slug, config, bumps }: Props) {
  const router = useRouter();
  const [selectedBumpIds, setSelectedBumpIds] = useState<Set<string>>(new Set());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [totalPrice, setTotalPrice] = useState(config.main_product.price);
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [timeLeft, setTimeLeft] = useState(
    (config.checkout.countdown_minutes ?? 30) * 60
  );

  const accentColor = config.branding.accent_color || "#F5A623";

  // ─── Countdown ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!config.checkout.countdown_minutes) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [config.checkout.countdown_minutes]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, "0");
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  // ─── Precio dinámico ────────────────────────────────────────────────────────
  useEffect(() => {
    const bumpsTotal = bumps
      .filter((b) => selectedBumpIds.has(b.id))
      .reduce((sum, b) => sum + b.price, 0);
    setTotalPrice(config.main_product.price + bumpsTotal);
  }, [selectedBumpIds, bumps, config.main_product.price]);

  // ─── Toggle bump ───────────────────────────────────────────────────────────
  const toggleBump = (id: string) => {
    setSelectedBumpIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    // Reset checkout cuando cambia la selección
    setSessionId(null);
    setCheckoutReady(false);
  };

  // ─── Crear checkout configuration en Whop ──────────────────────────────────
  const createCheckout = useCallback(async () => {
    setIsLoadingCheckout(true);
    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          funnel_id: funnelId,
          slug,
          selected_bump_ids: Array.from(selectedBumpIds),
        }),
      });

      if (!res.ok) throw new Error("Error al crear checkout");

      const data = await res.json();
      setSessionId(data.session_id);
      setPlanId(data.plan_id);
      setCheckoutReady(true);
    } catch (err) {
      console.error("Error creando checkout:", err);
    } finally {
      setIsLoadingCheckout(false);
    }
  }, [funnelId, slug, selectedBumpIds]);

  // ─── Manejar pago completado ───────────────────────────────────────────────
  const handlePaymentComplete = useCallback(
    (paymentId: string) => {
      // Si hay upsell configurado → ir al upsell
      // Si no → ir directo a gracias
      if (config.upsell) {
        router.push(`/f/${slug}/upsell?pid=${paymentId}`);
      } else {
        const confirmationUrl = config.confirmation_url || `/f/${slug}/gracias`;
        router.push(`${confirmationUrl}?pid=${paymentId}`);
      }
    },
    [config.upsell, config.confirmation_url, slug, router]
  );

  // ─── Whop Checkout Embed (HTML fallback via data attributes) ───────────────
  useEffect(() => {
    if (!checkoutReady || !sessionId || !planId) return;

    // Inicializar el embed de Whop cuando el sessionId está listo
    const container = document.getElementById("whop-checkout-container");
    if (container) {
      container.setAttribute("data-whop-checkout-plan-id", planId);
      container.setAttribute("data-whop-checkout-session", sessionId);
      container.setAttribute(
        "data-whop-checkout-return-url",
        `${window.location.origin}/f/${slug}/upsell`
      );
      container.setAttribute("data-whop-checkout-theme", "dark");
      container.setAttribute("data-whop-checkout-theme-accent-color", accentColor);
    }
  }, [checkoutReady, sessionId, planId, slug, accentColor]);

  const selectedBumps = bumps.filter((b) => selectedBumpIds.has(b.id));

  return (
    <>
      {/* Script del Whop Checkout Embed */}
      <Script
        src="https://js.whop.com/static/checkout/loader.js"
        strategy="afterInteractive"
      />

      <div
        style={{
          minHeight: "100vh",
          background: "#0A0A0A",
          color: "#F0EDE8",
          fontFamily: "'DM Sans', 'Inter', sans-serif",
        }}
      >
        {/* ─── Layout dos columnas ─── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 480px",
            maxWidth: 1200,
            margin: "0 auto",
            minHeight: "100vh",
          }}
          className="checkout-layout"
        >
          {/* ═══ COLUMNA IZQUIERDA: Info del producto (estilo Hotmart) ═══ */}
          <div
            style={{
              padding: "64px 56px 64px 40px",
              borderRight: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            {/* Logo / Brand */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48 }}>
              {config.branding.logo_url ? (
                <img src={config.branding.logo_url} alt={config.branding.company_name} height={32} />
              ) : (
                <div
                  style={{
                    width: 32, height: 32,
                    background: accentColor,
                    borderRadius: 8,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 900, fontSize: 16, color: "#0A0A0A",
                  }}
                >
                  {config.branding.company_name.charAt(0).toUpperCase()}
                </div>
              )}
              <span
                style={{
                  fontSize: 13, fontWeight: 600, color: "#7A7570",
                  letterSpacing: "0.08em", textTransform: "uppercase",
                }}
              >
                {config.branding.company_name}
              </span>
            </div>

            {/* Imagen + info del producto */}
            <div
              style={{
                background: "#111",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 16,
                overflow: "hidden",
                marginBottom: 32,
              }}
            >
              {/* Hero image */}
              <div
                style={{
                  width: "100%", height: 220,
                  background: config.main_product.image_url
                    ? `url(${config.main_product.image_url}) center/cover`
                    : `linear-gradient(135deg, #1a1508, #2a1f0a)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontFamily: "monospace", fontSize: 11,
                      letterSpacing: "0.2em", color: accentColor,
                      textTransform: "uppercase", marginBottom: 8,
                    }}
                  >
                    {config.main_product.name}
                  </div>
                </div>
              </div>

              {/* Info */}
              <div style={{ padding: 24 }}>
                {/* Precio */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <span
                    style={{
                      fontFamily: "Georgia, serif",
                      fontSize: 36, fontWeight: 700, color: accentColor,
                    }}
                  >
                    ${config.main_product.price.toFixed(2)} USD
                  </span>
                  {config.main_product.original_price && (
                    <span style={{ fontSize: 18, color: "#4A4540", textDecoration: "line-through" }}>
                      ${config.main_product.original_price.toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Countdown */}
                {config.checkout.countdown_minutes && (
                  <div
                    style={{
                      background: `${accentColor}10`,
                      border: `1px solid ${accentColor}4D`,
                      borderRadius: 10,
                      padding: "12px 16px",
                      display: "flex", alignItems: "center", gap: 10,
                      marginBottom: 24,
                    }}
                  >
                    <span>⏳</span>
                    <span style={{ fontSize: 13, color: "#7A7570", flex: 1 }}>
                      <strong style={{ color: "#F0EDE8" }}>Precio especial</strong> disponible solo por:
                    </span>
                    <span
                      style={{
                        fontFamily: "monospace", fontSize: 20,
                        fontWeight: 500, color: accentColor,
                      }}
                    >
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                )}

                {/* Beneficios */}
                {config.main_product.benefits.length > 0 && (
                  <>
                    <div
                      style={{
                        fontSize: 11, fontWeight: 600,
                        letterSpacing: "0.15em", textTransform: "uppercase",
                        color: "#4A4540", marginBottom: 12,
                      }}
                    >
                      Lo que obtienes
                    </div>
                    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                      {config.main_product.benefits.map((benefit, i) => (
                        <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#7A7570" }}>
                          <span
                            style={{
                              width: 18, height: 18,
                              background: `${accentColor}20`,
                              border: `1px solid ${accentColor}4D`,
                              borderRadius: "50%",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 10, color: accentColor, flexShrink: 0, marginTop: 1,
                            }}
                          >
                            ✓
                          </span>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {/* Testimonios */}
                {config.checkout.testimonials && config.checkout.testimonials.length > 0 && (
                  <>
                    <div
                      style={{
                        fontSize: 11, fontWeight: 600,
                        letterSpacing: "0.15em", textTransform: "uppercase",
                        color: "#4A4540", marginBottom: 12,
                      }}
                    >
                      Lo que dicen
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                      {config.checkout.testimonials.map((t, i) => (
                        <div
                          key={i}
                          style={{
                            background: "#181818",
                            border: "1px solid rgba(255,255,255,0.07)",
                            borderRadius: 12, padding: 14,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <div
                              style={{
                                width: 30, height: 30, borderRadius: "50%",
                                background: `${accentColor}20`,
                                border: `1px solid ${accentColor}4D`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 12, fontWeight: 700, color: accentColor,
                              }}
                            >
                              {t.avatar_initials}
                            </div>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "#F0EDE8" }}>{t.name}</div>
                              <div style={{ fontSize: 11, color: "#4A4540" }}>{t.role}</div>
                            </div>
                            <div style={{ marginLeft: "auto", color: accentColor, fontSize: 11 }}>
                              {"★".repeat(t.rating)}
                            </div>
                          </div>
                          <div style={{ fontSize: 12, color: "#7A7570", fontStyle: "italic", lineHeight: 1.6 }}>
                            "{t.text}"
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Sellos de confianza */}
                {config.checkout.trust_seals && config.checkout.trust_seals.length > 0 && (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {config.checkout.trust_seals.map((seal, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          background: "#181818",
                          border: "1px solid rgba(255,255,255,0.07)",
                          borderRadius: 8, padding: "6px 10px",
                          fontSize: 11, color: "#7A7570", fontWeight: 500,
                        }}
                      >
                        <span>{seal.icon}</span>
                        {seal.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ═══ COLUMNA DERECHA: Checkout (estilo Whop + selección bumps) ═══ */}
          <div style={{ padding: "64px 40px 64px 48px", display: "flex", flexDirection: "column" }}>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
              {config.checkout.headline}
            </h2>
            {config.checkout.subheadline && (
              <p style={{ fontSize: 13, color: "#7A7570", marginBottom: 32, lineHeight: 1.5 }}>
                {config.checkout.subheadline}
              </p>
            )}

            {/* ─── Order Bumps ─── */}
            {bumps.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#7A7570", letterSpacing: "0.05em" }}>
                    Añade a tu pedido
                  </span>
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
                </div>

                {bumps.map((bump) => {
                  const isSelected = selectedBumpIds.has(bump.id);
                  return (
                    <div
                      key={bump.id}
                      onClick={() => toggleBump(bump.id)}
                      style={{
                        border: `1.5px solid ${isSelected ? accentColor : "rgba(255,255,255,0.07)"}`,
                        borderRadius: 12, padding: 14, marginBottom: 10,
                        cursor: "pointer",
                        background: isSelected ? `${accentColor}08` : "#111",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        {/* Checkbox */}
                        <div
                          style={{
                            width: 20, height: 20,
                            border: `2px solid ${isSelected ? accentColor : "rgba(255,255,255,0.2)"}`,
                            borderRadius: 6, flexShrink: 0, marginTop: 2,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: isSelected ? accentColor : "transparent",
                            transition: "all 0.15s",
                          }}
                        >
                          {isSelected && (
                            <span style={{ fontSize: 11, color: "#0A0A0A", fontWeight: 700 }}>✓</span>
                          )}
                        </div>
                        {/* Contenido */}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#F0EDE8", marginBottom: 3 }}>
                            {bump.name}
                          </div>
                          <div style={{ fontSize: 12, color: "#7A7570", lineHeight: 1.5 }}>
                            {bump.description}
                          </div>
                        </div>
                        {/* Precio */}
                        <div
                          style={{
                            fontFamily: "monospace", fontSize: 16,
                            fontWeight: 500, color: accentColor, flexShrink: 0,
                          }}
                        >
                          +${bump.price}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ─── Resumen del pedido ─── */}
            <div
              style={{
                background: "#111",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12, padding: 18, marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontSize: 11, fontWeight: 600,
                  letterSpacing: "0.12em", textTransform: "uppercase",
                  color: "#4A4540", marginBottom: 14,
                }}
              >
                Resumen del pedido
              </div>

              {/* Producto principal */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#F0EDE8", padding: "5px 0" }}>
                <span>{config.main_product.name}</span>
                <span>${config.main_product.price.toFixed(2)}</span>
              </div>

              {/* Bumps seleccionados */}
              {selectedBumps.map((bump) => (
                <div key={bump.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#7A7570", padding: "4px 0" }}>
                  <span>+ {bump.name}</span>
                  <span style={{ color: accentColor }}>${bump.price.toFixed(2)}</span>
                </div>
              ))}

              <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "10px 0" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#F0EDE8" }}>Total hoy</span>
                <span
                  style={{
                    fontFamily: "Georgia, serif",
                    fontSize: 28, fontWeight: 700, color: accentColor,
                  }}
                >
                  ${totalPrice.toFixed(2)}
                </span>
              </div>
            </div>

            {/* ─── Checkout Embed o Botón para crearlo ─── */}
            {!checkoutReady ? (
              <button
                onClick={createCheckout}
                disabled={isLoadingCheckout}
                style={{
                  width: "100%",
                  background: isLoadingCheckout ? "#333" : accentColor,
                  color: "#0A0A0A",
                  border: "none", borderRadius: 12,
                  padding: "18px 24px",
                  fontSize: 16, fontWeight: 700,
                  cursor: isLoadingCheckout ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  marginBottom: 12,
                }}
              >
                {isLoadingCheckout ? "Preparando tu pago..." : config.checkout.cta_text}
              </button>
            ) : (
              /* Embed de Whop — aparece una vez creado el session */
              <div style={{ marginBottom: 12 }}>
                <div
                  id="whop-checkout-container"
                  data-whop-checkout-plan-id={planId ?? ""}
                  data-whop-checkout-session={sessionId ?? ""}
                  data-whop-checkout-return-url={
                    typeof window !== "undefined"
                      ? `${window.location.origin}/f/${slug}/upsell`
                      : `/f/${slug}/upsell`
                  }
                  data-whop-checkout-theme="dark"
                  data-whop-checkout-theme-accent-color={accentColor}
                />
              </div>
            )}

            {/* Nota de seguridad */}
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 6, fontSize: 11, color: "#4A4540",
              }}
            >
              🔐 Procesado con cifrado SSL · 100+ métodos de pago disponibles
            </div>
          </div>
        </div>
      </div>

      {/* Responsive básico */}
      <style>{`
        @media (max-width: 900px) {
          .checkout-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}
