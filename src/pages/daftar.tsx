import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isFirstUser, setIsFirstUser] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    staff_id: "",
    email: "",
    password: "",
    confirm_password: "",
    designation: "",
    department: "Jabatan Perancang Bandar dan Landskap",
    phone: "",
  });

  useEffect(() => {
    checkForExistingAdmin();
  }, []);

  async function checkForExistingAdmin() {
    try {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");

      setIsFirstUser(count === 0);
    } catch (error) {
      console.error("Error checking admin:", error);
    } finally {
      setCheckingAdmin(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validation
    if (
      !formData.full_name.trim() ||
      !formData.staff_id.trim() ||
      !formData.email.trim() ||
      !formData.password ||
      !formData.designation
    ) {
      toast({
        title: "Ralat",
        description: "Sila lengkapkan semua medan yang diperlukan",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirm_password) {
      toast({
        title: "Ralat",
        description: "Kata laluan tidak sepadan",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        title: "Ralat",
        description: "Kata laluan mesti sekurang-kurangnya 8 aksara",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Check if staff_id already exists
      const { data: existingStaff } = await supabase
        .from("profiles")
        .select("staff_id")
        .eq("staff_id", formData.staff_id)
        .maybeSingle();

      if (existingStaff) {
        toast({
          title: "Ralat",
          description: "No. Kad Pengenalan / No. Staf ini telah didaftarkan",
          variant: "destructive",
        });
        return;
      }

      // Check again if admin exists (race condition protection)
      const { count: adminCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");

      const shouldBeFirstAdmin = adminCount === 0;

      // Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          toast({
            title: "Ralat",
            description: "Email ini telah didaftarkan",
            variant: "destructive",
          });
        } else {
          throw authError;
        }
        return;
      }

      if (!authData.user) {
        throw new Error("User creation failed");
      }

      // Create profile
      const profileData = {
        id: authData.user.id,
        full_name: formData.full_name,
        staff_id: formData.staff_id,
        email: formData.email,
        designation: formData.designation,
        department: formData.department,
        phone: formData.phone || null,
        role: shouldBeFirstAdmin ? "admin" : null,
        status: shouldBeFirstAdmin ? "Aktif" : "Menunggu Kelulusan",
      };

      const { error: profileError } = await supabase
        .from("profiles")
        .insert(profileData);

      if (profileError) throw profileError;

      // Send notifications to admins (only if not first admin)
      if (!shouldBeFirstAdmin) {
        const { data: admins } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "admin")
          .eq("status", "Aktif");

        if (admins && admins.length > 0) {
          const notifications = admins.map((admin) => ({
            user_id: admin.id,
            title: "Pendaftaran Baharu",
            message: `Pendaftaran baharu: ${formData.full_name} (${formData.staff_id}) menunggu kelulusan.`,
            type: "info" as const,
            is_read: false,
          }));

          await supabase.from("notifications").insert(notifications);
        }
      }

      if (shouldBeFirstAdmin) {
        // Auto-login first admin
        toast({
          title: "Selamat Datang!",
          description: "Akaun Admin berjaya diwujudkan. SIPS sedia digunakan.",
        });
        router.push("/dashboard");
      } else {
        // Show success message for normal registration
        setRegistrationSuccess(true);
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Ralat Pendaftaran",
        description: error.message || "Gagal mendaftar akaun",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Menyemak sistem...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>Pendaftaran Berjaya</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Akaun anda memerlukan kelulusan Ketua Jabatan sebelum boleh digunakan.
                Anda akan dimaklumkan melalui email apabila akaun diluluskan.
              </AlertDescription>
            </Alert>
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Untuk makluman lanjut, sila hubungi:
              </p>
              <p className="font-medium">Azman Bin Ali</p>
              <p className="text-sm text-muted-foreground">Pegawai Perancang Bandar dan Desa</p>
              <p className="text-sm text-muted-foreground">Jabatan Perancang Bandar dan Landskap</p>
            </div>
            <Button className="w-full" onClick={() => router.push("/login")}>
              Pergi ke Halaman Log Masuk
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-primary">SIPS</h1>
            <p className="text-sm text-muted-foreground">Smart Internal Processing System</p>
            <p className="text-xs text-muted-foreground mt-1">
              Jabatan Perancang Bandar dan Landskap
            </p>
            <p className="text-xs text-muted-foreground">Majlis Perbandaran Segamat</p>
          </div>
          {isFirstUser ? (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 mb-4">
              <CardTitle className="text-amber-900">Persediaan Awal Sistem</CardTitle>
              <CardDescription className="text-amber-700 mt-2">
                Anda adalah pengguna pertama sistem ini. Akaun pertama akan ditetapkan sebagai
                Admin (Ketua Jabatan) secara automatik.
              </CardDescription>
            </div>
          ) : (
            <>
              <CardTitle>Daftar Akaun SIPS</CardTitle>
              <CardDescription>Sila lengkapkan butiran pendaftaran</CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="full_name">
                Nama Penuh <span className="text-red-500">*</span>
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Cth: Ahmad Bin Abdullah"
                required
              />
            </div>

            <div>
              <Label htmlFor="staff_id">
                No. Kad Pengenalan / No. Staf <span className="text-red-500">*</span>
              </Label>
              <Input
                id="staff_id"
                value={formData.staff_id}
                onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                placeholder="Cth: 850101-01-5678 atau S12345"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="nama@mpsegamat.gov.my"
                required
              />
            </div>

            <div>
              <Label htmlFor="designation">
                Jawatan <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.designation}
                onValueChange={(value) => setFormData({ ...formData, designation: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jawatan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pegawai Perancang Bandar dan Desa">
                    Pegawai Perancang Bandar dan Desa
                  </SelectItem>
                  <SelectItem value="Penolong Pegawai Perancang">
                    Penolong Pegawai Perancang
                  </SelectItem>
                  <SelectItem value="Pembantu Tadbir">Pembantu Tadbir</SelectItem>
                  <SelectItem value="Ketua Unit">Ketua Unit</SelectItem>
                  <SelectItem value="Pengurusan Atasan">Pengurusan Atasan</SelectItem>
                  <SelectItem value="Lain-lain">Lain-lain</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="department">Jabatan</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                disabled={!isFirstUser}
                className={!isFirstUser ? "bg-muted" : ""}
              />
              {!isFirstUser && (
                <p className="text-xs text-muted-foreground mt-1">
                  Medan ini tidak boleh diubah
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">No. Telefon (Opsional)</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="013-1234567"
              />
            </div>

            <div>
              <Label htmlFor="password">
                Kata Laluan <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Min. 8 aksara"
                required
              />
            </div>

            <div>
              <Label htmlFor="confirm_password">
                Sahkan Kata Laluan <span className="text-red-500">*</span>
              </Label>
              <Input
                id="confirm_password"
                type="password"
                value={formData.confirm_password}
                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                placeholder="Taip semula kata laluan"
                required
              />
            </div>

            {!isFirstUser && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Peranan akan ditetapkan oleh pentadbir selepas pendaftaran anda diluluskan.
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mendaftar...
                </>
              ) : isFirstUser ? (
                "Wujudkan Akaun Admin"
              ) : (
                "Daftar"
              )}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Sudah mempunyai akaun? </span>
              <Link href="/login" className="text-primary hover:underline font-medium">
                Log Masuk
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}