export interface StateInfo {
  name: string;
  abbr: string;
  capitalGainsRate: number;
}

export const STATE_TAX_RATES: Record<string, StateInfo> = {
  AL: { name: 'Alabama', abbr: 'AL', capitalGainsRate: 0.050 },
  AK: { name: 'Alaska', abbr: 'AK', capitalGainsRate: 0.000 },
  AZ: { name: 'Arizona', abbr: 'AZ', capitalGainsRate: 0.025 },
  AR: { name: 'Arkansas', abbr: 'AR', capitalGainsRate: 0.044 },
  CA: { name: 'California', abbr: 'CA', capitalGainsRate: 0.133 },
  CO: { name: 'Colorado', abbr: 'CO', capitalGainsRate: 0.044 },
  CT: { name: 'Connecticut', abbr: 'CT', capitalGainsRate: 0.0699 },
  DE: { name: 'Delaware', abbr: 'DE', capitalGainsRate: 0.066 },
  FL: { name: 'Florida', abbr: 'FL', capitalGainsRate: 0.000 },
  GA: { name: 'Georgia', abbr: 'GA', capitalGainsRate: 0.0549 },
  HI: { name: 'Hawaii', abbr: 'HI', capitalGainsRate: 0.0725 },
  ID: { name: 'Idaho', abbr: 'ID', capitalGainsRate: 0.058 },
  IL: { name: 'Illinois', abbr: 'IL', capitalGainsRate: 0.0495 },
  IN: { name: 'Indiana', abbr: 'IN', capitalGainsRate: 0.0305 },
  IA: { name: 'Iowa', abbr: 'IA', capitalGainsRate: 0.0385 },
  KS: { name: 'Kansas', abbr: 'KS', capitalGainsRate: 0.057 },
  KY: { name: 'Kentucky', abbr: 'KY', capitalGainsRate: 0.040 },
  LA: { name: 'Louisiana', abbr: 'LA', capitalGainsRate: 0.0425 },
  ME: { name: 'Maine', abbr: 'ME', capitalGainsRate: 0.0715 },
  MD: { name: 'Maryland', abbr: 'MD', capitalGainsRate: 0.0575 },
  MA: { name: 'Massachusetts', abbr: 'MA', capitalGainsRate: 0.090 },
  MI: { name: 'Michigan', abbr: 'MI', capitalGainsRate: 0.0425 },
  MN: { name: 'Minnesota', abbr: 'MN', capitalGainsRate: 0.0985 },
  MS: { name: 'Mississippi', abbr: 'MS', capitalGainsRate: 0.050 },
  MO: { name: 'Missouri', abbr: 'MO', capitalGainsRate: 0.048 },
  MT: { name: 'Montana', abbr: 'MT', capitalGainsRate: 0.059 },
  NE: { name: 'Nebraska', abbr: 'NE', capitalGainsRate: 0.0564 },
  NV: { name: 'Nevada', abbr: 'NV', capitalGainsRate: 0.000 },
  NH: { name: 'New Hampshire', abbr: 'NH', capitalGainsRate: 0.030 },
  NJ: { name: 'New Jersey', abbr: 'NJ', capitalGainsRate: 0.1075 },
  NM: { name: 'New Mexico', abbr: 'NM', capitalGainsRate: 0.059 },
  NY: { name: 'New York', abbr: 'NY', capitalGainsRate: 0.109 },
  NC: { name: 'North Carolina', abbr: 'NC', capitalGainsRate: 0.045 },
  ND: { name: 'North Dakota', abbr: 'ND', capitalGainsRate: 0.0195 },
  OH: { name: 'Ohio', abbr: 'OH', capitalGainsRate: 0.035 },
  OK: { name: 'Oklahoma', abbr: 'OK', capitalGainsRate: 0.0475 },
  OR: { name: 'Oregon', abbr: 'OR', capitalGainsRate: 0.099 },
  PA: { name: 'Pennsylvania', abbr: 'PA', capitalGainsRate: 0.0307 },
  RI: { name: 'Rhode Island', abbr: 'RI', capitalGainsRate: 0.0599 },
  SC: { name: 'South Carolina', abbr: 'SC', capitalGainsRate: 0.064 },
  SD: { name: 'South Dakota', abbr: 'SD', capitalGainsRate: 0.000 },
  TN: { name: 'Tennessee', abbr: 'TN', capitalGainsRate: 0.000 },
  TX: { name: 'Texas', abbr: 'TX', capitalGainsRate: 0.000 },
  UT: { name: 'Utah', abbr: 'UT', capitalGainsRate: 0.0465 },
  VT: { name: 'Vermont', abbr: 'VT', capitalGainsRate: 0.0875 },
  VA: { name: 'Virginia', abbr: 'VA', capitalGainsRate: 0.0575 },
  WA: { name: 'Washington', abbr: 'WA', capitalGainsRate: 0.070 },
  WV: { name: 'West Virginia', abbr: 'WV', capitalGainsRate: 0.0512 },
  WI: { name: 'Wisconsin', abbr: 'WI', capitalGainsRate: 0.0765 },
  WY: { name: 'Wyoming', abbr: 'WY', capitalGainsRate: 0.000 },
  DC: { name: 'District of Columbia', abbr: 'DC', capitalGainsRate: 0.1075 },
};

export function getStateCGRate(stateAbbr: string): number {
  return STATE_TAX_RATES[stateAbbr]?.capitalGainsRate ?? 0;
}
