"use client";

/**
 * Data Explorer Page
 *
 * Browse parsed CRM data with tabs for Contacts, Households, Activities, and Relationships.
 * Includes search, filtering, pagination, and raw data preview.
 */

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Input } from "@/components/ui/Input";
import { RiSearchLine, RiArrowRightLine, RiDatabase2Line } from "@remixicon/react";
import { ContactsExplorer } from "@/components/migration/ContactsExplorer";

interface MigrationSession {
  id: string;
  platform: string;
  name: string;
  status: string;
  totalRecords: number;
  parsedRecords: number;
  errorCount: number;
}

export default function ExplorePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<MigrationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      const res = await fetch(`/api/migration/sessions?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.sessions && data.sessions.length > 0) {
        setSession(data.sessions[0]);
      }
    } catch (error) {
      console.error("Failed to fetch session:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500" />
          <p className="text-sm text-text-secondary">Loading session data...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="max-w-md p-6">
          <h2 className="text-xl font-semibold">Session Not Found</h2>
          <p className="mt-2 text-sm text-text-secondary">
            The migration session you're looking for doesn't exist or has been deleted.
          </p>
          <Button className="mt-4" onClick={() => router.push("/migration")}>
            Back to Migrations
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <RiDatabase2Line className="h-8 w-8 text-brand-500" />
            <div>
              <h1 className="text-2xl font-semibold">{session.name}</h1>
              <p className="mt-1 text-sm text-text-secondary">
                {session.platform} • {session.parsedRecords.toLocaleString()} records parsed
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={session.status === "MAPPING" ? "brand" : "neutral"}>
            {session.status}
          </Badge>
          <Button onClick={() => router.push(`/migration/${sessionId}/mapping`)}>
            Continue to Mapping <RiArrowRightLine className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-t-4 border-t-blue-500 p-6">
          <p className="text-sm text-text-secondary">Total Records</p>
          <p className="mt-2 text-2xl font-semibold">{session.totalRecords.toLocaleString()}</p>
        </Card>
        <Card className="border-t-4 border-t-green-500 p-6">
          <p className="text-sm text-text-secondary">Parsed Successfully</p>
          <p className="mt-2 text-2xl font-semibold">{session.parsedRecords.toLocaleString()}</p>
        </Card>
        <Card className={`border-t-4 p-6 ${session.errorCount > 0 ? 'border-t-red-500' : 'border-t-gray-300'}`}>
          <p className="text-sm text-text-secondary">Errors</p>
          <p className="mt-2 text-2xl font-semibold">{session.errorCount.toLocaleString()}</p>
        </Card>
      </div>

      {/* Tabs */}
      <Card className="p-6">
        <Tabs
          tabs={[
            { id: "contacts", label: "Contacts" },
            { id: "households", label: "Households" },
            { id: "activities", label: "Activities" },
            { id: "relationships", label: "Relationships" },
          ]}
          activeTab={["contacts", "households", "activities", "relationships"][activeTab]}
          onTabChange={(tabId) => {
            const index = ["contacts", "households", "activities", "relationships"].indexOf(tabId);
            setActiveTab(index);
          }}
        />
        <div className="mt-6">
          {activeTab === 0 && <ContactsExplorer sessionId={sessionId} />}
          {activeTab === 1 && <HouseholdsExplorer sessionId={sessionId} />}
          {activeTab === 2 && <ActivitiesExplorer sessionId={sessionId} />}
          {activeTab === 3 && <RelationshipsExplorer sessionId={sessionId} />}
        </div>
      </Card>
    </div>
  );
}

// Placeholder components for remaining tabs (will be implemented)
function HouseholdsExplorer({ sessionId }: { sessionId: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-text-muted">Households explorer coming soon...</p>
      <p className="mt-2 text-xs text-text-secondary">
        Will display parsed households with AUM, primary contact, and mapping status
      </p>
    </div>
  );
}

function ActivitiesExplorer({ sessionId }: { sessionId: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-text-muted">Activities explorer coming soon...</p>
      <p className="mt-2 text-xs text-text-secondary">
        Will display notes, meetings, calls, emails, and tasks with timeline view
      </p>
    </div>
  );
}

function RelationshipsExplorer({ sessionId }: { sessionId: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-text-muted">Relationships explorer coming soon...</p>
      <p className="mt-2 text-xs text-text-secondary">
        Will display contact-to-household and contact-to-contact relationships with graph view
      </p>
    </div>
  );
}
