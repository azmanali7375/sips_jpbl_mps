import { SEO } from "@/components/SEO";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <>
      <SEO title="Daftar Akaun - Sistem SPC MPS" />
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-serif font-bold text-primary mb-2">
              Sistem SPC MPS
            </h1>
            <p className="text-muted-foreground">
              Cipta akaun baharu
            </p>
          </div>
          <RegisterForm />
        </div>
      </div>
    </>
  );
}