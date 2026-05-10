import { useEffect, useState } from "react";
import { SEO } from "@/components/SEO";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DocumentViewer } from "@/components/DocumentViewer";
import { workflowService } from "@/services/workflowService";
import { reviewService } from "@/services/reviewService";
import { documentService } from "@/services/documentService";
import { complianceService } from "@/services/complianceService";
import type { Tables } from "@/integrations/supabase/types";
import type { ComplianceResult } from "@/services/complianceService";
import { 
  FileCheck, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp,
  Eye,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle
} from "lucide-react";

type ApplicationWithProfile = Tables<"applications"> & {
  profiles?: {
    full_name: string;
    email: string;
  };
};

export default function ReviewDashboard() {
  const [applications, setApplications] = useState<ApplicationWithProfile[]>([]);
  const [filteredApps, setFilteredApps] = useState<ApplicationWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_reviewed: 0,
    pending: 0,
    approved_today: 0,
    under_review: 0,
  });
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Detail view
  const [selectedApp, setSelectedApp] = useState<ApplicationWithProfile | null>(null);
  const [appDocuments, setAppDocuments] = useState<any[]>([]);
  const [appReviews, setAppReviews] = useState<any[]>([]);
  const [complianceResults, setComplianceResults] = useState<ComplianceResult[]>([]);
  
  // Review form
  const [comment, setComment] = useState("");
  const [decision, setDecision] = useState<"pending" | "approved" | "rejected" | "revision_required">("pending");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [applications, statusFilter, searchQuery]);

  const loadData = async () => {
    try {
      const [appsData, statsData] = await Promise.all([
        workflowService.getAssignedToMe(),
        reviewService.getOfficerStats(),
      ]);
      
      setApplications(appsData as ApplicationWithProfile[]);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...applications];

    if (statusFilter !== "all") {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(app => 
        app.tracking_number?.toLowerCase().includes(query) ||
        app.project_name.toLowerCase().includes(query) ||
        app.location.toLowerCase().includes(query)
      );
    }

    setFilteredApps(filtered);
  };

  const handleViewDetails = async (app: ApplicationWithProfile) => {
    setSelectedApp(app);
    setComment("");
    setDecision("pending");

    // Load application details
    const [docs, reviews, compliance] = await Promise.all([
      documentService.getApplicationDocuments(app.id),
      reviewService.getApplicationReviews(app.id),
      complianceService.checkCompliance(app),
    ]);

    setAppDocuments(docs);
    setAppReviews(reviews);
    setComplianceResults(compliance);
  };

  const handleSubmitReview = async () => {
    if (!selectedApp || !comment.trim()) return;

    setSubmitting(true);
    try {
      await reviewService.addReview(selectedApp.id, comment, decision);
      
      // Reload data
      await loadData();
      
      // Close dialog
      setSelectedApp(null);
      setComment("");
      setDecision("pending");
    } catch (error) {
      console.error("Error submitting review:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      submitted: { label: "Dihantar", variant: "outline" },
      registered: { label: "Didaftarkan", variant: "secondary" },
      assigned: { label: "Ditugaskan", variant: "secondary" },
      under_review: { label: "Dalam Semakan", variant: "default" },
      approved: { label: "Lulus", variant: "secondary" },
      rejected: { label: "Ditolak", variant: "destructive" },
    };

    const { label, variant } = config[status] || { label: status, variant: "outline" };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getDecisionIcon = (decision: string) => {
    switch (decision) {
      case "approved": return <ThumbsUp className="h-4 w-4 text-green-600" />;
      case "rejected": return <ThumbsDown className="h-4 w-4 text-red-600" />;
      case "revision_required": return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Memuatkan...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO title="Papan Semakan Pegawai - Sistem SPC MPS" />
      
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-serif font-bold">Papan Semakan Pegawai</h1>
          <p className="text-muted-foreground mt-1">
            Semak dan nilai permohonan pembangunan yang ditugaskan
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Jumlah Tugasan</CardTitle>
              <FileCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{stats.total_reviewed}</div>
              <p className="text-xs text-muted-foreground">Permohonan ditugaskan</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Menunggu</CardTitle>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-amber-600">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">Belum disemak</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dalam Semakan</CardTitle>
              <AlertCircle className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-primary">{stats.under_review}</div>
              <p className="text-xs text-muted-foreground">Sedang disemak</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lulus Hari Ini</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-green-600">{stats.approved_today}</div>
              <p className="text-xs text-muted-foreground">Keputusan hari ini</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tapis Permohonan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Cari no. rujukan, nama projek, atau lokasi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="submitted">Dihantar</SelectItem>
                  <SelectItem value="registered">Didaftarkan</SelectItem>
                  <SelectItem value="assigned">Ditugaskan</SelectItem>
                  <SelectItem value="under_review">Dalam Semakan</SelectItem>
                  <SelectItem value="approved">Lulus</SelectItem>
                  <SelectItem value="rejected">Ditolak</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Applications Table */}
        {filteredApps.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {searchQuery || statusFilter !== "all" 
                ? "Tiada permohonan sepadan dengan tapisan"
                : "Tiada permohonan ditugaskan kepada anda"}
            </AlertDescription>
          </Alert>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Senarai Permohonan
              </CardTitle>
              <CardDescription>
                {filteredApps.length} permohonan ditunjukkan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Rujukan</TableHead>
                    <TableHead>Nama Projek</TableHead>
                    <TableHead>Pemohon</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApps.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-mono text-sm">
                        {app.tracking_number || "-"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {app.project_name}
                      </TableCell>
                      <TableCell className="text-sm">
                        {app.profiles?.full_name || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {app.location}
                      </TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(app)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Semak
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Detail Dialog */}
        <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">Butiran Permohonan</DialogTitle>
              <DialogDescription>
                {selectedApp?.tracking_number} - {selectedApp?.project_name}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">Maklumat</TabsTrigger>
                <TabsTrigger value="documents">Dokumen</TabsTrigger>
                <TabsTrigger value="compliance">Pematuhan</TabsTrigger>
                <TabsTrigger value="reviews">Semakan</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Maklumat Projek</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">No. Rujukan:</span>
                        <p className="font-mono font-medium">{selectedApp?.tracking_number || "-"}</p>
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
                        <span className="text-muted-foreground">No. Lot:</span>
                        <p className="font-medium">{selectedApp?.lot_number || "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Zon Guna Tanah:</span>
                        <p className="font-medium">{selectedApp?.land_use_zone || "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Luas Plot:</span>
                        <p className="font-medium">{selectedApp?.plot_area ? `${selectedApp.plot_area} m²` : "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Nisbah Plot:</span>
                        <p className="font-medium">{selectedApp?.plot_ratio || "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Ketinggian Bangunan:</span>
                        <p className="font-medium">{selectedApp?.building_height ? `${selectedApp.building_height} m` : "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Setback Hadapan:</span>
                        <p className="font-medium">{selectedApp?.setback_front ? `${selectedApp.setback_front} m` : "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Setback Belakang:</span>
                        <p className="font-medium">{selectedApp?.setback_rear ? `${selectedApp.setback_rear} m` : "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Setback Sisi:</span>
                        <p className="font-medium">{selectedApp?.setback_side ? `${selectedApp.setback_side} m` : "-"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <div className="mt-1">{getStatusBadge(selectedApp?.status || "")}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents">
                <DocumentViewer documents={appDocuments} />
              </TabsContent>

              <TabsContent value="compliance" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Keputusan Semakan Pematuhan</CardTitle>
                    <CardDescription>
                      Semakan automatik berdasarkan peraturan pembangunan
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {complianceResults.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Tiada semakan pematuhan dilakukan
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {complianceResults.map((result, idx) => (
                          <div 
                            key={idx}
                            className={`p-4 rounded-lg border ${
                              result.passed 
                                ? "bg-green-50 border-green-200" 
                                : "bg-red-50 border-red-200"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {result.passed ? (
                                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{result.rule_name}</p>
                                <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
                                <div className="flex gap-4 mt-2 text-xs">
                                  <span>
                                    <span className="text-muted-foreground">Diperlukan:</span> {result.expected_value}
                                  </span>
                                  <span>
                                    <span className="text-muted-foreground">Sebenar:</span> {result.actual_value}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sejarah Semakan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {appReviews.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Tiada semakan sebelum ini
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {appReviews.map((review) => (
                          <div key={review.id} className="p-4 rounded-lg border">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                {getDecisionIcon(review.decision)}
                                <div>
                                  <p className="font-medium text-sm">
                                    {review.profiles?.full_name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {review.profiles?.role} • {new Date(review.created_at).toLocaleString("ms-MY")}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="outline" className="capitalize">
                                {review.decision.replace("_", " ")}
                              </Badge>
                            </div>
                            <p className="mt-3 text-sm">{review.comment}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Add Review Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Tambah Semakan Baharu
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="decision">Keputusan</Label>
                      <Select value={decision} onValueChange={(v: any) => setDecision(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Dalam Semakan</SelectItem>
                          <SelectItem value="approved">Lulus</SelectItem>
                          <SelectItem value="rejected">Ditolak</SelectItem>
                          <SelectItem value="revision_required">Pindaan Diperlukan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="comment">
                        Komen / Catatan <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="comment"
                        placeholder="Masukkan komen atau catatan semakan anda..."
                        rows={4}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        required
                      />
                    </div>

                    <Button
                      onClick={handleSubmitReview}
                      disabled={!comment.trim() || submitting}
                      className="w-full"
                    >
                      {submitting ? "Menghantar..." : "Hantar Semakan"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}