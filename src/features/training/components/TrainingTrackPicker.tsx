import { useEffect, useState } from 'react';
import { api } from '@/shared/lib/api';
import { messageFor } from '@/shared/lib/messages';
import { Field } from '@/shared/components/form/Field';
import { Select } from '@/shared/components/form/Select';
import { Button } from '@/shared/components/ui/Button';
import { Alert } from '@/shared/components/ui/Alert';
import { tr } from '@/shared/i18n/tr';

export interface TrainingTrackChoice {
  id: string;
  code: string;
  name: string;
  surface: string;
  capacity: number;
  isActive: boolean;
  currentCount?: number;
  isFull?: boolean;
}

export function useTrainingTracks(date?: string, time?: string, workoutType?: string) {
  const [tracks, setTracks] = useState<TrainingTrackChoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (time) params.set('time', time);
    if (workoutType) params.set('workoutType', workoutType);
    const qs = params.toString() ? `?${params.toString()}` : '';

    api<TrainingTrackChoice[]>('GET', `/training/tracks${qs}`)
      .then((rows) => {
        if (active) setTracks(rows);
      })
      .catch((e) => {
        if (active) setError(messageFor(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retry, date, time, workoutType]);

  return { tracks, loading, error, reload: () => setRetry((n) => n + 1) };
}

export function TrainingTrackPicker({
  value,
  onChange,
  surface,
  catalog,
}: {
  value: string;
  onChange: (id: string) => void;
  surface: string;
  catalog: ReturnType<typeof useTrainingTracks>;
}) {
  const { tracks, loading, error, reload } = catalog;
  useEffect(() => {
    if (loading || error || surface === 'NONE' || tracks.length === 0) return;
    const isValid = tracks.some((track) => track.id === value && track.surface === surface && track.isActive);
    if (!isValid) {
      const fallback = tracks.find((track) => track.surface === surface && track.isActive);
      const newId = fallback ? fallback.id : '';
      if (newId !== value) {
        onChange(newId);
      }
    }
  }, [tracks, surface, value, loading, error, onChange]);

  if (surface === 'NONE') return null;
  const options = tracks.filter((t) => t.surface === surface && t.isActive);

  return (
    <Field
      label={tr('Physical training track')}
      required
      hint={tr('Surface type alone does not identify a training track. Capacity is checked again when saving.')}
    >
      {error ? (
        <Alert tone="danger">
          {error}
          <Button tone="ghost" onClick={reload}>
            {tr('Try again')}
          </Button>
        </Alert>
      ) : (
        <Select
          value={value}
          disabled={loading}
          onChange={(e) => onChange(e.target.value)}
          options={[
            { value: '', label: loading ? tr('Loading...') : tr('Select a physical track') },
            ...options.map((track) => {
              const cleanName = track.name || track.code;
              const count = track.currentCount ?? 0;
              const isFull = Boolean(track.isFull || count >= track.capacity);
              const label = isFull
                ? `${cleanName} · [Đã đầy ${track.capacity}/${track.capacity}]`
                : `${cleanName} · ${count}/${track.capacity} ngựa`;
              return {
                value: track.id,
                label,
                disabled: isFull,
              };
            }),
          ]}
        />
      )}
      {!loading && !error && !options.length && (
        <p>{tr('No active track matches this surface. Ask the club manager to configure the track catalog.')}</p>
      )}
    </Field>
  );
}
