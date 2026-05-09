import { useState, FormEvent } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { applicationService } from "@/services/applicationService";
import { documentService } from "@/services/documentService";
import { Upload, FileText, CheckCircle, X, Loader2 } from "lucide-react";

interface UploadedFile {
  file: File;
  type: 'site_plan' | 'floor_plan' | 'elevation' | 'cad_drawing' | 'other';
  preview?: string;
}

export function SubmissionForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  
  const [formData, setFormData] = useState({
    projectName: "",
    projectType: "",
    location: "",
    lotNumber: "",
    landUseZone: "",
    plotArea: "",
    buildingHeight: "",
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: UploadedFile['type']) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: UploadedFile[] = Array.from(files).map(file => ({
      file,
      type,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => {
      const updated = [...prev];
      if (updated[index].preview) {
        URL.revokeObjectURL(updated[index].preview!);
      }
      updated.splice(index, 1);
      return updated;
    });
  };

  const getFileTypeLabel = (type: UploadedFile['type']) => {
    const labels = {
      site_plan: "Site Plan",
      floor_plan: "Floor Plan",
      elevation: "Elevation Drawing",
      cad_drawing: "CAD Drawing",
      other: "Supporting Document"
    };
    return labels[type];
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.projectName || !formData.projectType || !formData.location) {
      setError("Please fill in all required fields");
      return;
    }

    if (uploadedFiles.length === 0) {
      setError("Please upload at least one document");
      return;
    }

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
        throw new Error("Failed to create application");
      }

      // Upload documents
      for (const { file, type } of uploadedFiles) {
        await documentService.uploadDocument(application.id, file, type);
      }

      router.push(`/dashboard/applications/${application.id}`);
    } catch (err) {
      console.error("Submission error:", err);
      setError(err instanceof Error ? err.message : "Failed to submit application");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
          <CardDescription>Basic details about your development project</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name *</Label>
              <Input
                id="projectName"
                placeholder="e.g., Mixed Development at Jalan Segamat"
                value={formData.projectName}
                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectType">Project Type *</Label>
              <Select value={formData.projectType} onValueChange={(value) => setFormData({ ...formData, projectType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="industrial">Industrial</SelectItem>
                  <SelectItem value="mixed_use">Mixed Use</SelectItem>
                  <SelectItem value="institutional">Institutional</SelectItem>
                  <SelectItem value="infrastructure">Infrastructure</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                placeholder="Full address"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lotNumber">Lot Number</Label>
              <Input
                id="lotNumber"
                placeholder="e.g., PT 12345"
                value={formData.lotNumber}
                onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="landUseZone">Land Use Zone</Label>
              <Input
                id="landUseZone"
                placeholder="e.g., Commercial, Residential"
                value={formData.landUseZone}
                onChange={(e) => setFormData({ ...formData, landUseZone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plotArea">Plot Area (sq m)</Label>
              <Input
                id="plotArea"
                type="number"
                step="0.01"
                placeholder="e.g., 1500.50"
                value={formData.plotArea}
                onChange={(e) => setFormData({ ...formData, plotArea: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="buildingHeight">Building Height (m)</Label>
              <Input
                id="buildingHeight"
                type="number"
                step="0.1"
                placeholder="e.g., 15.5"
                value={formData.buildingHeight}
                onChange={(e) => setFormData({ ...formData, buildingHeight: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Document Upload</CardTitle>
          <CardDescription>Upload all required plans and supporting documents (PDF, DWG, Images)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sitePlan">Site Plan *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="sitePlan"
                  type="file"
                  accept=".pdf,.dwg,.png,.jpg,.jpeg"
                  onChange={(e) => handleFileUpload(e, 'site_plan')}
                  className="cursor-pointer"
                />
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="floorPlan">Floor Plan</Label>
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
              <Label htmlFor="elevation">Elevation Drawing</Label>
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
              <Label htmlFor="cadDrawing">CAD Drawing (DWG)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="cadDrawing"
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
              <Label htmlFor="supporting">Supporting Documents</Label>
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

          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <Label>Uploaded Files ({uploadedFiles.length})</Label>
              <div className="space-y-2">
                {uploadedFiles.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{item.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {getFileTypeLabel(item.type)} • {(item.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
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

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-semibold">Submission Checklist</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className={formData.projectName && formData.projectType && formData.location ? "text-green-600" : ""}>
                  ✓ All required project information provided
                </li>
                <li className={uploadedFiles.some(f => f.type === 'site_plan') ? "text-green-600" : ""}>
                  ✓ Site plan uploaded
                </li>
                <li className={uploadedFiles.length >= 2 ? "text-green-600" : ""}>
                  ✓ Additional supporting documents uploaded
                </li>
                <li>ℹ️ You will receive a tracking number after submission</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Application"
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}