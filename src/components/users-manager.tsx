import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listUsers, createUser, updateUser, deleteUser,
  getUserPermissions, setUserPermissions,
  listCustomRoles, upsertCustomRole, deleteCustomRole,
} from "@/lib/users.functions";
import { useList } from "@/lib/list-hooks";
import { ALL_MODULES, ROLE_LABELS, type AppRole } from "@/hooks/use-role";
import { useRole } from "@/hooks/use-role";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type UserRow = {
  id: string; email: string | undefined; full_name: string | null;
  is_master: boolean; warehouse_id: string | null; role: AppRole;
  employee_id: string | null; employee_name: string | null;
  custom_role_id: string | null;
};

type CustomRole = {
  id: string; name: string; created_at: string;
  permissions: { module: string; action: string; allowed: boolean }[];
};

type Employee = { id: string; name: string; category: string | null; warehouse_id: string | null };

const ROLE_OPTIONS: AppRole[] = [
  "super_admin", "admin", "manager", "staff_keuangan",
  "kasir", "staf_gudang", "viewer", "custom",
];

export function UsersManager() {
  const qc = useQueryClient();
  const { isSuperAdmin } = useRole();
  const list = useServerFn(listUsers);
  const create = useServerFn(createUser);
  const update = useServerFn(updateUser);
  const remove = useServerFn(deleteUser);
  const listRoles = useServerFn(listCustomRoles);

  const warehouses = useList<{ id: string; name: string }>("warehouses");
  const employees = useList<Employee>("employees");
  const q = useQuery({ queryKey: ["admin-users"], queryFn: () => list() });
  const rolesQ = useQuery({ queryKey: ["custom-roles"], queryFn: () => listRoles() });
  const customRoles: CustomRole[] = (rolesQ.data ?? []) as any;

  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [pwUser, setPwUser] = useState<UserRow | null>(null);
  const [permsUser, setPermsUser] = useState<UserRow | null>(null);
  const [openRoles, setOpenRoles] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);

  const [form, setForm] = useState({
    username: "", password: "", full_name: "",
    role: "viewer" as AppRole, warehouse_id: "", employee_id: "", custom_role_id: "",
  });
  const [editForm, setEditForm] = useState({
    full_name: "", role: "viewer" as AppRole, warehouse_id: "", employee_id: "", custom_role_id: "",
  });
  const [newPw, setNewPw] = useState("");

  // Employees not yet linked (for the "New user" dialog)
  const linkedIds = new Set((q.data ?? []).map((u: UserRow) => u.employee_id).filter(Boolean) as string[]);
  const availableEmployeesNew = (employees.data ?? []).filter((e) => !linkedIds.has(e.id));
  const availableEmployeesEdit = (employees.data ?? []).filter(
    (e) => !linkedIds.has(e.id) || e.id === editing?.employee_id,
  );

  const availableRoles = ROLE_OPTIONS.filter((r) => isSuperAdmin || r !== "super_admin");

  const mCreate = useMutation({
    mutationFn: async () => {
      if (!form.username.trim()) throw new Error("Username wajib diisi");
      if (!form.password || form.password.length < 6)
        throw new Error("Password minimal 6 karakter");
      if (form.role === "custom" && !form.custom_role_id)
        throw new Error("Pilih role custom terlebih dulu");
      return create({ data: {
        username: form.username, password: form.password, full_name: form.full_name,
        role: form.role, warehouse_id: form.warehouse_id || null,
        employee_id: form.employee_id || null,
        custom_role_id: form.custom_role_id || null,
      } });
    },
    onSuccess: () => {
      toast.success("User dibuat");
      setOpenNew(false);
      setForm({ username: "", password: "", full_name: "", role: "viewer", warehouse_id: "", employee_id: "", custom_role_id: "" });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast.error(e.message),
  });


  const mUpdate = useMutation({
    mutationFn: () => {
      if (editForm.role === "custom" && !editForm.custom_role_id)
        throw new Error("Pilih role custom terlebih dulu");
      return update({ data: {
        id: editing!.id, full_name: editForm.full_name, role: editForm.role,
        warehouse_id: editForm.warehouse_id || null,
        employee_id: editForm.employee_id || null,
        custom_role_id: editForm.custom_role_id || null,
      } });
    },
    onSuccess: () => {
      toast.success("User diperbarui");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["role-perms"] });
    },
    onError: (e: any) => toast.error(e.message),
  });


  const mPassword = useMutation({
    mutationFn: async () => {
      if (!newPw || newPw.length < 6) throw new Error("Password minimal 6 karakter");
      return update({ data: { id: pwUser!.id, password: newPw } });
    },
    onSuccess: () => {
      toast.success("Password diganti");
      setPwUser(null); setNewPw("");
    },
    onError: (e: any) => toast.error(e.message),
  });


  const mDelete = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("User dihapus");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const startEdit = (u: UserRow) => {
    setEditing(u);
    setEditForm({
      full_name: u.full_name ?? "",
      role: u.role,
      warehouse_id: u.warehouse_id ?? "",
      employee_id: u.employee_id ?? "",
      custom_role_id: u.custom_role_id ?? "",
    });
  };

  // When user picks an employee in New dialog, prefill name + warehouse
  const onPickEmployeeNew = (empId: string) => {
    const emp = (employees.data ?? []).find((e) => e.id === empId);
    setForm((f) => ({
      ...f,
      employee_id: empId,
      full_name: emp?.name && !f.full_name ? emp.name : f.full_name,
      warehouse_id: emp?.warehouse_id ?? f.warehouse_id,
      username: emp && !f.username ? emp.name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "") : f.username,
    }));
  };
  const onPickEmployeeEdit = (empId: string) => {
    const emp = (employees.data ?? []).find((e) => e.id === empId);
    setEditForm((f) => ({
      ...f,
      employee_id: empId,
      full_name: emp?.name && !f.full_name ? emp.name : f.full_name,
      warehouse_id: emp?.warehouse_id ?? f.warehouse_id,
    }));
  };

  return (
    <Card><CardContent className="pt-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="font-semibold">Manajemen Pengguna & Hak Akses</h3>
          <p className="text-sm text-muted-foreground">
            Buat dan kelola user aplikasi. Username otomatis dijadikan email <code>username@semeton.app</code>.
            Buat <b>Role</b> baru untuk mengatur hak akses per-modul (lihat, buat, ubah, hapus).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { setEditingRole(null); setOpenRoles(true); }}>
            <Shield className="h-4 w-4 mr-1" /> Tambah Role
          </Button>
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Tambah User</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Tambah User Baru</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Field label="Ambil Data Karyawan (opsional)">
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    value={form.employee_id} onChange={(e) => onPickEmployeeNew(e.target.value)}>
                    <option value="">— tidak dikaitkan —</option>
                    {availableEmployeesNew.map((e) => (
                      <option key={e.id} value={e.id}>{e.name}{e.category ? ` (${e.category})` : ""}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pilih karyawan agar nominal gaji tampil pada dashboard user tersebut.
                  </p>
                </Field>
                <Field label="Username">
                  <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="misal: budi" />
                </Field>
                <Field label="Nama Lengkap">
                  <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </Field>
                <Field label="Password">
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Minimal 6 karakter" />
                </Field>
                <Field label="Role / Level">
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as AppRole, custom_role_id: "" })}>
                    {availableRoles.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </Field>
                {form.role === "custom" && (
                  <Field label="Pilih Role Custom">
                    <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                      value={form.custom_role_id}
                      onChange={(e) => setForm({ ...form, custom_role_id: e.target.value })}>
                      <option value="">— pilih role —</option>
                      {customRoles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                    {!customRoles.length && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Belum ada role custom. Klik <b>Tambah Role</b> di kanan atas terlebih dulu.
                      </p>
                    )}
                  </Field>
                )}
                {form.role === "staf_gudang" && (
                  <Field label="Gudang">
                    <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                      value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}>
                      <option value="">— pilih —</option>
                      {(warehouses.data ?? []).map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </Field>
                )}
              </div>
              <DialogFooter>
                <Button onClick={() => mCreate.mutate()} disabled={mCreate.isPending}>Simpan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Custom roles quick list */}
      {!!customRoles.length && (
        <div className="rounded border bg-muted/30 p-3">
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Role Custom</div>
          <div className="flex flex-wrap gap-2">
            {customRoles.map((r) => (
              <div key={r.id} className="flex items-center gap-1 rounded-full border bg-background px-3 py-1 text-sm">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span>{r.name}</span>
                <button
                  className="ml-1 text-muted-foreground hover:text-foreground"
                  title="Edit role"
                  onClick={() => { setEditingRole(r); setOpenRoles(true); }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}


      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Karyawan</TableHead>
              <TableHead>Gudang</TableHead>
              <TableHead className="w-48 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(q.data ?? []).map((u: UserRow) => (
              <TableRow key={u.id}>
                <TableCell>
                  {u.full_name ?? "-"}
                  {u.is_master && <span className="ml-2 text-xs rounded bg-primary/20 text-primary px-1.5 py-0.5">MASTER</span>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.email?.split("@")[0] ?? "-"}</TableCell>
                <TableCell>{ROLE_LABELS[u.role] ?? u.role}</TableCell>
                <TableCell>{u.employee_name ?? "-"}</TableCell>
                <TableCell>{warehouses.data?.find((w) => w.id === u.warehouse_id)?.name ?? "-"}</TableCell>
                <TableCell className="text-right">
                  {u.role === "custom" && (
                    <Button size="icon" variant="ghost" title="Atur Hak Akses"
                      onClick={() => setPermsUser(u)}>
                      <ShieldCheck className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" title="Edit" onClick={() => startEdit(u)}
                    disabled={u.is_master}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" title="Ganti Password" onClick={() => { setPwUser(u); setNewPw(""); }}>
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" title="Hapus" disabled={u.is_master}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus user?</AlertDialogTitle>
                        <AlertDialogDescription>User "{u.full_name ?? u.email}" akan dihapus permanen.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => mDelete.mutate(u.id)}>Hapus</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
            {!q.data?.length && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">
                {q.isLoading ? "Memuat..." : "Belum ada user"}
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Field label="Karyawan">
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={editForm.employee_id} onChange={(e) => onPickEmployeeEdit(e.target.value)}>
                <option value="">— tidak dikaitkan —</option>
                {availableEmployeesEdit.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}{e.category ? ` (${e.category})` : ""}</option>
                ))}
              </select>
            </Field>
            <Field label="Nama Lengkap">
              <Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
            </Field>
            <Field label="Role / Level">
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as AppRole, custom_role_id: "" })}>
                {availableRoles.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </Field>
            {editForm.role === "custom" && (
              <Field label="Pilih Role Custom">
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={editForm.custom_role_id}
                  onChange={(e) => setEditForm({ ...editForm, custom_role_id: e.target.value })}>
                  <option value="">— pilih role —</option>
                  {customRoles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </Field>
            )}
            {editForm.role === "staf_gudang" && (
              <Field label="Gudang">
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={editForm.warehouse_id} onChange={(e) => setEditForm({ ...editForm, warehouse_id: e.target.value })}>
                  <option value="">— pilih —</option>
                  {(warehouses.data ?? []).map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </Field>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => mUpdate.mutate()} disabled={mUpdate.isPending}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password dialog */}
      <Dialog open={!!pwUser} onOpenChange={(o) => !o && setPwUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ganti Password — {pwUser?.full_name ?? pwUser?.email}</DialogTitle></DialogHeader>
          <Field label="Password Baru">
            <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Minimal 6 karakter" />
          </Field>
          <DialogFooter>
            <Button onClick={() => mPassword.mutate()} disabled={mPassword.isPending || newPw.length < 6}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions dialog */}
      {permsUser && (
        <PermissionsDialog user={permsUser} onClose={() => setPermsUser(null)} />
      )}

      {/* Custom Role dialog */}
      {openRoles && (
        <CustomRoleDialog
          initial={editingRole}
          onClose={() => { setOpenRoles(false); setEditingRole(null); }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["custom-roles"] });
            qc.invalidateQueries({ queryKey: ["role-perms"] });
          }}
        />
      )}
    </CardContent></Card>
  );
}

function CustomRoleDialog({
  initial, onClose, onSaved,
}: { initial: CustomRole | null; onClose: () => void; onSaved: () => void }) {
  const upsert = useServerFn(upsertCustomRole);
  const del = useServerFn(deleteCustomRole);
  const [name, setName] = useState(initial?.name ?? "");
  const [search, setSearch] = useState("");
  type Row = { view: boolean; create: boolean; update: boolean; delete: boolean };
  const emptyRow = (): Row => ({ view: false, create: false, update: false, delete: false });
  const [perms, setPerms] = useState<Record<string, Row>>(() => {
    const map: Record<string, Row> = {};
    for (const m of ALL_MODULES) map[m.key] = emptyRow();
    for (const p of initial?.permissions ?? []) {
      if (!map[p.module]) map[p.module] = emptyRow();
      if (p.action === "view") map[p.module].view = !!p.allowed;
      if (p.action === "create") map[p.module].create = !!p.allowed;
      if (p.action === "update") map[p.module].update = !!p.allowed;
      if (p.action === "delete") map[p.module].delete = !!p.allowed;
      // legacy "manage" → grants create/update/delete
      if (p.action === "manage" && p.allowed) {
        map[p.module].create = true; map[p.module].update = true; map[p.module].delete = true;
      }
    }
    return map;
  });

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q ? ALL_MODULES.filter((m) => m.label.toLowerCase().includes(q) || m.group.toLowerCase().includes(q)) : ALL_MODULES;
    return filtered.reduce<Record<string, typeof ALL_MODULES>>((acc, m) => {
      (acc[m.group] ??= []).push(m); return acc;
    }, {});
  }, [search]);

  const toggle = (key: string, action: keyof Row, value: boolean) => {
    setPerms((p) => {
      const cur = p[key] ?? emptyRow();
      const next = { ...cur, [action]: value };
      if (action !== "view" && value) next.view = true;
      if (action === "view" && !value) { next.create = false; next.update = false; next.delete = false; }
      return { ...p, [key]: next };
    });
  };

  const activateAllGroup = (mods: typeof ALL_MODULES) => {
    setPerms((p) => {
      const next = { ...p };
      for (const m of mods) next[m.key] = { view: true, create: true, update: true, delete: true };
      return next;
    });
  };

  const save = async () => {
    if (!name.trim()) { toast.error("Nama role wajib diisi"); return; }
    const rows: { module: string; action: string; allowed: boolean }[] = [];
    for (const [module, v] of Object.entries(perms)) {
      (["view","create","update","delete"] as (keyof Row)[]).forEach((a) => {
        if (v[a]) rows.push({ module, action: a, allowed: true });
      });
    }
    try {
      await upsert({ data: { id: initial?.id, name: name.trim(), permissions: rows } });
      toast.success("Role disimpan");
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async () => {
    if (!initial) return;
    if (!confirm(`Hapus role "${initial.name}"?`)) return;
    try {
      await del({ data: { id: initial.id } });
      toast.success("Role dihapus"); onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Role" : "Tambah Role"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nama Role">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="misal: Kepala Cabang" />
            </Field>
            <Field label="Cari nama hak akses">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ketik untuk mencari…" />
            </Field>
          </div>
          <div className="flex-1 overflow-auto rounded border">
            {Object.entries(groups).map(([group, mods]) => (
              <div key={group} className="border-b last:border-b-0">
                <div className="flex items-center justify-between bg-muted/50 px-3 py-2">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">{group}</div>
                  <button
                    type="button"
                    onClick={() => activateAllGroup(mods)}
                    className="text-xs text-primary hover:underline"
                  >
                    Aktifkan Semua
                  </button>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground">
                      <th className="text-left px-3 py-1.5">Modul</th>
                      <th className="w-16 text-center">Lihat</th>
                      <th className="w-16 text-center">Buat</th>
                      <th className="w-16 text-center">Ubah</th>
                      <th className="w-16 text-center">Hapus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mods.map((m) => (
                      <tr key={m.key} className="border-t">
                        <td className="px-3 py-1.5">{m.label}</td>
                        {(["view","create","update","delete"] as (keyof Row)[]).map((a) => (
                          <td key={a} className="text-center">
                            <Checkbox
                              checked={!!perms[m.key]?.[a]}
                              onCheckedChange={(v) => toggle(m.key, a, !!v)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter className="gap-2">
          {initial && (
            <Button variant="destructive" onClick={remove} className="mr-auto">
              <Trash2 className="h-4 w-4 mr-1" /> Hapus Role
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={save}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function PermissionsDialog({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const getFn = useServerFn(getUserPermissions);
  const setFn = useServerFn(setUserPermissions);
  const [perms, setPerms] = useState<Record<string, { view: boolean; manage: boolean }>>({});

  const q = useQuery({
    queryKey: ["user-perms", user.id],
    queryFn: () => getFn({ data: { user_id: user.id } }),
  });

  useEffect(() => {
    if (!q.data) return;
    const map: Record<string, { view: boolean; manage: boolean }> = {};
    for (const m of ALL_MODULES) map[m.key] = { view: false, manage: false };
    for (const row of q.data as any[]) {
      if (!map[row.module]) map[row.module] = { view: false, manage: false };
      if (row.action === "view") map[row.module].view = !!row.allowed;
      if (row.action === "manage") map[row.module].manage = !!row.allowed;
    }
    setPerms(map);
  }, [q.data]);

  const toggle = (key: string, action: "view" | "manage", value: boolean) => {
    setPerms((p) => {
      const cur = p[key] ?? { view: false, manage: false };
      const next = { ...cur, [action]: value };
      // manage implies view; unchecking view also unchecks manage
      if (action === "manage" && value) next.view = true;
      if (action === "view" && !value) next.manage = false;
      return { ...p, [key]: next };
    });
  };

  const save = async () => {
    const rows: { module: string; action: string; allowed: boolean }[] = [];
    for (const [module, v] of Object.entries(perms)) {
      if (v.view) rows.push({ module, action: "view", allowed: true });
      if (v.manage) rows.push({ module, action: "manage", allowed: true });
    }
    try {
      await setFn({ data: { user_id: user.id, permissions: rows } });
      toast.success("Hak akses disimpan");
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Group modules
  const groups = ALL_MODULES.reduce<Record<string, typeof ALL_MODULES>>((acc, m) => {
    (acc[m.group] ??= []).push(m);
    return acc;
  }, {});

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Hak Akses Custom — {user.full_name ?? user.email}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {q.isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}
          {Object.entries(groups).map(([group, mods]) => (
            <div key={group}>
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">{group}</div>
              <div className="rounded border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Modul</th>
                      <th className="p-2 w-24 text-center">Lihat</th>
                      <th className="p-2 w-24 text-center">Kelola</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mods.map((m) => (
                      <tr key={m.key} className="border-t">
                        <td className="p-2">{m.label}</td>
                        <td className="p-2 text-center">
                          <Checkbox
                            checked={!!perms[m.key]?.view}
                            onCheckedChange={(v) => toggle(m.key, "view", !!v)}
                          />
                        </td>
                        <td className="p-2 text-center">
                          <Checkbox
                            checked={!!perms[m.key]?.manage}
                            onCheckedChange={(v) => toggle(m.key, "manage", !!v)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={save}>Simpan Hak Akses</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label>{label}</Label>{children}</div>;
}
