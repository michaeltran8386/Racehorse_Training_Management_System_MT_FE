import { useState } from "react";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { Alert } from "@/shared/components/ui/Alert";
import { Field } from "@/shared/components/form/Field";
import { Input } from "@/shared/components/form/Input";
import { Select } from "@/shared/components/form/Select";
import { Textarea } from "@/shared/components/form/Textarea";
import { Checkbox } from "@/shared/components/form/Checkbox";
import { useToast } from "@/shared/components/ui/Toast";
import { messageFor } from "@/shared/lib/messages";
import { createStall, createZone, updateStall, updateZone } from "../api";
import type { SettableStallStatus, Stall, Zone } from "../types";
import { STALL_STATUS_OPTIONS } from "../types";
import { tr } from "@/shared/i18n/tr";

function confirmDiscard(dirty: boolean) {
  return !dirty || window.confirm(tr("Discard the changes you entered?"));
}

/** DL-1.14 Thêm / Sửa khu chuồng (Modal). */
export function ZoneDialog({
  zone,
  onClose,
  onSaved,
}: {
  zone?: Zone;
  onClose: () => void;
  onSaved: (z: Zone) => void;
}) {
  const toast = useToast();
  const [code, setCode] = useState(zone?.code ?? "");
  const [name, setName] = useState(zone?.name ?? "");
  const [rows, setRows] = useState(String(zone?.rows ?? 1));
  const [cols, setCols] = useState(String(zone?.cols ?? 1));
  const [description, setDescription] = useState(zone?.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(zone?.sortOrder ?? 0));
  const [autoCreate, setAutoCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);

  const errors = {
    code: zone || /^[A-Z0-9-]{1,20}$/.test(code) ? "" : tr("Zone code: upper-case letters, digits and hyphens, at most 20 characters."),
    name: name.trim().length >= 2 && name.trim().length <= 100 ? "" : tr("Zone name must be 2 to 100 characters."),
    rows: Number(rows) >= 1 && Number(rows) <= 4 && Number.isInteger(Number(rows)) ? "" : tr("Rows must be between 1 and 4."),
    cols: Number(cols) >= 1 && Number(cols) <= 4 && Number.isInteger(Number(cols)) ? "" : tr("Columns must be between 1 and 4."),
    description: description.length <= 500 ? "" : tr("Description can be at most 500 characters."),
    sortOrder: Number(sortOrder) >= 0 && Number(sortOrder) <= 9999 ? "" : tr("Display order must be between 0 and 9999."),
  };
  const valid = Object.values(errors).every((e) => !e);
  const touch = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setDirty(true);
  };

  async function save() {
    setBusy(true);
    setError("");
    const body = {
      name: name.trim(),
      rows: Number(rows),
      cols: Number(cols),
      description: description.trim() || undefined,
      sortOrder: Number(sortOrder),
    };
    try {
      const saved = zone
        ? await updateZone(zone.id, body)
        : await createZone({ ...body, code, autoCreateStalls: autoCreate });
      toast.show(tr("Saved."), "ok");
      onSaved(saved);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  const close = () => confirmDiscard(dirty) && onClose();
  return (
    <Modal
      title={zone ? tr(`Edit zone ${zone.code}`) : tr("Add barn zone")}
      width={560}
      onClose={close}
      foot={
        <>
          <Button tone="secondary" onClick={close}>{tr("Cancel")}</Button>
          <Button disabled={!valid || busy} onClick={save}>{busy ? tr("Saving…") : tr("Save")}</Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: "0.9rem" }}>
        {error && <Alert tone="danger" title={error} />}
        <Field label={tr("Zone code")} required error={dirty ? errors.code : undefined} hint={zone ? tr("The code cannot change.") : undefined}>
          <Input value={code} disabled={!!zone} onChange={(e) => touch(setCode)(e.target.value.toUpperCase())} />
        </Field>
        <Field label={tr("Zone name")} required error={dirty ? errors.name : undefined}>
          <Input value={name} onChange={(e) => touch(setName)(e.target.value)} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <Field label={tr("Rows")} required error={errors.rows || undefined} hint={tr("1 to 4 rows")}>
            <Input type="number" min={1} max={4} value={rows} onChange={(e) => touch(setRows)(e.target.value)} />
          </Field>
          <Field label={tr("Columns")} required error={errors.cols || undefined} hint={tr("1 to 4 columns (max 16 stalls)")}>
            <Input type="number" min={1} max={4} value={cols} onChange={(e) => touch(setCols)(e.target.value)} />
          </Field>
        </div>
        {!zone && (
          <Checkbox
            checked={autoCreate}
            onChange={touch(setAutoCreate)}
            label={tr(`Create a stall for every grid position (${code || "CODE"}-01 …)`)}
          />
        )}
        <Field label={tr("Description")} error={errors.description || undefined}>
          <Textarea rows={2} value={description} onChange={(e) => touch(setDescription)(e.target.value)} />
        </Field>
        <Field label={tr("Display order")} required error={errors.sortOrder || undefined}>
          <Input type="number" min={0} max={9999} value={sortOrder} onChange={(e) => touch(setSortOrder)(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

/** DL-1.15 Thêm / Sửa ô chuồng (Modal). */
export function StallDialog({
  zone: initialZone,
  zones,
  stall,
  onClose,
  onSaved,
}: {
  zone?: Zone;
  zones?: Zone[];
  stall?: Stall;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [selectedZoneId, setSelectedZoneId] = useState<string>(
    initialZone?.id ?? stall?.zoneId ?? (zones && zones[0]?.id) ?? "",
  );

  const activeZone = initialZone ?? zones?.find((z) => z.id === selectedZoneId) ?? null;
  const zonePrefix = activeZone ? `${activeZone.code}-` : "";

  const [code, setCode] = useState(stall?.code ?? zonePrefix);
  const [row, setRow] = useState(String(stall?.row ?? 1));
  const [col, setCol] = useState(String(stall?.col ?? 1));
  const [status, setStatus] = useState<SettableStallStatus>(
    stall && stall.status !== "OCCUPIED" ? (stall.status as SettableStallStatus) : "AVAILABLE",
  );
  const [notes, setNotes] = useState(stall?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const occupied = !!stall?.allocations.length;

  const maxRows = activeZone?.rows ?? 4;
  const maxCols = activeZone?.cols ?? 4;

  const errors = {
    zone: activeZone ? "" : tr("Please select a barn zone."),
    code: /^[A-Z0-9-]{2,20}$/.test(code) ? "" : tr("Stall code: 2 to 20 upper-case letters, digits or hyphens."),
    row: Number(row) >= 1 && Number(row) <= maxRows ? "" : tr("Row must be between 1 and {{max}}.", { max: maxRows }),
    col: Number(col) >= 1 && Number(col) <= maxCols ? "" : tr("Column must be between 1 and {{max}}.", { max: maxCols }),
    notes: notes.length <= 500 ? "" : tr("Notes can be at most 500 characters."),
  };
  const valid = Object.values(errors).every((e) => !e);
  const touch = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setDirty(true);
  };

  async function save() {
    if (!activeZone) return;
    setBusy(true);
    setError("");
    const body = { code, row: Number(row), col: Number(col), status, notes: notes.trim() || undefined };
    try {
      if (stall) await updateStall(stall.id, body);
      else await createStall({ ...body, zoneId: activeZone.id });
      toast.show(tr("Saved."), "ok");
      onSaved();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  const close = () => confirmDiscard(dirty) && onClose();
  return (
    <Modal
      title={stall ? tr(`Edit stall ${stall.code}`) : tr("Add stall")}
      subtitle={activeZone ? tr(`Zone: ${activeZone.name}`) : undefined}
      width={560}
      onClose={close}
      foot={
        <>
          <Button tone="secondary" onClick={close}>{tr("Cancel")}</Button>
          <Button disabled={!valid || busy} onClick={save}>{busy ? tr("Saving…") : tr("Save")}</Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: "0.9rem" }}>
        {error && <Alert tone="danger" title={error} />}
        {!initialZone && zones && zones.length > 0 && (
          <Field label={tr("Barn zone")} required error={errors.zone || undefined}>
            <Select
              value={selectedZoneId}
              disabled={!!stall}
              onChange={(e) => {
                setSelectedZoneId(e.target.value);
                const targetZ = zones.find((z) => z.id === e.target.value);
                if (targetZ && !stall) {
                  setCode(`${targetZ.code}-`);
                }
              }}
              options={zones.map((z) => ({ value: z.id, label: `${z.name} (${z.code})` }))}
            />
          </Field>
        )}
        <Field label={tr("Stall code")} required error={dirty ? errors.code : undefined}>
          <Input value={code} onChange={(e) => touch(setCode)(e.target.value.toUpperCase())} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <Field label={tr("Row")} required error={errors.row || undefined}>
            <Input type="number" min={1} max={maxRows} value={row} onChange={(e) => touch(setRow)(e.target.value)} />
          </Field>
          <Field label={tr("Column")} required error={errors.col || undefined}>
            <Input type="number" min={1} max={maxCols} value={col} onChange={(e) => touch(setCol)(e.target.value)} />
          </Field>
        </div>
        <Field label={tr("Status")} required hint={occupied ? tr("A stall with a horse can only be Active.") : undefined}>
          <Select
            value={status}
            disabled={occupied}
            onChange={(e) => touch(setStatus)(e.target.value as SettableStallStatus)}
            options={STALL_STATUS_OPTIONS}
          />
        </Field>
        <Field label={tr("Notes")} error={errors.notes || undefined}>
          <Textarea rows={3} value={notes} onChange={(e) => touch(setNotes)(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
