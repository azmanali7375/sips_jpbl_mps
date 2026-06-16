import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { kertasPerakuanService, type AIDraftResult } from "@/services/kertasPerakuanService";
import { agencyUlasanService } from "@/services/agencyUlasanService";
import { ArrowLeft, Save, FileText, Sparkles, Copy, Upload, AlertCircle, Loader2 } from "lucide-react";

export default function KertasPerakuanPage() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [application, setApplication] = useState<any>(null);
  const [kertasPerakuan, setKertasPerakuan] = useState<any>(null);
  const [ulasanPerancangan, setUlasanPerancangan] = useState<any>(null);
  const [agencyUlasan, setAgencyUlasan] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [aiDrafting, setAiDrafting] = useState(false);
  const [showUploadHelper, setShowUploadHelper] = useState(false);

  const [formData, setFormData] = useState({
    juru_perunding_nama: "",
    juru_perunding_syarikat: "",
    perakuan_teks: "",
    syor_perakuan: "",
    syarat_perakuan: "",
    disediakan_oleh: "",
    jawatan: "",
    tarikh: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);

      // Ensure id is a string
      const applicationId = Array.isArray(id) ? id[0] : id;
      if (!applicationId) throw new Error("Invalid application ID");

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setCurrentUser(profile);

      // Get application
      const { data: app, error: appError } = await supabase
        .from("applications")
        .select("*")
        .eq("id", applicationId)
        .single();

      if (appError) throw appError;
      setApplication(app);

      // Get Ulasan Perancangan
      const { data: ulasan } = await (supabase as any)
        .from("ulasan_perancangan")
        .select("*")
        .eq("application_id", applicationId)
        .maybeSingle();

      setUlasanPerancangan(ulasan);

      // Check if Ulasan Perancangan is submitted
      if (!ulasan || ulasan.status !== "Dikemukakan") {
        toast({
          title: "Ulasan Perancangan Diperlukan",
          description: "Sila kemukakan Ulasan Perancangan terlebih dahulu",
          variant: "destructive",
        });
      }

      // Get agency ulasan
      const agencies = await agencyUlasanService.getByApplication(applicationId);
      setAgencyUlasan(agencies);

      // Get existing Kertas Perakuan
      const existing = await kertasPerakuanService.getByApplication(applicationId);

      if (existing) {
        setKertasPerakuan(existing);
        setFormData({
          juru_perunding_nama: existing.juru_perunding_nama || "",
          juru_perunding_syarikat: existing.juru_perunding_syarikat || "",
          perakuan_teks: existing.perakuan_teks || "",
          syor_perakuan: existing.syor_perakuan || "",
          syarat_perakuan: existing.syarat_perakuan || "",
          disediakan_oleh: existing.disediakan_oleh || "",
          jawatan: existing.jawatan || "",
          tarikh: existing.tarikh || new Date().toISOString().split("T")[0],
        });
      } else {
        // Pre-fill from profile
        setFormData((prev) => ({
          ...prev,
          disediakan_oleh: profile?.full_name || "",
          jawatan: profile?.designation || "",
        }));
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Ralat",
        description: "Gagal memuatkan data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleAIDraft() {
    if (!ulasanPerancangan) {
      toast({
        title: "Ralat",
        description: "Ulasan Perancangan tidak dijumpai",
        variant: "destructive",
      });
      return;
    }

    try {
      setAiDrafting(true);

      const draft = await kertasPerakuanService.generateAIDraft(
        ulasanPerancangan,
        agencyUlasan
      );

      setFormData((prev) => ({
        ...prev,
        syor_perakuan: draft.syor_perakuan,
        perakuan_teks: draft.perakuan_teks,
        syarat_perakuan: draft.syarat_perakuan || "",
      }));

      toast({
        title: "Draf AI Berjaya",
        description: "Sila semak dan ubah suai draf AI",
      });
    } catch (error) {
      console.error("AI draft error:", error);
      toast({
        title: "Ralat AI",
        description: "Gagal menjana draf AI",
        variant: "destructive",
      });
    } finally {
      setAiDrafting(false);
    }
  }

  async function handleSave(muktamad: boolean = false) {
    if (!formData.syor_perakuan || !formData.perakuan_teks) {
      toast({
        title: "Ralat",
        description: "Sila lengkapkan semua medan yang diperlukan",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      // Ensure id is a string
      const applicationId = Array.isArray(id) ? id[0] : id;
      if (!applicationId) throw new Error("Invalid application ID");

      const kpData = {
        application_id: applicationId,
        no_fail: application.no_fail_jpl,
        no_id_online: application.no_permohonan_osc,
        tarikh_permohonan_lengkap: application.tarikh_lengkap_diterima_osc,
        juru_perunding_nama: formData.juru_perunding_nama || null,
        juru_perunding_syarikat: formData.juru_perunding_syarikat || null,
        luas_m2: application.kawasan_pembangunan_m2 || 0,
        luas_hektar: (application.kawasan_pembangunan_m2 || 0) / 10000,
        luas_ekar: (application.kawasan_pembangunan_m2 || 0) / 4046.86,
        perakuan_teks: formData.perakuan_teks,
        syor_perakuan: formData.syor_perakuan,
        syarat_perakuan: formData.syarat_perakuan || null,
        disediakan_oleh: formData.disediakan_oleh,
        jawatan: formData.jawatan,
        tarikh: formData.tarikh,
        status: muktamad ? "Dikemukakan" : "Draf",
      };

      if (kertasPerakuan) {
        await kertasPerakuanService.update(kertasPerakuan.id, kpData);
      } else {
        const newId = await kertasPerakuanService.create(kpData);
        setKertasPerakuan({ id: newId, ...kpData });
      }

      // Add workflow history
      await supabase.from("workflow_history").insert({
        application_id: applicationId,
        action: muktamad ? "Kertas Perakuan Dimuktamadkan" : "Kertas Perakuan Disimpan (Draf)",
        performed_by: currentUser.id,
        notes: `Syor: ${formData.syor_perakuan}`,
      });

      toast({
        title: "Berjaya",
        description: muktamad
          ? "Kertas Perakuan telah dimuktamadkan"
          : "Draf disimpan",
      });

      loadData();
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Ralat",
        description: "Gagal menyimpan Kertas Perakuan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(formData.perakuan_teks);
    toast({
      title: "Disalin",
      description: "Teks perakuan disalin ke clipboard",
    });
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!application) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Permohonan tidak dijumpai</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
            <h1 className="text-3xl font-bold">Kertas Perakuan</h1>
            <p className="text-muted-foreground mt-1">
              Mesyuarat Jawatankuasa Pusat Setempat (OSC)
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              Simpan Draf
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={saving}
            >
              <FileText className="h-4 w-4 mr-2" />
              Muktamad & Jana PDF
            </Button>
          </div>
        </div>

        {/* Warning if Ulasan Perancangan not submitted */}
        {(!ulasanPerancangan || ulasanPerancangan.status !== "Dikemukakan") && (
          <Alert className="bg-orange-50 border-orange-200">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-900">
              Ulasan Perancangan belum dikemukakan. Sila kemukakan Ulasan Perancangan terlebih dahulu.
            </AlertDescription>
          </Alert>
        )}

        {/* Application Header */}
        <Card>
          <CardHeader>
            <CardTitle>Butiran Permohonan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Permohonan:</span>
                <p className="text-muted-foreground">{application.tajuk_permohonan}</p>
              </div>
              <div>
                <span className="font-medium">Pemohon:</span>
                <p className="text-muted-foreground">{application.nama_pemaju_pemilik}</p>
              </div>
              <div>
                <span className="font-medium">No. Fail:</span>
                <p className="text-muted-foreground">{application.no_fail_jpl}</p>
              </div>
              <div>
                <span className="font-medium">No. ID Online:</span>
                <p className="text-muted-foreground">{application.no_permohonan_osc}</p>
              </div>
              <div>
                <span className="font-medium">Tarikh Lengkap:</span>
                <p className="text-muted-foreground">
                  {application.tarikh_lengkap_diterima_osc}
                </p>
              </div>
              <div>
                <span className="font-medium">Luas:</span>
                <p className="text-muted-foreground">
                  {application.kawasan_pembangunan_m2?.toFixed(2)} m² ||{" "}
                  {((application.kawasan_pembangunan_m2 || 0) / 10000).toFixed(4)} hektar ||{" "}
                  {((application.kawasan_pembangunan_m2 || 0) / 4046.86).toFixed(4)} ekar
                </p>
              </div>
            </div>

            {/* Juru Perunding */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <Label>Juru Perunding (Nama)</Label>
                <Input
                  value={formData.juru_perunding_nama}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, juru_perunding_nama: e.target.value }))
                  }
                  placeholder="Nama juru perunding"
                />
              </div>
              <div>
                <Label>Syarikat Perunding</Label>
                <Input
                  value={formData.juru_perunding_syarikat}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      juru_perunding_syarikat: e.target.value,
                    }))
                  }
                  placeholder="Nama syarikat"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agency Ulasan */}
        <Card>
          <CardHeader>
            <CardTitle>Ulasan Agensi Teknikal</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agensi</TableHead>
                  <TableHead>Tarikh Ulasan</TableHead>
                  <TableHead>Ringkasan Ulasan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agencyUlasan
                  .filter((a) => a.keputusan_agensi !== "Tiada Ulasan")
                  .sort((a, b) => a.kod_agensi.localeCompare(b.kod_agensi))
                  .map((agency) => (
                    <TableRow key={agency.id}>
                      <TableCell>
                        <Badge variant="secondary">{agency.kod_agensi}</Badge>
                      </TableCell>
                      <TableCell>{agency.tarikh_ulasan || "-"}</TableCell>
                      <TableCell>
                        {agency.ringkasan_ulasan || "Tiada ulasan"}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* AI Draft Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Perakuan Jabatan Memproses</CardTitle>
              <Button
                variant="outline"
                onClick={handleAIDraft}
                disabled={aiDrafting || !ulasanPerancangan}
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
              >
                {aiDrafting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Menjana...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Jana Draf Perakuan dengan AI
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.perakuan_teks && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 text-sm">
                  Draf AI — sila semak dan ubah suai sebelum menandatangani
                </AlertDescription>
              </Alert>
            )}

            <div>
              <Label>Syor Perakuan</Label>
              <Select
                value={formData.syor_perakuan}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, syor_perakuan: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih syor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Syor Lulus">Syor Lulus</SelectItem>
                  <SelectItem value="Syor Lulus dengan Pindaan Pelan">
                    Syor Lulus dengan Pindaan Pelan
                  </SelectItem>
                  <SelectItem value="Syor Tangguh">Syor Tangguh</SelectItem>
                  <SelectItem value="Syor Tolak">Syor Tolak</SelectItem>
                </SelectContent>
              </Select>
              {formData.syor_perakuan && (
                <Badge
                  className={`mt-2 ${kertasPerakuanService.getSyorColor(
                    formData.syor_perakuan
                  )}`}
                >
                  {formData.syor_perakuan}
                </Badge>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Teks Perakuan</Label>
                {formData.perakuan_teks && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyToClipboard}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Salin Teks
                  </Button>
                )}
              </div>
              <Textarea
                value={formData.perakuan_teks}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, perakuan_teks: e.target.value }))
                }
                rows={8}
                placeholder="Berdasarkan semakan teknikal dan ulasan agensi..."
              />
            </div>

            {(formData.syor_perakuan === "Syor Lulus dengan Pindaan Pelan" ||
              formData.syor_perakuan === "Syor Tangguh") && (
              <div>
                <Label>Syarat-syarat / Pindaan Diperlukan</Label>
                <Textarea
                  value={formData.syarat_perakuan}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, syarat_perakuan: e.target.value }))
                  }
                  rows={4}
                  placeholder="1. Pemaju hendaklah..."
                />
              </div>
            )}

            {/* Signature Block */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <Label>Disediakan Oleh</Label>
                <Input
                  value={formData.disediakan_oleh}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, disediakan_oleh: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Jawatan</Label>
                <Input
                  value={formData.jawatan}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, jawatan: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Tarikh</Label>
                <Input
                  type="date"
                  value={formData.tarikh}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, tarikh: e.target.value }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload to OSC */}
        {kertasPerakuan && kertasPerakuan.status === "Dikemukakan" && (
          <Card>
            <CardHeader>
              <CardTitle>Upload ke OSC 3 Plus</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => setShowUploadHelper(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Panduan Upload ke OSC
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upload Helper Modal */}
      <Dialog open={showUploadHelper} onOpenChange={setShowUploadHelper}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Langkah Upload ke OSC 3 Plus</DialogTitle>
            <DialogDescription>
              Ikuti langkah-langkah ini untuk memuat naik Kertas Perakuan ke portal OSC
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Muat turun PDF Kertas Perakuan ini</li>
              <li>Log masuk ke portal OSC 3 Plus</li>
              <li>Buka permohonan {application.no_permohonan_osc}</li>
              <li>Pergi ke bahagian "Kertas Perakuan"</li>
              <li>Salin teks perakuan ke dalam medan "Ulasan anda"</li>
              <li>Lampirkan PDF sebagai lampiran</li>
              <li>Klik "Simpan Kertas Perakuan"</li>
            </ol>
            <Button
              onClick={copyToClipboard}
              className="w-full"
            >
              <Copy className="h-4 w-4 mr-2" />
              Salin Teks Perakuan
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadHelper(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}