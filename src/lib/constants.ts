/**
 * AOTIC — Legal Entity & Brand Constants
 * Hardcoded production data for PDFs, invoices, and exports.
 */

export const COMPANY = {
  name: 'AOTIC',
  legalName: 'AOTIC',
  gstin: '33ACLFA6510A1Z1',
  address: 'No. 28, 200 Feet Bypass Road, Maduravoyal, Chennai - 600095',
  partners: 'Navinkumar Anuj & Chayan Bhoopat Jain',
  phone: '',
  email: '',
  logoPath: '/logo.png',
} as const

/** Payload to send alongside every PDF edge-function invocation */
export function getCompanyPdfPayload() {
  return {
    company_name: COMPANY.legalName,
    company_gstin: COMPANY.gstin,
    company_address: COMPANY.address,
    company_partners: COMPANY.partners,
  }
}
