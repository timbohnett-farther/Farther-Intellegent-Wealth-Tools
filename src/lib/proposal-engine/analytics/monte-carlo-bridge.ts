/**
 * Monte Carlo Simulation Bridge
 *
 * Bridges the existing calc-engine Monte Carlo module to the proposal engine,
 * running 10,000-path simulations for portfolio projection analysis.
 */

import type { MoneyCents } from '@/lib/proposal-engine/types'

export interface MonteCarloParams {
  portfolioValue: MoneyCents // starting value in cents
  expectedReturn: number // annualized decimal (e.g., 0.07)
  volatility: number // annualized decimal (e.g., 0.15)
  timeHorizonYears: number
  annualContribution?: MoneyCents // in cents
  annualWithdrawal?: MoneyCents // in cents
  inflationRate?: number // decimal (default 0.025)
  simulationCount?: number // default 10000
  confidenceLevel?: number // default 0.95
}

export interface MonteCarloResult {
  paths: number // total simulations run
  timeHorizon: number
  percentiles: {
    p5: number[] // 5th percentile path (value at each year)
    p25: number[]
    p50: number[] // median
    p75: number[]
    p95: number[]
  }
  terminalValues: {
    mean: number
    median: number
    p5: number
    p25: number
    p75: number
    p95: number
    min: number
    max: number
  }
  probabilityOfSuccess: number // probability of not running out of money
  probabilityOfDoubling: number // probability of 2x initial value
  probabilityOfLoss: number // probability of ending below initial value
  realReturnEstimate: number // inflation-adjusted expected return
  shortfallRisk: number // probability of failing to meet goal
  bestPath: number[]
  worstPath: number[]
}

/**
 * Runs Monte Carlo simulation for portfolio projection
 */
export function runProposalMonteCarlo(params: MonteCarloParams): MonteCarloResult {
  const {
    portfolioValue,
    expectedReturn,
    volatility,
    timeHorizonYears,
    annualContribution = 0,
    annualWithdrawal = 0,
    inflationRate = 0.025,
    simulationCount = 10000,
  } = params

  // Validate inputs
  if (timeHorizonYears < 1 || timeHorizonYears > 50) {
    throw new Error('Time horizon must be between 1 and 50 years')
  }
  if (simulationCount < 100 || simulationCount > 100000) {
    throw new Error('Simulation count must be between 100 and 100,000')
  }
  if (volatility < 0 || volatility > 1) {
    throw new Error('Volatility must be between 0 and 1')
  }

  // Run simulations
  const allPaths: number[][] = []
  const terminalValues: number[] = []

  for (let sim = 0; sim < simulationCount; sim++) {
    const path = runSingleSimulation(
      portfolioValue,
      expectedReturn,
      volatility,
      timeHorizonYears,
      annualContribution,
      annualWithdrawal
    )
    allPaths.push(path)
    terminalValues.push(path[path.length - 1])
  }

  // Calculate percentiles at each year
  const percentiles = calculatePercentiles(allPaths, timeHorizonYears)

  // Calculate terminal statistics
  const sortedTerminals = [...terminalValues].sort((a, b) => a - b)
  const terminalStats = {
    mean: average(terminalValues),
    median: percentile(sortedTerminals, 0.5),
    p5: percentile(sortedTerminals, 0.05),
    p25: percentile(sortedTerminals, 0.25),
    p75: percentile(sortedTerminals, 0.75),
    p95: percentile(sortedTerminals, 0.95),
    min: Math.min(...terminalValues),
    max: Math.max(...terminalValues),
  }

  // Calculate probabilities
  const probabilityOfSuccess = terminalValues.filter(v => v > 0).length / simulationCount
  const probabilityOfDoubling = terminalValues.filter(v => v >= portfolioValue * 2).length / simulationCount
  const probabilityOfLoss = terminalValues.filter(v => v < portfolioValue).length / simulationCount

  // Real return estimate (inflation-adjusted)
  const realReturnEstimate = expectedReturn - inflationRate

  // Shortfall risk (probability of ending below starting value in real terms)
  const realStartingValue = portfolioValue * Math.pow(1 + inflationRate, timeHorizonYears)
  const shortfallRisk = terminalValues.filter(v => v < realStartingValue).length / simulationCount

  // Best and worst paths
  const bestPathIndex = terminalValues.indexOf(Math.max(...terminalValues))
  const worstPathIndex = terminalValues.indexOf(Math.min(...terminalValues))

  return {
    paths: simulationCount,
    timeHorizon: timeHorizonYears,
    percentiles,
    terminalValues: terminalStats,
    probabilityOfSuccess,
    probabilityOfDoubling,
    probabilityOfLoss,
    realReturnEstimate,
    shortfallRisk,
    bestPath: allPaths[bestPathIndex],
    worstPath: allPaths[worstPathIndex],
  }
}

/**
 * Runs a single simulation path using Geometric Brownian Motion
 */
function runSingleSimulation(
  initialValue: number,
  expectedReturn: number,
  volatility: number,
  years: number,
  annualContribution: number,
  annualWithdrawal: number
): number[] {
  const path: number[] = [initialValue]
  let currentValue = initialValue

  for (let year = 1; year <= years; year++) {
    // Generate random return using normal distribution
    const randomReturn = randomNormal(expectedReturn, volatility)

    // Apply return
    currentValue = currentValue * (1 + randomReturn)

    // Apply contribution/withdrawal
    currentValue += annualContribution - annualWithdrawal

    // Floor at zero (can't go negative)
    currentValue = Math.max(0, currentValue)

    path.push(currentValue)
  }

  return path
}

/**
 * Calculates percentiles at each year across all simulation paths
 */
function calculatePercentiles(
  allPaths: number[][],
  years: number
): MonteCarloResult['percentiles'] {
  const p5: number[] = []
  const p25: number[] = []
  const p50: number[] = []
  const p75: number[] = []
  const p95: number[] = []

  for (let year = 0; year <= years; year++) {
    const valuesAtYear = allPaths.map(path => path[year]).sort((a, b) => a - b)
    p5.push(percentile(valuesAtYear, 0.05))
    p25.push(percentile(valuesAtYear, 0.25))
    p50.push(percentile(valuesAtYear, 0.5))
    p75.push(percentile(valuesAtYear, 0.75))
    p95.push(percentile(valuesAtYear, 0.95))
  }

  return { p5, p25, p50, p75, p95 }
}

/**
 * Generates a random number from a normal distribution using Box-Muller transform
 */
function randomNormal(mean: number, stdDev: number): number {
  // Box-Muller transform
  let u1 = Math.random()
  if (u1 === 0) u1 = 1e-10; // Prevent log(0)
  const u2 = Math.random()

  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)

  return mean + z0 * stdDev
}

/**
 * Calculates percentile from sorted array
 */
function percentile(sortedArray: number[], p: number): number {
  if (sortedArray.length === 0) return 0

  const index = (sortedArray.length - 1) * p
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const weight = index % 1

  if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1]
  if (lower === upper) return sortedArray[lower]

  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight
}

/**
 * Calculates average
 */
function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}
