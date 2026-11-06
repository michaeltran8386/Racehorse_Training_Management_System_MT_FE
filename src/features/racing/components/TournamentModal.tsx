import formLayout from "@/shared/components/form/FormLayout.module.css";
import { Icon } from "@/shared/components/ui/Icon";
import { useState, useEffect } from "react";
import { Modal } from "@/shared/components/ui/Modal";
import { Button } from "@/shared/components/ui/Button";
import { localizeServerText, tr } from "@/shared/i18n/tr";
import { useAppLanguage } from "@/shared/lib/language";
import type { Tournament, TrackSurface, TournamentStatus } from "../types";

interface TournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Tournament>) => Promise<void>;
  initialData?: Tournament | null;
}

export function TournamentModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: TournamentModalProps) {
  useAppLanguage();
  const [name, setName] = useState("");
  const [raceDate, setRaceDate] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [location, setLocation] = useState("");
  const [distanceMeters, setDistanceMeters] = useState(1600);
  const [trackType, setTrackType] = useState<TrackSurface>("TURF");
  const [prizePool, setPrizePool] = useState(100000000);
  const [status, setStatus] = useState<TournamentStatus>("UPCOMING");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setRaceDate(initialData.raceDate ? initialData.raceDate.split("T")[0] : "");
      setRegistrationDeadline(
        initialData.registrationDeadline ? initialData.registrationDeadline.split("T")[0] : "",
      );
      setLocation(initialData.location);
      setDistanceMeters(initialData.distanceMeters);
      setTrackType(initialData.trackType);
      setPrizePool(initialData.prizePool);
      setStatus(initialData.status);
    } else {
      setName("");
      const now = new Date();
      now.setDate(now.getDate() + 30);
      setRaceDate(now.toISOString().split("T")[0]);
      const dl = new Date();
      dl.setDate(dl.getDate() + 20);
      setRegistrationDeadline(dl.toISOString().split("T")[0]);
      setLocation("");
      setDistanceMeters(1600);
      setTrackType("TURF");
      setPrizePool(100000000);
      setStatus("OPEN_REGISTRATION");
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError(tr("Tournament name is required"));
      return;
    }
    if (!raceDate) {
      setError(tr("Race date is required"));
      return;
    }
    if (!registrationDeadline) {
      setError(tr("Registration deadline is required"));
      return;
    }
    if (new Date(registrationDeadline) > new Date(raceDate)) {
      setError(tr("Registration deadline cannot be after the race date"));
      return;
    }

    const isDeadlinePassed = new Date(registrationDeadline + "T23:59:59") < new Date();
    if (status === "OPEN_REGISTRATION" && isDeadlinePassed) {
      setError(tr("Cannot open registration because the registration deadline has already passed"));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        raceDate: new Date(raceDate).toISOString(),
        registrationDeadline: new Date(registrationDeadline + "T23:59:59").toISOString(),
        location: location.trim(),
        distanceMeters: Number(distanceMeters),
        trackType,
        prizePool: Number(prizePool),
        status,
      });
      onClose();
    } catch (err: any) {
      setError(localizeServerText(err?.message) || tr("Failed to save tournament"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      title={initialData ? tr("Edit Tournament") : tr("Create New Tournament")}
      subtitle={tr("Configure official championship parameters, distance, and prize pool")}
      width={560}
      onClose={onClose}
      foot={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", width: "100%" }}>
          <Button tone="secondary" onClick={onClose} disabled={loading}>
            {tr("Cancel")}
          </Button>
          <Button tone="primary" onClick={handleSubmit} disabled={loading}>
            {loading ? tr("Saving...") : initialData ? tr("Update") : tr("Create Tournament")}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              background: "var(--danger-bg, #fef2f2)",
              color: "var(--danger, #dc2626)",
              borderRadius: "var(--r-sm, 6px)",
              fontSize: "var(--fs-sm, 0.875rem)",
              border: "1px solid var(--danger-border, #fecaca)",
            }}
          >
            {error}
          </div>
        )}

        <div>
          <label style={{ display: "block", fontSize: "var(--fs-sm, 0.875rem)", fontWeight: 600, marginBottom: "0.375rem" }}>
            {tr("Tournament Name")} *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={tr("e.g. Grand Autumn Cup 2026")}
            style={{
              width: "100%",
              padding: "0.625rem 0.875rem",
              borderRadius: "var(--r-sm, 6px)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--ink)",
              fontSize: "var(--fs-body)",
            }}
          />
        </div>

        <div className={formLayout.columns}>
          <div>
            <label style={{ display: "block", fontSize: "var(--fs-sm, 0.875rem)", fontWeight: 600, marginBottom: "0.375rem" }}>
              {tr("Race Date")} *
            </label>
            <input
              type="date"
              required
              value={raceDate}
              onChange={(e) => setRaceDate(e.target.value)}
              style={{
                width: "100%",
                padding: "0.625rem 0.875rem",
                borderRadius: "var(--r-sm, 6px)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--ink)",
                fontSize: "var(--fs-body)",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "var(--fs-sm, 0.875rem)", fontWeight: 600, marginBottom: "0.375rem" }}>
              {tr("Registration Deadline")} *
            </label>
            <input
              type="date"
              required
              value={registrationDeadline}
              onChange={(e) => {
                const val = e.target.value;
                setRegistrationDeadline(val);
                if (val && new Date(val + "T23:59:59") < new Date() && status === "OPEN_REGISTRATION") {
                  setStatus("CLOSED_REGISTRATION");
                }
              }}
              style={{
                width: "100%",
                padding: "0.625rem 0.875rem",
                borderRadius: "var(--r-sm, 6px)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--ink)",
                fontSize: "var(--fs-body)",
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "var(--fs-sm, 0.875rem)", fontWeight: 600, marginBottom: "0.375rem" }}>
            {tr("Location")} *
          </label>
          <input
            type="text"
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={tr("e.g. Saigon Racecourse - Track A")}
            style={{
              width: "100%",
              padding: "0.625rem 0.875rem",
              borderRadius: "var(--r-sm, 6px)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--ink)",
              fontSize: "var(--fs-body)",
            }}
          />
        </div>

        <div className={formLayout.columns}>
          <div>
            <label style={{ display: "block", fontSize: "var(--fs-sm, 0.875rem)", fontWeight: 600, marginBottom: "0.375rem" }}>
              {tr("Distance (Meters)")}
            </label>
            <select
              value={distanceMeters}
              onChange={(e) => setDistanceMeters(Number(e.target.value))}
              style={{
                width: "100%",
                padding: "0.625rem 0.875rem",
                borderRadius: "var(--r-sm, 6px)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--ink)",
                fontSize: "var(--fs-body)",
              }}
            >
              <option value={1000}>1,000m (Sprint)</option>
              <option value={1200}>1,200m (Sprint)</option>
              <option value={1400}>1,400m (Middle)</option>
              <option value={1600}>1,600m (Mile Standard)</option>
              <option value={1800}>1,800m (Intermediate)</option>
              <option value={2000}>2,000m (Classic)</option>
              <option value={2400}>2,400m (Long Distance / Derby)</option>
              <option value={3200}>3,200m (Cup / Marathon)</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "var(--fs-sm, 0.875rem)", fontWeight: 600, marginBottom: "0.375rem" }}>
              {tr("Track Surface")}
            </label>
            <select
              value={trackType}
              onChange={(e) => setTrackType(e.target.value as TrackSurface)}
              style={{
                width: "100%",
                padding: "0.625rem 0.875rem",
                borderRadius: "var(--r-sm, 6px)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--ink)",
                fontSize: "var(--fs-body)",
              }}
            >
              <option value="TURF">{tr("Grass / Turf")}</option>
              <option value="DIRT">{tr("Sand / Dirt")}</option>
            </select>
          </div>
        </div>

        <div className={formLayout.columns}>
          <div>
            <label style={{ display: "block", fontSize: "var(--fs-sm, 0.875rem)", fontWeight: 600, marginBottom: "0.375rem" }}>
              {tr("Total Prize Pool (VND)")}
            </label>
            <input
              type="number"
              min={0}
              step={10000000}
              value={prizePool}
              onChange={(e) => setPrizePool(Number(e.target.value))}
              style={{
                width: "100%",
                padding: "0.625rem 0.875rem",
                borderRadius: "var(--r-sm, 6px)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--ink)",
                fontSize: "var(--fs-body)",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "var(--fs-sm, 0.875rem)", fontWeight: 600, marginBottom: "0.375rem" }}>
              {tr("Status")}
            </label>
            {(() => {
              const isDeadlinePassed = registrationDeadline ? new Date(registrationDeadline + "T23:59:59") < new Date() : false;
              return (
                <>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TournamentStatus)}
                    style={{
                      width: "100%",
                      padding: "0.625rem 0.875rem",
                      borderRadius: "var(--r-sm, 6px)",
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                      color: "var(--ink)",
                      fontSize: "var(--fs-body)",
                    }}
                  >
                    <option value="UPCOMING">{tr("Upcoming (Not opened yet)")}</option>
                    <option value="OPEN_REGISTRATION" disabled={isDeadlinePassed}>
                      {tr("Registration Open")} {isDeadlinePassed ? `(${tr("Deadline passed")})` : ""}
                    </option>
                    <option value="CLOSED_REGISTRATION">{tr("Registration Closed")}</option>
                    <option value="COMPLETED">{tr("Completed")}</option>
                    <option value="CANCELLED">{tr("Cancelled")}</option>
                  </select>
                  {isDeadlinePassed && (
                    <p style={{ margin: "0.375rem 0 0", fontSize: "0.75rem", color: "var(--warning-text, #d97706)" }}>
                      <Icon name="alert" inline size={12} /> {tr("Deadline has passed. Status cannot be Open for Registration.")}
                    </p>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </form>
    </Modal>
  );
}
