import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { applicationService } from "@/services/applicationService";
import { siteVisitService } from "@/services/siteVisitService";
import { workflowService } from "@/services/workflowService";
import type { Tables } from "@/integrations/supabase/types";
import { MapPin, Upload, Image as ImageIcon, X, CheckCircle, Camera, FileText, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PhotoUpload {
  file: File;
  preview: string;
  caption: string;
  location: string;
}

export default function SiteVisitPage() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();

  const [application, setApplication] = useState<Tables<"applications"> | null>(null);
  const [siteVisit, setSiteVisit] = useState<Tables<"site_visits"> | null>(null);
  const [existingPhotos, setExistingPhotos] = useState<Tables<"site_photos">[]>([]);
  
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split("T")[0]);
  const [observations, setObservations] = useState("");
  const [technicalNotes, setTechnicalNotes] = useState("");
  
  const [photos, setPhotos] = useState<PhotoUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && typeof id === "string") {
      loadData(id);
    }
  }, [id]);

  const loadData = async (applicationId: string) => {
    try {
      const appData = await applicationService.getApplicationById(applicationId);
      setApplication(appData);

      const visits = await siteVisitService.getSiteVisits(applicationId);
      if (visits.length > 0) {
        const latestVisit = visits[0];
        setSiteVisit(latestVisit);
        setVisitDate(latestVisit.visit_date);
        setObservations(latestVisit.observations || "");
        setTechnicalNotes(latestVisit.technical_notes || "");

        const photos = await siteVisitService.getSitePhotos(latestVisit.id);
        setExistingPhotos(photos);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Ralat",
        description: "Gagal memuatkan data permohonan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (files: FileList | null) => {
    if (!files) return;

    const newPhotos: PhotoUpload[] = [];
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const preview = URL.createObjectURL(file);
        newPhotos.push({ file, preview, caption: "", location: "" });
      }
    });

    setPhotos((prev) => [...prev, ...newPhotos]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const updatePhotoCaption = (index: number, caption: string) => {
    setPhotos((prev) =>
      prev.map((p, i) => (i === index ? { ...p, caption } : p))
    );
  };

  const updatePhotoLocation = (index: number, location: string) => {
    setPhotos((prev) =>
      prev.map((p, i) => (i === index ? { ...p, location } : p))
    );
  };

  const handleSaveSiteVisit = async () => {
    if (!id || typeof id !== "string") return;

    setUploading(true);
    try {
      let visitId = siteVisit?.id;

      if (!visitId) {
        const newVisit = await siteVisitService.createSiteVisit(
          id,
          visitDate,
          observations
        );
        if (!newVisit) throw new Error("Failed to create site visit");
        visitId = newVisit.id;
        setSiteVisit(newVisit);
      }

      // Upload all photos
      for (const photo of photos) {
        await siteVisitService.uploadSitePhoto(
          visitId,
          photo.file,
          photo.caption,
          photo.location
        );
      }

      toast({
        title: "Berjaya",
        description: "Lawatan tapak disimpan",
      });

      // Reload to show uploaded photos
      await loadData(id);
      setPhotos([]);
    } catch (error) {
      console.error("Error saving site visit:", error);
      toast({
        title: "Ralat",
        description: "Gagal menyimpan lawatan tapak",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCompleteSiteVisit = async () => {
    if (!siteVisit) return;

    try {
      await siteVisitService.completeSiteVisit(siteVisit.id);
      await workflowService.updateStatus(id as string, "technical_report");

      toast({
        title: "Lawatan Tapak Selesai",
        description: "Status dikemaskini kepada Laporan Teknikal",
      });

      router.push("/dashboard/my-assignments");
    } catch (error) {
      console.error("Error completing site visit:", error);
      toast({
        title: "Ralat",
        description: "Gagal melengkapkan lawatan tapak",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <SEO title="Lawatan Tapak - Sistem SPC MPS" />
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Memuatkan...</p>
        </div>
      </Layout>
    );
  }

  if (!application) {
    return (
      <Layout>
        <SEO title="Lawatan Tapak - Sistem SPC MPS" />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Permohonan tidak dijumpai</AlertDescription>
        </Alert>
      </Layout>
    );
  }

  const totalPhotos = existingPhotos.length + photos.length;
  const canComplete = siteVisit && totalPhotos >= 3 && observations.trim().length > 0;

  return (
    <Layout>
      <SEO title={`Lawatan Tapak - ${application.tracking_number}`} />
      
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
            <MapPin className="h-8 w-8 text-primary" />
            Lawatan Tapak
          </h1>
          <p className="text-muted-foreground mt-1">
            Rekod pemerhatian dan muat naik gambar tapak
          </p>
        </div>

        {/* Application Details */}
        <Card>
          <CardHeader>
            <CardTitle>Maklumat Permohonan</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">No. Rujukan</Label>
              <p className="font-mono font-medium">{application.tracking_number}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Nama Projek</Label>
              <p className="font-medium">{application.project_name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Lokasi</Label>
              <p>{application.location}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <div className="mt-1">
                <Badge variant="secondary">{application.status}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Site Visit Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Maklumat Lawatan
            </CardTitle>
            <CardDescription>
              Rekodkan tarikh, pemerhatian dan nota teknikal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="visit-date">Tarikh Lawatan</Label>
              <Input
                id="visit-date"
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className="max-w-xs"
              />
            </div>

            <div>
              <Label htmlFor="observations">Pemerhatian Tapak</Label>
              <Textarea
                id="observations"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Huraikan keadaan tapak, akses jalan, kemudahan sedia ada, pematuhan setback, dll."
                rows={6}
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label htmlFor="technical-notes">Nota Teknikal</Label>
              <Textarea
                id="technical-notes"
                value={technicalNotes}
                onChange={(e) => setTechnicalNotes(e.target.value)}
                placeholder="Catatan teknikal untuk laporan (pilihan)"
                rows={4}
                className="font-mono text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Photo Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Muat Naik Gambar Tapak
            </CardTitle>
            <CardDescription>
              Seret dan lepaskan gambar atau klik untuk pilih fail. Minimum 3 gambar diperlukan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drag-drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-2">
                Seret gambar ke sini atau klik untuk pilih
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Format: JPG, PNG, HEIC. Saiz maksimum: 10MB setiap fail
              </p>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFileChange(e.target.files)}
                className="max-w-xs mx-auto"
              />
            </div>

            {/* Photo Gallery - New uploads */}
            {photos.length > 0 && (
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Gambar Baru ({photos.length})
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="border rounded-lg overflow-hidden">
                      <div className="relative aspect-video bg-muted">
                        <img
                          src={photo.preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute top-2 right-2"
                          onClick={() => removePhoto(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="p-3 space-y-2">
                        <Input
                          placeholder="Keterangan gambar"
                          value={photo.caption}
                          onChange={(e) => updatePhotoCaption(index, e.target.value)}
                          className="text-sm"
                        />
                        <Input
                          placeholder="Lokasi (contoh: Bahagian depan tapak)"
                          value={photo.location}
                          onChange={(e) => updatePhotoLocation(index, e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Existing Photos */}
            {existingPhotos.length > 0 && (
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Gambar Yang Dimuat Naik ({existingPhotos.length})
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {existingPhotos.map((photo) => (
                    <div key={photo.id} className="border rounded-lg overflow-hidden">
                      <div className="relative aspect-video bg-muted">
                        <img
                          src={photo.photo_url}
                          alt={photo.caption || "Site photo"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {(photo.caption || photo.location_description) && (
                        <div className="p-3 space-y-1 text-sm">
                          {photo.caption && (
                            <p className="font-medium">{photo.caption}</p>
                          )}
                          {photo.location_description && (
                            <p className="text-muted-foreground text-xs">
                              {photo.location_description}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {totalPhotos > 0 && (
              <Alert>
                <ImageIcon className="h-4 w-4" />
                <AlertDescription>
                  Jumlah gambar: {totalPhotos} {totalPhotos >= 3 ? "✓" : `(minimum 3 diperlukan)`}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/my-assignments")}
          >
            Kembali
          </Button>
          <div className="flex gap-3">
            <Button
              onClick={handleSaveSiteVisit}
              disabled={uploading || photos.length === 0}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Memuat naik..." : "Simpan Lawatan"}
            </Button>
            <Button
              variant="default"
              onClick={handleCompleteSiteVisit}
              disabled={!canComplete}
              className="bg-success hover:bg-success/90"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Selesai Lawatan Tapak
            </Button>
          </div>
        </div>

        {!canComplete && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Untuk melengkapkan lawatan tapak: minimum 3 gambar dan pemerhatian tapak diperlukan
            </AlertDescription>
          </Alert>
        )}
      </div>
    </Layout>
  );
}