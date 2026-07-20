import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useList = <T = any,>(table: string, select = "*", order = "name") =>
  useQuery<T[]>({
    queryKey: [table, "list", select, order],
    queryFn: async () => {
      const { data, error } = await supabase.from(table as any).select(select).order(order);
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
