import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/shared/components/ui/Icon";
import { Badge } from "@/shared/components/ui/Badge";
import { tr } from "@/shared/i18n/tr";
import type { ReadinessCriteria } from "../lib/readiness";

interface Props {
  criteria: ReadinessCriteria;
}

export function ReadinessChecklistWidget({ criteria }: Props) {
  useTranslation();
  const items = [
    {
      label: tr("1. Health & Fitness"),
      ok: criteria.healthOk,
      details: criteria.healthDetails,
    },
    {
      label: tr("2. Training Plan Progress"),
      ok: criteria.planOk,
      details: criteria.planDetails,
    },
    {
      label: tr("3. Trial Run Score"),
      ok: criteria.scoreOk,
      details: criteria.scoreDetails,
    },
    {
      label: tr("4. 7-Day Workload Safety"),
      ok: criteria.loadOk,
      details: criteria.loadDetails,
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        background: "var(--surface-sunken)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        padding: "1rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 600, fontSize: "var(--fs-body)", color: "var(--text)" }}>
          {tr("Race Readiness Assessment:")}
        </span>
        <Badge tone={criteria.isEligible ? "ok" : "warn"}>
          {criteria.isEligible ? tr("⭐ Race Ready (4/4)") : tr("⚠️ Passed {{count}}/4 criteria", { count: criteria.passedCount })}
        </Badge>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {items.map((it, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.6rem",
              fontSize: "var(--fs-caption)",
              padding: "0.4rem 0.5rem",
              borderRadius: "4px",
              background: it.ok ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
              border: `1px solid ${it.ok ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)"}`,
            }}
          >
            <span style={{ color: it.ok ? "var(--ok)" : "var(--danger)", marginTop: "1px" }}>
              <Icon name={it.ok ? "check" : "x"} size={14} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: "var(--text)" }}>{it.label}</div>
              <div style={{ color: "var(--text-muted)", marginTop: "2px" }}>{it.details}</div>
            </div>
          </div>
        ))}
      </div>

      {!criteria.isEligible && (
        <div style={{ fontSize: "12px", color: "var(--warn)", fontStyle: "italic", marginTop: "2px" }}>
          {tr("💡 Head Trainer notice: This horse has not met all safety criteria. You may still proceed based on on-track assessment.")}
        </div>
      )}
    </div>
  );
}
