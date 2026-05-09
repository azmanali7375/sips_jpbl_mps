import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { workflowService } from "@/services/workflowService";
import type { Tables } from "@/integrations/supabase/types";
import { FileCheck, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ReviewApplications() {
  const router = useRouter();
  const [applications, setApplications] = useState<Tables<"applications">[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Tables<"applications"> | null>(null);
  const [recommendation, setRecommendation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const data = await workflowService.getApplicationsByRole();
      setApplications(data);
    } catch (error) {
      console.error("Error loading applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (app: Tables<"applications">) => {
    setSelectedApp(app);
    setRecommendation("");
    setDialogOpen(true);
  };

  const handleSubmitRecommendation = async () => {
    if (!selectedApp || !recommendation.trim()) return;

    setSubmitting(true);
    try {
      await workflowService.submitRecommendation(selectedApp.id, recommendation);
      setDialogOpen(false);
      setSelectedApp(null);
      setRecommendation("");
      await loadApplications();
    } catch (error) {
      console.error("Error submitting recommendation:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const labels: Record<string, string> = {
      technical_report: "Menunggu Semakan",
      recommendation: "Syor Diberikan",
    };

    return (
      <Badge variant={status === "recommendation" ? "secondary" : "default"}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <Layout>
      <SEO title="Semakan Laporan - Sistem SPC MPS" />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold">Semakan Laporan Teknikal</h1>
          <p className="text-muted-foreground mt-1">
            Semak dan berikan syor untuk permohonan
          </p>
        </div>

        {applications.length === 0 && !loading && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Tiada laporan teknikal menunggu semakan
            </AlertDescription>
          </Alert>
        )}

        {applications.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Laporan Untuk Semakan
              </CardTitle>
              <CardDescription>
                {applications.length} permohonan memerlukan semakan Ketua Jabatan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Rujukan</TableHead>
                    <TableHead>Nama Projek</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-mono text-sm">
                        {app.tracking_number}
                      </TableCell>
                      <TableCell className="font-medium">
                        {app.project_name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {app.location}
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {app.project_type}
                      </TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell className="text-right">
                        {app.status === "technical_report" && (
                          <Button
                            size="sm"
                            onClick={() => handleReview(app)}
                          >
                            Semak & Beri Syor
                          </Button>
                        )}
                        {app.status === "recommendation" && (
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Selesai
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Syor Ketua Jabatan</DialogTitle>
              <DialogDescription>
                Berikan syor untuk permohonan: {selectedApp?.project_name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">No. Rujukan:</span>
                  <p className="font-mono font-medium">{selectedApp?.tracking_number}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Jenis Projek:</span>
                  <p className="font-medium capitalize">{selectedApp?.project_type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Lokasi:</span>
                  <p className="font-medium">{selectedApp?.location}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Zon Guna Tanah:</span>
                  <p className="font-medium">{selectedApp?.land_use_zone || "-"}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recommendation">
                  Syor Ketua Jabatan <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="recommendation"
                  placeholder="Masukkan syor anda untuk permohonan ini..."
                  rows={6}
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Syor ini akan digunakan untuk penyediaan Laporan Syor dan Arahan Bertulis (jika perlu)
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button
                onClick={handleSubmitRecommendation}
                disabled={!recommendation.trim() || submitting}
              >
                {submitting ? "Menghantar..." : "Hantar Syor"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}