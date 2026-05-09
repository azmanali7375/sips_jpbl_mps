import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Application } from "./applicationService";

export type ComplianceRule = Tables<"compliance_rules">;

export interface ComplianceResult {
  rule_name: string;
  rule_type: string;
  passed: boolean;
  expected_value?: string;
  actual_value?: string;
  message: string;
}

export const complianceService = {
  async getAllRules(): Promise<ComplianceRule[]> {
    const { data, error } = await supabase
      .from("compliance_rules")
      .select("*")
      .eq("is_active", true)
      .order("rule_type");

    if (error) {
      console.error("Error fetching compliance rules:", error);
      return [];
    }

    return data || [];
  },

  async checkCompliance(application: Application): Promise<ComplianceResult[]> {
    const rules = await this.getAllRules();
    const results: ComplianceResult[] = [];

    for (const rule of rules) {
      // Filter rules by zone type if specified
      if (rule.zone_type && rule.zone_type !== application.land_use_zone) {
        continue;
      }

      let result: ComplianceResult;

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
        default:
          continue;
      }

      results.push(result);
    }

    return results;
  },

  checkPlotRatio(application: Application, rule: ComplianceRule): ComplianceResult {
    const plotRatio = application.plot_ratio || 0;
    const maxRatio = rule.max_value || Infinity;
    const minRatio = rule.min_value || 0;

    const passed = plotRatio >= minRatio && plotRatio <= maxRatio;

    return {
      rule_name: rule.rule_name,
      rule_type: rule.rule_type,
      passed,
      expected_value: `${minRatio} - ${maxRatio}`,
      actual_value: plotRatio.toString(),
      message: passed
        ? `Plot ratio complies with ${rule.rule_name}`
        : `Plot ratio ${plotRatio} exceeds maximum of ${maxRatio}`,
    };
  },

  checkHeight(application: Application, rule: ComplianceRule): ComplianceResult {
    const height = application.building_height || 0;
    const maxHeight = rule.max_value || Infinity;

    const passed = height <= maxHeight;

    return {
      rule_name: rule.rule_name,
      rule_type: rule.rule_type,
      passed,
      expected_value: `Max ${maxHeight}m`,
      actual_value: `${height}m`,
      message: passed
        ? `Building height complies with ${rule.rule_name}`
        : `Building height ${height}m exceeds maximum of ${maxHeight}m`,
    };
  },

  checkSetback(application: Application, rule: ComplianceRule): ComplianceResult {
    let setbackValue = 0;
    let setbackType = "";

    if (rule.rule_name.toLowerCase().includes("front")) {
      setbackValue = application.setback_front || 0;
      setbackType = "Front";
    } else if (rule.rule_name.toLowerCase().includes("rear")) {
      setbackValue = application.setback_rear || 0;
      setbackType = "Rear";
    } else if (rule.rule_name.toLowerCase().includes("side")) {
      setbackValue = application.setback_side || 0;
      setbackType = "Side";
    }

    const minSetback = rule.min_value || 0;
    const passed = setbackValue >= minSetback;

    return {
      rule_name: rule.rule_name,
      rule_type: rule.rule_type,
      passed,
      expected_value: `Min ${minSetback}m`,
      actual_value: `${setbackValue}m`,
      message: passed
        ? `${setbackType} setback complies with ${rule.rule_name}`
        : `${setbackType} setback ${setbackValue}m is less than minimum ${minSetback}m`,
    };
  },

  async saveComplianceResults(
    applicationId: string,
    results: ComplianceResult[]
  ): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from("reviews")
      .insert({
        application_id: applicationId,
        officer_id: user.id,
        comment: "Automated compliance check completed",
        decision: "pending",
        compliance_results: results as any,
      });

    if (error) {
      console.error("Error saving compliance results:", error);
      return false;
    }

    return true;
  }
};