import type { AppConfig } from './types';

const yesNo = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

const yesNoNa = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'na', label: 'N/A' },
];

export const defaultSupplierReviewSchedules = [
  { id: 'meat', label: 'Meat suppliers', reviewMonths: 12 },
  { id: 'dairy', label: 'Dairy suppliers', reviewMonths: 12 },
  { id: 'sandwich-fillings', label: 'Sandwich fillings', reviewMonths: 12 },
  { id: 'fresh-produce', label: 'Fresh produce', reviewMonths: 12 },
  { id: 'packaging', label: 'Packaging suppliers', reviewMonths: 24 },
  { id: 'flour-dry', label: 'Flour & dry ingredients', reviewMonths: 24 },
  { id: 'cleaning-chemicals', label: 'Cleaning chemical suppliers', reviewMonths: 36 },
  { id: 'office-supplies', label: 'Office supplies', reviewMonths: 36 },
];

export const defaultAppConfig: AppConfig = {
  version: 1,
  settings: {
    notifyEmail: '',
    assessorName: 'David Redrup',
    formTitle: "Your Company Supplier Approval Questionnaire",
    formSubtitle: 'Supplier Approval & Food Safety Assessment — please complete all required sections.',
    formEyebrow: "Your Company",
  },
  supplierReviewSchedules: defaultSupplierReviewSchedules,
  scoringCategories: [
    { id: 'foodSafetyManagement', label: 'Food Safety Management System', weight: 20, enabled: true },
    { id: 'haccp', label: 'HACCP Implementation', weight: 15, enabled: true },
    { id: 'certification', label: 'Third Party Certification (SALSA/BRCGS/ISO)', weight: 10, enabled: true },
    { id: 'hygieneRating', label: 'Food Hygiene Rating', weight: 10, enabled: true },
    { id: 'allergenManagement', label: 'Allergen Management', weight: 10, enabled: true },
    { id: 'traceability', label: 'Traceability & Recall', weight: 10, enabled: true },
    { id: 'staffTraining', label: 'Staff Hygiene & Training', weight: 5, enabled: true },
    { id: 'cleaningPest', label: 'Cleaning & Pest Control', weight: 5, enabled: true },
    { id: 'delivery', label: 'Delivery & Temperature Control', weight: 5, enabled: true },
    { id: 'productSpecs', label: 'Product Specifications', weight: 5, enabled: true },
    { id: 'insurance', label: 'Insurance & Legal Compliance', weight: 5, enabled: true },
    { id: 'complaintHistory', label: 'Complaint History', weight: 5, enabled: true },
  ],
  sections: [
    {
      id: 'company-details',
      title: 'Company Details',
      fields: [
        { id: 'companyName', type: 'text', label: 'Company Name', required: true },
        { id: 'supplierType', type: 'checkbox-group', label: 'Supplier Type(s)', required: true },
        { id: 'tradingName', type: 'text', label: 'Trading Name (if different)' },
        { id: 'registeredAddress', type: 'textarea', label: 'Registered Address', required: true, rows: 3 },
        { id: 'contactName', type: 'text', label: 'Contact Name', required: true },
        { id: 'jobTitle', type: 'text', label: 'Job Title', required: true },
        { id: 'telephone', type: 'tel', label: 'Telephone', required: true },
        { id: 'email', type: 'email', label: 'Email', required: true },
        { id: 'website', type: 'url', label: 'Website', placeholder: 'https://' },
        { id: 'dateCompleted', type: 'date', label: 'Date Completed', required: true },
      ],
    },
    {
      id: 'section-1',
      title: 'Section 1 – Company Information',
      fields: [
        { id: 'registeredWithLocalAuthority', type: 'radio', label: 'Are you registered with your Local Authority?', required: true, number: 1, options: yesNo },
        { id: 'registrationNumber', type: 'text', label: 'If yes, Registration Number' },
        { id: 'productsSupplied', type: 'textarea', label: 'What products do you supply?', required: true, number: 2, rows: 3 },
        { id: 'yearsTrading', type: 'text', label: 'How long has your business been trading?', required: true, number: 3, placeholder: 'e.g. 5 years' },
        { id: 'productLiabilityInsurance', type: 'radio', label: 'Do you hold Product Liability Insurance?', required: true, number: 4, options: yesNo },
        { id: 'insuranceHint', type: 'hint', label: 'Please attach certificate where applicable in Section 9.' },
        { id: 'insuranceExpiryDate', type: 'date', label: 'Expiry Date' },
      ],
    },
    {
      id: 'section-2',
      title: 'Section 2 – Food Safety Management',
      fields: [
        { id: 'documentedFsms', type: 'radio', label: 'Do you operate a documented Food Safety Management System?', required: true, number: 5, options: yesNo },
        {
          id: 'fsmsTypes',
          type: 'checkbox-group',
          label: 'If yes, please specify:',
          options: [
            { value: 'HACCP', label: 'HACCP' },
            { value: 'ISO 22000', label: 'ISO 22000' },
            { value: 'SALSA', label: 'SALSA' },
            { value: 'BRCGS', label: 'BRCGS' },
            { value: 'Other', label: 'Other' },
          ],
        },
        { id: 'fsmsOther', type: 'text', label: 'Other (please specify)', placeholder: 'Please specify' },
        { id: 'haccpReviewedRegularly', type: 'radio', label: 'Is your HACCP plan reviewed regularly?', required: true, number: 6, options: yesNo },
        { id: 'haccpReviewFrequency', type: 'text', label: 'Review frequency', placeholder: 'e.g. Annually' },
        { id: 'foodSafetyIncidents', type: 'radio', label: 'Have you experienced any Food Safety incidents within the last three years?', required: true, number: 7, options: [{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }] },
        { id: 'foodSafetyIncidentDetails', type: 'textarea', label: 'If yes, please provide details', rows: 3 },
        { id: 'foodRecall', type: 'radio', label: 'Have you ever had a Food Recall?', required: true, number: 8, options: [{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }] },
        { id: 'foodRecallDetails', type: 'textarea', label: 'If yes, please explain', rows: 3 },
      ],
    },
    {
      id: 'section-3',
      title: 'Section 3 – Hygiene Standards',
      fields: [
        {
          id: 'hygieneRating',
          type: 'radio',
          label: 'What is your latest Food Hygiene Rating?',
          required: true,
          number: 9,
          options: [
            { value: '5', label: '5' },
            { value: '4', label: '4' },
            { value: '3', label: '3' },
            { value: 'other', label: 'Other' },
          ],
        },
        { id: 'hygieneRatingDate', type: 'date', label: 'Date Awarded' },
        { id: 'cleaningSchedulesDocumented', type: 'radio', label: 'Are routine cleaning schedules documented?', required: true, number: 10, options: yesNo },
        { id: 'cleaningChemicalsSeparate', type: 'radio', label: 'Are cleaning chemicals stored separately from food?', required: true, number: 11, options: yesNo },
        {
          id: 'pestControlBy',
          type: 'radio',
          label: 'Is pest control undertaken by:',
          required: true,
          number: 12,
          options: [
            { value: 'external', label: 'External Contractor' },
            { value: 'internal', label: 'Internal' },
          ],
        },
        { id: 'pestControlCompany', type: 'text', label: 'Company Name' },
        { id: 'pestControlFrequency', type: 'text', label: 'Frequency' },
        { id: 'temperatureRecordsMaintained', type: 'radio', label: 'Are temperature records maintained?', required: true, number: 13, options: yesNo },
        { id: 'staffFoodHygieneTraining', type: 'radio', label: 'Are staff trained in Food Hygiene?', required: true, number: 14, options: yesNo },
        { id: 'trainingFrequency', type: 'text', label: 'Training Frequency' },
        { id: 'allergenAwarenessTraining', type: 'radio', label: 'Do staff receive allergen awareness training?', required: true, number: 15, options: yesNo },
      ],
    },
    {
      id: 'section-4',
      title: 'Section 4 – Traceability',
      fields: [
        {
          id: 'traceability',
          type: 'checkbox-group',
          label: 'Can all products be fully traced?',
          number: 16,
          options: [
            { value: 'One Step Back', label: 'One Step Back' },
            { value: 'One Step Forward', label: 'One Step Forward' },
            { value: 'Full Traceability', label: 'Full Traceability' },
          ],
        },
        { id: 'recallWithinFourHours', type: 'radio', label: 'Can products be recalled within four hours?', required: true, number: 17, options: yesNo },
        { id: 'traceabilityRecordsRetention', type: 'text', label: 'How long are traceability records retained?', required: true, number: 18, placeholder: 'e.g. 3 years' },
      ],
    },
    {
      id: 'section-5',
      title: 'Section 5 – Allergen Management',
      fields: [
        { id: 'documentedAllergenControls', type: 'radio', label: 'Do you have documented allergen controls?', required: true, number: 19, options: yesNo },
        { id: 'allergenProductsSegregated', type: 'radio', label: 'Are allergen and non-allergen products segregated?', required: true, number: 20, options: yesNo },
        { id: 'allergenLabelsVerified', type: 'radio', label: 'Are allergen labels verified before dispatch?', required: true, number: 21, options: yesNo },
        { id: 'allergenSpecificationsAvailable', type: 'radio', label: 'Can you provide current allergen specifications?', required: true, number: 22, options: yesNo },
      ],
    },
    {
      id: 'section-6',
      title: 'Section 6 – Quality Assurance',
      fields: [
        { id: 'productSpecificationsAvailable', type: 'radio', label: 'Are product specifications available?', required: true, number: 23, options: yesNo },
        { id: 'certificatesOfAnalysis', type: 'radio', label: 'Are Certificates of Analysis available where applicable?', required: true, number: 24, options: yesNoNa },
        { id: 'productsToAgreedSpecifications', type: 'radio', label: 'Are products supplied to agreed specifications?', required: true, number: 25, options: yesNo },
        { id: 'complaintInvestigationProcess', type: 'textarea', label: 'How are customer complaints investigated?', required: true, number: 26, rows: 3 },
      ],
    },
    {
      id: 'section-7',
      title: 'Section 7 – Delivery & Transport',
      fields: [
        { id: 'deliveryVehiclesCleaned', type: 'radio', label: 'Are delivery vehicles cleaned regularly?', required: true, number: 27, options: yesNo },
        { id: 'chilledDeliveriesTemperatureControlled', type: 'radio', label: 'Are chilled deliveries temperature controlled?', required: true, number: 28, options: yesNo },
        { id: 'frozenBelowMinus18', type: 'radio', label: 'Are frozen products maintained below -18°C?', required: true, number: 29, options: yesNo },
        { id: 'transportTemperatureMonitoring', type: 'textarea', label: 'How is temperature monitored during transport?', required: true, number: 30, rows: 3 },
      ],
    },
    {
      id: 'section-8',
      title: 'Section 8 – Sustainability',
      optional: true,
      fields: [
        { id: 'environmentalPolicy', type: 'radio', label: 'Do you have an Environmental Policy?', number: 31, options: yesNo },
        { id: 'wasteReductionInitiatives', type: 'radio', label: 'Do you operate waste reduction initiatives?', number: 32, options: yesNo },
        { id: 'responsibleSourcing', type: 'radio', label: 'Do you source ingredients responsibly?', number: 33, options: yesNo },
      ],
    },
    {
      id: 'section-9',
      title: 'Section 9 – Documentation',
      fields: [
        { id: 'documentTypesHint', type: 'hint', label: 'Please tick all documents you are attaching, then upload files below (PDF, JPG, PNG — max 10MB each, up to 15 files).' },
        {
          id: 'documentTypes',
          type: 'checkbox-group',
          label: 'Please attach where applicable:',
          options: [
            { value: 'Public Liability Insurance', label: 'Public Liability Insurance' },
            { value: 'Product Liability Insurance', label: 'Product Liability Insurance' },
            { value: 'Food Hygiene Rating', label: 'Food Hygiene Rating' },
            { value: 'HACCP Summary', label: 'HACCP Summary' },
            { value: 'SALSA/BRCGS/ISO Certificate', label: 'SALSA/BRCGS/ISO Certificate' },
            { value: 'Product Specifications', label: 'Product Specifications' },
            { value: 'Allergen Information', label: 'Allergen Information' },
            { value: 'Traceability Procedure', label: 'Traceability Procedure' },
            { value: 'Pest Control Certificate', label: 'Pest Control Certificate' },
            { value: 'Food Safety Policy', label: 'Food Safety Policy' },
            { value: 'Cleaning Schedule Example', label: 'Cleaning Schedule Example' },
            { value: 'Temperature Monitoring Procedure', label: 'Temperature Monitoring Procedure' },
            { value: 'Recall Procedure', label: 'Recall Procedure' },
          ],
        },
        {
          id: 'attachments',
          type: 'file',
          label: 'Upload Documents',
          accept: '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp',
        },
      ],
    },
    {
      id: 'declaration',
      title: 'Supplier Declaration',
      declarationText:
        "I confirm that the information provided is accurate and that Your Company will be notified of any significant changes affecting food safety, product quality, allergen management or legal compliance.",
      fields: [
        { id: 'declarationAccepted', type: 'declaration', label: 'I confirm the above declaration', required: true },
        { id: 'declarationName', type: 'text', label: 'Name', required: true },
        { id: 'declarationPosition', type: 'text', label: 'Position', required: true },
        { id: 'declarationSignature', type: 'text', label: 'Signature', required: true, placeholder: 'Type full name as signature' },
        { id: 'declarationDate', type: 'date', label: 'Date', required: true },
      ],
    },
  ],
};
