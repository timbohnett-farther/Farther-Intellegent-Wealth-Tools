export interface HistoricalDrawdown {
  name: string;
  decline: number;
  duration: string;
  peakDate: string;
  troughDate: string;
}

export const HISTORICAL_DRAWDOWNS: HistoricalDrawdown[] = [
  {
    name: 'Black Monday (1987)',
    decline: 0.335,
    duration: '2 months',
    peakDate: 'Aug 1987',
    troughDate: 'Oct 1987',
  },
  {
    name: 'Dot-Com Crash (2000-02)',
    decline: 0.491,
    duration: '30 months',
    peakDate: 'Mar 2000',
    troughDate: 'Oct 2002',
  },
  {
    name: 'Great Financial Crisis (2007-09)',
    decline: 0.568,
    duration: '17 months',
    peakDate: 'Oct 2007',
    troughDate: 'Mar 2009',
  },
  {
    name: 'COVID Crash (2020)',
    decline: 0.339,
    duration: '1 month',
    peakDate: 'Feb 2020',
    troughDate: 'Mar 2020',
  },
  {
    name: '2022 Bear Market',
    decline: 0.254,
    duration: '10 months',
    peakDate: 'Jan 2022',
    troughDate: 'Oct 2022',
  },
];

export const MISSED_MARKET_DAYS = [
  { scenario: 'Fully invested (S&P 500 avg)', adjustedReturn: 0.100 },
  { scenario: 'Missed best 10 days', adjustedReturn: 0.047 },
  { scenario: 'Missed best 20 days', adjustedReturn: 0.001 },
  { scenario: 'Missed best 30 days', adjustedReturn: -0.020 },
];
