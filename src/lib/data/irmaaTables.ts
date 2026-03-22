import { FilingStatus } from '../types';

interface IRMAABracket {
  min: number;
  max: number;
  partBSurcharge: number;
  partDSurcharge: number;
}

const IRMAA_BRACKETS_SINGLE: IRMAABracket[] = [
  { min: 0, max: 106000, partBSurcharge: 0, partDSurcharge: 0 },
  { min: 106000, max: 133000, partBSurcharge: 838.8, partDSurcharge: 155.4 },
  { min: 133000, max: 167000, partBSurcharge: 2096.4, partDSurcharge: 401.4 },
  { min: 167000, max: 200000, partBSurcharge: 3354.0, partDSurcharge: 647.4 },
  { min: 200000, max: 500000, partBSurcharge: 4611.6, partDSurcharge: 893.4 },
  { min: 500000, max: Infinity, partBSurcharge: 5030.4, partDSurcharge: 974.4 },
];

const IRMAA_BRACKETS_MFJ: IRMAABracket[] = [
  { min: 0, max: 212000, partBSurcharge: 0, partDSurcharge: 0 },
  { min: 212000, max: 266000, partBSurcharge: 838.8, partDSurcharge: 155.4 },
  { min: 266000, max: 334000, partBSurcharge: 2096.4, partDSurcharge: 401.4 },
  { min: 334000, max: 400000, partBSurcharge: 3354.0, partDSurcharge: 647.4 },
  { min: 400000, max: 750000, partBSurcharge: 4611.6, partDSurcharge: 893.4 },
  { min: 750000, max: Infinity, partBSurcharge: 5030.4, partDSurcharge: 974.4 },
];

const IRMAA_TABLES: Record<string, IRMAABracket[]> = {
  single: IRMAA_BRACKETS_SINGLE,
  mfj: IRMAA_BRACKETS_MFJ,
  mfs: IRMAA_BRACKETS_SINGLE,
  hoh: IRMAA_BRACKETS_SINGLE,
};

function lookupIRMAA(agi: number, brackets: IRMAABracket[]): number {
  for (const bracket of brackets) {
    if (agi >= bracket.min && agi < bracket.max) {
      return bracket.partBSurcharge + bracket.partDSurcharge;
    }
  }
  const last = brackets[brackets.length - 1];
  return last.partBSurcharge + last.partDSurcharge;
}

export function getIRMAASurcharge(
  currentAGI: number,
  newAGI: number,
  status: FilingStatus
): number {
  const brackets = IRMAA_TABLES[status] || IRMAA_BRACKETS_SINGLE;
  const currentSurcharge = lookupIRMAA(currentAGI, brackets);
  const newSurcharge = lookupIRMAA(newAGI, brackets);
  return Math.max(0, newSurcharge - currentSurcharge);
}
