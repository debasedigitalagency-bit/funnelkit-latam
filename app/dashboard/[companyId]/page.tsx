import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { whopsdk } from "@/lib/whop";
import { createServerClient } from "@/lib/supabase";
import { DashboardClient } from "./dashboard-client";

interface Props {
  params: Promise<{ companyId: string }>;
}

export default async function DashboardPage({ params }: Props) {
  const { companyId } = await params;

  // 1. Verificar identidad del usuario via token de Whop
  const { userId } = await whopsdk.verifyUserToken(await headers());

  // 2. Verificar que es admin de esta empresa
  const access = await whopsdk.users.checkAccess(companyId, { id: userId });

  if (!access.has_access || access.access_level !== "admin") {
    redirect("/no-access");
  }

  // 3. Cargar funnels del creador desde Supabase
  const supabase = createServerClient();
  const { data: funnels } = await supabase
    .from("funnels")
    .select("id, slug, name, status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (
    <DashboardClient
      companyId={companyId}
      userId={userId}
      funnels={funnels ?? []}
    />
  );
}
