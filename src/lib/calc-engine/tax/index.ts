/**
 * Tax calculation module — re-exports all tax functions.
 */

export { calculateFederalTax } from './federal-income-tax';
export { calculateSETax } from './self-employment-tax';
export { calculateCapitalGainsTax } from './capital-gains-tax';
export type { CapitalGainsTaxResult } from './capital-gains-tax';
export { calculateNIIT } from './niit';
export type { NIITResult } from './niit';
export { calculateSSTaxation } from './social-security-taxation';
export { calculateIRMAA } from './irmaa';
export { calculateQBI } from './qbi';
export type { QBIResult } from './qbi';
export { calculateEstateTax } from './estate-gift-tax';
export type { EstateTaxResult } from './estate-gift-tax';
export { calculateStateTax, STATE_TAX_CONFIG } from './state-income-tax';
