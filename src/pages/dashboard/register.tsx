import { useState, FormEvent } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applicationService } from "@/services/applicationService";
import { workflowService } from "@/services/workflowService";
import { documentService } from "@/services/documentService";
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";

export default function RegisterApplication() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    projectName: "",
    projectType: "",
    location: "",
    lotNumber: "",
    landUseZone: "",
    plotArea: "",
    buildingHeight: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      // Validate required fields
      if (!formData.projectName || !formData.location || !files.length) {
        throw new Error("Sila lengkapkan semua medan wajib");
      }

      // Create application with osc_received status
      const application = await applicationService.createApplication({
        project_name: formData.projectName,
        project_type: formData.projectType as any,
        location: formData.location,
        lot_number: formData.lotNumber,
        land_use_zone: formData.landUseZone,
        plot_area: formData.plotArea ? parseFloat(formData.plotArea) : undefined,
        building_height: formData.buildingHeight ? parseFloat(formData.buildingHeight) : undefined,
        status: "osc_received",
      });

      if (!application) {
        throw new Error("Gagal mencipta permohonan");
      }

      // Upload documents
      for (const file of files) {
        await documentService.uploadDocument(application.id, file, "other");
      }

      // Register the application (move to "registered" status)
      await workflowService.registerApplication(application.id);

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(err.message || "Ralat semasa mendaftar permohonan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <SEO title="Daftar Permohonan - Sistem SPC MPS" />
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold">Daftar Permohonan dari OSC</h1>
          <p className="text-muted-foreground mt-1">
            Masukkan maklumat permohonan yang diterima dari One Stop Center
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-success bg-success/10">
            <CheckCircle className="h-4 w-4 text-success" />
            <AlertDescription className="text-success">
              Permohonan berjaya didaftarkan! Mengalih ke dashboard...
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Maklumat Projek</CardTitle>
              <CardDescription>Butiran asas permohonan pembangunan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="projectName">
                    Nama Projek <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="projectName"
                    placeholder="cth: Kompleks Perdagangan Segamat"
                    required
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectType">Jenis Projek</Label>
                  <Select
                    value={formData.projectType}
                    onValueChange={(value) => setFormData({ ...formData, projectType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis projek" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Kediaman</SelectItem>
                      <SelectItem value="commercial">Komersial</SelectItem>
                      <SelectItem value="industrial">Perindustrian</SelectItem>
                      <SelectItem value="mixed">Bercampur</SelectItem>
                      <SelectItem value="institutional">Institusi</SelectItem>
                      <SelectItem value="infrastructure">Infrastruktur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">
                  Lokasi <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="location"
                  placeholder="cth: Jalan Genuang, 85000 Segamat, Johor"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lotNumber">No. Lot</Label>
                  <Input
                    id="lotNumber"
                    placeholder="cth: PT 12345"
                    value={formData.lotNumber}
                    onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="landUseZone">Zon Guna Tanah</Label>
                  <Input
                    id="landUseZone"
                    placeholder="cth: Komersial, Kediaman"
                    value={formData.landUseZone}
                    onChange={(e) => setFormData({ ...formData, landUseZone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plotArea">Keluasan Tapak (meter persegi)</Label>
                  <Input
                    id="plotArea"
                    type="number"
                    step="0.01"
                    placeholder="cth: 1500.50"
                    value={formData.plotArea}
                    onChange={(e) => setFormData({ ...formData, plotArea: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buildingHeight">Ketinggian Bangunan (meter)</Label>
                  <Input
                    id="buildingHeight"
                    type="number"
                    step="0.1"
                    placeholder="cth: 15.5"
                    value={formData.buildingHeight}
                    onChange={(e) => setFormData({ ...formData, buildingHeight: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dokumen Permohonan</CardTitle>
              <CardDescription>
                Muat naik semua dokumen yang diterima dari OSC <span className="text-destructive">*</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="documents">Dokumen (PDF, DWG, Imej)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="documents"
                    type="file"
                    accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png"
                    multiple
                    required
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Fail dipilih:</p>
                  <div className="space-y-1">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-sm p-2 bg-muted rounded"
                      >
                        <FileText className="h-4 w-4" />
                        <span className="flex-1">{file.name}</span>
                        <span className="text-muted-foreground font-mono">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? "Mendaftar..." : "Daftar Permohonan"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Batal
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}