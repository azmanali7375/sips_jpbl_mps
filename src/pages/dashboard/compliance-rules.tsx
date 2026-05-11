import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { complianceService, type ComplianceRule } from "@/services/complianceService";
import { Plus, Edit2, Trash2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ComplianceRulesPage() {
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ComplianceRule | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const [formData, setFormData] = useState({
    rule_name: "",
    rule_type: "plot_ratio" as const,
    zone_type: "",
    min_value: "",
    max_value: "",
    description: "",
    is_active: true,
  });

  useEffect(() => {
    loadRules();
  }, [showInactive]);

  const loadRules = async () => {
    setLoading(true);
    const data = await complianceService.getAllRules(showInactive);
    setRules(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const ruleData = {
      ...formData,
      min_value: formData.min_value ? parseFloat(formData.min_value) : null,
      max_value: formData.max_value ? parseFloat(formData.max_value) : null,
      zone_type: formData.zone_type || null,
    };

    if (editingRule) {
      await complianceService.updateRule(editingRule.id, ruleData);
    } else {
      await complianceService.createRule(ruleData);
    }

    resetForm();
    loadRules();
    setDialogOpen(false);
  };

  const handleEdit = (rule: ComplianceRule) => {
    setEditingRule(rule);
    setFormData({
      rule_name: rule.rule_name,
      rule_type: rule.rule_type as any,
      zone_type: rule.zone_type || "",
      min_value: rule.min_value?.toString() || "",
      max_value: rule.max_value?.toString() || "",
      description: rule.description || "",
      is_active: rule.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Adakah anda pasti untuk memadam peraturan ini?")) {
      await complianceService.deleteRule(id);
      loadRules();
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    await complianceService.toggleRuleStatus(id, !currentStatus);
    loadRules();
  };

  const resetForm = () => {
    setFormData({
      rule_name: "",
      rule_type: "plot_ratio",
      zone_type: "",
      min_value: "",
      max_value: "",
      description: "",
      is_active: true,
    });
    setEditingRule(null);
  };

  const getRuleTypeBadge = (type: string) => {
    const colors = {
      plot_ratio: "bg-blue-500",
      setback: "bg-green-500",
      height: "bg-purple-500",
      zoning: "bg-orange-500",
      custom: "bg-gray-500",
    };
    return colors[type as keyof typeof colors] || colors.custom;
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-primary">Pengurusan Peraturan Pematuhan</h1>
            <p className="text-muted-foreground mt-2">
              Konfigurasi peraturan kawalan pembangunan untuk semakan automatik
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <Switch
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label>Tunjuk Tidak Aktif</Label>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Peraturan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingRule ? "Edit Peraturan" : "Tambah Peraturan Baharu"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="rule_name">Nama Peraturan *</Label>
                      <Input
                        id="rule_name"
                        value={formData.rule_name}
                        onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                        placeholder="cth: Nisbah Plot Maksimum Kediaman"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="rule_type">Jenis Peraturan *</Label>
                      <Select
                        value={formData.rule_type}
                        onValueChange={(value) => setFormData({ ...formData, rule_type: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="plot_ratio">Plot Ratio</SelectItem>
                          <SelectItem value="setback">Setback</SelectItem>
                          <SelectItem value="height">Ketinggian</SelectItem>
                          <SelectItem value="zoning">Zoning</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="zone_type">Zon (Optional)</Label>
                      <Input
                        id="zone_type"
                        value={formData.zone_type}
                        onChange={(e) => setFormData({ ...formData, zone_type: e.target.value })}
                        placeholder="cth: residential, commercial"
                      />
                    </div>

                    <div>
                      <Label htmlFor="min_value">Nilai Minimum</Label>
                      <Input
                        id="min_value"
                        type="number"
                        step="0.01"
                        value={formData.min_value}
                        onChange={(e) => setFormData({ ...formData, min_value: e.target.value })}
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <Label htmlFor="max_value">Nilai Maksimum</Label>
                      <Input
                        id="max_value"
                        type="number"
                        step="0.01"
                        value={formData.max_value}
                        onChange={(e) => setFormData({ ...formData, max_value: e.target.value })}
                        placeholder="100"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor="description">Keterangan</Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Penerangan peraturan ini"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                      />
                      <Label>Aktif</Label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Batal
                    </Button>
                    <Button type="submit">
                      {editingRule ? "Kemas Kini" : "Tambah"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {rules.length === 0 && !loading && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Tiada peraturan pematuhan dijumpai. Sila tambah peraturan baharu.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4">
          {rules.map((rule) => (
            <Card key={rule.id} className={!rule.is_active ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{rule.rule_name}</CardTitle>
                      <Badge className={getRuleTypeBadge(rule.rule_type)}>
                        {rule.rule_type}
                      </Badge>
                      {!rule.is_active && (
                        <Badge variant="outline">Tidak Aktif</Badge>
                      )}
                      {rule.zone_type && (
                        <Badge variant="secondary">{rule.zone_type}</Badge>
                      )}
                    </div>
                    {rule.description && (
                      <CardDescription>{rule.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleStatus(rule.id, rule.is_active ?? true)}
                    >
                      {rule.is_active ? "Nyahaktif" : "Aktifkan"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(rule)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {rule.min_value !== null && (
                    <div>
                      <span className="text-muted-foreground">Minimum:</span>
                      <span className="ml-2 font-medium">{rule.min_value}</span>
                    </div>
                  )}
                  {rule.max_value !== null && (
                    <div>
                      <span className="text-muted-foreground">Maksimum:</span>
                      <span className="ml-2 font-medium">{rule.max_value}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Dikemas kini:</span>
                    <span className="ml-2 font-medium">
                      {new Date(rule.updated_at || rule.created_at || "").toLocaleDateString("ms-MY")}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}