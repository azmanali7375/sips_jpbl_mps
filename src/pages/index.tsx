import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authService } from "@/services/authService";
import { FileText, Users, CheckCircle, BarChart3, Clock, Shield } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const session = await authService.getSession();
      setIsAuthenticated(!!session);
      setLoading(false);
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    router.push("/dashboard");
    return null;
  }

  const features = [
    {
      icon: FileText,
      title: "Digital Submissions",
      description: "Upload plans, documents, and submit applications online without visiting the office"
    },
    {
      icon: CheckCircle,
      title: "Automated Compliance",
      description: "Instant checking of plot ratio, setbacks, height limits, and zoning requirements"
    },
    {
      icon: Clock,
      title: "Fast Processing",
      description: "Reduced approval cycles with automated workflows and real-time status tracking"
    },
    {
      icon: Users,
      title: "Multi-role Access",
      description: "Separate portals for applicants, planning officers, and administrators"
    },
    {
      icon: Shield,
      title: "Secure & Compliant",
      description: "Role-based access control with complete audit trail and document version control"
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Track application metrics, approval rates, and processing times"
    }
  ];

  return (
    <>
      <SEO 
        title="Development Control Management System - Majlis Perbandaran Segamat"
        description="Streamlined development control application processing for Segamat Municipal Council"
      />
      
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-serif font-bold text-primary">DC Management</h1>
                <p className="text-xs text-muted-foreground">Majlis Perbandaran Segamat</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link href="/auth/login">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/register">Register</Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground">
              Streamlined Development Control Applications
            </h2>
            <p className="text-lg text-muted-foreground">
              Submit, track, and manage development control applications for the Town Planning & 
              Landscape Department with automated compliance checking and faster approvals
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" asChild>
                <Link href="/auth/register">Get Started</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/auth/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-serif font-bold mb-4">Key Features</h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Modern tools to reduce processing time and standardize development control decisions
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-16">
          <Card className="bg-primary text-primary-foreground">
            <CardHeader className="text-center space-y-4 pb-8">
              <CardTitle className="text-3xl font-serif">Ready to Get Started?</CardTitle>
              <CardDescription className="text-primary-foreground/90 text-lg">
                Create an account today and submit your first development control application
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-8">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/auth/register">Create Account</Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <footer className="border-t bg-muted/50 mt-16">
          <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2026 Majlis Perbandaran Segamat. All rights reserved.</p>
            <p className="mt-2">Town Planning & Landscape Department</p>
          </div>
        </footer>
      </div>
    </>
  );
}