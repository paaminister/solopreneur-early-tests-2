/**
 * Doctor-specific expense and income categories for Finnish solo entrepreneur doctors.
 */

export interface Category {
  id: string;
  label: string;
  labelFi: string;
  type: "income" | "expense";
  description: string;
  /** Whether this category requires a supporting document (tosite) per Kirjanpitolaki */
  requiresProof: boolean;
  /** Whether assets in this category may need depreciation (> EUR 1,200) */
  depreciable: boolean;
}

export const CATEGORIES: Category[] = [
  // Income categories
  {
    id: "clinic_income",
    label: "Clinic Income",
    labelFi: "Klinikan tilitys",
    type: "income",
    description: "Net settlement from clinic chain (Terveystalo, Mehilainen, etc.)",
    requiresProof: true,
    depreciable: false,
  },
  {
    id: "other_income",
    label: "Other Income",
    labelFi: "Muu tulo",
    type: "income",
    description: "Consulting, expert witness, lectures, etc.",
    requiresProof: true,
    depreciable: false,
  },

  // Expense categories
  {
    id: "yel",
    label: "YEL Insurance",
    labelFi: "YEL-vakuutus",
    type: "expense",
    description: "Statutory entrepreneur pension insurance (deducted in personal taxation)",
    requiresProof: true,
    depreciable: false,
  },
  {
    id: "potilasvakuutus",
    label: "Patient Insurance",
    labelFi: "Potilasvakuutus",
    type: "expense",
    description: "Mandatory patient/malpractice insurance",
    requiresProof: true,
    depreciable: false,
  },
  {
    id: "laakariliitto",
    label: "Medical Association",
    labelFi: "Laakariliitto",
    type: "expense",
    description: "Finnish Medical Association membership fees",
    requiresProof: true,
    depreciable: false,
  },
  {
    id: "tyohuonevahennys",
    label: "Home Office Deduction",
    labelFi: "Tyohuonevahennys",
    type: "expense",
    description: "Home office deduction for administrative work (flat amount, no receipt needed)",
    requiresProof: false, // Calculated flat deduction - no receipt
    depreciable: false,
  },
  {
    id: "matkakulut",
    label: "Travel Expenses",
    labelFi: "Matkakulut",
    type: "expense",
    description: "Travel between clinics, CME travel, per diems",
    requiresProof: true,
    depreciable: false,
  },
  {
    id: "taydennyskoulutus",
    label: "Continuing Education",
    labelFi: "Taydennyskoulutus",
    type: "expense",
    description: "CME courses, conferences, training",
    requiresProof: true,
    depreciable: false,
  },
  {
    id: "ammattikirjallisuus",
    label: "Professional Literature",
    labelFi: "Ammattikirjallisuus",
    type: "expense",
    description: "Duodecim, medical journals, reference books",
    requiresProof: true,
    depreciable: false,
  },
  {
    id: "laitteet",
    label: "Equipment",
    labelFi: "Laitteet ja tarvikkeet",
    type: "expense",
    description: "Laptop, phone, stethoscope, medical instruments (incl. non-deductible VAT). Items > EUR 1,200 must be depreciated.",
    requiresProof: true,
    depreciable: true, // Assets > EUR 1,200 threshold
  },
  {
    id: "tyovaatteet",
    label: "Work Clothing",
    labelFi: "Tyovaatteet",
    type: "expense",
    description: "Scrubs, lab coats, professional attire",
    requiresProof: true,
    depreciable: false,
  },
  {
    id: "puhelin_netti",
    label: "Phone & Internet",
    labelFi: "Puhelin ja netti",
    type: "expense",
    description: "Business share of phone and internet costs",
    requiresProof: true,
    depreciable: false,
  },
  {
    id: "tilitoimisto",
    label: "Accounting Fees",
    labelFi: "Tilitoimisto",
    type: "expense",
    description: "Accountant / bookkeeping service fees",
    requiresProof: true,
    depreciable: false,
  },
  {
    id: "vakuutukset",
    label: "Other Insurance",
    labelFi: "Muut vakuutukset",
    type: "expense",
    description: "Business liability, legal protection, etc.",
    requiresProof: true,
    depreciable: false,
  },
  {
    id: "toimistotarvikkeet",
    label: "Office Supplies",
    labelFi: "Toimistotarvikkeet",
    type: "expense",
    description: "Paper, pens, printer supplies, etc.",
    requiresProof: true,
    depreciable: false,
  },
  {
    id: "muut_kulut",
    label: "Other Expenses",
    labelFi: "Muut kulut",
    type: "expense",
    description: "Miscellaneous business expenses",
    requiresProof: true,
    depreciable: false,
  },
];

export function getCategoriesByType(type: "income" | "expense"): Category[] {
  return CATEGORIES.filter((c) => c.type === type);
}

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
