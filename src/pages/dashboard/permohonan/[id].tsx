import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { RoleGuard } from "@/components/RoleGuard";
import { validateOSCData, getValidationSummary } from "@/services/zoningValidationService";
import { agencyUlasanService, type AgencyUlasan, type AgencyUlasanStats } from "@/services/agencyUlasanService";
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
import { reportGenerationService } from "@/services/reportGenerationService";
import { Database } from "@/integrations/supabase/types";
import { Edit, FileText, MapPin, FileBarChart, Upload, ArrowLeft, Save, Plus, Trash2, Download, FileCheck, Sparkles, Loader2, AlertCircle, Calendar, User, Clock, CheckCircle, X, Eye, Check } from "lucide-react";
import { cajPemajanService, type CajPemajanData } from "@/services/cajPemajanService";
import { DisplayFileNumber } from "@/components/DisplayFileNumber";
import { FilePreviewModal } from "@/components/FilePreviewModal";
import { ComplianceResults } from "@/components/ComplianceResults";

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
  const [cajData, setCajData] = useState<CajPemajanData | null>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    tarikh_bayar: new Date().toISOString().split("T")[0],
    no_resit: "",
    catatan: "",
  });
  const [savingPayment, setSavingPayment] = useState(false);
  const [workflowHistory, setWorkflowHistory] = useState<WorkflowHistoryWithProfile[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [agencyUlasan, setAgencyUlasan] = useState<AgencyUlasan[]>([]);
  const [agencyStats, setAgencyStats] = useState<AgencyUlasanStats | null>(null);
  const [editingAgencyId, setEditingAgencyId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    tarikh_ulasan: string;
    ringkasan_ulasan: string;
    keputusan_agensi: string;
    catatan: string;
  }>({
    tarikh_ulasan: "",
    ringkasan_ulasan: "",
    keputusan_agensi: "Tiada Ulasan",
    catatan: "",
  });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [importProcessing, setImportProcessing] = useState(false);
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

  // Documents state - single declaration
  const [documents, setDocuments] = useState<Record<string, Document[]>>({});
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    jenis_dokumen: "",
    nama_dokumen: "",
    dokumen_url: "",
    versi: "",
    catatan: "",
  });

  // Generated reports state
  const [generatedReports, setGeneratedReports] = useState<any[]>([]);

  // AI Semakan state
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [jenisPembangunan, setJenisPembangunan] = useState("");
  const [selectedDocs, setSelectedDocs] = useState<string[]>(["GPJ", "RFN", "RSN", "RTD", "RKK"]);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiStatus, setAiStatus] = useState("");
  const [planParameters, setPlanParameters] = useState<any>(null);
  const [retrievedChunks, setRetrievedChunks] = useState<any[]>([]);
  const [aiRecommendation, setAiRecommendation] = useState<any>(null);

  // Manual review mode state
  const [reviewMode, setReviewMode] = useState<"ai" | "manual">("ai");
  const [manualParams, setManualParams] = useState({
    jenis_pembangunan: "",
    zon_perancangan_dicadang: "",
    kegunaan_tanah_dicadang: "",
    keluasan_tapak_m2: "",
    keluasan_lantai_kasar_m2: "",
    bilangan_tingkat: "",
    ketinggian_bangunan_m: "",
    nisbah_plot: "",
    peratusan_kawasan_plinth: "",
    densiti_unit_per_ekar: "",
    anjakan_hadapan_m: "",
    anjakan_belakang_m: "",
    anjakan_tepi_kanan_m: "",
    anjakan_tepi_kiri_m: "",
    parkir_kereta: "",
    parkir_motorsikal: "",
    parkir_oku: "",
    kawasan_lapang_peratus: "",
    jalan_utama_lebar_m: "",
    bil_unit_kediaman: "",
    bil_unit_komersial: "",
  });
  const [manualReferences, setManualReferences] = useState<any[]>([]);
  const [manualNotes, setManualNotes] = useState("");
  const [manualSearching, setManualSearching] = useState(false);

  // Manual compliance assessment state
  const [complianceRows, setComplianceRows] = useState([
    { parameter: "Zon Perancangan", nilai_cadangan: "", nilai_piawai: "", status: "", dokumen_rujukan: "", nota: "" },
    { parameter: "Kegunaan Tanah", nilai_cadangan: "", nilai_piawai: "", status: "", dokumen_rujukan: "", nota: "" },
    { parameter: "Nisbah Plot", nilai_cadangan: "", nilai_piawai: "", status: "", dokumen_rujukan: "", nota: "" },
    { parameter: "Ketinggian Bangunan", nilai_cadangan: "", nilai_piawai: "", status: "", dokumen_rujukan: "", nota: "" },
    { parameter: "Densiti", nilai_cadangan: "", nilai_piawai: "", status: "", dokumen_rujukan: "", nota: "" },
    { parameter: "Kawasan Plinth", nilai_cadangan: "", nilai_piawai: "", status: "", dokumen_rujukan: "", nota: "" },
    { parameter: "Anjakan Hadapan", nilai_cadangan: "", nilai_piawai: "", status: "", dokumen_rujukan: "", nota: "" },
    { parameter: "Anjakan Belakang", nilai_cadangan: "", nilai_piawai: "", status: "", dokumen_rujukan: "", nota: "" },
    { parameter: "Anjakan Tepi Kanan", nilai_cadangan: "", nilai_piawai: "", status: "", dokumen_rujukan: "", nota: "" },
    { parameter: "Anjakan Tepi Kiri", nilai_cadangan: "", nilai_piawai: "", status: "", dokumen_rujukan: "", nota: "" },
    { parameter: "Parkir Kereta", nilai_cadangan: "", nilai_piawai: "", status: "", dokumen_rujukan: "", nota: "" },
    { parameter: "Parkir Motorsikal", nilai_cadangan: "", nilai_piawai: "", status: "", dokumen_rujukan: "", nota: "" },
    { parameter: "Parkir OKU", nilai_cadangan: "", nilai_piawai: "", status: "", dokumen_rujukan: "", nota: "" },
    { parameter: "Kawasan Lapang", nilai_cadangan: "", nilai_piawai: "", status: "", dokumen_rujukan: "", nota: "" },
    { parameter: "Lebar Jalan Utama", nilai_cadangan: "", nilai_piawai: "", status: "", dokumen_rujukan: "", nota: "" },
  ]);

  // Officer recommendation state
  const [manualDecision, setManualDecision] = useState("");
  const [executiveSummary, setExecutiveSummary] = useState("");
  const [majorIssues, setMajorIssues] = useState<string[]>([""]);
  const [suggestedConditions, setSuggestedConditions] = useState<string[]>([""]);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualSavedReport, setManualSavedReport] = useState<any>(null);

  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<any>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Load data
  useEffect(() => {
    loadData();
  }, [router.query.id]);

  // Pre-fill compliance table from manual params
  useEffect(() => {
    if (reviewMode === "manual") {
      setComplianceRows((prev) =>
        prev.map((row) => {
          let cadangan = row.nilai_cadangan;
          switch (row.parameter) {
            case "Zon Perancangan":
              cadangan = manualParams.zon_perancangan_dicadang;
              break;
            case "Kegunaan Tanah":
              cadangan = manualParams.kegunaan_tanah_dicadang;
              break;
            case "Nisbah Plot":
              cadangan = manualParams.nisbah_plot;
              break;
            case "Ketinggian Bangunan":
              cadangan = manualParams.ketinggian_bangunan_m ? `${manualParams.ketinggian_bangunan_m} m` : "";
              break;
            case "Densiti":
              cadangan = manualParams.densiti_unit_per_ekar ? `${manualParams.densiti_unit_per_ekar} unit/ekar` : "";
              break;
            case "Kawasan Plinth":
              cadangan = manualParams.peratusan_kawasan_plinth ? `${manualParams.peratusan_kawasan_plinth}%` : "";
              break;
            case "Anjakan Hadapan":
              cadangan = manualParams.anjakan_hadapan_m ? `${manualParams.anjakan_hadapan_m} m` : "";
              break;
            case "Anjakan Belakang":
              cadangan = manualParams.anjakan_belakang_m ? `${manualParams.anjakan_belakang_m} m` : "";
              break;
            case "Anjakan Tepi Kanan":
              cadangan = manualParams.anjakan_tepi_kanan_m ? `${manualParams.anjakan_tepi_kanan_m} m` : "";
              break;
            case "Anjakan Tepi Kiri":
              cadangan = manualParams.anjakan_tepi_kiri_m ? `${manualParams.anjakan_tepi_kiri_m} m` : "";
              break;
            case "Parkir Kereta":
              cadangan = manualParams.parkir_kereta ? `${manualParams.parkir_kereta} petak` : "";
              break;
            case "Parkir Motorsikal":
              cadangan = manualParams.parkir_motorsikal ? `${manualParams.parkir_motorsikal} petak` : "";
              break;
            case "Parkir OKU":
              cadangan = manualParams.parkir_oku ? `${manualParams.parkir_oku} petak` : "";
              break;
            case "Kawasan Lapang":
              cadangan = manualParams.kawasan_lapang_peratus ? `${manualParams.kawasan_lapang_peratus}%` : "";
              break;
            case "Lebar Jalan Utama":
              cadangan = manualParams.jalan_utama_lebar_m ? `${manualParams.jalan_utama_lebar_m} m` : "";
              break;
          }
          return { ...row, nilai_cadangan: cadangan };
        })
      );
    }
  }, [manualParams, reviewMode]);

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

      // Load Caj Pemajuan data if exists
      try {
        const caj = await cajPemajanService.getCajPemajan(id as string);
        setCajData(caj);
      } catch (error) {
        // Caj Pemajuan may not exist yet - not an error
        setCajData(null);
      }

      // Get generated reports
      const reports = await reportGenerationService.getGeneratedReports(id as string);
      setGeneratedReports(reports);

      // Get officers (for admin only)
      if (profile?.role === "admin" || profile?.role === "department_head") {
        const officerList = await getAvailableOfficers();
        setOfficers(officerList);
      }
    } catch (error) {
      console.error("Error loading application:", error);
      toast({
        title: "Ralat",
        description: "Gagal memuatkan maklumat permohonan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadAgencyUlasan() {
    if (!application?.id) return;

    try {
      const agencies = await agencyUlasanService.getByApplication(application.id);
      setAgencyUlasan(agencies);
      setAgencyStats(agencyUlasanService.calculateStats(agencies));
    } catch (error) {
      console.error("Error loading agency reviews:", error);
    }
  }

  async function handleEditAgency(agency: AgencyUlasan) {
    setEditingAgencyId(agency.id);
    setEditForm({
      tarikh_ulasan: agency.tarikh_ulasan || "",
      ringkasan_ulasan: agency.ringkasan_ulasan || "",
      keputusan_agensi: agency.keputusan_agensi,
      catatan: agency.catatan || "",
    });
  }

  async function handleSaveAgency() {
    if (!editingAgencyId) return;

    try {
      await agencyUlasanService.updateAgency(editingAgencyId, {
        tarikh_ulasan: editForm.tarikh_ulasan || null,
        ringkasan_ulasan: editForm.ringkasan_ulasan || null,
        keputusan_agensi: editForm.keputusan_agensi,
        catatan: editForm.catatan || null,
      });

      toast({
        title: "Berjaya",
        description: "Ulasan agensi dikemaskini",
      });

      setEditingAgencyId(null);
      loadAgencyUlasan();
    } catch (error) {
      console.error("Error saving agency:", error);
      toast({
        title: "Ralat",
        description: "Gagal menyimpan ulasan agensi",
        variant: "destructive",
      });
    }
  }

  async function handleImportFromOSC() {
    if (!importText.trim() || !application?.id) return;

    setImportProcessing(true);
    try {
      const updatedCount = await agencyUlasanService.importFromOSC(
        application.id,
        importText
      );

      toast({
        title: "Import Berjaya",
        description: `${updatedCount} ulasan agensi telah diimport`,
      });

      setShowImportModal(false);
      setImportText("");
      loadAgencyUlasan();
    } catch (error) {
      console.error("Error importing agency reviews:", error);
      toast({
        title: "Ralat Import",
        description: error instanceof Error ? error.message : "Gagal import ulasan",
        variant: "destructive",
      });
    } finally {
      setImportProcessing(false);
    }
  }

  const calculateDaysRemaining = (deadline: string) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isOverdue = (deadline: string, status: string) => {
    return status === "Menunggu Bayaran" && calculateDaysRemaining(deadline) < 0;
  };

  const handleRecordPayment = async () => {
    if (!paymentFormData.tarikh_bayar || !paymentFormData.no_resit) {
      toast({
        title: "Ralat",
        description: "Sila lengkapkan tarikh bayaran dan no. resit",
        variant: "destructive",
      });
      return;
    }

    setSavingPayment(true);

    try {
      const updated = await cajPemajanService.recordPayment(
        cajData!.id,
        paymentFormData.tarikh_bayar,
        paymentFormData.no_resit,
        paymentFormData.catatan
      );

      // Insert workflow history
      await supabase.from("workflow_history").insert({
        application_id: application!.id,
        to_status: "Caj Pemajuan Dibayar",
        changed_by: currentUser.id,
        comment: `No. Resit: ${paymentFormData.no_resit}, RM${cajData!.jumlah_caj?.toFixed(2) || "0.00"}`,
      });

      setCajData(updated);
      setShowPaymentModal(false);
      setPaymentFormData({
        tarikh_bayar: new Date().toISOString().split("T")[0],
        no_resit: "",
        catatan: "",
      });

      toast({
        title: "Berjaya",
        description: "Caj Pemajuan berjaya direkodkan. Borang C(1) kini boleh dijana.",
      });

      // Reload data to refresh status
      await loadData();
    } catch (error) {
      console.error("Error recording payment:", error);
      toast({
        title: "Ralat",
        description: "Gagal merekod pembayaran",
        variant: "destructive",
      });
    } finally {
      setSavingPayment(false);
    }
  };

  const canGenerateC1 = () => {
    if (!application || !cajData) return { can: false, message: "Data tidak lengkap" };
    
    // Check 1: OSC approved?
    if (application.status !== "approved") {
      return { can: false, message: "Permohonan belum diluluskan OSC" };
    }

    // Check 2: Caj Pemajuan exists?
    if (!cajData) {
      return { can: false, message: "Jana Notis Caj Pemajuan dahulu" };
    }

    // Check 3: Paid or exempt?
    if (cajData.status_caj === "Dibayar" || cajData.status_caj === "Dikecualikan") {
      return { can: true, message: "" };
    }

    if (cajData.status_caj === "Belum Dikira") {
      return { can: false, message: "Caj Pemajuan belum dikira" };
    }

    return { can: false, message: "Tunggu pengesahan bayaran Caj Pemajuan" };
  };

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

  const toggleDocSelection = (code: string) => {
    setSelectedDocs((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleStartAiReview = async () => {
    if (!jenisPembangunan) {
      toast({
        title: "Ralat",
        description: "Sila pilih jenis pembangunan",
        variant: "destructive",
      });
      return;
    }

    setAiProcessing(true);
    setPlanParameters(null);
    setRetrievedChunks([]);

    try {
      // STEP 1: Build plan_parameters from OSC data (Source A)
      const oscParameters = {
        nisbah_plot: application?.nisbah_plot || null,
        ketinggian_bangunan_m: application?.ketinggian_bangunan_m || null,
        bil_tingkat: application?.bil_tingkat || null,
        bil_unit: application?.bil_unit || null,
        kawasan_lantai_kasar_m2: application?.kawasan_lantai_kasar_m2 || null,
        parkir_kereta: application?.bil_tempat_letak_kereta || null,
        parkir_motosikal: application?.bil_tempat_letak_motosikal || null,
        parkir_oku: application?.bil_tempat_letak_oku || null,
        kawasan_landskap_lembut: (application as any).kawasan_landskap_lembut_m2 || null,
        jenis_guna_tanah: (application as any).jenis_guna_tanah || null,
        zon_perancangan: (application as any).zoning || null,
        keluasan_tapak_m2: application?.kawasan_pembangunan_m2 || null,
      };

      // Check if all critical parameters are available from OSC
      const criticalParams = [
        oscParameters.nisbah_plot,
        oscParameters.ketinggian_bangunan_m,
        oscParameters.bil_tingkat,
        oscParameters.parkir_kereta,
        oscParameters.kawasan_lantai_kasar_m2,
      ];

      const allCriticalAvailable = criticalParams.every(p => p !== null && p !== undefined);

      let planParameters = { ...oscParameters };

      if (allCriticalAvailable) {
        // All critical parameters from OSC - skip plan PDF reading
        setAiStatus("✓ Semua parameter diperoleh dari OSC. Pelan cadangan tidak diperlukan untuk semakan asas.");
        
        // Wait 2 seconds to show message
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        // Some parameters missing - need plan PDF
        if (!selectedPlan) {
          toast({
            title: "Ralat",
            description: "Parameter tidak lengkap. Sila pilih pelan cadangan untuk ekstraksi parameter tambahan.",
            variant: "destructive",
          });
          setAiProcessing(false);
          return;
        }

        setAiStatus("Parameter tidak lengkap dari OSC. Membaca pelan cadangan untuk parameter tambahan...");
        
        const selectedDoc = Object.values(documents)
          .flat()
          .find((doc) => doc.id === selectedPlan);

        if (!selectedDoc?.file_path) {
          throw new Error("URL dokumen tidak dijumpai");
        }

        // Fetch and convert to base64
        const response = await fetch(selectedDoc.file_path);
        const blob = await response.blob();
        
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const mimeType = selectedDoc.file_path.toLowerCase().endsWith(".pdf")
          ? "application/pdf"
          : "image/jpeg";
        const contentType = mimeType === "application/pdf" ? "document" : "image";

        // Identify missing parameters
        const missingFields = Object.entries(oscParameters)
          .filter(([_, value]) => value === null)
          .map(([key, _]) => key);

        // Call Claude API to extract ONLY missing fields
        const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
        if (!apiKey) throw new Error("Anthropic API key not configured");

        const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            system: `Extract ONLY these missing fields from the architectural plan: ${missingFields.join(", ")}.
Return ONLY valid JSON with no explanation. Return null for any field not visible. Never guess.

Return this exact JSON structure with ONLY the requested fields:
{
  ${missingFields.map(f => `"${f}": null`).join(",\n  ")}
}`,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: contentType,
                    source: {
                      type: "base64",
                      media_type: mimeType,
                      data: base64,
                    },
                  },
                  {
                    type: "text",
                    text: `Extract these missing parameters from this plan: ${missingFields.join(", ")}. Return as JSON.`,
                  },
                ],
              },
            ],
          }),
        });

        if (!claudeResponse.ok) {
          const errorData = await claudeResponse.json();
          throw new Error(errorData.error?.message || "Claude API request failed");
        }

        const claudeData = await claudeResponse.json();
        const textBlock = claudeData.content?.find((block: any) => block.type === "text");
        if (!textBlock) throw new Error("No text content in API response");

        const extractedParams = JSON.parse(textBlock.text);

        // Merge OSC data (Source A) with extracted plan data (Source B)
        planParameters = {
          ...oscParameters,
          ...extractedParams,
        };

        setAiStatus("✓ Parameter tambahan diekstrak dari pelan cadangan.");
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setPlanParameters(planParameters);

      // STEP 2: Search policy chunks
      setAiStatus("Mencari peruntukan dasar yang relevan...");

      const searchTerms = [
        `anjakan bangunan ${jenisPembangunan}`,
        `nisbah plot ${jenisPembangunan}`,
        `ketinggian bangunan`,
        `densiti ${jenisPembangunan}`,
        `kawasan lapang`,
        `tempat letak kereta ${jenisPembangunan}`,
        `zon perancangan ${planParameters.zon_perancangan || ""}`,
        `${jenisPembangunan} kegunaan tanah`,
      ];

      const allChunks: any[] = [];
      const seenIds = new Set();

      for (const term of searchTerms) {
        const { data: chunks } = await supabase
          .from("policy_chunks")
          .select("*")
          .or(`content_text.ilike.%${term}%,keywords_text.ilike.%${term}%`)
          .in("document_code", selectedDocs)
          .limit(3);

        if (chunks) {
          chunks.forEach((chunk) => {
            if (!seenIds.has(chunk.id)) {
              seenIds.add(chunk.id);
              allChunks.push(chunk);
            }
          });
        }
      }

      const topChunks = allChunks.slice(0, 12);
      setRetrievedChunks(topChunks);

      setAiStatus("Menyusun ulasan teknikal...");

      // STEP 3: Generate AI recommendation
      const policyContext = topChunks
        .map(
          (c) =>
            `[${c.document_code} ${c.section_number || ""} — ${c.section_title || ""}]\n${c.content_text}`
        )
        .join("\n\n");

      const recommendationPrompt = `PARAMETER PELAN:\n${JSON.stringify(
        planParameters,
        null,
        2
      )}\n\nSEKSYEN DASAR RELEVAN:\n${policyContext}\n\nBandingkan dan kembalikan penilaian JSON.`;

      const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
      const recommendationResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are a senior urban planning officer at Majlis Perbandaran Segamat reviewing a KM application. Compare the proposed development against the policy sections provided. Return ONLY this JSON structure (all narrative in formal Bahasa Malaysia): {ringkasan_eksekutif: string, keputusan_ai: 'Disyorkan Lulus' or 'Disyorkan Lulus Bersyarat' or 'Disyorkan Tolak', keyakinan_ai: number 0-100, semakan_pematuhan:[{parameter, nilai_cadangan, nilai_piawai, dokumen_rujukan, status ('Patuh' or 'Tidak Patuh' or 'Perlu Pengesahan'), nota}], syarat_dicadangkan:[string], isu_utama:[string], rujukan_dasar:[{dokumen,seksyen,tajuk,relevansi}]}`,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: recommendationPrompt,
                },
              ],
            },
          ],
        }),
      });

      if (!recommendationResponse.ok) {
        const errorData = await recommendationResponse.json();
        throw new Error(errorData.error?.message || "Failed to generate recommendation");
      }

      const recommendationData = await recommendationResponse.json();
      const recommendationBlock = recommendationData.content?.find(
        (block: any) => block.type === "text"
      );
      if (!recommendationBlock) throw new Error("No recommendation content in API response");

      const recommendation = JSON.parse(recommendationBlock.text);
      setAiRecommendation(recommendation);

      // Save to generated_reports
      await reportGenerationService.createReport({
        application_id: application.id,
        report_type: "AI_Policy_Analysis",
        report_content: recommendation,
        status: "Muktamad",
        generated_by: currentUser.id,
      });

      toast({
        title: "Analisis Selesai",
        description: `${topChunks.length} peruntukan dasar dijumpai. ${recommendation.keputusan_ai}.`,
      });

      setAiProcessing(false);
    } catch (error) {
      console.error("Error in AI review:", error);
      toast({
        title: "Ralat AI",
        description: error instanceof Error ? error.message : "Gagal menganalisis pelan",
        variant: "destructive",
      });
      setAiProcessing(false);
    }
  };

  const handleManualParamChange = (field: string, value: string) => {
    setManualParams((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSearchManualReferences = async () => {
    setManualSearching(true);
    setManualReferences([]);

    try {
      // Build search queries from manual parameters
      const searchMap: Array<{ field: string; keywords: string }> = [
        { field: "ketinggian_bangunan_m", keywords: "ketinggian bangunan" },
        { field: "nisbah_plot", keywords: "nisbah plot" },
        { field: "anjakan_hadapan_m", keywords: "anjakan bangunan" },
        { field: "parkir_kereta", keywords: "tempat letak kereta" },
        { field: "kawasan_lapang_peratus", keywords: "kawasan lapang" },
        { field: "densiti_unit_per_ekar", keywords: "densiti" },
        { field: "zon_perancangan_dicadang", keywords: "zon perancangan" },
      ];

      const allResults: any[] = [];
      const seenIds = new Set();

      for (const { field, keywords } of searchMap) {
        if (manualParams[field as keyof typeof manualParams]) {
          const { data: chunks } = await supabase
            .from("policy_chunks")
            .select("*")
            .or(`content_text.ilike.%${keywords}%,keywords_text.ilike.%${keywords}%`)
            .in("document_code", selectedDocs)
            .limit(3);

          if (chunks) {
            chunks.forEach((chunk) => {
              if (!seenIds.has(chunk.id)) {
                seenIds.add(chunk.id);
                allResults.push(chunk);
              }
            });
          }
        }
      }

      // Also search by jenis_pembangunan if set
      if (manualParams.jenis_pembangunan) {
        const { data: devTypeChunks } = await supabase
          .from("policy_chunks")
          .select("*")
          .or(
            `content_text.ilike.%${manualParams.jenis_pembangunan}%,keywords_text.ilike.%${manualParams.jenis_pembangunan}%`
          )
          .in("document_code", selectedDocs)
          .limit(5);

        if (devTypeChunks) {
          devTypeChunks.forEach((chunk) => {
            if (!seenIds.has(chunk.id)) {
              seenIds.add(chunk.id);
              allResults.push(chunk);
            }
          });
        }
      }

      setManualReferences(allResults);

      toast({
        title: "Carian Selesai",
        description: `${allResults.length} rujukan dasar dijumpai`,
      });
    } catch (error) {
      console.error("Error searching manual references:", error);
      toast({
        title: "Ralat",
        description: "Gagal mencari rujukan dasar",
        variant: "destructive",
      });
    } finally {
      setManualSearching(false);
    }
  };

  const handleCopyStandard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Disalin",
      description: "Teks telah disalin ke papan keratan",
    });
  };

  const updateComplianceRow = (index: number, field: string, value: string) => {
    setComplianceRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addComplianceRow = () => {
    setComplianceRows((prev) => [
      ...prev,
      { parameter: "", nilai_cadangan: "", nilai_piawai: "", status: "", dokumen_rujukan: "", nota: "" },
    ]);
  };

  const addMajorIssue = () => {
    setMajorIssues((prev) => [...prev, ""]);
  };

  const updateMajorIssue = (index: number, value: string) => {
    setMajorIssues((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const addSuggestedCondition = () => {
    setSuggestedConditions((prev) => [...prev, ""]);
  };

  const updateSuggestedCondition = (index: number, value: string) => {
    setSuggestedConditions((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const getRowBackgroundClass = (status: string) => {
    switch (status) {
      case "Patuh":
        return "bg-green-50";
      case "Tidak Patuh":
        return "bg-red-50";
      case "Perlu Pengesahan":
        return "bg-yellow-50";
      case "Tidak Berkaitan":
        return "bg-gray-50 italic text-muted-foreground";
      default:
        return "";
    }
  };

  const calculateComplianceStats = () => {
    const patuh = complianceRows.filter((r) => r.status === "Patuh").length;
    const tidakPatuh = complianceRows.filter((r) => r.status === "Tidak Patuh").length;
    const perluPengesahan = complianceRows.filter((r) => r.status === "Perlu Pengesahan").length;
    const tidakBerkaitan = complianceRows.filter((r) => r.status === "Tidak Berkaitan").length;
    const total = complianceRows.filter((r) => r.status && r.status !== "Tidak Berkaitan").length;
    const complianceRate = total > 0 ? Math.round((patuh / total) * 100) : 0;

    return { patuh, tidakPatuh, perluPengesahan, tidakBerkaitan, complianceRate };
  };

  const handleSaveManualReview = async () => {
    if (!manualDecision || !executiveSummary) {
      toast({
        title: "Ralat",
        description: "Sila lengkapkan keputusan dan ringkasan eksekutif",
        variant: "destructive",
      });
      return;
    }

    setManualSaving(true);

    try {
      const reportContent = {
        mod: "Manual",
        pegawai: `${currentUser.profiles?.full_name || ""} (${currentUser.profiles?.designation || ""})`,
        tarikh: new Date().toISOString().split("T")[0],
        plan_parameters: manualParams,
        semakan_pematuhan: complianceRows,
        keputusan_manual: manualDecision,
        ringkasan_eksekutif: executiveSummary,
        isu_utama: majorIssues.filter((i) => i.trim()),
        syarat_dicadangkan: suggestedConditions.filter((s) => s.trim()),
        compliance_stats: calculateComplianceStats(),
      };

      // Save to generated_reports
      const savedReport = await reportGenerationService.createReport({
        application_id: application.id,
        report_type: "Manual_Policy_Review",
        report_content: reportContent,
        status: "Muktamad",
        generated_by: currentUser.id,
      });

      // Insert workflow history
      await supabase.from("workflow_history").insert({
        application_id: application.id,
        to_status: "Semakan Manual Diselesaikan",
        changed_by: currentUser.id,
        comment: `Keputusan: ${manualDecision}`,
      });

      setManualSavedReport(savedReport);

      toast({
        title: "Berjaya Disimpan",
        description: "Semakan manual telah disimpan",
      });
    } catch (error) {
      console.error("Error saving manual review:", error);
      toast({
        title: "Ralat",
        description: "Gagal menyimpan semakan manual",
        variant: "destructive",
      });
    } finally {
      setManualSaving(false);
    }
  };

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
            {/* Show AI Semakan button if plans exist */}
            {(documents["Pelan Susun Atur"]?.length > 0 || documents["Pelan Bangunan"]?.length > 0) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAiPanel(true)}
                className="bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100"
              >
                <Sparkles className="h-4 w-4 mr-2 text-purple-600" />
                Semakan AI
              </Button>
            )}
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
            <RoleGuard roles={["admin", "ketua_unit", "pegawai", "penolong"]}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUploadModal(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Muat Naik Dokumen
              </Button>
            </RoleGuard>
            <RoleGuard roles={["admin", "ketua_unit", "pegawai"]}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/laporan-teknikal/${application.id}`)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Laporan Teknikal
              </Button>
            </RoleGuard>
            <RoleGuard roles={["admin", "ketua_unit", "pegawai"]}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/ulasan-perancangan/${application.id}`)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Ulasan Perancangan
              </Button>
            </RoleGuard>
            <RoleGuard roles={["admin", "ketua_unit"]}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/reports/${application.id}`)}
              >
                <FileBarChart className="h-4 w-4 mr-2" />
                Jana Ulasan
              </Button>
            </RoleGuard>
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

        {/* NEW SECTION: Laporan Dijana */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-serif">Laporan Dijana</CardTitle>
                <CardDescription>
                  Laporan teknikal yang telah dijana untuk permohonan ini
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => router.push(`/dashboard/reports/${application.id}`)}
              >
                <FileBarChart className="h-4 w-4 mr-2" />
                Jana Laporan Baharu
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {generatedReports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Tiada laporan dijana
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jenis Laporan</TableHead>
                    <TableHead>Templat</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dijana Oleh</TableHead>
                    <TableHead>Tarikh</TableHead>
                    <TableHead className="w-20">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generatedReports.map((report) => (
                    <TableRow
                      key={report.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/dashboard/reports/${application.id}?report_id=${report.id}`)}
                    >
                      <TableCell className="font-medium">{report.report_type}</TableCell>
                      <TableCell className="text-sm">
                        {report.report_templates?.template_name || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={report.status === "Muktamad" ? "default" : "secondary"}>
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {report.profiles?.full_name || "-"}
                      </TableCell>
                      <TableCell>
                        {report.generated_at
                          ? new Date(report.generated_at).toLocaleDateString("ms-MY")
                          : "-"}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/dashboard/reports/${application.id}?report_id=${report.id}`)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              if (confirm("Adakah anda pasti untuk memadam laporan ini?")) {
                                await reportGenerationService.deleteReport(report.id);
                                const reports = await reportGenerationService.getGeneratedReports(application.id);
                                setGeneratedReports(reports);
                                toast({
                                  title: "Berjaya",
                                  description: "Laporan dipadam",
                                });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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

        {/* Caj Pemajuan Status */}
        {cajData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-lg">Caj Pemajuan</span>
                {cajData.status_caj === "Belum Dikira" && (
                  <Badge variant="secondary">Belum Dikira</Badge>
                )}
                {cajData.status_caj === "Menunggu Bayaran" && (
                  <Badge className="bg-orange-500">Menunggu Bayaran</Badge>
                )}
                {cajData.status_caj === "Dibayar" && (
                  <Badge className="bg-green-600">Dibayar</Badge>
                )}
                {cajData.status_caj === "Dikecualikan" && (
                  <Badge className="bg-blue-600">Dikecualikan</Badge>
                )}
                {cajData.status_caj === "Ansuran Diluluskan" && (
                  <Badge className="bg-purple-600">Ansuran Diluluskan</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Overdue Alert */}
              {cajData.tarikh_luput_bayar && isOverdue(cajData.tarikh_luput_bayar, cajData.status_caj) && (
                <Alert className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-900">
                    <strong>Caj Pemajuan belum dibayar.</strong> Tarikh luput:{" "}
                    {new Date(cajData.tarikh_luput_bayar).toLocaleDateString("ms-MY")}. Borang C(1) tidak boleh dijana.
                  </AlertDescription>
                </Alert>
              )}

              {cajData.jumlah_caj && (
                <div>
                  <div className="text-sm text-muted-foreground">Jumlah Caj</div>
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat("ms-MY", {
                      style: "currency",
                      currency: "MYR",
                    }).format(cajData.jumlah_caj)}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                {cajData.tarikh_notis && (
                  <div>
                    <div className="text-muted-foreground">Tarikh Notis</div>
                    <div className="font-medium">
                      {new Date(cajData.tarikh_notis).toLocaleDateString("ms-MY")}
                    </div>
                  </div>
                )}
                {cajData.tarikh_luput_bayar && (
                  <div>
                    <div className="text-muted-foreground">Tarikh Luput Bayar</div>
                    <div className="font-medium">
                      {new Date(cajData.tarikh_luput_bayar).toLocaleDateString("ms-MY")}
                    </div>
                    {cajData.status_caj === "Menunggu Bayaran" && (
                      <div className={`text-xs mt-1 ${calculateDaysRemaining(cajData.tarikh_luput_bayar) < 7 ? "text-red-600 font-semibold" : "text-muted-foreground"}`}>
                        Baki: {calculateDaysRemaining(cajData.tarikh_luput_bayar)} hari
                      </div>
                    )}
                  </div>
                )}
                {cajData.tarikh_bayar && (
                  <div>
                    <div className="text-muted-foreground">Tarikh Bayaran</div>
                    <div className="font-medium">
                      {new Date(cajData.tarikh_bayar).toLocaleDateString("ms-MY")}
                    </div>
                  </div>
                )}
                {cajData.dikira_oleh && (
                  <div>
                    <div className="text-muted-foreground">Dikira Oleh</div>
                    <div>{cajData.dikira_oleh}</div>
                  </div>
                )}
                {cajData.no_resit && (
                  <div>
                    <div className="text-muted-foreground">No. Resit</div>
                    <div className="font-medium">{cajData.no_resit}</div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push(`/dashboard/caj-pemajuan?id=${application.id}`)}
                >
                  Urus Caj Pemajuan
                </Button>
                
                {cajData.status_caj === "Menunggu Bayaran" && (
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => setShowPaymentModal(true)}
                  >
                    Rekod Pembayaran
                  </Button>
                )}
              </div>

              {cajData.status_caj === "Belum Dikira" && (
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900 text-sm">
                    Sila kemukakan kepada JPPH untuk pengiraan Caj Pemajuan sebelum Borang C(1) boleh dijana.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Status Kelulusan Timeline */}
        {application?.status === "approved" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status Kelulusan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* OSC Lulus */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-white text-xs">
                    ✓
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">OSC Lulus</div>
                    <div className="text-sm text-muted-foreground">
                      Tarikh: {application.updated_at ? new Date(application.updated_at).toLocaleDateString("ms-MY") : "-"}
                    </div>
                  </div>
                </div>

                {/* Caj Pemajuan */}
                {cajData && (
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${
                      cajData.status_caj === "Dibayar" || cajData.status_caj === "Dikecualikan"
                        ? "bg-green-600"
                        : "bg-orange-500"
                    }`}>
                      {cajData.status_caj === "Dibayar" || cajData.status_caj === "Dikecualikan" ? "✓" : "●"}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Caj Pemajuan</div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {cajData.status_caj} {cajData.jumlah_caj ? ` — RM${cajData.jumlah_caj.toFixed(2)}` : ""}
                      </div>
                      {cajData.status_caj === "Belum Dikira" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/caj-pemajuan?id=${application.id}`)}
                        >
                          Masukkan Jumlah Caj
                        </Button>
                      )}
                      {cajData.status_caj === "Menunggu Bayaran" && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => setShowPaymentModal(true)}
                        >
                          Rekod Bayaran
                        </Button>
                      )}
                      {(cajData.status_caj === "Dibayar" || cajData.status_caj === "Dikecualikan") && (
                        <div className="text-sm text-green-600">✓ Selesai</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Borang C1 */}
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${
                    canGenerateC1().can ? "bg-green-600" : "bg-gray-400"
                  }`}>
                    {canGenerateC1().can ? "✓" : " "}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Borang C(1)</div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {canGenerateC1().can ? "Boleh dijana" : canGenerateC1().message}
                    </div>
                    {canGenerateC1().can && (
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => router.push(`/dashboard/osc-decisions?highlight=${application.id}`)}
                      >
                        Jana Borang C(1)
                      </Button>
                    )}
                  </div>
                </div>

                {/* Surat Pemberitahuan */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs">
                    
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Surat Pemberitahuan</div>
                    <div className="text-sm text-muted-foreground">
                      Belum dijana (automatik bersama Borang C1)
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dokumen */}
        <Card>
          <CardContent>
            {Object.entries(documents).map(([category, docs]) => (
              <div key={category} className="mb-6">
                <h3 className="font-semibold mb-3">{category}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Dokumen</TableHead>
                      <TableHead>Versi</TableHead>
                      <TableHead>Dimuat Naik Oleh</TableHead>
                      <TableHead>Tarikh</TableHead>
                      <TableHead className="w-32">Tindakan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {docs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Tiada dokumen {category}
                        </TableCell>
                      </TableRow>
                    ) : (
                      docs.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">{doc.file_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{doc.versi || "v1"}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {(doc as any).profiles?.full_name || "-"}
                          </TableCell>
                          <TableCell>
                            {doc.uploaded_at
                              ? new Date(doc.uploaded_at).toLocaleDateString("ms-MY")
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setPreviewDocument(doc);
                                  setShowPreviewModal(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (doc && typeof doc === 'object' && 'file_path' in doc) {
                                    window.open((doc as any).file_path, "_blank");
                                  }
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Ulasan Agensi Section */}
        {application.jenis_aplikasi === "KM" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Ulasan Agensi Teknikal</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ulasan daripada agensi-agensi teknikal yang terlibat
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowImportModal(true)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import dari OSC
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Summary Stats */}
              {agencyStats && (
                <div className="mb-6">
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="p-3 bg-green-50 border border-green-200 rounded">
                      <div className="text-2xl font-bold text-green-700">
                        {agencyStats.tiada_halangan}
                      </div>
                      <div className="text-xs text-green-600">Tiada Halangan</div>
                    </div>
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="text-2xl font-bold text-yellow-700">
                        {agencyStats.dengan_syarat}
                      </div>
                      <div className="text-xs text-yellow-600">Dengan Syarat</div>
                    </div>
                    <div className="p-3 bg-red-50 border border-red-200 rounded">
                      <div className="text-2xl font-bold text-red-700">
                        {agencyStats.tidak_menyokong}
                      </div>
                      <div className="text-xs text-red-600">Tidak Menyokong</div>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                      <div className="text-2xl font-bold text-gray-700">
                        {agencyStats.belum_ulasan}
                      </div>
                      <div className="text-xs text-gray-600">Belum Ulasan</div>
                    </div>
                  </div>

                  {/* Kertas Perakuan Banner */}
                  {agencyStats.completion_percent >= 80 && (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="flex items-center justify-between">
                        <span className="text-green-900 font-medium">
                          Ulasan agensi cukup untuk jana Kertas Perakuan ({agencyStats.completion_percent.toFixed(0)}%)
                        </span>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            // TODO: Navigate to Kertas Perakuan generation
                            toast({
                              title: "Info",
                              description: "Modul Kertas Perakuan akan dibangunkan",
                            });
                          }}
                        >
                          Jana Kertas Perakuan →
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Agency Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agensi</TableHead>
                    <TableHead>Tarikh Ulasan</TableHead>
                    <TableHead>Ringkasan Ulasan</TableHead>
                    <TableHead>Keputusan</TableHead>
                    <TableHead className="text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agencyUlasan.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Tiada ulasan agensi dijumpai
                      </TableCell>
                    </TableRow>
                  ) : (
                    agencyUlasan.map((agency) => (
                      <TableRow key={agency.id}>
                        {editingAgencyId === agency.id ? (
                          <>
                            <TableCell>
                              <Badge variant="secondary">{agency.kod_agensi}</Badge>
                              <div className="text-xs text-muted-foreground mt-1">
                                {agency.nama_agensi}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="date"
                                value={editForm.tarikh_ulasan}
                                onChange={(e) =>
                                  setEditForm((prev) => ({ ...prev, tarikh_ulasan: e.target.value }))
                                }
                                className="w-full"
                              />
                            </TableCell>
                            <TableCell>
                              <Textarea
                                value={editForm.ringkasan_ulasan}
                                onChange={(e) =>
                                  setEditForm((prev) => ({ ...prev, ringkasan_ulasan: e.target.value }))
                                }
                                rows={2}
                                className="w-full"
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={editForm.keputusan_agensi}
                                onValueChange={(value) =>
                                  setEditForm((prev) => ({ ...prev, keputusan_agensi: value }))
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Tiada Halangan">Tiada Halangan</SelectItem>
                                  <SelectItem value="Tiada Halangan dengan Syarat">
                                    Tiada Halangan dengan Syarat
                                  </SelectItem>
                                  <SelectItem value="Belum Boleh Menyokong">
                                    Belum Boleh Menyokong
                                  </SelectItem>
                                  <SelectItem value="Tiada Ulasan">Tiada Ulasan</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button size="sm" onClick={handleSaveAgency}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingAgencyId(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell>
                              <Badge variant="secondary">{agency.kod_agensi}</Badge>
                              <div className="text-xs text-muted-foreground mt-1">
                                {agency.nama_agensi}
                              </div>
                            </TableCell>
                            <TableCell>
                              {agency.tarikh_ulasan || (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="max-w-md">
                                {agency.ringkasan_ulasan || (
                                  <span className="text-muted-foreground text-sm">Tiada ulasan</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={agencyUlasanService.getDecisionColor(
                                  agency.keputusan_agensi
                                )}
                              >
                                {agency.keputusan_agensi}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setPreviewDocument(document);
                                    setShowPreviewModal(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(document.file_path, "_blank")}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* AI Plan Analysis */}
      </div>

      {/* AI Semakan Panel */}
      <Sheet open={showAiPanel} onOpenChange={setShowAiPanel}>
        <SheetContent side="right" className="w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Semakan Teknikal AI
            </SheetTitle>
            <SheetDescription>
              Analisis pelan berbanding dasar perancangan
            </SheetDescription>
          </SheetHeader>

          {/* Mode Selector */}
          <div className="mt-4 mb-6">
            <label className="text-sm font-medium mb-2 block">Mod Semakan:</label>
            <Tabs value={reviewMode} onValueChange={(v) => setReviewMode(v as "ai" | "manual")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ai">Automatik (AI)</TabsTrigger>
                <TabsTrigger value="manual">Manual</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {reviewMode === "manual" ? (
            /* Manual Mode */
            <div className="space-y-6">
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 text-sm">
                  Mod Manual — Masukkan parameter secara manual. AI tidak diperlukan. Sesuai digunakan
                  apabila tiada sambungan internet.
                </AlertDescription>
              </Alert>

              {/* Document Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">Rujukan Dasar</label>
                <div className="space-y-2">
                  {[
                    { code: "GPJ", name: "Manual GPJ" },
                    { code: "RFN", name: "Rancangan Fizikal Negara (RFN)" },
                    { code: "RSN", name: "Rancangan Struktur Negeri Johor 2035 (RSN)" },
                    { code: "RTD", name: "Rancangan Tempatan Daerah Segamat 2030 (RTD)" },
                    { code: "RKK", name: "Rancangan Kawasan Khas Segamat 2035 (RKK)" },
                  ].map((doc) => (
                    <div key={doc.code} className="flex items-center space-x-2">
                      <Checkbox
                        id={`manual-doc-${doc.code}`}
                        checked={selectedDocs.includes(doc.code)}
                        onCheckedChange={() => toggleDocSelection(doc.code)}
                      />
                      <label htmlFor={`manual-doc-${doc.code}`} className="text-sm cursor-pointer">
                        {doc.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Manual Parameter Entry Form */}
              <div>
                <h3 className="font-semibold mb-1">Langkah 1: Masukkan Parameter dari Pelan</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Baca pelan cadangan dan isi nilai di bawah
                </p>

                <div className="space-y-6">
                  {/* Section A */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">A. Maklumat Asas Cadangan</h4>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Jenis Pembangunan</Label>
                        <Select
                          value={manualParams.jenis_pembangunan}
                          onValueChange={(v) => handleManualParamChange("jenis_pembangunan", v)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Pilih" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Kediaman">Kediaman</SelectItem>
                            <SelectItem value="Komersial">Komersial</SelectItem>
                            <SelectItem value="Perindustrian">Perindustrian</SelectItem>
                            <SelectItem value="Institusi">Institusi</SelectItem>
                            <SelectItem value="Campuran">Campuran</SelectItem>
                            <SelectItem value="KMT">KMT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Zon Perancangan Dicadang</Label>
                        <Input
                          value={manualParams.zon_perancangan_dicadang}
                          onChange={(e) =>
                            handleManualParamChange("zon_perancangan_dicadang", e.target.value)
                          }
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Kegunaan Tanah Dicadang</Label>
                        <Input
                          value={manualParams.kegunaan_tanah_dicadang}
                          onChange={(e) =>
                            handleManualParamChange("kegunaan_tanah_dicadang", e.target.value)
                          }
                          className="h-9"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Keluasan Tapak (m²)</Label>
                          <Input
                            type="number"
                            value={manualParams.keluasan_tapak_m2}
                            onChange={(e) => handleManualParamChange("keluasan_tapak_m2", e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Keluasan Lantai Kasar (m²)</Label>
                          <Input
                            type="number"
                            value={manualParams.keluasan_lantai_kasar_m2}
                            onChange={(e) =>
                              handleManualParamChange("keluasan_lantai_kasar_m2", e.target.value)
                            }
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section B */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">B. Parameter Bangunan</h4>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Bilangan Tingkat</Label>
                          <Input
                            type="number"
                            value={manualParams.bilangan_tingkat}
                            onChange={(e) => handleManualParamChange("bilangan_tingkat", e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Ketinggian Bangunan (m)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={manualParams.ketinggian_bangunan_m}
                            onChange={(e) =>
                              handleManualParamChange("ketinggian_bangunan_m", e.target.value)
                            }
                            className="h-9"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Nisbah Plot</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={manualParams.nisbah_plot}
                            onChange={(e) => handleManualParamChange("nisbah_plot", e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Kawasan Plinth (%)</Label>
                          <Input
                            type="number"
                            value={manualParams.peratusan_kawasan_plinth}
                            onChange={(e) =>
                              handleManualParamChange("peratusan_kawasan_plinth", e.target.value)
                            }
                            className="h-9"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Densiti (unit/ekar)</Label>
                        <Input
                          type="number"
                          value={manualParams.densiti_unit_per_ekar}
                          onChange={(e) => handleManualParamChange("densiti_unit_per_ekar", e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section C */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">C. Anjakan Bangunan (meter)</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Hadapan</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={manualParams.anjakan_hadapan_m}
                          onChange={(e) => handleManualParamChange("anjakan_hadapan_m", e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Belakang</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={manualParams.anjakan_belakang_m}
                          onChange={(e) => handleManualParamChange("anjakan_belakang_m", e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Tepi Kanan</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={manualParams.anjakan_tepi_kanan_m}
                          onChange={(e) =>
                            handleManualParamChange("anjakan_tepi_kanan_m", e.target.value)
                          }
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Tepi Kiri</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={manualParams.anjakan_tepi_kiri_m}
                          onChange={(e) => handleManualParamChange("anjakan_tepi_kiri_m", e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section D */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">D. Parkir (bilangan petak)</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Kereta</Label>
                        <Input
                          type="number"
                          value={manualParams.parkir_kereta}
                          onChange={(e) => handleManualParamChange("parkir_kereta", e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Motorsikal</Label>
                        <Input
                          type="number"
                          value={manualParams.parkir_motorsikal}
                          onChange={(e) => handleManualParamChange("parkir_motorsikal", e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">OKU</Label>
                        <Input
                          type="number"
                          value={manualParams.parkir_oku}
                          onChange={(e) => handleManualParamChange("parkir_oku", e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section E */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">E. Lain-lain</h4>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Kawasan Lapang (%)</Label>
                          <Input
                            type="number"
                            value={manualParams.kawasan_lapang_peratus}
                            onChange={(e) =>
                              handleManualParamChange("kawasan_lapang_peratus", e.target.value)
                            }
                            className="h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Lebar Jalan Utama (m)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={manualParams.jalan_utama_lebar_m}
                            onChange={(e) =>
                              handleManualParamChange("jalan_utama_lebar_m", e.target.value)
                            }
                            className="h-9"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Bil. Unit Kediaman</Label>
                          <Input
                            type="number"
                            value={manualParams.bil_unit_kediaman}
                            onChange={(e) =>
                              handleManualParamChange("bil_unit_kediaman", e.target.value)
                            }
                            className="h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Bil. Unit Komersial</Label>
                          <Input
                            type="number"
                            value={manualParams.bil_unit_komersial}
                            onChange={(e) =>
                              handleManualParamChange("bil_unit_komersial", e.target.value)
                            }
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Search Button */}
              <div>
                <p className="text-sm font-medium mb-3">Langkah 2: Semak Piawai Perancangan →</p>
                <Button
                  onClick={handleSearchManualReferences}
                  disabled={manualSearching || !manualParams.jenis_pembangunan}
                  className="w-full"
                >
                  {manualSearching ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Mencari...
                    </>
                  ) : (
                    "Cari Piawai Berkaitan"
                  )}
                </Button>
              </div>

              {/* Manual References Display */}
              {manualReferences.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-1">Rujukan Dasar Berkaitan</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      Rujukan ini diambil daripada pangkalan data tempatan MPS. Tiada sambungan internet
                      diperlukan untuk carian ini.
                    </p>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {manualReferences.map((ref) => (
                        <Card key={ref.id}>
                          <CardContent className="pt-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge>{ref.document_code}</Badge>
                                {ref.section_number && (
                                  <Badge variant="outline">{ref.section_number}</Badge>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyStandard(ref.content_text)}
                              >
                                Salin Nilai Piawai
                              </Button>
                            </div>
                            {ref.section_title && (
                              <h4 className="font-semibold text-sm">{ref.section_title}</h4>
                            )}
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                              {ref.content_text}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm">Nota Rujukan Pegawai (pilihan)</Label>
                    <Textarea
                      value={manualNotes}
                      onChange={(e) => setManualNotes(e.target.value)}
                      placeholder="Catat nombor seksyen atau nilai piawai yang dirujuk untuk rekod..."
                      className="mt-2 min-h-24"
                    />
                  </div>
                </>
              )}

              {/* Compliance Assessment Table */}
              {manualReferences.length > 0 && !manualSavedReport && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-1">Langkah 3: Penilaian Pematuhan</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Bandingkan nilai cadangan dengan piawai
                    </p>

                    <div className="border rounded-md overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted">
                            <TableHead className="text-xs w-32">Parameter</TableHead>
                            <TableHead className="text-xs w-28">Nilai Cadangan</TableHead>
                            <TableHead className="text-xs w-28">Nilai Piawai</TableHead>
                            <TableHead className="text-xs w-32">Status</TableHead>
                            <TableHead className="text-xs w-36">Dokumen Rujukan</TableHead>
                            <TableHead className="text-xs">Nota</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {complianceRows.map((row, idx) => (
                            <TableRow key={idx} className={getRowBackgroundClass(row.status)}>
                              <TableCell className="text-xs font-medium">{row.parameter}</TableCell>
                              <TableCell className="text-xs">{row.nilai_cadangan}</TableCell>
                              <TableCell className="p-1">
                                <Input
                                  value={row.nilai_piawai}
                                  onChange={(e) => updateComplianceRow(idx, "nilai_piawai", e.target.value)}
                                  className="h-8 text-xs"
                                />
                              </TableCell>
                              <TableCell className="p-1">
                                <Select
                                  value={row.status}
                                  onValueChange={(v) => updateComplianceRow(idx, "status", v)}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Patuh">Patuh</SelectItem>
                                    <SelectItem value="Tidak Patuh">Tidak Patuh</SelectItem>
                                    <SelectItem value="Perlu Pengesahan">Perlu Pengesahan</SelectItem>
                                    <SelectItem value="Tidak Berkaitan">Tidak Berkaitan</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="p-1">
                                <Input
                                  value={row.dokumen_rujukan}
                                  onChange={(e) => updateComplianceRow(idx, "dokumen_rujukan", e.target.value)}
                                  className="h-8 text-xs"
                                  placeholder="RTD 2030, S.4.2"
                                />
                              </TableCell>
                              <TableCell className="p-1">
                                <Input
                                  value={row.nota}
                                  onChange={(e) => updateComplianceRow(idx, "nota", e.target.value)}
                                  className="h-8 text-xs"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex justify-between items-center mt-3">
                      <Button variant="outline" size="sm" onClick={addComplianceRow}>
                        <Plus className="h-3 w-3 mr-1" />
                        Tambah Baris
                      </Button>
                      <div className="text-sm">
                        <span className="text-green-600 font-medium">
                          Patuh: {calculateComplianceStats().patuh}
                        </span>
                        {" | "}
                        <span className="text-destructive font-medium">
                          Tidak Patuh: {calculateComplianceStats().tidakPatuh}
                        </span>
                        {" | "}
                        <span className="text-yellow-600 font-medium">
                          Perlu Pengesahan: {calculateComplianceStats().perluPengesahan}
                        </span>
                        {" | "}
                        <span className="text-muted-foreground">
                          Tidak Berkaitan: {calculateComplianceStats().tidakBerkaitan}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm font-medium mt-2 text-right">
                      Kadar Pematuhan: {calculateComplianceStats().complianceRate}%
                    </p>
                  </div>

                  <Separator />

                  {/* Officer Recommendation */}
                  <div>
                    <h3 className="font-semibold mb-1">Langkah 4: Ulasan dan Syor Pegawai</h3>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label className="text-sm">
                          Keputusan Manual <span className="text-destructive">*</span>
                        </Label>
                        <Select value={manualDecision} onValueChange={setManualDecision}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Pilih keputusan" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Disyorkan Lulus">Disyorkan Lulus</SelectItem>
                            <SelectItem value="Disyorkan Lulus Bersyarat">
                              Disyorkan Lulus Bersyarat
                            </SelectItem>
                            <SelectItem value="Disyorkan Tolak">Disyorkan Tolak</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm">
                          Ringkasan Eksekutif <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          value={executiveSummary}
                          onChange={(e) => setExecutiveSummary(e.target.value)}
                          placeholder="Nyatakan penilaian keseluruhan cadangan ini berdasarkan semakan teknikal..."
                          className="mt-1 min-h-24"
                        />
                      </div>

                      <div>
                        <Label className="text-sm">Isu Utama Dikenal Pasti</Label>
                        <div className="space-y-2 mt-1">
                          {majorIssues.map((issue, idx) => (
                            <Input
                              key={idx}
                              value={issue}
                              onChange={(e) => updateMajorIssue(idx, e.target.value)}
                              placeholder={`Isu ${idx + 1}`}
                              className="h-9"
                            />
                          ))}
                          <Button variant="outline" size="sm" onClick={addMajorIssue}>
                            <Plus className="h-3 w-3 mr-1" />
                            Tambah Isu
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm">Syarat yang Dicadangkan</Label>
                        <div className="space-y-2 mt-1">
                          {suggestedConditions.map((condition, idx) => (
                            <Input
                              key={idx}
                              value={condition}
                              onChange={(e) => updateSuggestedCondition(idx, e.target.value)}
                              placeholder={`Syarat ${idx + 1}`}
                              className="h-9"
                            />
                          ))}
                          <Button variant="outline" size="sm" onClick={addSuggestedCondition}>
                            <Plus className="h-3 w-3 mr-1" />
                            Tambah Syarat
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm">Disediakan Oleh</Label>
                          <Input
                            value={currentUser.profiles?.full_name || ""}
                            disabled
                            className="mt-1 h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Jawatan</Label>
                          <Input
                            value={currentUser.profiles?.designation || ""}
                            disabled
                            className="mt-1 h-9"
                          />
                        </div>
                      </div>

                      <Button
                        onClick={handleSaveManualReview}
                        disabled={manualSaving || !manualDecision || !executiveSummary}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        {manualSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Menyimpan...
                          </>
                        ) : (
                          "Simpan Semakan Manual"
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Saved Manual Review Results */}
              {manualSavedReport && (
                <>
                  <Separator />
                  <div>
                    <Alert className="bg-green-50 border-green-200 mb-4">
                      <FileCheck className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-900">
                        <p className="font-semibold">Semakan Manual Diselesaikan</p>
                        <p className="text-sm mt-1">
                          Semakan manual oleh {currentUser.profiles?.full_name}
                        </p>
                      </AlertDescription>
                    </Alert>

                    <Card>
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <Badge
                            className={
                              manualDecision === "Disyorkan Lulus"
                                ? "bg-green-600"
                                : manualDecision === "Disyorkan Lulus Bersyarat"
                                ? "bg-orange-500"
                                : "bg-destructive"
                            }
                          >
                            {manualDecision}
                          </Badge>
                          <div className="text-sm">
                            Kadar Pematuhan:{" "}
                            <span className="font-bold">{calculateComplianceStats().complianceRate}%</span>
                          </div>
                        </div>
                        <p className="text-sm">{executiveSummary}</p>
                      </CardContent>
                    </Card>

                    <div className="mt-4 space-y-3">
                      <Button
                        className="w-full"
                        onClick={() => {
                          router.push(`/dashboard/laporan-teknikal/${application.id}?manual_data=true`);
                        }}
                      >
                        Gunakan untuk Laporan Teknikal
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setManualSavedReport(null);
                          setManualDecision("");
                          setExecutiveSummary("");
                          setMajorIssues([""]);
                          setSuggestedConditions([""]);
                        }}
                      >
                        Semak Pelan Lain
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : aiProcessing ? (
            /* Processing Screen */
            <div className="py-12 text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <div>
                <p className="text-lg font-medium">{aiStatus}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Mengambil masa 10–20 saat. Sila tunggu.
                </p>
              </div>
            </div>
          ) : planParameters ? (
            /* Results View */
            <div className="space-y-6 mt-6">
              {aiRecommendation ? (
                <>
                  {/* AI Decision Header */}
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge
                          className={
                            aiRecommendation.keputusan_ai === "Disyorkan Lulus"
                              ? "bg-green-600"
                              : aiRecommendation.keputusan_ai === "Disyorkan Lulus Bersyarat"
                              ? "bg-orange-500"
                              : "bg-destructive"
                          }
                        >
                          {aiRecommendation.keputusan_ai}
                        </Badge>
                        <div className="text-sm">
                          Keyakinan AI: <span className="font-bold">{aiRecommendation.keyakinan_ai}%</span>
                        </div>
                      </div>
                      <p className="text-sm">{aiRecommendation.ringkasan_eksekutif}</p>
                    </CardContent>
                  </Card>

                  {/* Compliance Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Semakan Pematuhan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted">
                              <TableHead className="text-xs">Parameter</TableHead>
                              <TableHead className="text-xs">Cadangan</TableHead>
                              <TableHead className="text-xs">Piawai</TableHead>
                              <TableHead className="text-xs">Rujukan</TableHead>
                              <TableHead className="text-xs w-24">Status</TableHead>
                              <TableHead className="text-xs">Nota</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {aiRecommendation.semakan_pematuhan.map((item: any, idx: number) => (
                              <TableRow
                                key={idx}
                                className={
                                  item.status === "Patuh"
                                    ? "bg-green-50"
                                    : item.status === "Tidak Patuh"
                                    ? "bg-red-50"
                                    : "bg-yellow-50"
                                }
                              >
                                <TableCell className="text-xs font-medium">{item.parameter}</TableCell>
                                <TableCell className="text-xs">{item.nilai_cadangan}</TableCell>
                                <TableCell className="text-xs">{item.nilai_piawai}</TableCell>
                                <TableCell className="text-xs">{item.dokumen_rujukan}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      item.status === "Patuh"
                                        ? "default"
                                        : item.status === "Tidak Patuh"
                                        ? "destructive"
                                        : "secondary"
                                    }
                                    className="text-xs"
                                  >
                                    {item.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs">{item.nota}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <p className="text-sm text-muted-foreground mt-3">
                        {aiRecommendation.semakan_pematuhan.filter((i: any) => i.status === "Patuh").length}{" "}
                        daripada {aiRecommendation.semakan_pematuhan.length} parameter patuh (
                        {Math.round(
                          (aiRecommendation.semakan_pematuhan.filter((i: any) => i.status === "Patuh").length /
                            aiRecommendation.semakan_pematuhan.length) *
                            100
                        )}
                        %)
                      </p>
                    </CardContent>
                  </Card>

                  {/* Policy References */}
                  {aiRecommendation.rujukan_dasar?.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Rujukan Dasar Digunakan</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {aiRecommendation.rujukan_dasar.map((ref: any, idx: number) => (
                          <div key={idx} className="border-l-2 border-primary pl-3 py-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{ref.dokumen}</Badge>
                              <span className="text-sm font-medium">{ref.seksyen}</span>
                            </div>
                            <p className="text-sm">{ref.tajuk}</p>
                            <p className="text-xs text-muted-foreground mt-1">Relevansi: {ref.relevansi}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Issues and Conditions */}
                  {(aiRecommendation.isu_utama?.length > 0 || aiRecommendation.syarat_dicadangkan?.length > 0) && (
                    <div className="grid gap-4">
                      {aiRecommendation.isu_utama?.length > 0 && (
                        <Card className="border-red-200">
                          <CardHeader>
                            <CardTitle className="text-base text-destructive">Isu Utama</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {aiRecommendation.isu_utama.map((isu: string, idx: number) => (
                                <li key={idx} className="text-sm flex gap-2">
                                  <span className="text-destructive">•</span>
                                  <span>{isu}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {aiRecommendation.syarat_dicadangkan?.length > 0 && (
                        <Card className="border-blue-200">
                          <CardHeader>
                            <CardTitle className="text-base text-blue-700">Syarat Dicadangkan</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {aiRecommendation.syarat_dicadangkan.map((syarat: string, idx: number) => (
                                <li key={idx} className="text-sm flex gap-2">
                                  <span className="text-blue-600">•</span>
                                  <span>{syarat}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <Button
                      className="w-full"
                      onClick={() => {
                        router.push(`/dashboard/laporan-teknikal/${application.id}?ai_data=true`);
                      }}
                    >
                      Gunakan untuk Laporan Teknikal
                    </Button>
                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" className="w-full">
                        Simpan sebagai Draf
                      </Button>
                      <Button variant="outline" className="w-full">
                        Eksport PDF
                      </Button>
                    </div>
                  </div>

                  {/* Disclaimer */}
                  <p className="text-xs text-muted-foreground text-center px-4">
                    Semakan AI adalah bantuan teknikal sahaja. Keputusan muktamad adalah tanggungjawab pegawai
                    perancang bertauliah.
                  </p>

                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setPlanParameters(null);
                      setRetrievedChunks([]);
                      setAiRecommendation(null);
                    }}
                  >
                    Semak Pelan Lain
                  </Button>
                </>
              ) : (
                /* Loading state between stages */
                <div className="py-12 text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground mt-4">Menjana cadangan AI...</p>
                </div>
              )}
            </div>
          ) : (
            /* Selection Form */
            <div className="space-y-6 mt-6">
              {/* OSC Data Summary */}
              {(() => {
                const hasOSCData = !!(
                  application?.nisbah_plot ||
                  application?.kawasan_lantai_kasar_m2 ||
                  application?.bil_unit ||
                  application?.bil_tingkat ||
                  application?.ketinggian_bangunan_m ||
                  application?.bil_tempat_letak_kereta
                );

                if (!hasOSCData) return null;

                const oscParams = [
                  { label: "Nisbah Plot", value: application?.nisbah_plot?.toFixed(2) },
                  { label: "KLK", value: application?.kawasan_lantai_kasar_m2 ? `${application?.kawasan_lantai_kasar_m2.toFixed(2)} m²` : null },
                  { label: "Bil Unit", value: application?.bil_unit },
                  { label: "Bil Tingkat", value: application?.bil_tingkat },
                  { label: "Ketinggian", value: application?.ketinggian_bangunan_m ? `${application?.ketinggian_bangunan_m.toFixed(1)} m` : null },
                  { label: "Parkir Kereta", value: application?.bil_tempat_letak_kereta ? `${application?.bil_tempat_letak_kereta} petak` : null },
                ].filter(p => p.value !== null && p.value !== undefined);

                return oscParams.length > 0 && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription>
                      <div className="text-blue-900">
                        <p className="font-semibold mb-2">Data Teknikal dari Import OSC</p>
                        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                          {oscParams.map((param, idx) => (
                            <div key={idx} className="bg-white/50 px-2 py-1 rounded border border-blue-100">
                              <span className="text-blue-700 font-medium">{param.label}:</span>{" "}
                              <span className="text-blue-900 font-semibold">{param.value}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-blue-700">
                          ✓ Parameter ini telah diekstrak daripada OSC 3 Plus dan akan digunakan secara langsung dalam semakan pematuhan. 
                          Pelan cadangan hanya diperlukan untuk parameter yang tidak tersedia dalam OSC.
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                );
              })()}

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Pilih pelan untuk disemak
                </label>
                <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih pelan" />
                  </SelectTrigger>
                  <SelectContent>
                    {documents["Pelan Susun Atur"]?.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        {doc.file_name} {doc.versi ? `(${doc.versi})` : ""}
                      </SelectItem>
                    ))}
                    {documents["Pelan Bangunan"]?.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        {doc.file_name} {doc.versi ? `(${doc.versi})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Jenis Pembangunan
                </label>
                <Select value={jenisPembangunan} onValueChange={setJenisPembangunan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kediaman">Kediaman</SelectItem>
                    <SelectItem value="Komersial">Komersial</SelectItem>
                    <SelectItem value="Perindustrian">Perindustrian</SelectItem>
                    <SelectItem value="Institusi">Institusi</SelectItem>
                    <SelectItem value="Campuran">Campuran</SelectItem>
                    <SelectItem value="KMT">KMT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-3 block">
                  Dokumen Dasar untuk Disemak
                </label>
                <div className="space-y-2">
                  {[
                    { code: "GPJ", name: "Manual GPJ" },
                    { code: "RFN", name: "Rancangan Fizikal Negara (RFN)" },
                    { code: "RSN", name: "Rancangan Struktur Negeri Johor 2035 (RSN)" },
                    { code: "RTD", name: "Rancangan Tempatan Daerah Segamat 2030 (RTD)" },
                    { code: "RKK", name: "Rancangan Kawasan Khas Segamat 2035 (RKK)" },
                  ].map((doc) => (
                    <div key={doc.code} className="flex items-center space-x-2">
                      <Checkbox
                        id={`ai-doc-${doc.code}`}
                        checked={selectedDocs.includes(doc.code)}
                        onCheckedChange={() => toggleDocSelection(doc.code)}
                      />
                      <label
                        htmlFor={`ai-doc-${doc.code}`}
                        className="text-sm cursor-pointer"
                      >
                        {doc.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleStartAiReview}
                disabled={!jenisPembangunan}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Mulakan Semakan AI
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Payment Recording Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rekod Pembayaran Caj Pemajuan</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {cajData && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 text-sm">
                  Jumlah Caj: <strong>RM{cajData.jumlah_caj?.toFixed(2) || "0.00"}</strong>
                </AlertDescription>
              </Alert>
            )}

            <div>
              <Label>
                Tarikh Bayaran <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={paymentFormData.tarikh_bayar}
                onChange={(e) =>
                  setPaymentFormData({ ...paymentFormData, tarikh_bayar: e.target.value })
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label>
                No. Resit <span className="text-destructive">*</span>
              </Label>
              <Input
                value={paymentFormData.no_resit}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, no_resit: e.target.value })}
                placeholder="Contoh: RST/2026/12345"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Catatan</Label>
              <Textarea
                value={paymentFormData.catatan}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, catatan: e.target.value })}
                placeholder="Catatan tambahan (pilihan)"
                rows={3}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
              Batal
            </Button>
            <Button
              onClick={handleRecordPayment}
              disabled={savingPayment || !paymentFormData.tarikh_bayar || !paymentFormData.no_resit}
              className="bg-green-600 hover:bg-green-700"
            >
              {savingPayment ? "Menyimpan..." : "Rekod Pembayaran"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import from OSC Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Ulasan Agensi dari OSC</DialogTitle>
            <DialogDescription>
              Tampal teks ulasan agensi dari dokumen Kertas Perakuan OSC. AI akan mengekstrak ulasan setiap agensi secara automatik.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={12}
              placeholder="Tampal teks ulasan agensi di sini...

Contoh:
1. JBK - Tiada halangan dari aspek bangunan. Tarikh: 15/05/2026
2. TNB - Tiada halangan dengan syarat. Bayaran utiliti perlu dijelaskan. Tarikh: 18/05/2026
..."
              className="font-mono text-sm"
            />
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                AI akan cuba mengenal pasti kod agensi, tarikh ulasan, ringkasan, dan keputusan dari teks yang ditampal.
                Anda boleh mengedit setiap ulasan secara manual selepas import.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportModal(false)}>
              Batal
            </Button>
            <Button
              onClick={handleImportFromOSC}
              disabled={!importText.trim() || importProcessing}
            >
              {importProcessing ? "Memproses..." : "Import Ulasan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Preview Modal */}
      {previewDocument && (
        <FilePreviewModal
          isOpen={showPreviewModal}
          onClose={() => {
            setShowPreviewModal(false);
            setPreviewDocument(null);
          }}
          fileUrl={previewDocument.file_path}
          fileName={previewDocument.file_name}
          fileType={
            previewDocument.file_path.toLowerCase().endsWith(".pdf")
              ? "pdf"
              : "image"
          }
        />
      )}
    </Layout>
  );
}