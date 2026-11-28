import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tr } from '@/shared/i18n/tr';
import { getPlacementOptions } from '../services/admissionService';
import type { AdmissionPlacement, PlacementOptions } from '../types/admission.types';
import design from './AdmissionDesign.module.css';

export function GroomPlacementFields({
  value,
  onChange,
  fixedStallId,
  allocationId,
  disabled = false,
}: {
  value: AdmissionPlacement;
  onChange: (v: AdmissionPlacement) => void;
  fixedStallId?: string;
  allocationId?: string;
  disabled?: boolean;
}) {
  useTranslation();
  const [options, setOptions] = useState<PlacementOptions | null>(null);
  const [error, setError] = useState('');
  const stallId = fixedStallId ?? value.stallId;

  useEffect(() => {
    let active = true;
    setOptions(null);
    setError('');
    getPlacementOptions(stallId, allocationId)
      .then((result) => {
        if (active) setOptions(result);
      })
      .catch((err) => {
        if (active)
          setError(
            err instanceof Error
              ? err.message
              : tr('Could not load stall placement options.'),
          );
      });
    return () => {
      active = false;
    };
  }, [stallId, allocationId]);

  const selectStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    font: 'inherit',
    color: 'inherit',
  };

  const selectedStall = options?.stalls.find((s) => s.id === stallId);
  const eligibleGrooms = (options?.grooms ?? [])
    .filter((g) => g.eligible)
    .sort((a, b) => a.count - b.count || a.fullName.localeCompare(b.fullName, 'vi'));
  const ineligibleCount = (options?.grooms ?? []).length - eligibleGrooms.length;

  return (
    <div className={design.form}>
      {error && (
        <p role="alert" className={design.error}>
          {error}
        </p>
      )}
      {!options && !error && (
        <p role="status">{tr('Checking stalls and care staff…')}</p>
      )}
      {fixedStallId === undefined && (
        <label>
          {tr('Admission Stall')}
          <select
            aria-label={tr('Admission Stall')}
            style={selectStyle}
            disabled={disabled || !options}
            value={stallId}
            onChange={(e) =>
              onChange({
                stallId: e.target.value,
                assignedGroomUserId: '',
                receivingGroomUserId: '',
              })
            }
          >
            <option value="">{tr('Select available stall')}</option>
            {options?.stalls.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.zoneRef?.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        {tr('Primary Care Groom')}
        <select
          aria-label={tr('Primary Care Groom')}
          style={selectStyle}
          disabled={disabled || !options || !stallId || eligibleGrooms.length === 0}
          value={value.assignedGroomUserId}
          onChange={(e) =>
            onChange({
              ...value,
              stallId,
              assignedGroomUserId: e.target.value,
              receivingGroomUserId: e.target.value,
            })
          }
        >
          <option value="">
            {!stallId
              ? tr('Select primary care Groom')
              : eligibleGrooms.length > 0
                ? `${tr('Select primary care Groom')} (${tr('{{count}} available', { count: eligibleGrooms.length })})`
                : tr('No available Groom in this zone')}
          </option>
          {eligibleGrooms.map((g) => (
            <option key={g.id} value={g.id}>
              {g.fullName} — {tr('{{count}}/{{max}} stalls', { count: g.count, max: g.max })}
            </option>
          ))}
        </select>
      </label>
      {stallId && options && (
        <p className={design.helper}>
          {eligibleGrooms.length > 0
            ? `${tr('Showing {{count}} available Groom(s) in {{zone}}', {
                count: eligibleGrooms.length,
                zone: selectedStall?.zoneRef?.name || tr('the selected zone'),
              })}${
                ineligibleCount > 0
                  ? tr(' ({{hidden}} in other zones or at 6/6 capacity hidden)', {
                      hidden: ineligibleCount,
                    })
                  : ''
              }.`
            : tr('No eligible Groom is available in {{zone}}. Please pick a stall in another zone or assign more Grooms.', {
                zone: selectedStall?.zoneRef?.name || tr('this zone'),
              })}
        </p>
      )}
    </div>
  );
}
