import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { profileService } from "@/services/profileService";
import { authService } from "@/services/authService";
import { Loader2, User, Mail, Briefcase, Shield, Save } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [user, setUser] = useState<any>(null);

  // Form state
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [designation, setDesignation] = useState("");

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);

      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        router.push("/auth/login");
        return;
      }
      setUser(currentUser);

      const profileData = await profileService.getCurrentProfile();
      if (profileData) {
        setProfile(profileData);
        setFullName(profileData.full_name || "");
        setPhoneNumber(profileData.phone || "");
        setDesignation(profileData.designation || "");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast({
        title: "Ralat",
        description: "Gagal memuatkan profil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast({
        title: "Ralat",
        description: "Nama penuh diperlukan",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      await profileService.updateProfile({
        full_name: fullName.trim(),
        phone: phoneNumber.trim() || null,
        designation: designation.trim() || null,
      });

      toast({
        title: "Berjaya",
        description: "Profil telah dikemaskini",
      });

      await loadProfileData();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Ralat",
        description: "Gagal menyimpan profil",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-600">Pentadbir</Badge>;
      case "head":
        return <Badge className="bg-blue-600">Ketua Unit</Badge>;
      case "planner":
        return <Badge className="bg-green-600">Perancang</Badge>;
      case "assistant":
        return <Badge className="bg-purple-600">Pembantu</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-2xl mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Profil Pengguna</h1>
          <p className="text-muted-foreground">Kemaskini maklumat peribadi anda</p>
        </div>

        {/* Profile Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Maklumat Akaun
              </span>
              {profile?.role && getRoleBadge(profile.role)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  E-mel
                </div>
                <div className="font-medium">{user?.email}</div>
              </div>
              <div>
                <div className="text-muted-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Peranan
                </div>
                <div className="font-medium">{profile?.role || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">ID Pengguna</div>
                <div className="font-mono text-xs">{profile?.id.substring(0, 8)}...</div>
              </div>
              <div>
                <div className="text-muted-foreground">Dibuat</div>
                <div className="text-xs">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString("ms-MY")
                    : "-"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-6" />

        {/* Edit Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Kemaskini Profil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <Label htmlFor="fullName">
                  Nama Penuh <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Masukkan nama penuh"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phoneNumber">Nombor Telefon</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Contoh: 012-3456789"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="designation">Jawatan</Label>
                <Input
                  id="designation"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="Contoh: Perancang Bandar J29"
                  className="mt-1"
                />
              </div>

              <Button type="submit" disabled={saving} className="w-full">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Simpan Perubahan
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}