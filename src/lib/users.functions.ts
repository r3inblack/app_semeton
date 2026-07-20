import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AppRole = "super_admin" | "staf_gudang";

async function assertSuperAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "super_admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: super_admin required");
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: usersData, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (error) throw new Error(error.message);
    const ids = usersData.users.map((u) => u.id);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, is_master, warehouse_id").in("id", ids),
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
    ]);
    return usersData.users.map((u) => {
      const p = profiles?.find((x: any) => x.id === u.id);
      const r = roles?.find((x: any) => x.user_id === u.id);
      return {
        id: u.id,
        email: u.email,
        full_name: p?.full_name ?? null,
        is_master: p?.is_master ?? false,
        warehouse_id: p?.warehouse_id ?? null,
        role: (r?.role ?? "staf_gudang") as AppRole,
        created_at: u.created_at,
      };
    });
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      username: string;
      password: string;
      full_name: string;
      role: AppRole;
      warehouse_id?: string | null;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    if (!data.username || !data.password) throw new Error("Username & password wajib");
    if (data.password.length < 6) throw new Error("Password minimal 6 karakter");
    const email = data.username.includes("@") ? data.username : `${data.username}@semeton.app`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error) throw new Error(error.message);
    const uid = created.user!.id;
    // handle_new_user trigger already inserted default profile + role — update them
    await supabaseAdmin
      .from("profiles")
      .update({ full_name: data.full_name, warehouse_id: data.warehouse_id ?? null })
      .eq("id", uid);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: data.role });
    return { id: uid };
  });

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id: string;
      full_name?: string;
      role?: AppRole;
      warehouse_id?: string | null;
      password?: string;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.password) {
      if (data.password.length < 6) throw new Error("Password minimal 6 karakter");
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
        password: data.password,
      });
      if (error) throw new Error(error.message);
    }

    const profileUpdate: { full_name?: string; warehouse_id?: string | null } = {};
    if (data.full_name !== undefined) profileUpdate.full_name = data.full_name;
    if (data.warehouse_id !== undefined) profileUpdate.warehouse_id = data.warehouse_id;
    if (Object.keys(profileUpdate).length) {
      await supabaseAdmin.from("profiles").update(profileUpdate).eq("id", data.id);
    }

    if (data.role) {
      // protect_master_user trigger blocks changes to master's roles
      const { error: delErr } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.id);
      if (delErr) throw new Error(delErr.message);
      const { error: insErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.id, role: data.role });
      if (insErr) throw new Error(insErr.message);
    }
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    if (data.id === context.userId) throw new Error("Tidak dapat menghapus diri sendiri");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("is_master")
      .eq("id", data.id)
      .maybeSingle();
    if (prof?.is_master) throw new Error("User master tidak dapat dihapus");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
