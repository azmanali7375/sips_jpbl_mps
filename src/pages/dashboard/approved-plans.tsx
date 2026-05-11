import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileCheck, Search, Plus } from "lucide-react";
import { approvedPlanService, type ApprovedPlan } from "@/services/approvedPlanService";
import { applicationService, type Application } from "@/services/applicationService";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ApprovedPlansPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [plans, setPlans] = useState<ApprovedPlan[]>([]);
  const [approvedApps, setApprovedApps] = useState<Application[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  const [formData, setFormData] = useState({
    plan_registration_number: "",
    endorsed_date: "",
    endorsed_by: "",
    plan_file_path: "",
    endorsement_stamp_path: "",
    notes: "",
  });

  useEffect(() => {
    loadPlans();
    loadApprovedApplications();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    const data = await approvedPlanService.getAllApprovedPlans();
    setPlans(data);
    setLoading(false);
  };

  const loadApprovedApplications = async () => {
    const apps = await applicationService.getAllApplications({ status: "approved" });
    
    // Filter out apps that already have registered plans
    const filtered = [];
    for (const app of apps) {
      const existingPlan = await approvedPlanService.getPlanByApplicationId(app.id);
      if (!existingPlan) {
        filtered.push(app);
      }
    }
    
    setApprovedApps(filtered);
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadPlans();
      return;
    }

    const results = await approvedPlanService.searchPlans(searchTerm);
    setPlans(results);
  };

  const handleOpenRegisterDialog = (app: Application) => {
    setSelectedApp(app);
    setFormData({
      plan_registration_number: "",
      endorsed_date: "",
      endorsed_by: "",
      plan_file_path: "",
      endorsement_stamp_path: "",
      notes: "",
    });
    setShowRegisterDialog(true);
  };

  const handleRegisterPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    const plan = await approvedPlanService.registerPlan({
      application_id: selectedApp.id,
      ...formData,
    });

    if (plan) {
      toast({
        title: "Plan Registered",
        description: `Plan ${formData.plan_registration_number} has been registered successfully`,
      });
      setShowRegisterDialog(false);
      setSelectedApp(null);
      loadPlans();
      loadApprovedApplications();
    } else {
      toast({
        title: "Error",
        description: "Failed to register plan",
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-[#19283a]">Approved Plans Registry</h1>
          <p className="text-slate-600 mt-2">Pendaftaran Pelan Lulus - Track endorsed approved plans</p>
        </div>

        <div className="grid gap-6">
          {/* Search & Register Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Plan Registry
                </div>
                <Button size="sm" onClick={() => setShowRegisterDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Register New Plan
                </Button>
              </CardTitle>
              <CardDescription>Search and manage registered approved plans</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-6">
                <Input
                  placeholder="Search by registration number, endorser, or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>

              {loading ? (
                <p className="text-sm text-slate-500">Loading plans...</p>
              ) : plans.length === 0 ? (
                <p className="text-sm text-slate-500">No approved plans registered yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Registration No.</TableHead>
                      <TableHead>Application ID</TableHead>
                      <TableHead>Endorsed Date</TableHead>
                      <TableHead>Endorsed By</TableHead>
                      <TableHead>Registration Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">
                          {plan.plan_registration_number}
                        </TableCell>
                        <TableCell className="text-sm">
                          {plan.application_id.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          {new Date(plan.endorsed_date).toLocaleDateString("ms-MY")}
                        </TableCell>
                        <TableCell>{plan.endorsed_by || "-"}</TableCell>
                        <TableCell>
                          {new Date(plan.registration_date).toLocaleDateString("ms-MY")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Pending Registration */}
          {approvedApps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pending Plan Registration</CardTitle>
                <CardDescription>
                  Approved applications awaiting plan registration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {approvedApps.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{app.tracking_number}</p>
                        <p className="text-sm text-slate-600">{app.project_name}</p>
                        <p className="text-xs text-slate-500">
                          Approved: {app.decision_date ? new Date(app.decision_date).toLocaleDateString("ms-MY") : "N/A"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleOpenRegisterDialog(app)}
                      >
                        Register Plan
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Register Plan Dialog */}
      <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Register Approved Plan</DialogTitle>
            <DialogDescription>
              {selectedApp ? (
                <>
                  {selectedApp.tracking_number} - {selectedApp.project_name}
                </>
              ) : (
                "Select an approved application to register its plan"
              )}
            </DialogDescription>
          </DialogHeader>

          {!selectedApp && approvedApps.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {approvedApps.map((app) => (
                <Button
                  key={app.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setSelectedApp(app)}
                >
                  <div className="text-left">
                    <div className="font-medium">{app.tracking_number}</div>
                    <div className="text-sm text-slate-600">{app.project_name}</div>
                  </div>
                </Button>
              ))}
            </div>
          ) : selectedApp ? (
            <form onSubmit={handleRegisterPlan} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="registration_number">Registration Number *</Label>
                  <Input
                    id="registration_number"
                    placeholder="e.g., MPS/LP/2026/001"
                    value={formData.plan_registration_number}
                    onChange={(e) =>
                      setFormData({ ...formData, plan_registration_number: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endorsed_date">Endorsed Date *</Label>
                  <Input
                    id="endorsed_date"
                    type="date"
                    value={formData.endorsed_date}
                    onChange={(e) =>
                      setFormData({ ...formData, endorsed_date: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endorsed_by">Endorsed By</Label>
                <Input
                  id="endorsed_by"
                  placeholder="Name of endorsing officer"
                  value={formData.endorsed_by}
                  onChange={(e) =>
                    setFormData({ ...formData, endorsed_by: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan_file_path">Plan File Path (Storage)</Label>
                <Input
                  id="plan_file_path"
                  placeholder="/plans/approved/..."
                  value={formData.plan_file_path}
                  onChange={(e) =>
                    setFormData({ ...formData, plan_file_path: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endorsement_stamp_path">Endorsement Stamp Path</Label>
                <Input
                  id="endorsement_stamp_path"
                  placeholder="/stamps/..."
                  value={formData.endorsement_stamp_path}
                  onChange={(e) =>
                    setFormData({ ...formData, endorsement_stamp_path: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes or conditions..."
                  rows={3}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowRegisterDialog(false);
                    setSelectedApp(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Register Plan
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <p className="text-sm text-slate-500">
              No approved applications available for plan registration
            </p>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}