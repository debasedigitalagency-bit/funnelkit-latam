"use client";

import { useState } from "react";
import { FunnelEditor } from "./funnel-editor";

interface Funnel {
  id: string;
  slug: string;
  name: string;
  status: string;
  created_at: string;
}

interface Props {
  companyId: string;
  userId: string;
  funnels: Funnel[];
}

export function DashboardClient({ companyId, userId, funnels: initialFunnels }: Props) {
  const [funnels, setFunnels] = useState<Funnel[]>(initialFunnels);
  const [editingFunnel, setEditingFunnel] = useState<Funnel | null>(null);
  const [showNewFunnel, setShowNewFunnel] = useState(false);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  const handleSaved = (funnel: Funnel) => {
    setFunnels((prev) => {
      const exists = prev.find((f) => f.id === funnel.id);
      if (exists) return prev.map((f) => (f.id === funnel.id ? funnel : f));
      return [funnel, ...prev];
    });
    setEditingFunnel(null);
    setShowNewFunnel(false);
  };

  const handleDelete = async (funnelId: string) => {
    if (!confirm("¿Eliminar este funnel?")) return;
    const res = await fetch(`/api/funnels/${funnelId}`, { method: "DELETE" });
    if (res.ok) setFunnels((prev) => prev.filter((f) => f.id !== funnelId));
  };

  if (editingFunnel || showNewFunnel) {
    return (
      <FunnelEditor
        companyId={companyId}
        userId={userId}
        funnel={editingFunnel ?? undefined}
        onSaved={handleSaved}
        onCancel={() => { setEditingFunnel(null); setShowNewFunnel(false); }}
      />
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, fontFamily: "Georgia, serif", color: "#F0EDE8", marginBottom: 6 }}>
            FunnelKit LATAM
          </h1>
          <p style={{ fontSize: 14, color: "#7A7570" }}>
            Crea y gestiona tus funnels de venta con one-click upsell
          </p>
        </div>
        <button
          onClick={() => setShowNewFunnel(true)}
          style={{
            background: "#F5A623", color: "#0A0A0A",
            border: "none", borderRadius: 10,
            padding: "12px 24px", fontSize: 14, fontWeight: 700,
            cursor: "pointer",
          }}
        >
          + Nuevo funnel
        </button>
      </div>

      {/* Lista de funnels */}
      {funnels.length === 0 ? (
        <div
          style={{
            background: "#111", border: "1px dashed rgba(255,255,255,0.1)",
            borderRadius: 16, padding: "64px 32px", textAlign: "center",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 16 }}>🚀</div>
          <p style={{ fontSize: 16, color: "#7A7570", marginBottom: 24 }}>
            Aún no tienes funnels. Crea el primero.
          </p>
          <button
            onClick={() => setShowNewFunnel(true)}
            style={{
              background: "#F5A623", color: "#0A0A0A",
              border: "none", borderRadius: 10,
              padding: "14px 32px", fontSize: 15, fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Crear mi primer funnel
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {funnels.map((funnel) => (
            <div
              key={funnel.id}
              style={{
                background: "#111",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 14, padding: "20px 24px",
                display: "flex", alignItems: "center", gap: 16,
              }}
            >
              {/* Estado */}
              <div
                style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background: funnel.status === "active" ? "#22c55e" : funnel.status === "draft" ? "#F5A623" : "#4A4540",
                }}
              />

              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#F0EDE8", marginBottom: 4 }}>
                  {funnel.name}
                </div>
                <div style={{ fontSize: 12, color: "#4A4540" }}>
                  {appUrl}/f/{funnel.slug}
                </div>
              </div>

              {/* Badge status */}
              <span
                style={{
                  fontSize: 11, fontWeight: 600,
                  padding: "4px 10px", borderRadius: 6,
                  background: funnel.status === "active" ? "#22c55e20" : "#F5A62320",
                  color: funnel.status === "active" ? "#22c55e" : "#F5A623",
                  textTransform: "uppercase", letterSpacing: "0.05em",
                }}
              >
                {funnel.status === "active" ? "Activo" : funnel.status === "draft" ? "Borrador" : "Archivado"}
              </span>

              {/* Acciones */}
              <div style={{ display: "flex", gap: 8 }}>
                <a
                  href={`${appUrl}/f/${funnel.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
                    color: "#7A7570", cursor: "pointer", textDecoration: "none",
                  }}
                >
                  Ver
                </a>
                <button
                  onClick={() => setEditingFunnel(funnel)}
                  style={{
                    padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: "#F5A62320", border: "1px solid #F5A62340",
                    color: "#F5A623", cursor: "pointer",
                  }}
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(funnel.id)}
                  style={{
                    padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: "#ef444420", border: "1px solid #ef444440",
                    color: "#ef4444", cursor: "pointer",
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
