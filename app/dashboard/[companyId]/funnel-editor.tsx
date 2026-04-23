"use client";

import { useState } from "react";

interface Funnel {
  id: string;
  slug: string;
  name: string;
  status: string;
  created_at: string;
}

interface OrderBump {
  id?: string;
  name: string;
  description: string;
  price: number;
  whop_plan_id: string;
}

interface Props {
  companyId: string;
  userId: string;
  funnel?: Funnel;
  onSaved: (funnel: Funnel) => void;
  onCancel: () => void;
}

const ACCENT = "#F5A623";

export function FunnelEditor({ userId, funnel, onSaved, onCancel }: Props) {
  const isEdit = !!funnel;

  // ─── Campos del funnel ───────────────────────────────────────────────────────
  const [name, setName] = useState(funnel?.name ?? "");
  const [slug, setSlug] = useState(funnel?.slug ?? "");
  const [status, setStatus] = useState(funnel?.status ?? "draft");

  // Producto principal
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("17");
  const [productOriginalPrice, setProductOriginalPrice] = useState("97");
  const [productPlanId, setProductPlanId] = useState("");
  const [productBenefits, setProductBenefits] = useState("Acceso inmediato\nSoporte directo\nGarantía 7 días");

  // Branding
  const [companyName, setCompanyName] = useState("De Base Digital");
  const [accentColor, setAccentColor] = useState("#F5A623");
  const [logoUrl, setLogoUrl] = useState("");

  // Checkout
  const [headline, setHeadline] = useState("Completa tu pedido");
  const [subheadline, setSubheadline] = useState("Estás a un clic de acceder.");
  const [ctaText, setCtaText] = useState("Acceder ahora →");
  const [countdownMinutes, setCountdownMinutes] = useState("30");
  const [confirmationUrl, setConfirmationUrl] = useState("");

  // Order bumps
  const [bumps, setBumps] = useState<OrderBump[]>([]);

  const [activeTab, setActiveTab] = useState<"product" | "branding" | "checkout" | "bumps">("product");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addBump = () => {
    setBumps((prev) => [...prev, { name: "", description: "", price: 0, whop_plan_id: "" }]);
  };

  const updateBump = (index: number, field: keyof OrderBump, value: string | number) => {
    setBumps((prev) => prev.map((b, i) => i === index ? { ...b, [field]: value } : b));
  };

  const removeBump = (index: number) => {
    setBumps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name || !slug || !productName || !productPlanId) {
      setError("Completa los campos obligatorios: nombre, slug, producto y Plan ID.");
      return;
    }

    setSaving(true);
    setError("");

    const config = {
      main_product: {
        whop_plan_id: productPlanId,
        name: productName,
        description: productDescription,
        price: parseFloat(productPrice),
        original_price: parseFloat(productOriginalPrice) || undefined,
        benefits: productBenefits.split("\n").filter(Boolean),
      },
      branding: {
        company_name: companyName,
        accent_color: accentColor,
        logo_url: logoUrl || undefined,
      },
      checkout: {
        headline,
        subheadline,
        cta_text: ctaText,
        countdown_minutes: parseInt(countdownMinutes) || undefined,
      },
      confirmation_url: confirmationUrl || undefined,
    };

    const body = { name, slug, status, config, user_id: userId, bumps };
    const url = isEdit ? `/api/funnels/${funnel.id}` : "/api/funnels";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error al guardar");
      setSaving(false);
      return;
    }

    const saved = await res.json();
    onSaved(saved.funnel);
    setSaving(false);
  };

  const tabs = [
    { id: "product", label: "Producto" },
    { id: "branding", label: "Branding" },
    { id: "checkout", label: "Checkout" },
    { id: "bumps", label: "Order Bumps" },
  ] as const;

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "40px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
        <button
          onClick={onCancel}
          style={{ background: "none", border: "none", color: "#7A7570", cursor: "pointer", fontSize: 20 }}
        >
          ←
        </button>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, fontFamily: "Georgia, serif", color: "#F0EDE8" }}>
            {isEdit ? `Editar: ${funnel.name}` : "Nuevo funnel"}
          </h2>
        </div>
      </div>

      {/* Campos base */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div>
          <label style={labelStyle}>Nombre del funnel *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Inmersión Claude Operator" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Slug (URL) *</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))} placeholder="inmersion-claude-operator" style={inputStyle} />
          <span style={{ fontSize: 11, color: "#4A4540" }}>/f/{slug || "tu-slug"}</span>
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <label style={labelStyle}>Estado</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
          <option value="draft">Borrador</option>
          <option value="active">Activo</option>
          <option value="archived">Archivado</option>
        </select>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: 0 }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "10px 18px", fontSize: 13, fontWeight: 600,
              background: "none", border: "none", cursor: "pointer",
              color: activeTab === tab.id ? ACCENT : "#7A7570",
              borderBottom: activeTab === tab.id ? `2px solid ${ACCENT}` : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Producto */}
      {activeTab === "product" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={labelStyle}>Nombre del producto *</label>
              <input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Inmersión Claude Operator" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Whop Plan ID *</label>
              <input value={productPlanId} onChange={(e) => setProductPlanId(e.target.value)} placeholder="plan_XXXXXXXXX" style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Descripción</label>
            <input value={productDescription} onChange={(e) => setProductDescription(e.target.value)} placeholder="Describe tu producto" style={inputStyle} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={labelStyle}>Precio (USD) *</label>
              <input type="number" value={productPrice} onChange={(e) => setProductPrice(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Precio original (tachado)</label>
              <input type="number" value={productOriginalPrice} onChange={(e) => setProductOriginalPrice(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Beneficios (uno por línea)</label>
            <textarea
              value={productBenefits}
              onChange={(e) => setProductBenefits(e.target.value)}
              rows={5}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
        </div>
      )}

      {/* Tab: Branding */}
      {activeTab === "branding" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Nombre de la empresa</label>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Color de acento</label>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)}
                style={{ width: 48, height: 40, borderRadius: 8, border: "none", cursor: "pointer", background: "none" }} />
              <input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>URL del logo (opcional)</label>
            <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." style={inputStyle} />
          </div>
        </div>
      )}

      {/* Tab: Checkout */}
      {activeTab === "checkout" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Título del checkout</label>
            <input value={headline} onChange={(e) => setHeadline(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Subtítulo</label>
            <input value={subheadline} onChange={(e) => setSubheadline(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Texto del botón CTA</label>
            <input value={ctaText} onChange={(e) => setCtaText(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Cuenta regresiva (minutos, 0 para desactivar)</label>
            <input type="number" value={countdownMinutes} onChange={(e) => setCountdownMinutes(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>URL de confirmación (opcional)</label>
            <input value={confirmationUrl} onChange={(e) => setConfirmationUrl(e.target.value)} placeholder="https://..." style={inputStyle} />
            <span style={{ fontSize: 11, color: "#4A4540" }}>Si está vacío, usará /f/{slug}/gracias</span>
          </div>
        </div>
      )}

      {/* Tab: Order Bumps */}
      {activeTab === "bumps" && (
        <div>
          {bumps.map((bump, i) => (
            <div key={i} style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 20, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#F0EDE8" }}>Order Bump {i + 1}</span>
                <button onClick={() => removeBump(i)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 18 }}>×</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Nombre</label>
                  <input value={bump.name} onChange={(e) => updateBump(i, "name", e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Whop Plan ID</label>
                  <input value={bump.whop_plan_id} onChange={(e) => updateBump(i, "whop_plan_id", e.target.value)} placeholder="plan_XXXXXXXXX" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Descripción</label>
                  <input value={bump.description} onChange={(e) => updateBump(i, "description", e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Precio (USD)</label>
                  <input type="number" value={bump.price} onChange={(e) => updateBump(i, "price", parseFloat(e.target.value))} style={inputStyle} />
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={addBump}
            style={{
              width: "100%", padding: "14px", borderRadius: 10,
              border: `1.5px dashed ${ACCENT}40`, background: "transparent",
              color: ACCENT, fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            + Agregar order bump
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ marginTop: 20, padding: "12px 16px", background: "#ef444420", border: "1px solid #ef444440", borderRadius: 8, color: "#ef4444", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Botones */}
      <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, padding: "14px", borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.1)", background: "transparent",
            color: "#7A7570", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 2, padding: "14px", borderRadius: 10,
            background: saving ? "#333" : ACCENT,
            border: "none", color: "#0A0A0A",
            fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear funnel"}
        </button>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600,
  color: "#7A7570", marginBottom: 6, letterSpacing: "0.04em",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px",
  background: "#111", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8, color: "#F0EDE8", fontSize: 14,
  outline: "none", boxSizing: "border-box",
};
