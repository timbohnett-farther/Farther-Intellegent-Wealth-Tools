import React, { Suspense } from 'react';
import { NewAnalysisClient } from './new-analysis-client';

export default function NewAnalysisPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <NewAnalysisClient />
    </Suspense>
  );
}
