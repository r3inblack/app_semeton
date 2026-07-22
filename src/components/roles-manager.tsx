import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCustomRoles, upsertCustomRole, deleteCustomRole } from "@/lib/users.functions";
import { ALL_MODULES } from "@/hooks/use-role";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Shield } from "lucide-react";
import { toast } from "sonner";

type CustomRole = {
  id: string; name: string; created_at: string;
  permissions: { module: string; action: string; allowed: boolean }[];
};

export function RolesManager() {
  const qc = useQueryClient();
  const listRoles = useServerFn(listCustomRoles);
  const del = useServerFn(deleteCustomRole);
  const rolesQ = useQuery({ queryKey: ["custom-roles"], queryFn: () => listRoles() });
  const roles: CustomRole[] = (rolesQ.data ?? []) as any;

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomRole | null>(null);

  const mDelete = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Role dihapus");
      qc.invalidateQueries({ queryKey: ["custom-roles"] });
      qc.invalidateQueries({ queryKey: ["role-perms"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const summarize = (r: CustomRole) => {
    const mods = new Set(r.permissions.filter((p) => p.allowed).map((p) => p.module));
    return `${mods.size} modul`;
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="font-semibold">Role & Hak Akses</h3>
            <p className="text-sm text-muted-foreground">
              Buat role custom untuk mengatur hak akses per modul (Lihat, Buat, Ubah, Hapus).
              Role ini dapat dipilih saat menambah / mengubah user.
            </p>
          </div>
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Tambah Role
          </Button>
        </div>

        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Role</TableHead>
                <TableHead>Ringkasan Akses</TableHead>
                <TableHead>Dibuat</TableHead>
                <TableHead className="w-32 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      {r.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{summarize(r)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("id-ID")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" title="Edit"
                      onClick={() => { setEditing(r); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Hapus"
                      onClick={() => { if (confirm(`Hapus role "${r.name}"?`)) mDelete.mutate(r.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!roles.length && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">
                  {rolesQ.isLoading ? "Memuat..." : "Belum ada role custom"}
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {open && (
          <CustomRoleDialog
            initial={editing}
            onClose={() => { setOpen(false); setEditing(null); }}
            onSaved={() => {
              qc.invalidateQueries({ queryKey: ["custom-roles"] });
              qc.invalidateQueries({ queryKey: ["role-perms"] });
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}

function CustomRoleDialog({
  initial, onClose, onSaved,
}: { initial: CustomRole | null; onClose: () => void; onSaved: () => void }) {
  const upsert = useServerFn(upsertCustomRole);
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
      if (p.action === "manage" && p.allowed) {
        map[p.module].create = true; map[p.module].update = true; map[p.module].delete = true;
      }
    }
    return map;
  });

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? ALL_MODULES.filter((m) => m.label.toLowerCase().includes(q) || m.group.toLowerCase().includes(q))
      : ALL_MODULES;
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
      (["view", "create", "update", "delete"] as (keyof Row)[]).forEach((a) => {
        if (v[a]) rows.push({ module, action: a, allowed: true });
      });
    }
    try {
      await upsert({ data: { id: initial?.id, name: name.trim(), permissions: rows } });
      toast.success("Role disimpan");
      onSaved(); onClose();
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
            <div className="space-y-1">
              <Label>Nama Role</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="misal: Kepala Cabang" />
            </div>
            <div className="space-y-1">
              <Label>Cari nama hak akses</Label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ketik untuk mencari…" />
            </div>
          </div>
          <div className="flex-1 overflow-auto rounded border">
            {Object.entries(groups).map(([group, mods]) => (
              <div key={group} className="border-b last:border-b-0">
                <div className="flex items-center justify-between bg-muted/50 px-3 py-2">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">{group}</div>
                  <button type="button" onClick={() => activateAllGroup(mods)}
                    className="text-xs text-primary hover:underline">
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
                        {(["view", "create", "update", "delete"] as (keyof Row)[]).map((a) => (
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
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={save}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
