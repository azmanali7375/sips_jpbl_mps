import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileText, Download, CheckCircle, XCircle, AlertCircle, Printer, Calendar } from "lucide-react";
import { applicationService, type Application } from "@/services/applicationService";
import { oscDecisionService, type OSCDecisionType } from "@/services/oscDecisionService";
import { borangC1Service } from "@/services/borangC1Service";
import { borangC2Service } from "@/services/borangC2Service";
import { suratPemberitahuanService } from "@/services/suratPemberitahuanService";
import { useToast } from "@/hooks/use-toast";

export default function OSCDecisionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    tarikh_mesyuarat_osc: "",
    no_mesyuarat: "",
    keputusan_osc: "" as OSCDecisionType,
    syarat_kelulusan: "",
    tempoh_sah_kelulusan: 2,
    no_kelulusan_km: "",
    catatan_osc: "",
  });
  const [application, setApplication] = useState<Application | null>(null);

  // C1 generation state
  const [showC1Modal, setShowC1Modal] = useState(false);
  const [showC2Modal, setShowC2Modal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<string | null>(null);
  const [signatureDate, setSignatureDate] = useState("");
  const [c1Data, setC1Data] = useState<any>(null);
  const [editableC1Data, setEditableC1Data] = useState<any>(null);
  const [generatingC1, setGeneratingC1] = useState(false);
  const [generatingC2, setGeneratingC2] = useState(false);
  const [recordingSignature, setRecordingSignature] = useState(false);

  // C2 generation state
  const [c2Data, setC2Data] = useState<any>(null);
  const [editableC2Data, setEditableC2Data] = useState<any>(null);
  const [generatingC2, setGeneratingC2] = useState(false);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    setLoading(true);
    const apps = await applicationService.getAllApplications({ status: "under_review" });
    setApplications(apps);
    setLoading(false);
  };

  const handleApplicationSelect = async (id: string) => {
    try {
      const app = applications.find((a) => a.id === id);
      if (!app) return;

      setSelectedApp(app);
      setApplication(app);

      // Reset form for new entry
      setFormData({
        tarikh_mesyuarat_osc: "",
        no_mesyuarat: "",
        keputusan_osc: "" as OSCDecisionType,
        syarat_kelulusan: "",
        tempoh_sah_kelulusan: 2,
        no_kelulusan_km: "",
        catatan_osc: "",
      });
    } catch (error) {
      console.error("Error selecting application:", error);
      toast({
        title: "Ralat",
        description: "Gagal memuatkan maklumat permohonan",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || !formData.keputusan_osc) {
      setError("Sila lengkapkan semua medan wajib");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await oscDecisionService.createDecision({
        application_id: selectedApp.id,
        ...formData,
      });

      toast({
        title: "Keputusan OSC Direkodkan",
        description: `Keputusan ${formData.keputusan_osc} berjaya direkodkan. ${
          formData.keputusan_osc === "Lulus" || formData.keputusan_osc === "Lulus Bersyarat"
            ? "Rekod pelan lulus telah diwujudkan secara automatik."
            : ""
        }`,
      });

      // Reset form
      setFormData({
        tarikh_mesyuarat_osc: "",
        no_mesyuarat: "",
        keputusan_osc: "" as OSCDecisionType,
        syarat_kelulusan: "",
        tempoh_sah_kelulusan: 2,
        no_kelulusan_km: "",
        catatan_osc: "",
      });
      setSelectedApp(null);
      loadApplications();
    } catch (error: any) {
      console.error("Error submitting OSC decision:", error);
      setError(error.message || "Ralat semasa merekod keputusan OSC");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateC1 = async (appId: string) => {
    try {
      // Check payment status
      const paymentCheck = await borangC1Service.checkPaymentStatus(appId);
      
      if (!paymentCheck.canGenerate) {
        toast({
          title: "Tidak Boleh Jana C(1)",
          description: paymentCheck.message,
          variant: "destructive",
        });
        return;
      }

      // Get C1 data
      const data = await borangC1Service.getC1Data(appId);
      
      if (!data) {
        toast({
          title: "Ralat",
          description: "Gagal mendapatkan maklumat untuk Borang C(1)",
          variant: "destructive",
        });
        return;
      }

      setC1Data(data);
      setEditableC1Data({ ...data });
      setShowC1Modal(true);
    } catch (error) {
      console.error("Error preparing C1:", error);
      toast({
        title: "Ralat",
        description: "Gagal menyediakan Borang C(1)",
        variant: "destructive",
      });
    }
  };

  const handleDownloadC1 = async () => {
    if (!editableC1Data) return;

    setGeneratingC1(true);
    
    try {
      // Generate C1 form
      const c1Html = borangC1Service.generateC1HTML(editableC1Data);
      const timestamp = new Date().toISOString().split("T")[0].replace(/-/g, "");
      const c1Filename = `C1_${editableC1Data.no_fail_jpl.replace(/\//g, "_")}_${timestamp}.html`;
      
      borangC1Service.downloadC1PDF(c1Html, c1Filename);

      // Also generate Surat Pemberitahuan (Lulus)
      if (selectedApp) {
        const suratData = await suratPemberitahuanService.getSuratData(selectedApp.id, "Lulus");
        if (suratData) {
          const suratHtml = suratPemberitahuanService.generateSuratHTML(suratData);
          const suratFilename = `SuratPemberitahuan_${editableC1Data.no_fail_jpl.replace(/\//g, "_")}_${timestamp}.html`;
          
          // Small delay to avoid download collision
          setTimeout(() => {
            suratPemberitahuanService.downloadSuratPDF(suratHtml, suratFilename);
          }, 500);
        }
      }
      
      toast({
        title: "Dokumen Dijana",
        description: "Borang C(1) dan Surat Pemberitahuan telah dijana. Buka fail HTML dan cetak ke PDF dari pelayar anda.",
      });
      
      setShowC1Modal(false);
    } catch (error) {
      console.error("Error generating C1:", error);
      toast({
        title: "Ralat",
        description: "Gagal menjana dokumen",
        variant: "destructive",
      });
    } finally {
      setGeneratingC1(false);
    }
  };

  const handleGenerateC2 = async (appId: string) => {
    try {
      // Get C2 data
      const data = await borangC2Service.getC2Data(appId);
      
      if (!data) {
        toast({
          title: "Ralat",
          description: "Gagal mendapatkan maklumat untuk Borang C(2)",
          variant: "destructive",
        });
        return;
      }

      setC2Data(data);
      setEditableC2Data({ ...data });
      setShowC2Modal(true);
    } catch (error) {
      console.error("Error preparing C2:", error);
      toast({
        title: "Ralat",
        description: "Gagal menyediakan Borang C(2)",
        variant: "destructive",
      });
    }
  };

  const handleDownloadC2 = async () => {
    if (!editableC2Data) return;

    setGeneratingC2(true);
    
    try {
      // Generate C2 form
      const c2Html = borangC2Service.generateC2HTML(editableC2Data);
      const timestamp = new Date().toISOString().split("T")[0].replace(/-/g, "");
      const c2Filename = `C2_${editableC2Data.no_fail_jpl.replace(/\//g, "_")}_${timestamp}.html`;
      
      borangC2Service.downloadC2PDF(c2Html, c2Filename);

      // Also generate Surat Pemberitahuan (Tolak)
      if (application) {
        const suratData = await suratPemberitahuanService.getSuratData(application.id, "Tolak");
        if (suratData) {
          const suratHtml = suratPemberitahuanService.generateSuratHTML(suratData);
          const suratFilename = `SuratPemberitahuan_${editableC2Data.no_fail_jpl.replace(/\//g, "_")}_${timestamp}.html`;
          
          // Small delay to avoid download collision
          setTimeout(() => {
            suratPemberitahuanService.downloadSuratPDF(suratHtml, suratFilename);
          }, 500);
        }
      }
      
      toast({
        title: "Dokumen Dijana",
        description: "Borang C(2) dan Surat Pemberitahuan telah dijana. Buka fail HTML dan cetak ke PDF dari pelayar anda.",
      });
      
      setShowC2Modal(false);
    } catch (error) {
      console.error("Error generating C2:", error);
      toast({
        title: "Ralat",
        description: "Gagal menjana dokumen",
        variant: "destructive",
      });
    } finally {
      setGeneratingC2(false);
    }
  };

  async function handleGenerateC2(decisionId: string) {
    try {
      setGeneratingC2(true);
      await borangC2Service.generateBorangC2(decisionId);
      toast({
        title: "Borang C2 Dijana",
        description: "Borang C2 telah berjaya dijana.",
      });
      await loadDecisions();
    } catch (error: any) {
      toast({
        title: "Ralat",
        description: error.message || "Gagal menjana Borang C2",
        variant: "destructive",
      });
    } finally {
      setGeneratingC2(false);
      setShowC2Modal(false);
    }
  }

  async function handleRecordSignature() {
    if (!selectedDecision || !signatureDate) {
      toast({
        title: "Ralat",
        description: "Sila pilih tarikh tandatangan",
        variant: "destructive",
      });
      return;
    }

    try {
      setRecordingSignature(true);
      await borangC1Service.recordC1SignatureDate(selectedDecision, signatureDate);
      toast({
        title: "Berjaya",
        description: "Tarikh tandatangan C1 telah direkodkan",
      });
      await loadDecisions();
      setShowSignatureModal(false);
      setSignatureDate("");
      setSelectedDecision(null);
    } catch (error: any) {
      toast({
        title: "Ralat",
        description: error.message || "Gagal merekod tarikh tandatangan",
        variant: "destructive",
      });
    } finally {
      setRecordingSignature(false);
    }
  }

  if (loading) {
  };

  const getDecisionIcon = (type: OSCDecisionType) => {
    switch (type) {
      case "Lulus": return <CheckCircle className="h-5 w-5 text-success" />;
      case "Lulus Bersyarat": return <AlertCircle className="h-5 w-5 text-amber-600" />;
      case "Ditangguhkan": return <Clock className="h-5 w-5 text-slate-600" />;
      case "Ditolak": return <XCircle className="h-5 w-5 text-destructive" />;
    }
  };

  const getDecisionBadge = (type: OSCDecisionType) => {
    switch (type) {
      case "Lulus": return <Badge className="bg-success">Lulus</Badge>;
      case "Lulus Bersyarat": return <Badge variant="secondary">Lulus Bersyarat</Badge>;
      case "Ditangguhkan": return <Badge variant="outline">Ditangguhkan</Badge>;
      case "Ditolak": return <Badge variant="destructive">Ditolak</Badge>;
    }
  };

  return (
    <Layout>
      <SEO title="Keputusan OSC - Sistem SPC MPS" />
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-primary">Keputusan Mesyuarat OSC</h1>
          <p className="text-muted-foreground mt-2">Rekod keputusan dari mesyuarat One Stop Center</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Senarai Permohonan</CardTitle>
              <CardDescription>Pilih permohonan untuk rekod keputusan</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Memuatkan permohonan...</p>
              ) : applications.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tiada permohonan menunggu keputusan OSC</p>
              ) : (
                <div className="space-y-2">
                  {applications.map((app) => (
                    <div key={app.id} className="space-y-2">
                      <Button
                        variant={selectedApp?.id === app.id ? "default" : "outline"}
                        className="w-full justify-start text-left"
                        onClick={() => handleApplicationSelect(app.id)}
                      >
                        <div className="flex-1">
                          <div className="font-medium">{app.tracking_number}</div>
                          <div className="text-xs opacity-75 truncate">{app.project_name}</div>
                        </div>
                      </Button>
                      
                      {/* Show Generate C1 button for approved applications */}
                      {app.status === "approved" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => handleGenerateC1(app.id)}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Jana Borang C(1)
                        </Button>
                      )}

                      {/* Show Generate C2 button for rejected applications */}
                      {app.status === "rejected" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => handleGenerateC2(app.id)}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Jana Borang C(2)
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Borang Keputusan OSC
              </CardTitle>
              <CardDescription>
                Rekodkan keputusan yang dibuat dalam mesyuarat OSC (Admin sahaja)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedApp ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Pilih permohonan untuk merekod keputusan OSC</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">{selectedApp.project_name}</h3>
                    <p className="text-sm text-muted-foreground">No. Fail: {selectedApp.tracking_number}</p>
                    <p className="text-sm text-muted-foreground">Lokasi: {selectedApp.location}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tarikh_mesyuarat">
                        Tarikh Mesyuarat OSC <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="tarikh_mesyuarat"
                        type="date"
                        value={formData.tarikh_mesyuarat_osc}
                        onChange={(e) => setFormData({ ...formData, tarikh_mesyuarat_osc: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="no_mesyuarat">No. Mesyuarat</Label>
                      <Input
                        id="no_mesyuarat"
                        placeholder="cth: OSC/MPS/1/2026"
                        value={formData.no_mesyuarat}
                        onChange={(e) => setFormData({ ...formData, no_mesyuarat: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="keputusan_osc">
                      Keputusan OSC <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.keputusan_osc}
                      onValueChange={(value) => setFormData({ ...formData, keputusan_osc: value as OSCDecisionType })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih keputusan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Lulus">
                          <div className="flex items-center gap-2">
                            {getDecisionIcon("Lulus")}
                            <span>Lulus</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Lulus Bersyarat">
                          <div className="flex items-center gap-2">
                            {getDecisionIcon("Lulus Bersyarat")}
                            <span>Lulus Bersyarat</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Ditangguhkan">
                          <div className="flex items-center gap-2">
                            {getDecisionIcon("Ditangguhkan")}
                            <span>Ditangguhkan</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Ditolak">
                          <div className="flex items-center gap-2">
                            {getDecisionIcon("Ditolak")}
                            <span>Ditolak</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(formData.keputusan_osc === "Lulus" || formData.keputusan_osc === "Lulus Bersyarat") && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="no_kelulusan_km">No. Kelulusan KM</Label>
                        <Input
                          id="no_kelulusan_km"
                          placeholder="cth: KM/2026/123"
                          value={formData.no_kelulusan_km}
                          onChange={(e) => setFormData({ ...formData, no_kelulusan_km: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tempoh_sah">Tempoh Sah Kelulusan (tahun)</Label>
                        <Input
                          id="tempoh_sah"
                          type="number"
                          min="1"
                          max="10"
                          value={formData.tempoh_sah_kelulusan}
                          onChange={(e) => setFormData({ ...formData, tempoh_sah_kelulusan: parseInt(e.target.value) || 2 })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Kelulusan akan sah untuk {formData.tempoh_sah_kelulusan} tahun dari tarikh mesyuarat
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="syarat_kelulusan">Syarat Kelulusan</Label>
                        <Textarea
                          id="syarat_kelulusan"
                          placeholder="Masukkan syarat yang dikenakan (jika ada)..."
                          rows={4}
                          value={formData.syarat_kelulusan}
                          onChange={(e) => setFormData({ ...formData, syarat_kelulusan: e.target.value })}
                        />
                      </div>
                    </>
                  )}

                  {formData.keputusan_osc === "Ditolak" && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Permohonan akan ditandakan sebagai ditolak. Pastikan sebab penolakan direkodkan dalam catatan.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="catatan_osc">Catatan Mesyuarat</Label>
                    <Textarea
                      id="catatan_osc"
                      placeholder="Catatan tambahan dari mesyuarat OSC..."
                      rows={4}
                      value={formData.catatan_osc}
                      onChange={(e) => setFormData({ ...formData, catatan_osc: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button type="submit" disabled={submitting} className="flex-1">
                      {submitting ? "Merekod..." : "Rekod Keputusan OSC"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSelectedApp(null);
                        setFormData({
                          tarikh_mesyuarat_osc: "",
                          no_mesyuarat: "",
                          keputusan_osc: "" as OSCDecisionType,
                          syarat_kelulusan: "",
                          tempoh_sah_kelulusan: 2,
                          no_kelulusan_km: "",
                          catatan_osc: "",
                        });
                      }}
                    >
                      Batal
                    </Button>
                  </div>

                  {formData.keputusan_osc && (
                    <Alert className="border-accent bg-accent/10">
                      <AlertCircle className="h-4 w-4 text-accent" />
                      <AlertDescription className="text-sm">
                        <p className="font-medium mb-1">Automatik akan dilaksanakan:</p>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                          <li>Status permohonan akan dikemaskini</li>
                          <li>Rekod workflow akan diwujudkan</li>
                          <li>Notifikasi akan dihantar kepada pegawai bertugas</li>
                          {(formData.keputusan_osc === "Lulus" || formData.keputusan_osc === "Lulus Bersyarat") && (
                            <li className="font-medium text-success">Rekod pelan lulus akan diwujudkan dalam sistem</li>
                          )}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Borang C(1) Modal */}
        <Dialog open={showC1Modal} onOpenChange={setShowC1Modal}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Jana Borang C(1) - Kebenaran Merancang</DialogTitle>
            </DialogHeader>

            {editableC1Data && (
              <div className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900 text-sm">
                    Semak semua maklumat sebelum menjana PDF. Anda boleh edit syarat kelulusan di bawah.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">No. Fail JPL</Label>
                    <Input value={editableC1Data.no_fail_jpl} disabled className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">No. Permohonan OSC</Label>
                    <Input value={editableC1Data.no_permohonan_osc} disabled className="text-sm" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Nama Pemaju / Pemilik</Label>
                    <Input value={editableC1Data.nama_pemaju_pemilik} disabled className="text-sm" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Alamat Pemohon</Label>
                    <Input
                      value={editableC1Data.alamat_pemohon}
                      onChange={(e) =>
                        setEditableC1Data({ ...editableC1Data, alamat_pemohon: e.target.value })
                      }
                      placeholder="Masukkan alamat lengkap pemohon"
                      className="text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Tajuk Permohonan</Label>
                    <Input value={editableC1Data.tajuk_permohonan} disabled className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">No. Mesyuarat OSC</Label>
                    <Input
                      value={editableC1Data.no_mesyuarat}
                      onChange={(e) =>
                        setEditableC1Data({ ...editableC1Data, no_mesyuarat: e.target.value })
                      }
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Tarikh Mesyuarat</Label>
                    <Input
                      type="date"
                      value={editableC1Data.tarikh_mesyuarat_osc}
                      onChange={(e) =>
                        setEditableC1Data({ ...editableC1Data, tarikh_mesyuarat_osc: e.target.value })
                      }
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">No. Pelan Lulus</Label>
                    <Input
                      value={editableC1Data.no_pelan_lulus}
                      onChange={(e) =>
                        setEditableC1Data({ ...editableC1Data, no_pelan_lulus: e.target.value })
                      }
                      placeholder="Contoh: PL/2026/123"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Tarikh Kelulusan</Label>
                    <Input
                      type="date"
                      value={editableC1Data.tarikh_kelulusan}
                      onChange={(e) =>
                        setEditableC1Data({ ...editableC1Data, tarikh_kelulusan: e.target.value })
                      }
                      className="text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Jenis Permohonan</Label>
                    <Select
                      value={editableC1Data.jenis_permohonan}
                      onValueChange={(value) =>
                        setEditableC1Data({ ...editableC1Data, jenis_permohonan: value })
                      }
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Pilih jenis" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Susunatur">Susunatur</SelectItem>
                        <SelectItem value="Pembinaan">Pembinaan</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Jika Pembinaan, kelulusan sah selama 12 bulan
                    </p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Syarat Kelulusan (LAMPIRAN A)</Label>
                    <Textarea
                      value={editableC1Data.syarat_kelulusan}
                      onChange={(e) =>
                        setEditableC1Data({ ...editableC1Data, syarat_kelulusan: e.target.value })
                      }
                      rows={8}
                      placeholder="Masukkan syarat kelulusan (satu syarat per baris)..."
                      className="text-sm font-mono"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowC1Modal(false)}>
                    Batal
                  </Button>
                  <Button onClick={handleDownloadC1} disabled={generatingC1}>
                    {generatingC1 ? (
                      "Menjana..."
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Jana PDF
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Borang C(2) Modal */}
        <Dialog open={showC2Modal} onOpenChange={setShowC2Modal}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Jana Borang C(2) - Penolakan Kebenaran Merancang</DialogTitle>
            </DialogHeader>

            {editableC2Data && (
              <div className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900 text-sm">
                    Semak semua maklumat sebelum menjana PDF. Anda boleh edit sebab penolakan di bawah.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">No. Fail JPL</Label>
                    <Input value={editableC2Data.no_fail_jpl} disabled className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">No. Permohonan OSC</Label>
                    <Input value={editableC2Data.no_permohonan_osc} disabled className="text-sm" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Nama Pemaju / Pemilik</Label>
                    <Input value={editableC2Data.nama_pemaju_pemilik} disabled className="text-sm" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Alamat Pemohon</Label>
                    <Textarea
                      value={editableC2Data.alamat_pemohon}
                      onChange={(e) =>
                        setEditableC2Data({ ...editableC2Data, alamat_pemohon: e.target.value })
                      }
                      placeholder="Masukkan alamat lengkap pemohon (satu baris per line)"
                      className="text-sm"
                      rows={3}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Tajuk Permohonan</Label>
                    <Input value={editableC2Data.tajuk_permohonan} disabled className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">No. Mesyuarat OSC</Label>
                    <Input
                      value={editableC2Data.no_mesyuarat}
                      onChange={(e) =>
                        setEditableC2Data({ ...editableC2Data, no_mesyuarat: e.target.value })
                      }
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Tarikh Mesyuarat</Label>
                    <Input
                      type="date"
                      value={editableC2Data.tarikh_mesyuarat_osc}
                      onChange={(e) =>
                        setEditableC2Data({ ...editableC2Data, tarikh_mesyuarat_osc: e.target.value })
                      }
                      className="text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Tarikh Kelulusan (Tarikh Surat)</Label>
                    <Input
                      type="date"
                      value={editableC2Data.tarikh_kelulusan}
                      onChange={(e) =>
                        setEditableC2Data({ ...editableC2Data, tarikh_kelulusan: e.target.value })
                      }
                      className="text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">
                      Sebab Penolakan (LAMPIRAN)
                    </Label>
                    <Textarea
                      value={editableC2Data.sebab_penolakan}
                      onChange={(e) =>
                        setEditableC2Data({ ...editableC2Data, sebab_penolakan: e.target.value })
                      }
                      rows={10}
                      placeholder="Masukkan sebab penolakan (satu sebab per baris)..."
                      className="text-sm font-mono"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Format: Satu sebab per baris. Sub-sebab guna 2.1, 2.2, dll.
                    </p>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowC2Modal(false)}>
                    Batal
                  </Button>
                  <Button onClick={handleDownloadC2} disabled={generatingC2}>
                    {generatingC2 ? (
                      "Menjana..."
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Jana PDF
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Rekod Tarikh Tandatangan Modal */}
        <Dialog open={showSignatureModal} onOpenChange={setShowSignatureModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rekod Tarikh Tandatangan C1</DialogTitle>
              <DialogDescription>
                Masukkan tarikh Borang C1 ditandatangani oleh Yang Dipertua Majlis (YDP)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Tarikh Borang C1 Ditandatangani oleh YDP
                </label>
                <Input
                  type="date"
                  value={signatureDate}
                  onChange={(e) => setSignatureDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSignatureModal(false)}>
                Batal
              </Button>
              <Button onClick={handleRecordSignature} disabled={recordingSignature}>
                {recordingSignature ? "Menyimpan..." : "Simpan Tarikh"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}