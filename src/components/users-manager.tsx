import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listUsers, createUser, updateUser, deleteUser } from "@/lib/users.functions";
import { useList } from "@/lib/list-hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Pencil, Trash2, KeyRound } from "lucide-react";
import { toast } from "sonner";

type Role = "super_admin" | "staf_gudang";
type UserRow = {
  id: string; email: string | undefined; full_name: string | null;
  is_master: boolean; warehouse_id: string | null; role: Role;
};

export function UsersManager() {
  const qc = useQueryClient();
  const list = useServerFn(listUsers);
  const create = useServerFn(createUser);
  const update = useServerFn(updateUser);
  const remove = useServerFn(deleteUser);

  const warehouses = useList<{ id: string; name: string }>("warehouses");
  const q = useQuery({ queryKey: ["admin-users"], queryFn: () => list() });

  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [pwUser, setPwUser] = useState<UserRow | null>(null);

  const [form, setForm] = useState({
    username: "", password: "", full_name: "",
    role: "staf_gudang" as Role, warehouse_id: "",
  });
  const [editForm, setEditForm] = useState({
    full_name: "", role: "staf_gudang" as Role, warehouse_id: "",
  });
  const [newPw, setNewPw] = useState("");

  const mCreate = useMutation({
    mutationFn: () => create({ data: {
      username: form.username, password: form.password, full_name: form.full_name,
      role: form.role, warehouse_id: form.warehouse_id || null,
    } }),
    onSuccess: () => {
      toast.success("User dibuat");
      setOpenNew(false);
      setForm({ username: "", password: "", full_name: "", role: "staf_gudang", warehouse_id: "" });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const mUpdate = useMutation({
    mutationFn: () => update({ data: {
      id: editing!.id, full_name: editForm.full_name, role: editForm.role,
      warehouse_id: editForm.warehouse_id || null,
    } }),
    onSuccess: () => {
      toast.success("User diperbarui");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const mPassword = useMutation({
    mutationFn: () => update({ data: { id: pwUser!.id, password: newPw } }),
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
    });
  };

  return (
    <Card><CardContent className="pt-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Manajemen User</h3>
          <p className="text-sm text-muted-foreground">
            Buat dan kelola user aplikasi. Username akan otomatis dijadikan email <code>username@semeton.app</code>.
          </p>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Tambah User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Tambah User Baru</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Field label="Username">
                <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="misal: budi" />
              </Field>
              <Field label="Nama Lengkap">
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </Field>
              <Field label="Password">
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Minimal 6 karakter" />
              </Field>
              <Field label="Role">
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                  <option value="super_admin">Super Admin</option>
                  <option value="staf_gudang">Staf Gudang</option>
                </select>
              </Field>
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

      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Username / Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Gudang</TableHead>
              <TableHead className="w-40 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(q.data ?? []).map((u: UserRow) => (
              <TableRow key={u.id}>
                <TableCell>
                  {u.full_name ?? "-"}
                  {u.is_master && <span className="ml-2 text-xs rounded bg-primary/20 text-primary px-1.5 py-0.5">MASTER</span>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                <TableCell>{u.role === "super_admin" ? "Super Admin" : "Staf Gudang"}</TableCell>
                <TableCell>{warehouses.data?.find((w) => w.id === u.warehouse_id)?.name ?? "-"}</TableCell>
                <TableCell className="text-right">
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
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">
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
            <Field label="Nama Lengkap">
              <Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
            </Field>
            <Field label="Role">
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })}>
                <option value="super_admin">Super Admin</option>
                <option value="staf_gudang">Staf Gudang</option>
              </select>
            </Field>
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
    </CardContent></Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label>{label}</Label>{children}</div>;
}
