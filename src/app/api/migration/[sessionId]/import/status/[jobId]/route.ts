/**
 * GET /api/migration/[sessionId]/import/status/[jobId]
 *
 * Track import progress with Server-Sent Events (SSE).
 */

import { NextRequest } from "next/server";
import { activeImportJobs } from "@/lib/migration/import-jobs";

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string; jobId: string } }
) {
  const { jobId } = params;

  if (!jobId) {
    return new Response(JSON.stringify({ error: "Missing jobId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check if client wants SSE
  const accept = request.headers.get("accept");
  const wantsSSE = accept?.includes("text/event-stream");

  if (!wantsSSE) {
    // Return single status check (non-SSE)
    const job = activeImportJobs.get(jobId);
    if (!job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(job), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // SSE stream for real-time updates
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      // Poll for job status every 500ms
      const intervalId = setInterval(() => {
        const job = activeImportJobs.get(jobId);

        if (!job) {
          sendEvent({ error: "Job not found" });
          clearInterval(intervalId);
          controller.close();
          return;
        }

        // Send status update
        sendEvent({
          status: job.status,
          progress: job.progress,
          recordsImported: job.recordsImported,
          recordsFailed: job.recordsFailed,
          totalRecords: job.totalRecords,
          currentBatch: job.currentBatch,
          totalBatches: job.totalBatches,
          errors: job.errors,
        });

        // Close stream if job is completed or failed
        if (job.status === "COMPLETED" || job.status === "FAILED") {
          clearInterval(intervalId);
          setTimeout(() => controller.close(), 1000); // Give client time to receive final event
        }
      }, 500);

      // Cleanup on client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(intervalId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
