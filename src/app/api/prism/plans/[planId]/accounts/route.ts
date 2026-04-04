export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prism/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;
    const { searchParams } = new URL(request.url);
    const bucket = searchParams.get('bucket');

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      select: { id: true },
    });

    if (!plan) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const where: Record<string, unknown> = { planId };

    if (bucket) {
      where.taxBucket = bucket;
    }

    const accounts = await prisma.account.findMany({
      where,
      include: {
        owner: true,
        coOwner: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate summary
    const allAccounts = await prisma.account.findMany({
      where: { planId },
    });

    const totalAssets = allAccounts
      .filter((a) => !a.isLiability)
      .reduce((sum, a) => sum + a.currentBalance, 0);

    const totalLiabilities = allAccounts
      .filter((a) => a.isLiability)
      .reduce((sum, a) => sum + Math.abs(a.currentBalance), 0);

    const netWorth = totalAssets - totalLiabilities;

    // Group by tax bucket
    const byTaxBucket: Record<string, number> = {};
    for (const account of allAccounts) {
      if (!account.isLiability) {
        byTaxBucket[account.taxBucket] = (byTaxBucket[account.taxBucket] || 0) + account.currentBalance;
      }
    }

    return NextResponse.json({
      accounts,
      summary: {
        totalAssets,
        totalLiabilities,
        netWorth,
        byTaxBucket,
      },
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const { planId } = await params;
    const body = await request.json();

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      select: { id: true },
    });

    if (!plan) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const { name, accountType, registration, taxBucket, currentBalance, clientId } = body;

    if (!name || !accountType || !registration || !taxBucket || currentBalance === undefined || !clientId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, accountType, registration, taxBucket, currentBalance, clientId' },
        { status: 400 }
      );
    }

    if (body.balanceAsOf) {
      body.balanceAsOf = new Date(body.balanceAsOf);
    }
    if (body.maturityDate) {
      body.maturityDate = new Date(body.maturityDate);
    }
    if (body.surrenderPeriodEnd) {
      body.surrenderPeriodEnd = new Date(body.surrenderPeriodEnd);
    }
    if (body.annuityStartDate) {
      body.annuityStartDate = new Date(body.annuityStartDate);
    }
    if (body.lastAppraisalDate) {
      body.lastAppraisalDate = new Date(body.lastAppraisalDate);
    }
    if (body.originationDate) {
      body.originationDate = new Date(body.originationDate);
    }
    if (body.debtMaturityDate) {
      body.debtMaturityDate = new Date(body.debtMaturityDate);
    }
    if (body.lastSyncAt) {
      body.lastSyncAt = new Date(body.lastSyncAt);
    }

    // Explicitly whitelist fields to prevent unintended data insertion
    const account = await prisma.account.create({
      data: {
        planId,
        clientId,
        coOwnerId: body.coOwnerId,
        name,
        institution: body.institution,
        accountNumberLast4: body.accountNumberLast4,
        accountType,
        registration,
        taxBucket,
        currentBalance,
        balanceAsOf: body.balanceAsOf || new Date(),
        costBasis: body.costBasis,
        unrealizedGain: body.unrealizedGain,
        equityPct: body.equityPct,
        bondPct: body.bondPct,
        cashPct: body.cashPct,
        alternativePct: body.alternativePct,
        expectedReturn: body.expectedReturn,
        employerMatchPct: body.employerMatchPct,
        employerMatchLimitPct: body.employerMatchLimitPct,
        vestingSchedule: body.vestingSchedule,
        vestingYearsComplete: body.vestingYearsComplete,
        propertyAddress: body.propertyAddress,
        propertyType: body.propertyType,
        estimatedValue: body.estimatedValue,
        mortgageAccountId: body.mortgageAccountId,
        annualRentIncome: body.annualRentIncome,
        annualPropertyTax: body.annualPropertyTax,
        annualInsurance: body.annualInsurance,
        annualHoa: body.annualHoa,
        annualMaintenance: body.annualMaintenance,
        depreciationBasis: body.depreciationBasis,
        policyType: body.policyType,
        deathBenefit: body.deathBenefit,
        cashSurrenderValue: body.cashSurrenderValue,
        annualPremium: body.annualPremium,
        policyLoanBalance: body.policyLoanBalance,
        insuredClientId: body.insuredClientId,
        beneficiaryPrimary: body.beneficiaryPrimary,
        beneficiaryContingent: body.beneficiaryContingent,
        maturityDate: body.maturityDate,
        annuityType: body.annuityType,
        surrenderChargePct: body.surrenderChargePct,
        surrenderPeriodEnd: body.surrenderPeriodEnd,
        annuityStartDate: body.annuityStartDate,
        guaranteedIncome: body.guaranteedIncome,
        fundName: body.fundName,
        vintageYear: body.vintageYear,
        committedCapital: body.committedCapital,
        calledCapital: body.calledCapital,
        distributedCapital: body.distributedCapital,
        nav: body.nav,
        irr: body.irr,
        expectedExitYear: body.expectedExitYear,
        businessName: body.businessName,
        businessType: body.businessType,
        ownershipPct: body.ownershipPct,
        ebitda: body.ebitda,
        valuationMultiple: body.valuationMultiple,
        expectedSaleYear: body.expectedSaleYear,
        tokenSymbol: body.tokenSymbol,
        unitsHeld: body.unitsHeld,
        costBasisPerUnit: body.costBasisPerUnit,
        walletType: body.walletType,
        collectibleType: body.collectibleType,
        appraisedValue: body.appraisedValue,
        lastAppraisalDate: body.lastAppraisalDate,
        isLiability: body.isLiability ?? false,
        originalBalance: body.originalBalance,
        interestRate: body.interestRate,
        loanType: body.loanType,
        monthlyPayment: body.monthlyPayment,
        remainingTermMonths: body.remainingTermMonths,
        originationDate: body.originationDate,
        debtMaturityDate: body.debtMaturityDate,
        isTaxDeductible: body.isTaxDeductible ?? false,
        beneficiaryId: body.beneficiaryId,
        plan529State: body.plan529State,
        hsaInvestableBalance: body.hsaInvestableBalance,
        dataSource: body.dataSource ?? 'manual',
        lastSyncAt: body.lastSyncAt,
        externalAccountId: body.externalAccountId,
        notes: body.notes,
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
