"use client";

import { useCallback, useEffect, useState } from "react";

interface Receipt {
  id: number;
  filename: string;
  ocr_result: string | null;
  created_at: string;
}

interface OcrResult {
  vendor: string;
  date: string;
  amount_cents: number;
  category_suggestion: string;
  confidence: number;
  raw_text: string;
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [filename, setFilename] = useState("");
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [loading, setLoading] = useState(false);

  const loadReceipts = useCallback(async () => {
    const res = await fetch("/api/receipts");
    setReceipts(await res.json());
  }, []);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  async function handleUpload() {
    if (!filename) return;
    setLoading(true);

    // Create receipt record
    const res = await fetch("/api/receipts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename }),
    });
    const receipt = await res.json();

    // Run mock OCR
    const ocrRes = await fetch("/api/receipts/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiptId: receipt.id, filename }),
    });
    const ocr = await ocrRes.json();
    setOcrResult(ocr);

    setFilename("");
    setLoading(false);
    loadReceipts();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Receipts & OCR</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="bg-white border rounded-lg p-4 mb-4">
            <h3 className="font-semibold mb-3">Upload Receipt (Mock)</h3>
            <p className="text-xs text-slate-500 mb-3">
              In production, you would photograph or upload a receipt image. Here, enter a filename to simulate.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g., duodecim-lasku.pdf"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="flex-1 border rounded px-3 py-2 text-sm"
              />
              <button
                onClick={handleUpload}
                disabled={loading || !filename}
                className="bg-slate-900 text-white px-4 py-2 rounded text-sm hover:bg-slate-700 disabled:opacity-50"
              >
                {loading ? "Processing..." : "Upload & OCR"}
              </button>
            </div>
          </div>

          {ocrResult && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold mb-2">OCR Result (Mock)</h3>
              <div className="text-sm space-y-1">
                <p><strong>Vendor:</strong> {ocrResult.vendor}</p>
                <p><strong>Date:</strong> {ocrResult.date}</p>
                <p><strong>Amount:</strong> {(ocrResult.amount_cents / 100).toFixed(2)} EUR</p>
                <p><strong>Suggested category:</strong> {ocrResult.category_suggestion}</p>
                <p><strong>Confidence:</strong> {(ocrResult.confidence * 100).toFixed(0)}%</p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-blue-600 text-xs">Raw OCR text</summary>
                  <pre className="mt-1 text-xs bg-white p-2 rounded whitespace-pre-wrap">{ocrResult.raw_text}</pre>
                </details>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Receipt Archive</h3>
          {receipts.length === 0 ? (
            <p className="text-sm text-slate-500">No receipts uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {receipts.map((r) => (
                <div key={r.id} className="flex justify-between items-center border-b py-2 text-sm">
                  <span>{r.filename}</span>
                  <span className="text-xs text-slate-400">{r.created_at}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
