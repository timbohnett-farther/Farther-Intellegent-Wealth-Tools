"use client";

/**
 * Contacts Explorer Component
 *
 * Displays parsed contacts in a paginated table with search and filtering.
 */

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { RiSearchLine, RiEyeLine, RiArrowLeftLine, RiArrowRightLine } from "@remixicon/react";
import { RawDataViewer } from "./RawDataViewer";

interface Contact {
  id: string;
  sourceId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  mappingStatus: string;
  rawData: Record<string, unknown>;
  validationErrors: Record<string, string>[];
}

interface ContactsExplorerProps {
  sessionId: string;
}

export function ContactsExplorer({ sessionId }: ContactsExplorerProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [mappingStatus, setMappingStatus] = useState("all");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const limit = 50;
  const totalPages = Math.ceil(total / limit);

  useEffect(() => {
    fetchContacts();
  }, [page, search, mappingStatus]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search && { search }),
        ...(mappingStatus !== "all" && { mappingStatus }),
      });

      const res = await fetch(`/api/migration/${sessionId}/contacts?${params}`);
      const data = await res.json();

      setContacts(data.contacts || []);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMappingStatusVariant = (status: string): "neutral" | "info" | "success" | "warning" | "critical" => {
    const variants: Record<string, "neutral" | "info" | "success" | "warning" | "critical"> = {
      UNMAPPED: "neutral",
      MAPPED: "info",
      VALIDATED: "success",
      IMPORTED: "success",
      ERROR: "critical",
    };
    return variants[status] ?? "neutral";
  };

  return (
    <div className="space-y-4 py-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative max-w-sm">
          <RiSearchLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <select
          value={mappingStatus}
          onChange={(e) => {
            setMappingStatus(e.target.value);
            setPage(1);
          }}
          className="h-9 w-48 rounded-md border border-border bg-surface px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        >
          <option value="all">All Status</option>
          <option value="UNMAPPED">Unmapped</option>
          <option value="MAPPED">Mapped</option>
          <option value="VALIDATED">Validated</option>
          <option value="IMPORTED">Imported</option>
          <option value="ERROR">Error</option>
        </select>
        <p className="ml-auto text-sm text-text-muted">
          {total.toLocaleString()} contacts
        </p>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-text-muted">No contacts found</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full">
              <thead className="border-b border-border bg-surface-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Phone</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Company</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-surface-subtle">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">
                          {contact.firstName} {contact.lastName}
                        </p>
                        <p className="text-xs text-text-muted">ID: {contact.sourceId}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {contact.email || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {contact.phone || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {contact.company || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getMappingStatusVariant(contact.mappingStatus)}>
                        {contact.mappingStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedContact(contact)}
                      >
                        <RiEyeLine className="mr-2 h-4 w-4" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">
              Page {page} of {totalPages} • Showing {(page - 1) * limit + 1} -{" "}
              {Math.min(page * limit, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <RiArrowLeftLine className="mr-2 h-4 w-4" />
                Previous
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
                <RiArrowRightLine className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Raw Data Viewer Modal */}
      {selectedContact && (
        <RawDataViewer
          title={`${selectedContact.firstName} ${selectedContact.lastName}`}
          data={selectedContact.rawData}
          onClose={() => setSelectedContact(null)}
        />
      )}
    </div>
  );
}
