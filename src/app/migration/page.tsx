"use client";

/**
 * Migration Sessions List Page
 *
 * View all migration sessions with status, platform, and progress.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  RiAddLine,
  RiRocketLine,
  RiCheckLine,
  RiErrorWarningLine,
  RiLoaderLine,
  RiUploadCloudLine,
  RiMapPinLine,
  RiShieldCheckLine,
} from "@remixicon/react";

interface MigrationSession {
  id: string;
  createdAt: string;
  platform: string;
  name: string;
  description?: string;
  status: string;
  totalRecords: number;
  parsedRecords: number;
  mappedRecords: number;
  importedRecords: number;
  errorCount: number;
}

export default function MigrationsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<MigrationSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/migration/sessions");
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <RiCheckLine className="h-5 w-5 text-green-500" />;
      case "FAILED":
        return <RiErrorWarningLine className="h-5 w-5 text-red-500" />;
      case "UPLOADING":
        return <RiUploadCloudLine className="h-5 w-5 text-blue-500" />;
      case "PARSING":
        return <RiLoaderLine className="h-5 w-5 animate-spin text-blue-500" />;
      case "MAPPING":
        return <RiMapPinLine className="h-5 w-5 text-yellow-500" />;
      case "VALIDATING":
        return <RiShieldCheckLine className="h-5 w-5 text-yellow-500" />;
      case "IMPORTING":
        return <RiRocketLine className="h-5 w-5 text-blue-500" />;
      default:
        return <RiLoaderLine className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "success";
      case "FAILED":
        return "error";
      case "UPLOADING":
      case "PARSING":
      case "IMPORTING":
        return "info";
      case "MAPPING":
      case "VALIDATING":
        return "warning";
      default:
        return "secondary";
    }
  };

  const getNextAction = (session: MigrationSession) => {
    switch (session.status) {
      case "PARSING":
        return { label: "View Progress", href: `/migration/${session.id}/explore` };
      case "MAPPING":
        return { label: "Configure Mapping", href: `/migration/${session.id}/mapping` };
      case "VALIDATING":
        return { label: "Review Validation", href: `/migration/${session.id}/validate` };
      case "IMPORTING":
        return { label: "View Import", href: `/migration/${session.id}/import` };
      case "COMPLETED":
        return { label: "View Details", href: `/migration/${session.id}/explore` };
      case "FAILED":
        return { label: "View Errors", href: `/migration/${session.id}/validate` };
      default:
        return { label: "Continue", href: `/migration/${session.id}/explore` };
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500" />
          <p className="text-sm text-text-secondary">Loading migrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">CRM Migrations</h1>
          <p className="mt-2 text-text-secondary">
            Import data from other CRM platforms into HubSpot
          </p>
        </div>
        <Button onClick={() => router.push("/migration/new")}>
          <RiAddLine className="mr-2 h-5 w-5" />
          New Migration
        </Button>
      </div>

      {/* Sessions Grid */}
      {sessions.length === 0 ? (
        <Card className="p-12 text-center">
          <RiUploadCloudLine className="mx-auto h-16 w-16 text-text-muted opacity-40" />
          <h3 className="mt-4 text-lg font-semibold">No migrations yet</h3>
          <p className="mt-2 text-sm text-text-secondary">
            Get started by creating your first migration from another CRM platform
          </p>
          <Button
            className="mt-6"
            onClick={() => router.push("/migration/new")}
          >
            <RiAddLine className="mr-2 h-5 w-5" />
            Create Migration
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {sessions.map((session) => {
            const nextAction = getNextAction(session);
            return (
              <Card key={session.id} className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(session.status)}
                    <div>
                      <h3 className="font-semibold">{session.name}</h3>
                      <p className="text-sm text-text-secondary">
                        {session.platform}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getStatusColor(session.status) as any}>
                    {session.status}
                  </Badge>
                </div>

                {/* Description */}
                {session.description && (
                  <p className="mt-4 text-sm text-text-secondary line-clamp-2">
                    {session.description}
                  </p>
                )}

                {/* Progress Stats */}
                <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg bg-surface-subtle p-4">
                  <div>
                    <p className="text-xs text-text-secondary">Parsed</p>
                    <p className="text-lg font-semibold">
                      {session.parsedRecords.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary">Imported</p>
                    <p className="text-lg font-semibold">
                      {session.importedRecords.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary">Mapped</p>
                    <p className="text-lg font-semibold">
                      {session.mappedRecords.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary">Errors</p>
                    <p
                      className={`text-lg font-semibold ${
                        session.errorCount > 0
                          ? "text-red-600 dark:text-red-400"
                          : ""
                      }`}
                    >
                      {session.errorCount.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={() => router.push(nextAction.href)}
                  >
                    {nextAction.label}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => router.push(`/migration/${session.id}/explore`)}
                  >
                    Details
                  </Button>
                </div>

                {/* Timestamp */}
                <p className="mt-4 text-xs text-text-muted">
                  Created {new Date(session.createdAt).toLocaleDateString()}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
