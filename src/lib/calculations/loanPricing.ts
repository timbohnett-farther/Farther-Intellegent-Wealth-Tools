import { LoanConfig, LoanStructureResult } from '../types';

export function calculateLoanStructure(config: LoanConfig): LoanStructureResult {
  const { loanAmount, termYears, boxRate, managerFee } = config;
  const allInRate = boxRate + managerFee;

  const strikeWidth = 1000;
  const multiplier = 100;
  const faceValuePerContract = strikeWidth * multiplier;

  const days = termYears * 365;
  const discountFactor = 1 - allInRate * (days / 365);
  const premiumPerContract = faceValuePerContract * discountFactor;

  const contractsNeeded = Math.ceil(loanAmount / premiumPerContract);

  const actualProceeds = contractsNeeded * premiumPerContract;
  const actualRepayment = contractsNeeded * faceValuePerContract;
  const interestPaid = actualRepayment - actualProceeds;
  const netPremium = actualProceeds;

  const annualizedRate = ((actualRepayment / actualProceeds) - 1) * (365 / days);

  return {
    strikeWidth,
    multiplier,
    contracts: contractsNeeded,
    faceValue: actualRepayment,
    netPremium,
    impliedInterestCost: interestPaid,
    annualizedRate,
    allInRate,
    actualProceeds,
    actualRepayment,
    interestPaid,
  };
}
