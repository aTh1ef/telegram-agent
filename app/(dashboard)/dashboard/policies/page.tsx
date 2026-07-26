"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/Badge";

interface PolicyDocument {
  id: string;
  filename: string;
  status: "processing" | "ready" | "failed";
  chunk_count: number;
  uploaded_at: string;
}

function statusVariant(status: PolicyDocument["status"]) {
  if (status === "ready") return "general" as const;
  if (status === "failed") return "blocked" as const;
  return "neutral" as const;
}

export default function PoliciesPage() {
  const [docs, setDocs] = useState<PolicyDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function load() {
    setLoading(true);
    fetch("/api/admin/policy")
      .then((r) => r.json())
      .then((body) => setDocs(body.data ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/admin/policy", {
      method: "POST",
      body: formData,
    });

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Upload failed");
      return;
    }

    load();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/policy/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-fg">HR Policies</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Upload the MOHRE / HR policy PDFs the bot grounds its answers in. Uploading
        chunks and embeds the document immediately; deleting removes it from retrieval.
      </p>

      <div className="mt-6 rounded-md border border-dashed border-border p-6 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
          id="policy-upload"
        />
        <label
          htmlFor="policy-upload"
          className="inline-block cursor-pointer rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-emphasis"
        >
          {uploading ? "Processing…" : "Upload PDF"}
        </label>
        <p className="mt-2 text-xs text-fg-subtle">PDF only, up to 10MB</p>
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-canvas-subtle text-xs uppercase text-fg-muted">
            <tr>
              <th className="px-4 py-2 font-medium">File</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Chunks</th>
              <th className="px-4 py-2 font-medium">Uploaded</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {docs.map((doc) => (
              <tr key={doc.id} className="border-t border-border">
                <td className="px-4 py-2 text-fg">{doc.filename}</td>
                <td className="px-4 py-2">
                  <Badge variant={statusVariant(doc.status)}>{doc.status}</Badge>
                </td>
                <td className="px-4 py-2 text-fg-muted">{doc.chunk_count}</td>
                <td className="px-4 py-2 text-fg-muted">
                  {new Date(doc.uploaded_at).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="text-xs font-medium text-danger hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!loading && docs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-fg-muted">
                  No policy documents uploaded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
