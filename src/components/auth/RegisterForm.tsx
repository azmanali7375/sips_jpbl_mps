import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authService } from "@/services/authService";
import { AlertCircle } from "lucide-react";

type UserRole = "applicant" | "admin_assistant" | "unit_head" | "assistant_planner_j5" | "department_head" | "ydp";

export function RegisterForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "applicant" as UserRole,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Kata laluan tidak sepadan");
      return;
    }

    if (formData.password.length < 6) {
      setError("Kata laluan mestilah sekurang-kurangnya 6 aksara");
      return;
    }

    setLoading(true);

    try {
      await authService.signUp(
        formData.email,
        formData.password,
        formData.fullName,
        formData.role
      );
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Pendaftaran gagal. Sila cuba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const roleLabels: Record<UserRole, string> = {
    applicant: "Pemohon",
    admin_assistant: "Pembantu Tadbir",
    unit_head: "Ketua Unit",
    assistant_planner_j5: "Penolong Pegawai J5",
    department_head: "Ketua Jabatan",
    ydp: "Yang Dipertua",
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Daftar Akaun Baharu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="fullName">Nama Penuh</Label>
            <Input
              id="fullName"
              placeholder="Nama penuh anda"
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Emel</Label>
            <Input
              id="email"
              type="email"
              placeholder="nama@contoh.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Peranan</Label>
            <Select
              value={formData.role}
              onValueChange={(value) =>
                setFormData({ ...formData, role: value as UserRole })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(roleLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Kata Laluan</Label>
            <Input
              id="password"
              type="password"
              placeholder="Sekurang-kurangnya 6 aksara"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Sahkan Kata Laluan</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Masukkan semula kata laluan"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Memuatkan..." : "Daftar"}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Sudah ada akaun?{" "}
            <Link href="/auth/login" className="text-primary hover:underline">
              Log masuk di sini
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}