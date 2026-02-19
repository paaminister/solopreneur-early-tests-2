/**
 * Shared API utilities: error handling, idempotency, response helpers.
 */
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getDb } from "@/lib/db";

/** Standard error response */
export function errorResponse(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { error: message, ...(details ? { details } : {}) },
    { status }
  );
}

/** Handle zod validation errors */
export function validationError(error: ZodError) {
  return errorResponse(
    "Validation failed",
    400,
    error.issues.map((e) => ({ path: e.path.join("."), message: e.message }))
  );
}

/** Wrap an API handler with try/catch for database and unexpected errors */
export function withErrorHandling(
  handler: () => Response | Promise<Response>
): Promise<Response> {
  return Promise.resolve()
    .then(handler)
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("API error:", message);

      // SQLite-specific errors
      if (message.includes("SQLITE_BUSY") || message.includes("database is locked")) {
        return errorResponse("Database is temporarily busy. Please retry.", 503);
      }
      if (message.includes("UNIQUE constraint failed")) {
        return errorResponse("Duplicate entry.", 409);
      }

      return errorResponse("Internal server error", 500);
    });
}

/**
 * Check idempotency key. Returns the existing response if the key was already used,
 * or null if this is a new request.
 */
export function checkIdempotency(key: string | undefined, table: string): unknown | null {
  if (!key) return null;

  const db = getDb();
  const existing = db
    .prepare("SELECT response_body FROM idempotency_keys WHERE key = ? AND table_name = ?")
    .get(key, table) as { response_body: string } | undefined;

  if (existing) {
    return JSON.parse(existing.response_body);
  }
  return null;
}

/** Store idempotency key after successful creation */
export function storeIdempotency(key: string | undefined, table: string, responseBody: unknown) {
  if (!key) return;

  const db = getDb();
  db.prepare(
    "INSERT OR IGNORE INTO idempotency_keys (key, table_name, response_body) VALUES (?, ?, ?)"
  ).run(key, table, JSON.stringify(responseBody));
}
