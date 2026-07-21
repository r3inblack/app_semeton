import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Masuk — Aplikasi Semeton" }] }),
  component: AuthPage,
});

function usernameToEmail(username: string) {
  const u = username.trim().toLowerCase();
  if (u.includes("@")) return u;
  return `${u}@semeton.app`;
}

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const signIn = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!username || !password) return toast.error("Username & password wajib diisi");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });
    setLoading(false);
    if (error) return toast.error("Username atau password salah");
    toast.success("Berhasil masuk");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-[oklch(0.97_0.02_255)] via-background to-[oklch(0.94_0.04_255)] p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-[oklch(0.48_0.20_258)] text-primary-foreground font-bold text-xl shadow-lg shadow-primary/30 mb-3">
            S
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Aplikasi Semeton</h1>
          <p className="text-sm text-muted-foreground mt-1">Sistem manajemen stok & keuangan</p>
        </div>
        <Card className="border-border/60 shadow-xl shadow-primary/5">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Masuk ke akun Anda</CardTitle>
            <CardDescription>Gunakan username & password yang diberikan admin</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={signIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Username</Label>
                <Input
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full h-10 font-medium" disabled={loading}>
                {loading ? "Memproses..." : "Masuk"}
              </Button>
              <p className="text-xs text-muted-foreground text-center pt-1">
                Akun baru hanya dapat dibuat oleh Super Admin.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
