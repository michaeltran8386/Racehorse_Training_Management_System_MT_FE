import { useState } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { Field } from '@/shared/components/form/Field';
import { Input } from '@/shared/components/form/Input';
import { Select } from '@/shared/components/form/Select';
import { Textarea } from '@/shared/components/form/Textarea';
import { Button } from '@/shared/components/ui/Button';
import { Alert } from '@/shared/components/ui/Alert';
import { useToast } from '@/shared/components/ui/Toast';
import { messageFor } from '@/shared/lib/messages';
import { tr } from '@/shared/i18n/tr';
import { createSupply, updateSupply } from '../api/suppliesApi';
import {
  SUPPLY_CATEGORY_LABELS,
  SUPPLY_UNIT_LABELS,
  type SupplyCatalogItem,
  type SupplyCategory,
  type SupplyUnit,
} from '../types/supplies';

interface SupplyModalProps {
  item?: SupplyCatalogItem;
  onClose: () => void;
  onSaved: () => void;
}

export function SupplyModal({ item, onClose, onSaved }: SupplyModalProps) {
  const toast = useToast();
  const [code, setCode] = useState(item?.code ?? '');
  const [name, setName] = useState(item?.name ?? '');
  const [category, setCategory] = useState<SupplyCategory>(item?.category ?? 'FEED_HAY');
  const [unit, setUnit] = useState<SupplyUnit>(item?.unit ?? 'KG');
  const [unitPrice, setUnitPrice] = useState<string>(
    item?.unitPrice !== null && item?.unitPrice !== undefined ? String(item.unitPrice) : '0',
  );
  const [withdrawalDays, setWithdrawalDays] = useState<string>(
    item?.withdrawalDays !== null && item?.withdrawalDays !== undefined
      ? String(item.withdrawalDays)
      : '',
  );
  const [description, setDescription] = useState(item?.description ?? '');

  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isMedical = category === 'MEDICINE';

  const categoryOptions = Object.entries(SUPPLY_CATEGORY_LABELS).map(([value, label]) => ({ value, label: tr(label) }));
  const unitOptions = Object.entries(SUPPLY_UNIT_LABELS).map(([value, label]) => ({ value, label: `${tr(label)} (${value})` }));

  const errors = {
    code: item || /^[A-Z0-9_-]{2,30}$/.test(code)
      ? ''
      : tr('Code must be 2-30 uppercase letters, numbers, hyphens or underscores.'),
    name:
      name.trim().length >= 2 && name.trim().length <= 150
        ? ''
        : tr('Supply name must be between 2 and 150 characters.'),
    unitPrice:
      unitPrice === '' ||
      (Number(unitPrice) >= 0 && Number(unitPrice) <= 1000000000 && !isNaN(Number(unitPrice)))
        ? ''
        : tr('Unit price must be between 0 and 1,000,000,000 VND.'),
    withdrawalDays:
      !isMedical ||
      withdrawalDays === '' ||
      (Number.isInteger(Number(withdrawalDays)) &&
        Number(withdrawalDays) >= 0 &&
        Number(withdrawalDays) <= 365)
        ? ''
        : tr('Withdrawal days must be between 0 and 365 days.'),
    description: description.length <= 500 ? '' : tr('Description cannot exceed 500 characters.'),
  };

  const isValid = Object.values(errors).every((e) => !e);

  const handleClose = () => {
    if (!dirty || window.confirm(tr('Discard unsaved changes?'))) {
      onClose();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || busy) return;

    setBusy(true);
    setError('');

    try {
      const payload = {
        name: name.trim(),
        category,
        unit,
        unitPrice: unitPrice ? Number(unitPrice) : 0,
        withdrawalDays: isMedical && withdrawalDays !== '' ? Number(withdrawalDays) : undefined,
        description: description.trim() || undefined,
      };

      if (item) {
        await updateSupply(item.id, payload);
        toast.show(tr('Supply details updated.'), 'ok');
      } else {
        await createSupply({
          code: code.trim().toUpperCase(),
          ...payload,
        });
        toast.show(tr('New supply added successfully.'), 'ok');
      }
      onSaved();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={item ? tr('Edit supply: {{name}}', { name: item.name }) : tr('Add New Supply')}
      onClose={handleClose}
    >
      <form onSubmit={handleSave} className="space-y-4">
        {error && <Alert tone="danger">{error}</Alert>}

        {!item ? (
          <Field label={tr('Supply Code')} required error={dirty ? errors.code : ''}>
            <Input
              value={code}
              placeholder="VD: SUP_HAY_ALFALFA"
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setDirty(true);
              }}
            />
          </Field>
        ) : (
          <Field label={tr('Supply Code')}>
            <Input value={item.code} disabled />
          </Field>
        )}

        <Field label={tr('Supply Name')} required error={dirty ? errors.name : ''}>
          <Input
            value={name}
            placeholder={tr('e.g. Standard Alfalfa Hay')}
            onChange={(e) => {
              setName(e.target.value);
              setDirty(true);
            }}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label={tr('Category')} required>
            <Select
              value={category}
              options={categoryOptions}
              onChange={(e) => {
                setCategory(e.target.value as SupplyCategory);
                setDirty(true);
              }}
            />
          </Field>

          <Field label={tr('Unit')} required>
            <Select
              value={unit}
              options={unitOptions}
              onChange={(e) => {
                setUnit(e.target.value as SupplyUnit);
                setDirty(true);
              }}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label={tr('Unit Price (VND)')} error={dirty ? errors.unitPrice : ''}>
            <Input
              type="number"
              value={unitPrice}
              placeholder="0"
              min={0}
              max={1000000000}
              onChange={(e) => {
                setUnitPrice(e.target.value);
                setDirty(true);
              }}
            />
          </Field>

          {isMedical ? (
            <Field
              label={tr('Withdrawal period (days)')}
              error={dirty ? errors.withdrawalDays : ''}
            >
              <Input
                type="number"
                value={withdrawalDays}
                placeholder="VD: 7"
                min={0}
                max={365}
                onChange={(e) => {
                  setWithdrawalDays(e.target.value);
                  setDirty(true);
                }}
              />
            </Field>
          ) : (
            <div />
          )}
        </div>

        <Field label={tr('Description / Notes')} error={dirty ? errors.description : ''}>
          <Textarea
            rows={3}
            value={description}
            placeholder={tr('Purpose, dosage recommendations...')}
            onChange={(e) => {
              setDescription(e.target.value);
              setDirty(true);
            }}
          />
        </Field>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
          <Button tone="secondary" type="button" onClick={handleClose}>
            {tr('Cancel')}
          </Button>
          <Button tone="primary" type="submit" disabled={!isValid || busy}>
            {busy ? tr('Saving...') : item ? tr('Save Changes') : tr('Save Supply')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
