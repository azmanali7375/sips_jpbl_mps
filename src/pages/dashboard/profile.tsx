import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Edit, Calendar, Shield, Activity } from "lucide-react";

interface UserProfile {
  id: string;
  full_name: string;
  staff_id: string;
  email: string;
  designation: string;
  department: string;
  phone: string | null;
  role: string | null;
  status: string;
  last_login: string | null;
  created_at: string;
}

interface ProfileStats {
  total_approvals: number;
  pending_assignments: number;
  completed_this_month: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    designation: "",
    phone: "",
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
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

      // Load stats for admin
      if (profileData.role === "admin") {
        const { count: approvalCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("approved_by", user.id);

        const { count: pendingCount } = await supabase
          .from("applications")
          .select("*", { count: "exact", head: true })
          .eq("assigned_officer_id", user.id)
          .not("status", "in", '("approved","rejected")');

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { count: completedCount } = await supabase
          .from("applications")
          .select("*", { count: "exact", head: true })
          .eq("assigned_officer_id", user.id)
          .in("status", ["approved", "rejected"])
          .gte("updated_at", startOfMonth.toISOString());

        setStats({
          total_approvals: approvalCount || 0,
          pending_assignments: pendingCount || 0,
          completed_this_month: completedCount || 0,
        });
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
  }

  async function handleSaveProfile() {
    if (!profile) return;

    try {
      // Update profile info
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.full_name,
          designation: editForm.designation,
          phone: editForm.phone || null,
        })
        .eq("id", profile.id);

      if (profileError) throw profileError;

      // Update password if provided
      if (editForm.new_password) {
        if (editForm.new_password !== editForm.confirm_password) {
          toast({
            title: "Ralat",
            description: "Kata laluan baharu tidak sepadan",
            variant: "destructive",
          });
          return;
        }

        if (editForm.new_password.length < 8) {
          toast({
            title: "Ralat",
            description: "Kata laluan baharu mesti sekurang-kurangnya 8 aksara",
            variant: "destructive",
          });
          return;
        }

        const { error: passwordError } = await supabase.auth.updateUser({
          password: editForm.new_password,
        });

        if (passwordError) throw passwordError;
      }

      toast({
        title: "Berjaya",
        description: "Profil dikemaskini",
      });

      setShowEditDialog(false);
      loadProfile();
    } catch (error) {
      console.error("Save profile error:", error);
      toast({
        title: "Ralat",
        description: "Gagal mengemaskini profil",
        variant: "destructive",
      });
    }
  }

  function getRoleLabel(role: string | null) {
    if (!role) return "Tiada Peranan";
    const roleMap: Record<string, string> = {
      admin: "Admin",
      ketua_unit: "Ketua Unit",
      pegawai: "Pegawai Perancang",
      penolong: "Penolong Pegawai",
      viewer: "Pengurusan (Viewer)",
    };
    return roleMap[role] || role;
  }

  function getRoleBadgeColor(role: string | null) {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 border-red-200";
      case "ketua_unit":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "pegawai":
        return "bg-green-100 text-green-800 border-green-200";
      case "penolong":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  }

  if (loading || !profile) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p>Memuatkan...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Profil Saya</h1>
            <p className="text-muted-foreground mt-1">
              Maklumat peribadi dan statistik akaun
            </p>
          </div>
          <Button
            onClick={() => {
              setEditForm({
                full_name: profile.full_name,
                designation: profile.designation,
                phone: profile.phone || "",
                current_password: "",
                new_password: "",
                confirm_password: "",
              });
              setShowEditDialog(true);
            }}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Profil
          </Button>
        </div>

        {/* Profile Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{profile.full_name}</CardTitle>
                  <p className="text-muted-foreground">{profile.designation}</p>
                </div>
              </div>
              <Badge className={getRoleBadgeColor(profile.role)}>
                <Shield className="h-3 w-3 mr-1" />
                {getRoleLabel(profile.role)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-muted-foreground">No. Staf</Label>
                <p className="font-medium mt-1">{profile.staff_id}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium mt-1">{profile.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Telefon</Label>
                <p className="font-medium mt-1">{profile.phone || "-"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Jabatan</Label>
                <p className="font-medium mt-1">{profile.department}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="mt-1">
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    {profile.status}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Log Masuk Terakhir</Label>
                <p className="font-medium mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {profile.last_login
                    ? new Date(profile.last_login).toLocaleString("ms-MY")
                    : "Belum Log Masuk"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Stats */}
        {profile.role === "admin" && stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Jumlah Kelulusan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.total_approvals}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Pengguna yang diluluskan
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Tugasan Semasa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">
                  {stats.pending_assignments}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Permohonan belum selesai
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Selesai Bulan Ini
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {stats.completed_this_month}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Permohonan diproses
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Maklumat Akaun</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  <strong>Nota Keselamatan:</strong>
                  {profile.role === "admin" && (
                    <span className="ml-2">
                      Sebagai admin, anda tidak boleh menukar peranan atau menyahaktifkan akaun sendiri.
                      Perubahan ini hanya boleh dilakukan oleh admin lain.
                    </span>
                  )}
                  {profile.role !== "admin" && (
                    <span className="ml-2">
                      Jika anda ingin menukar peranan atau status akaun, sila hubungi pentadbir sistem.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
              <div>
                <Label className="text-muted-foreground">Tarikh Pendaftaran</Label>
                <p className="font-medium mt-1">
                  {new Date(profile.created_at).toLocaleDateString("ms-MY", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profil</DialogTitle>
            <DialogDescription>
              Kemaskini maklumat peribadi dan kata laluan
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nama Penuh</Label>
              <Input
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Jawatan</Label>
              <Input
                value={editForm.designation}
                onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
              />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="013-1234567"
              />
            </div>
            <div className="border-t pt-4">
              <Label className="text-sm font-semibold">Tukar Kata Laluan (Opsional)</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Biarkan kosong jika tidak mahu tukar kata laluan
              </p>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Kata Laluan Baharu</Label>
                  <Input
                    type="password"
                    value={editForm.new_password}
                    onChange={(e) => setEditForm({ ...editForm, new_password: e.target.value })}
                    placeholder="Min. 8 aksara"
                  />
                </div>
                <div>
                  <Label className="text-sm">Sahkan Kata Laluan</Label>
                  <Input
                    type="password"
                    value={editForm.confirm_password}
                    onChange={(e) =>
                      setEditForm({ ...editForm, confirm_password: e.target.value })
                    }
                    placeholder="Taip semula kata laluan baharu"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveProfile}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}