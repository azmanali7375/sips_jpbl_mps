/**
 * Display File Number Component
 * Shows no_fail_jpl and no_permohonan_osc stacked
 * matching MPS registry format
 */

import React from "react";

interface DisplayFileNumberProps {
  no_fail_jpl: string;
  no_permohonan_osc: string;
  className?: string;
}

export function DisplayFileNumber({
  no_fail_jpl,
  no_permohonan_osc,
  className = "",
}: DisplayFileNumberProps) {
  return (
    <div className={`font-mono text-sm ${className}`}>
      <div className="font-semibold">{no_fail_jpl}</div>
      <div className="text-muted-foreground">{no_permohonan_osc}</div>
    </div>
  );
}

/**
 * Compact version for tables
 */
export function DisplayFileNumberCompact({
  no_fail_jpl,
  no_permohonan_osc,
  className = "",
}: DisplayFileNumberProps) {
  return (
    <div className={`font-mono text-xs leading-tight ${className}`}>
      <div className="font-medium">{no_fail_jpl}</div>
      <div className="text-muted-foreground text-[10px]">{no_permohonan_osc}</div>
    </div>
  );
}