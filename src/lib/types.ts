export type FieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'url'
  | 'date'
  | 'textarea'
  | 'radio'
  | 'select'
  | 'checkbox-group'
  | 'file'
  | 'hint'
  | 'declaration';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required?: boolean;
  placeholder?: string;
  rows?: number;
  number?: number;
  options?: FieldOption[];
  accept?: string;
}

export interface FormSection {
  id: string;
  title: string;
  optional?: boolean;
  declarationText?: string;
  fields: FormField[];
}

export interface ScoringCategoryConfig {
  id: string;
  label: string;
  weight: number;
  enabled: boolean;
}

export interface SupplierReviewSchedule {
  id: string;
  label: string;
  reviewMonths: number;
}

export interface AppSettings {
  companyName: string;
  logoUrl: string;
  logoFile?: string;
  logoUpdatedAt?: number;
  notifyEmail: string;
  assessorName: string;
  formTitle: string;
  formSubtitle: string;
  formEyebrow: string;
  adminPassword?: string;
}

export interface AppConfig {
  version: number;
  settings: AppSettings;
  sections: FormSection[];
  scoringCategories: ScoringCategoryConfig[];
  supplierReviewSchedules: SupplierReviewSchedule[];
}

export type FormAnswers = Record<string, string | string[] | boolean>;

export interface SubmissionSummary {
  id: string;
  submittedAt: string;
  companyName: string;
  contactEmail: string;
  contactName: string;
  percentage?: number;
  rating?: string;
  approvalStatus?: string;
}
