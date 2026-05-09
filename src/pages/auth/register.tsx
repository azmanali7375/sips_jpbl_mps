import { SEO } from "@/components/SEO";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <>
      <SEO 
        title="Register - DC Management System"
        description="Create an account for the Development Control Management System"
      />
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-serif font-bold text-primary">
              DC Management System
            </h1>
            <p className="text-muted-foreground">
              Majlis Perbandaran Segamat
            </p>
          </div>
          <RegisterForm />
        </div>
      </div>
    </>
  );
}