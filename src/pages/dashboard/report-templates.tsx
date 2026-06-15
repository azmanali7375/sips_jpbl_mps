import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Plus, Edit, Trash2, AlertCircle } from "lucide-react";

interface ReportTemplate {
  id: string;
  template_name: string;
  template_type: string;
  template_content: string;
  description?: string;
  created_at: string;
}

interface TemplateFormData {
  template_name: string;
  template_type: string;
  template_content: string;
  description: string;
}

export default function ReportTemplates() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>({
    template_name: "",
    template_type: "Ulasan Teknikal",
    template_content: "",
    description: "",
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const { data, error } = await supabase
        .from("report_templates")
        .select("*")
        .order("template_type", { ascending: true })
        .order("template_name", { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error loading templates:", error);
      toast({
        title: "Ralat",
        description: "Gagal memuatkan templat",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleNew() {
    setEditingId(null);
    setFormData({
      template_name: "",
      template_type: "Ulasan Teknikal",
      template_content: "",
      description: "",
    });
    setShowDialog(true);
  }

  function handleEdit(template: ReportTemplate) {
    setEditingId(template.id);
    setFormData({
      template_name: template.template_name,
      template_type: template.template_type,
      template_content: template.template_content,
      description: template.description || "",
    });
    setShowDialog(true);
  }

  async function handleSave() {
    if (!formData.template_name.trim() || !formData.template_content.trim()) {
      toast({
        title: "Ralat",
        description: "Nama dan kandungan templat diperlukan",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from("report_templates")
          .update({
            template_name: formData.template_name,
            template_type: formData.template_type,
            template_content: formData.template_content,
            description: formData.description || null,
          })
          .eq("id", editingId);

        if (error) throw error;

        toast({
          title: "Berjaya",
          description: "Templat berjaya dikemaskini",
        });
      } else {
        // Create new
        const { error } = await supabase
          .from("report_templates")
          .insert({
            template_name: formData.template_name,
            template_type: formData.template_type,
            template_content: formData.template_content,
            description: formData.description || null,
          });

        if (error) throw error;

        toast({
          title: "Berjaya",
          description: "Templat berjaya dicipta",
        });
      }

      setShowDialog(false);
      loadTemplates();
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: "Ralat",
        description: "Gagal menyimpan templat",
        variant: "destructive",
      });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Adakah anda pasti ingin memadam templat ini?")) return;

    try {
      const { error } = await supabase
        .from("report_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Berjaya",
        description: "Templat berjaya dipadam",
      });

      loadTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        title: "Ralat",
        description: "Gagal memadam templat",
        variant: "destructive",
      });
    }
  }

  const updateFormField = <K extends keyof TemplateFormData>(
    field: K,
    value: TemplateFormData[K]
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Memuatkan templat...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const groupedTemplates = templates.reduce((acc, template) => {
    const type = template.template_type || "Lain-lain";
    if (!acc[type]) acc[type] = [];
    acc[type].push(template);
    return acc;
  }, {} as Record<string, ReportTemplate[]>);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary">
              Templat Laporan
            </h1>
            <p className="text-muted-foreground mt-1">
              Urus templat laporan teknikal untuk pemeriksaan permohonan
            </p>
          </div>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            Templat Baharu
          </Button>
        </div>

        {templates.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Tiada templat dijumpai. Klik butang &quot;Templat Baharu&quot; untuk mencipta templat pertama.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedTemplates).map(([type, typeTemplates]) => (
              <Card key={type}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {type}
                    <Badge variant="secondary">{typeTemplates.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {typeTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{template.template_name}</div>
                          {template.description && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {template.description}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            Dicipta: {new Date(template.created_at).toLocaleDateString("ms-MY")}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(template)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(template.id)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Template Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Templat" : "Templat Baharu"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>
                  Nama Templat <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formData.template_name}
                  onChange={(e) => updateFormField("template_name", e.target.value)}
                  placeholder="Contoh: Ulasan Teknikal Standard"
                />
              </div>

              <div>
                <Label>Jenis Templat</Label>
                <Select
                  value={formData.template_type}
                  onValueChange={(value) => updateFormField("template_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ulasan Teknikal">Ulasan Teknikal</SelectItem>
                    <SelectItem value="Kertas Perakuan">Kertas Perakuan</SelectItem>
                    <SelectItem value="Surat Menyurat">Surat Menyurat</SelectItem>
                    <SelectItem value="Minit Mesyuarat">Minit Mesyuarat</SelectItem>
                    <SelectItem value="Lain-lain">Lain-lain</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Penerangan</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => updateFormField("description", e.target.value)}
                  placeholder="Penerangan ringkas templat ini"
                />
              </div>

              <div>
                <Label>
                  Kandungan Templat <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={formData.template_content}
                  onChange={(e) => updateFormField("template_content", e.target.value)}
                  rows={15}
                  placeholder="Masukkan kandungan templat. Gunakan placeholder seperti {{no_fail_jpl}}, {{tajuk_permohonan}}, dll."
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Batal
              </Button>
              <Button onClick={handleSave}>Simpan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}