/** Read a JSON API response without leaking native JSON.parse errors to users. */
export async function readJsonResponse<T = unknown>(response: Response): Promise<T> {
  let body: string;
  try {
    body = await response.text();
  } catch {
    throw new Error("Could not read the server response. Check your connection and try again.");
  }

  if (!body.trim()) {
    throw new Error(
      response.ok
        ? "The server returned an empty response. Please try again."
        : `The server returned an empty error response (HTTP ${response.status}). Please try again.`,
    );
  }

  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed === null) throw new Error("empty JSON value");
    return parsed as T;
  } catch {
    throw new Error(
      response.ok
        ? "The server returned unreadable data. Please try again."
        : `The server returned an unreadable error (HTTP ${response.status}). Please try again.`,
    );
  }
}

export function apiErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const record = payload as { error?: unknown; message?: unknown };
    if (typeof record.error === "string" && record.error.trim()) return record.error;
    if (typeof record.message === "string" && record.message.trim()) return record.message;
  }
  return fallback;
}
