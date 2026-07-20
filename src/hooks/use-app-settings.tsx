import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Public: exposes only the app display name (readable by any signed-in user)
export function useAppSettings() {
  return useQuery({
    queryKey: ["app_settings", "name"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_app_name");
      if (error) throw error;
      return { app_name: (data as string) ?? "Aplikasi Semeton" };
    },
  });
}

// Admin-only: full settings row including Telegram credentials.
// SELECT on app_settings is restricted to super_admin by RLS.
export function useAppSettingsAdmin() {
  return useQuery({
    queryKey: ["app_settings", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
