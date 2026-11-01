import { useEffect, useState } from "react";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Alert } from "@/shared/components/ui/Alert";
import { Field } from "@/shared/components/form/Field";
import { Select } from "@/shared/components/form/Select";
import { SearchSelect } from "@/shared/components/form/SearchSelect";
import { Textarea } from "@/shared/components/form/Textarea";
import { useToast } from "@/shared/components/ui/Toast";
import { messageFor } from "@/shared/lib/messages";
import { getHorses } from "@/features/horses/api";
import type { Horse } from "@/features/horses/types";
import { assignHorse, getGrooms, getStalls, getZones, returnStall, transferHorse, type GroomOption } from "../api";
import type { Stall, Zone } from "../types";

import { tr } from "@/shared/i18n/tr";
const NOTE_MAX = 500;

/** Hủy khi đã nhập: hỏi lại trước khi bỏ (quy ước chung của dialog Flow 1). */
function confirmDiscard(dirty: boolean): boolean {
  return !dirty || window.confirm("Discard the changes you entered?");
}

function positionLabel(s: Stall): string {
  return s.row && s.col ? `${s.code} – Row ${s.row}, Col ${s.col}` : s.code;
}

/** Ô còn nhận ngựa: Hoạt động, trống, khu đang dùng. */
function isFree(s: Stall): boolean {
  return s.status === "AVAILABLE" && s.allocations.length === 0 && s.zoneRef?.isActive !== false;
}

/** Chọn Khu chuồng rồi Ô chuồng trống của khu đó (DL-1.02). */
function useZoneStallPicker(excludeStallId?: string) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [zoneId, setZoneId] = useState("");
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [stallId, setStallId] = useState("");

  useEffect(() => {
    getZones()
      .then((z) => {
        setZones(z);
        if (z[0]) setZoneId(z[0].id);
      })
      .catch(() => setZones([]));
  }, []);

  useEffect(() => {
    if (!zoneId) return;
    let alive = true;
    getStalls({ zoneId })
      .then((list) => {
        if (!alive) return;
        setStalls(list.filter((s) => isFree(s) && s.id !== excludeStallId));
        setStallId("");
      })
      .catch(() => alive && setStalls([]));
    return () => {
      alive = false;
    };
  }, [zoneId, excludeStallId]);

  const fields = (
    <>
      <Field label={tr("Barn zone")} required>
        <Select
          value={zoneId}
          onChange={(e) => setZoneId(e.target.value)}
          options={zones.map((z) => ({ value: z.id, label: z.name }))}
        />
      </Field>
      <Field label={tr("Stall")} required hint={zoneId && stalls.length === 0 ? tr("This zone has no free stall.") : undefined}>
        <Select
          value={stallId}
          onChange={(e) => setStallId(e.target.value)}
          options={[
            { value: "", label: stalls.length ? "— Choose a stall —" : "No free stall" },
            ...stalls.map((s) => ({ value: s.id, label: positionLabel(s) })),
          ]}
        />
      </Field>
    </>
  );
  return { fields, stallId, stall: stalls.find((s) => s.id === stallId), reloadStalls: () => setZoneId((z) => z) };
}

function GroomField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [grooms, setGrooms] = useState<GroomOption[]>([]);
  useEffect(() => {
    getGrooms()
      .then(setGrooms)
      .catch(() => setGrooms([]));
  }, []);
  return (
    <Field label={tr("Groom (optional)")}>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        options={[
          { value: "", label: "— No groom —" },
          ...grooms.map((g) => ({ value: g.id, label: `${g.fullName} · caring for ${g.horseCount} horse(s)` })),
        ]}
      />
    </Field>
  );
}

function NoteField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field
      label={tr("Note")}
      hint={`${value.length}/${NOTE_MAX}`}
      error={value.length > NOTE_MAX ? `Note can be at most ${NOTE_MAX} characters.` : undefined}
    >
      <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

interface AssignProps {
  /** Gán vào ô (từ sơ đồ): ô đã biết, chọn ngựa. */
  stall?: Pick<Stall, "id" | "code">;
  /** Gán ô cho ngựa (từ hồ sơ): ngựa đã biết, chọn khu + ô. */
  horse?: Pick<Horse, "id" | "name">;
  onClose: () => void;
  onDone: () => void;
}

/** DL-1.02 chế độ Gán / Gán vào ô. */
export function AssignStallDialog({ stall, horse, onClose, onDone }: AssignProps) {
  const toast = useToast();
  const picker = useZoneStallPicker();
  const [horses, setHorses] = useState<Horse[]>([]);
  const [horseId, setHorseId] = useState(horse?.id ?? "");
  const [groomId, setGroomId] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (horse) return;
    // Chỉ ngựa chưa có ô và không Ngừng quản lý.
    getHorses({ limit: 100, noStall: "true" })
      .then((res) => setHorses(res.items.filter((h) => h.status !== "RETIRED")))
      .catch((err) => setError(messageFor(err)));
  }, [horse]);

  const targetId = stall?.id ?? picker.stallId;
  const dirty = (!horse && !!horseId) || !!groomId || !!note || (!stall && !!picker.stallId);
  const valid = !!horseId && !!targetId && note.length <= NOTE_MAX;

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await assignHorse(targetId, {
        horseId,
        assignedGroomUserId: groomId || undefined,
        notes: note.trim() || undefined,
      });
      toast.show(tr("Assigned {{horse}} to stall {{stall}}.", { horse: res.horseName, stall: res.stallCode }), "ok");
      onDone();
    } catch (err) {
      setError(messageFor(err));
      if (!stall) picker.reloadStalls();
    } finally {
      setBusy(false);
    }
  }

  const close = () => confirmDiscard(dirty) && onClose();
  return (
    <Modal
      title={stall ? tr("Assign a horse to stall {{stall}}", { stall: stall.code }) : tr("Assign a stall to {{horse}}", { horse: horse?.name ?? "" })}
      width={560}
      onClose={close}
      foot={
        <>
          <Button tone="secondary" onClick={close}>{tr("Cancel")}</Button>
          <Button disabled={!valid || busy} onClick={submit}>{busy ? tr("Assigning…") : tr("Assign stall")}</Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: "0.9rem" }}>
        {error && <Alert tone="danger" title={error} />}
        {!horse && (
          <Field label={tr("Horse")} required hint={horses.length === 0 ? tr("Every active horse already has a stall.") : undefined}>
            <SearchSelect
              value={horseId}
              onChange={setHorseId}
              options={[
                { value: "", label: tr("— Choose a horse —") },
                ...horses.map((h) => ({ value: h.id, label: `${h.name} (${h.horseCode ?? "—"})` })),
              ]}
            />
          </Field>
        )}
        {!stall && picker.fields}
        <GroomField value={groomId} onChange={setGroomId} />
        <NoteField value={note} onChange={setNote} />
      </div>
    </Modal>
  );
}

export interface AllocationRef {
  allocationId: string;
  horseName: string;
  stallId: string;
  stallCode: string;
}

/** DL-1.02 chế độ Chuyển ô. */
export function TransferStallDialog({ allocation, onClose, onDone }: { allocation: AllocationRef; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const picker = useZoneStallPicker(allocation.stallId);
  const [groomId, setGroomId] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = !!picker.stallId || !!groomId || !!note;
  const valid = !!picker.stallId && note.length <= NOTE_MAX;

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await transferHorse(allocation.allocationId, {
        newStallId: picker.stallId,
        assignedGroomUserId: groomId || undefined,
        notes: note.trim() || undefined,
      });
      toast.show(tr("Moved {{horse}} from stall {{from}} to stall {{to}}.", { horse: res.horseName, from: res.fromStallCode, to: res.stallCode }), "ok");
      onDone();
    } catch (err) {
      setError(messageFor(err));
      picker.reloadStalls();
    } finally {
      setBusy(false);
    }
  }

  const close = () => confirmDiscard(dirty) && onClose();
  return (
    <Modal
      title={tr("Move {{horse}} to another stall", { horse: allocation.horseName })}
      subtitle={tr("Current stall: {{stall}}", { stall: allocation.stallCode })}
      width={560}
      onClose={close}
      foot={
        <>
          <Button tone="secondary" onClick={close}>{tr("Cancel")}</Button>
          <Button disabled={!valid || busy} onClick={submit}>{busy ? tr("Moving…") : tr("Move stall")}</Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: "0.9rem" }}>
        {error && <Alert tone="danger" title={error} />}
        {picker.fields}
        <GroomField value={groomId} onChange={setGroomId} />
        <NoteField value={note} onChange={setNote} />
      </div>
    </Modal>
  );
}

/** DL-1.03 Trả ô chuồng. */
export function ReturnStallDialog({ allocation, onClose, onDone }: { allocation: AllocationRef; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await returnStall(allocation.allocationId, { notes: note.trim() || undefined });
      toast.show(tr("Stall {{stall}} released.", { stall: res.stallCode }), "ok");
      onDone();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  const close = () => confirmDiscard(!!note) && onClose();
  return (
    <Modal
      title={tr("Release stall {{stall}}?", { stall: allocation.stallCode })}
      tone="warn"
      width={520}
      onClose={close}
      foot={
        <>
          <Button tone="secondary" onClick={close}>{tr("Cancel")}</Button>
          <Button tone="danger" disabled={busy || note.length > NOTE_MAX} onClick={submit}>
            {busy ? tr("Releasing…") : tr("Release stall")}
          </Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: "0.9rem" }}>
        {error && <Alert tone="danger" title={error} />}
        <p style={{ margin: 0 }}>
          {tr("{{horse}} will no longer have a place on the stable map until a new stall is assigned.", { horse: allocation.horseName })}
        </p>
        <NoteField value={note} onChange={setNote} />
      </div>
    </Modal>
  );
}
