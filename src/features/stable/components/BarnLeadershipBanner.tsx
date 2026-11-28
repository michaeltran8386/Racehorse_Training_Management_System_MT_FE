import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/shared/components/ui/Badge";
import { Icon } from "@/shared/components/ui/Icon";
import { tr } from "@/shared/i18n/tr";
import { getBarnStaffing, type BarnStaffingItem } from "@/features/accounts/api";

interface BarnLeadershipBannerProps {
  zoneId: string;
  zoneName: string;
}

export function BarnLeadershipBanner({ zoneId, zoneName }: BarnLeadershipBannerProps) {
  useTranslation();
  const [barnStaffing, setBarnStaffing] = useState<BarnStaffingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getBarnStaffing()
      .then((data) => {
        if (active) setBarnStaffing(data.barns || []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const barn = barnStaffing.find((b) => b.id === zoneId || b.name === zoneName);
  const trainers = barn?.trainers || [];
  const activeTrainers = trainers.filter((t) => t.status === "ACTIVE");
  const invitedTrainers = trainers.filter((t) => t.status && t.status !== "ACTIVE");
  const trainersCount = activeTrainers.length;
  const maxTrainers = barn?.maxTrainers || 2;

  const grooms = barn?.grooms || [];
  const groomsCount = grooms.length;
  const maxGrooms = barn?.maxGrooms || 4;

  if (loading) {
    return null;
  }

  return (
    <div
      style={{
        background: "var(--surface, #ffffff)",
        border: "1px solid var(--border, #cbd5e1)",
        borderRadius: "12px",
        padding: "14px 18px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
      }}
    >
      {/* Hàng 1: Tiêu đề Barn & Định mức HLV + Groom */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "6px",
              background: "rgba(37, 99, 235, 0.1)",
              color: "var(--brand, #2563eb)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="users" size={17} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "14.5px", fontWeight: 700, color: "var(--ink)" }}>
              {tr("Leadership & Staffing: {{name}}", { name: barn?.name || zoneName || tr("Barn Zone") })}
            </h3>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              {tr("Limit: up to 2 Head Trainers (8 horses/trainer) & 4 Grooms (6 stalls/Groom)")}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          {trainersCount >= maxTrainers ? (
            <Badge tone="ok">{tr("{{count}}/{{max}} Trainers [Full]", { count: trainersCount, max: maxTrainers })}</Badge>
          ) : trainersCount > 0 ? (
            <Badge tone="warn">{tr("{{count}}/{{max}} Trainers [{{left}} open]", { count: trainersCount, max: maxTrainers, left: maxTrainers - trainersCount })}</Badge>
          ) : (
            <Badge tone="danger">{tr("0/{{max}} Trainers [Unstaffed]", { max: maxTrainers })}</Badge>
          )}

          {invitedTrainers.length > 0 && (
            <Badge tone="neutral">{tr("+{{count}} Pending activation", { count: invitedTrainers.length })}</Badge>
          )}

          {groomsCount >= maxGrooms ? (
            <Badge tone="ok">{tr("{{count}}/{{max}} Grooms [Full]", { count: groomsCount, max: maxGrooms })}</Badge>
          ) : groomsCount > 0 ? (
            <Badge tone="warn">{tr("{{count}}/{{max}} Grooms [{{left}} open]", { count: groomsCount, max: maxGrooms, left: maxGrooms - groomsCount })}</Badge>
          ) : (
            <Badge tone="danger">{tr("0/{{max}} Grooms [Unstaffed]", { max: maxGrooms })}</Badge>
          )}
        </div>
      </div>

      {/* Hàng 2: Danh sách Thẻ HLV của Barn */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {tr("Assigned Head Trainers")}
        </span>
        {trainers.length === 0 ? (
          <div
            style={{
              fontSize: "12.5px",
              color: "var(--text-muted)",
              background: "var(--surface-sunken, #f8fafc)",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px dashed var(--border)",
            }}
          >
            {tr("No Head Trainer is assigned to this barn yet.")}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "8px" }}>
            {trainers.map((t) => {
              const isInvited = t.status && t.status !== "ACTIVE";
              const load = t.currentLoad ?? 0;
              const max = t.maxCapacity ?? 8;
              const isFull = load >= max;

              return (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: isInvited
                      ? "var(--surface-sunken, #f8fafc)"
                      : isFull
                      ? "rgba(239, 68, 68, 0.04)"
                      : "var(--surface-sunken, #f8fafc)",
                    border: isInvited
                      ? "1px dashed var(--warning, #f59e0b)"
                      : isFull
                      ? "1px solid rgba(239, 68, 68, 0.3)"
                      : "1px solid var(--border-subtle, #e2e8f0)",
                    borderRadius: "6px",
                    padding: "8px 12px",
                    opacity: isInvited ? 0.85 : 1,
                  }}
                >
                  <div>
                    <strong style={{ fontSize: "13px", color: "var(--ink)" }}>{t.fullName}</strong>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{t.email}</div>
                    {isInvited && (
                      <div style={{ fontSize: "11px", color: "var(--warning, #d97706)", fontStyle: "italic", marginTop: "2px" }}>
                        {tr("Cannot accept horses yet · Pending activation")}
                      </div>
                    )}
                  </div>

                  <div>
                    {isInvited ? (
                      <Badge tone="warn">{tr("Pending activation")}</Badge>
                    ) : isFull ? (
                      <Badge tone="danger">{tr("{{load}}/{{max}} horses [Full]", { load, max })}</Badge>
                    ) : (
                      <Badge tone="ok">{tr("{{load}}/{{max}} horses", { load, max })}</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hàng 3: Danh sách Thẻ Groom của Barn */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {tr("Barn Groom Care Team")}
        </span>
        {grooms.length === 0 ? (
          <div
            style={{
              fontSize: "12.5px",
              color: "var(--text-muted)",
              background: "var(--surface-sunken, #f8fafc)",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px dashed var(--border)",
            }}
          >
            {tr("No Grooms assigned to this barn yet. The Manager can invite Grooms from Accounts.")}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "8px" }}>
            {grooms.map((g) => {
              const load = g.currentLoad ?? 0;
              const max = g.maxCapacity ?? 6;
              const isFull = load >= max;
              const isInvited = g.status === "INVITED";

              return (
                <div
                  key={g.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: isFull ? "rgba(239, 68, 68, 0.04)" : "var(--surface-sunken, #f8fafc)",
                    border: isInvited
                      ? "1px dashed #F59E0B"
                      : isFull
                      ? "1px solid rgba(239, 68, 68, 0.3)"
                      : "1px solid var(--border-subtle, #e2e8f0)",
                    borderRadius: "6px",
                    padding: "8px 12px",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: "13px", color: "var(--ink)" }}>{g.fullName}</strong>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {isInvited ? tr("Pending invitation acceptance") : g.email}
                    </div>
                  </div>

                  <div>
                    {isInvited ? (
                      <Badge tone="warn">{tr("Invited")}</Badge>
                    ) : isFull ? (
                      <Badge tone="danger">{tr("{{load}}/{{max}} stalls [Full]", { load, max })}</Badge>
                    ) : (
                      <Badge tone="ok">{tr("{{load}}/{{max}} stalls", { load, max })}</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
