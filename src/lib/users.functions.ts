import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AppRole =
  | "super_admin"
  | "admin"
  | "manager"
  | "staff_keuangan"
  | "kasir"
  | "staf_gudang"
  | "viewer"
  | "custom";

const ALL_ROLES: AppRole[] = [
  "super_admin", "admin", "manager", "staff_keuangan",
  "kasir", "staf_gudang", "viewer", "custom",
];

async function getCallerRole(supabase: any, userId: string): Promise<AppRole | null> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r: any) => r.role as AppRole);
  return roles.find((r: AppRole) => r === "super_admin") ?? roles[0] ?? null;
}

async function assertCanManageUsers(supabase: any, userId: string) {
  const role = await getCallerRole(supabase, userId);
  if (role === "super_admin") return role;
  const { data, error } = await supabase.rpc("has_permission", {
    _user: userId, _module: "users", _action: "manage",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: butuh izin mengelola user");
  return role;
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertCanManageUsers(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: usersData, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (error) throw new Error(error.message);
    const ids = usersData.users.map((u) => u.id);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, is_master, warehouse_id, employee_id").in("id", ids),
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
    ]);
    const empIds = (profiles ?? []).map((p: any) => p.employee_id).filter(Boolean);
    const { data: employees } = empIds.length
      ? await supabaseAdmin.from("employees").select("id, name").in("id", empIds)
      : { data: [] as any[] };
    return usersData.users.map((u) => {
      const p = profiles?.find((x: any) => x.id === u.id);
      const r = roles?.find((x: any) => x.user_id === u.id);
      const emp = employees?.find((x: any) => x.id === p?.employee_id);
      return {
        id: u.id,
        email: u.email,
        full_name: p?.full_name ?? null,
        is_master: p?.is_master ?? false,
        warehouse_id: p?.warehouse_id ?? null,
        employee_id: p?.employee_id ?? null,
        employee_name: emp?.name ?? null,
        role: (r?.role ?? "viewer") as AppRole,
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
    const callerRole = await assertCanManageUsers(context.supabase, context.userId);
    if (!ALL_ROLES.includes(data.role)) throw new Error("Role tidak valid");
    if (data.role === "super_admin" && callerRole !== "super_admin") {
      throw new Error("Hanya Super Admin yang bisa membuat Super Admin");
    }
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
    const callerRole = await assertCanManageUsers(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.role && !ALL_ROLES.includes(data.role)) throw new Error("Role tidak valid");
    if (data.role === "super_admin" && callerRole !== "super_admin") {
      throw new Error("Hanya Super Admin yang bisa menetapkan Super Admin");
    }

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
    await assertCanManageUsers(context.supabase, context.userId);
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

export const getUserPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertCanManageUsers(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("user_permissions")
      .select("module, action, allowed")
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const setUserPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { user_id: string; permissions: { module: string; action: string; allowed: boolean }[] }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertCanManageUsers(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Replace all rows for that user
    const { error: delErr } = await supabaseAdmin
      .from("user_permissions")
      .delete()
      .eq("user_id", data.user_id);
    if (delErr) throw new Error(delErr.message);
    if (data.permissions.length) {
      const rows = data.permissions.map((p) => ({
        user_id: data.user_id,
        module: p.module,
        action: p.action,
        allowed: p.allowed,
      }));
      const { error: insErr } = await supabaseAdmin.from("user_permissions").insert(rows);
      if (insErr) throw new Error(insErr.message);
    }
    return { ok: true };
  });
