import { ApiError } from "@/shared/lib/api";
import { localizeServerText, tr } from "@/shared/i18n/tr";

export interface ParsedMedicalError {
  summary: string;
  details: string[];
  fieldErrors: Record<string, string>;
}

// Regex patterns to match individual validation messages from class-validator or backend
const KNOWN_ERROR_PATTERNS: Array<{
  regex: RegExp;
  field?: string;
  message: string;
}> = [
  {
    regex: /reason must be longer than or equal to 5 characters|reason for examination must be at least 5 characters/i,
    field: "examinationReason",
    message: "Reason for examination must be between 5 and 500 characters.",
  },
  {
    regex: /reason must be shorter than or equal to 500 characters|reason for examination cannot exceed 500 characters/i,
    field: "examinationReason",
    message: "Reason for examination cannot exceed 500 characters.",
  },
  {
    regex: /vitals\.clinicalExamination must be longer than or equal to 10 characters|clinical examination notes must be at least 10 characters/i,
    field: "clinicalNotes",
    message: "Detailed clinical examination notes must be between 10 and 4,000 characters.",
  },
  {
    regex: /vitals\.clinicalExamination must be shorter than or equal to 4000 characters|clinical examination notes cannot exceed 4000 characters/i,
    field: "clinicalNotes",
    message: "Clinical examination notes cannot exceed 4,000 characters.",
  },
  {
    regex: /diagnosis must be longer than or equal to 5 characters|definitive diagnosis must be at least 5 characters/i,
    field: "diagnosis",
    message: "Definitive diagnosis must be between 5 and 1,000 characters.",
  },
  {
    regex: /diagnosis must be shorter than or equal to 1000 characters|definitive diagnosis cannot exceed 1000 characters/i,
    field: "diagnosis",
    message: "Diagnosis cannot exceed 1,000 characters.",
  },
  {
    regex: /result must be longer than or equal to 5 characters|lab test result must be at least 5 characters/i,
    field: "labTests",
    message: "Diagnostic test result must be between 5 and 2,000 characters.",
  },
  {
    regex: /body temperature must be between 35\.0°c and 43\.0°c|vitals\.temperature must not be less than 35|vitals\.temperature must not be greater than 43/i,
    field: "temperature",
    message: "Body temperature must be between 35.0°C and 43.0°C.",
  },
  {
    regex: /resting heart rate must be between 20 and 120 bpm|vitals\.restingHeartRate must not be less than 20|vitals\.restingHeartRate must not be greater than 120/i,
    field: "restingHeartRate",
    message: "Resting heart rate must be between 20 and 120 bpm.",
  },
  {
    regex: /respiratory rate must be between 4 and 60 breaths\/min|vitals\.respiratoryRate must not be less than 4|vitals\.respiratoryRate must not be greater than 60/i,
    field: "respiratoryRate",
    message: "Respiratory rate must be between 4 and 60 breaths/min.",
  },
  {
    regex: /horse weight must be between 200 and 800 kg|vitals\.weightKg must not be less than 200|vitals\.weightKg must not be greater than 800/i,
    field: "weightKg",
    message: "Horse weight must be between 200 and 800 kg.",
  },
  {
    regex: /the examination date cannot be in the future|date_in_future/i,
    field: "examinationDate",
    message: "Examination date cannot be in the future.",
  },
  {
    regex: /the examination date cannot be more than 30 days ago|date_too_old/i,
    field: "examinationDate",
    message: "Examination date cannot be more than 30 days ago.",
  },
  {
    regex: /please select a valid horse|horseid must be a uuid/i,
    field: "horseId",
    message: "Please select a valid horse to examine.",
  },
  {
    regex: /horse not found or not active|horse_not_found/i,
    field: "horseId",
    message: "This horse profile could not be found or is inactive.",
  },
  {
    regex: /symptoms cannot exceed 2000 characters/i,
    field: "symptoms",
    message: "Observed symptoms cannot exceed 2,000 characters.",
  },
  {
    regex: /horse_has_open_record|chiến mã này đang có bệnh án ở trạng thái mở|bệnh án khác ở trạng thái mở/i,
    field: "horseId",
    message: "This horse already has an active open medical record. Please close or conclude it before creating a new one.",
  },
  {
    regex: /record_closed|cannot edit a medical record that has already been closed|không thể chỉnh sửa bệnh án đã/i,
    message: "Cannot edit a medical record that has already been concluded or closed.",
  },
];

/**
 * Splits run-on error sentences from class-validator or backend
 * (e.g. "reason must be longer than or equal to 5 characters vitals.clinicalExamination must be longer than or equal to 10 characters")
 */
function splitErrorText(raw: string): string[] {
  if (!raw) return [];

  // If already contains newlines, split by newline
  if (raw.includes("\n")) {
    return raw.split("\n").map((s) => s.trim()).filter(Boolean);
  }

  // Check if string contains multiple concatenated validator sentences
  // Common sentence boundary is before words like "vitals.", "diagnosis", "reason", "labTests", "examinationDate"
  const pieces: string[] = [];
  const tokens = raw.split(/(?=(?:reason|vitals\.|diagnosis|labTests|examinationDate|symptoms)\s+(?:must|cannot|is))/i);

  if (tokens.length > 1) {
    for (const t of tokens) {
      const clean = t.trim();
      if (clean) pieces.push(clean);
    }
    return pieces;
  }

  return [raw.trim()];
}

export function parseMedicalErrors(err: unknown): ParsedMedicalError {
  const fieldErrors: Record<string, string> = {};
  const details: string[] = [];

  let rawList: string[] = [];

  if (err instanceof ApiError) {
    if (Array.isArray(err.details) && err.details.length > 0) {
      for (const item of err.details) {
        rawList.push(...splitErrorText(String(item)));
      }
    } else if (err.message) {
      rawList.push(...splitErrorText(err.message));
    }
  } else if (err instanceof Error) {
    rawList.push(...splitErrorText(err.message));
  } else if (typeof err === "string") {
    rawList.push(...splitErrorText(err));
  }

  for (const raw of rawList) {
    let matched = false;
    for (const pattern of KNOWN_ERROR_PATTERNS) {
      if (pattern.regex.test(raw)) {
        matched = true;
        const msg = tr(pattern.message);
        if (!details.includes(msg)) {
          details.push(msg);
        }
        if (pattern.field && !fieldErrors[pattern.field]) {
          fieldErrors[pattern.field] = msg;
        }
        break;
      }
    }
    if (!matched && raw) {
      const translated = localizeServerText(raw);
      if (!details.includes(translated)) {
        details.push(translated);
      }
    }
  }

  let summary = tr("Please check and correct the highlighted fields before submitting.");
  if (details.length === 1) {
    summary = details[0];
  } else if (details.length === 0) {
    summary = tr("Failed to save medical record. Please try again.");
    details.push(summary);
  }

  return {
    summary,
    details,
    fieldErrors,
  };
}
