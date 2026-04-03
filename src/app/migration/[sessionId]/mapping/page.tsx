"use client";

/**
 * Field Mapping Configurator Page
 *
 * Visual interface for mapping source CRM fields to HubSpot properties.
 */

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  RiSearchLine,
  RiAddLine,
  RiDeleteBinLine,
  RiEyeLine,
  RiArrowRightLine,
  RiMapLine,
} from "@remixicon/react";

interface SourceField {
  path: string;
  type: string;
  sampleValues: string[];
  occurrences: number;
}

interface TargetProperty {
  name: string;
  label: string;
  type: string;
  fieldType: string;
  description?: string;
  required?: boolean;
}

interface FieldMapping {
  id: string;
  entityType: string;
  sourceField: string;
  targetProperty: string;
  transformationType: string;
  required: boolean;
}

export default function MappingPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [entityType, setEntityType] = useState<"CONTACT" | "HOUSEHOLD">("CONTACT");
  const [sourceFields, setSourceFields] = useState<SourceField[]>([]);
  const [targetProperties, setTargetProperties] = useState<TargetProperty[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchSource, setSearchSource] = useState("");
  const [searchTarget, setSearchTarget] = useState("");

  useEffect(() => {
    fetchData();
  }, [entityType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch source fields, target properties, and existing mappings in parallel
      const [sourceRes, targetRes, mappingsRes] = await Promise.all([
        fetch(`/api/migration/${sessionId}/fields/source?entityType=${entityType}`),
        fetch(`/api/migration/${sessionId}/fields/target?entityType=${entityType}`),
        fetch(`/api/migration/${sessionId}/mappings?entityType=${entityType}`),
      ]);

      const [sourceData, targetData, mappingsData] = await Promise.all([
        sourceRes.json(),
        targetRes.json(),
        mappingsRes.json(),
      ]);

      setSourceFields(sourceData.fields || []);
      setTargetProperties(targetData.properties || []);
      setMappings(mappingsData.mappings || []);
    } catch (error) {
      console.error("Failed to fetch mapping data:", error);
    } finally {
      setLoading(false);
    }
  };

  const createMapping = async (sourceField: string, targetProperty: string) => {
    try {
      const res = await fetch(`/api/migration/${sessionId}/mappings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          sourceField,
          targetProperty,
          transformationType: "direct",
        }),
      });

      if (res.ok) {
        const newMapping = await res.json();
        setMappings((prev) => [...prev, newMapping]);
      }
    } catch (error) {
      console.error("Failed to create mapping:", error);
    }
  };

  const deleteMapping = async (id: string) => {
    try {
      const res = await fetch(`/api/migration/${sessionId}/mappings/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMappings((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete mapping:", error);
    }
  };

  const filteredSourceFields = sourceFields.filter((f) =>
    f.path.toLowerCase().includes(searchSource.toLowerCase())
  );

  const filteredTargetProperties = targetProperties.filter(
    (p) =>
      p.label.toLowerCase().includes(searchTarget.toLowerCase()) ||
      p.name.toLowerCase().includes(searchTarget.toLowerCase())
  );

  const isMapped = (sourceField: string) =>
    mappings.some((m) => m.sourceField === sourceField);

  const isTargetUsed = (targetProperty: string) =>
    mappings.some((m) => m.targetProperty === targetProperty);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500" />
          <p className="text-sm text-text-secondary">Loading mapping configurator...</p>
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
            <RiMapLine className="h-8 w-8 text-brand-500" />
            <div>
              <h1 className="text-2xl font-semibold">Field Mapping</h1>
              <p className="mt-1 text-sm text-text-secondary">
                Map source CRM fields to HubSpot properties
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="brand">{mappings.length} mappings</Badge>
          <Button onClick={() => router.push(`/migration/${sessionId}/validate`)}>
            Continue to Validation <RiArrowRightLine className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Entity Type Selector */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <p className="text-sm font-medium">Mapping for:</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={entityType === "CONTACT" ? "primary" : "secondary"}
              onClick={() => setEntityType("CONTACT")}
            >
              Contacts
            </Button>
            <Button
              size="sm"
              variant={entityType === "HOUSEHOLD" ? "primary" : "secondary"}
              onClick={() => setEntityType("HOUSEHOLD")}
            >
              Households
            </Button>
          </div>
          <p className="ml-auto text-sm text-text-muted">
            {filteredSourceFields.length} source fields • {filteredTargetProperties.length} HubSpot
            properties
          </p>
        </div>
      </Card>

      {/* Mapping Interface */}
      <div className="grid grid-cols-2 gap-6">
        {/* Source Fields (Left) */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Source Fields</h3>
            <p className="text-sm text-text-muted">{sourceFields.length} total</p>
          </div>
          <div className="relative mb-4">
            <RiSearchLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              type="text"
              placeholder="Search source fields..."
              value={searchSource}
              onChange={(e) => setSearchSource(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="max-h-[600px] space-y-2 overflow-y-auto">
            {filteredSourceFields.map((field) => (
              <div
                key={field.path}
                className={`rounded-lg border p-3 ${
                  isMapped(field.path)
                    ? "border-green-500 bg-green-50 dark:bg-green-950"
                    : "border-border bg-surface hover:bg-surface-subtle"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-mono text-sm font-medium">{field.path}</p>
                    <p className="mt-1 text-xs text-text-muted">
                      Type: {field.type} • {field.sampleValues.length} samples
                    </p>
                    {field.sampleValues.length > 0 && (
                      <p className="mt-1 truncate text-xs text-text-secondary">
                        e.g., {field.sampleValues.join(", ")}
                      </p>
                    )}
                  </div>
                  {isMapped(field.path) && (
                    <Badge variant="brand" className="ml-2">
                      Mapped
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Target Properties (Right) */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">HubSpot Properties</h3>
            <p className="text-sm text-text-muted">{targetProperties.length} total</p>
          </div>
          <div className="relative mb-4">
            <RiSearchLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <Input
              type="text"
              placeholder="Search HubSpot properties..."
              value={searchTarget}
              onChange={(e) => setSearchTarget(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="max-h-[600px] space-y-2 overflow-y-auto">
            {filteredTargetProperties.map((prop) => (
              <div
                key={prop.name}
                className={`rounded-lg border p-3 ${
                  isTargetUsed(prop.name)
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                    : "border-border bg-surface hover:bg-surface-subtle"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{prop.label}</p>
                    <p className="font-mono text-xs text-text-muted">{prop.name}</p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {prop.type} ({prop.fieldType})
                      {prop.required && " • Required"}
                    </p>
                  </div>
                  {isTargetUsed(prop.name) && (
                    <Badge variant="brand" className="ml-2">
                      Used
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Active Mappings */}
      {mappings.length > 0 && (
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold">Active Mappings</h3>
          <div className="space-y-2">
            {mappings.map((mapping) => (
              <div
                key={mapping.id}
                className="flex items-center justify-between rounded-lg border border-border bg-surface p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="font-mono text-sm font-medium">{mapping.sourceField}</p>
                    <p className="text-xs text-text-muted">Source field</p>
                  </div>
                  <div className="text-text-muted">→</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{mapping.targetProperty}</p>
                    <p className="text-xs text-text-muted">HubSpot property</p>
                  </div>
                  <Badge variant="neutral">{mapping.transformationType}</Badge>
                </div>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => deleteMapping(mapping.id)}
                >
                  <RiDeleteBinLine className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick Map Suggestion (future enhancement) */}
      {mappings.length === 0 && (
        <Card className="p-6 text-center">
          <p className="text-text-muted">
            Click on a source field and target property to create a mapping
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            Tip: Fields with similar names will be suggested automatically
          </p>
        </Card>
      )}
    </div>
  );
}
