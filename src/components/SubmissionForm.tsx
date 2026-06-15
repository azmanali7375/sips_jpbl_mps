import { useState, FormEvent } from "react";
import { useRouter } from "next/router";
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
import { applicationService } from "@/services/applicationService";
import { complianceService } from "@/services/complianceService";
import { AlertCircle, Upload, FileText, X } from "lucide-react";

interface UploadedFile {
  file: File;
  type: 'site_plan' | 'floor_plan' | 'elevation' | 'cad_drawing' | 'other';
  preview?: string;
}

export function SubmissionForm() {
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

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: UploadedFile['type']) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const newFiles: UploadedFile[] = Array.from(selectedFiles).map(file => ({
      file,
      type,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileTypeLabel = (type: UploadedFile['type']) => {
    const labels = {
      site_plan: "Pelan Tapak",
      floor_plan: "Pelan Lantai",
      elevation: "Pelan Ketinggian",
      cad_drawing: "Lukisan CAD",
      other: "Dokumen Sokongan"
    };
    return labels[type];
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // Create application
      const application = await applicationService.createApplication({
        project_name: formData.projectName,
        project_type: formData.projectType as any,
        location: formData.location,
        lot_number: formData.lotNumber,
        land_use_zone: formData.landUseZone,
        plot_area: formData.plotArea ? parseFloat(formData.plotArea) : undefined,
        building_height: formData.buildingHeight ? parseFloat(formData.buildingHeight) : undefined,
      });

      if (!application) {
        throw new Error("Gagal mencipta permohonan");
      }

      // Upload all files
      for (const uploadedFile of files) {
        // TODO: Implement document upload after fixing service
        // await documentService.uploadDocument(
        //   application.id,
        //   uploadedFile.file,
        //   uploadedFile.type
        // );
      }

      // Perform automated compliance check
      const checkResult = await complianceService.performComplianceCheck(application);
      await complianceService.saveComplianceCheck(application.id, checkResult);

      setSuccess(
        `Permohonan berjaya dihantar! No. Rujukan: ${application.tracking_number}`
      );
      
      // Reset form
      setFormData({
        projectName: "",
        projectType: "",
        location: "",
        lotNumber: "",
        landUseZone: "",
        plotArea: "",
        buildingHeight: "",
      });
      setFiles([]);

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Ralat berlaku semasa menghantar permohonan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-success bg-success/10">
          <AlertDescription className="text-success">{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Butiran Projek</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="projectName">Nama Projek *</Label>
              <Input
                id="projectName"
                placeholder="cth: Pembinaan Rumah Kediaman"
                value={formData.projectName}
                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectType">Jenis Projek *</Label>
              <Select
                value={formData.projectType}
                onValueChange={(value) => setFormData({ ...formData, projectType: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis projek" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Kediaman</SelectItem>
                  <SelectItem value="commercial">Komersial</SelectItem>
                  <SelectItem value="industrial">Perindustrian</SelectItem>
                  <SelectItem value="mixed">Campuran</SelectItem>
                  <SelectItem value="other">Lain-lain</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Lokasi *</Label>
              <Input
                id="location"
                placeholder="cth: Jalan Muar, Segamat"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />
            </div>

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
              <Label htmlFor="landUseZone">Zon Kegunaan Tanah</Label>
              <Input
                id="landUseZone"
                placeholder="cth: Komersial, Kediaman"
                value={formData.landUseZone}
                onChange={(e) => setFormData({ ...formData, landUseZone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plotArea">Keluasan Tanah (m²)</Label>
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
              <Label htmlFor="buildingHeight">Ketinggian Bangunan (m)</Label>
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
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sitePlan">Pelan Tapak</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="sitePlan"
                  type="file"
                  accept=".pdf,.dwg,.png,.jpg,.jpeg"
                  multiple
                  onChange={(e) => handleFileUpload(e, 'site_plan')}
                  className="cursor-pointer"
                />
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="floorPlan">Pelan Lantai</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="floorPlan"
                  type="file"
                  accept=".pdf,.dwg,.png,.jpg,.jpeg"
                  multiple
                  onChange={(e) => handleFileUpload(e, 'floor_plan')}
                  className="cursor-pointer"
                />
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="elevation">Pelan Ketinggian</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="elevation"
                  type="file"
                  accept=".pdf,.dwg,.png,.jpg,.jpeg"
                  multiple
                  onChange={(e) => handleFileUpload(e, 'elevation')}
                  className="cursor-pointer"
                />
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cad">Lukisan CAD</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="cad"
                  type="file"
                  accept=".dwg,.dxf"
                  multiple
                  onChange={(e) => handleFileUpload(e, 'cad_drawing')}
                  className="cursor-pointer"
                />
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="supporting">Dokumen Sokongan</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="supporting"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  multiple
                  onChange={(e) => handleFileUpload(e, 'other')}
                  className="cursor-pointer"
                />
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          {files.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium mb-3">Fail Dimuat Naik ({files.length})</h4>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted rounded-md"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{file.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {getFileTypeLabel(file.type)} • {(file.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button
          type="submit"
          disabled={loading || !formData.projectName || !formData.projectType || !formData.location}
        >
          {loading ? "Menghantar..." : "Hantar Permohonan"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Batal
        </Button>
      </div>
    </form>
  );
}