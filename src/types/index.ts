export type UserRole = "applicant" | "officer" | "admin";

export type ApplicationStatus = 
  | "submitted" 
  | "under_review" 
  | "revision_requested" 
  | "approved" 
  | "rejected";

export type ProjectType = 
  | "residential" 
  | "commercial" 
  | "industrial" 
  | "mixed_use" 
  | "institutional";

export type DocumentType = 
  | "site_plan" 
  | "floor_plan" 
  | "elevation" 
  | "cad_drawing" 
  | "report" 
  | "other";

export type RuleType = 
  | "plot_ratio" 
  | "setback" 
  | "height" 
  | "zoning" 
  | "custom";

export type ReviewDecision = 
  | "approve" 
  | "reject" 
  | "request_revision" 
  | "pending";

export type NotificationType = 
  | "status_change" 
  | "assignment" 
  | "comment" 
  | "submission";

export type OSCDecisionType = 
  | "lulus" 
  | "tolak" 
  | "lulus_dengan_pindaan";

export type DirectiveStatus = 
  | "draft" 
  | "pending_review" 
  | "pending_signature" 
  | "signed" 
  | "sent_to_applicant";

export type ReportType = 
  | "technical_report" 
  | "recommendation_report" 
  | "written_directive" 
  | "form_c1" 
  | "form_c2";