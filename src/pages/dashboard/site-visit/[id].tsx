import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Save, Upload, X, Image as ImageIcon } from "lucide-react";
import {
  createSiteVisit,
  updateSiteVisit,
  getSiteVisit,
  uploadSitePhoto,
  deleteSitePhoto,
  getAvailableOfficersForVisit,
  TUJUAN_LAWATAN_OPTIONS,
  STATUS_LAWATAN_OPTIONS,
  type SiteVisitFormData,
  type SiteVisitWithPhotos,
} from "@/services/siteVisitService";

export default function SiteVisitPage() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);
  const [officers, setOfficers] = useState<any[]>([]);
  const [existingVisit, setExistingVisit] = useState<SiteVisitWithPhotos | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form state
  const [tarikhLawatan, setTarikhLawatan] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [masaLawatan, setMasaLawatan] = useState("");
  const [pegawaiLawatan, setPegawaiLawatan] = useState("");
  const [tujuanLawatan, setTujuanLawatan] = useState("");
  const [penemuan, setPenemuan] = useState("");
  const [tindakanSusulan, setTindakanSusulan] = useState("");
  const [statusLawatan, setStatusLawatan] = useState("Dirancang");

  // Photo upload state
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setCurrentUser(profile);
      setPegawaiLawatan(profile?.id || "");

      // Convert id to string
      const appId = Array.isArray(id) ? id[0] : id;
      if (!appId) return;

      // Check if this is an existing visit or new visit for application
      const { data: visitData } = await supabase
        .from("site_visits")
        .select("*")
        .eq("id", appId)
        .maybeSingle();

      if (visitData) {
        // Editing existing visit
        setIsEditMode(true);
        const visit = await getSiteVisit(appId);
        setExistingVisit(visit);

        // Populate form
        setTarikhLawatan(visit.visit_date);
        setMasaLawatan(visit.masa_lawatan || "");
        setPegawaiLawatan(visit.officer_id);
        setTujuanLawatan(visit.tujuan_lawatan || "");
        setPenemuan(visit.penemuan || "");
        setTindakanSusulan(visit.tindakan_susulan || "");
        setStatusLawatan(visit.status_lawatan || "Dirancang");

        // Get application for this visit
        const { data: app } = await supabase
          .from("applications")
          .select("*")
          .eq("id", visit.application_id)
          .single();
        setApplication(app);
      } else {
        // New visit for application
        setIsEditMode(false);
        const { data: app } = await supabase
          .from("applications")
          .select("*")
          .eq("id", appId)
          .single();
        setApplication(app);
      }

      // Get officers
      const officerList = await getAvailableOfficersForVisit();
      setOfficers(officerList);
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

  async function handleSubmit() {
    if (!application || !currentUser) return;

    // Validation
    if (!tarikhLawatan || !pegawaiLawatan || !tujuanLawatan) {
      toast({
        title: "Ralat",
        description: "Sila lengkapkan medan wajib: Tarikh Lawatan, Pegawai, dan Tujuan Lawatan",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const formData: SiteVisitFormData = {
        application_id: application.id,
        tarikh_lawatan: tarikhLawatan,
        masa_lawatan: masaLawatan || undefined,
        pegawai_lawatan: pegawaiLawatan,
        tujuan_lawatan: tujuanLawatan,
        penemuan: penemuan || undefined,
        tindakan_susulan: tindakanSusulan || undefined,
        status_lawatan: statusLawatan,
      };

      if (isEditMode && existingVisit) {
        await updateSiteVisit(existingVisit.id, formData, currentUser.id);
        toast({
          title: "Berjaya",
          description: "Lawatan tapak berjaya dikemaskini",
        });
      } else {
        await createSiteVisit(formData, currentUser.id);
        toast({
          title: "Berjaya",
          description: "Lawatan tapak berjaya didaftarkan",
        });
      }

      // Redirect back to application detail
      router.push(`/dashboard/permohonan/${application.id}`);
    } catch (error) {
      console.error("Error submitting site visit:", error);
      toast({
        title: "Ralat",
        description: "Gagal menyimpan lawatan tapak",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePhotoUpload() {
    if (!existingVisit || !photoUrl.trim()) {
      toast({
        title: "Ralat",
        description: "Sila masukkan URL gambar",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploadingPhoto(true);

      await uploadSitePhoto({
        site_visit_id: existingVisit.id,
        photo_url: photoUrl,
        caption: photoCaption || undefined,
        tarikh_gambar: new Date().toISOString().split("T")[0],
      });

      toast({
        title: "Berjaya",
        description: "Gambar berjaya dimuat naik",
      });

      // Reset form and reload
      setPhotoUrl("");
      setPhotoCaption("");
      loadData();
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast({
        title: "Ralat",
        description: "Gagal memuat naik gambar",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleDeletePhoto(photoId: string) {
    if (!confirm("Adakah anda pasti untuk memadam gambar ini?")) return;

    try {
      await deleteSitePhoto(photoId);
      toast({
        title: "Berjaya",
        description: "Gambar dipadam",
      });
      loadData();
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast({
        title: "Ralat",
        description: "Gagal memadam gambar",
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
          <Button onClick={() => router.push("/dashboard")}>
            Kembali ke Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl">
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
                {isEditMode ? "Edit Lawatan Tapak" : "Daftar Lawatan Tapak"}
              </h1>
              <p className="text-muted-foreground">
                {application.no_fail_jpl} - {application.nama_pemaju_pemilik}
              </p>
            </div>
          </div>
        </div>

        {/* Site Visit Form */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Maklumat Lawatan Tapak</CardTitle>
            <CardDescription>
              Rekod lawatan ke tapak pembangunan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">No. Fail (Rujukan)</label>
              <Input value={application.no_fail_jpl} disabled />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Tarikh Lawatan *</label>
                <Input
                  type="date"
                  value={tarikhLawatan}
                  onChange={(e) => setTarikhLawatan(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Masa Lawatan</label>
                <Input
                  type="time"
                  value={masaLawatan}
                  onChange={(e) => setMasaLawatan(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Pegawai Lawatan *</label>
              <Select value={pegawaiLawatan} onValueChange={setPegawaiLawatan}>
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
            </div>

            <div>
              <label className="text-sm font-medium">Tujuan Lawatan *</label>
              <Select value={tujuanLawatan} onValueChange={setTujuanLawatan}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tujuan lawatan" />
                </SelectTrigger>
                <SelectContent>
                  {TUJUAN_LAWATAN_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Penemuan</label>
              <Textarea
                rows={6}
                placeholder="Catatan penemuan dari lawatan tapak..."
                value={penemuan}
                onChange={(e) => setPenemuan(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Tindakan Susulan</label>
              <Textarea
                rows={4}
                placeholder="Tindakan susulan yang diperlukan..."
                value={tindakanSusulan}
                onChange={(e) => setTindakanSusulan(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Status Lawatan</label>
              <Select value={statusLawatan} onValueChange={setStatusLawatan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_LAWATAN_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Photo Upload (only for existing visits) */}
        {isEditMode && existingVisit && (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Gambar Lawatan Tapak</CardTitle>
              <CardDescription>
                Muat naik gambar dari lawatan tapak
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload form */}
              <div className="border rounded-lg p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium">URL Gambar</label>
                  <Input
                    placeholder="https://example.com/photo.jpg"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Caption</label>
                  <Input
                    placeholder="Keterangan gambar..."
                    value={photoCaption}
                    onChange={(e) => setPhotoCaption(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handlePhotoUpload}
                  disabled={uploadingPhoto || !photoUrl.trim()}
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingPhoto ? "Memuat naik..." : "Muat Naik"}
                </Button>
              </div>

              {/* Photo gallery */}
              {existingVisit.site_photos && existingVisit.site_photos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {existingVisit.site_photos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={photo.photo_url}
                        alt={photo.caption || "Site photo"}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeletePhoto(photo.id)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Padam
                        </Button>
                      </div>
                      {photo.caption && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          {photo.caption}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {photo.tarikh_gambar
                          ? new Date(photo.tarikh_gambar).toLocaleDateString("ms-MY")
                          : ""}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
                  <ImageIcon className="h-12 w-12 opacity-50" />
                  <div>Tiada gambar dimuat naik</div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/permohonan/${application.id}`)}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            <Save className="h-4 w-4 mr-2" />
            {submitting ? "Menyimpan..." : isEditMode ? "Kemaskini" : "Simpan"}
          </Button>
        </div>
      </div>
    </Layout>
  );
}