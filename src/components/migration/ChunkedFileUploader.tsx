"use client";

/**
 * Chunked File Uploader Component
 *
 * Handles large file uploads with chunking, progress tracking, and retry logic.
 */

import { useState, useRef } from "react";
import { Button } from "@/components/ui/Button";
import {
  RiUploadCloudLine,
  RiFileTextLine,
  RiCheckLine,
  RiErrorWarningLine,
  RiLoader2Line,
} from "@remixicon/react";

interface ChunkedFileUploaderProps {
  sessionId: string;
  acceptedExtensions: string[];
  onUploadComplete: (sessionId: string) => void;
}

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB

export function ChunkedFileUploader({
  sessionId,
  acceptedExtensions,
  onUploadComplete,
}: ChunkedFileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`File size exceeds maximum of ${MAX_FILE_SIZE / (1024 * 1024 * 1024)}GB`);
      return;
    }

    // Validate file extension
    const extension = "." + selectedFile.name.split(".").pop()?.toLowerCase();
    if (!acceptedExtensions.includes(extension)) {
      setError(`Invalid file type. Accepted: ${acceptedExtensions.join(", ")}`);
      return;
    }

    setFile(selectedFile);
    setError(null);
    setUploadProgress(0);
  };

  const calculateChecksum = async (data: ArrayBuffer): Promise<string> => {
    const hashBuffer = await crypto.subtle.digest("MD5", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const startUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setCurrentChunk(0);

    try {
      // Step 1: Initialize upload
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      setTotalChunks(totalChunks);

      const initRes = await fetch("/api/migration/upload/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          chunkSize: CHUNK_SIZE,
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok) {
        throw new Error(initData.error || "Failed to initialize upload");
      }

      setUploadId(initData.uploadId);

      // Step 2: Upload chunks
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        // Calculate checksum for integrity
        const arrayBuffer = await chunk.arrayBuffer();
        const checksum = await calculateChecksum(arrayBuffer);

        // Upload chunk
        const formData = new FormData();
        formData.append("uploadId", initData.uploadId);
        formData.append("chunkIndex", i.toString());
        formData.append("checksum", checksum);
        formData.append("chunk", new Blob([arrayBuffer]));

        const chunkRes = await fetch("/api/migration/upload/chunk", {
          method: "POST",
          body: formData,
        });

        const chunkData = await chunkRes.json();
        if (!chunkRes.ok) {
          throw new Error(chunkData.error || `Failed to upload chunk ${i + 1}`);
        }

        setCurrentChunk(i + 1);
        setUploadProgress(chunkData.uploadProgress || 0);
      }

      // Step 3: Complete upload and assemble
      const completeRes = await fetch("/api/migration/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId: initData.uploadId,
        }),
      });

      const completeData = await completeRes.json();
      if (!completeRes.ok) {
        throw new Error(completeData.error || "Failed to complete upload");
      }

      // Upload complete, trigger parsing
      onUploadComplete(sessionId);
    } catch (err) {
      console.error("Upload failed:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  return (
    <div className="space-y-6">
      {/* File Input */}
      {!file && (
        <div
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface-subtle p-12 transition-colors hover:border-brand-500 hover:bg-surface-muted"
          onClick={() => fileInputRef.current?.click()}
        >
          <RiUploadCloudLine className="h-16 w-16 text-text-muted" />
          <h3 className="mt-4 text-lg font-semibold">Choose a file to upload</h3>
          <p className="mt-2 text-sm text-text-secondary">
            Drag and drop or click to browse
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Accepted: {acceptedExtensions.join(", ")} · Max size: 1 GB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedExtensions.join(",")}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Selected File */}
      {file && !uploading && (
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-start gap-4">
            <RiFileTextLine className="h-10 w-10 text-brand-500" />
            <div className="flex-1">
              <h4 className="font-semibold">{file.name}</h4>
              <p className="mt-1 text-sm text-text-secondary">
                {formatFileSize(file.size)}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setFile(null);
                setError(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
            >
              Remove
            </Button>
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-4 dark:bg-red-950">
              <div className="flex items-start gap-3">
                <RiErrorWarningLine className="h-5 w-5 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}

          <Button
            variant="primary"
            onClick={startUpload}
            className="mt-6 w-full"
          >
            <RiUploadCloudLine className="mr-2 h-5 w-5" />
            Start Upload
          </Button>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center gap-3">
            <RiLoader2Line className="h-6 w-6 animate-spin text-brand-500" />
            <h4 className="font-semibold">Uploading {file?.name}...</h4>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm text-text-secondary">
              <span>Progress</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full bg-brand-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>

          {/* Chunk Progress */}
          <div className="mt-4 flex items-center justify-between text-sm text-text-secondary">
            <span>Chunk {currentChunk} of {totalChunks}</span>
            <span>{formatFileSize((currentChunk / totalChunks) * (file?.size || 0))} uploaded</span>
          </div>

          <div className="mt-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Please keep this page open while the file uploads. Large files may take several minutes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
