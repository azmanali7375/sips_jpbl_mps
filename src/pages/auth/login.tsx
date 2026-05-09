import { SEO } from "@/components/SEO";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <>
      <SEO title="Log Masuk - Sistem SPC MPS" />
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-serif font-bold text-primary mb-2">
              Sistem SPC MPS
            </h1>
            <p className="text-muted-foreground">
              Log masuk ke akaun anda
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </>
  );
}