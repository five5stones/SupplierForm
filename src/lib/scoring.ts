import type { FormAnswers, ScoringCategoryConfig, SupplierReviewSchedule } from './types';
import { multi, str } from './form-utils';
import { getSupplierReviewSchedule } from './review-schedule';

export interface CategoryScore {
  key: string;
  label: string;
  weight: number;
  score: number;
  weightedScore: number;
  rationale: string;
}

export interface SupplierAssessment {
  categories: CategoryScore[];
  totalWeightedScore: number;
  maxScore: number;
  percentage: number;
  rating: string;
  ratingLabel: string;
  riskLevel: string;
  approvalStatus: string;
  approvalMonths: number;
  nextReviewDate: string;
  supplierType: string;
  supplierTypeLabel: string;
  reviewInterval: string;
  reviewDriverLabel: string;
  strengths: string[];
  improvements: string[];
  requiredActions: string[];
  assessmentDate: string;
}

const MAX_SCORE = 500;

function toWeightedScore(score: number, weight: number, weightTotal: number): number {
  if (weightTotal <= 0) return 0;
  return Math.round((score / 5) * weight * (MAX_SCORE / weightTotal));
}

function isYes(data: FormAnswers, key: string): boolean {
  return str(data, key) === 'yes';
}

function hasType(data: FormAnswers, key: string, ...names: string[]): boolean {
  const types = multi(data, key).map((t) => t.toLowerCase());
  return names.some((name) => types.some((t) => t.includes(name.toLowerCase())));
}

function hasDocument(data: FormAnswers, ...names: string[]): boolean {
  const docs = multi(data, 'documentTypes').map((d) => d.toLowerCase());
  return names.some((name) => docs.some((d) => d.includes(name.toLowerCase())));
}

function isAnnualFrequency(value: string): boolean {
  return /annual|year|yearly|12\s*month/i.test(value);
}

function insuranceExpiryDays(dateStr: string): number | null {
  if (!dateStr) return null;
  const expiry = new Date(dateStr);
  if (Number.isNaN(expiry.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function yesCount(data: FormAnswers, ...keys: string[]): number {
  return keys.filter((key) => isYes(data, key)).length;
}

type Scorer = (data: FormAnswers, weight: number, weightTotal: number, label: string) => CategoryScore;

function makeScore(
  key: string,
  label: string,
  weight: number,
  weightTotal: number,
  score: number,
  rationale: string,
): CategoryScore {
  return { key, label, weight, score, weightedScore: toWeightedScore(score, weight, weightTotal), rationale };
}

const scorers: Record<string, Scorer> = {
  foodSafetyManagement(data, weight, weightTotal, label) {
    let score = 0;
    let rationale = 'No documented food safety system.';
    if (isYes(data, 'documentedFsms')) {
      const hasHaccp = hasType(data, 'fsmsTypes', 'HACCP');
      const reviewed = isYes(data, 'haccpReviewedRegularly');
      const hasEvidence = hasDocument(data, 'Food Safety Policy', 'HACCP Summary');
      if (hasHaccp && reviewed && isAnnualFrequency(str(data, 'haccpReviewFrequency')) && hasEvidence) {
        score = 5;
        rationale = 'Fully documented HACCP system with regular reviews and supporting evidence.';
      } else if (hasHaccp && reviewed) {
        score = 4;
        rationale = 'HACCP documented with regular reviews; minor evidence gaps.';
      } else if (hasHaccp || multi(data, 'fsmsTypes').length > 0) {
        score = 3;
        rationale = 'Basic documented food safety system in place.';
      } else {
        score = 2;
        rationale = 'Documented FSMS claimed but limited system detail provided.';
      }
    } else if (multi(data, 'fsmsTypes').length > 0 || str(data, 'fsmsOther')) {
      score = 1;
      rationale = 'Limited evidence of a formal food safety system.';
    }
    return makeScore('foodSafetyManagement', label, weight, weightTotal, score, rationale);
  },

  haccp(data, weight, weightTotal, label) {
    let score = 0;
    let rationale = 'No HACCP evidence provided.';
    const hasHaccp = hasType(data, 'fsmsTypes', 'HACCP');
    if (hasHaccp && isYes(data, 'haccpReviewedRegularly') && isAnnualFrequency(str(data, 'haccpReviewFrequency'))) {
      score = 5;
      rationale = 'Complete HACCP reviewed on an annual basis.';
    } else if (hasHaccp && isYes(data, 'haccpReviewedRegularly')) {
      score = 4;
      rationale = 'Complete HACCP with regular review; frequency not confirmed as annual.';
    } else if (hasHaccp) {
      score = 3;
      rationale = 'Partial HACCP — documented but review evidence incomplete.';
    } else if (isYes(data, 'documentedFsms')) {
      score = 2;
      rationale = 'Basic hazard assessment via documented FSMS without confirmed HACCP.';
    } else if (str(data, 'foodSafetyIncidents') || str(data, 'haccpReviewFrequency')) {
      score = 1;
      rationale = 'Minimal HACCP evidence.';
    }
    return makeScore('haccp', label, weight, weightTotal, score, rationale);
  },

  certification(data, weight, weightTotal, label) {
    let score = 0;
    let rationale = 'No third-party certification evidence.';
    if (hasType(data, 'fsmsTypes', 'BRCGS', 'ISO 22000', 'ISO22000')) {
      score = 5;
      rationale = 'BRCGS or ISO 22000 certification indicated.';
    } else if (hasType(data, 'fsmsTypes', 'SALSA')) {
      score = 4;
      rationale = 'SALSA accreditation indicated.';
    } else if (isYes(data, 'registeredWithLocalAuthority') && isYes(data, 'documentedFsms')) {
      score = 3;
      rationale = 'Local Authority registration with internal food safety management.';
    } else if (multi(data, 'fsmsTypes').length > 0 || str(data, 'fsmsOther')) {
      score = 2;
      rationale = 'Some certification or accreditation activity indicated.';
    } else if (isYes(data, 'registeredWithLocalAuthority')) {
      score = 1;
      rationale = 'Minimal certification evidence beyond registration.';
    }
    return makeScore('certification', label, weight, weightTotal, score, rationale);
  },

  hygieneRating(data, weight, weightTotal, label) {
    const ratingMap: Record<string, number> = { '5': 5, '4': 4, '3': 3, other: 2 };
    const rating = str(data, 'hygieneRating');
    const score = ratingMap[rating] ?? 0;
    const rationale =
      score === 0
        ? 'No Food Hygiene Rating provided.'
        : rating === 'other'
          ? 'Non-standard hygiene rating provided — scored conservatively.'
          : `Food Hygiene Rating of ${rating}.`;
    return makeScore('hygieneRating', label, weight, weightTotal, score, rationale);
  },

  allergenManagement(data, weight, weightTotal, label) {
    const positives = yesCount(
      data,
      'documentedAllergenControls',
      'allergenProductsSegregated',
      'allergenLabelsVerified',
      'allergenSpecificationsAvailable',
      'allergenAwarenessTraining',
    );
    const rationales = [
      'No allergen management controls evidenced.',
      'Minimal allergen control evidence.',
      'Limited allergen controls in place.',
      'Basic allergen procedures documented.',
      'Good allergen controls with minor gaps.',
      'Full documented allergen management with verification and training.',
    ];
    return makeScore('allergenManagement', label, weight, weightTotal, positives, rationales[positives]);
  },

  traceability(data, weight, weightTotal, label) {
    let score = 0;
    let rationale = 'No traceability evidence provided.';
    const trace = multi(data, 'traceability');
    const hasFull = trace.some((t) => t.toLowerCase().includes('full'));
    const hasPartial = trace.length > 0;
    const recall4hr = isYes(data, 'recallWithinFourHours');
    if (hasFull && recall4hr) {
      score = 5;
      rationale = 'Full traceability with 4-hour recall capability confirmed.';
    } else if (hasFull) {
      score = 4;
      rationale = 'Full traceability documented; 4-hour recall not confirmed.';
    } else if (hasPartial && recall4hr) {
      score = 4;
      rationale = 'Traceability documented with 4-hour recall capability.';
    } else if (hasPartial) {
      score = 2;
      rationale = 'Partial traceability only.';
    } else if (str(data, 'traceabilityRecordsRetention')) {
      score = 1;
      rationale = 'Poor traceability evidence despite retention policy stated.';
    }
    return makeScore('traceability', label, weight, weightTotal, score, rationale);
  },

  staffTraining(data, weight, weightTotal, label) {
    let score = 0;
    let rationale = 'No staff hygiene or training evidence.';
    const hygiene = isYes(data, 'staffFoodHygieneTraining');
    const allergen = isYes(data, 'allergenAwarenessTraining');
    const frequency = str(data, 'trainingFrequency');
    if (hygiene && allergen && isAnnualFrequency(frequency)) {
      score = 5;
      rationale = 'Annual food hygiene and allergen training records indicated.';
    } else if (hygiene && allergen) {
      score = 4;
      rationale = 'Regular staff training in hygiene and allergens.';
    } else if (hygiene) {
      score = 3;
      rationale = 'Basic food hygiene induction training in place.';
    } else if (allergen || frequency) {
      score = 2;
      rationale = 'Limited training evidence provided.';
    } else if (frequency) {
      score = 1;
      rationale = 'Poor training documentation.';
    }
    return makeScore('staffTraining', label, weight, weightTotal, score, rationale);
  },

  cleaningPest(data, weight, weightTotal, label) {
    const cleaning = isYes(data, 'cleaningSchedulesDocumented');
    const chemicals = isYes(data, 'cleaningChemicalsSeparate');
    const externalPest = str(data, 'pestControlBy') === 'external';
    let score = 0;
    let rationale = 'No cleaning or pest control evidence.';
    if (cleaning && chemicals && externalPest) {
      score = 5;
      rationale = 'Documented cleaning schedule and professional pest control confirmed.';
    } else if (cleaning && (chemicals || externalPest)) {
      score = 4;
      rationale = 'Good documented cleaning and pest control controls.';
    } else if (cleaning || chemicals || str(data, 'pestControlBy')) {
      score = 3;
      rationale = 'Basic cleaning or pest control records in place.';
    } else if (str(data, 'pestControlCompany') || str(data, 'pestControlFrequency')) {
      score = 2;
      rationale = 'Informal pest control arrangements only.';
    }
    return makeScore('cleaningPest', label, weight, weightTotal, score, rationale);
  },

  delivery(data, weight, weightTotal, label) {
    const positives = yesCount(
      data,
      'deliveryVehiclesCleaned',
      'chilledDeliveriesTemperatureControlled',
      'frozenBelowMinus18',
      'temperatureRecordsMaintained',
    );
    const hasMonitoring = str(data, 'transportTemperatureMonitoring').length > 20;
    let score = 0;
    let rationale = 'No delivery or temperature control evidence.';
    if (positives >= 3 && isYes(data, 'temperatureRecordsMaintained') && hasMonitoring) {
      score = 5;
      rationale = 'Continuous temperature monitoring with documented records during transport.';
    } else if (positives >= 2 && isYes(data, 'temperatureRecordsMaintained')) {
      score = 4;
      rationale = 'Temperature checks documented for delivery operations.';
    } else if ( positives >= 2) {
      score = 3;
      rationale = 'Spot checks and basic delivery controls in place.';
    } else if (positives === 1) {
      score = 2;
      rationale = 'Limited temperature control evidence.';
    } else if (str(data, 'transportTemperatureMonitoring')) {
      score = 1;
      rationale = 'Poor delivery temperature documentation.';
    }
    return makeScore('delivery', label, weight, weightTotal, score, rationale);
  },

  productSpecs(data, weight, weightTotal, label) {
    let score = 0;
    let rationale = 'No product specification evidence.';
    const specs = isYes(data, 'productSpecificationsAvailable');
    const allergenSpecs = isYes(data, 'allergenSpecificationsAvailable');
    const coa = str(data, 'certificatesOfAnalysis');
    const agreed = isYes(data, 'productsToAgreedSpecifications');
    if (specs && allergenSpecs && agreed && (coa === 'yes' || coa === 'na')) {
      score = 5;
      rationale = 'Full product specifications and allergen data available.';
    } else if (specs && allergenSpecs) {
      score = 4;
      rationale = 'Complete product and allergen specifications available.';
    } else if (specs) {
      score = 3;
      rationale = 'Basic product specifications available.';
    } else if (allergenSpecs || agreed) {
      score = 2;
      rationale = 'Partial specification information only.';
    } else if (coa === 'yes') {
      score = 1;
      rationale = 'Poor specification documentation beyond COA reference.';
    }
    return makeScore('productSpecs', label, weight, weightTotal, score, rationale);
  },

  insurance(data, weight, weightTotal, label) {
    let score = 0;
    let rationale = 'No insurance or legal compliance evidence.';
    const registered = isYes(data, 'registeredWithLocalAuthority');
    const insured = isYes(data, 'productLiabilityInsurance');
    const expiryDays = insuranceExpiryDays(str(data, 'insuranceExpiryDate'));
    if (registered && insured && str(data, 'registrationNumber') && expiryDays !== null && expiryDays > 90) {
      score = 5;
      rationale = 'Current insurance and Local Authority registration confirmed.';
    } else if (registered && insured && expiryDays !== null && expiryDays > 0) {
      score = 4;
      rationale = 'Insurance and registration present; expiry approaching within 90 days.';
    } else if (registered && insured) {
      score = 3;
      rationale = 'Most legal documentation present; insurance expiry not confirmed.';
    } else if (registered || insured) {
      score = 2;
      rationale = 'Some insurance or registration documentation missing.';
    } else if (str(data, 'registrationNumber') || str(data, 'insuranceExpiryDate')) {
      score = 1;
      rationale = 'Significant gaps in legal compliance documentation.';
    }
    return makeScore('insurance', label, weight, weightTotal, score, rationale);
  },

  complaintHistory(data, weight, weightTotal, label) {
    let score = 5;
    let rationale = 'No recalls or serious complaints reported in the last three years.';
    if (isYes(data, 'foodRecall')) {
      score = 1;
      rationale = 'Food recall history reported — requires review.';
    } else if (isYes(data, 'foodSafetyIncidents') && str(data, 'foodSafetyIncidentDetails').length > 30) {
      score = 3;
      rationale = 'Food safety incident reported — verify resolution and corrective actions.';
    } else if (isYes(data, 'foodSafetyIncidents')) {
      score = 4;
      rationale = 'Minor food safety incidents reported without recall history.';
    }
    return makeScore('complaintHistory', label, weight, weightTotal, score, rationale);
  },
};

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function deriveRating(percentage: number) {
  if (percentage >= 90) return { rating: 'Excellent', ratingLabel: '⭐ Excellent', riskLevel: 'Low Risk', approvalStatus: 'Approved', scoreApprovalMonths: 36 };
  if (percentage >= 80) return { rating: 'Good', ratingLabel: '✅ Good', riskLevel: 'Low Risk', approvalStatus: 'Approved', scoreApprovalMonths: 24 };
  if (percentage >= 70) return { rating: 'Satisfactory', ratingLabel: '🟡 Satisfactory', riskLevel: 'Medium Risk', approvalStatus: 'Approved — monitor improvements', scoreApprovalMonths: 12 };
  if (percentage >= 60) return { rating: 'Conditional', ratingLabel: '🟠 Conditional', riskLevel: 'High Risk', approvalStatus: 'Conditional approval — action plan required', scoreApprovalMonths: 6 };
  return { rating: 'Not Approved', ratingLabel: '🔴 Not Approved', riskLevel: 'Critical Risk', approvalStatus: 'Do not use until issues are resolved', scoreApprovalMonths: 0 };
}

function resolveReviewOutcome(
  data: FormAnswers,
  schedules: SupplierReviewSchedule[],
  ratingInfo: ReturnType<typeof deriveRating>,
): {
  approvalStatus: string;
  approvalMonths: number;
  nextReviewDate: string;
  supplierType: string;
  supplierTypeLabel: string;
  reviewInterval: string;
  reviewDriverLabel: string;
} {
  const supplierReview = getSupplierReviewSchedule(data, schedules);
  const dateStr = str(data, 'dateCompleted') || str(data, 'declarationDate');
  const baseDate = new Date(dateStr || Date.now());

  if (ratingInfo.scoreApprovalMonths === 0) {
    return {
      approvalStatus: ratingInfo.approvalStatus,
      approvalMonths: 0,
      nextReviewDate: 'Re-assessment required before approval',
      supplierType: supplierReview.id,
      supplierTypeLabel: supplierReview.label,
      reviewInterval: supplierReview.reviewInterval,
      reviewDriverLabel: supplierReview.reviewDriverLabel,
    };
  }

  const reviewMonths =
    ratingInfo.scoreApprovalMonths <= 6
      ? Math.min(6, supplierReview.reviewMonths)
      : supplierReview.reviewMonths;

  let approvalStatus = ratingInfo.approvalStatus;
  if (ratingInfo.scoreApprovalMonths <= 6) {
    approvalStatus = `Conditional approval — action plan required (re-review in ${reviewMonths} months)`;
  } else {
    approvalStatus = `${ratingInfo.approvalStatus} — ${supplierReview.reviewInterval}`;
  }

  return {
    approvalStatus,
    approvalMonths: reviewMonths,
    nextReviewDate: formatDate(addMonths(baseDate, reviewMonths)),
    supplierType: supplierReview.id,
    supplierTypeLabel: supplierReview.label,
    reviewInterval: supplierReview.reviewInterval,
    reviewDriverLabel: supplierReview.reviewDriverLabel,
  };
}

function buildStrengths(categories: CategoryScore[]): string[] {
  return categories.filter((c) => c.score >= 4).map((c) => `${c.label}: ${c.rationale}`);
}

function buildImprovements(categories: CategoryScore[], data: FormAnswers): string[] {
  const items = categories
    .filter((c) => c.score >= 2 && c.score <= 3)
    .map((c) => `${c.label} should be strengthened — ${c.rationale.replace(/\.$/, '')}.`);
  if (!isAnnualFrequency(str(data, 'trainingFrequency')) && isYes(data, 'staffFoodHygieneTraining')) {
    items.push('Training frequency should be documented as annual with retained records.');
  }
  if (isYes(data, 'chilledDeliveriesTemperatureControlled') && str(data, 'transportTemperatureMonitoring').length < 20) {
    items.push('Delivery temperature monitoring procedures should be documented in more detail.');
  }
  if (isYes(data, 'productSpecificationsAvailable') && !isYes(data, 'allergenSpecificationsAvailable')) {
    items.push('Product specifications should include allergen information where available.');
  }
  return items.slice(0, 6);
}

function buildRequiredActions(categories: CategoryScore[], data: FormAnswers, approvalMonths: number): string[] {
  const actions: string[] = [];
  for (const c of categories.filter((cat) => cat.score <= 1)) {
    actions.push(`Address ${c.label.toLowerCase()} — ${c.rationale.replace(/\.$/, '')}.`);
  }
  if (isYes(data, 'productLiabilityInsurance')) {
    const days = insuranceExpiryDays(str(data, 'insuranceExpiryDate'));
    if (days !== null && days <= 90) actions.push('Submit updated Product Liability Insurance certificate before expiry.');
  } else {
    actions.push('Provide current Product Liability Insurance certificate.');
  }
  if (!isYes(data, 'registeredWithLocalAuthority')) actions.push('Confirm Local Authority food business registration.');
  if (isYes(data, 'foodRecall')) actions.push('Provide recall investigation report and corrective action evidence.');
  if (isYes(data, 'allergenAwarenessTraining') && !hasDocument(data, 'Allergen')) {
    actions.push('Provide evidence of annual allergen refresher training.');
  }
  if (approvalMonths === 0) actions.push('Supplier must not be used until a re-assessment confirms issues are resolved.');
  else if (approvalMonths <= 12) actions.push('Submit an improvement action plan within 30 days.');
  return [...new Set(actions)].slice(0, 8);
}

export function scoreSupplier(
  data: FormAnswers,
  scoringCategories: ScoringCategoryConfig[],
  supplierReviewSchedules: SupplierReviewSchedule[] = [],
): SupplierAssessment {
  const enabled = scoringCategories.filter((c) => c.enabled);
  const weightTotal = enabled.reduce((sum, c) => sum + c.weight, 0) || 1;

  const categories = enabled.map((cat) => {
    const scorer = scorers[cat.id];
    if (!scorer) {
      return makeScore(cat.id, cat.label, cat.weight, weightTotal, 0, 'Scoring module not configured for this category.');
    }
    return scorer(data, cat.weight, weightTotal, cat.label);
  });

  const totalWeightedScore = categories.reduce((sum, c) => sum + c.weightedScore, 0);
  const percentage = Math.round((totalWeightedScore / MAX_SCORE) * 1000) / 10;
  const ratingInfo = deriveRating(percentage);
  const dateStr = str(data, 'dateCompleted') || str(data, 'declarationDate');
  const assessmentDate = dateStr ? formatDate(new Date(dateStr)) : formatDate(new Date());
  const reviewOutcome = resolveReviewOutcome(data, supplierReviewSchedules, ratingInfo);

  const strengths = buildStrengths(categories);
  if (!strengths.length) strengths.push('No categories scored at Good or Excellent level — full review recommended.');

  const improvements = buildImprovements(categories, data);
  const requiredActions = buildRequiredActions(categories, data, reviewOutcome.approvalMonths);

  return {
    categories,
    totalWeightedScore,
    maxScore: MAX_SCORE,
    percentage,
    rating: ratingInfo.rating,
    ratingLabel: ratingInfo.ratingLabel,
    riskLevel: ratingInfo.riskLevel,
    approvalStatus: reviewOutcome.approvalStatus,
    approvalMonths: reviewOutcome.approvalMonths,
    nextReviewDate: reviewOutcome.nextReviewDate,
    supplierType: reviewOutcome.supplierType,
    supplierTypeLabel: reviewOutcome.supplierTypeLabel,
    reviewInterval: reviewOutcome.reviewInterval,
    reviewDriverLabel: reviewOutcome.reviewDriverLabel,
    strengths,
    improvements: improvements.length ? improvements : ['No specific improvement areas identified at Satisfactory level or below.'],
    requiredActions,
    assessmentDate,
  };
}
