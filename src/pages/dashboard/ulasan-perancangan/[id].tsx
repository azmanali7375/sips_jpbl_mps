import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ulasanPerancanganService } from "@/services/ulasanPerancanganService";
import { profileService } from "@/services/profileService";
import { FileText, Save, Send, Sparkles, ArrowLeft, Loader2 } from "lucide-react";

export default function UlasanPerancanganPage() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingB, setGeneratingB] = useState(false);
  const [generatingC, setGeneratingC] = useState(false);
  const [application, setApplication] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [ulasanId, setUlasanId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    seksyen_a_mylcp_score: "TB",
    seksyen_b_semakan_ulasan: "",
    seksyen_c_isu_berkaitan: "",
    seksyen_d_pindaan_pelan: "Tiada",
    seksyen_e_ulasan_keseluruhan: "",
    syor_jabatan: "",
    disediakan_oleh: "",
    jawatan: "",
    tarikh: new Date().toISOString().split("T")[0],
    status: "Draf" as "Draf" | "Dikemukakan",
  });

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  async function loadData() {
    try {
      // Get current user profile
      const profile = await profileService.getCurrentProfile();
      setCurrentUser(profile);

      // Get application data
      const { data: appData, error: appError } = await supabase
        .from("applications")
        .select("*")
        .eq("id", id as string)
        .single();

      if (appError) throw appError;
      setApplication(appData);

      // Check if ulasan already exists
      const existingUlasan = await ulasanPerancanganService.getByApplicationId(id as string);

      if (existingUlasan) {
        setUlasanId(existingUlasan.id);
        setFormData({
          seksyen_a_mylcp_score: existingUlasan.seksyen_a_mylcp_score || "TB",
          seksyen_b_semakan_ulasan: existingUlasan.seksyen_b_semakan_ulasan || "",
          seksyen_c_isu_berkaitan: existingUlasan.seksyen_c_isu_berkaitan || "",
          seksyen_d_pindaan_pelan: existingUlasan.seksyen_d_pindaan_pelan || "Tiada",
          seksyen_e_ulasan_keseluruhan: existingUlasan.seksyen_e_ulasan_keseluruhan || "",
          syor_jabatan: existingUlasan.syor_jabatan || "",
          disediakan_oleh: existingUlasan.disediakan_oleh || "",
          jawatan: existingUlasan.jawatan || "",
          tarikh: existingUlasan.tarikh || new Date().toISOString().split("T")[0],
          status: existingUlasan.status as "Draf" | "Dikemukakan",
        });
      } else {
        // Pre-fill user details
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

  async function handleSave(submitMode: boolean = false) {
    if (!application) return;

    setSaving(true);
    try {
      const ulasanData = {
        application_id: application.id,
        no_rujukan_fail: application.no_fail_jpl,
        ...formData,
        status: submitMode ? ("Dikemukakan" as const) : formData.status,
      };

      if (ulasanId) {
        await ulasanPerancanganService.update(ulasanId, ulasanData);
      } else {
        const created = await ulasanPerancanganService.create(ulasanData);
        setUlasanId(created.id);
      }

      toast({
        title: submitMode ? "Dikemukakan" : "Disimpan",
        description: submitMode
          ? "Ulasan Perancangan telah dikemukakan"
          : "Draf telah disimpan",
      });

      if (submitMode) {
        router.push(`/dashboard/permohonan/${id}`);
      }
    } catch (error) {
      console.error("Error saving ulasan:", error);
      toast({
        title: "Ralat",
        description: "Gagal menyimpan ulasan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateSectionB() {
    if (!application) return;

    setGeneratingB(true);
    try {
      const suggestion = await ulasanPerancanganService.generateSectionBSuggestion(
        application.id
      );
      setFormData((prev) => ({
        ...prev,
        seksyen_b_semakan_ulasan: suggestion,
      }));
      toast({
        title: "Cadangan AI Dijana",
        description: "Sila semak dan edit mengikut keperluan",
      });
    } catch (error) {
      console.error("Error generating Section B:", error);
      toast({
        title: "Ralat",
        description: "Gagal menjana cadangan AI",
        variant: "destructive",
      });
    } finally {
      setGeneratingB(false);
    }
  }

  async function handleGenerateSectionC() {
    if (!application) return;

    setGeneratingC(true);
    try {
      const suggestion = await ulasanPerancanganService.generateSectionCSuggestion(
        application.id
      );
      setFormData((prev) => ({
        ...prev,
        seksyen_c_isu_berkaitan: suggestion,
      }));
      toast({
        title: "Cadangan AI Dijana",
        description: "Sila semak dan edit mengikut keperluan",
      });
    } catch (error) {
      console.error("Error generating Section C:", error);
      toast({
        title: "Ralat",
        description: "Gagal menjana cadangan AI",
        variant: "destructive",
      });
    } finally {
      setGeneratingC(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Memuatkan data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!application) {
    return (
      <Layout>
        <Alert variant="destructive">
          <AlertDescription>Permohonan tidak dijumpai</AlertDescription>
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push(`/dashboard/permohonan/${id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-serif font-bold text-primary">
                Ulasan Perancangan
              </h1>
              {formData.status === "Dikemukakan" && (
                <Badge className="bg-green-600">Dikemukakan</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Jabatan Perancang Bandar Dan Landskap, Majlis Perbandaran Segamat
            </p>
          </div>
        </div>

        {/* Official Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2 mb-6">
              <div className="font-semibold text-lg">
                JABATAN PERANCANG BANDAR DAN LANDSKAP
              </div>
              <div className="font-semibold">MAJLIS PERBANDARAN SEGAMAT</div>
              <div className="font-bold text-xl mt-2">ULASAN PERANCANGAN</div>
            </div>

            <div className="space-y-2 text-sm border-t pt-4">
              <div className="flex">
                <span className="font-medium w-48">No. Rujukan Fail:</span>
                <span className="font-semibold">{application.no_fail_jpl}</span>
              </div>
              <div className="flex">
                <span className="font-medium w-48">Tajuk Permohonan:</span>
                <span className="font-semibold">{application.tajuk_permohonan}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section A: MyLCP Score */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">A. MyLCP Score (jika berkaitan)</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              value={formData.seksyen_a_mylcp_score}
              onChange={(e) =>
                setFormData({ ...formData, seksyen_a_mylcp_score: e.target.value })
              }
              placeholder="TB (Tidak Berkaitan) atau masukkan skor"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Default: TB (Tidak Berkaitan). Jika berkaitan, masukkan nilai skor MyLCP.
            </p>
          </CardContent>
        </Card>

        {/* Section B: Review of Technical Report */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                B. SEMAKAN & ULASAN TERHADAP PENEMUAN LAPORAN TEKNIKAL PERMOHONAN
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateSectionB}
                disabled={generatingB}
              >
                {generatingB ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Cadangan AI
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.seksyen_b_semakan_ulasan}
              onChange={(e) =>
                setFormData({ ...formData, seksyen_b_semakan_ulasan: e.target.value })
              }
              rows={6}
              placeholder="Ringkasan naratif penemuan laporan teknikal..."
            />
          </CardContent>
        </Card>

        {/* Section C: Issues */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                C. ISU-ISU BERKAITAN PERMOHONAN
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateSectionC}
                disabled={generatingC}
              >
                {generatingC ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Cadangan AI
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.seksyen_c_isu_berkaitan}
              onChange={(e) =>
                setFormData({ ...formData, seksyen_c_isu_berkaitan: e.target.value })
              }
              rows={4}
              placeholder="Senaraikan isu-isu teknikal, perundangan, atau perancangan yang perlu diberi perhatian..."
            />
          </CardContent>
        </Card>

        {/* Section D: Plan Amendments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              D. PERKARA-PERKARA YANG MEMERLUKAN PINDAAN PELAN
              <span className="text-sm font-normal text-muted-foreground ml-2">
                (Lampirkan Cadangan Pindaan jika berkaitan)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.seksyen_d_pindaan_pelan}
              onChange={(e) =>
                setFormData({ ...formData, seksyen_d_pindaan_pelan: e.target.value })
              }
              rows={4}
              placeholder="Tiada / Senaraikan pindaan yang diperlukan..."
            />
          </CardContent>
        </Card>

        {/* Section E: Overall Review */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              E. ULASAN KESELURUHAN JABATAN PERANCANGAN BANDAR & LANDSKAP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.seksyen_e_ulasan_keseluruhan}
              onChange={(e) =>
                setFormData({ ...formData, seksyen_e_ulasan_keseluruhan: e.target.value })
              }
              rows={5}
              placeholder="Ulasan naratif keseluruhan jabatan..."
            />
          </CardContent>
        </Card>

        {/* Department Recommendation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Syor Jabatan</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={formData.syor_jabatan}
              onValueChange={(value) =>
                setFormData({ ...formData, syor_jabatan: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih syor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tiada Halangan">Tiada Halangan</SelectItem>
                <SelectItem value="Tiada Halangan dengan Syarat">
                  Tiada Halangan dengan Syarat
                </SelectItem>
                <SelectItem value="Tidak Menyokong">Tidak Menyokong</SelectItem>
                <SelectItem value="Perlu Pindaan Pelan">Perlu Pindaan Pelan</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Signature Block */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Disediakan Oleh</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nama</Label>
              <Input
                value={formData.disediakan_oleh}
                onChange={(e) =>
                  setFormData({ ...formData, disediakan_oleh: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Jawatan</Label>
              <Input
                value={formData.jawatan}
                onChange={(e) =>
                  setFormData({ ...formData, jawatan: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Tarikh</Label>
              <Input
                type="date"
                value={formData.tarikh}
                onChange={(e) =>
                  setFormData({ ...formData, tarikh: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={saving || formData.status === "Dikemukakan"}
          >
            <Save className="h-4 w-4 mr-2" />
            Simpan Draf
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={saving || formData.status === "Dikemukakan"}
          >
            <Send className="h-4 w-4 mr-2" />
            Kemukakan
          </Button>
          <Button variant="outline" disabled>
            <FileText className="h-4 w-4 mr-2" />
            Jana PDF
          </Button>
        </div>
      </div>
    </Layout>
  );
}