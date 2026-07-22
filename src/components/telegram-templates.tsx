import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { invalidateTelegramTemplateCache } from "@/lib/telegram";

type Template = {
  key: string;
  label: string;
  module: string;
  template: string;
  variables: string[];
  enabled: boolean;
};

const MODULE_LABEL: Record<string, string> = {
  kas: "Kas",
  stok: "Stok",
  penggajian: "Penggajian",
  pengajuan: "Pengajuan Harga",
};

export function TelegramTemplatesManager() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["telegram_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("telegram_templates" as any)
        .select("key, label, module, template, variables, enabled")
        .order("module", { ascending: true })
        .order("label", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Template[];
    },
  });

  const grouped = (q.data ?? []).reduce<Record<string, Template[]>>((acc, t) => {
    (acc[t.module] ||= []).push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-2">
          <h3 className="font-semibold">Template Pesan Telegram</h3>
          <p className="text-sm text-muted-foreground">
            Sesuaikan format pesan untuk setiap event. Gunakan variabel dengan format{" "}
            <code>{"{{nama_variabel}}"}</code>. Sisa saldo kas otomatis ditambahkan pada notifikasi transaksi grup.
          </p>
        </CardContent>
      </Card>

      {Object.entries(grouped).map(([mod, list]) => (
        <div key={mod} className="space-y-3">
          <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            {MODULE_LABEL[mod] ?? mod}
          </h4>
          {list.map((t) => (
            <TemplateEditor
              key={t.key}
              tpl={t}
              onSaved={() => {
                invalidateTelegramTemplateCache();
                qc.invalidateQueries({ queryKey: ["telegram_templates"] });
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function TemplateEditor({ tpl, onSaved }: { tpl: Template; onSaved: () => void }) {
  const [text, setText] = useState(tpl.template);
  const [enabled, setEnabled] = useState(tpl.enabled);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setText(tpl.template);
    setEnabled(tpl.enabled);
  }, [tpl.template, tpl.enabled]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("telegram_templates" as any)
      .update({ template: text, enabled })
      .eq("key", tpl.key);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Template "${tpl.label}" disimpan`);
    onSaved();
  };

  const insertVar = (v: string) => {
    setText((prev) => `${prev}{{${v}}}`);
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="font-medium">{tpl.label}</div>
            <div className="text-xs text-muted-foreground font-mono">{tpl.key}</div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            {enabled ? "Aktif" : "Nonaktif"}
          </label>
        </div>

        <div className="space-y-1">
          <Label>Isi Pesan</Label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={Math.max(4, text.split("\n").length)}
            className="font-mono text-sm"
          />
        </div>

        {tpl.variables?.length ? (
          <div className="space-y-1">
            <Label className="text-xs">Variabel tersedia (klik untuk menyisipkan)</Label>
            <div className="flex flex-wrap gap-1">
              {tpl.variables.map((v) => (
                <Badge
                  key={v}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80"
                  onClick={() => insertVar(v)}
                >
                  {`{{${v}}}`}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setText(tpl.template);
              setEnabled(tpl.enabled);
            }}
          >
            Batal
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
