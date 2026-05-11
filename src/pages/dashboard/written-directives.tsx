import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, PenSquare, CheckCircle, Send } from "lucide-react";
import { writtenDirectiveService, type WrittenDirective, type DirectiveStatus } from "@/services/writtenDirectiveService";
import { applicationService } from "@/services/applicationService";
import { profileService } from "@/services/profileService";
import { useToast } from "@/hooks/use-toast";

export default function WrittenDirectivesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [directives, setDirectives] = useState<WrittenDirective[]>([]);
  const [selectedDirective, setSelectedDirective] = useState<WrittenDirective | null>(null);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState("");

  useEffect(() => {
    loadDirectives();
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    const profile = await profileService.getCurrentProfile();
    setCurrentUserRole(profile?.role || "");
  };

  const loadDirectives = async () => {
    setLoading(true);
    const data = await writtenDirectiveService.getAllDirectives();
    setDirectives(data);
    setLoading(false);
  };

  const handleSelectDirective = (directive: WrittenDirective) => {
    setSelectedDirective(directive);
    setEditedContent(directive.directive_content);
    setEditMode(false);
  };

  const handleSaveContent = async () => {
    if (!selectedDirective) return;

    const updated = await writtenDirectiveService.updateDirectiveContent(
      selectedDirective.id,
      editedContent
    );

    if (updated) {
      toast({ title: "Saved", description: "Directive content updated" });
      setSelectedDirective(updated);
      setEditMode(false);
      loadDirectives();
    }
  };

  const handleSubmitForReview = async () => {
    if (!selectedDirective) return;

    const updated = await writtenDirectiveService.submitForReview(selectedDirective.id);
    if (updated) {
      toast({ title: "Submitted", description: "Directive submitted for review" });
      setSelectedDirective(updated);
      loadDirectives();
    }
  };

  const handleSubmitForSignature = async () => {
    if (!selectedDirective) return;

    const profile = await profileService.getCurrentProfile();
    const updated = await writtenDirectiveService.submitForSignature(
      selectedDirective.id,
      profile?.id || ""
    );

    if (updated) {
      toast({ title: "Forwarded", description: "Directive forwarded for YDP signature" });
      setSelectedDirective(updated);
      loadDirectives();
    }
  };

  const handleSign = async () => {
    if (!selectedDirective) return;

    const profile = await profileService.getCurrentProfile();
    const updated = await writtenDirectiveService.signDirective(
      selectedDirective.id,
      profile?.id || ""
    );

    if (updated) {
      toast({ title: "Signed", description: "Directive signed successfully" });
      setSelectedDirective(updated);
      loadDirectives();
    }
  };

  const handleSendToApplicant = async () => {
    if (!selectedDirective) return;

    const updated = await writtenDirectiveService.sendToApplicant(selectedDirective.id);
    if (updated) {
      toast({ title: "Sent", description: "Directive sent to applicant" });
      setSelectedDirective(updated);
      loadDirectives();
    }
  };

  const getStatusBadge = (status: DirectiveStatus) => {
    const variants: Record<DirectiveStatus, { variant: any; label: string }> = {
      draft: { variant: "secondary", label: "Draf" },
      pending_review: { variant: "default", label: "Menunggu Semakan" },
      pending_signature: { variant: "default", label: "Menunggu Tandatangan YDP" },
      signed: { variant: "default", label: "Telah Ditandatangan" },
      sent_to_applicant: { variant: "default", label: "Telah Dihantar" },
    };

    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const canEdit = (directive: WrittenDirective) => {
    return directive.status === "draft" && 
           (currentUserRole === "assistant_planner_j5" || currentUserRole === "unit_head");
  };

  const canReview = (directive: WrittenDirective) => {
    return directive.status === "pending_review" && 
           (currentUserRole === "unit_head" || currentUserRole === "department_head");
  };

  const canSign = (directive: WrittenDirective) => {
    return directive.status === "pending_signature" && currentUserRole === "department_head";
  };

  const canSend = (directive: WrittenDirective) => {
    return directive.status === "signed" && 
           (currentUserRole === "admin_assistant" || currentUserRole === "admin");
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-[#19283a]">Written Directives</h1>
          <p className="text-slate-600 mt-2">Arahan Bertulis untuk Pindaan Pelan - YDP Signature Workflow</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>All Directives</CardTitle>
              <CardDescription>Select a directive to view details</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-slate-500">Loading...</p>
              ) : directives.length === 0 ? (
                <p className="text-sm text-slate-500">No written directives found</p>
              ) : (
                <div className="space-y-2">
                  {directives.map((directive) => (
                    <Button
                      key={directive.id}
                      variant={selectedDirective?.id === directive.id ? "default" : "outline"}
                      className="w-full justify-start text-left"
                      onClick={() => handleSelectDirective(directive)}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {directive.directive_number || "Draft"}
                        </div>
                        <div className="text-xs opacity-75 mt-1">
                          {getStatusBadge(directive.status as DirectiveStatus)}
                        </div>
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
                Directive Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDirective ? (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a directive to view details</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">
                          {selectedDirective.directive_number || "Draft Directive"}
                        </h3>
                        <p className="text-sm text-slate-600 mt-1">
                          Application ID: {selectedDirective.application_id}
                        </p>
                      </div>
                      {getStatusBadge(selectedDirective.status as DirectiveStatus)}
                    </div>
                    {selectedDirective.signed_date && (
                      <p className="text-sm text-slate-600">
                        Signed: {new Date(selectedDirective.signed_date).toLocaleDateString("ms-MY")}
                      </p>
                    )}
                    {selectedDirective.sent_date && (
                      <p className="text-sm text-slate-600">
                        Sent: {new Date(selectedDirective.sent_date).toLocaleDateString("ms-MY")}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Directive Content</Label>
                      {canEdit(selectedDirective) && !editMode && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditMode(true)}
                        >
                          <PenSquare className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      )}
                    </div>

                    {editMode ? (
                      <>
                        <Textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          rows={20}
                          className="font-mono text-sm"
                        />
                        <div className="flex gap-2">
                          <Button onClick={handleSaveContent}>
                            Save Changes
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditMode(false);
                              setEditedContent(selectedDirective.directive_content);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="bg-white border rounded-lg p-4 whitespace-pre-wrap font-mono text-sm max-h-96 overflow-y-auto">
                        {selectedDirective.directive_content}
                      </div>
                    )}
                  </div>

                  {/* Workflow Actions */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t">
                    {selectedDirective.status === "draft" && canEdit(selectedDirective) && (
                      <Button onClick={handleSubmitForReview}>
                        Submit for Review
                      </Button>
                    )}

                    {canReview(selectedDirective) && (
                      <Button onClick={handleSubmitForSignature} variant="default">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Forward for YDP Signature
                      </Button>
                    )}

                    {canSign(selectedDirective) && (
                      <Button onClick={handleSign} variant="default">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Sign Directive (YDP)
                      </Button>
                    )}

                    {canSend(selectedDirective) && (
                      <Button onClick={handleSendToApplicant} variant="default">
                        <Send className="h-4 w-4 mr-2" />
                        Send to Applicant
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}