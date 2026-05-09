import { SEO } from "@/components/SEO";
import { Layout } from "@/components/Layout";
import { SubmissionForm } from "@/components/SubmissionForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export default function SubmitApplicationPage() {
  return (
    <Layout>
      <SEO title="Submit Application - DC Management System" />
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Submit New Application</h1>
          <p className="text-muted-foreground">
            Submit your development control application for review by the Town Planning & Landscape Department
          </p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Required Documents:</strong> Site plan is mandatory. Floor plans, elevations, and CAD drawings 
            are recommended for faster processing. All documents must be in PDF, DWG, or image format.
          </AlertDescription>
        </Alert>

        <SubmissionForm />
      </div>
    </Layout>
  );
}