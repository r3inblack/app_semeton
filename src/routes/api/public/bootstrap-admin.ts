import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/bootstrap-admin")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Check if master admin already exists in profiles
        const { data: existingMaster } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("is_master", true)
          .maybeSingle();

        if (existingMaster) {
          // Ensure auth user still exists
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(existingMaster.id);
          if (authUser?.user) {
            return new Response(JSON.stringify({ ok: true, status: "already_exists", id: existingMaster.id }), {
              headers: { "content-type": "application/json" },
            });
          }
          // Auth user missing — clean stale profile
          await supabaseAdmin.from("user_roles").delete().eq("user_id", existingMaster.id);
          await supabaseAdmin.from("profiles").delete().eq("id", existingMaster.id);
        }

        // Create the master admin auth user
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: "admin@semeton.app",
          password: "admin123",
          email_confirm: true,
          user_metadata: { full_name: "Master Admin" },
        });
        if (createErr || !created?.user) {
          return new Response(JSON.stringify({ ok: false, error: createErr?.message ?? "create failed" }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }

        const uid = created.user.id;
        // Upsert profile as master
        await supabaseAdmin.from("profiles").upsert({ id: uid, full_name: "Master Admin", is_master: true });
        // Ensure super_admin role
        await supabaseAdmin.from("user_roles").upsert({ user_id: uid, role: "super_admin" as any });

        return new Response(JSON.stringify({ ok: true, status: "created", id: uid }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
