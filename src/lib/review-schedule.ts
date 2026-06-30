import type { FormAnswers, SupplierReviewSchedule } from './types';
import { multi } from './form-utils';

export function formatReviewInterval(months: number): string {
  if (months === 12) return 'Every 12 months';
  if (months === 24) return 'Every 24 months';
  if (months === 36) return 'Every 36 months';
  if (months === 1) return 'Every month';
  return `Every ${months} months`;
}

export interface SupplierReviewResult {
  ids: string[];
  labels: string[];
  id: string;
  label: string;
  reviewMonths: number;
  reviewInterval: string;
  reviewDriverLabel: string;
}

export function getSupplierReviewSchedule(
  data: FormAnswers,
  schedules: SupplierReviewSchedule[],
): SupplierReviewResult {
  const typeIds = multi(data, 'supplierType');
  const selected = typeIds
    .map((typeId) => schedules.find((item) => item.id === typeId))
    .filter((item): item is SupplierReviewSchedule => Boolean(item));

  if (!selected.length) {
    const fallbackId = typeIds.join(',');
    return {
      ids: typeIds,
      labels: [],
      id: fallbackId,
      label: fallbackId ? 'Unknown supplier type' : 'Unspecified supplier type',
      reviewMonths: 12,
      reviewInterval: formatReviewInterval(12),
      reviewDriverLabel: 'Default schedule',
    };
  }

  const driving = selected.reduce((shortest, current) =>
    current.reviewMonths < shortest.reviewMonths ? current : shortest,
  );

  const labels = selected.map((item) => item.label);

  return {
    ids: selected.map((item) => item.id),
    labels,
    id: selected.map((item) => item.id).join(','),
    label: labels.join('; '),
    reviewMonths: driving.reviewMonths,
    reviewInterval: formatReviewInterval(driving.reviewMonths),
    reviewDriverLabel: driving.label,
  };
}
