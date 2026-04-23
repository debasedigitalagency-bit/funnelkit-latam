import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { name, slug, status, config, user_id, bumps } = body;

    if (!name || !slug || !config || !user_id) {
      return Response.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: funnel, error } = await supabase
      .from("funnels")
      .insert({ name, slug, status: status ?? "draft", config, user_id })
      .select("id, slug, name, status, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return Response.json({ error: "Ya existe un funnel con ese slug" }, { status: 409 });
      }
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Insertar order bumps si los hay
    if (bumps && bumps.length > 0) {
      const bumpsToInsert = bumps.map((b: { name: string; description: string; price: number; whop_plan_id: string }, i: number) => ({
        funnel_id: funnel.id,
        name: b.name,
        description: b.description,
        price: b.price,
        whop_plan_id: b.whop_plan_id,
        display_order: i,
      }));
      await supabase.from("order_bumps").insert(bumpsToInsert);
    }

    return Response.json({ funnel });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
