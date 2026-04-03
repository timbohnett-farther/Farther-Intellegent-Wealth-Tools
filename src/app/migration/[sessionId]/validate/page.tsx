"use client";

/**
 * Validation Page
 *
 * Run validation on mapped data and review errors before import.
 */

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  RiCheckLine,
  RiAlertLine,
  RiErrorWarningLine,
  RiArrowRightLine,
  RiRefreshLine,
} from "@remixicon/react";

interface ValidationError {
  recordId: string;
  entityType: string;
  field: string;
  error: string;
  severity: "ERROR" | "WARNING";
  value?: any;
  recordLabel?: string;
}

export default function ValidatePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [validating, setValidating] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [errorSummary, setErrorSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchErrors();
  }, []);

  const fetchErrors = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/migration/${sessionId}/validation-errors`);
      const data = await res.json();
      setErrors(data.errors || []);
      setErrorSummary(data.errorSummary);
    } catch (error) {
      console.error("Failed to fetch validation errors:", error);
    } finally {
      setLoading(false);
    }
  };

  const runValidation = async () => {
    setValidating(true);
    try {
      const res = await fetch(`/api/migration/${sessionId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityTypes: ["CONTACT", "HOUSEHOLD"] }),
      });

      if (res.ok) {
        // Wait a bit for validation to complete
        setTimeout(() => {
          fetchErrors();
          setValidating(false);
        }, 3000);
      }
    } catch (error) {
      console.error("Failed to run validation:", error);
      setValidating(false);
    }
  };

  const errorCount = errorSummary?.bySeverity?.find((s: any) => s.severity === "ERROR")?.count || 0;
  const warningCount = errorSummary?.bySeverity?.find((s: any) => s.severity === "WARNING")?.count || 0;
  const canProceed = errorCount === 0;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500" />
          <p className="text-sm text-text-secondary">Loading validation results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            {canProceed ? (
              <RiCheckLine className="h-8 w-8 text-green-500" />
            ) : (
              <RiErrorWarningLine className="h-8 w-8 text-red-500" />
            )}
            <div>
              <h1 className="text-2xl font-semibold">Data Validation</h1>
              <p className="mt-1 text-sm text-text-secondary">
                {canProceed
                  ? "All data validated successfully"
                  : `Found ${errorCount} errors and ${warningCount} warnings`}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={runValidation} disabled={validating}>
            <RiRefreshLine className={`mr-2 h-4 w-4 ${validating ? "animate-spin" : ""}`} />
            {validating ? "Validating..." : "Re-run Validation"}
          </Button>
          <Button
            onClick={() => router.push(`/migration/${sessionId}/import`)}
            disabled={!canProceed}
          >
            Continue to Import <RiArrowRightLine className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-t-4 border-t-green-500 p-6">
          <p className="text-sm text-text-secondary">Valid Records</p>
          <p className="mt-2 text-2xl font-semibold">
            {errorSummary?.total ? `${errors.length - errorSummary.total}` : "0"}
          </p>
        </Card>
        <Card className={`border-t-4 p-6 ${errorCount > 0 ? "border-t-red-500" : "border-t-gray-300"}`}>
          <p className="text-sm text-text-secondary">Errors</p>
          <p className="mt-2 text-2xl font-semibold">{errorCount}</p>
        </Card>
        <Card className={`border-t-4 p-6 ${warningCount > 0 ? "border-t-yellow-500" : "border-t-gray-300"}`}>
          <p className="text-sm text-text-secondary">Warnings</p>
          <p className="mt-2 text-2xl font-semibold">{warningCount}</p>
        </Card>
      </div>

      {/* Errors by Field */}
      {errorSummary?.byField && errorSummary.byField.length > 0 && (
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold">Errors by Field</h3>
          <div className="space-y-2">
            {errorSummary.byField
              .sort((a: any, b: any) => b.count - a.count)
              .map((item: any) => (
                <div
                  key={item.field}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface p-3"
                >
                  <p className="font-mono text-sm">{item.field}</p>
                  <Badge variant="critical">{item.count} issues</Badge>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Error List */}
      {errors.length > 0 && (
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold">Validation Errors</h3>
          <div className="space-y-2">
            {errors.slice(0, 50).map((error, index) => (
              <div
                key={index}
                className="flex items-start gap-4 rounded-lg border border-border bg-surface p-4"
              >
                {error.severity === "ERROR" ? (
                  <RiErrorWarningLine className="h-5 w-5 text-red-500" />
                ) : (
                  <RiAlertLine className="h-5 w-5 text-yellow-500" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{error.recordLabel || error.recordId}</p>
                    <Badge variant="neutral">{error.entityType}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-text-secondary">
                    Field: <span className="font-mono">{error.field}</span>
                  </p>
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error.error}</p>
                  {error.value && (
                    <p className="mt-1 text-xs text-text-muted">Value: {String(error.value)}</p>
                  )}
                </div>
                <Badge variant={error.severity === "ERROR" ? "critical" : "warning"}>
                  {error.severity}
                </Badge>
              </div>
            ))}
            {errors.length > 50 && (
              <p className="py-4 text-center text-sm text-text-muted">
                Showing first 50 of {errors.length} errors
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Success State */}
      {errors.length === 0 && !validating && (
        <Card className="p-12 text-center">
          <RiCheckLine className="mx-auto h-16 w-16 text-green-500" />
          <h3 className="mt-4 text-xl font-semibold">All Data Validated!</h3>
          <p className="mt-2 text-text-secondary">
            No validation errors found. You can proceed to import.
          </p>
          <Button
            className="mt-6"
            onClick={() => router.push(`/migration/${sessionId}/import`)}
          >
            Continue to Import <RiArrowRightLine className="ml-2 h-4 w-4" />
          </Button>
        </Card>
      )}
    </div>
  );
}
