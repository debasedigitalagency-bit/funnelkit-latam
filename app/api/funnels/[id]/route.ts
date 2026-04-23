import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: Params): Promise<Response> {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, slug, status, config, bumps } = body;

    const supabase = createServerClient();

    const { data: funnel, error } = await supabase
      .from("funnels")
      .update({ name, slug, status, config, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, slug, name, status, created_at")
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    // Reemplazar order bumps
    if (bumps !== undefined) {
      await supabase.from("order_bumps").delete().eq("funnel_id", id);
      if (bumps.length > 0) {
        const bumpsToInsert = bumps.map((b: { name: string; description: string; price: number; whop_plan_id: string }, i: number) => ({
          funnel_id: id,
          name: b.name,
          description: b.description,
          price: b.price,
          whop_plan_id: b.whop_plan_id,
          display_order: i,
        }));
        await supabase.from("order_bumps").insert(bumpsToInsert);
      }
    }

    return Response.json({ funnel });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params): Promise<Response> {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    const { error } = await supabase.from("funnels").delete().eq("id", id);
    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
