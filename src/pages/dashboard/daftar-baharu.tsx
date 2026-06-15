import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  registerNewApplication,
  getOfficers,
  RegistrationFormData,
} from "@/services/registrationService";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Calendar, User, MapPin, Building2, AlertCircle } from "lucide-react";

export default function DaftarBaharu() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [officers, setOfficers] = useState<{ id: string; full_name: string }[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [calculatedKPIDate, setCalculatedKPIDate] = useState<string>("");

  const [formData, setFormData] = useState<RegistrationFormData>({
    no_permohonan_osc: "",
    kategori_permohonan: "",
    skala_pembangunan: "Kecil",
    jenis_proses_pr: "Tidak",
    status_semakan_osc: "",
    tarikh_penghantaran: "",
    tarikh_lengkap_diterima_osc: "",
    nama_sp: "",
    no_kp_sp: "",
    nama_pemaju_pemilik: "",
    tajuk_permohonan: "",
    lokasi_mercu_tanda: "",
    mukim: "",
    daerah: "Segamat",
    negeri: "Johor",
    rancangan_tempatan: "Tidak",
    zoning: "",
    longitud: undefined,
    latitud: undefined,
    pegawai_bertanggungjawab: "",
    status_dalaman: "Diterima",
    catatan_dalaman: "",
  });

  useEffect(() => {
    async function loadData() {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        router.push("/auth/login");
        return;
      }

      // Load officers
      const officersList = await getOfficers();
      setOfficers(officersList);
    }

    loadData();
  }, [router]);

  // Auto-calculate KPI date when tarikh_lengkap_diterima_osc changes
  useEffect(() => {
    if (formData.tarikh_lengkap_diterima_osc) {
      const date = new Date(formData.tarikh_lengkap_diterima_osc);
      date.setDate(date.getDate() + 57);
      const kpiDate = date.toLocaleDateString("ms-MY", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      setCalculatedKPIDate(kpiDate);
    } else {
      setCalculatedKPIDate("");
    }
  }, [formData.tarikh_lengkap_diterima_osc]);

  const handleInputChange = (
    field: keyof RegistrationFormData,
    value: string | number | undefined
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.no_permohonan_osc.trim()) {
      toast({
        title: "Ralat Pengesahan",
        description: "No. Permohonan OSC diperlukan",
        variant: "destructive",
      });
      return;
    }

    if (!formData.tarikh_penghantaran) {
      toast({
        title: "Ralat Pengesahan",
        description: "Tarikh Penghantaran diperlukan",
        variant: "destructive",
      });
      return;
    }

    if (!formData.tarikh_lengkap_diterima_osc) {
      toast({
        title: "Ralat Pengesahan",
        description: "Tarikh Lengkap Diterima OSC diperlukan",
        variant: "destructive",
      });
      return;
    }

    if (!formData.nama_sp.trim()) {
      toast({
        title: "Ralat Pengesahan",
        description: "Nama Pemohon (SP) diperlukan",
        variant: "destructive",
      });
      return;
    }

    if (!formData.tajuk_permohonan.trim()) {
      toast({
        title: "Ralat Pengesahan",
        description: "Tajuk Permohonan diperlukan",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const result = await registerNewApplication(formData, userId);

    setLoading(false);

    if (result.success) {
      toast({
        title: "✓ Permohonan Berjaya Didaftar",
        description: `No. Fail JPL: ${result.no_fail_jpl}\nTarikh Akhir KPI: ${result.tarikh_kpi}`,
      });

      // Redirect to application detail page
      setTimeout(() => {
        router.push(`/dashboard/reports/${result.application_id}`);
      }, 1500);
    } else {
      toast({
        title: "Ralat Pendaftaran",
        description: result.error || "Gagal mendaftar permohonan",
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary">
              Daftar Permohonan Baharu
            </h1>
            <p className="text-muted-foreground mt-1">
              Sistem Pintar Kawalan Pembangunan (SIPS) — Majlis Perbandaran Segamat
            </p>
          </div>
        </div>

        {/* Info Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Salin maklumat daripada OSC 3.0 Plus Online. Pastikan semua medan yang
            bertanda * diisi dengan betul. Selepas pendaftaran, anda akan diarahkan ke
            halaman permohonan untuk menambah maklumat tanah (lot details).
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: RUJUKAN OSC */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                SECTION 1: RUJUKAN OSC
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <Label htmlFor="no_permohonan_osc">
                  No. Permohonan OSC <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="no_permohonan_osc"
                  placeholder="Contoh: MPSEG-KM20260427-001"
                  value={formData.no_permohonan_osc}
                  onChange={(e) =>
                    handleInputChange("no_permohonan_osc", e.target.value)
                  }
                  required
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Salin daripada medan &apos;No. Permohonan&apos; dalam OSC 3.0 Plus
                </p>
              </div>

              <div>
                <Label htmlFor="kategori_permohonan">Kategori Permohonan</Label>
                <Input
                  id="kategori_permohonan"
                  placeholder="Contoh: Permohonan Kebenaran Merancang (Permohonan Baru)"
                  value={formData.kategori_permohonan}
                  onChange={(e) =>
                    handleInputChange("kategori_permohonan", e.target.value)
                  }
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="skala_pembangunan">Skala Pembangunan</Label>
                  <Select
                    value={formData.skala_pembangunan}
                    onValueChange={(value) =>
                      handleInputChange("skala_pembangunan", value as any)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kecil">Kecil</SelectItem>
                      <SelectItem value="Sederhana">Sederhana</SelectItem>
                      <SelectItem value="Besar A">Besar A</SelectItem>
                      <SelectItem value="Besar B">Besar B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="jenis_proses_pr">Jenis Proses PR</Label>
                  <Select
                    value={formData.jenis_proses_pr}
                    onValueChange={(value) =>
                      handleInputChange("jenis_proses_pr", value as any)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ya">Ya</SelectItem>
                      <SelectItem value="Tidak">Tidak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="status_semakan_osc">
                  Status Semakan (OSC) — untuk rujukan sahaja
                </Label>
                <Input
                  id="status_semakan_osc"
                  placeholder="Contoh: Lulus (P2)"
                  value={formData.status_semakan_osc}
                  onChange={(e) =>
                    handleInputChange("status_semakan_osc", e.target.value)
                  }
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Status ini tidak diubah suai oleh SIPS
                </p>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 2: TARIKH PENTING */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                SECTION 2: TARIKH PENTING
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tarikh_penghantaran">
                    Tarikh Penghantaran <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="tarikh_penghantaran"
                    type="date"
                    value={formData.tarikh_penghantaran}
                    onChange={(e) =>
                      handleInputChange("tarikh_penghantaran", e.target.value)
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="tarikh_lengkap_diterima_osc">
                    ⭐ Tarikh Lengkap Diterima OSC (Tarikh Mula KPI){" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="tarikh_lengkap_diterima_osc"
                    type="date"
                    value={formData.tarikh_lengkap_diterima_osc}
                    onChange={(e) =>
                      handleInputChange("tarikh_lengkap_diterima_osc", e.target.value)
                    }
                    required
                  />
                </div>
              </div>

              {calculatedKPIDate && (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-900">
                    <strong>Tarikh Akhir KPI (57 Hari):</strong> {calculatedKPIDate}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* SECTION 3: MAKLUMAT PEMOHON */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                SECTION 3: MAKLUMAT PEMOHON
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <Label htmlFor="nama_sp">
                  Nama Pemohon (SP) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nama_sp"
                  placeholder="Nama penuh pemohon"
                  value={formData.nama_sp}
                  onChange={(e) => handleInputChange("nama_sp", e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="no_kp_sp">No. K/P Pemohon</Label>
                <Input
                  id="no_kp_sp"
                  placeholder="Contoh: 123456-78-9012"
                  value={formData.no_kp_sp}
                  onChange={(e) => handleInputChange("no_kp_sp", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="nama_pemaju_pemilik">Nama Pemaju/Pemilik</Label>
                <Input
                  id="nama_pemaju_pemilik"
                  placeholder="Nama pemaju atau pemilik tanah"
                  value={formData.nama_pemaju_pemilik}
                  onChange={(e) =>
                    handleInputChange("nama_pemaju_pemilik", e.target.value)
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* SECTION 4: MAKLUMAT PEMBANGUNAN */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                SECTION 4: MAKLUMAT PEMBANGUNAN
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <Label htmlFor="tajuk_permohonan">
                  Tajuk Permohonan <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="tajuk_permohonan"
                  placeholder="Salin tajuk pembangunan lengkap daripada OSC"
                  value={formData.tajuk_permohonan}
                  onChange={(e) =>
                    handleInputChange("tajuk_permohonan", e.target.value)
                  }
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label htmlFor="lokasi_mercu_tanda">
                  Lokasi/Mercu Tanda Berhampiran
                </Label>
                <Input
                  id="lokasi_mercu_tanda"
                  placeholder="Contoh: Berdekatan Taman Tasik Segamat"
                  value={formData.lokasi_mercu_tanda}
                  onChange={(e) =>
                    handleInputChange("lokasi_mercu_tanda", e.target.value)
                  }
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="mukim">Mukim</Label>
                  <Input
                    id="mukim"
                    placeholder="Contoh: Sungai Segamat"
                    value={formData.mukim}
                    onChange={(e) => handleInputChange("mukim", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="daerah">Daerah</Label>
                  <Input
                    id="daerah"
                    value={formData.daerah}
                    onChange={(e) => handleInputChange("daerah", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="negeri">Negeri</Label>
                  <Input
                    id="negeri"
                    value={formData.negeri}
                    onChange={(e) => handleInputChange("negeri", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rancangan_tempatan">Rancangan Tempatan</Label>
                  <Select
                    value={formData.rancangan_tempatan}
                    onValueChange={(value) =>
                      handleInputChange("rancangan_tempatan", value as any)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ya">Ya</SelectItem>
                      <SelectItem value="Tidak">Tidak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="zoning">Zoning</Label>
                  <Input
                    id="zoning"
                    placeholder="Contoh: Komersial, Kediaman, Industri"
                    value={formData.zoning}
                    onChange={(e) => handleInputChange("zoning", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="latitud">Latitud (Latitude)</Label>
                  <Input
                    id="latitud"
                    type="number"
                    step="0.00000001"
                    placeholder="Contoh: 2.50342100"
                    value={formData.latitud || ""}
                    onChange={(e) =>
                      handleInputChange(
                        "latitud",
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="longitud">Longitud (Longitude)</Label>
                  <Input
                    id="longitud"
                    type="number"
                    step="0.00000001"
                    placeholder="Contoh: 102.82495200"
                    value={formData.longitud || ""}
                    onChange={(e) =>
                      handleInputChange(
                        "longitud",
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 5: PENUGASAN DALAMAN (SIPS) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                SECTION 5: PENUGASAN DALAMAN (SIPS)
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <Label htmlFor="pegawai_bertanggungjawab">
                  Pegawai Bertanggungjawab
                </Label>
                <Select
                  value={formData.pegawai_bertanggungjawab}
                  onValueChange={(value) =>
                    handleInputChange("pegawai_bertanggungjawab", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih pegawai..." />
                  </SelectTrigger>
                  <SelectContent>
                    {officers.map((officer) => (
                      <SelectItem key={officer.id} value={officer.id}>
                        {officer.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status_dalaman">Status Dalaman (SIPS)</Label>
                <Select
                  value={formData.status_dalaman}
                  onValueChange={(value) => handleInputChange("status_dalaman", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Diterima">Diterima</SelectItem>
                    <SelectItem value="Dalam Semakan Teknikal">
                      Dalam Semakan Teknikal
                    </SelectItem>
                    <SelectItem value="Menunggu Ulasan ATD">
                      Menunggu Ulasan ATD
                    </SelectItem>
                    <SelectItem value="Kertas Perakuan Disediakan">
                      Kertas Perakuan Disediakan
                    </SelectItem>
                    <SelectItem value="Menunggu OSC">Menunggu OSC</SelectItem>
                    <SelectItem value="Lulus">Lulus</SelectItem>
                    <SelectItem value="Lulus Bersyarat">Lulus Bersyarat</SelectItem>
                    <SelectItem value="Ditolak">Ditolak</SelectItem>
                    <SelectItem value="Dibatalkan">Dibatalkan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="catatan_dalaman">Catatan Dalaman</Label>
                <Textarea
                  id="catatan_dalaman"
                  placeholder="Nota dalaman pegawai JPL (tidak kelihatan kepada pemohon)"
                  value={formData.catatan_dalaman}
                  onChange={(e) =>
                    handleInputChange("catatan_dalaman", e.target.value)
                  }
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard")}
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Mendaftar..." : "Daftar Permohonan"}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}