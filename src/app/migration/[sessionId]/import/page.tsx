"use client";

/**
 * Import Page
 *
 * Import validated data to HubSpot with real-time progress tracking.
 */

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  RiRocketLine,
  RiCheckLine,
  RiErrorWarningLine,
  RiTimeLine,
  RiBarChartBoxLine,
} from "@remixicon/react";

interface ImportProgress {
  status: string;
  progress: number;
  recordsImported: number;
  recordsFailed: number;
  totalRecords: number;
  currentBatch?: number;
  totalBatches?: number;
  errors: Array<{ recordId: string; error: string }>;
}

export default function ImportPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [importing, setImporting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  useEffect(() => {
    if (jobId) {
      trackImportProgress(jobId);
    }
  }, [jobId]);

  const startImport = async () => {
    setImporting(true);
    try {
      const res = await fetch(`/api/migration/${sessionId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityTypes: ["CONTACT", "HOUSEHOLD"],
          skipErrors: false,
        }),
      });

      const data = await res.json();
      if (data.jobId) {
        setJobId(data.jobId);
      }
    } catch (error) {
      console.error("Failed to start import:", error);
      setImporting(false);
    }
  };

  const trackImportProgress = (jobId: string) => {
    const eventSource = new EventSource(
      `/api/migration/${sessionId}/import/status/${jobId}`
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setProgress(data);

      if (data.status === "COMPLETED" || data.status === "FAILED") {
        eventSource.close();
        setImporting(false);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setImporting(false);
    };
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500" />
          <p className="text-sm text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  const isCompleted = progress?.status === "COMPLETED";
  const isFailed = progress?.status === "FAILED";

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900">
          {isCompleted ? (
            <RiCheckLine className="h-8 w-8 text-green-500" />
          ) : isFailed ? (
            <RiErrorWarningLine className="h-8 w-8 text-red-500" />
          ) : (
            <RiRocketLine className="h-8 w-8 text-brand-500" />
          )}
        </div>
        <h1 className="mt-4 text-2xl font-semibold">
          {isCompleted
            ? "Import Completed!"
            : isFailed
            ? "Import Failed"
            : importing
            ? "Importing to HubSpot..."
            : "Ready to Import"}
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          {isCompleted
            ? "All data has been successfully imported to HubSpot"
            : isFailed
            ? "The import encountered errors"
            : importing
            ? "Please wait while we import your data"
            : "Review the details and start the import when ready"}
        </p>
      </div>

      {/* Progress Card */}
      {importing || isCompleted || isFailed ? (
        <Card className="p-8">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-text-secondary">
              <span>Progress</span>
              <span>{progress?.progress || 0}%</span>
            </div>
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-surface-muted">
              <div
                className={`h-full transition-all duration-500 ${
                  isCompleted
                    ? "bg-green-500"
                    : isFailed
                    ? "bg-red-500"
                    : "bg-brand-500"
                }`}
                style={{ width: `${progress?.progress || 0}%` }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-surface-subtle p-4">
              <div className="flex items-center gap-2 text-text-secondary">
                <RiCheckLine className="h-4 w-4" />
                <span className="text-sm">Imported</span>
              </div>
              <p className="mt-2 text-2xl font-semibold">{progress?.recordsImported || 0}</p>
            </div>
            <div className="rounded-lg bg-surface-subtle p-4">
              <div className="flex items-center gap-2 text-text-secondary">
                <RiErrorWarningLine className="h-4 w-4" />
                <span className="text-sm">Failed</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-red-600 dark:text-red-400">
                {progress?.recordsFailed || 0}
              </p>
            </div>
          </div>

          {/* Batch Info */}
          {progress?.currentBatch && progress?.totalBatches && (
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-text-secondary">
              <RiBarChartBoxLine className="h-4 w-4" />
              <span>
                Batch {progress.currentBatch} of {progress.totalBatches}
              </span>
            </div>
          )}

          {/* Errors */}
          {progress?.errors && progress.errors.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-medium">Errors</h3>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg bg-red-50 p-4 dark:bg-red-950">
                {progress.errors.slice(0, 10).map((error, index) => (
                  <p key={index} className="text-sm text-red-600 dark:text-red-400">
                    {error.recordId}: {error.error}
                  </p>
                ))}
                {progress.errors.length > 10 && (
                  <p className="text-sm text-text-muted">
                    +{progress.errors.length - 10} more errors
                  </p>
                )}
              </div>
            </div>
          )}
        </Card>
      ) : (
        /* Start Import Card */
        <Card className="p-8 text-center">
          <RiRocketLine className="mx-auto h-12 w-12 text-brand-500" />
          <h3 className="mt-4 text-lg font-semibold">Start HubSpot Import</h3>
          <p className="mt-2 text-sm text-text-secondary">
            This will import all validated contacts and households to HubSpot.
            <br />
            The process may take several minutes depending on the volume of data.
          </p>

          <div className="mt-6 space-y-4">
            <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
              <div className="flex items-start gap-3">
                <RiTimeLine className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div className="text-left">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    What happens during import?
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-blue-800 dark:text-blue-200">
                    <li>• Data is sent to HubSpot in batches of 100 records</li>
                    <li>• Rate limits are handled automatically with retries</li>
                    <li>• Existing records are updated, new records are created</li>
                    <li>• You can track progress in real-time</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button size="lg" onClick={startImport} disabled={importing} className="w-full">
              <RiRocketLine className="mr-2 h-5 w-5" />
              {importing ? "Starting Import..." : "Start Import to HubSpot"}
            </Button>
          </div>
        </Card>
      )}

      {/* Actions */}
      {isCompleted && (
        <div className="flex justify-center gap-3">
          <Button variant="secondary" onClick={() => router.push("/migration")}>
            Back to Migrations
          </Button>
          <Button onClick={() => window.open("https://app.hubspot.com", "_blank")}>
            View in HubSpot
          </Button>
        </div>
      )}
    </div>
  );
}
