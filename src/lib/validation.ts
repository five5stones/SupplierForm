export interface SupplierSubmission {
  companyName: string;
  tradingName: string;
  registeredAddress: string;
  contactName: string;
  jobTitle: string;
  telephone: string;
  email: string;
  website: string;
  dateCompleted: string;
  registeredWithLocalAuthority: string;
  registrationNumber: string;
  productsSupplied: string;
  yearsTrading: string;
  productLiabilityInsurance: string;
  insuranceExpiryDate: string;
  documentedFsms: string;
  fsmsTypes: string[];
  fsmsOther: string;
  haccpReviewedRegularly: string;
  haccpReviewFrequency: string;
  foodSafetyIncidents: string;
  foodSafetyIncidentDetails: string;
  foodRecall: string;
  foodRecallDetails: string;
  hygieneRating: string;
  hygieneRatingDate: string;
  cleaningSchedulesDocumented: string;
  cleaningChemicalsSeparate: string;
  pestControlBy: string;
  pestControlCompany: string;
  pestControlFrequency: string;
  temperatureRecordsMaintained: string;
  staffFoodHygieneTraining: string;
  trainingFrequency: string;
  allergenAwarenessTraining: string;
  traceability: string[];
  recallWithinFourHours: string;
  traceabilityRecordsRetention: string;
  documentedAllergenControls: string;
  allergenProductsSegregated: string;
  allergenLabelsVerified: string;
  allergenSpecificationsAvailable: string;
  productSpecificationsAvailable: string;
  certificatesOfAnalysis: string;
  productsToAgreedSpecifications: string;
  complaintInvestigationProcess: string;
  deliveryVehiclesCleaned: string;
  chilledDeliveriesTemperatureControlled: string;
  frozenBelowMinus18: string;
  transportTemperatureMonitoring: string;
  environmentalPolicy: string;
  wasteReductionInitiatives: string;
  responsibleSourcing: string;
  documentTypes: string[];
  declarationAccepted: boolean;
  declarationName: string;
  declarationPosition: string;
  declarationSignature: string;
  declarationDate: string;
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) || '').trim();
}

function multi(formData: FormData, key: string): string[] {
  return formData.getAll(key).map((v) => String(v));
}

export function parseSubmission(formData: FormData): SupplierSubmission {
  return {
    companyName: str(formData, 'companyName'),
    tradingName: str(formData, 'tradingName'),
    registeredAddress: str(formData, 'registeredAddress'),
    contactName: str(formData, 'contactName'),
    jobTitle: str(formData, 'jobTitle'),
    telephone: str(formData, 'telephone'),
    email: str(formData, 'email'),
    website: str(formData, 'website'),
    dateCompleted: str(formData, 'dateCompleted'),
    registeredWithLocalAuthority: str(formData, 'registeredWithLocalAuthority'),
    registrationNumber: str(formData, 'registrationNumber'),
    productsSupplied: str(formData, 'productsSupplied'),
    yearsTrading: str(formData, 'yearsTrading'),
    productLiabilityInsurance: str(formData, 'productLiabilityInsurance'),
    insuranceExpiryDate: str(formData, 'insuranceExpiryDate'),
    documentedFsms: str(formData, 'documentedFsms'),
    fsmsTypes: multi(formData, 'fsmsTypes'),
    fsmsOther: str(formData, 'fsmsOther'),
    haccpReviewedRegularly: str(formData, 'haccpReviewedRegularly'),
    haccpReviewFrequency: str(formData, 'haccpReviewFrequency'),
    foodSafetyIncidents: str(formData, 'foodSafetyIncidents'),
    foodSafetyIncidentDetails: str(formData, 'foodSafetyIncidentDetails'),
    foodRecall: str(formData, 'foodRecall'),
    foodRecallDetails: str(formData, 'foodRecallDetails'),
    hygieneRating: str(formData, 'hygieneRating'),
    hygieneRatingDate: str(formData, 'hygieneRatingDate'),
    cleaningSchedulesDocumented: str(formData, 'cleaningSchedulesDocumented'),
    cleaningChemicalsSeparate: str(formData, 'cleaningChemicalsSeparate'),
    pestControlBy: str(formData, 'pestControlBy'),
    pestControlCompany: str(formData, 'pestControlCompany'),
    pestControlFrequency: str(formData, 'pestControlFrequency'),
    temperatureRecordsMaintained: str(formData, 'temperatureRecordsMaintained'),
    staffFoodHygieneTraining: str(formData, 'staffFoodHygieneTraining'),
    trainingFrequency: str(formData, 'trainingFrequency'),
    allergenAwarenessTraining: str(formData, 'allergenAwarenessTraining'),
    traceability: multi(formData, 'traceability'),
    recallWithinFourHours: str(formData, 'recallWithinFourHours'),
    traceabilityRecordsRetention: str(formData, 'traceabilityRecordsRetention'),
    documentedAllergenControls: str(formData, 'documentedAllergenControls'),
    allergenProductsSegregated: str(formData, 'allergenProductsSegregated'),
    allergenLabelsVerified: str(formData, 'allergenLabelsVerified'),
    allergenSpecificationsAvailable: str(formData, 'allergenSpecificationsAvailable'),
    productSpecificationsAvailable: str(formData, 'productSpecificationsAvailable'),
    certificatesOfAnalysis: str(formData, 'certificatesOfAnalysis'),
    productsToAgreedSpecifications: str(formData, 'productsToAgreedSpecifications'),
    complaintInvestigationProcess: str(formData, 'complaintInvestigationProcess'),
    deliveryVehiclesCleaned: str(formData, 'deliveryVehiclesCleaned'),
    chilledDeliveriesTemperatureControlled: str(formData, 'chilledDeliveriesTemperatureControlled'),
    frozenBelowMinus18: str(formData, 'frozenBelowMinus18'),
    transportTemperatureMonitoring: str(formData, 'transportTemperatureMonitoring'),
    environmentalPolicy: str(formData, 'environmentalPolicy'),
    wasteReductionInitiatives: str(formData, 'wasteReductionInitiatives'),
    responsibleSourcing: str(formData, 'responsibleSourcing'),
    documentTypes: multi(formData, 'documentTypes'),
    declarationAccepted: formData.get('declarationAccepted') === 'on',
    declarationName: str(formData, 'declarationName'),
    declarationPosition: str(formData, 'declarationPosition'),
    declarationSignature: str(formData, 'declarationSignature'),
    declarationDate: str(formData, 'declarationDate'),
  };
}

const requiredRadioFields: { key: keyof SupplierSubmission; label: string }[] = [
  { key: 'registeredWithLocalAuthority', label: 'Local Authority registration' },
  { key: 'productLiabilityInsurance', label: 'Product Liability Insurance' },
  { key: 'documentedFsms', label: 'Food Safety Management System' },
  { key: 'haccpReviewedRegularly', label: 'HACCP plan review' },
  { key: 'foodSafetyIncidents', label: 'Food Safety incidents' },
  { key: 'foodRecall', label: 'Food Recall' },
  { key: 'hygieneRating', label: 'Food Hygiene Rating' },
  { key: 'cleaningSchedulesDocumented', label: 'Cleaning schedules' },
  { key: 'cleaningChemicalsSeparate', label: 'Cleaning chemicals storage' },
  { key: 'pestControlBy', label: 'Pest control' },
  { key: 'temperatureRecordsMaintained', label: 'Temperature records' },
  { key: 'staffFoodHygieneTraining', label: 'Food Hygiene training' },
  { key: 'allergenAwarenessTraining', label: 'Allergen awareness training' },
  { key: 'recallWithinFourHours', label: 'Recall within four hours' },
  { key: 'documentedAllergenControls', label: 'Allergen controls' },
  { key: 'allergenProductsSegregated', label: 'Allergen segregation' },
  { key: 'allergenLabelsVerified', label: 'Allergen label verification' },
  { key: 'allergenSpecificationsAvailable', label: 'Allergen specifications' },
  { key: 'productSpecificationsAvailable', label: 'Product specifications' },
  { key: 'certificatesOfAnalysis', label: 'Certificates of Analysis' },
  { key: 'productsToAgreedSpecifications', label: 'Agreed specifications' },
  { key: 'deliveryVehiclesCleaned', label: 'Delivery vehicle cleaning' },
  { key: 'chilledDeliveriesTemperatureControlled', label: 'Chilled deliveries' },
  { key: 'frozenBelowMinus18', label: 'Frozen product temperature' },
];

function formatYesNo(value: string): string {
  if (value === 'yes') return 'Yes';
  if (value === 'no') return 'No';
  if (value === 'na') return 'N/A';
  if (value === 'external') return 'External Contractor';
  if (value === 'internal') return 'Internal';
  return value || '—';
}

export { formatYesNo };

export function validateSubmission(data: SupplierSubmission): string[] {
  const errors: string[] = [];

  if (!data.companyName) errors.push('Company name is required.');
  if (!data.registeredAddress) errors.push('Registered address is required.');
  if (!data.contactName) errors.push('Contact name is required.');
  if (!data.jobTitle) errors.push('Job title is required.');
  if (!data.telephone) errors.push('Telephone is required.');
  if (!data.email) errors.push('Email is required.');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Email is invalid.');
  }
  if (!data.dateCompleted) errors.push('Date completed is required.');
  if (!data.productsSupplied) errors.push('Products supplied is required.');
  if (!data.yearsTrading) errors.push('Years trading is required.');
  if (!data.traceabilityRecordsRetention) errors.push('Traceability records retention is required.');
  if (!data.complaintInvestigationProcess) errors.push('Complaint investigation process is required.');
  if (!data.transportTemperatureMonitoring) errors.push('Transport temperature monitoring is required.');

  for (const field of requiredRadioFields) {
    if (!data[field.key]) {
      errors.push(`${field.label} is required.`);
    }
  }

  if (!data.declarationAccepted) errors.push('You must accept the supplier declaration.');
  if (!data.declarationName) errors.push('Declaration name is required.');
  if (!data.declarationPosition) errors.push('Declaration position is required.');
  if (!data.declarationSignature) errors.push('Declaration signature is required.');
  if (!data.declarationDate) errors.push('Declaration date is required.');

  return errors;
}
