/**
 * Tax Comparison Bar Chart
 *
 * Visualizes side-by-side comparison of origin vs destination tax burden
 */

'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TaxComparisonChartProps {
  originState: {
    jurisdictionName: string;
    jurisdictionCode: string;
    ordinaryIncomeTax: number;
    capitalGainsTax: number;
    totalIncomeTax: number;
  };
  destinationState: {
    jurisdictionName: string;
    jurisdictionCode: string;
    ordinaryIncomeTax: number;
    capitalGainsTax: number;
    totalIncomeTax: number;
  };
}

export function TaxComparisonChart({ originState, destinationState }: TaxComparisonChartProps) {
  // Prepare data for chart
  const data = [
    {
      name: 'Ordinary Income Tax',
      [originState.jurisdictionCode]: originState.ordinaryIncomeTax,
      [destinationState.jurisdictionCode]: destinationState.ordinaryIncomeTax,
    },
    {
      name: 'Capital Gains Tax',
      [originState.jurisdictionCode]: originState.capitalGainsTax,
      [destinationState.jurisdictionCode]: destinationState.capitalGainsTax,
    },
    {
      name: 'Total Tax',
      [originState.jurisdictionCode]: originState.totalIncomeTax,
      [destinationState.jurisdictionCode]: destinationState.totalIncomeTax,
    },
  ];

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--s-border-subtle)" />
          <XAxis
            dataKey="name"
            tick={{ fill: 'var(--s-text-muted)' }}
            stroke="var(--s-border-subtle)"
          />
          <YAxis
            tick={{ fill: 'var(--s-text-muted)' }}
            stroke="var(--s-border-subtle)"
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--s-card-bg)',
              border: '1px solid var(--s-border-subtle)',
              borderRadius: '8px',
            }}
            formatter={(value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="square"
          />
          <Bar
            dataKey={originState.jurisdictionCode}
            fill="#ef4444"
            name={`${originState.jurisdictionName} (${originState.jurisdictionCode})`}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey={destinationState.jurisdictionCode}
            fill="#10b981"
            name={`${destinationState.jurisdictionName} (${destinationState.jurisdictionCode})`}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
