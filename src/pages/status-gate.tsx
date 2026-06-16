import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, XCircle, Clock, Ban } from "lucide-react";

export default function StatusGate() {
  const router = useRouter();
  const { status } = router.query;
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(profileData);
    } catch (error) {
      console.error("Error loading profile:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function renderStatusScreen() {
    if (loading) {
      return (
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Memuatkan...</p>
          </CardContent>
        </Card>
      );
    }

    if (!profile) return null;

    // Pending approval
    if (status === "pending" || profile.status === "Menunggu Kelulusan") {
      return (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <CardTitle>Akaun Menunggu Kelulusan</CardTitle>
            <CardDescription>Pendaftaran anda sedang disemak</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Akaun anda telah didaftarkan dan sedang menunggu kelulusan daripada Ketua Jabatan.
              </AlertDescription>
            </Alert>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Untuk makluman lanjut, sila hubungi:</p>
              <div className="bg-muted p-3 rounded-md">
                <p className="font-medium text-foreground">Azman Bin Ali</p>
                <p>Pegawai Perancang Bandar dan Desa</p>
                <p>Jabatan Perancang Bandar dan Landskap</p>
                <p>Majlis Perbandaran Segamat</p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline" className="w-full">
              Log Keluar
            </Button>
          </CardContent>
        </Card>
      );
    }

    // Rejected
    if (status === "rejected" || profile.status === "Ditolak") {
      return (
        <Card className="w-full max-w-md border-red-200">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-red-900">Pendaftaran Ditolak</CardTitle>
            <CardDescription>Permohonan anda tidak diluluskan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900">
                <strong>Sebab Penolakan:</strong>
                <p className="mt-2">{profile.rejection_reason || "Tiada sebab dinyatakan"}</p>
              </AlertDescription>
            </Alert>
            <div className="text-sm text-muted-foreground">
              <p>Untuk maklumat lanjut atau rayuan, sila hubungi Ketua Jabatan.</p>
            </div>
            <Button onClick={handleLogout} variant="outline" className="w-full">
              Log Keluar
            </Button>
          </CardContent>
        </Card>
      );
    }

    // Inactive
    if (status === "inactive" || profile.status === "Tidak Aktif") {
      return (
        <Card className="w-full max-w-md border-gray-300">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Ban className="h-8 w-8 text-gray-600" />
            </div>
            <CardTitle className="text-gray-900">Akaun Tidak Aktif</CardTitle>
            <CardDescription>Akaun anda telah dinyahaktifkan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Akaun anda telah dinyahaktifkan oleh pentadbir sistem. Anda tidak lagi mempunyai
                akses ke SIPS.
              </AlertDescription>
            </Alert>
            <div className="text-sm text-muted-foreground">
              <p>
                Jika anda percaya ini adalah kesilapan, sila hubungi Ketua Jabatan untuk
                pengaktifan semula.
              </p>
            </div>
            <Button onClick={handleLogout} variant="outline" className="w-full">
              Log Keluar
            </Button>
          </CardContent>
        </Card>
      );
    }

    // No role (edge case)
    if (status === "no-role" || (profile.status === "Aktif" && !profile.role)) {
      return (
        <Card className="w-full max-w-md border-orange-200">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
            <CardTitle className="text-orange-900">Peranan Belum Ditetapkan</CardTitle>
            <CardDescription>Akaun anda memerlukan peranan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-orange-50 border-orange-200">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-900">
                Akaun anda telah diaktifkan tetapi peranan belum ditetapkan. Sila hubungi
                pentadbir sistem.
              </AlertDescription>
            </Alert>
            <Button onClick={handleLogout} variant="outline" className="w-full">
              Log Keluar
            </Button>
          </CardContent>
        </Card>
      );
    }

    // Default: active with role - shouldn't reach here
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Mengalihkan ke papan pemuka...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      {renderStatusScreen()}
    </div>
  );
}