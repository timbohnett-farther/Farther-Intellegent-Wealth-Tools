"use client";

/**
 * New Migration Page
 *
 * Platform selection and chunked file upload for CRM migration.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  RiUploadCloudLine,
  RiFileTextLine,
  RiArrowLeftLine,
  RiCheckLine,
  RiLoader2Line,
} from "@remixicon/react";
import { ChunkedFileUploader } from "@/components/migration/ChunkedFileUploader";

const PLATFORMS = [
  {
    id: "WEALTHBOX",
    name: "Wealthbox",
    description: "Import contacts, households, and activities from Wealthbox CRM",
    icon: RiFileTextLine,
    extensions: [".json", ".zip"],
  },
  {
    id: "REDTAIL",
    name: "Redtail CRM",
    description: "Import contacts, accounts, and activities from Redtail",
    icon: RiFileTextLine,
    extensions: [".csv", ".zip"],
  },
  {
    id: "COMMONWEALTH",
    name: "Commonwealth",
    description: "Import from Commonwealth Financial Network BAK files",
    icon: RiFileTextLine,
    extensions: [".bak", ".zip"],
  },
  {
    id: "SALESFORCE",
    name: "Salesforce",
    description: "Import contacts, accounts, and opportunities from Salesforce",
    icon: RiFileTextLine,
    extensions: [".csv", ".zip"],
  },
  {
    id: "ADVIZON",
    name: "Advizon",
    description: "Import client and portfolio data from Advizon",
    icon: RiFileTextLine,
    extensions: [".csv", ".xlsx", ".zip"],
  },
];

export default function NewMigrationPage() {
  const router = useRouter();
  const [step, setStep] = useState<"select" | "configure" | "upload">("select");
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const platform = PLATFORMS.find((p) => p.id === selectedPlatform);

  const handleSelectPlatform = (platformId: string) => {
    setSelectedPlatform(platformId);
    setStep("configure");
  };

  const handleCreateSession = async () => {
    if (!selectedPlatform || !name.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/migration/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: selectedPlatform,
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.session?.id) {
        setSessionId(data.session.id);
        setStep("upload");
      }
    } catch (error) {
      console.error("Failed to create session:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleUploadComplete = (uploadedSessionId: string) => {
    router.push(`/migration/${uploadedSessionId}/explore`);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="secondary"
          onClick={() => {
            if (step === "select") {
              router.push("/migration");
            } else if (step === "configure") {
              setStep("select");
              setSelectedPlatform(null);
            } else if (step === "upload") {
              setStep("configure");
            }
          }}
        >
          <RiArrowLeftLine className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New CRM Migration</h1>
          <p className="mt-1 text-text-secondary">
            {step === "select" && "Select your source CRM platform"}
            {step === "configure" && "Configure migration details"}
            {step === "upload" && "Upload your export file"}
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ${
              step === "select"
                ? "bg-brand-500 text-white"
                : "bg-green-500 text-white"
            }`}
          >
            {step === "select" ? "1" : <RiCheckLine className="h-5 w-5" />}
          </div>
          <span
            className={`text-sm ${
              step === "select" ? "font-semibold" : "text-text-secondary"
            }`}
          >
            Select Platform
          </span>
        </div>

        <div className="h-px flex-1 bg-border" />

        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ${
              step === "configure"
                ? "bg-brand-500 text-white"
                : step === "upload"
                ? "bg-green-500 text-white"
                : "bg-surface-subtle text-text-muted"
            }`}
          >
            {step === "upload" ? (
              <RiCheckLine className="h-5 w-5" />
            ) : (
              "2"
            )}
          </div>
          <span
            className={`text-sm ${
              step === "configure" ? "font-semibold" : "text-text-secondary"
            }`}
          >
            Configure
          </span>
        </div>

        <div className="h-px flex-1 bg-border" />

        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ${
              step === "upload"
                ? "bg-brand-500 text-white"
                : "bg-surface-subtle text-text-muted"
            }`}
          >
            3
          </div>
          <span
            className={`text-sm ${
              step === "upload" ? "font-semibold" : "text-text-secondary"
            }`}
          >
            Upload
          </span>
        </div>
      </div>

      {/* Step 1: Platform Selection */}
      {step === "select" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PLATFORMS.map((platform) => (
            <Card
              key={platform.id}
              className="cursor-pointer p-6 transition-all hover:border-brand-500 hover:shadow-lg"
              onClick={() => handleSelectPlatform(platform.id)}
            >
              <platform.icon className="h-12 w-12 text-brand-500" />
              <h3 className="mt-4 text-lg font-semibold">{platform.name}</h3>
              <p className="mt-2 text-sm text-text-secondary">
                {platform.description}
              </p>
              <p className="mt-4 text-xs text-text-muted">
                Supported: {platform.extensions.join(", ")}
              </p>
            </Card>
          ))}
        </div>
      )}

      {/* Step 2: Configure Migration */}
      {step === "configure" && platform && (
        <Card className="p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Migration Details</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Configure your {platform.name} migration
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium">
                Migration Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g., Q1 2024 Client Import"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2"
              />
              <p className="mt-1 text-xs text-text-muted">
                A descriptive name to identify this migration
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium">
                Description (Optional)
              </label>
              <textarea
                placeholder="Add any notes about this migration..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>

            <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Supported File Types
              </h4>
              <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
                {platform.extensions.join(", ")}
              </p>
              <p className="mt-2 text-xs text-blue-700 dark:text-blue-300">
                Maximum file size: 1 GB
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setStep("select")}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateSession}
                disabled={!name.trim() || creating}
                className="flex-1"
              >
                {creating ? (
                  <>
                    <RiLoader2Line className="mr-2 h-5 w-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Continue to Upload"
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: File Upload */}
      {step === "upload" && sessionId && platform && (
        <Card className="p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Upload Export File</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Upload your {platform.name} export file
            </p>
          </div>

          <ChunkedFileUploader
            sessionId={sessionId}
            acceptedExtensions={platform.extensions}
            onUploadComplete={handleUploadComplete}
          />
        </Card>
      )}
    </div>
  );
}
