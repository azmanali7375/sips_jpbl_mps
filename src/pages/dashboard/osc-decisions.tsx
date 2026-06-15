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
import { Calendar, FileText, CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import { applicationService, type Application } from "@/services/applicationService";
import { oscDecisionService, type OSCDecisionType } from "@/services/oscDecisionService";
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

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    setLoading(true);
    const apps = await applicationService.getAllApplications({ status: "under_review" });
    setApplications(apps);
    setLoading(false);
  };

  const handleApplicationSelect = async (appId: string) => {
    const app = applications.find(a => a.id === appId);
    if (app) {
      setSelectedApp(app);
      const existingDecision = await oscDecisionService.getDecisionByApplicationId(appId);
      if (existingDecision) {
        setFormData({
          tarikh_mesyuarat_osc: existingDecision.meeting_date || "",
          no_mesyuarat: existingDecision.meeting_number || "",
          keputusan_osc: existingDecision.decision_type as OSCDecisionType,
          syarat_kelulusan: existingDecision.approval_conditions || "",
          tempoh_sah_kelulusan: existingDecision.tempoh_sah_kelulusan || 2,
          no_kelulusan_km: existingDecision.no_kelulusan_km || "",
          catatan_osc: existingDecision.catatan_osc || "",
        });
      } else {
        // Reset form for new decision
        setFormData({
          tarikh_mesyuarat_osc: "",
          no_mesyuarat: "",
          keputusan_osc: "" as OSCDecisionType,
          syarat_kelulusan: "",
          tempoh_sah_kelulusan: 2,
          no_kelulusan_km: "",
          catatan_osc: "",
        });
      }
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

  const getDecisionIcon = (type: OSCDecisionType) => {
    switch (type) {
      case "Lulus": return <CheckCircle2 className="h-5 w-5 text-success" />;
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
                    <Button
                      key={app.id}
                      variant={selectedApp?.id === app.id ? "default" : "outline"}
                      className="w-full justify-start text-left"
                      onClick={() => handleApplicationSelect(app.id)}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{app.tracking_number}</div>
                        <div className="text-xs opacity-75 truncate">{app.project_name}</div>
                      </div>
                    </Button>
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
      </div>
    </Layout>
  );
}