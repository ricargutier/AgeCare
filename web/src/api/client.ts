import type { ApiError } from "../../../shared/contracts/types";
import { useAuthStore } from "../auth/store";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export { ApiClientError };

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const { token, logout } = useAuthStore.getState();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    logout();
    // Redirect to login
    window.location.href = "/login";
    // Return a never-resolving promise so callers don't continue
    return new Promise<never>(() => undefined);
  }

  if (!res.ok) {
    let body: ApiError | null = null;
    try {
      body = (await res.json()) as ApiError;
    } catch {
      // non-JSON response
    }
    throw new ApiClientError(
      body?.error?.code ?? "UNKNOWN",
      body?.error?.message ?? `HTTP ${res.status}`,
      body?.error?.details
    );
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as unknown as T;
  }

  return res.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
