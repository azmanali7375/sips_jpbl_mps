import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    staff_id: "",
    email: "",
    password: "",
    confirm_password: "",
    designation: "",
    phone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (formData.password.length < 8) {
      toast({
        title: "Ralat",
        description: "Kata laluan mestilah sekurang-kurangnya 8 aksara",
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

    if (!formData.designation) {
      toast({
        title: "Ralat",
        description: "Sila pilih jawatan",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            staff_id: formData.staff_id,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Gagal mencipta akaun");
      }

      // Step 2: Insert profile with pending status
      const { error: profileError } = await supabase.from("profiles").insert({
        id: authData.user.id,
        full_name: formData.full_name,
        staff_id: formData.staff_id,
        email: formData.email,
        designation: formData.designation,
        phone: formData.phone || null,
        department: "Jabatan Perancang Bandar dan Landskap",
        status: "Menunggu Kelulusan",
        role: null,
      });

      if (profileError) throw profileError;

      // Step 3: Send notification to admins
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
          read: false,
        }));

        await supabase.from("notifications").insert(notifications);
      }

      // Step 4: Show success screen
      setSuccess(true);
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Ralat Pendaftaran",
        description: error instanceof Error ? error.message : "Gagal mendaftar akaun",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Pendaftaran Berjaya Dihantar</CardTitle>
            <CardDescription>
              Akaun anda telah didaftarkan dengan jayanya
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <p className="font-medium mb-2">Menunggu Kelulusan</p>
                <p className="text-sm">
                  Akaun anda memerlukan kelulusan daripada Ketua Jabatan sebelum boleh digunakan.
                  Anda akan dihubungi melalui emel apabila akaun anda diluluskan.
                </p>
              </AlertDescription>
            </Alert>
            <div className="text-center text-sm text-muted-foreground">
              <p>Untuk maklumat lanjut, sila hubungi:</p>
              <p className="font-medium mt-1">Azman Bin Ali</p>
              <p>Pegawai Perancang Bandar dan Desa</p>
              <p>azman.ali@mpsegamat.gov.my</p>
            </div>
            <Button
              className="w-full"
              onClick={() => router.push("/login")}
            >
              Kembali ke Log Masuk
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
            <h1 className="text-3xl font-bold text-primary">SIPS</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Smart Internal Processing System
            </p>
            <p className="text-xs text-muted-foreground">
              Jabatan Perancang Bandar dan Landskap
            </p>
            <p className="text-xs text-muted-foreground">
              Majlis Perbandaran Segamat
            </p>
          </div>
          <CardTitle className="text-2xl">Daftar Akaun SIPS</CardTitle>
          <CardDescription>
            Isi maklumat di bawah untuk mendaftar akaun baharu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="full_name">
                Nama Penuh <span className="text-destructive">*</span>
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                placeholder="Contoh: Ahmad Bin Abdullah"
              />
            </div>

            <div>
              <Label htmlFor="staff_id">
                No. Kakitangan / MyKad <span className="text-destructive">*</span>
              </Label>
              <Input
                id="staff_id"
                value={formData.staff_id}
                onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                required
                placeholder="Contoh: MPS-JPL-002"
              />
            </div>

            <div>
              <Label htmlFor="email">
                Emel <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="nama@mpsegamat.gov.my"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Guna emel rasmi @mpsegamat.gov.my jika ada
              </p>
            </div>

            <div>
              <Label htmlFor="designation">
                Jawatan <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.designation}
                onValueChange={(value) => setFormData({ ...formData, designation: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jawatan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pegawai Perancang">Pegawai Perancang</SelectItem>
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
              <Label htmlFor="phone">No. Telefon (Pilihan)</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="012-3456789"
              />
            </div>

            <div>
              <Label htmlFor="password">
                Kata Laluan <span className="text-destructive">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={8}
                placeholder="Minimum 8 aksara"
              />
            </div>

            <div>
              <Label htmlFor="confirm_password">
                Sahkan Kata Laluan <span className="text-destructive">*</span>
              </Label>
              <Input
                id="confirm_password"
                type="password"
                value={formData.confirm_password}
                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                required
                minLength={8}
                placeholder="Ulang kata laluan"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Memproses..." : "Daftar Akaun"}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Sudah ada akaun? </span>
              <Link href="/login" className="text-primary hover:underline">
                Log Masuk
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}