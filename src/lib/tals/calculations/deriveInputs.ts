import { TalsInputs } from '../types';
import { getLTCGRate, getNIITRate, getMarginalOrdinaryRate } from '../../data/taxBrackets';
import { getStateCGRate } from '../../data/stateTaxRates';

export function deriveTalsRates(inputs: TalsInputs): TalsInputs {
  const derived = JSON.parse(JSON.stringify(inputs)) as TalsInputs;
  const { taxableIncome, filingStatus, state } = derived.tax;

  derived.tax.ltcgRate = getLTCGRate(taxableIncome, filingStatus);
  derived.tax.niitRate = getNIITRate(taxableIncome, filingStatus);
  derived.tax.stateCGRate = getStateCGRate(state);
  derived.tax.ordinaryRate = getMarginalOrdinaryRate(taxableIncome, filingStatus);
  derived.tax.blendedCGRate = derived.tax.ltcgRate + derived.tax.niitRate + derived.tax.stateCGRate;

  return derived;
}
