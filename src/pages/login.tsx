import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error("Gagal log masuk");
      }

      // Update last_login timestamp
      await supabase
        .from("profiles")
        .update({ last_login: new Date().toISOString() })
        .eq("id", data.user.id);

      // Get user profile to check status
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("status, role")
        .eq("id", data.user.id)
        .single();

      if (profileError) throw profileError;

      // Status gate - redirect based on account status
      if (!profile || profile.status !== "Aktif") {
        router.push("/status-gate");
        return;
      }

      // Active user - redirect to dashboard
      toast({
        title: "Log Masuk Berjaya",
        description: "Selamat datang ke SIPS",
      });

      router.push("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Ralat Log Masuk",
        description: error instanceof Error ? error.message : "Gagal log masuk. Sila cuba lagi.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4">
            <h1 className="text-4xl font-bold text-primary">SIPS</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Smart Internal Processing System
            </p>
            <p className="text-xs text-muted-foreground">
              Jabatan Perancang Bandar dan Landskap
            </p>
            <p className="text-xs text-muted-foreground">
              Majlis Perbandaran Segamat
            </p>
          </div>
          <CardTitle className="text-2xl">Log Masuk</CardTitle>
          <CardDescription>
            Masukkan emel dan kata laluan anda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Emel</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="nama@mpsegamat.gov.my"
                autoComplete="email"
              />
            </div>

            <div>
              <Label htmlFor="password">Kata Laluan</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Masukkan kata laluan"
                autoComplete="current-password"
              />
            </div>

            <div className="flex items-center justify-end">
              <Link
                href="/reset-password"
                className="text-sm text-primary hover:underline"
              >
                Lupa Kata Laluan?
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Memproses..." : "Log Masuk"}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Belum ada akaun? </span>
              <Link href="/daftar" className="text-primary hover:underline">
                Daftar Akaun Baharu
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}