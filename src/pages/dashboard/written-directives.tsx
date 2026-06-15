import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Save } from "lucide-react";
import {
  createWrittenDirective,
  updateWrittenDirective,
  getWrittenDirective,
  JENIS_BORANG_OPTIONS,
  STATUS_PEMATUHAN_OPTIONS,
  type WrittenDirectiveFormData,
} from "@/services/writtenDirectiveService";

// This file is actually for Written Directives (Arahan Bertulis - Borang A1)
// For report templates, we need a separate page

export default function WrittenDirectivePage() {
  const router = useRouter();
  const { application_id, id } = router.query;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form state
  const [jenisBorang, setJenisBorang] = useState("");
  const [tarikhDikeluarkan, setTarikhDikeluarkan] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [arahan, setArahan] = useState("");
  const [tarikhPematuhanDikehendaki, setTarikhPematuhanDikehendaki] = useState("");
  const [tarikhPematuhanDiterima, setTarikhPematuhanDiterima] = useState("");
  const [statusPematuhan, setStatusPematuhan] = useState("Menunggu");
  const [catatan, setCatatan] = useState("");
  const [yangDipertuaName, setYangDipertuaName] = useState("YB. Dato' Haji Ahmad bin Abdullah");

  useEffect(() => {
    if (!application_id) return;
    loadData();
  }, [application_id, id]);

  async function loadData() {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setCurrentUser(profile);

      // Convert application_id to string
      const appId = Array.isArray(application_id) ? application_id[0] : application_id;
      if (!appId) return;

      // Get application details
      const { data: appData } = await supabase
        .from("applications")
        .select("*")
        .eq("id", appId)
        .single();

      setApplication(appData);

      // If editing, load existing directive
      if (id) {
        setIsEditMode(true);
        const directiveId = Array.isArray(id) ? id[0] : id;
        const directive = await getWrittenDirective(directiveId);
        
        if (directive) {
          setJenisBorang(directive.jenis_borang || "");
          setTarikhDikeluarkan(directive.tarikh_dikeluarkan || "");
          setArahan(directive.arahan || directive.directive_content || "");
          setTarikhPematuhanDikehendaki(directive.tarikh_pematuhan_dikehendaki || "");
          setTarikhPematuhanDiterima(directive.tarikh_pematuhan_diterima || "");
          setStatusPematuhan(directive.status_pematuhan || "Menunggu");
          setCatatan(directive.catatan || "");
          setYangDipertuaName(directive.yang_dipertua_name || "YB. Dato' Haji Ahmad bin Abdullah");
        }
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

  async function handleSubmit() {
    if (!application_id || !currentUser) return;

    // Validation
    if (!jenisBorang || !tarikhDikeluarkan || !arahan.trim() || !tarikhPematuhanDikehendaki) {
      toast({
        title: "Ralat",
        description: "Sila lengkapkan medan wajib: Jenis Borang, Tarikh Dikeluarkan, Arahan, dan Tarikh Pematuhan Dikehendaki",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const formData: WrittenDirectiveFormData = {
        application_id: application_id as string,
        jenis_borang: jenisBorang,
        tarikh_dikeluarkan: tarikhDikeluarkan,
        arahan: arahan,
        tarikh_pematuhan_dikehendaki: tarikhPematuhanDikehendaki,
        tarikh_pematuhan_diterima: tarikhPematuhanDiterima || undefined,
        status_pematuhan: statusPematuhan,
        catatan: catatan || undefined,
        nama_pemohon: application.nama_pemaju_pemilik,
        tajuk_permohonan: application.tajuk_permohonan,
        alamat_pemohon: application.alamat_pemohon || "",
        yang_dipertua_name: yangDipertuaName,
      };

      if (isEditMode && id) {
        const directiveId = Array.isArray(id) ? id[0] : id;
        await updateWrittenDirective(directiveId, formData, currentUser.id);
        toast({
          title: "Berjaya",
          description: "Arahan Bertulis berjaya dikemaskini",
        });
      } else {
        await createWrittenDirective(formData, currentUser.id);
        toast({
          title: "Berjaya",
          description: "Arahan Bertulis berjaya didaftarkan",
        });
      }

      // Redirect back to application detail
      router.push(`/dashboard/permohonan/${application_id}`);
    } catch (error) {
      console.error("Error submitting written directive:", error);
      toast({
        title: "Ralat",
        description: "Gagal menyimpan Arahan Bertulis",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Memuatkan...</div>
        </div>
      </Layout>
    );
  }

  if (!application) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <div className="text-muted-foreground">Permohonan tidak dijumpai</div>
          <Button onClick={() => router.push("/dashboard")}>
            Kembali ke Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/dashboard/permohonan/${application_id}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
            <div>
              <h1 className="text-2xl font-bold font-serif">
                {isEditMode ? "Edit Arahan Bertulis" : "Daftar Arahan Bertulis"}
              </h1>
              <p className="text-muted-foreground">
                {application.no_fail_jpl} - {application.nama_pemaju_pemilik}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Maklumat Arahan Bertulis</CardTitle>
            <CardDescription>
              Borang KPPA untuk arahan bertulis dan pematuhan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">No. Fail (Rujukan)</label>
              <Input value={application.no_fail_jpl} disabled />
            </div>

            <div>
              <label className="text-sm font-medium">Jenis Borang *</label>
              <Select value={jenisBorang} onValueChange={setJenisBorang}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis borang" />
                </SelectTrigger>
                <SelectContent>
                  {JENIS_BORANG_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Tarikh Dikeluarkan *</label>
                <Input
                  type="date"
                  value={tarikhDikeluarkan}
                  onChange={(e) => setTarikhDikeluarkan(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tarikh Pematuhan Dikehendaki *</label>
                <Input
                  type="date"
                  value={tarikhPematuhanDikehendaki}
                  onChange={(e) => setTarikhPematuhanDikehendaki(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Arahan / Pematuhan Diperlukan *</label>
              <Textarea
                rows={8}
                placeholder="Masukkan arahan bertulis / pematuhan yang diperlukan..."
                value={arahan}
                onChange={(e) => setArahan(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Tarikh Pematuhan Diterima</label>
                <Input
                  type="date"
                  value={tarikhPematuhanDiterima}
                  onChange={(e) => setTarikhPematuhanDiterima(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Status Pematuhan</label>
                <Select value={statusPematuhan} onValueChange={setStatusPematuhan}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_PEMATUHAN_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Catatan</label>
              <Textarea
                rows={3}
                placeholder="Catatan tambahan..."
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Yang Dipertua (Tandatangan Borang A1)</label>
              <Input
                value={yangDipertuaName}
                onChange={(e) => setYangDipertuaName(e.target.value)}
                placeholder="Nama Yang Dipertua"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Nama penandatangan untuk Borang A(1)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/permohonan/${application_id}`)}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            <Save className="h-4 w-4 mr-2" />
            {submitting ? "Menyimpan..." : isEditMode ? "Kemaskini" : "Simpan"}
          </Button>
        </div>
      </div>
    </Layout>
  );
}