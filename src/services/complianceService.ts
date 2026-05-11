import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Application } from "./applicationService";

export type ComplianceRule = Tables<"compliance_rules">;

export interface ComplianceResult {
  rule_id: string;
  rule_name: string;
  rule_type: string;
  passed: boolean;
  expected_value?: string;
  actual_value?: string;
  message: string;
  severity: "critical" | "warning" | "info";
}

export interface ComplianceCheckResult {
  application_id: string;
  check_date: string;
  overall_status: "passed" | "failed" | "warning";
  total_rules: number;
  passed_rules: number;
  failed_rules: number;
  results: ComplianceResult[];
}

export const complianceService = {
  // Rule Management (Admin)
  async getAllRules(includeInactive = false): Promise<ComplianceRule[]> {
    let query = supabase
      .from("compliance_rules")
      .select("*")
      .order("rule_type");

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching compliance rules:", error);
      return [];
    }

    return data || [];
  },

  async createRule(rule: Omit<ComplianceRule, "id" | "created_at" | "updated_at">): Promise<ComplianceRule | null> {
    const { data, error } = await supabase
      .from("compliance_rules")
      .insert(rule)
      .select()
      .single();

    if (error) {
      console.error("Error creating rule:", error);
      return null;
    }

    return data;
  },

  async updateRule(id: string, updates: Partial<ComplianceRule>): Promise<ComplianceRule | null> {
    const { data, error } = await supabase
      .from("compliance_rules")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating rule:", error);
      return null;
    }

    return data;
  },

  async deleteRule(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("compliance_rules")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting rule:", error);
      return false;
    }

    return true;
  },

  async toggleRuleStatus(id: string, isActive: boolean): Promise<boolean> {
    const { error } = await supabase
      .from("compliance_rules")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Error toggling rule status:", error);
      return false;
    }

    return true;
  },

  // Compliance Checking
  async performComplianceCheck(application: Application): Promise<ComplianceCheckResult> {
    const rules = await this.getAllRules();
    const results: ComplianceResult[] = [];

    for (const rule of rules) {
      // Filter rules by zone type if specified
      if (rule.zone_type && rule.zone_type !== application.land_use_zone) {
        continue;
      }

      let result: ComplianceResult | null = null;

      switch (rule.rule_type) {
        case "plot_ratio":
          result = this.checkPlotRatio(application, rule);
          break;
        case "height":
          result = this.checkHeight(application, rule);
          break;
        case "setback":
          result = this.checkSetback(application, rule);
          break;
        case "zoning":
          result = this.checkZoning(application, rule);
          break;
        default:
          continue;
      }

      if (result) {
        results.push(result);
      }
    }

    const passedRules = results.filter(r => r.passed).length;
    const failedRules = results.filter(r => !r.passed).length;
    const criticalFailures = results.filter(r => !r.passed && r.severity === "critical").length;

    return {
      application_id: application.id,
      check_date: new Date().toISOString(),
      overall_status: criticalFailures > 0 ? "failed" : failedRules > 0 ? "warning" : "passed",
      total_rules: results.length,
      passed_rules: passedRules,
      failed_rules: failedRules,
      results,
    };
  },

  checkPlotRatio(application: Application, rule: ComplianceRule): ComplianceResult {
    const plotRatio = application.plot_ratio || 0;
    const maxRatio = Number(rule.max_value) || Infinity;
    const minRatio = Number(rule.min_value) || 0;

    const passed = plotRatio >= minRatio && plotRatio <= maxRatio;

    return {
      rule_id: rule.id,
      rule_name: rule.rule_name,
      rule_type: rule.rule_type,
      passed,
      expected_value: minRatio === 0 ? `Max ${maxRatio}` : `${minRatio} - ${maxRatio}`,
      actual_value: plotRatio.toFixed(2),
      message: passed
        ? `Nisbah plot ${plotRatio.toFixed(2)} mematuhi ${rule.rule_name}`
        : `Nisbah plot ${plotRatio.toFixed(2)} melebihi had maksimum ${maxRatio}`,
      severity: "critical",
    };
  },

  checkHeight(application: Application, rule: ComplianceRule): ComplianceResult {
    const height = Number(application.building_height) || 0;
    const maxHeight = Number(rule.max_value) || Infinity;
    const minHeight = Number(rule.min_value) || 0;

    const passed = height >= minHeight && height <= maxHeight;

    return {
      rule_id: rule.id,
      rule_name: rule.rule_name,
      rule_type: rule.rule_type,
      passed,
      expected_value: minHeight > 0 ? `${minHeight}m - ${maxHeight}m` : `Max ${maxHeight}m`,
      actual_value: `${height}m`,
      message: passed
        ? `Ketinggian bangunan ${height}m mematuhi ${rule.rule_name}`
        : `Ketinggian bangunan ${height}m melebihi had maksimum ${maxHeight}m`,
      severity: "critical",
    };
  },

  checkSetback(application: Application, rule: ComplianceRule): ComplianceResult {
    let setbackValue = 0;
    let setbackType = "";

    const ruleName = rule.rule_name.toLowerCase();
    if (ruleName.includes("front") || ruleName.includes("hadapan")) {
      setbackValue = Number(application.setback_front) || 0;
      setbackType = "Hadapan";
    } else if (ruleName.includes("rear") || ruleName.includes("belakang")) {
      setbackValue = Number(application.setback_rear) || 0;
      setbackType = "Belakang";
    } else if (ruleName.includes("side") || ruleName.includes("sisi")) {
      setbackValue = Number(application.setback_side) || 0;
      setbackType = "Sisi";
    }

    const minSetback = Number(rule.min_value) || 0;
    const passed = setbackValue >= minSetback;

    return {
      rule_id: rule.id,
      rule_name: rule.rule_name,
      rule_type: rule.rule_type,
      passed,
      expected_value: `Min ${minSetback}m`,
      actual_value: `${setbackValue}m`,
      message: passed
        ? `Ruang legar ${setbackType.toLowerCase()} ${setbackValue}m mematuhi ${rule.rule_name}`
        : `Ruang legar ${setbackType.toLowerCase()} ${setbackValue}m kurang daripada minimum ${minSetback}m`,
      severity: "critical",
    };
  },

  checkZoning(application: Application, rule: ComplianceRule): ComplianceResult {
    const zone = application.land_use_zone || "";
    const allowedZone = rule.zone_type || "";
    
    const passed = !allowedZone || zone === allowedZone;

    return {
      rule_id: rule.id,
      rule_name: rule.rule_name,
      rule_type: rule.rule_type,
      passed,
      expected_value: allowedZone,
      actual_value: zone,
      message: passed
        ? `Zon kegunaan tanah ${zone} adalah sah`
        : `Zon kegunaan tanah ${zone} tidak dibenarkan untuk jenis pembangunan ini`,
      severity: "critical",
    };
  },

  // Save compliance results to database
  async saveComplianceCheck(
    applicationId: string,
    checkResult: ComplianceCheckResult
  ): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("reviews")
      .insert({
        application_id: applicationId,
        officer_id: user.id,
        comment: `Semakan pematuhan automatik: ${checkResult.overall_status === "passed" ? "LULUS" : checkResult.overall_status === "failed" ? "GAGAL" : "AMARAN"}`,
        decision: "pending",
        compliance_results: checkResult as any,
      });

    if (error) {
      console.error("Error saving compliance check:", error);
      return false;
    }

    return true;
  },

  // Get latest compliance check for an application
  async getLatestComplianceCheck(applicationId: string): Promise<ComplianceCheckResult | null> {
    const { data, error } = await supabase
      .from("reviews")
      .select("compliance_results, created_at")
      .eq("application_id", applicationId)
      .not("compliance_results", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return data.compliance_results as any;
  },

  // Generate compliance report
  generateComplianceReport(
    application: Application,
    checkResult: ComplianceCheckResult
  ): string {
    const statusText = {
      passed: "LULUS",
      failed: "GAGAL",
      warning: "LULUS DENGAN SYARAT"
    };

    let report = `LAPORAN SEMAKAN PEMATUHAN AUTOMATIK\n`;
    report += `===========================================\n\n`;
    report += `No. Penjejakan: ${application.tracking_number}\n`;
    report += `Nama Projek: ${application.project_name}\n`;
    report += `Lokasi: ${application.location}\n`;
    report += `Zon Kegunaan Tanah: ${application.land_use_zone || "N/A"}\n`;
    report += `Tarikh Semakan: ${new Date(checkResult.check_date).toLocaleDateString("ms-MY")}\n\n`;
    
    report += `STATUS KESELURUHAN: ${statusText[checkResult.overall_status]}\n`;
    report += `Jumlah Peraturan Disemak: ${checkResult.total_rules}\n`;
    report += `Lulus: ${checkResult.passed_rules}\n`;
    report += `Gagal: ${checkResult.failed_rules}\n\n`;

    report += `BUTIRAN SEMAKAN:\n`;
    report += `===========================================\n\n`;

    checkResult.results.forEach((result, index) => {
      report += `${index + 1}. ${result.rule_name}\n`;
      report += `   Status: ${result.passed ? "✓ LULUS" : "✗ GAGAL"}\n`;
      report += `   Jenis: ${result.rule_type.toUpperCase()}\n`;
      report += `   Nilai Dijangka: ${result.expected_value}\n`;
      report += `   Nilai Sebenar: ${result.actual_value}\n`;
      report += `   Keterangan: ${result.message}\n\n`;
    });

    if (checkResult.overall_status === "failed") {
      report += `\nTINDAKAN DIPERLUKAN:\n`;
      report += `===========================================\n`;
      const failures = checkResult.results.filter(r => !r.passed);
      failures.forEach((failure, index) => {
        report += `${index + 1}. ${failure.message}\n`;
      });
    }

    report += `\n\n--- Laporan dijana secara automatik oleh Sistem DC MPS ---`;

    return report;
  }
};