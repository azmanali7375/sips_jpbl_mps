import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { applicationService, type Application } from "@/services/applicationService";
import { oscDecisionService, type OSCDecisionType } from "@/services/oscDecisionService";
import { reportService } from "@/services/reportService";
import { workflowService } from "@/services/workflowService";
import { useToast } from "@/hooks/use-toast";

export default function OSCDecisionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    meeting_date: "",
    meeting_number: "",
    decision_type: "" as OSCDecisionType,
    approval_conditions: "",
    rejection_reasons: "",
    amendment_requirements: "",
  });

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    setLoading(true);
    const apps = await applicationService.getAllApplications({ status: "under_review" });
    setApplications(apps);
    setLoading(false);
  };

  const handleApplicationSelect = async (appId: string) => {
    const app = applications.find(a => a.id === appId);
    if (app) {
      setSelectedApp(app);
      const existingDecision = await oscDecisionService.getDecisionByApplicationId(appId);
      if (existingDecision) {
        setFormData({
          meeting_date: existingDecision.meeting_date || "",
          meeting_number: existingDecision.meeting_number || "",
          decision_type: existingDecision.decision_type as OSCDecisionType,
          approval_conditions: existingDecision.approval_conditions || "",
          rejection_reasons: existingDecision.rejection_reasons || "",
          amendment_requirements: existingDecision.amendment_requirements || "",
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || !formData.decision_type) return;

    setSubmitting(true);

    try {
      const decision = await oscDecisionService.createDecision({
        application_id: selectedApp.id,
        ...formData,
      });

      if (!decision) {
        throw new Error("Failed to create OSC decision");
      }

      let newStatus: string;
      if (formData.decision_type === "lulus") {
        newStatus = "approved";
        await reportService.generateFormC1(selectedApp.id);
      } else if (formData.decision_type === "tolak") {
        newStatus = "rejected";
        await reportService.generateFormC2(selectedApp.id);
      } else {
        newStatus = "approved_with_amendments";
      }

      await workflowService.updateStatus(
        selectedApp.id,
        newStatus as any,
        `OSC Decision: ${formData.decision_type}`
      );

      toast({
        title: "OSC Decision Recorded",
        description: `Decision recorded and Form ${formData.decision_type === "lulus" ? "C1" : formData.decision_type === "tolak" ? "C2" : "generated"} auto-generated.`,
      });

      setFormData({
        meeting_date: "",
        meeting_number: "",
        decision_type: "" as OSCDecisionType,
        approval_conditions: "",
        rejection_reasons: "",
        amendment_requirements: "",
      });
      setSelectedApp(null);
      loadApplications();
    } catch (error) {
      console.error("Error submitting OSC decision:", error);
      toast({
        title: "Error",
        description: "Failed to record OSC decision",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getDecisionIcon = (type: OSCDecisionType) => {
    switch (type) {
      case "lulus": return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "tolak": return <XCircle className="h-5 w-5 text-red-600" />;
      case "lulus_dengan_pindaan": return <AlertCircle className="h-5 w-5 text-amber-600" />;
    }
  };

  const getDecisionLabel = (type: OSCDecisionType) => {
    switch (type) {
      case "lulus": return "Lulus";
      case "tolak": return "Tolak";
      case "lulus_dengan_pindaan": return "Lulus Dengan Pindaan";
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-[#19283a]">OSC Meeting Decisions</h1>
          <p className="text-slate-600 mt-2">Record decisions from One Stop Center meetings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Applications for OSC</CardTitle>
              <CardDescription>Select an application to record decision</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-slate-500">Loading applications...</p>
              ) : applications.length === 0 ? (
                <p className="text-sm text-slate-500">No applications awaiting OSC decision</p>
              ) : (
                <div className="space-y-2">
                  {applications.map((app) => (
                    <Button
                      key={app.id}
                      variant={selectedApp?.id === app.id ? "default" : "outline"}
                      className="w-full justify-start text-left"
                      onClick={() => handleApplicationSelect(app.id)}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{app.tracking_number}</div>
                        <div className="text-xs opacity-75">{app.project_name}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                OSC Decision Form
              </CardTitle>
              <CardDescription>
                Record the decision made during the OSC meeting
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedApp ? (
                <div className="text-center py-12 text-slate-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select an application to record OSC decision</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">{selectedApp.project_name}</h3>
                    <p className="text-sm text-slate-600">Tracking: {selectedApp.tracking_number}</p>
                    <p className="text-sm text-slate-600">Location: {selectedApp.location}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="meeting_date">Meeting Date *</Label>
                      <Input
                        id="meeting_date"
                        type="date"
                        value={formData.meeting_date}
                        onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="meeting_number">Meeting Number</Label>
                      <Input
                        id="meeting_number"
                        placeholder="e.g., OSC/2026/05"
                        value={formData.meeting_number}
                        onChange={(e) => setFormData({ ...formData, meeting_number: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="decision_type">Decision Type *</Label>
                    <Select
                      value={formData.decision_type}
                      onValueChange={(value) => setFormData({ ...formData, decision_type: value as OSCDecisionType })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select decision type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lulus">
                          <div className="flex items-center gap-2">
                            {getDecisionIcon("lulus")}
                            <span>Lulus (Approve)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="tolak">
                          <div className="flex items-center gap-2">
                            {getDecisionIcon("tolak")}
                            <span>Tolak (Reject)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="lulus_dengan_pindaan">
                          <div className="flex items-center gap-2">
                            {getDecisionIcon("lulus_dengan_pindaan")}
                            <span>Lulus Dengan Pindaan (Approve with Amendments)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.decision_type === "lulus" && (
                    <div className="space-y-2">
                      <Label htmlFor="approval_conditions">Approval Conditions</Label>
                      <Textarea
                        id="approval_conditions"
                        placeholder="Enter any conditions for approval..."
                        rows={4}
                        value={formData.approval_conditions}
                        onChange={(e) => setFormData({ ...formData, approval_conditions: e.target.value })}
                      />
                    </div>
                  )}

                  {formData.decision_type === "tolak" && (
                    <div className="space-y-2">
                      <Label htmlFor="rejection_reasons">Rejection Reasons *</Label>
                      <Textarea
                        id="rejection_reasons"
                        placeholder="Enter reasons for rejection..."
                        rows={4}
                        value={formData.rejection_reasons}
                        onChange={(e) => setFormData({ ...formData, rejection_reasons: e.target.value })}
                        required
                      />
                    </div>
                  )}

                  {formData.decision_type === "lulus_dengan_pindaan" && (
                    <div className="space-y-2">
                      <Label htmlFor="amendment_requirements">Amendment Requirements *</Label>
                      <Textarea
                        id="amendment_requirements"
                        placeholder="Specify required amendments to the plans..."
                        rows={4}
                        value={formData.amendment_requirements}
                        onChange={(e) => setFormData({ ...formData, amendment_requirements: e.target.value })}
                        required
                      />
                      <p className="text-xs text-slate-500">
                        A Written Directive will need to be prepared for YDP signature
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button type="submit" disabled={submitting} className="flex-1">
                      {submitting ? "Recording Decision..." : "Record OSC Decision"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSelectedApp(null);
                        setFormData({
                          meeting_date: "",
                          meeting_number: "",
                          decision_type: "" as OSCDecisionType,
                          approval_conditions: "",
                          rejection_reasons: "",
                          amendment_requirements: "",
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>

                  {formData.decision_type && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-900 font-medium mb-1">Auto-generation:</p>
                      <p className="text-sm text-blue-800">
                        {formData.decision_type === "lulus" && "Form C1 will be auto-generated"}
                        {formData.decision_type === "tolak" && "Form C2 will be auto-generated"}
                        {formData.decision_type === "lulus_dengan_pindaan" && "You will need to create a Written Directive for YDP signature"}
                      </p>
                    </div>
                  )}
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}