import { useTranslation as useScreenTranslation } from "react-i18next";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { Card } from "@/shared/components/ui/Card";
import styles from "./HorseCatalogPage.module.css";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Alert } from "@/shared/components/ui/Alert";
import { Tabs } from "@/shared/components/ui/Tabs";
import { Modal } from "@/shared/components/ui/Modal";
import { ConfirmModal } from "@/shared/components/ui/ConfirmModal";
import { DataTable } from "@/shared/components/ui/DataTable";
import { Field } from "@/shared/components/form/Field";
import { Input } from "@/shared/components/form/Input";
import { Select } from "@/shared/components/form/Select";
import { Textarea } from "@/shared/components/form/Textarea";
import { useToast } from "@/shared/components/ui/Toast";
import { useCurrentUser } from "@/shared/components/layout/AuthProvider";
import { messageFor } from "@/shared/lib/messages";
import {
  createHorseCatalogItem,
  getHorseCatalog,
  setHorseCatalogItemActive,
  updateHorseCatalogItem,
} from "../api";
import type { HorseCatalogItem, HorseCatalogType } from "../types";

import { tr } from "@/shared/i18n/tr";
const TYPE_LABEL: Record<HorseCatalogType, string> = { BREED: "Breeds", COLOR: "Coat colours" };

/** DL-1.13 Thêm / Sửa mục danh mục. */
function ItemDialog({
  type,
  item,
  onClose,
  onSaved,
}: {
  type: HorseCatalogType;
  item?: HorseCatalogItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [code, setCode] = useState(item?.code ?? "");
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(item?.sortOrder ?? 0));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const errors = {
    code: item || /^[A-Z0-9_]{2,30}$/.test(code) ? "" : "Code: 2 to 30 upper-case letters, digits or underscores.",
    name: name.trim().length >= 2 && name.trim().length <= 100 ? "" : "Name must be 2 to 100 characters.",
    description: description.length <= 500 ? "" : "Description can be at most 500 characters.",
    sortOrder:
      Number.isInteger(Number(sortOrder)) && Number(sortOrder) >= 0 && Number(sortOrder) <= 9999
        ? ""
        : "Display order must be between 0 and 9999.",
  };
  const valid = Object.values(errors).every((e) => !e);
  const touch = (set: (v: string) => void) => (v: string) => {
    set(v);
    setDirty(true);
  };

  async function save() {
    setBusy(true);
    setError("");
    try {
      const body = { name: name.trim(), description: description.trim() || undefined, sortOrder: Number(sortOrder) };
      if (item) await updateHorseCatalogItem(item.id, body);
      else await createHorseCatalogItem({ type, code, ...body });
      toast.show("Saved.", "ok");
      onSaved();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  const close = () => (!dirty || window.confirm("Discard the changes you entered?")) && onClose();
  return (
    <Modal
      title={`${item ? "Edit" : "Add"} ${type === "BREED" ? "breed" : "coat colour"}`}
      width={520}
      onClose={close}
      foot={
        <>
          <Button tone="secondary" onClick={close}>Cancel</Button>
          <Button disabled={!valid || busy} onClick={save}>{busy ? "Saving…" : "Save"}</Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: "0.9rem" }}>
        {error && <Alert tone="danger" title={error} />}
        <Field label={tr("Code")} required error={dirty ? errors.code : undefined} hint={item ? tr("The code cannot change.") : undefined}>
          <Input value={code} disabled={!!item} onChange={(e) => touch(setCode)(e.target.value.toUpperCase())} />
        </Field>
        <Field label={tr("Name")} required error={dirty ? errors.name : undefined}>
          <Input value={name} onChange={(e) => touch(setName)(e.target.value)} />
        </Field>
        <Field label={tr("Description")} error={errors.description || undefined}>
          <Textarea rows={3} value={description} onChange={(e) => touch(setDescription)(e.target.value)} />
        </Field>
        <Field label={tr("Display order")} required error={errors.sortOrder || undefined}>
          <Input type="number" min={0} max={9999} value={sortOrder} onChange={(e) => touch(setSortOrder)(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

/** SC-1.06 Danh mục Giống & Màu lông: CM toàn quyền, vai trò khác chỉ xem. Không có xóa cứng. */
export default function HorseCatalogPage() {
  useScreenTranslation();
  const user = useCurrentUser();
  const isManager = user.role === "CLUB_MANAGER";
  const toast = useToast();
  const [type, setType] = useState<HorseCatalogType>("BREED");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE" | "ALL">("ACTIVE");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<HorseCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<{ item?: HorseCatalogItem } | null>(null);
  const [toggling, setToggling] = useState<HorseCatalogItem | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getHorseCatalog(type, status, search.trim() || undefined));
      setError("");
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setLoading(false);
    }
  }, [type, status, search]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 300);
    return () => window.clearTimeout(t);
  }, [load]);

  async function toggle(item: HorseCatalogItem) {
    setBusy(true);
    try {
      await setHorseCatalogItemActive(item.id, !item.isActive);
      toast.show(item.isActive ? `'${item.name}' is no longer in use.` : `'${item.name}' is in use again.`, "ok");
      setToggling(null);
      void load();
    } catch (err) {
      toast.show(messageFor(err), "danger");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <PageHeader
        title={tr("Breeds & coat colours")}
        action={isManager && <Button icon="plus" onClick={() => setEditing({})}>Add new</Button>}
      />
      <Tabs
        label={tr("Catalogue")}
        items={[
          { id: "BREED", label: TYPE_LABEL.BREED },
          { id: "COLOR", label: TYPE_LABEL.COLOR },
        ]}
        active={type}
        onChange={setType}
      />
      <div className={styles.filters}>
        <div className={styles.search}>
          <Input placeholder={tr("Code or name")} aria-label={tr("Search")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className={styles.status}>
          <Select
            aria-label={tr("Status")}
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            options={[
              { value: "ACTIVE", label: "In use" },
              { value: "INACTIVE", label: "Not in use" },
              { value: "ALL", label: "All" },
            ]}
          />
        </div>
      </div>
      {error && (
        <Alert tone="danger" title={tr("Could not load the catalogue.")} action={<Button size="sm" onClick={() => void load()}>Try again</Button>}>
          {error}
        </Alert>
      )}
      <Card pad={0}>
        <DataTable
        pageSize={10}
        noun="catalog items"
        caption={TYPE_LABEL[type]}
        rowKey={(i: HorseCatalogItem) => i.id}
        loading={loading}
        rows={items}
        empty={isManager ? "No data yet. Click Add new to create one." : "No data yet."}
        columns={[
          { key: "code", header: "Code", render: (i: HorseCatalogItem) => <code>{i.code}</code> },
          { key: "name", header: "Name", render: (i: HorseCatalogItem) => <strong>{i.name}</strong> },
          {
            key: "description",
            header: "Description",
            hideOnNarrow: true,
            render: (i: HorseCatalogItem) =>
              i.description ? (i.description.length > 80 ? `${i.description.slice(0, 80)}…` : i.description) : "—",
          },
          { key: "order", header: "Order", render: (i: HorseCatalogItem) => i.sortOrder },
          { key: "count", header: "Horses using it", render: (i: HorseCatalogItem) => i.horseCount ?? 0 },
          {
            key: "status",
            header: "Status",
            render: (i: HorseCatalogItem) => <Badge tone={i.isActive ? "ok" : "neutral"}>{i.isActive ? "In use" : "Not in use"}</Badge>,
          },
          ...(isManager
            ? [
                {
                  key: "actions",
                  header: "",
                  align: "right" as const,
                  render: (i: HorseCatalogItem) => (
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <Button tone="ghost" size="sm" onClick={() => setEditing({ item: i })}>Edit</Button>
                      {i.isActive ? (
                        <Button tone="ghost" size="sm" onClick={() => setToggling(i)}>Stop using</Button>
                      ) : (
                        <Button tone="ghost" size="sm" disabled={busy} onClick={() => void toggle(i)}>Use again</Button>
                      )}
                    </div>
                  ),
                },
              ]
            : []),
        ]}
      />
      </Card>

      {editing && (
        <ItemDialog
          type={type}
          item={editing.item}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}
      {toggling && (
        <ConfirmModal
          title={tr(`Stop using '${toggling.name}'?`)}
          tone="warn"
          confirmLabel={busy ? tr("Saving…") : tr("Stop using")}
          cancelLabel={tr("Cancel")}
          busy={busy}
          onConfirm={() => void toggle(toggling)}
          onCancel={() => setToggling(null)}
        >
          {tr("Horses already using this value keep it, but it can no longer be chosen when creating or editing a horse.")}
        </ConfirmModal>
      )}
    </div>
  );
}
