import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Edit, Save, Check, AlertCircle, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  gatherTechnicalReportData,
  gatherRecommendationReportData,
  generateTechnicalReportContent,
  generateRecommendationReportContent,
  generateWrittenDirectiveContent,
  generateFormC1Content,
  generateFormC2Content,
  saveGeneratedReport,
  getApplicationReports,
  updateGeneratedReport,
  type ReportType
} from "@/services/reportService";

interface ApplicationWithProfiles extends Tables<"applications"> {
  profiles?: { full_name: string; email: string };
}

export default function ReportsPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [application, setApplication] = useState<ApplicationWithProfiles | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<ReportType>("technical_report");
  const [generatedContent, setGeneratedContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [savedReports, setSavedReports] = useState<Tables<"generated_reports">[]>([]);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Additional data for specific report types
  const [amendments, setAmendments] = useState<string[]>([""]);
  const [conditions, setConditions] = useState<string[]>([""]);
  const [rejectionReasons, setRejectionReasons] = useState<string[]>([""]);

  useEffect(() => {
    if (id) {
      loadApplication();
      loadSavedReports();
    }
  }, [id]);

  async function loadApplication() {
    try {
      const { data, error } = await supabase
        .from("applications")
        .select("*, profiles!applications_applicant_id_fkey(full_name, email)")
        .eq("id", id as string)
        .single();

      if (error) throw error;
      setApplication(data);
    } catch (err) {
      console.error("Error loading application:", err);
      setError("Gagal memuatkan data permohonan");
    } finally {
      setLoading(false);
    }
  }

  async function loadSavedReports() {
    try {
      const reports = await getApplicationReports(id as string);
      setSavedReports(reports);
    } catch (err) {
      console.error("Error loading reports:", err);
    }
  }

  async function handleGenerateReport() {
    if (!application) return;
    
    setGenerating(true);
    setError(null);
    
    try {
      let content = "";
      
      switch (selectedReportType) {
        case "technical_report": {
          const data = await gatherTechnicalReportData(application.id);
          content = generateTechnicalReportContent(data);
          break;
        }
        case "recommendation_report": {
          const data = await gatherRecommendationReportData(application.id);
          content = generateRecommendationReportContent(data);
          break;
        }
        case "written_directive": {
          const filteredAmendments = amendments.filter(a => a.trim());
          if (filteredAmendments.length === 0) {
            setError("Sila masukkan sekurang-kurangnya satu pindaan yang diperlukan");
            return;
          }
          content = generateWrittenDirectiveContent(application, filteredAmendments);
          break;
        }
        case "form_c1": {
          const filteredConditions = conditions.filter(c => c.trim());
          if (filteredConditions.length === 0) {
            setError("Sila masukkan sekurang-kurangnya satu syarat kelulusan");
            return;
          }
          content = generateFormC1Content(application, filteredConditions);
          break;
        }
        case "form_c2": {
          const filteredReasons = rejectionReasons.filter(r => r.trim());
          if (filteredReasons.length === 0) {
            setError("Sila masukkan sekurang-kurangnya satu alasan penolakan");
            return;
          }
          content = generateFormC2Content(application, filteredReasons);
          break;
        }
      }
      
      setGeneratedContent(content);
      setIsEditing(true);
      setCurrentReportId(null);
    } catch (err) {
      console.error("Error generating report:", err);
      setError("Gagal menjana laporan. Sila cuba lagi.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveReport(finalize = false) {
    if (!application || !generatedContent) return;
    
    setSaving(true);
    setError(null);
    
    try {
      if (currentReportId) {
        await updateGeneratedReport(currentReportId, generatedContent, finalize);
      } else {
        const saved = await saveGeneratedReport(
          application.id,
          selectedReportType,
          generatedContent
        );
        setCurrentReportId(saved.id);
      }
      
      await loadSavedReports();
      
      if (finalize) {
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Error saving report:", err);
      setError("Gagal menyimpan laporan");
    } finally {
      setSaving(false);
    }
  }

  function handleDownloadReport() {
    if (!generatedContent) return;
    
    const blob = new Blob([generatedContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedReportType}_${application?.tracking_number}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function loadSavedReport(report: Tables<"generated_reports">) {
    setSelectedReportType(report.report_type as ReportType);
    setGeneratedContent(report.report_content);
    setCurrentReportId(report.id);
    setIsEditing(!report.is_finalized);
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">Memuatkan...</div>
        </div>
      </Layout>
    );
  }

  if (!application) {
    return (
      <Layout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Permohonan tidak dijumpai</AlertDescription>
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
          
          <h1 className="text-3xl font-serif font-bold text-primary">
            Penjanaan Laporan Automatik
          </h1>
          <p className="text-muted-foreground mt-2">
            {application.tracking_number} - {application.project_name}
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate">Jana Laporan Baharu</TabsTrigger>
            <TabsTrigger value="saved">Laporan Tersimpan ({savedReports.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Pilih Jenis Laporan</CardTitle>
                <CardDescription>
                  Pilih jenis laporan yang ingin dijana
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={selectedReportType}
                  onValueChange={(value) => setSelectedReportType(value as ReportType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical_report">Laporan Teknikal</SelectItem>
                    <SelectItem value="recommendation_report">Laporan Syor</SelectItem>
                    <SelectItem value="written_directive">Arahan Bertulis</SelectItem>
                    <SelectItem value="form_c1">Borang C1 (Kelulusan)</SelectItem>
                    <SelectItem value="form_c2">Borang C2 (Penolakan)</SelectItem>
                  </SelectContent>
                </Select>

                {selectedReportType === "written_directive" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pindaan Yang Diperlukan:</label>
                    {amendments.map((amendment, index) => (
                      <div key={index} className="flex gap-2">
                        <Textarea
                          value={amendment}
                          onChange={(e) => {
                            const newAmendments = [...amendments];
                            newAmendments[index] = e.target.value;
                            setAmendments(newAmendments);
                          }}
                          placeholder={`Pindaan ${index + 1}`}
                          rows={2}
                        />
                        {index === amendments.length - 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setAmendments([...amendments, ""])}
                          >
                            +
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {selectedReportType === "form_c1" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Syarat-Syarat Kelulusan:</label>
                    {conditions.map((condition, index) => (
                      <div key={index} className="flex gap-2">
                        <Textarea
                          value={condition}
                          onChange={(e) => {
                            const newConditions = [...conditions];
                            newConditions[index] = e.target.value;
                            setConditions(newConditions);
                          }}
                          placeholder={`Syarat ${index + 1}`}
                          rows={2}
                        />
                        {index === conditions.length - 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setConditions([...conditions, ""])}
                          >
                            +
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {selectedReportType === "form_c2" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Alasan Penolakan:</label>
                    {rejectionReasons.map((reason, index) => (
                      <div key={index} className="flex gap-2">
                        <Textarea
                          value={reason}
                          onChange={(e) => {
                            const newReasons = [...rejectionReasons];
                            newReasons[index] = e.target.value;
                            setRejectionReasons(newReasons);
                          }}
                          placeholder={`Alasan ${index + 1}`}
                          rows={2}
                        />
                        {index === rejectionReasons.length - 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setRejectionReasons([...rejectionReasons, ""])}
                          >
                            +
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  onClick={handleGenerateReport}
                  disabled={generating}
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {generating ? "Menjana..." : "Jana Laporan"}
                </Button>
              </CardContent>
            </Card>

            {generatedContent && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-serif">Pratonton Laporan</CardTitle>
                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => setIsEditing(false)}
                            size="sm"
                          >
                            Batal Edit
                          </Button>
                          <Button
                            onClick={() => handleSaveReport(false)}
                            disabled={saving}
                            size="sm"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Simpan Draf
                          </Button>
                          <Button
                            onClick={() => handleSaveReport(true)}
                            disabled={saving}
                            size="sm"
                            className="bg-success hover:bg-success/90"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Muktamadkan
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => setIsEditing(true)}
                            size="sm"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            onClick={handleDownloadReport}
                            size="sm"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Muat Turun
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      value={generatedContent}
                      onChange={(e) => setGeneratedContent(e.target.value)}
                      rows={30}
                      className="font-mono text-sm"
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap font-mono text-sm bg-muted p-4 rounded-lg max-h-[600px] overflow-auto">
                      {generatedContent}
                    </pre>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="saved">
            <div className="grid gap-4">
              {savedReports.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Tiada laporan tersimpan</p>
                  </CardContent>
                </Card>
              ) : (
                savedReports.map((report) => (
                  <Card key={report.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">
                              {report.report_type === "technical_report" && "Laporan Teknikal"}
                              {report.report_type === "recommendation_report" && "Laporan Syor"}
                              {report.report_type === "written_directive" && "Arahan Bertulis"}
                              {report.report_type === "form_c1" && "Borang C1 (Kelulusan)"}
                              {report.report_type === "form_c2" && "Borang C2 (Penolakan)"}
                            </h3>
                            <Badge variant={report.is_finalized ? "default" : "secondary"}>
                              {report.is_finalized ? "Muktamad" : "Draf"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Dijana: {new Date(report.created_at).toLocaleString("ms-MY")}
                          </p>
                          {report.updated_at !== report.created_at && (
                            <p className="text-sm text-muted-foreground">
                              Dikemas kini: {new Date(report.updated_at).toLocaleString("ms-MY")}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadSavedReport(report)}
                        >
                          {report.is_finalized ? "Lihat" : "Edit"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}