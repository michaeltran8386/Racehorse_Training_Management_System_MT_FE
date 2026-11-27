import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Icon } from "@/shared/components/ui/Icon";
import { Alert } from "@/shared/components/ui/Alert";
import { Select } from "@/shared/components/form/Select";
import { Field } from "@/shared/components/form/Field";
import { useToast } from "@/shared/components/ui/Toast";
import { tr } from "@/shared/i18n/tr";
import { messageFor } from "@/shared/lib/messages";
import { getGrooms, bulkAssignGroom, type GroomOption } from "../api";
import type { Stall } from "../types";

const MAX_STALLS_PER_GROOM = 6;

interface BulkAssignGroomModalProps {
  zoneId: string;
  zoneName: string;
  stalls: Stall[];
  onClose: () => void;
  onDone: () => void;
}

export function BulkAssignGroomModal({
  zoneId,
  zoneName,
  stalls,
  onClose,
  onDone,
}: BulkAssignGroomModalProps) {
  useTranslation();
  const toast = useToast();
  const [grooms, setGrooms] = useState<GroomOption[]>([]);
  const [selectedGroomId, setSelectedGroomId] = useState<string>("");
  const [selectedAllocationIds, setSelectedAllocationIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Chỉ lấy các ô chuồng ĐANG CÓ NGỰA
  const occupiedStalls = stalls.filter(
    (s) => s.allocations && s.allocations.length > 0 && s.allocations[0]?.isActive,
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    getGrooms()
      .then((data) => {
        if (!active) return;
        setGrooms(data);
        if (data.length > 0) {
          // Mặc định chọn Groom đầu tiên còn slot trống nếu có
          const availableGroom = data.find((g) => g.horseCount < MAX_STALLS_PER_GROOM);
          if (availableGroom) {
            setSelectedGroomId(availableGroom.id);
          } else {
            setSelectedGroomId(data[0].id);
          }
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(messageFor(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedGroom = grooms.find((g) => g.id === selectedGroomId);
  const currentCount = selectedGroom?.horseCount ?? 0;
  const remainingSlots = Math.max(0, MAX_STALLS_PER_GROOM - currentCount);
  const isGroomFull = currentCount >= MAX_STALLS_PER_GROOM;

  // Xử lý toggle checkbox ô chuồng
  const handleToggle = (allocationId: string) => {
    if (selectedAllocationIds.includes(allocationId)) {
      setSelectedAllocationIds(selectedAllocationIds.filter((id) => id !== allocationId));
    } else {
      if (selectedAllocationIds.length >= remainingSlots) {
        return; // Đã chạm trần Smart Lock
      }
      setSelectedAllocationIds([...selectedAllocationIds, allocationId]);
    }
  };

  const handleSelectAllAvailable = () => {
    const idsToTake: string[] = [];
    for (const s of occupiedStalls) {
      const alloc = s.allocations[0];
      if (!alloc) continue;
      if (idsToTake.length < remainingSlots) {
        idsToTake.push(alloc.id);
      }
    }
    setSelectedAllocationIds(idsToTake);
  };

  const handleClearAll = () => {
    setSelectedAllocationIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroomId || selectedAllocationIds.length === 0 || busy) return;
    setBusy(true);
    setError("");

    try {
      const res = await bulkAssignGroom({
        groomUserId: selectedGroomId,
        allocationIds: selectedAllocationIds,
      });
      toast.show(
        tr("Assigned {{count}} stall(s) to Groom {{name}} successfully!", { count: res.count, name: res.groomName }),
        "ok",
      );
      onDone();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={tr("Quick Assign Groom — {{zone}}", { zone: zoneName })}
      subtitle={tr("Assign care staff to multiple occupied stalls at once (hard limit 6 stalls/Groom)")}
      width={620}
      onClose={busy ? undefined : onClose}
      foot={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>
            {tr("Selected:")} <strong style={{ color: "var(--brand)" }}>{selectedAllocationIds.length}</strong> / {tr("{{max}} allowed", { max: remainingSlots })}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <Button tone="ghost" disabled={busy} onClick={onClose}>
              {tr("Cancel")}
            </Button>
            <Button
              tone="primary"
              type="submit"
              form="bulk-assign-groom-form"
              disabled={busy || loading || !selectedGroomId || selectedAllocationIds.length === 0 || isGroomFull}
            >
              {busy ? tr("Saving...") : tr("Assign ({{count}} stalls)", { count: selectedAllocationIds.length })}
            </Button>
          </div>
        </div>
      }
    >
      <form id="bulk-assign-groom-form" onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
        {error && <Alert tone="danger">{error}</Alert>}

        {loading ? (
          <p style={{ textAlign: "center", padding: 20 }}>{tr("Loading Groom list...")}</p>
        ) : (
          <>
            {/* Chọn Groom và thông tin định mức */}
            <div style={{ background: "var(--surface-2)", padding: 14, borderRadius: "var(--r)", border: "1px solid var(--border)" }}>
              <Field label={tr("Select Assigned Groom")} required>
                <Select
                  value={selectedGroomId}
                  onChange={(e) => {
                    setSelectedGroomId(e.target.value);
                    setSelectedAllocationIds([]); // Reset lựa chọn khi đổi Groom
                  }}
                  options={grooms.map((g) => ({
                    value: g.id,
                    label: `${g.fullName} (${tr("{{count}}/{{max}} assigned stalls", { count: g.horseCount, max: MAX_STALLS_PER_GROOM })})`,
                  }))}
                />
              </Field>

              {selectedGroom && (
                <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--fs-caption)" }}>
                    <span>
                      {tr("Current load:")} <strong>{currentCount}/{MAX_STALLS_PER_GROOM}</strong> {tr("stalls")}
                    </span>
                    <span style={{ color: isGroomFull ? "var(--danger)" : "var(--ok)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {isGroomFull ? (
                        <><Icon name="ban" size={14} inline /> {tr("Reached max capacity of 6 stalls (Cannot assign more)")}</>
                      ) : (
                        <><Icon name="checkCircle" size={14} inline /> {tr("Can accept up to {{count}} more stall(s)", { count: remainingSlots })}</>
                      )}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ width: "100%", height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${Math.min(100, (currentCount / MAX_STALLS_PER_GROOM) * 100)}%`,
                        height: "100%",
                        background: isGroomFull ? "var(--danger)" : currentCount >= 4 ? "var(--warn)" : "var(--ok)",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Danh sách các ô chuồng có ngựa trong Barn */}
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: "var(--fs-body)" }}>
                  {tr("Occupied stalls in {{zone}} ({{count}} stalls)", { zone: zoneName, count: occupiedStalls.length })}
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleSelectAllAvailable}
                    disabled={isGroomFull || remainingSlots === 0}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--brand)",
                      fontSize: "var(--fs-caption)",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {tr("Quick select max ({{count}})", { count: remainingSlots })}
                  </button>
                  <span style={{ color: "var(--border)" }}>|</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      fontSize: "var(--fs-caption)",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {tr("Clear selection")}
                  </button>
                </div>
              </div>

              {occupiedStalls.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", border: "1px dashed var(--border)", borderRadius: "var(--r)", color: "var(--text-muted)" }}>
                  {tr("This zone currently has no occupied stalls.")}
                </div>
              ) : (
                <div
                  style={{
                    maxHeight: 280,
                    overflowY: "auto",
                    display: "grid",
                    gap: 6,
                    padding: 4,
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r)",
                    background: "var(--surface)",
                  }}
                >
                  {occupiedStalls.map((s) => {
                    const alloc = s.allocations[0];
                    if (!alloc) return null;
                    const isChecked = selectedAllocationIds.includes(alloc.id);
                    // Lựa chọn A (Smart Lock): Nếu đã đạt trần slot cho phép, các checkbox còn lại bị vô hiệu hóa
                    const isLocked = !isChecked && selectedAllocationIds.length >= remainingSlots;

                    return (
                      <label
                        key={s.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          borderRadius: "var(--r-sm)",
                          background: isChecked ? "var(--surface-2)" : "transparent",
                          border: isChecked ? "1px solid var(--brand)" : "1px solid var(--border-subtle, #eee)",
                          opacity: isLocked || isGroomFull ? 0.45 : 1,
                          cursor: isLocked || isGroomFull ? "not-allowed" : "pointer",
                          transition: "all 0.15s ease",
                        }}
                        title={isLocked ? tr("Reached max {{max}} stalls allowed for this Groom", { max: remainingSlots }) : undefined}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isLocked || isGroomFull}
                            onChange={() => handleToggle(alloc.id)}
                            style={{ cursor: isLocked || isGroomFull ? "not-allowed" : "pointer" }}
                          />
                          <div>
                            <span style={{ fontWeight: 700, marginRight: 8 }}>{s.code}</span>
                            <span>{alloc.horse.name}</span>
                            <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)", marginLeft: 6 }}>
                              ({alloc.horse.horseCode})
                            </span>
                          </div>
                        </div>

                        <div style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>
                          {alloc.assignedGroom ? (
                            <span>{tr("Groom:")} {alloc.assignedGroom.fullName}</span>
                          ) : (
                            <span style={{ color: "#d97706", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="alert" size={13} inline /> {tr("No Groom assigned")}</span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
