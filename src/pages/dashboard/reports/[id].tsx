import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { reportGenerationService } from "@/services/reportGenerationService";
import { getApplicationDetail } from "@/services/applicationDetailService";
import { ArrowLeft, FileText, Save, Send, AlertCircle } from "lucide-react";

export default function ReportGenerationPage() {
  const router = useRouter();
  const { id, report_id } = router.query;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [application, setApplication] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [reportContent, setReportContent] = useState("");
  const [existingReport, setExistingReport] = useState<any>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id, report_id]);

  async function loadData() {
    try {
      setLoading(true);

      // Get application details
      const appData = await getApplicationDetail(id as string);
      setApplication(appData);

      // Get templates
      const templateList = await reportGenerationService.getTemplates();
      setTemplates(templateList);

      // If report_id is provided, load existing report
      if (report_id) {
        const reports = await reportGenerationService.getGeneratedReports(id as string);
        const report = reports.find((r: any) => r.id === report_id);
        if (report) {
          setExistingReport(report);
          setReportContent(report.report_content);
          setSelectedTemplate(report.template_id || "");
        }
      } else {
        // Show template selection dialog for new report
        setShowTemplateDialog(true);
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

  async function handleGenerateReport() {
    if (!selectedTemplate || !application) {
      toast({
        title: "Ralat",
        description: "Sila pilih templat laporan",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Fetch application data for merging
      const appData = await reportGenerationService.fetchApplicationData(application.id);

      // Get selected template
      const template = templates.find((t) => t.id === selectedTemplate);
      if (!template) {
        throw new Error("Template not found");
      }

      // Merge template with application data
      const mergedContent = reportGenerationService.mergeTemplate(template.template_body, appData);
      setReportContent(mergedContent);
      setShowTemplateDialog(false);

      toast({
        title: "Berjaya",
        description: "Laporan dijana. Sila semak dan edit jika perlu.",
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Ralat",
        description: "Gagal menjana laporan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(status: "Draf" | "Muktamad") {
    if (!reportContent.trim() || !selectedTemplate || !application) {
      toast({
        title: "Ralat",
        description: "Kandungan laporan tidak boleh kosong",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      const template = templates.find((t) => t.id === selectedTemplate);
      const reportType = template?.template_type || "Ulasan Teknikal";

      if (existingReport) {
        // Update existing report
        await reportGenerationService.updateReport(
          existingReport.id,
          reportContent,
          status
        );

        toast({
          title: "Berjaya",
          description: `Laporan ${status === "Draf" ? "disimpan sebagai draf" : "dimuktamadkan"}`,
        });
      } else {
        // Create new report
        await reportGenerationService.saveReport(
          application.id,
          selectedTemplate,
          reportType,
          reportContent,
          status
        );

        toast({
          title: "Berjaya",
          description: `Laporan ${status === "Draf" ? "disimpan sebagai draf" : "dimuktamadkan"}`,
        });
      }

      // Navigate back to application detail
      router.push(`/dashboard/permohonan/${application.id}`);
    } catch (error) {
      console.error("Error saving report:", error);
      toast({
        title: "Ralat",
        description: "Gagal menyimpan laporan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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
          <Button onClick={() => router.push("/dashboard/senarai-permohonan")}>
            Kembali ke Senarai
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/dashboard/permohonan/${application.id}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
            <div>
              <h1 className="text-2xl font-bold font-serif">
                {existingReport ? "Lihat Laporan" : "Jana Laporan Baharu"}
              </h1>
              <p className="text-muted-foreground">{application.no_fail_jpl}</p>
            </div>
          </div>

          <div className="flex gap-2">
            {!existingReport || existingReport.status === "Draf" ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleSave("Draf")}
                  disabled={saving || !reportContent}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Simpan Draf
                </Button>
                <Button
                  onClick={() => handleSave("Muktamad")}
                  disabled={saving || !reportContent}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Muktamad
                </Button>
              </>
            ) : (
              <Badge variant="default" className="px-4 py-2">
                Muktamad
              </Badge>
            )}
          </div>
        </div>

        {/* Template Selection Dialog */}
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Pilih Templat Laporan</DialogTitle>
              <DialogDescription>
                Pilih templat yang sesuai untuk menjana laporan teknikal
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Templat Laporan</label>
                <Select
                  value={selectedTemplate}
                  onValueChange={setSelectedTemplate}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih templat" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="space-y-1">
                          <div className="font-medium">{template.template_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {template.template_type} • {template.description || "Tiada penerangan"}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Data permohonan akan digabungkan dengan templat secara automatik.
                  Anda boleh mengedit laporan yang dijana sebelum disimpan.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowTemplateDialog(false);
                  router.push(`/dashboard/permohonan/${application.id}`);
                }}
              >
                Batal
              </Button>
              <Button
                onClick={handleGenerateReport}
                disabled={!selectedTemplate || loading}
              >
                <FileText className="h-4 w-4 mr-2" />
                Jana Laporan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Application Info */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Maklumat Permohonan</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">No. Fail JPL</div>
              <div className="text-base font-mono">{application.no_fail_jpl}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Nama Pemohon</div>
              <div className="text-base">{application.nama_sp || "-"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Tajuk Permohonan</div>
              <div className="text-base">{application.tajuk_permohonan || "-"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Skala Pembangunan</div>
              <div className="text-base">
                <Badge variant="outline">{application.skala_pembangunan || "-"}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Preview/Editor */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-serif">Kandungan Laporan</CardTitle>
                <CardDescription>
                  {existingReport && existingReport.status === "Muktamad"
                    ? "Laporan yang telah dimuktamadkan (tidak boleh diedit)"
                    : "Edit kandungan laporan sebelum menyimpan"}
                </CardDescription>
              </div>
              {!existingReport && !reportContent && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTemplateDialog(true)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Pilih Templat
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {reportContent ? (
              <Textarea
                value={reportContent}
                onChange={(e) => setReportContent(e.target.value)}
                rows={30}
                className="font-mono text-sm"
                disabled={existingReport?.status === "Muktamad"}
              />
            ) : (
              <div className="text-center py-12 space-y-4">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                <div className="text-muted-foreground">
                  Pilih templat untuk menjana laporan
                </div>
                <Button onClick={() => setShowTemplateDialog(true)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Pilih Templat
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metadata */}
        {existingReport && (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Maklumat Laporan</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Status</div>
                <div>
                  <Badge variant={existingReport.status === "Muktamad" ? "default" : "secondary"}>
                    {existingReport.status}
                  </Badge>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Jenis Laporan</div>
                <div className="text-base">{existingReport.report_type}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Dijana Oleh</div>
                <div className="text-base">{existingReport.profiles?.full_name || "-"}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Tarikh Dijana</div>
                <div className="text-base">
                  {existingReport.generated_at
                    ? new Date(existingReport.generated_at).toLocaleString("ms-MY")
                    : "-"}
                </div>
              </div>
              {existingReport.updated_at && existingReport.updated_at !== existingReport.generated_at && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Tarikh Kemaskini</div>
                  <div className="text-base">
                    {new Date(existingReport.updated_at).toLocaleString("ms-MY")}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}