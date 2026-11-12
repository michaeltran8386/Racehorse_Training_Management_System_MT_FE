import { tr } from '@/shared/i18n/tr';

export interface ParsedGroom {
  fullName: string;
  cleanName: string;
  roleLabel: string;
  initialsText: string;
}

/**
 * Parses groom display name, cleanly separating person name from role and localizing role.
 * Example: "Lê Văn Bình (Groom Chăm Sóc)" -> { cleanName: "Lê Văn Bình", roleLabel: "Care Groom" / "Groom Chăm Sóc", initials: "LB" }
 */
export function parseGroomInfo(fullName: string | undefined | null, isVi: boolean): ParsedGroom {
  if (!fullName) {
    return { fullName: '', cleanName: '', roleLabel: '', initialsText: '' };
  }

  const trimmed = fullName.trim();
  const match = trimmed.match(/^(.*?)(?:\s*\((.*?)\))?$/);
  const cleanName = match && match[1] ? match[1].trim() : trimmed;
  const rawRole = match && match[2] ? match[2].trim() : '';

  let roleLabel = '';
  if (rawRole) {
    if (/chăm sóc|care/i.test(rawRole)) {
      roleLabel = isVi ? 'Groom Chăm Sóc' : 'Care Groom';
    } else if (/ca chiều|afternoon/i.test(rawRole)) {
      roleLabel = isVi ? 'Groom Ca Chiều' : 'Afternoon Groom';
    } else if (/ca đêm|night/i.test(rawRole)) {
      roleLabel = isVi ? 'Groom Ca Đêm' : 'Night Groom';
    } else if (/cao cấp|senior/i.test(rawRole)) {
      roleLabel = isVi ? 'Groom Cao Cấp' : 'Senior Groom';
    } else if (/groom/i.test(rawRole)) {
      roleLabel = isVi ? 'Giám mã' : 'Groom';
    } else {
      roleLabel = isVi ? tr(rawRole) : rawRole;
    }
  } else {
    roleLabel = isVi ? 'Giám mã' : 'Groom';
  }

  // Generate 2-character initials: first word initial + last word initial
  const words = cleanName.replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  let initialsText = '';
  if (words.length >= 2) {
    initialsText = (words[0][0] + words[words.length - 1][0]).toUpperCase();
  } else if (words.length === 1) {
    initialsText = words[0].slice(0, 2).toUpperCase();
  } else {
    initialsText = 'GR';
  }

  return {
    fullName: trimmed,
    cleanName,
    roleLabel,
    initialsText,
  };
}

/**
 * Returns localized shift name (e.g. "Morning Shift" / "Ca Sáng") without redundant time repetition.
 */
export function getLocalizedShiftName(
  shift: { code?: string; name: string; startTime?: string; endTime?: string },
  isVi: boolean,
  includeTime = false,
): string {
  const code = (shift.code || '').toUpperCase();
  const n = shift.name || '';

  let baseName = '';
  if (code === 'SHIFT_MORNING' || /ca sáng|morning/i.test(n)) {
    baseName = isVi ? 'Ca Sáng' : 'Morning Shift';
  } else if (code === 'SHIFT_AFTERNOON' || /ca chiều|afternoon/i.test(n)) {
    baseName = isVi ? 'Ca Chiều' : 'Afternoon Shift';
  } else if (code === 'SHIFT_NIGHT' || /ca đêm|night/i.test(n)) {
    baseName = isVi ? 'Ca Đêm' : 'Night Shift';
  } else {
    // Strip redundant (HH:mm - HH:mm) if present in raw name
    const cleaned = n.replace(/\s*\(\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2}\)\s*$/, '').trim();
    baseName = isVi ? tr(cleaned || n) : cleaned || n;
  }

  if (includeTime && shift.startTime && shift.endTime) {
    return `${baseName} (${shift.startTime} – ${shift.endTime})`;
  }
  return baseName;
}

/**
 * Returns localized zone name (e.g. "Zone A - Barn 1" / "Khu A - Chuồng 1").
 */
export function getLocalizedZoneName(
  zone: { code?: string; name: string },
  isVi: boolean,
): string {
  const code = (zone.code || '').trim().toUpperCase();
  const n = (zone.name || '').trim();

  const isZoneA =
    code === 'A' ||
    code === 'ZONE-A' ||
    code === 'ZONE_A' ||
    /\b(?:zone|khu(?:\s+chuồng)?)\s*a\b|barn\s*1|đua chính/i.test(n);
  const isZoneB =
    code === 'B' ||
    code === 'ZONE-B' ||
    code === 'ZONE_B' ||
    /\b(?:zone|khu(?:\s+chuồng)?)\s*b\b|barn\s*2|huấn luyện/i.test(n);
  const isZoneC =
    code === 'C' ||
    code === 'ZONE-C' ||
    code === 'ZONE_C' ||
    /\b(?:zone|khu)\s*c\b|cách\s*ly|isolation/i.test(n);
  const isZoneH =
    code === 'H' ||
    code === 'ZONE-H' ||
    code === 'ZONE_H' ||
    /\b(?:zone|khu)\s*h\b|nợ\s*phí|impound/i.test(n);

  if (!isVi) {
    if (isZoneA) return 'Zone A - Barn 1';
    if (isZoneB) return 'Zone B - Barn 2';
    if (isZoneC) return 'Zone C - Isolation';
    if (isZoneH) return 'Zone H - Overdue Hold';
    return n;
  }

  if (isZoneA) return 'Khu A - Chuồng 1';
  if (isZoneB) return 'Khu B - Chuồng 2';
  if (isZoneC) return 'Khu C - Khu Cách ly';
  if (isZoneH) return 'Khu H - Lưu Giữ Nợ Phí';
  return tr(n);
}

