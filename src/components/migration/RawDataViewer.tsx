"use client";

/**
 * Raw Data Viewer Component
 *
 * Displays raw JSON data in a modal with syntax highlighting.
 */

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RiCloseLine } from "@remixicon/react";

interface RawDataViewerProps {
  title: string;
  data: any;
  onClose: () => void;
}

export function RawDataViewer({ title, data, onClose }: RawDataViewerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="max-h-[80vh] w-full max-w-3xl overflow-hidden p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-text-secondary">Raw data from source CRM</p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <RiCloseLine className="mr-2 h-4 w-4" />
            Close
          </Button>
        </div>

        <div className="mt-4 max-h-[60vh] overflow-auto">
          <pre className="rounded-lg bg-surface-subtle p-4 text-sm">
            <code>{JSON.stringify(data, null, 2)}</code>
          </pre>
        </div>
      </Card>
    </div>
  );
}
