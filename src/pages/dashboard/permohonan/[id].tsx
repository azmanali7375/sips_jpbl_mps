import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
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
import {
  getApplicationDetail,
  getWorkflowHistory,
  updateApplicationStatus,
  reassignApplication,
  updateApplicationNotes,
  getAvailableOfficers,
  calculateKPIProgress,
  type ApplicationDetailData,
  type WorkflowHistoryWithProfile,
} from "@/services/applicationDetailService";
import {
  getLandLots,
  createLandLot,
  updateLandLot,
  deleteLandLot,
  bulkImportLandLots,
  KATEGORI_OPTIONS,
} from "@/services/landLotService";
import {
  getWrittenDirectives,
  isDirectiveOverdue,
} from "@/services/writtenDirectiveService";
import {
  getSiteVisits,
  type SiteVisitWithPhotos,
} from "@/services/siteVisitService";
import {
  getApplicationDocuments,
  uploadDocument,
  deleteDocument,
  isValidFileType,
  formatFileSize,
  JENIS_DOKUMEN_OPTIONS,
} from "@/services/documentService";
import { Database } from "@/integrations/supabase/types";
import { Edit, FileText, MapPin, FileBarChart, Upload, ArrowLeft, Save, Plus, Trash2, Download, FileCheck } from "lucide-react";

type LandLot = Database["public"]["Tables"]["land_lots"]["Row"];
type WrittenDirective = Database["public"]["Tables"]["written_directives"]["Row"];
type Document = Database["public"]["Tables"]["documents"]["Row"];

const STATUS_COLORS: Record<string, string> = {
  "Diterima": "bg-blue-500",
  "Dalam Semakan Teknikal": "bg-teal-500",
  "Menunggu Ulasan ATD": "bg-yellow-500",
  "Kertas Perakuan Disediakan": "bg-purple-500",
  "Menunggu OSC": "bg-orange-500",
  "Lulus": "bg-green-500",
  "Lulus Bersyarat": "bg-green-500",
  "Ditolak": "bg-gray-500",
  "Dibatalkan": "bg-gray-500",
};

const STATUS_OPTIONS = [
  "Diterima",
  "Dalam Semakan Teknikal",
  "Menunggu Ulasan ATD",
  "Kertas Perakuan Disediakan",
  "Menunggu OSC",
  "Lulus",
  "Lulus Bersyarat",
  "Ditolak",
  "Dibatalkan",
];

export default function ApplicationDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();

  const [application, setApplication] = useState<ApplicationDetailData | null>(null);
  const [workflowHistory, setWorkflowHistory] = useState<WorkflowHistoryWithProfile[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedOfficer, setSelectedOfficer] = useState("");
  const [notes, setNotes] = useState("");

  // Land lots state
  const [landLots, setLandLots] = useState<LandLot[]>([]);
  const [showAddLot, setShowAddLot] = useState(false);
  const [editingLot, setEditingLot] = useState<LandLot | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportData, setBulkImportData] = useState("");
  const [newLot, setNewLot] = useState({
    jenis_lot: "",
    no_lot: "",
    pemilik_tanah: "",
    kategori: "",
    syarat_nyata: "",
    catatan: "",
  });

  // Written directives state
  const [writtenDirectives, setWrittenDirectives] = useState<WrittenDirective[]>([]);

  // Site visits state
  const [siteVisits, setSiteVisits] = useState<SiteVisitWithPhotos[]>([]);

  // Documents state
  const [documents, setDocuments] = useState<Record<string, Document[]>>({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    jenis_dokumen: "",
    nama_dokumen: "",
    dokumen_url: "",
    versi: "",
    catatan: "",
  });

  // Load data
  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);

      // Get current user with profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      // Get user profile for role
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setCurrentUser(profile);

      // Get application details
      const appData = await getApplicationDetail(id as string);
      setApplication(appData);
      setSelectedStatus(appData?.status_dalaman || "");
      setSelectedOfficer(appData?.assigned_officer_id || "");
      setNotes(appData?.catatan_dalaman || "");

      // Get workflow history
      const history = await getWorkflowHistory(id as string);
      setWorkflowHistory(history);

      // Get land lots
      const lots = await getLandLots(id as string);
      setLandLots(lots);

      // Get written directives
      const directives = await getWrittenDirectives(id as string);
      setWrittenDirectives(directives);

      // Get site visits
      const visits = await getSiteVisits(id as string);
      setSiteVisits(visits);

      // Get documents
      const docs = await getApplicationDocuments(id as string);
      setDocuments(docs);

      // Get officers (for admin only)
      if (profile?.role === "admin" || profile?.role === "department_head") {
        const officerList = await getAvailableOfficers();
        setOfficers(officerList);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Ralat",
        description: "Gagal memuatkan maklumat permohonan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleAddLot() {
    if (!application || !newLot.jenis_lot || !newLot.no_lot) {
      toast({
        title: "Ralat",
        description: "Jenis Lot dan No. Lot adalah wajib",
        variant: "destructive",
      });
      return;
    }

    try {
      await createLandLot({
        application_id: application.id,
        ...newLot,
      });

      toast({
        title: "Berjaya",
        description: "Lot tanah ditambah",
      });

      // Reset form and reload
      setNewLot({
        jenis_lot: "",
        no_lot: "",
        pemilik_tanah: "",
        kategori: "",
        syarat_nyata: "",
        catatan: "",
      });
      setShowAddLot(false);
      
      const lots = await getLandLots(application.id);
      setLandLots(lots);
    } catch (error) {
      toast({
        title: "Ralat",
        description: "Gagal menambah lot tanah",
        variant: "destructive",
      });
    }
  }

  async function handleUpdateLot() {
    if (!editingLot) return;

    try {
      await updateLandLot(editingLot.id, editingLot);

      toast({
        title: "Berjaya",
        description: "Lot tanah dikemaskini",
      });

      setEditingLot(null);
      
      if (application) {
        const lots = await getLandLots(application.id);
        setLandLots(lots);
      }
    } catch (error) {
      toast({
        title: "Ralat",
        description: "Gagal mengemas kini lot tanah",
        variant: "destructive",
      });
    }
  }

  async function handleDeleteLot(lotId: string) {
    if (!confirm("Adakah anda pasti untuk memadam lot tanah ini?")) return;

    try {
      await deleteLandLot(lotId);

      toast({
        title: "Berjaya",
        description: "Lot tanah dipadam",
      });

      if (application) {
        const lots = await getLandLots(application.id);
        setLandLots(lots);
      }
    } catch (error) {
      toast({
        title: "Ralat",
        description: "Gagal memadam lot tanah",
        variant: "destructive",
      });
    }
  }

  async function handleBulkImport() {
    if (!application || !bulkImportData.trim()) {
      toast({
        title: "Ralat",
        description: "Sila masukkan data CSV",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await bulkImportLandLots(application.id, bulkImportData);

      toast({
        title: "Import Selesai",
        description: `Berjaya: ${result.success}, Gagal: ${result.failed}${
          result.errors.length > 0 ? `\n\n${result.errors.slice(0, 3).join("\n")}` : ""
        }`,
        variant: result.failed > 0 ? "destructive" : "default",
      });

      setBulkImportData("");
      setShowBulkImport(false);

      const lots = await getLandLots(application.id);
      setLandLots(lots);
    } catch (error) {
      toast({
        title: "Ralat",
        description: "Gagal import data",
        variant: "destructive",
      });
    }
  }

  async function handleStatusUpdate() {
    if (!application || !currentUser) return;

    try {
      setSaving(true);
      await updateApplicationStatus(
        application.id,
        selectedStatus,
        currentUser.id,
        `Status dikemaskini kepada: ${selectedStatus}`
      );

      toast({
        title: "Berjaya",
        description: "Status permohonan dikemaskini",
      });

      loadData(); // Reload to show updated history
    } catch (error) {
      toast({
        title: "Ralat",
        description: "Gagal mengemas kini status",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleOfficerReassign() {
    if (!application || !currentUser || !selectedOfficer) return;

    try {
      setSaving(true);
      await reassignApplication(application.id, selectedOfficer, currentUser.id);

      toast({
        title: "Berjaya",
        description: "Permohonan diagihkan kepada pegawai lain",
      });

      loadData();
    } catch (error) {
      toast({
        title: "Ralat",
        description: "Gagal mengagihkan permohonan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleNotesUpdate() {
    if (!application || !currentUser) return;

    try {
      setSaving(true);
      await updateApplicationNotes(application.id, notes, currentUser.id);

      toast({
        title: "Berjaya",
        description: "Catatan dikemaskini",
      });

      loadData();
    } catch (error) {
      toast({
        title: "Ralat",
        description: "Gagal mengemas kini catatan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadDocument() {
    if (!application || !currentUser) return;

    if (!uploadForm.jenis_dokumen || !uploadForm.nama_dokumen || !uploadForm.dokumen_url) {
      toast({
        title: "Ralat",
        description: "Jenis dokumen, nama dokumen, dan URL adalah wajib",
        variant: "destructive",
      });
      return;
    }

    if (!isValidFileType(uploadForm.dokumen_url)) {
      toast({
        title: "Ralat",
        description: "Format fail tidak sah. Gunakan PDF, DWG, DXF, JPG, atau PNG",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      await uploadDocument(
        application.id,
        {
          jenis_dokumen: uploadForm.jenis_dokumen,
          file_name: uploadForm.nama_dokumen,
          file_path: uploadForm.dokumen_url,
          versi: uploadForm.versi,
          catatan: uploadForm.catatan,
        },
        currentUser.id
      );

      toast({
        title: "Berjaya",
        description: "Dokumen berjaya dimuat naik",
      });

      setUploadForm({
        jenis_dokumen: "",
        nama_dokumen: "",
        dokumen_url: "",
        versi: "",
        catatan: "",
      });
      setShowUploadModal(false);

      const docs = await getApplicationDocuments(application.id);
      setDocuments(docs);
    } catch (error) {
      toast({
        title: "Ralat",
        description: "Gagal memuat naik dokumen",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDocument(documentId: string) {
    if (!confirm("Adakah anda pasti untuk memadam dokumen ini?")) return;

    try {
      await deleteDocument(documentId);

      toast({
        title: "Berjaya",
        description: "Dokumen dipadam",
      });

      if (application) {
        const docs = await getApplicationDocuments(application.id);
        setDocuments(docs);
      }
    } catch (error) {
      toast({
        title: "Ralat",
        description: "Gagal memadam dokumen",
        variant: "destructive",
      });
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

  const kpiProgress = application.tarikh_lengkap_diterima_osc && application.tarikh_kpi
    ? calculateKPIProgress(application.tarikh_lengkap_diterima_osc, application.tarikh_kpi)
    : null;

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "department_head";

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/senarai-permohonan")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
            <div>
              <h1 className="text-2xl font-bold font-serif">Butiran Permohonan</h1>
              <p className="text-muted-foreground">{application.no_fail_jpl}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit Permohonan
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/review?application_id=${application.id}`)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Daftar Semakan
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/site-visit/${application.id}`)}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Lawatan Tapak
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/written-directives?application_id=${application.id}`)}
            >
              <FileCheck className="h-4 w-4 mr-2" />
              Arahan Bertulis
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/reports/${application.id}`)}
            >
              <FileBarChart className="h-4 w-4 mr-2" />
              Jana Ulasan
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowUploadModal(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Muat Naik Dokumen
            </Button>
          </div>
        </div>

        {/* Section 1: Maklumat Permohonan */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Maklumat Permohonan</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">No. Fail JPL</div>
              <div className="text-base">{application.no_fail_jpl}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">No. Permohonan OSC</div>
              <div className="text-base">{application.no_permohonan_osc}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Kategori Permohonan</div>
              <div className="text-base">{application.kategori_permohonan || "-"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Skala Pembangunan</div>
              <div className="text-base">{application.skala_pembangunan || "-"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Jenis Proses PR</div>
              <div className="text-base">{application.jenis_proses_pr || "-"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Status Semakan (OSC)</div>
              <div className="text-base">{application.status_semakan_osc || "-"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Tarikh Penghantaran</div>
              <div className="text-base">
                {application.tarikh_penghantaran
                  ? new Date(application.tarikh_penghantaran).toLocaleDateString("ms-MY")
                  : "-"}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                ⭐ Tarikh Lengkap Diterima OSC
              </div>
              <div className="text-base font-medium">
                {application.tarikh_lengkap_diterima_osc
                  ? new Date(application.tarikh_lengkap_diterima_osc).toLocaleDateString("ms-MY")
                  : "-"}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Tarikh KPI</div>
              <div className="text-base font-medium">
                {application.tarikh_kpi
                  ? new Date(application.tarikh_kpi).toLocaleDateString("ms-MY")
                  : "-"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Maklumat Pemohon */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Maklumat Pemohon</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Nama Pemohon (SP)</div>
              <div className="text-base">{application.nama_sp || "-"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">No. KP Pemohon</div>
              <div className="text-base">{application.no_kp_sp || "-"}</div>
            </div>
            <div className="col-span-2">
              <div className="text-sm font-medium text-muted-foreground">Nama Pemaju/Pemilik</div>
              <div className="text-base">{application.nama_pemaju_pemilik || "-"}</div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Maklumat Pembangunan */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Maklumat Pembangunan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Tajuk Permohonan</div>
              <div className="text-base">{application.tajuk_permohonan || "-"}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Lokasi/Mercu Tanda Berhampiran
                </div>
                <div className="text-base">{application.lokasi_mercu_tanda || "-"}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Mukim</div>
                <div className="text-base">{application.mukim || "-"}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Daerah</div>
                <div className="text-base">{application.daerah || "-"}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Negeri</div>
                <div className="text-base">{application.negeri || "-"}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Rancangan Tempatan</div>
                <div className="text-base">{application.rancangan_tempatan || "-"}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Zoning</div>
                <div className="text-base">{application.zoning || "-"}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Longitud</div>
                <div className="text-base font-mono">{application.longitud || "-"}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Latitud</div>
                <div className="text-base font-mono">{application.latitud || "-"}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* NEW SECTION: Maklumat Tanah */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-serif">Maklumat Tanah</CardTitle>
                <CardDescription>
                  Lot tanah yang terlibat dalam permohonan ini
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkImport(true)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Import dari OSC
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowAddLot(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Lot
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {landLots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Tiada lot tanah didaftarkan
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jenis Lot</TableHead>
                      <TableHead>No. Lot</TableHead>
                      <TableHead>Pemilik Tanah</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Syarat Nyata</TableHead>
                      <TableHead>Catatan</TableHead>
                      <TableHead className="w-20">Tindakan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {landLots.map((lot) => (
                      <TableRow key={lot.id}>
                        <TableCell>{lot.jenis_lot}</TableCell>
                        <TableCell className="font-mono">{lot.no_lot}</TableCell>
                        <TableCell>{lot.pemilik_tanah || "-"}</TableCell>
                        <TableCell>
                          {lot.kategori ? (
                            <Badge variant="outline">{lot.kategori}</Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{lot.syarat_nyata || "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {lot.catatan || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingLot(lot)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteLot(lot.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 text-sm text-muted-foreground">
                  Jumlah Lot: {landLots.length}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Add Lot Dialog */}
        <Dialog open={showAddLot} onOpenChange={setShowAddLot}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Tambah Lot Tanah</DialogTitle>
              <DialogDescription>
                Masukkan maklumat lot tanah yang terlibat dalam permohonan ini
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Jenis Lot *</label>
                  <Input
                    placeholder="e.g., Lot, Pajakan, Rezab"
                    value={newLot.jenis_lot}
                    onChange={(e) => setNewLot({ ...newLot, jenis_lot: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">No. Lot *</label>
                  <Input
                    placeholder="e.g., LOT 11968"
                    value={newLot.no_lot}
                    onChange={(e) => setNewLot({ ...newLot, no_lot: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Pemilik Tanah</label>
                <Input
                  value={newLot.pemilik_tanah}
                  onChange={(e) => setNewLot({ ...newLot, pemilik_tanah: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Kategori</label>
                <Select
                  value={newLot.kategori}
                  onValueChange={(value) => setNewLot({ ...newLot, kategori: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {KATEGORI_OPTIONS.map((kategori) => (
                      <SelectItem key={kategori} value={kategori}>
                        {kategori}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Syarat Nyata</label>
                <Input
                  placeholder="e.g., KEDAI TIGA TINGKAT"
                  value={newLot.syarat_nyata}
                  onChange={(e) => setNewLot({ ...newLot, syarat_nyata: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Catatan</label>
                <Textarea
                  rows={2}
                  value={newLot.catatan}
                  onChange={(e) => setNewLot({ ...newLot, catatan: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddLot(false)}>
                Batal
              </Button>
              <Button onClick={handleAddLot}>Tambah</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Lot Dialog */}
        <Dialog open={!!editingLot} onOpenChange={(open) => !open && setEditingLot(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Lot Tanah</DialogTitle>
            </DialogHeader>
            {editingLot && (
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Jenis Lot *</label>
                    <Input
                      value={editingLot.jenis_lot}
                      onChange={(e) =>
                        setEditingLot({ ...editingLot, jenis_lot: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">No. Lot *</label>
                    <Input
                      value={editingLot.no_lot}
                      onChange={(e) =>
                        setEditingLot({ ...editingLot, no_lot: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Pemilik Tanah</label>
                  <Input
                    value={editingLot.pemilik_tanah || ""}
                    onChange={(e) =>
                      setEditingLot({ ...editingLot, pemilik_tanah: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Kategori</label>
                  <Select
                    value={editingLot.kategori || ""}
                    onValueChange={(value) =>
                      setEditingLot({ ...editingLot, kategori: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {KATEGORI_OPTIONS.map((kategori) => (
                        <SelectItem key={kategori} value={kategori}>
                          {kategori}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Syarat Nyata</label>
                  <Input
                    value={editingLot.syarat_nyata || ""}
                    onChange={(e) =>
                      setEditingLot({ ...editingLot, syarat_nyata: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Catatan</label>
                  <Textarea
                    rows={2}
                    value={editingLot.catatan || ""}
                    onChange={(e) =>
                      setEditingLot({ ...editingLot, catatan: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingLot(null)}>
                Batal
              </Button>
              <Button onClick={handleUpdateLot}>Simpan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Import Dialog */}
        <Dialog open={showBulkImport} onOpenChange={setShowBulkImport}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Import Lot Tanah dari OSC</DialogTitle>
              <DialogDescription>
                Salin senarai lot dari OSC dan tampal di bawah. Format: jenis_lot, no_lot,
                pemilik_tanah, kategori, syarat_nyata (satu baris satu lot)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Data CSV</label>
                <Textarea
                  rows={10}
                  placeholder="Contoh:&#10;Lot, LOT 11968, Ahmad bin Ali, Bangunan, KEDAI TIGA TINGKAT&#10;Pajakan, PT 1234, Fatimah binti Hassan, Pertanian, TANAH PERTANIAN"
                  value={bulkImportData}
                  onChange={(e) => setBulkImportData(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Tip: Salin terus dari OSC atau Excel, satu baris untuk setiap lot
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulkImport(false)}>
                Batal
              </Button>
              <Button onClick={handleBulkImport}>Import</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Document Upload Modal */}
        <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Muat Naik Dokumen</DialogTitle>
              <DialogDescription>
                No. Fail: {application.no_fail_jpl}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div>
                <label className="text-sm font-medium">Jenis Dokumen *</label>
                <Select
                  value={uploadForm.jenis_dokumen}
                  onValueChange={(value) =>
                    setUploadForm({ ...uploadForm, jenis_dokumen: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis dokumen" />
                  </SelectTrigger>
                  <SelectContent>
                    {JENIS_DOKUMEN_OPTIONS.map((jenis) => (
                      <SelectItem key={jenis} value={jenis}>
                        {jenis}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Nama Dokumen *</label>
                <Input
                  placeholder="e.g., Pelan Tapak Lokasi - Rev 2"
                  value={uploadForm.nama_dokumen}
                  onChange={(e) =>
                    setUploadForm({ ...uploadForm, nama_dokumen: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">URL Dokumen *</label>
                <Input
                  placeholder="https://... atau path fail"
                  value={uploadForm.dokumen_url}
                  onChange={(e) =>
                    setUploadForm({ ...uploadForm, dokumen_url: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Format diterima: PDF, DWG, DXF, JPG, PNG
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Versi</label>
                <Input
                  placeholder="e.g., v1, v2, Rev A"
                  value={uploadForm.versi}
                  onChange={(e) =>
                    setUploadForm({ ...uploadForm, versi: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Catatan</label>
                <Textarea
                  rows={3}
                  placeholder="Catatan tambahan tentang dokumen ini"
                  value={uploadForm.catatan}
                  onChange={(e) =>
                    setUploadForm({ ...uploadForm, catatan: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUploadModal(false)}>
                Batal
              </Button>
              <Button onClick={handleUploadDocument} disabled={saving}>
                {saving ? "Memuat naik..." : "Muat Naik"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* NEW SECTION: Arahan Bertulis */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-serif">Arahan Bertulis</CardTitle>
                <CardDescription>
                  Senarai arahan bertulis yang dikeluarkan untuk permohonan ini
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => router.push(`/dashboard/written-directives?application_id=${application.id}`)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Tambah Arahan
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {writtenDirectives.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Tiada arahan bertulis dikeluarkan
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Arahan</TableHead>
                    <TableHead>Jenis Borang</TableHead>
                    <TableHead>Tarikh Dikeluarkan</TableHead>
                    <TableHead>Tarikh Pematuhan Dikehendaki</TableHead>
                    <TableHead>Status Pematuhan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {writtenDirectives.map((directive) => {
                    const overdue = isDirectiveOverdue(directive);
                    return (
                      <TableRow
                        key={directive.id}
                        className={overdue ? "bg-red-50 hover:bg-red-100" : ""}
                        onClick={() => router.push(`/dashboard/written-directives?application_id=${application.id}&id=${directive.id}`)}
                        style={{ cursor: "pointer" }}
                      >
                        <TableCell className="font-mono">
                          {directive.directive_number}
                        </TableCell>
                        <TableCell>{directive.jenis_borang || "-"}</TableCell>
                        <TableCell>
                          {directive.tarikh_dikeluarkan
                            ? new Date(directive.tarikh_dikeluarkan).toLocaleDateString("ms-MY")
                            : "-"}
                        </TableCell>
                        <TableCell className={overdue ? "font-medium text-destructive" : ""}>
                          {directive.tarikh_pematuhan_dikehendaki
                            ? new Date(directive.tarikh_pematuhan_dikehendaki).toLocaleDateString("ms-MY")
                            : "-"}
                          {overdue && " (LEWAT)"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              directive.status_pematuhan === "Patuh"
                                ? "default"
                                : directive.status_pematuhan === "Gagal Patuh"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {directive.status_pematuhan}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* NEW SECTION: Lawatan Tapak */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-serif">Lawatan Tapak</CardTitle>
                <CardDescription>
                  Rekod lawatan tapak yang telah dilakukan
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => router.push(`/dashboard/site-visit/${application.id}`)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Tambah Lawatan
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {siteVisits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Tiada lawatan tapak direkodkan
              </div>
            ) : (
              <div className="space-y-4">
                {siteVisits.map((visit) => (
                  <div
                    key={visit.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer"
                    onClick={() => router.push(`/dashboard/site-visit/${visit.id}`)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {new Date(visit.visit_date).toLocaleDateString("ms-MY")}
                          </span>
                          {visit.masa_lawatan && (
                            <span className="text-sm text-muted-foreground">
                              {visit.masa_lawatan}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {visit.tujuan_lawatan}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Pegawai: {visit.officer?.full_name || "-"}
                        </div>
                      </div>
                      <Badge
                        variant={
                          visit.status_lawatan === "Selesai"
                            ? "default"
                            : visit.status_lawatan === "Ditunda"
                            ? "destructive"
                            : visit.status_lawatan === "Dibatalkan"
                            ? "outline"
                            : "secondary"
                        }
                      >
                        {visit.status_lawatan}
                      </Badge>
                    </div>

                    {visit.penemuan && (
                      <div className="text-sm mb-3">
                        <div className="font-medium">Penemuan:</div>
                        <div className="text-muted-foreground line-clamp-2">
                          {visit.penemuan}
                        </div>
                      </div>
                    )}

                    {visit.site_photos && visit.site_photos.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto">
                        {visit.site_photos.slice(0, 4).map((photo) => (
                          <img
                            key={photo.id}
                            src={photo.photo_url}
                            alt={photo.caption || "Site photo"}
                            className="w-20 h-20 object-cover rounded"
                          />
                        ))}
                        {visit.site_photos.length > 4 && (
                          <div className="w-20 h-20 bg-muted rounded flex items-center justify-center text-sm text-muted-foreground">
                            +{visit.site_photos.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* NEW SECTION: Dokumen */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-serif">Dokumen</CardTitle>
                <CardDescription>
                  Dokumen yang dimuat naik untuk permohonan ini
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowUploadModal(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Muat Naik
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {Object.keys(documents).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Tiada dokumen dimuat naik
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(documents).map(([category, docs]) => (
                  <div key={category}>
                    <h3 className="font-medium mb-3">{category}</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama Dokumen</TableHead>
                          <TableHead>Versi</TableHead>
                          <TableHead>Dimuat Naik Oleh</TableHead>
                          <TableHead>Tarikh</TableHead>
                          <TableHead className="w-20">Tindakan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {docs.map((doc) => (
                          <TableRow key={doc.id}>
                            <TableCell>{doc.file_name}</TableCell>
                            <TableCell>
                              {doc.versi ? (
                                <Badge variant="outline">{doc.versi}</Badge>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {(doc as any).uploaded_by_profile?.full_name || "-"}
                            </TableCell>
                            <TableCell>
                              {doc.uploaded_at
                                ? new Date(doc.uploaded_at).toLocaleDateString("ms-MY")
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(doc.file_path, "_blank")}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteDocument(doc.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 4: Semakan KPI */}
        {kpiProgress && (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Semakan KPI</CardTitle>
              <CardDescription>
                Progress tempoh 57 hari dari tarikh lengkap diterima OSC
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold font-mono">{kpiProgress.daysElapsed}</div>
                  <div className="text-sm text-muted-foreground">Hari Berlalu</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono">{kpiProgress.totalDays}</div>
                  <div className="text-sm text-muted-foreground">Jumlah Hari</div>
                </div>
                <div>
                  <div
                    className={`text-2xl font-bold font-mono ${
                      kpiProgress.daysRemaining < 0
                        ? "text-destructive"
                        : kpiProgress.daysRemaining <= 7
                        ? "text-orange-500"
                        : "text-green-600"
                    }`}
                  >
                    {kpiProgress.daysRemaining}
                  </div>
                  <div className="text-sm text-muted-foreground">Hari Berbaki</div>
                </div>
              </div>

              <div className="space-y-2">
                <Progress
                  value={kpiProgress.progressPercentage}
                  className={`h-3 ${
                    kpiProgress.status === "overdue"
                      ? "[&>div]:bg-destructive"
                      : kpiProgress.status === "critical"
                      ? "[&>div]:bg-red-500"
                      : kpiProgress.status === "warning"
                      ? "[&>div]:bg-yellow-500"
                      : "[&>div]:bg-green-500"
                  }`}
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    {kpiProgress.status === "overdue"
                      ? "Terlepas KPI"
                      : kpiProgress.status === "critical"
                      ? "Kritikal (>50 hari)"
                      : kpiProgress.status === "warning"
                      ? "Amaran (40-50 hari)"
                      : "Dalam Tempoh"}
                  </span>
                  <span>{Math.round(kpiProgress.progressPercentage)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 5: Status & Pegawai */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Status & Pegawai</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Status Dalaman</label>
                <Select
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}
                  disabled={!isAdmin}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${STATUS_COLORS[status] || "bg-gray-500"}`}
                          />
                          {status}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isAdmin && selectedStatus !== application.status_dalaman && (
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={handleStatusUpdate}
                    disabled={saving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Simpan Status
                  </Button>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Pegawai Bertanggungjawab</label>
                <Select
                  value={selectedOfficer}
                  onValueChange={setSelectedOfficer}
                  disabled={!isAdmin}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih pegawai" />
                  </SelectTrigger>
                  <SelectContent>
                    {officers.map((officer) => (
                      <SelectItem key={officer.id} value={officer.id}>
                        {officer.full_name} ({officer.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isAdmin && selectedOfficer !== application.assigned_officer_id && (
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={handleOfficerReassign}
                    disabled={saving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Agihkan Semula
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 6: Catatan */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Catatan Dalaman</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="Tambah catatan dalaman..."
            />
            {notes !== application.catatan_dalaman && (
              <Button onClick={handleNotesUpdate} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                Simpan Catatan
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Section 7: Sejarah Workflow */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Sejarah Workflow</CardTitle>
            <CardDescription>
              Rekod perubahan status dalam urutan terkini
            </CardDescription>
          </CardHeader>
          <CardContent>
            {workflowHistory.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Tiada rekod sejarah
              </div>
            ) : (
              <div className="space-y-4">
                {workflowHistory.map((record, index) => (
                  <div key={record.id}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="flex items-start gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{record.to_status}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(record.created_at).toLocaleString("ms-MY", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </span>
                        </div>
                        <div className="text-sm">
                          {record.comment || "Tiada catatan"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Oleh: {record.changed_by_profile?.full_name || "Sistem"} (
                          {record.changed_by_profile?.role || "system"})
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}