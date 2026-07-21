import { ReactNode, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export type FormField =
  | { name: string; label: string; type: "text" | "number" | "textarea" }
  | { name: string; label: string; type: "select"; options: { value: string; label: string }[] };

export function TxForm({
  title, fields, onSubmit, submitLabel = "Simpan",
}: {
  title: string;
  fields: FormField[];
  onSubmit: (values: Record<string, any>) => Promise<void>;
  submitLabel?: string;
}) {
  const [form, setForm] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setLoading(true);
    try {
      await onSubmit(form);
      setForm({});
      toast.success("Tersimpan");
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal menyimpan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {fields.map((f) => (
            <div key={f.name} className={"space-y-1 " + (f.type === "textarea" ? "md:col-span-2" : "")}>
              <Label>{f.label}</Label>
              {f.type === "select" ? (
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={form[f.name] ?? ""}
                  onChange={(e) => set(f.name, e.target.value)}
                >
                  <option value="">— pilih —</option>
                  {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.type === "textarea" ? (
                <Textarea value={form[f.name] ?? ""} onChange={(e) => set(f.name, e.target.value)} />
              ) : f.type === "number" ? (
                <NumberInput
                  value={form[f.name] ?? ""}
                  onChange={(e) => set(f.name, e.target.value)}
                />
              ) : (
                <Input
                  type="text"
                  value={form[f.name] ?? ""}
                  onChange={(e) => set(f.name, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
        <Button onClick={submit} disabled={loading}>{submitLabel}</Button>
      </CardContent>
    </Card>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      {children}
    </div>
  );
}
