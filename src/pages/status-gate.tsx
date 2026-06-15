import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Clock, XCircle, Ban } from "lucide-react";

export default function StatusGatePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserStatus();
  }, []);

  async function checkUserStatus() {
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

      // If user is active, redirect to dashboard
      if (profileData.status === "Aktif") {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error checking status:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Menyemak status akaun...</p>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  // Render different screens based on status
  const renderStatusScreen = () => {
    switch (profile.status) {
      case "Menunggu Kelulusan":
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="h-10 w-10 text-yellow-600" />
              </div>
              <CardTitle className="text-2xl">Akaun Menunggu Kelulusan</CardTitle>
              <CardDescription>
                Akaun anda sedang dalam proses kelulusan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-900">
                  <p className="font-medium mb-2">Status: Menunggu Kelulusan</p>
                  <p className="text-sm">
                    Akaun anda telah didaftarkan dan sedang menunggu kelulusan daripada Ketua Jabatan.
                    Anda akan menerima emel apabila akaun anda diluluskan.
                  </p>
                </AlertDescription>
              </Alert>

              <div className="text-center text-sm text-muted-foreground space-y-1">
                <p>Untuk maklumat lanjut, sila hubungi:</p>
                <p className="font-medium text-foreground">Azman Bin Ali</p>
                <p>Pegawai Perancang Bandar dan Desa</p>
                <p className="text-primary">azman.ali@mpsegamat.gov.my</p>
              </div>

              <Button onClick={handleLogout} variant="outline" className="w-full">
                Log Keluar
              </Button>
            </CardContent>
          </Card>
        );

      case "Ditolak":
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <CardTitle className="text-2xl">Akaun Ditolak</CardTitle>
              <CardDescription>
                Permohonan pendaftaran anda telah ditolak
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-900">
                  <p className="font-medium mb-2">Status: Ditolak</p>
                  {profile.rejection_reason && (
                    <div className="mt-3 p-2 bg-white rounded border border-red-100">
                      <p className="text-sm font-medium mb-1">Sebab Penolakan:</p>
                      <p className="text-sm">{profile.rejection_reason}</p>
                    </div>
                  )}
                </AlertDescription>
              </Alert>

              <div className="text-center text-sm text-muted-foreground space-y-1">
                <p>Untuk maklumat lanjut atau rayuan, sila hubungi:</p>
                <p className="font-medium text-foreground">Azman Bin Ali</p>
                <p>Pegawai Perancang Bandar dan Desa</p>
                <p className="text-primary">azman.ali@mpsegamat.gov.my</p>
              </div>

              <Button onClick={handleLogout} variant="outline" className="w-full">
                Log Keluar
              </Button>
            </CardContent>
          </Card>
        );

      case "Tidak Aktif":
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <Ban className="h-10 w-10 text-gray-600" />
              </div>
              <CardTitle className="text-2xl">Akaun Tidak Aktif</CardTitle>
              <CardDescription>
                Akaun anda telah dinyahaktifkan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-gray-50 border-gray-200">
                <AlertCircle className="h-4 w-4 text-gray-600" />
                <AlertDescription className="text-gray-900">
                  <p className="font-medium mb-2">Status: Tidak Aktif</p>
                  <p className="text-sm">
                    Akaun anda telah dinyahaktifkan oleh pentadbir sistem.
                    Sila hubungi Ketua Jabatan untuk maklumat lanjut.
                  </p>
                </AlertDescription>
              </Alert>

              <div className="text-center text-sm text-muted-foreground space-y-1">
                <p>Untuk mengaktifkan semula akaun, sila hubungi:</p>
                <p className="font-medium text-foreground">Azman Bin Ali</p>
                <p>Pegawai Perancang Bandar dan Desa</p>
                <p className="text-primary">azman.ali@mpsegamat.gov.my</p>
              </div>

              <Button onClick={handleLogout} variant="outline" className="w-full">
                Log Keluar
              </Button>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      {renderStatusScreen()}
    </div>
  );
}