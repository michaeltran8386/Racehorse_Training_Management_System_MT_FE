import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { tr } from "@/shared/i18n/tr";
import type { BarnStaffingItem } from "../api";

interface BarnSlotPickerProps {
  value?: string;
  onChange: (barnId: string) => void;
  barns: BarnStaffingItem[];
  error?: string;
  mode?: "trainer" | "groom";
}

function formatTimeRemaining(createdAt?: string): string {
  if (!createdAt) return tr("Invited");
  const created = new Date(createdAt).getTime();
  const expiresAt = created + 48 * 3600 * 1000;
  const diffMs = expiresAt - Date.now();
  if (diffMs <= 0) return tr("Expired 48h");
  const hours = Math.floor(diffMs / (3600 * 1000));
  return tr("{{hours}}h left", { hours });
}

export function BarnSlotPicker({ value, onChange, barns, error, mode = "trainer" }: BarnSlotPickerProps) {
  useTranslation();
  const [hoveredSlotKey, setHoveredSlotKey] = useState<string | null>(null);
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);

  const slotIndices = mode === "groom" ? [0, 1, 2, 3] : [0, 1];

  // Tự động đồng bộ slot được chọn với value (nếu có chuồng được chọn từ ngoài)
  useEffect(() => {
    if (!value) {
      setSelectedSlotKey(null);
      return;
    }
    // Nếu slot đang chọn đã thuộc chuồng value thì giữ nguyên
    if (selectedSlotKey && selectedSlotKey.startsWith(`${value}-`)) {
      return;
    }
    // Nếu chưa có slot cụ thể, chọn slot trống đầu tiên của chuồng
    const b = barns.find((item) => item.id === value);
    if (b) {
      const items = mode === "groom" ? (b.grooms || []) : b.trainers;
      const emptyIdx = slotIndices.find((idx) => !items[idx]);
      if (emptyIdx !== undefined) {
        setSelectedSlotKey(`${value}-${emptyIdx}`);
      }
    }
  }, [value, barns, mode]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "var(--fs-caption, 12px)", fontWeight: 600, color: "var(--text)" }}>
          {tr("Assigned Barn Map")} <span style={{ color: "var(--danger, #DC2626)" }}>*</span>
        </span>
        <span style={{ fontSize: "11px", color: "var(--muted)" }}>
          {mode === "groom" ? tr("Limit: Max 4 Grooms / Barn") : tr("Limit: Max 2 Trainers / Barn")}
        </span>
      </div>

      <div
        style={{
          maxHeight: 270,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          paddingRight: 4,
        }}
      >
        {barns.map((b) => {
          const isFull = mode === "groom" ? (b.isGroomFull ?? (b.groomsCount ?? 0) >= 4) : b.isFull;
          const currentCount = mode === "groom" ? (b.groomsCount ?? b.grooms?.length ?? 0) : b.trainersCount;
          const maxCount = mode === "groom" ? 4 : 2;
          const roleLabel = mode === "groom" ? tr("Groom") : tr("Trainer");
          const hasSelectedSlot = selectedSlotKey && selectedSlotKey.startsWith(`${b.id}-`);

          return (
            <div
              key={b.id}
              style={{
                borderRadius: 8,
                border: hasSelectedSlot ? "1px solid var(--brand, #2563EB)" : "1px solid var(--border, #E2E8F0)",
                backgroundColor: "var(--surface, #FFFFFF)",
                padding: "10px 12px",
                opacity: isFull ? 0.65 : 1,
                transition: "all 0.15s ease",
              }}
            >
              {/* Header chuồng: Tên chuồng và định mức */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text)" }}>
                  {b.name}
                </span>

                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: isFull ? "var(--muted)" : "var(--text-2, #475569)",
                    backgroundColor: "var(--surface-2, #F1F5F9)",
                    padding: "2px 8px",
                    borderRadius: 4,
                  }}
                >
                  {isFull
                    ? tr("At capacity ({{count}}/{{max}} {{role}})", { count: maxCount, max: maxCount, role: roleLabel })
                    : `${currentCount}/${maxCount} ${roleLabel}`}
                </span>
              </div>

              {/* Lưới vị trí ghế ngồi */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {slotIndices.map((slotIdx) => {
                  const person = mode === "groom" ? b.grooms?.[slotIdx] : b.trainers[slotIdx];
                  const slotKey = `${b.id}-${slotIdx}`;

                  // Vị trí đã có người (Chính thức hoặc Đang mời)
                  if (person) {
                    const isInvited = person.status === "INVITED";
                    return (
                      <div
                        key={person.id || slotKey}
                        style={{
                          backgroundColor: "var(--surface-2, #F1F5F9)",
                          borderRadius: 6,
                          border: isInvited ? "1px dashed #F59E0B" : "1px solid var(--border, #E2E8F0)",
                          padding: "8px 10px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 3,
                          cursor: "not-allowed",
                        }}
                        title={isInvited ? tr("Reserved for a pending invitation") : tr("Assigned {{role}}", { role: roleLabel })}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--text)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {person.fullName}
                        </span>

                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                          {isInvited ? (
                            <>
                              <span
                                style={{
                                  backgroundColor: "#FEF3C7",
                                  color: "#D97706",
                                  fontWeight: 600,
                                  padding: "1px 4px",
                                  borderRadius: 3,
                                  fontSize: 10,
                                }}
                              >
                                {tr("Invited")}
                              </span>
                              <span style={{ color: "#D97706", fontSize: 10 }}>
                                {formatTimeRemaining(person.createdAt)}
                              </span>
                            </>
                          ) : (
                            <>
                              <span
                                style={{
                                  backgroundColor: "#DCFCE7",
                                  color: "#15803D",
                                  fontWeight: 600,
                                  padding: "1px 4px",
                                  borderRadius: 3,
                                  fontSize: 10,
                                }}
                              >
                                {tr("Active")}
                              </span>
                              <span style={{ color: "var(--muted)", fontSize: 10 }}>
                                {mode === "groom"
                                  ? tr("{{count}}/6 stalls", { count: person.currentLoad ?? 0 })
                                  : tr("{{count}}/8 horses", { count: person.currentLoad ?? 0 })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // Vị trí ghế trống (Chỉ chọn đúng 1 ô duy nhất được click)
                  const isSlotSelected = selectedSlotKey === slotKey;
                  const isHovered = hoveredSlotKey === slotKey && !isSlotSelected;

                  return (
                    <button
                      key={slotKey}
                      type="button"
                      disabled={isFull}
                      onClick={() => {
                        setSelectedSlotKey(slotKey);
                        onChange(b.id);
                      }}
                      onMouseEnter={() => setHoveredSlotKey(slotKey)}
                      onMouseLeave={() => setHoveredSlotKey(null)}
                      style={{
                        backgroundColor: isSlotSelected ? "var(--brand-50, #EFF6FF)" : isHovered ? "var(--brand-50, #EFF6FF)" : "transparent",
                        border: isSlotSelected
                          ? "2px solid var(--brand, #2563EB)"
                          : isHovered
                          ? "1.5px dashed var(--brand, #2563EB)"
                          : "1.5px dashed var(--border-strong, #CBD5E1)",
                        boxShadow: isSlotSelected ? "0 0 0 3px rgba(37,99,235,0.18)" : "none",
                        borderRadius: 6,
                        padding: "8px 10px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 3,
                        textAlign: "left",
                        cursor: isFull ? "not-allowed" : "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: isSlotSelected ? "var(--brand, #2563EB)" : isHovered ? "var(--brand, #2563EB)" : "var(--text)",
                        }}
                      >
                        {isSlotSelected ? tr("Selected Slot") : tr("Available Slot")}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: isSlotSelected ? "var(--brand-700, #1E40AF)" : "var(--muted)",
                          fontWeight: isSlotSelected ? 600 : 400,
                        }}
                      >
                        {isSlotSelected ? tr("Assign {{role}} here", { role: roleLabel }) : tr("Click to select this slot")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <span style={{ color: "var(--danger, #DC2626)", fontSize: "var(--fs-caption, 12px)", marginTop: 2 }}>
          {error}
        </span>
      )}
    </div>
  );
}
