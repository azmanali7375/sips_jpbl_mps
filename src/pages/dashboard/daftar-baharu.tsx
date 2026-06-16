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
import { FileText, Calendar, User, MapPin, Building2, AlertCircle, Upload, FileIcon, ImageIcon, X } from "lucide-react";

export default function DaftarBaharu() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
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

  const handleFileSelect = (file: File) => {
    setFileUploadError(null);

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setFileUploadError(
        "Fail terlalu besar. Sila muat naik fail di bawah 10MB. Cuba kompres PDF atau gunakan tangkapan skrin."
      );
      return;
    }

    // Validate file type
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setFileUploadError(
        "Jenis fail tidak disokong. Sila muat naik PDF, PNG, JPG, atau WEBP sahaja."
      );
      return;
    }

    setUploadedFile(file);
    setFileType(file.type === "application/pdf" ? "pdf" : "image");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
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

  const handleRetryUpload = () => {
    setExtractedData(null);
    setUploadedFile(null);
    setFileType(null);
    setProcessingError(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.jenis_aplikasi) {
      toast({
        title: "Ralat",
        description: "Sila pilih jenis permohonan (KM atau PB)",
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
        .from("applications")
        .insert({
          jenis_aplikasi: formData.jenis_aplikasi,
          no_fail_jpl,
          no_permohonan_osc,
          tajuk_permohonan: formData.tajuk_permohonan,
          nama_pemaju_pemilik: formData.nama_pemaju_pemilik,
          no_lot: formData.no_lot,
          mukim: formData.mukim,
          daerah: formData.daerah,
          negeri: formData.negeri,
          tarikh_penghantaran: formData.tarikh_penghantaran,
          tarikh_lengkap_diterima_osc: formData.tarikh_terima,
          status: "Daftar",
          registered_by: user.id,
        })
        .select()
        .single();

      if (appError) throw appError;

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
  };

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
            <Button type="submit" disabled={loading}>
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
                  <Button variant="outline" onClick={handleRetryUpload}>
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