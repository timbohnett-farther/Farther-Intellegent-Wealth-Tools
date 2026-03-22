'use client';

import React, { useState, useCallback } from 'react';
import {
  Folder,
  FileText,
  Upload,
  Search,
  Download,
  Eye,
  ChevronRight,
  File,
  FileSpreadsheet,
  Image,
  X,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────
interface VaultDoc {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  folder: string;
  uploadedDate: string;
  uploadedBy: string;
}

// ── Mock Data ──────────────────────────────────────────────────────
const FOLDERS = [
  { key: 'tax_returns', label: 'Tax Returns', count: 4 },
  { key: 'estate_documents', label: 'Estate Documents', count: 3 },
  { key: 'insurance_policies', label: 'Insurance Policies', count: 2 },
  { key: 'investment_statements', label: 'Investment Statements', count: 6 },
  { key: 'financial_plan_reports', label: 'Financial Plan Reports', count: 3 },
  { key: 'shared_by_advisor', label: 'Shared by Advisor', count: 5 },
];

const DOCUMENTS: VaultDoc[] = [
  { id: '1', fileName: '2025_Federal_Return.pdf', fileType: 'pdf', fileSize: 2_450_000, folder: 'tax_returns', uploadedDate: '2026-02-10', uploadedBy: 'Sarah Mitchell' },
  { id: '2', fileName: '2025_State_Return.pdf', fileType: 'pdf', fileSize: 1_200_000, folder: 'tax_returns', uploadedDate: '2026-02-10', uploadedBy: 'Sarah Mitchell' },
  { id: '3', fileName: '2024_Federal_Return.pdf', fileType: 'pdf', fileSize: 2_340_000, folder: 'tax_returns', uploadedDate: '2025-04-12', uploadedBy: 'Sarah Mitchell' },
  { id: '4', fileName: '2024_State_Return.pdf', fileType: 'pdf', fileSize: 1_150_000, folder: 'tax_returns', uploadedDate: '2025-04-12', uploadedBy: 'Sarah Mitchell' },
  { id: '5', fileName: 'Revocable_Living_Trust.pdf', fileType: 'pdf', fileSize: 890_000, folder: 'estate_documents', uploadedDate: '2025-08-20', uploadedBy: 'John Doe (Advisor)' },
  { id: '6', fileName: 'Last_Will_Sarah.pdf', fileType: 'pdf', fileSize: 450_000, folder: 'estate_documents', uploadedDate: '2025-08-20', uploadedBy: 'John Doe (Advisor)' },
  { id: '7', fileName: 'Power_of_Attorney.pdf', fileType: 'pdf', fileSize: 320_000, folder: 'estate_documents', uploadedDate: '2025-08-20', uploadedBy: 'John Doe (Advisor)' },
  { id: '8', fileName: 'Term_Life_Policy.pdf', fileType: 'pdf', fileSize: 1_500_000, folder: 'insurance_policies', uploadedDate: '2025-06-15', uploadedBy: 'Sarah Mitchell' },
  { id: '9', fileName: 'Umbrella_Policy.pdf', fileType: 'pdf', fileSize: 780_000, folder: 'insurance_policies', uploadedDate: '2025-06-15', uploadedBy: 'Sarah Mitchell' },
  { id: '10', fileName: 'Q4_2025_Statement.pdf', fileType: 'pdf', fileSize: 3_100_000, folder: 'investment_statements', uploadedDate: '2026-01-15', uploadedBy: 'Auto-imported' },
  { id: '11', fileName: 'Annual_Review_2025.pdf', fileType: 'pdf', fileSize: 4_200_000, folder: 'financial_plan_reports', uploadedDate: '2026-01-20', uploadedBy: 'John Doe (Advisor)' },
  { id: '12', fileName: 'Tax_Strategy_Memo.pdf', fileType: 'pdf', fileSize: 680_000, folder: 'shared_by_advisor', uploadedDate: '2026-02-01', uploadedBy: 'John Doe (Advisor)' },
  { id: '13', fileName: 'Roth_Conversion_Analysis.xlsx', fileType: 'xlsx', fileSize: 250_000, folder: 'shared_by_advisor', uploadedDate: '2026-02-05', uploadedBy: 'John Doe (Advisor)' },
];

// ── Helpers ────────────────────────────────────────────────────────
function formatFileSize(bytes: number) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${bytes} B`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fileIcon(type: string) {
  switch (type) {
    case 'pdf':
      return <FileText size={18} className="text-critical-500" />;
    case 'xlsx':
    case 'csv':
      return <FileSpreadsheet size={18} className="text-success-500" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
      return <Image size={18} className="text-teal-300" />;
    default:
      return <File size={18} className="text-white/30" />;
  }
}

// ── Upload Dropzone ────────────────────────────────────────────────
function UploadDropzone({ onClose }: { onClose: () => void }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
    },
    []
  );

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    // In production, handle file upload here
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white/[0.07] rounded-modal shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg text-white">
            Upload Document
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/[0.06] text-white/30"
          >
            <X size={20} />
          </button>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors ${
            isDragOver
              ? 'border-brand-500 bg-teal-500/10'
              : 'border-white/[0.10] hover:border-white/[0.10]'
          }`}
        >
          <Upload size={32} className="mx-auto text-white/30 mb-3" />
          <p className="text-sm text-white/50">
            Drag and drop files here, or{' '}
            <button className="text-teal-300 font-medium hover:underline">
              browse
            </button>
          </p>
          <p className="text-xs text-white/30 mt-2">
            PDF, XLSX, CSV, PNG, JPG up to 25 MB
          </p>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-white/60 mb-1">
            Folder
          </label>
          <select className="w-full border border-white/[0.10] rounded-input px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500">
            {FOLDERS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white/60 bg-white/[0.07] border border-white/[0.10] rounded-lg hover:bg-white/[0.04]"
          >
            Cancel
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-teal-500 rounded-lg hover:bg-teal-400">
            Upload
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default function ClientVaultPage() {
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  const filteredDocs = DOCUMENTS.filter((doc) => {
    const matchesFolder = activeFolder ? doc.folder === activeFolder : true;
    const matchesSearch = search
      ? doc.fileName.toLowerCase().includes(search.toLowerCase())
      : true;
    return matchesFolder && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-white tracking-wide">Document Vault</h1>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-500 rounded-lg hover:bg-teal-400 transition-colors"
        >
          <Upload size={16} />
          Upload Document
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
        />
        <input
          type="text"
          placeholder="Search documents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-white/[0.06] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white/[0.06]"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Folder Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white/[0.07] rounded-card border border-white/[0.06] overflow-hidden">
            <div className="px-4 py-3 border-b border-limestone-100">
              <h2 className="text-sm font-semibold text-white">Folders</h2>
            </div>
            <nav className="p-2">
              <button
                onClick={() => setActiveFolder(null)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                  activeFolder === null
                    ? 'bg-teal-500/10 text-teal-300 font-medium'
                    : 'text-white/50 hover:bg-white/[0.04]'
                }`}
              >
                <Folder size={16} />
                All Documents
                <span className="ml-auto text-xs text-white/30">
                  {DOCUMENTS.length}
                </span>
              </button>
              {FOLDERS.map((folder) => (
                <button
                  key={folder.key}
                  onClick={() => setActiveFolder(folder.key)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                    activeFolder === folder.key
                      ? 'bg-teal-500/10 text-teal-300 font-medium'
                      : 'text-white/50 hover:bg-white/[0.04]'
                  }`}
                >
                  <Folder size={16} />
                  {folder.label}
                  <span className="ml-auto text-xs text-white/30">
                    {folder.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Document List */}
        <div className="lg:col-span-3">
          <div className="bg-white/[0.07] rounded-card border border-white/[0.06] overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-limestone-100 text-xs font-medium text-white/50 uppercase tracking-wider">
              <span className="col-span-5">Name</span>
              <span className="col-span-2">Type</span>
              <span className="col-span-2">Date</span>
              <span className="col-span-1">Size</span>
              <span className="col-span-2 text-right">Actions</span>
            </div>

            {/* Rows */}
            {filteredDocs.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-white/50">
                No documents found.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="grid grid-cols-12 gap-4 px-6 py-3 items-center hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="col-span-5 flex items-center gap-2 min-w-0">
                      {fileIcon(doc.fileType)}
                      <span className="text-sm text-white truncate">
                        {doc.fileName}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs font-medium text-white/50 uppercase">
                        {doc.fileType}
                      </span>
                    </div>
                    <div className="col-span-2 text-xs text-white/50">
                      {formatDate(doc.uploadedDate)}
                    </div>
                    <div className="col-span-1 text-xs text-white/50">
                      {formatFileSize(doc.fileSize)}
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <button
                        className="p-1.5 rounded hover:bg-white/[0.06] text-white/30 hover:text-white/50"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="p-1.5 rounded hover:bg-white/[0.06] text-white/30 hover:text-white/50"
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && <UploadDropzone onClose={() => setShowUpload(false)} />}
    </div>
  );
}
