import { useEffect, useState } from "react";
import Link from "next/link";
import { SEO } from "@/components/SEO";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { applicationService, Application } from "@/services/applicationService";
import { profileService } from "@/services/profileService";
import { FileText, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function DashboardPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [role, setRole] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const profile = await profileService.getCurrentProfile();
      setRole(profile?.role || "");

      if (profile?.role === "applicant") {
        const apps = await applicationService.getMyApplications();
        setApplications(apps);
      } else {
        const apps = await applicationService.getAllApplications();
        setApplications(apps);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Submitted</Badge>;
      case 'under_review':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">Under Review</Badge>;
      case 'revision_requested':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-100">Revision Needed</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted': return <FileText className="h-5 w-5 text-blue-500" />;
      case 'under_review': return <Clock className="h-5 w-5 text-amber-500" />;
      case 'revision_requested': return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'approved': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <Layout>
      <SEO title="Dashboard - DC Management System" />
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              {role === 'applicant' 
                ? "Manage your development control applications." 
                : "Overview of all development control applications."}
            </p>
          </div>
          {role === 'applicant' && (
            <Button asChild>
              <Link href="/dashboard/submit">New Application</Link>
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">{applications.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Under Review</CardTitle>
                  <Clock className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">
                    {applications.filter(a => a.status === 'under_review').length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Approved</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">
                    {applications.filter(a => a.status === 'approved').length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Action Required</CardTitle>
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">
                    {applications.filter(a => a.status === 'revision_requested').length}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Applications</CardTitle>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p>No applications found.</p>
                    {role === 'applicant' && (
                      <Button variant="link" asChild className="mt-2">
                        <Link href="/dashboard/submit">Submit your first application</Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {applications.map((app) => (
                      <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex items-start gap-4 mb-4 sm:mb-0">
                          <div className="mt-1 bg-background p-2 rounded-full border shadow-sm">
                            {getStatusIcon(app.status || '')}
                          </div>
                          <div>
                            <Link href={`/dashboard/applications/${app.id}`} className="font-semibold text-lg hover:underline decoration-primary underline-offset-4">
                              {app.project_name}
                            </Link>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                              <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">
                                {app.tracking_number}
                              </span>
                              <span>•</span>
                              <span className="capitalize">{app.project_type?.replace('_', ' ')}</span>
                              <span>•</span>
                              <span>{format(new Date(app.created_at || ''), 'MMM d, yyyy')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 sm:flex-col sm:items-end">
                          {getStatusBadge(app.status || '')}
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/dashboard/applications/${app.id}`}>
                              View Details
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}