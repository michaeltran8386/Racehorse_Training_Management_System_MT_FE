import { tr } from '@/shared/i18n/tr';
import { COMMON_SYMPTOMS } from '../components/IncidentReportModal';

/**
 * Dictionary mapping Vietnamese symptom terms (from database seeds and user input)
 * to standard capitalized English terms.
 */
const VI_TO_EN_SYMPTOMS: Record<string, string> = {
  'trầy xước nhẹ': 'Minor Scratches',
  'trầy xước': 'Scratches / Abrasions',
  'va chạm rào': 'Fence Collision',
  'va cham rao': 'Fence Collision',
  'khập khiễng': 'Lameness / Limping',
  'khap khieng': 'Lameness / Limping',
  'đi khập khiễng': 'Lameness / Limping',
  'đi khập khiễng chân sau': 'Hind Leg Lameness',
  'đi khập khiễng chân trước': 'Foreleg Lameness',
  'ngại tiếp đất': 'Reluctant to Bear Weight',
  'ngai tiep dat': 'Reluctant to Bear Weight',
  'vật cản nguy hiểm': 'Hazardous Obstacle',
  'vat can nguy hiem': 'Hazardous Obstacle',
  'tiếng ồn bất thường': 'Abnormal Noise',
  'tieng on bat thuong': 'Abnormal Noise',
  'nhiệt độ cơ thể tăng nhẹ': 'Slightly Elevated Temperature',
  'chảy nước mắt nhẹ': 'Mild Eye Tearing',
  'chảy nước mắt': 'Eye Irritation / Tearing',
  'ho nhẹ': 'Mild Cough',
  'ho': 'Coughing',
  'sưng chân': 'Leg Swelling',
  'sưng gân': 'Tendon Swelling',
  'sưng khớp': 'Joint Swelling',
  'sưng nóng gót chân': 'Heel Heat & Swelling',
  'bỏ ăn': 'Loss of Appetite',
  'chán ăn': 'Loss of Appetite',
  'sốt nhẹ': 'Mild Fever',
  'sốt': 'Fever / High Temperature',
  'đau bụng': 'Colic / Abdominal Pain',
  'quặn ruột': 'Colic / Abdominal Pain',
  'vết thương hở': 'Open Wound',
  'chảy máu ngoài': 'External Bleeding',
  'chảy máu': 'External Bleeding',
  'khó thở': 'Respiratory Distress',
  'tiêu chảy': 'Diarrhea',
  'mệt mỏi': 'Lethargy / Fatigue',
  'uể oải': 'Lethargy / Fatigue',
  'chấn thương móng': 'Hoof Injury',
  'nứt móng': 'Cracked Hoof',
  'viêm da': 'Dermatitis',
  'dị ứng': 'Allergic Reaction',
  'co giật': 'Muscle Spasms',
  'dấu hiệu bất thường khác': 'Other Abnormal Signs',
};

/**
 * Capitalizes the first letter of a string while preserving the rest.
 */
export function capitalizeFirstLetter(text: string): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Formats and localizes a symptom string (code or free-text) with proper first-letter capitalization.
 *
 * @param symKey Raw symptom key or text (e.g. 'COLIC', 'trầy xước nhẹ', 'va chạm rào')
 * @param isVi Current language is Vietnamese
 */
export function formatSymptom(symKey: string | undefined | null, isVi: boolean): string {
  if (!symKey) return '';
  const clean = symKey.trim();
  if (!clean) return '';

  // 1. Check if symKey matches a standard code in COMMON_SYMPTOMS (case-insensitive)
  const upperKey = clean.toUpperCase();
  const standard = COMMON_SYMPTOMS.find((s) => s.key === upperKey);
  if (standard) {
    const localized = isVi ? tr(standard.label) : standard.label;
    return capitalizeFirstLetter(localized);
  }

  const lower = clean.toLowerCase();

  // 2. English display mode
  if (!isVi) {
    // Check Vietnamese -> English dictionary
    if (VI_TO_EN_SYMPTOMS[lower]) {
      return VI_TO_EN_SYMPTOMS[lower];
    }
    // Check if it's already an English label
    for (const enLabel of Object.values(VI_TO_EN_SYMPTOMS)) {
      if (enLabel.toLowerCase() === lower) {
        return enLabel;
      }
    }
    return capitalizeFirstLetter(clean);
  }

  // 3. Vietnamese display mode
  // If it's a standard label in English, translate it to Vietnamese
  for (const s of COMMON_SYMPTOMS) {
    if (s.label.toLowerCase() === lower) {
      return capitalizeFirstLetter(tr(s.label));
    }
  }

  // If it's an English symptom phrase, translate to Vietnamese
  for (const [viPhrase, enLabel] of Object.entries(VI_TO_EN_SYMPTOMS)) {
    if (enLabel.toLowerCase() === lower) {
      return capitalizeFirstLetter(viPhrase);
    }
  }

  // If already Vietnamese or unknown, translate via tr() and capitalize
  const viText = tr(clean);
  return capitalizeFirstLetter(viText);
}

