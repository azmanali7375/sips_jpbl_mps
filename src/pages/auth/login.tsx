import { SEO } from "@/components/SEO";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <>
      <SEO 
        title="Sign In - DC Management System"
        description="Sign in to access the Development Control Management System for Segamat Municipal Council"
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
          <LoginForm />
        </div>
      </div>
    </>
  );
}