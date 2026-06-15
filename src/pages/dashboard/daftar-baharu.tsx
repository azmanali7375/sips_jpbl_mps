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
import { useToast } from "@/hooks/use-toast";
import {
  registerNewApplication,
  getOfficers,
  RegistrationFormData,
} from "@/services/registrationService";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Calendar, User, MapPin, Building2, AlertCircle, Upload, FileIcon, ImageIcon, X } from "lucide-react";

export default function DaftarBaharu() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [officers, setOfficers] = useState<{ id: string; full_name: string }[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [calculatedKPIDate, setCalculatedKPIDate] = useState<string>("");

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<"pdf" | "image" | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // AI processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [extractedCount, setExtractedCount] = useState(0);
  const [missingCount, setMissingCount] = useState(0);
  const [landLots, setLandLots] = useState<any[]>([]);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Import success state
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  const [importedLotsCount, setImportedLotsCount] = useState(0);
  const [expandedTajuk, setExpandedTajuk] = useState(false);

  const [formData, setFormData] = useState<RegistrationFormData>({
    no_permohonan_osc: "",
    kategori_permohonan: "",
    skala_pembangunan: "Kecil",
    jenis_proses_pr: "Tidak",
    status_semakan_osc: "",
    tarikh_penghantaran: "",
    tarikh_lengkap_diterima_osc: "",
    nama_sp: "",
    no_kp_sp: "",
    nama_pemaju_pemilik: "",
    tajuk_permohonan: "",
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

  useEffect(() => {
    async function loadData() {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        router.push("/auth/login");
        return;
      }

      // Load officers
      const officersList = await getOfficers();
      setOfficers(officersList);
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
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Fail Terlalu Besar",
        description: "Saiz fail maksimum ialah 10MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Jenis Fail Tidak Sah",
        description: "Sila muat naik fail PDF, PNG, JPG, atau WEBP sahaja",
        variant: "destructive",
      });
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

    setIsProcessing(true);
    setProcessingError(null);

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix to get pure base64
          const base64String = result.split(",")[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(uploadedFile);
      });

      // Determine media type
      const mediaType = uploadedFile.type;

      // Determine content type for API
      const contentType = fileType === "pdf" ? "document" : "image";

      // Get Anthropic API key from environment
      const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error("Anthropic API key not configured");
      }

      // Call Anthropic API
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system:
            'You are a document parser for Malaysian planning applications. Extract fields from an OSC 3.0 Plus document and return ONLY valid JSON with no explanation. If a field is not visible return null. Never invent values. Return this exact structure: {"no_permohonan_osc":string,"kategori_permohonan":string,"skala_pembangunan":string,"nama_sp":string,"no_kp_sp":string,"jenis_proses_pr":string,"status_semakan_osc":string,"tarikh_penghantaran":string (YYYY-MM-DD),"tarikh_lengkap_diterima_osc":string (YYYY-MM-DD),"jabatan_memperaku":string,"negeri":string,"daerah":string,"mukim":string,"tajuk_permohonan":string,"nama_pemaju_pemilik":string,"lokasi_mercu_tanda":string,"longitud":number,"latitud":number,"rancangan_tempatan":string,"zoning":string,"maklumat_tanah":[{"jenis_lot":string,"no_lot":string,"pemilik_tanah":string,"kategori":string,"syarat_nyata":string,"catatan":string}]}',
          messages: [
            {
              role: "user",
              content: [
                {
                  type: contentType,
                  source: {
                    type: "base64",
                    media_type: mediaType,
                    data: base64,
                  },
                },
                {
                  type: "text",
                  text: "Extract all fields from this OSC 3.0 Plus document and return as JSON only.",
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "API request failed");
      }

      const data = await response.json();

      // Find text content block
      const textBlock = data.content?.find((block: any) => block.type === "text");
      if (!textBlock) {
        throw new Error("No text content in API response");
      }

      // Parse JSON from response
      let parsedData;
      try {
        parsedData = JSON.parse(textBlock.text);
      } catch (e) {
        throw new Error("Failed to parse extracted data as JSON");
      }

      // Count extracted and missing fields
      const allFields = Object.keys(parsedData).filter((key) => key !== "maklumat_tanah");
      const extracted = allFields.filter((key) => parsedData[key] !== null);
      const missing = allFields.filter((key) => parsedData[key] === null);

      setExtractedData(parsedData);
      setExtractedCount(extracted.length);
      setMissingCount(missing.length);
      setLandLots(parsedData.maklumat_tanah || []);

      // Success - move to review panel (will be implemented next)
      toast({
        title: "Analisis Berjaya",
        description: `${extracted.length} medan berjaya diekstrak`,
      });
    } catch (error) {
      console.error("Error analyzing document:", error);
      setProcessingError(
        error instanceof Error ? error.message : "Gagal menganalisis dokumen"
      );
      toast({
        title: "Ralat Analisis",
        description: "Gagal menganalisis dokumen. Sila cuba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
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

    // Fill form fields from extracted data
    setFormData((prev) => ({
      ...prev,
      no_permohonan_osc: extractedData.no_permohonan_osc || prev.no_permohonan_osc,
      kategori_permohonan: extractedData.kategori_permohonan || prev.kategori_permohonan,
      skala_pembangunan: extractedData.skala_pembangunan || prev.skala_pembangunan,
      nama_sp: extractedData.nama_sp || prev.nama_sp,
      no_kp_sp: extractedData.no_kp_sp || prev.no_kp_sp,
      jenis_proses_pr: extractedData.jenis_proses_pr || prev.jenis_proses_pr,
      status_semakan_osc: extractedData.status_semakan_osc || prev.status_semakan_osc,
      tarikh_penghantaran: extractedData.tarikh_penghantaran || prev.tarikh_penghantaran,
      tarikh_lengkap_diterima_osc: extractedData.tarikh_lengkap_diterima_osc || prev.tarikh_lengkap_diterima_osc,
      nama_pemaju_pemilik: extractedData.nama_pemaju_pemilik || prev.nama_pemaju_pemilik,
      tajuk_permohonan: extractedData.tajuk_permohonan || prev.tajuk_permohonan,
      lokasi_mercu_tanda: extractedData.lokasi_mercu_tanda || prev.lokasi_mercu_tanda,
      mukim: extractedData.mukim || prev.mukim,
      daerah: extractedData.daerah || prev.daerah,
      negeri: extractedData.negeri || prev.negeri,
      rancangan_tempatan: extractedData.rancangan_tempatan || prev.rancangan_tempatan,
      zoning: extractedData.zoning || prev.zoning,
      longitud: extractedData.longitud !== null ? extractedData.longitud : prev.longitud,
      latitud: extractedData.latitud !== null ? extractedData.latitud : prev.latitud,
    }));

    // Store land lots for later insertion
    setImportedLotsCount(landLots.length);

    // Show success banner
    setShowImportSuccess(true);

    // Close modal
    setShowImportModal(false);

    // Reset modal state
    setTimeout(() => {
      setExtractedData(null);
      setUploadedFile(null);
      setFileType(null);
    }, 500);

    toast({
      title: "Import Berjaya",
      description: `${extractedCount} medan telah diisi secara automatik`,
    });
  };

  const handleInputChange = (
    field: keyof RegistrationFormData,
    value: string | number | undefined
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.no_permohonan_osc.trim()) {
      toast({
        title: "Ralat Pengesahan",
        description: "No. Permohonan OSC diperlukan",
        variant: "destructive",
      });
      return;
    }

    if (!formData.tarikh_penghantaran) {
      toast({
        title: "Ralat Pengesahan",
        description: "Tarikh Penghantaran diperlukan",
        variant: "destructive",
      });
      return;
    }

    if (!formData.tarikh_lengkap_diterima_osc) {
      toast({
        title: "Ralat Pengesahan",
        description: "Tarikh Lengkap Diterima OSC diperlukan",
        variant: "destructive",
      });
      return;
    }

    if (!formData.nama_sp.trim()) {
      toast({
        title: "Ralat Pengesahan",
        description: "Nama Pemohon (SP) diperlukan",
        variant: "destructive",
      });
      return;
    }

    if (!formData.tajuk_permohonan.trim()) {
      toast({
        title: "Ralat Pengesahan",
        description: "Tajuk Permohonan diperlukan",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const result = await registerNewApplication(formData, userId);

    setLoading(false);

    if (result.success) {
      toast({
        title: "✓ Permohonan Berjaya Didaftar",
        description: `No. Fail JPL: ${result.no_fail_jpl}\nTarikh Akhir KPI: ${result.tarikh_kpi}`,
      });

      // Redirect to application detail page
      setTimeout(() => {
        router.push(`/dashboard/reports/${result.application_id}`);
      }, 1500);
    } else {
      toast({
        title: "Ralat Pendaftaran",
        description: result.error || "Gagal mendaftar permohonan",
        variant: "destructive",
      });
    }
  };

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
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <Label htmlFor="no_permohonan_osc">
                  No. Permohonan OSC <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="no_permohonan_osc"
                  placeholder="Contoh: MPSEG-KM20260427-001"
                  value={formData.no_permohonan_osc}
                  onChange={(e) =>
                    handleInputChange("no_permohonan_osc", e.target.value)
                  }
                  required
                />
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
                    <SelectTrigger>
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
                    <SelectTrigger>
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
                    <p className="font-semibold mb-2">Ralat Analisis</p>
                    <p className="text-sm">{processingError}</p>
                  </AlertDescription>
                </Alert>
                <div className="mt-6 flex justify-center gap-3">
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
                </div>
              </div>
            ) : extractedData ? (
              /* Review Panel */
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-3">Semak Maklumat Diekstrak</h3>
                  
                  {/* Data Table */}
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="border p-2 text-left font-semibold text-sm">Medan</th>
                          <th className="border p-2 text-left font-semibold text-sm">Nilai Diekstrak oleh AI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: "No. Permohonan OSC", value: extractedData.no_permohonan_osc },
                          { label: "Kategori Permohonan", value: extractedData.kategori_permohonan },
                          { label: "Skala Pembangunan", value: extractedData.skala_pembangunan },
                          { label: "Nama Pemohon (SP)", value: extractedData.nama_sp },
                          { label: "No. KP (SP)", value: extractedData.no_kp_sp },
                          { label: "Jenis Proses PR", value: extractedData.jenis_proses_pr },
                          { label: "Status Semakan (OSC)", value: extractedData.status_semakan_osc },
                          { label: "Tarikh Penghantaran", value: extractedData.tarikh_penghantaran },
                          { label: "Tarikh Lengkap OSC (KPI)", value: extractedData.tarikh_lengkap_diterima_osc, highlight: true },
                          { label: "Jabatan Memperaku", value: extractedData.jabatan_memperaku },
                          { label: "Negeri", value: extractedData.negeri },
                          { label: "Daerah", value: extractedData.daerah },
                          { label: "Mukim", value: extractedData.mukim },
                          { label: "Nama Pemaju / Pemilik", value: extractedData.nama_pemaju_pemilik },
                          { label: "Lokasi / Mercu Tanda", value: extractedData.lokasi_mercu_tanda },
                          { label: "Longitud", value: extractedData.longitud },
                          { label: "Latitud", value: extractedData.latitud },
                          { label: "Rancangan Tempatan", value: extractedData.rancangan_tempatan },
                          { label: "Zoning", value: extractedData.zoning },
                          { label: "Tajuk Permohonan", value: extractedData.tajuk_permohonan, truncate: true },
                          { label: "Maklumat Tanah", value: `${landLots.length} lot ditemui`, custom: true },
                        ].map((row, index) => (
                          <tr key={index} className={row.highlight ? "bg-blue-50" : ""}>
                            <td className="border p-2 text-sm font-medium">{row.label}</td>
                            <td className="border p-2 text-sm">
                              {row.value === null || row.value === undefined ? (
                                <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                                  Tidak ditemui
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

                  {/* Summary */}
                  <p className="text-sm text-muted-foreground mt-3">
                    {extractedCount} medan berjaya diekstrak, {missingCount} medan tidak ditemui.
                  </p>

                  {/* Disclaimer */}
                  <p className="text-xs text-muted-foreground mt-2">
                    Sila semak semua nilai sebelum mengesahkan.
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