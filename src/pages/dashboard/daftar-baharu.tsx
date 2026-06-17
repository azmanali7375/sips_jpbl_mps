import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  registerNewApplication,
  getOfficers,
  RegistrationFormData,
  registrationService,
} from "@/services/registrationService";
import { DisplayFileNumber } from "@/components/DisplayFileNumber";
import { validateOSCData, getValidationSummary } from "@/services/zoningValidationService";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Calendar, User, MapPin, Building2, AlertCircle, Upload, FileIcon, ImageIcon, X, XCircle, CheckCircle, Trash2 } from "lucide-react";

export default function DaftarBaharu() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [uploadedDocuments, setUploadedDocuments] = useState<Array<{
    jenis_dokumen: string;
    nama_dokumen: string;
    file: File | null;
    uploading: boolean;
    uploaded: boolean;
    error: string | null;
    fileSize: string;
    storagePath: string | null;
  }>>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadTimeouts, setUploadTimeouts] = useState<Map<number, NodeJS.Timeout>>(new Map());
  const [officers, setOfficers] = useState<{ id: string; full_name: string }[]>([]);
  const [userId, setUserId] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [calculatedKPIDate, setCalculatedKPIDate] = useState<string>("");

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [fileType, setFileType] = useState<"pdf" | "image" | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // AI processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedCount, setExtractedCount] = useState(0);
  const [missingCount, setMissingCount] = useState(0);
  const [landLots, setLandLots] = useState<any[]>([]);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Import success state
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  const [importedLotsCount, setImportedLotsCount] = useState(0);
  const [expandedTajuk, setExpandedTajuk] = useState(false);

  // Auto-fill tracking state
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const [missingFields, setMissingFields] = useState<Set<string>>(new Set());
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [showPoorQualityWarning, setShowPoorQualityWarning] = useState(false);

  const [formData, setFormData] = useState({
    jenis_aplikasi: "KM" as "KM" | "PB",
    division: 1,
    applicant_id: "", // Required - maps to nama_pemaju_pemilik
    project_name: "", // Required - maps to tajuk_permohonan
    location: "", // Required - full address/location description
    no_fail_osc: "",
    no_permohonan_osc: "",
    kategori_permohonan: "",
    skala_pembangunan: "Kecil" as "Kecil" | "Sederhana" | "Besar A" | "Besar B",
    jenis_proses_pr: "Tidak" as "Ya" | "Tidak",
    status_semakan_osc: "",
    tarikh_penghantaran: "",
    tarikh_lengkap_diterima_osc: "",
    tarikh_terima: new Date().toISOString().split("T")[0],
    nama_sp: "",
    no_kp_sp: "",
    nama_pemaju_pemilik: "",
    tajuk_permohonan: "",
    alamat_tapak: "",
    no_lot: "",
    lokasi_mercu_tanda: "",
    mukim: "",
    daerah: "Segamat",
    negeri: "Johor",
    rancangan_tempatan: "Tidak" as "Ya" | "Tidak",
    zoning: "",
    longitud: undefined as number | undefined,
    latitud: undefined as number | undefined,
    pegawai_bertanggungjawab: "",
    status_dalaman: "Diterima",
    catatan_dalaman: "",
  });

  useEffect(() => {
    async function loadData() {
      try {
        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        
        if (!user) {
          router.push("/auth/login");
          return;
        }

        setUserId(user.id);

        // Load officers
        const officersList = await getOfficers();
        setOfficers(officersList);
      } catch (error) {
        console.error("Error loading data:", error);
        router.push("/auth/login");
      } finally {
        setInitialLoading(false);
      }
    }

    loadData();
  }, [router]);

  // Auto-calculate KPI date when tarikh_lengkap_diterima_osc changes
  useEffect(() => {
    if (formData.tarikh_lengkap_diterima_osc) {
      const date = new Date(formData.tarikh_lengkap_diterima_osc);
      date.setDate(date.getDate() + 57);
      const kpiDate = date.toLocaleDateString("ms-MY", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      setCalculatedKPIDate(kpiDate);
    } else {
      setCalculatedKPIDate("");
    }
  }, [formData.tarikh_lengkap_diterima_osc]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(0, file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(0, files[0]);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setFileType(null);
  };

  const handleAnalyzeDocument = async () => {
    if (!uploadedFile) return;

    setAiProcessing(true);
    setAiError(null);

    try {
      const { parseOSCDocument } = await import("@/services/oscDocumentParserService");
      const result = await parseOSCDocument(uploadedFile);

      if (!result.success) {
        setAiError(result.error || "Gagal menganalisa dokumen");
        setAiProcessing(false);
        return;
      }

      // Store extracted data and proceed to review
      setExtractedData(result.data);
      setAiProcessing(false);
      
      // Auto-populate form with extracted data
      if (result.data?.maklumat_am) {
        const am = result.data.maklumat_am;
        setFormData((prev) => ({
          ...prev,
          no_permohonan_osc: am.no_permohonan_osc || prev.no_permohonan_osc,
          skala_pembangunan: (am.skala_pembangunan as "Kecil" | "Sederhana" | "Besar A" | "Besar B") || prev.skala_pembangunan,
          tarikh_penghantaran: am.tarikh_penghantaran || prev.tarikh_penghantaran,
          tarikh_lengkap_diterima_osc: am.tarikh_lengkap_diterima_osc || prev.tarikh_lengkap_diterima_osc,
          nama_sp: am.nama_sp || prev.nama_sp,
          nama_pemaju_pemilik: am.nama_pemaju_pemilik || prev.nama_pemaju_pemilik,
          tajuk_permohonan: am.tajuk_permohonan || prev.tajuk_permohonan,
          mukim: am.mukim || prev.mukim,
        }));
      }

      // Store land lots data
      if (result.data?.maklumat_tanah && result.data.maklumat_tanah.length > 0) {
        setLandLots(result.data.maklumat_tanah);
      }

      toast({
        title: "✓ Analisa Selesai",
        description: `Jenis: ${result.jenis_aplikasi || "KM"} (KPI: ${result.kpi_hari} hari). Data telah diisi secara automatik.`,
      });

      setShowUploadModal(false);
    } catch (error) {
      console.error("Error analyzing document:", error);
      setAiError("Ralat tidak dijangka semasa menganalisa dokumen");
      setAiProcessing(false);
    }
  };

  const handleUseExtractedData = () => {
    if (!extractedData) return;

    const filled = new Set<string>();
    const missing = new Set<string>();

    // Count extracted vs missing fields
    let extractedFieldsCount = 0;
    let missingFieldsCount = 0;

    // Helper to track field
    const trackField = (value: any, fieldName: string) => {
      if (value !== null && value !== undefined) {
        filled.add(fieldName);
        extractedFieldsCount++;
      } else {
        missing.add(fieldName);
        missingFieldsCount++;
      }
    };

    // Track Maklumat Am fields
    const am = extractedData.maklumat_am || {};
    trackField(am.no_permohonan_osc, "no_permohonan_osc");
    trackField(am.kategori_permohonan, "kategori_permohonan");
    trackField(am.skala_pembangunan, "skala_pembangunan");
    trackField(am.nama_sp, "nama_sp");
    trackField(am.no_kp_sp, "no_kp_sp");
    trackField(am.jenis_proses_pr, "jenis_proses_pr");
    trackField(am.tarikh_penghantaran, "tarikh_penghantaran");
    trackField(am.tarikh_lengkap_diterima_osc, "tarikh_lengkap_diterima_osc");
    trackField(am.nama_pemaju_pemilik, "nama_pemaju_pemilik");
    trackField(am.tajuk_permohonan, "tajuk_permohonan");
    trackField(am.lokasi_mercu_tanda, "lokasi_mercu_tanda");
    trackField(am.mukim, "mukim");
    trackField(am.zoning, "zoning");

    setAutoFilledFields(filled);
    setMissingFields(missing);
    setExtractedCount(extractedFieldsCount);
    setMissingCount(missingFieldsCount);

    // Fill form fields from extracted data
    setFormData((prev) => ({
      ...prev,
      no_permohonan_osc: am.no_permohonan_osc || prev.no_permohonan_osc,
      kategori_permohonan: am.kategori_permohonan || prev.kategori_permohonan,
      skala_pembangunan: (am.skala_pembangunan as any) || prev.skala_pembangunan,
      nama_sp: am.nama_sp || prev.nama_sp,
      no_kp_sp: am.no_kp_sp || prev.no_kp_sp,
      jenis_proses_pr: (am.jenis_proses_pr as any) || prev.jenis_proses_pr,
      tarikh_penghantaran: am.tarikh_penghantaran || prev.tarikh_penghantaran,
      tarikh_lengkap_diterima_osc: am.tarikh_lengkap_diterima_osc || prev.tarikh_lengkap_diterima_osc,
      nama_pemaju_pemilik: am.nama_pemaju_pemilik || prev.nama_pemaju_pemilik,
      tajuk_permohonan: am.tajuk_permohonan || prev.tajuk_permohonan,
      lokasi_mercu_tanda: am.lokasi_mercu_tanda || prev.lokasi_mercu_tanda,
      mukim: am.mukim || prev.mukim,
      daerah: am.daerah || prev.daerah,
      negeri: am.negeri || prev.negeri,
      rancangan_tempatan: (am.rancangan_tempatan as any) || prev.rancangan_tempatan,
      zoning: am.zoning || prev.zoning,
      longitud: am.longitud !== null ? am.longitud : prev.longitud,
      latitud: am.latitud !== null ? am.latitud : prev.latitud,
    }));

    // Store land lots for later insertion
    if (landLots.length > 0) {
      setImportedLotsCount(landLots.length);
    }

    // Show success banner
    setShowImportSuccess(true);

    // Close modal
    setShowImportModal(false);

    // Reset modal state
    setTimeout(() => {
      setExtractedData(null);
      setUploadedFile(null);
      setFileType(null);
      setShowPoorQualityWarning(false);
    }, 500);

    toast({
      title: "Import Berjaya",
      description: `${extractedFieldsCount} medan telah diisi secara automatik. ${landLots.length > 0 ? `${landLots.length} lot tanah akan disimpan.` : ""}`,
    });
  };

  const handleInputChange = (
    field: keyof RegistrationFormData,
    value: string | number | undefined
  ) => {
    // Remove field from auto-filled set when user edits it
    if (autoFilledFields.has(field)) {
      setAutoFilledFields((prev) => {
        const newSet = new Set(prev);
        newSet.delete(field);
        return newSet;
      });
    }

    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const getFieldClassName = (fieldName: string, baseClassName: string = "") => {
    const classes = [baseClassName];
    
    if (autoFilledFields.has(fieldName)) {
      classes.push("bg-blue-50 transition-colors duration-500");
    }
    
    if (missingFields.has(fieldName)) {
      classes.push("border-orange-300");
    }
    
    return classes.filter(Boolean).join(" ");
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.jenis_aplikasi) {
      toast({
        title: "Ralat",
        description: "Sila pilih jenis permohonan (KM atau PB)",
        variant: "destructive",
      });
      return;
    }

    if (!formData.applicant_id || !formData.project_name || !formData.location) {
      toast({
        title: "Ralat",
        description: "Sila lengkapkan semua medan yang diperlukan",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Pengguna tidak dijumpai");

      // Generate file numbers
      const { no_fail_jpl, no_permohonan_osc } = await registrationService.registerApplication(
        formData,
        formData.jenis_aplikasi,
        formData.division
      );

      // Create application
const { data: application, error: appError } = await supabase
  .from("permohonan" as any)
  .insert({
    jenis_aplikasi: formData.jenis_aplikasi,
    no_fail_jpl,
    no_permohonan_osc,
    nama_projek: formData.project_name,
    lokasi: formData.location,
    pemohon: formData.applicant_id,
    tajuk_permohonan: formData.tajuk_permohonan || formData.project_name,
    nama_pemaju_pemilik: formData.nama_pemaju_pemilik || formData.applicant_id,
    nama_sp: formData.nama_sp,
    no_kp_sp: formData.no_kp_sp,
    mukim: formData.mukim,
    daerah: formData.daerah,
    negeri: formData.negeri,
    tarikh_penghantaran: formData.tarikh_penghantaran,
    tarikh_lengkap_diterima_osc: formData.tarikh_lengkap_diterima_osc || formData.tarikh_terima,
    status: "Daftar",
    status_dalaman: formData.status_dalaman || "Diterima",
    catatan_dalaman: formData.catatan_dalaman,
    bahagian: formData.division,
    kategori_permohonan: formData.kategori_permohonan,
    skala_pembangunan: formData.skala_pembangunan,
    jenis_proses_pr: formData.jenis_proses_pr,
    status_semakan_osc: formData.status_semakan_osc,
    zoning: formData.zoning,
    rancangan_tempatan: formData.rancangan_tempatan,
    latitud: formData.latitud,
    longitud: formData.longitud,
    lokasi_mercu_tanda: formData.lokasi_mercu_tanda,
    kpi_hari: formData.jenis_aplikasi === "PB" ? 14 : 53,
  })
  .select()
  .single() as any;

      if (appError) throw appError;

      // Save document records to database if any were uploaded
      if (uploadedDocuments.some(doc => doc.uploaded && doc.storagePath) && application?.id) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          for (const doc of uploadedDocuments.filter(d => d.uploaded && d.storagePath)) {
            await supabase.from("documents").insert({
              permohonan_id: application.id,
              nama_dokumen: doc.nama_dokumen,
              file_url: doc.storagePath,
              jenis_dokumen: doc.jenis_dokumen,
              versi: "v1",
              dimuat_naik_oleh: user.id,
            });
          }
        }
      }

      toast({
        title: "Berjaya Didaftarkan",
        description: (
          <div>
            <p className="font-semibold">Permohonan berjaya didaftarkan:</p>
            <DisplayFileNumber 
              no_fail_jpl={no_fail_jpl} 
              no_permohonan_osc={no_permohonan_osc}
              className="mt-2"
            />
          </div>
        ),
      });

      // Reset form
      setFormData({
        jenis_aplikasi: "KM",
        division: 1,
        applicant_id: "",
        project_name: "",
        location: "",
        no_fail_osc: "",
        no_permohonan_osc: "",
        kategori_permohonan: "",
        skala_pembangunan: "Kecil",
        jenis_proses_pr: "Tidak",
        status_semakan_osc: "",
        tarikh_penghantaran: "",
        tarikh_lengkap_diterima_osc: "",
        tarikh_terima: new Date().toISOString().split("T")[0],
        nama_sp: "",
        no_kp_sp: "",
        nama_pemaju_pemilik: "",
        tajuk_permohonan: "",
        alamat_tapak: "",
        no_lot: "",
        lokasi_mercu_tanda: "",
        mukim: "",
        daerah: "Segamat",
        negeri: "Johor",
        rancangan_tempatan: "Tidak",
        zoning: "",
        longitud: undefined,
        latitud: undefined,
        pegawai_bertanggungjawab: "",
        status_dalaman: "Diterima",
        catatan_dalaman: "",
      });
      setUploadedDocuments([]);

      // Navigate to the application detail page
      if (application?.id) {
        router.push(`/dashboard/permohonan/${application.id}`);
      }
    } catch (err: any) {
      console.error("Error:", err);
      setError(err.message || "Gagal mendaftarkan permohonan");
      toast({
        title: "Ralat",
        description: err.message || "Gagal mendaftarkan permohonan",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleAddDocument() {
    setUploadedDocuments([
      ...uploadedDocuments,
      {
        jenis_dokumen: "Pelan Susun Atur",
        nama_dokumen: "",
        file: null,
        uploading: false,
        uploaded: false,
        error: null,
        fileSize: "",
        storagePath: null,
      },
    ]);
  }

  function handleRemoveDocument(index: number) {
    // Clear any pending timeout for this document
    const timeout = uploadTimeouts.get(index);
    if (timeout) {
      clearTimeout(timeout);
      uploadTimeouts.delete(index);
    }
    
    setUploadedDocuments(uploadedDocuments.filter((_, i) => i !== index));
  }

  function handleDocumentChange(index: number, field: string, value: string) {
    const updated = [...uploadedDocuments];
    updated[index] = { ...updated[index], [field]: value };
    setUploadedDocuments(updated);
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const mb = bytes / (1024 * 1024);
    const kb = bytes / 1024;
    
    if (mb >= 1) {
      return `${mb.toFixed(2)} MB`;
    } else if (kb >= 1) {
      return `${kb.toFixed(2)} KB`;
    } else {
      return `${bytes} B`;
    }
  }

  async function handleFileSelect(index: number, file: File | null) {
    if (!file) return;

    const updated = [...uploadedDocuments];
    
    // Check file size
    if (file.size === 0) {
      updated[index] = {
        ...updated[index],
        file: null,
        error: "Fail tidak dapat dibaca. Sila cuba semula.",
        fileSize: "",
      };
      setUploadedDocuments(updated);
      return;
    }

    // Check file size limit (20MB)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      updated[index] = {
        ...updated[index],
        file: null,
        error: "Saiz fail melebihi had 20MB. Sila pilih fail yang lebih kecil.",
        fileSize: "",
      };
      setUploadedDocuments(updated);
      return;
    }

    // Set file info
    updated[index] = {
      ...updated[index],
      file,
      fileSize: formatFileSize(file.size),
      nama_dokumen: updated[index].nama_dokumen || file.name,
      error: null,
    };
    setUploadedDocuments(updated);
  }

  async function handleUploadFile(index: number) {
    const doc = uploadedDocuments[index];
    if (!doc.file) return;

    const updated = [...uploadedDocuments];
    updated[index] = { ...updated[index], uploading: true, error: null };
    setUploadedDocuments(updated);

    // Set timeout safety net (30 seconds)
    const timeoutId = setTimeout(() => {
      const current = [...uploadedDocuments];
      current[index] = {
        ...current[index],
        uploading: false,
        error: "Muat naik mengambil masa terlalu lama. Sila cuba semula.",
      };
      setUploadedDocuments(current);
    }, 30000);

    uploadTimeouts.set(index, timeoutId);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Pengguna tidak dijumpai");

      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedFileName = doc.file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `${user.id}/${timestamp}_${sanitizedFileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("sips-documents")
        .upload(filePath, doc.file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("sips-documents")
        .getPublicUrl(filePath);

      // Clear timeout
      clearTimeout(timeoutId);
      uploadTimeouts.delete(index);

      // Update state with success
      const success = [...uploadedDocuments];
      success[index] = {
        ...success[index],
        uploading: false,
        uploaded: true,
        storagePath: urlData.publicUrl,
        error: null,
      };
      setUploadedDocuments(success);

      toast({
        title: "Berjaya",
        description: `${doc.file.name} telah dimuat naik`,
      });
    } catch (error: any) {
      // Clear timeout
      clearTimeout(timeoutId);
      uploadTimeouts.delete(index);

      // Update state with error
      const failed = [...uploadedDocuments];
      failed[index] = {
        ...failed[index],
        uploading: false,
        error: error.message || "Muat naik gagal. Sila cuba semula.",
      };
      setUploadedDocuments(failed);

      toast({
        title: "Ralat",
        description: error.message || "Gagal memuat naik fail",
        variant: "destructive",
      });
    }
  }

  function handleRetryUpload(index: number) {
    const updated = [...uploadedDocuments];
    updated[index] = {
      ...updated[index],
      error: null,
      uploading: false,
      uploaded: false,
    };
    setUploadedDocuments(updated);
  }

  function handleClearFile(index: number) {
    const updated = [...uploadedDocuments];
    updated[index] = {
      ...updated[index],
      file: null,
      uploaded: false,
      uploading: false,
      error: null,
      fileSize: "",
      storagePath: null,
    };
    setUploadedDocuments(updated);
  }

  if (initialLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Memuatkan...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary">
              Daftar Permohonan Baharu
            </h1>
            <p className="text-muted-foreground mt-1">
              Sistem Pintar Kawalan Pembangunan (SIPS) — Majlis Perbandaran Segamat
            </p>
          </div>
        </div>

        {/* Import dari OSC Banner */}
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-blue-900 font-medium">
                Muat naik cetakan OSC 3.0 Plus untuk mengisi borang secara automatik
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Menerima PDF atau gambar PNG/JPG. Maks 10MB.
              </p>
            </div>
            <Button
              variant="default"
              size="default"
              onClick={() => setShowImportModal(true)}
              className="ml-4 bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import dari OSC
            </Button>
          </AlertDescription>
        </Alert>

        {/* Import Success Banner */}
        {showImportSuccess && (
          <Alert className="bg-green-50 border-green-200">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              <p className="font-semibold">
                ✓ {extractedCount} medan diisi secara automatik daripada dokumen OSC
              </p>
              <p className="text-sm mt-1">
                Semak dan lengkapkan medan yang tidak ditemui sebelum menyimpan.
                {importedLotsCount > 0 && (
                  <> {importedLotsCount} rekod lot akan disimpan apabila borang ini disimpan.</>
                )}
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* PB Application Detection Banner */}
        {formData.no_permohonan_osc && formData.no_permohonan_osc.startsWith("MPSEG-PB") && (
          <Alert className="bg-green-50 border-green-200">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <p className="font-semibold text-green-900">Permohonan Pelan Bangunan (PB) dikesan</p>
              <p className="text-sm text-green-700 mt-1">
                KPI: <strong>14 hari bekerja</strong> (Jabatan Bangunan - JBK)
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Info Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Salin maklumat daripada OSC 3.0 Plus Online. Pastikan semua medan yang
            bertanda * diisi dengan betul. Selepas pendaftaran, anda akan diarahkan ke
            halaman permohonan untuk menambah maklumat tanah (lot details).
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: RUJUKAN OSC */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                SECTION 1: RUJUKAN OSC
                {autoFilledFields.size > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Diisi oleh AI
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <Label htmlFor="no_permohonan_osc">
                  No. Permohonan OSC <span className="text-destructive">*</span>
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        id="no_permohonan_osc"
                        placeholder="Contoh: MPSEG-KM20260427-001"
                        value={formData.no_permohonan_osc}
                        onChange={(e) =>
                          handleInputChange("no_permohonan_osc", e.target.value)
                        }
                        className={getFieldClassName("no_permohonan_osc")}
                        required
                      />
                    </TooltipTrigger>
                    {missingFields.has("no_permohonan_osc") && (
                      <TooltipContent>
                        <p className="text-xs">Medan ini tidak ditemui dalam dokumen OSC. Sila isi secara manual.</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
                <p className="text-sm text-muted-foreground mt-1">
                  Salin daripada medan &apos;No. Permohonan&apos; dalam OSC 3.0 Plus
                </p>
              </div>

              <div>
                <Label htmlFor="kategori_permohonan">Kategori Permohonan</Label>
                <Input
                  id="kategori_permohonan"
                  placeholder="Contoh: Permohonan Kebenaran Merancang (Permohonan Baru)"
                  value={formData.kategori_permohonan}
                  onChange={(e) =>
                    handleInputChange("kategori_permohonan", e.target.value)
                  }
                  className={getFieldClassName("kategori_permohonan")}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="skala_pembangunan">Skala Pembangunan</Label>
                  <Select
                    value={formData.skala_pembangunan}
                    onValueChange={(value) =>
                      handleInputChange("skala_pembangunan", value as any)
                    }
                  >
                    <SelectTrigger className={getFieldClassName("skala_pembangunan")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kecil">Kecil</SelectItem>
                      <SelectItem value="Sederhana">Sederhana</SelectItem>
                      <SelectItem value="Besar A">Besar A</SelectItem>
                      <SelectItem value="Besar B">Besar B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="jenis_proses_pr">Jenis Proses PR</Label>
                  <Select
                    value={formData.jenis_proses_pr}
                    onValueChange={(value) =>
                      handleInputChange("jenis_proses_pr", value as any)
                    }
                  >
                    <SelectTrigger className={getFieldClassName("jenis_proses_pr")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ya">Ya</SelectItem>
                      <SelectItem value="Tidak">Tidak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="status_semakan_osc">
                  Status Semakan (OSC) — untuk rujukan sahaja
                </Label>
                <Input
                  id="status_semakan_osc"
                  placeholder="Contoh: Lulus (P2)"
                  value={formData.status_semakan_osc}
                  onChange={(e) =>
                    handleInputChange("status_semakan_osc", e.target.value)
                  }
                  className={getFieldClassName("status_semakan_osc")}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Status ini tidak diubah suai oleh SIPS
                </p>
              </div>

              {/* Division (for file number generation) */}
              <div>
                <Label htmlFor="division">
                  Bahagian / Division <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="division"
                  type="number"
                  min="1"
                  value={formData.division}
                  onChange={(e) =>
                    setFormData({ ...formData, division: parseInt(e.target.value) || 1 })
                  }
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Untuk penjanaan no. fail: MPS/JPL:{formData.jenis_aplikasi === "KM" ? "600-3" : ".600-13"}/{formData.division}/[n]
                </p>
              </div>

              {/* Applicant ID / Name */}
              <div>
                <Label htmlFor="applicant_id">
                  Nama Pemohon / Pemaju <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="applicant_id"
                  value={formData.applicant_id}
                  onChange={(e) =>
                    setFormData({ ...formData, applicant_id: e.target.value })
                  }
                  placeholder="Nama penuh pemohon atau pemaju"
                  required
                />
              </div>

              {/* Project Name */}
              <div>
                <Label htmlFor="project_name">
                  Tajuk Permohonan / Projek <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="project_name"
                  value={formData.project_name}
                  onChange={(e) =>
                    setFormData({ ...formData, project_name: e.target.value })
                  }
                  placeholder="Contoh: Permohonan kebenaran merancang untuk membina bangunan kedai 2 tingkat"
                  rows={2}
                  required
                />
              </div>

              {/* Location */}
              <div>
                <Label htmlFor="location">
                  Lokasi Tapak <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="Alamat lengkap tapak permohonan"
                  rows={2}
                  required
                />
              </div>

              {/* Document Upload Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Dokumen Sokongan</Label>
                    <p className="text-xs text-muted-foreground">
                      Muat naik dokumen pendaftaran (opsional, maks 20MB setiap fail)
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddDocument}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Tambah Dokumen
                  </Button>
                </div>

                {uploadedDocuments.length > 0 && (
                  <div className="space-y-3 border rounded-lg p-4">
                    {uploadedDocuments.map((doc, index) => (
                      <div key={index} className="space-y-2 pb-3 border-b last:border-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Dokumen {index + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveDocument(index)}
                            disabled={doc.uploading}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="grid gap-3">
                          <div>
                            <Label className="text-xs">Jenis Dokumen</Label>
                            <Select
                              value={doc.jenis_dokumen}
                              onValueChange={(value) =>
                                handleDocumentChange(index, "jenis_dokumen", value)
                              }
                              disabled={doc.uploading || doc.uploaded}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Pelan Susun Atur">Pelan Susun Atur</SelectItem>
                                <SelectItem value="Pelan Bangunan">Pelan Bangunan</SelectItem>
                                <SelectItem value="Pelan CAD">Pelan CAD</SelectItem>
                                <SelectItem value="Kebenaran Tanah">Kebenaran Tanah</SelectItem>
                                <SelectItem value="Laporan Teknikal">Laporan Teknikal</SelectItem>
                                <SelectItem value="Surat Pemohon">Surat Pemohon</SelectItem>
                                <SelectItem value="Dokumen OSC">Dokumen OSC</SelectItem>
                                <SelectItem value="Lain-lain">Lain-lain</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs">Nama Dokumen</Label>
                            <Input
                              value={doc.nama_dokumen}
                              onChange={(e) =>
                                handleDocumentChange(index, "nama_dokumen", e.target.value)
                              }
                              placeholder="Contoh: Pelan Susun Atur - Lot 123"
                              disabled={doc.uploading || doc.uploaded}
                            />
                          </div>

                          <div>
                            <Label className="text-xs">Pilih Fail</Label>
                            <Input
                              type="file"
                              accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png,.webp"
                              onChange={(e) => handleFileSelect(index, e.target.files?.[0] || null)}
                              disabled={doc.uploading || doc.uploaded}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Format: PDF, DWG, DXF, JPG, PNG, WebP (Maks 20MB)
                            </p>
                          </div>

                          {/* File info and upload status */}
                          {doc.file && !doc.uploaded && !doc.error && (
                            <div className="flex items-center justify-between p-2 bg-muted rounded">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                <div>
                                  <p className="text-sm font-medium">{doc.file.name}</p>
                                  <p className="text-xs text-muted-foreground">{doc.fileSize}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {!doc.uploading && (
                                  <>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => handleUploadFile(index)}
                                    >
                                      Muat Naik
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleClearFile(index)}
                                    >
                                      Batal
                                    </Button>
                                  </>
                                )}
                                {doc.uploading && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                                    <span>Memuat naik...</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Upload success */}
                          {doc.uploaded && doc.file && (
                            <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <div>
                                  <p className="text-sm font-medium text-green-900">{doc.file.name}</p>
                                  <p className="text-xs text-green-700">{doc.fileSize} • Berjaya dimuat naik</p>
                                </div>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleClearFile(index)}
                              >
                                Buang
                              </Button>
                            </div>
                          )}

                          {/* Upload error */}
                          {doc.error && (
                            <Alert variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                {doc.error}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="ml-2"
                                  onClick={() => handleRetryUpload(index)}
                                >
                                  Cuba Semula
                                </Button>
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* SECTION 2: TARIKH PENTING */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                SECTION 2: TARIKH PENTING
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tarikh_penghantaran">
                    Tarikh Penghantaran <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="tarikh_penghantaran"
                    type="date"
                    value={formData.tarikh_penghantaran}
                    onChange={(e) =>
                      handleInputChange("tarikh_penghantaran", e.target.value)
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="tarikh_lengkap_diterima_osc">
                    ⭐ Tarikh Lengkap Diterima OSC (Tarikh Mula KPI){" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="tarikh_lengkap_diterima_osc"
                    type="date"
                    value={formData.tarikh_lengkap_diterima_osc}
                    onChange={(e) =>
                      handleInputChange("tarikh_lengkap_diterima_osc", e.target.value)
                    }
                    required
                  />
                </div>
              </div>

              {calculatedKPIDate && (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-900">
                    <strong>Tarikh Akhir KPI (57 Hari):</strong> {calculatedKPIDate}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* SECTION 3: MAKLUMAT PEMOHON */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                SECTION 3: MAKLUMAT PEMOHON
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <Label htmlFor="nama_sp">
                  Nama Pemohon (SP) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nama_sp"
                  placeholder="Nama penuh pemohon"
                  value={formData.nama_sp}
                  onChange={(e) => handleInputChange("nama_sp", e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="no_kp_sp">No. K/P Pemohon</Label>
                <Input
                  id="no_kp_sp"
                  placeholder="Contoh: 123456-78-9012"
                  value={formData.no_kp_sp}
                  onChange={(e) => handleInputChange("no_kp_sp", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="nama_pemaju_pemilik">Nama Pemaju/Pemilik</Label>
                <Input
                  id="nama_pemaju_pemilik"
                  placeholder="Nama pemaju atau pemilik tanah"
                  value={formData.nama_pemaju_pemilik}
                  onChange={(e) =>
                    handleInputChange("nama_pemaju_pemilik", e.target.value)
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* SECTION 4: MAKLUMAT PEMBANGUNAN */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                SECTION 4: MAKLUMAT PEMBANGUNAN
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <Label htmlFor="tajuk_permohonan">
                  Tajuk Permohonan <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="tajuk_permohonan"
                  placeholder="Salin tajuk pembangunan lengkap daripada OSC"
                  value={formData.tajuk_permohonan}
                  onChange={(e) =>
                    handleInputChange("tajuk_permohonan", e.target.value)
                  }
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label htmlFor="lokasi_mercu_tanda">
                  Lokasi/Mercu Tanda Berhampiran
                </Label>
                <Input
                  id="lokasi_mercu_tanda"
                  placeholder="Contoh: Berdekatan Taman Tasik Segamat"
                  value={formData.lokasi_mercu_tanda}
                  onChange={(e) =>
                    handleInputChange("lokasi_mercu_tanda", e.target.value)
                  }
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="mukim">Mukim</Label>
                  <Input
                    id="mukim"
                    placeholder="Contoh: Sungai Segamat"
                    value={formData.mukim}
                    onChange={(e) => handleInputChange("mukim", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="daerah">Daerah</Label>
                  <Input
                    id="daerah"
                    value={formData.daerah}
                    onChange={(e) => handleInputChange("daerah", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="negeri">Negeri</Label>
                  <Input
                    id="negeri"
                    value={formData.negeri}
                    onChange={(e) => handleInputChange("negeri", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rancangan_tempatan">Rancangan Tempatan</Label>
                  <Select
                    value={formData.rancangan_tempatan}
                    onValueChange={(value) =>
                      handleInputChange("rancangan_tempatan", value as any)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ya">Ya</SelectItem>
                      <SelectItem value="Tidak">Tidak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="zoning">Zoning</Label>
                  <Input
                    id="zoning"
                    placeholder="Contoh: Komersial, Kediaman, Industri"
                    value={formData.zoning}
                    onChange={(e) => handleInputChange("zoning", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="latitud">Latitud (Latitude)</Label>
                  <Input
                    id="latitud"
                    type="number"
                    step="0.00000001"
                    placeholder="Contoh: 2.50342100"
                    value={formData.latitud || ""}
                    onChange={(e) =>
                      handleInputChange(
                        "latitud",
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="longitud">Longitud (Longitude)</Label>
                  <Input
                    id="longitud"
                    type="number"
                    step="0.00000001"
                    placeholder="Contoh: 102.82495200"
                    value={formData.longitud || ""}
                    onChange={(e) =>
                      handleInputChange(
                        "longitud",
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Jabatan Memperaku</Label>
                <Input
                  value={
                    formData.no_permohonan_osc?.startsWith("MPSEG-PB")
                      ? "Jabatan Bangunan (JBK)"
                      : "Jabatan Perancang Bandar & Landskap (JPL)"
                  }
                  disabled
                  className="bg-muted"
                />
              </div>
            </CardContent>
          </Card>

          {/* SECTION 5: PENUGASAN DALAMAN (SIPS) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                SECTION 5: PENUGASAN DALAMAN (SIPS)
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <Label htmlFor="pegawai_bertanggungjawab">
                  Pegawai Bertanggungjawab
                </Label>
                <Select
                  value={formData.pegawai_bertanggungjawab}
                  onValueChange={(value) =>
                    handleInputChange("pegawai_bertanggungjawab", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih pegawai..." />
                  </SelectTrigger>
                  <SelectContent>
                    {officers.map((officer) => (
                      <SelectItem key={officer.id} value={officer.id}>
                        {officer.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status_dalaman">Status Dalaman (SIPS)</Label>
                <Select
                  value={formData.status_dalaman}
                  onValueChange={(value) => handleInputChange("status_dalaman", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Diterima">Diterima</SelectItem>
                    <SelectItem value="Dalam Semakan Teknikal">
                      Dalam Semakan Teknikal
                    </SelectItem>
                    <SelectItem value="Menunggu Ulasan ATD">
                      Menunggu Ulasan ATD
                    </SelectItem>
                    <SelectItem value="Kertas Perakuan Disediakan">
                      Kertas Perakuan Disediakan
                    </SelectItem>
                    <SelectItem value="Menunggu OSC">Menunggu OSC</SelectItem>
                    <SelectItem value="Lulus">Lulus</SelectItem>
                    <SelectItem value="Lulus Bersyarat">Lulus Bersyarat</SelectItem>
                    <SelectItem value="Ditolak">Ditolak</SelectItem>
                    <SelectItem value="Dibatalkan">Dibatalkan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="catatan_dalaman">Catatan Dalaman</Label>
                <Textarea
                  id="catatan_dalaman"
                  placeholder="Nota dalaman pegawai JPL (tidak kelihatan kepada pemohon)"
                  value={formData.catatan_dalaman}
                  onChange={(e) =>
                    handleInputChange("catatan_dalaman", e.target.value)
                  }
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard")}
            >
              Batal
            </Button>
            <Button type="submit" disabled={submitting}>
              {loading ? "Mendaftar..." : "Daftar Permohonan"}
            </Button>
          </div>
        </form>

        {/* Import Modal */}
        <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Import Maklumat dari OSC 3.0 Plus</DialogTitle>
            </DialogHeader>

            {isProcessing ? (
              /* Processing Screen */
              <div className="py-12 text-center">
                <div className="flex justify-center mb-4">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
                </div>
                <p className="text-lg font-medium mb-2">
                  AI sedang membaca dokumen OSC anda...
                </p>
                <p className="text-sm text-muted-foreground">
                  Mengambil masa 10–20 saat. Sila tunggu.
                </p>
              </div>
            ) : processingError ? (
              /* Error State */
              <div className="py-8">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-semibold mb-2">
                      {processingError.includes("terlalu lama") 
                        ? "Ralat Masa Tamat" 
                        : processingError.includes("menghubungi")
                        ? "Ralat Rangkaian"
                        : "Ralat Analisis"}
                    </p>
                    <p className="text-sm">{processingError}</p>
                  </AlertDescription>
                </Alert>
                <div className="mt-6 flex justify-center gap-3">
                  {processingError.includes("menghubungi") || processingError.includes("terlalu lama") ? (
                    <>
                      <Button variant="outline" onClick={() => {
                        setProcessingError(null);
                      }}>
                        Cuba Lagi
                      </Button>
                      <Button onClick={() => {
                        setShowImportModal(false);
                        setProcessingError(null);
                        setUploadedFile(null);
                        setFileType(null);
                      }}>
                        Isi Manual
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => {
                        setProcessingError(null);
                        setUploadedFile(null);
                        setFileType(null);
                      }}>
                        Muat Naik Fail Lain
                      </Button>
                      <Button onClick={() => setShowImportModal(false)}>
                        Tutup
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : extractedData ? (
              /* Review Panel */
              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <h3 className="font-semibold text-lg mb-3">Semak Maklumat Diekstrak</h3>
                  
                  {/* Poor Quality Warning */}
                  {showPoorQualityWarning && (
                    <Alert className="bg-orange-50 border-orange-200 mb-4">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-900">
                        <p className="font-semibold mb-2">AI tidak dapat membaca dokumen dengan jelas.</p>
                        <p className="text-sm mb-1">Kemungkinan sebab:</p>
                        <ul className="text-sm list-disc list-inside space-y-1 ml-2">
                          <li>Imej terlalu kecil atau kabur</li>
                          <li>PDF dilindungi kata laluan</li>
                          <li>Halaman yang salah dimuat naik</li>
                        </ul>
                        <p className="text-sm mt-2">Sila cuba tangkapan skrin resolusi tinggi.</p>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Validation Results */}
                  {(() => {
                    const validation = validateOSCData({
                      zoning: extractedData.maklumat_am?.zoning,
                      nisbah_plot: extractedData.maklumat_permohonan?.nisbah_plot,
                      ketinggian_bangunan_m: extractedData.pecahan_pembangunan?.[0]?.ketinggian_bangunan_m,
                      kawasan_pembangunan_m2: extractedData.maklumat_permohonan?.kawasan_pembangunan_m2,
                      kawasan_lantai_kasar_m2: extractedData.maklumat_permohonan?.kawasan_lantai_kasar_m2,
                      bil_tempat_letak_kereta: extractedData.maklumat_permohonan?.bil_tempat_letak_kereta,
                      bil_unit: extractedData.pecahan_pembangunan?.[0]?.bil_unit,
                    });

                    return validation.issues.length > 0 && (
                      <Alert className={
                        validation.errors_count > 0 
                          ? "bg-red-50 border-red-200 mb-4" 
                          : validation.warnings_count > 0
                          ? "bg-orange-50 border-orange-200 mb-4"
                          : "bg-blue-50 border-blue-200 mb-4"
                      }>
                        <AlertCircle className={`h-4 w-4 ${
                          validation.errors_count > 0 
                            ? "text-red-600" 
                            : validation.warnings_count > 0
                            ? "text-orange-600"
                            : "text-blue-600"
                        }`} />
                        <AlertDescription>
                          <p className="font-semibold mb-2">{getValidationSummary(validation)}</p>
                          <ul className="space-y-1 text-sm">
                            {validation.issues.map((issue, idx) => (
                              <li key={idx} className={
                                issue.severity === "error" 
                                  ? "text-red-900" 
                                  : issue.severity === "warning"
                                  ? "text-orange-900"
                                  : "text-blue-900"
                              }>
                                <strong>{issue.field}:</strong> {issue.message}
                                {issue.allowed_value && (
                                  <> (Sekarang: {issue.current_value}, Dibenarkan: {issue.allowed_value})</>
                                )}
                              </li>
                            ))}
                          </ul>
                          <p className="text-xs mt-2 opacity-75">Rujukan: RTD 2030 Segamat</p>
                        </AlertDescription>
                      </Alert>
                    );
                  })()}

                  {/* Section 1: Maklumat Am */}
                  <div className="border rounded-md overflow-hidden mb-4">
                    <div className="bg-primary text-primary-foreground p-2 font-semibold">
                      Maklumat Am
                    </div>
                    <table className="w-full">
                      <tbody>
                        {[
                          { label: "No. Permohonan OSC", value: extractedData.maklumat_am?.no_permohonan_osc },
                          { label: "Jenis Aplikasi", value: extractedData.maklumat_am?.jenis_aplikasi, badge: true },
                          { label: "Kategori Permohonan", value: extractedData.maklumat_am?.kategori_permohonan },
                          { label: "Skala Pembangunan", value: extractedData.maklumat_am?.skala_pembangunan },
                          { label: "Nama Pemohon (SP)", value: extractedData.maklumat_am?.nama_sp },
                          { label: "No. KP (SP)", value: extractedData.maklumat_am?.no_kp_sp },
                          { label: "Jenis Proses PR", value: extractedData.maklumat_am?.jenis_proses_pr },
                          { label: "Tarikh Penghantaran", value: extractedData.maklumat_am?.tarikh_penghantaran },
                          { label: "Tarikh Lengkap OSC (KPI)", value: extractedData.maklumat_am?.tarikh_lengkap_diterima_osc, highlight: true },
                          { label: "Negeri", value: extractedData.maklumat_am?.negeri },
                          { label: "Daerah", value: extractedData.maklumat_am?.daerah },
                          { label: "Mukim", value: extractedData.maklumat_am?.mukim },
                          { label: "Nama Pemaju / Pemilik", value: extractedData.maklumat_am?.nama_pemaju_pemilik },
                          { label: "Lokasi / Mercu Tanda", value: extractedData.maklumat_am?.lokasi_mercu_tanda },
                          { label: "Longitud", value: extractedData.maklumat_am?.longitud },
                          { label: "Latitud", value: extractedData.maklumat_am?.latitud },
                          { label: "Rancangan Tempatan", value: extractedData.maklumat_am?.rancangan_tempatan },
                          { label: "Zoning", value: extractedData.maklumat_am?.zoning },
                          { label: "Tajuk Permohonan", value: extractedData.maklumat_am?.tajuk_permohonan, truncate: true },
                          { label: "Maklumat Tanah", value: `${landLots.length} lot ditemui`, custom: true },
                        ].map((row, index) => (
                          <tr key={index} className={row.highlight ? "bg-blue-50" : ""}>
                            <td className="border p-2 text-sm font-medium w-1/3">{row.label}</td>
                            <td className="border p-2 text-sm">
                              {row.value === null || row.value === undefined ? (
                                <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                                  Tidak ditemui
                                </Badge>
                              ) : row.badge && row.value ? (
                                <Badge className={
                                  row.value === "KM" 
                                    ? "bg-blue-600" 
                                    : row.value === "PB"
                                    ? "bg-green-600"
                                    : "bg-gray-600"
                                }>
                                  {row.value} ({row.value === "KM" ? "57 hari KPI" : "14 hari KPI"})
                                </Badge>
                              ) : row.truncate && typeof row.value === "string" ? (
                                <div>
                                  {expandedTajuk || row.value.length <= 120 ? (
                                    row.value
                                  ) : (
                                    <>
                                      {row.value.substring(0, 120)}...{" "}
                                      <button
                                        onClick={() => setExpandedTajuk(true)}
                                        className="text-primary text-xs hover:underline"
                                      >
                                        Lihat semua
                                      </button>
                                    </>
                                  )}
                                </div>
                              ) : (
                                String(row.value)
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Section 2: Maklumat Permohonan */}
                  {extractedData.maklumat_permohonan && (
                    <div className="border rounded-md overflow-hidden mb-4">
                      <div className="bg-primary text-primary-foreground p-2 font-semibold">
                        Maklumat Permohonan (Statistik Pembangunan)
                      </div>
                      <table className="w-full">
                        <tbody>
                          {[
                            { 
                              label: "Kawasan Pembangunan", 
                              value: extractedData.maklumat_permohonan.kawasan_pembangunan_m2 
                                ? `${extractedData.maklumat_permohonan.kawasan_pembangunan_m2.toFixed(2)} m² / ${extractedData.maklumat_permohonan.kawasan_pembangunan_hektar?.toFixed(4) || "?"} hektar`
                                : null
                            },
                            { label: "Nisbah Plot", value: extractedData.maklumat_permohonan.nisbah_plot?.toFixed(2) },
                            { label: "Kawasan Lantai Kasar", value: extractedData.maklumat_permohonan.kawasan_lantai_kasar_m2 ? `${extractedData.maklumat_permohonan.kawasan_lantai_kasar_m2.toFixed(2)} m²` : null },
                            { label: "Kawasan Landskap Lembut", value: extractedData.maklumat_permohonan.kawasan_landskap_lembut_m2 ? `${extractedData.maklumat_permohonan.kawasan_landskap_lembut_m2.toFixed(2)} m²` : null },
                            { label: "Tempat Letak Kereta", value: extractedData.maklumat_permohonan.bil_tempat_letak_kereta ? `${extractedData.maklumat_permohonan.bil_tempat_letak_kereta} petak` : null },
                            { label: "Tempat Letak Motosikal", value: extractedData.maklumat_permohonan.bil_tempat_letak_motosikal ? `${extractedData.maklumat_permohonan.bil_tempat_letak_motosikal} petak` : null },
                            { label: "Tempat Letak OKU", value: extractedData.maklumat_permohonan.bil_tempat_letak_oku ? `${extractedData.maklumat_permohonan.bil_tempat_letak_oku} petak` : null },
                          ].map((row, index) => (
                            <tr key={index}>
                              <td className="border p-2 text-sm font-medium w-1/3">{row.label}</td>
                              <td className="border p-2 text-sm">
                                {row.value === null || row.value === undefined ? (
                                  <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
                                    Tidak ditemui
                                  </Badge>
                                ) : (
                                  row.value
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Section 3: Pecahan Pembangunan */}
                  {extractedData.pecahan_pembangunan && extractedData.pecahan_pembangunan.length > 0 && (
                    <div className="border rounded-md overflow-hidden mb-4">
                      <div className="bg-primary text-primary-foreground p-2 font-semibold">
                        Pecahan Pembangunan
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="border p-2 text-left">Komponen</th>
                              <th className="border p-2 text-left">Bil Unit</th>
                              <th className="border p-2 text-left">Bil Tingkat</th>
                              <th className="border p-2 text-left">KLK (m²)</th>
                              <th className="border p-2 text-left">Ketinggian (m)</th>
                              <th className="border p-2 text-left">Jenis Strata</th>
                            </tr>
                          </thead>
                          <tbody>
                            {extractedData.pecahan_pembangunan.map((item: any, idx: number) => (
                              <tr key={idx}>
                                <td className="border p-2">
                                  <div className="font-medium">{item.komponen || "-"}</div>
                                  <div className="text-xs text-muted-foreground">{item.jenis_guna_tanah}</div>
                                </td>
                                <td className="border p-2">{item.bil_unit || "-"}</td>
                                <td className="border p-2">{item.bil_tingkat || "-"}</td>
                                <td className="border p-2">{item.kawasan_lantai_kasar_m2?.toFixed(2) || "-"}</td>
                                <td className="border p-2">{item.ketinggian_bangunan_m?.toFixed(1) || "-"}</td>
                                <td className="border p-2">{item.jenis_strata || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  <p className="text-sm text-muted-foreground mt-3">
                    {extractedCount} medan berjaya diekstrak, {missingCount} medan tidak ditemui.
                  </p>

                  {/* Disclaimer */}
                  <p className="text-xs text-muted-foreground mt-2">
                    Sila semak semua nilai sebelum mengesahkan. Pengesahan pematuhan adalah automatik berdasarkan RTD 2030 Segamat.
                  </p>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setProcessingError(null);
                    setUploadedFile(null);
                    setFileType(null);
                  }}>
                    Cuba Lagi
                  </Button>
                  <Button 
                    onClick={handleUseExtractedData}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Gunakan Maklumat Ini
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              /* Upload Area */
              <>
                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <p className="font-semibold text-blue-900 mb-2">Cara mendapatkan dokumen OSC:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                    <li>Buka permohonan dalam OSC 3.0 Plus</li>
                    <li>Klik butang &apos;Cetak&apos; di bahagian kanan</li>
                    <li>Simpan sebagai PDF atau ambil tangkapan skrin</li>
                    <li>Muat naik fail di sini</li>
                  </ol>
                </div>

                {/* Upload Area */}
                <div className="mt-4">
                  {!uploadedFile ? (
                    <>
                      <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                          isDragging
                            ? "border-primary bg-primary/5"
                            : "border-muted-foreground/25 hover:border-muted-foreground/50"
                        }`}
                      >
                        <input
                          type="file"
                          id="file-upload"
                          className="hidden"
                          accept=".pdf,.png,.jpg,.jpeg,.webp"
                          onChange={handleFileInputChange}
                        />
                        <label
                          htmlFor="file-upload"
                          className="cursor-pointer flex flex-col items-center"
                        >
                          <Upload className="h-12 w-12 text-muted-foreground mb-3" />
                          <p className="text-base font-medium text-foreground mb-1">
                            Seret fail ke sini atau klik untuk pilih
                          </p>
                          <p className="text-sm text-muted-foreground">
                            PDF, PNG, JPG, WEBP • Maksimum 10MB
                          </p>
                        </label>
                      </div>
                      
                      {/* File Upload Error */}
                      {fileUploadError && (
                        <Alert variant="destructive" className="mt-3">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            {fileUploadError}
                          </AlertDescription>
                        </Alert>
                      )}
                    </>
                  ) : (
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {fileType === "pdf" ? (
                            <FileIcon className="h-10 w-10 text-destructive" />
                          ) : (
                            <ImageIcon className="h-10 w-10 text-primary" />
                          )}
                          <div>
                            <p className="font-medium">{uploadedFile.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveFile}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Preview for images */}
                      {fileType === "image" && uploadedFile && (
                        <div className="mt-3 border rounded-md overflow-hidden">
                          <img
                            src={URL.createObjectURL(uploadedFile)}
                            alt="Preview"
                            className="w-full h-auto max-h-64 object-contain"
                          />
                        </div>
                      )}

                      {/* Change file link */}
                      <div className="mt-3 text-center">
                        <label
                          htmlFor="file-upload-replace"
                          className="text-sm text-primary hover:underline cursor-pointer"
                        >
                          Tukar Fail
                        </label>
                        <input
                          type="file"
                          id="file-upload-replace"
                          className="hidden"
                          accept=".pdf,.png,.jpg,.jpeg,.webp"
                          onChange={handleFileInputChange}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowImportModal(false)}>
                    Batal
                  </Button>
                  <Button
                    onClick={handleAnalyzeDocument}
                    disabled={!uploadedFile}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Analisa Dokumen
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
