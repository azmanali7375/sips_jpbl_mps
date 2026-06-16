import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [hasAdmin, setHasAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    checkForAdmin();
    checkExistingSession();
  }, []);

  async function checkForAdmin() {
    try {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");

      setHasAdmin(count !== null && count > 0);
    } catch (error) {
      console.error("Error checking admin:", error);
    } finally {
      setCheckingAdmin(false);
    }
  }

  async function checkExistingSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      router.push("/dashboard");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: "Ralat",
        description: "Sila masukkan email dan kata laluan",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Ralat Log Masuk",
            description: "Kata laluan tidak tepat atau email tidak didaftarkan.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      if (!data.user) {
        throw new Error("Login failed");
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (profileError) throw profileError;

      // Update last login
      await supabase
        .from("profiles")
        .update({ last_login: new Date().toISOString() })
        .eq("id", data.user.id);

      // Check status and route accordingly
      if (profile.status === "Menunggu Kelulusan") {
        router.push("/status-gate?status=pending");
      } else if (profile.status === "Ditolak") {
        router.push("/status-gate?status=rejected");
      } else if (profile.status === "Tidak Aktif") {
        router.push("/status-gate?status=inactive");
      } else if (profile.status === "Aktif" && profile.role) {
        router.push("/dashboard");
      } else {
        router.push("/status-gate?status=no-role");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Ralat",
        description: error.message || "Gagal log masuk",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      toast({
        title: "Masukkan Email",
        description: "Sila masukkan email anda terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "Emel Dihantar",
        description: "Sila semak email anda untuk arahan set semula kata laluan",
      });
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({
        title: "Ralat",
        description: error.message || "Gagal menghantar emel",
        variant: "destructive",
      });
    }
  }

  if (checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Memuatkan...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative w-24 h-24">
              <Image
                src="/Logo_MPS.png"
                alt="Logo MPS"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-primary">SIPS</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Smart Internal Processing System
            </p>
            <p className="text-xs text-muted-foreground">
              Jabatan Perancang Bandar dan Landskap
            </p>
            <p className="text-xs text-muted-foreground">Majlis Perbandaran Segamat</p>
          </div>
          <div>
            <CardTitle>Log Masuk</CardTitle>
            <CardDescription>Masukkan butiran akaun anda</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {!hasAdmin && (
            <Alert className="mb-4 bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-900">
                Tiada akaun admin dijumpai. Sila{" "}
                <Link href="/daftar" className="font-medium underline">
                  daftar akaun baharu
                </Link>{" "}
                untuk persediaan awal sistem.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@mpsegamat.gov.my"
                required
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
                placeholder="Masukkan kata laluan"
                required
                autoComplete="current-password"
              />
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-primary hover:underline"
              >
                Lupa Kata Laluan?
              </button>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Log Masuk...
                </>
              ) : (
                "Log Masuk"
              )}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Belum mempunyai akaun? </span>
              <Link href="/daftar" className="text-primary hover:underline font-medium">
                Daftar Akaun Baharu
              </Link>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t text-center text-xs text-muted-foreground">
            <p>SIPS v1.0 © 2026 MPS JPL — Kumpulan Resolver</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}