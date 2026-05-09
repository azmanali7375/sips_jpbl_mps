import { SEO } from "@/components/SEO";
import { Layout } from "@/components/Layout";
import { SubmissionForm } from "@/components/SubmissionForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export default function SubmitApplicationPage() {
  return (
    <Layout>
      <SEO title="Hantar Permohonan - Sistem SPC MPS" />
      
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold mb-2">Hantar Permohonan Baharu</h1>
          <p className="text-muted-foreground">
            Isi butiran projek dan muat naik dokumen yang diperlukan
          </p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Pastikan semua dokumen lengkap sebelum menghantar permohonan. 
            Anda akan menerima nombor rujukan selepas permohonan dihantar.
          </AlertDescription>
        </Alert>

        <SubmissionForm />
      </div>
    </Layout>
  );
}