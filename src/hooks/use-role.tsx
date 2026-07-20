import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "./use-session";

export type AppRole = "super_admin" | "staf_gudang";

export function useRole() {
  const { user } = useSession();
  const q = useQuery({
    queryKey: ["role", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user!.id),
        supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
      ]);
      const role: AppRole =
        (roles?.find((r) => r.role === "super_admin")?.role as AppRole) ??
        (roles?.[0]?.role as AppRole) ??
        "staf_gudang";
      return { role, profile };
    },
  });
  return {
    role: q.data?.role as AppRole | undefined,
    profile: q.data?.profile,
    isAdmin: q.data?.role === "super_admin",
    isStaf: q.data?.role === "staf_gudang",
    loading: q.isLoading,
  };
}
