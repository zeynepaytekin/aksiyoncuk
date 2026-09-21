import { sessionCoordinator } from "@/services/auth/sessionCoordinator";
import type {
  ApiErrorResponse,
  FieldValidationError,
} from "@/types/auth";

const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

function getApiBaseUrl(): string {
  if (!configuredBaseUrl?.trim()) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is required.");
  }

  try {
    return new URL(configuredBaseUrl).toString().replace(/\/$/, "");
  } catch {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must be a valid absolute URL.");
  }
}

function isFieldError(value: unknown): value is FieldValidationError {
  if (!value || typeof value !== "object") return false;
  const error = value as Record<string, unknown>;
  return typeof error.field === "string" && typeof error.message === "string";
}

function parseError(value: unknown): ApiErrorResponse | null {
  if (!value || typeof value !== "object") return null;
  const error = value as Record<string, unknown>;
  if (typeof error.code !== "string" || typeof error.message !== "string") {
    return null;
  }
  const rawFieldErrors = error.fieldErrors ?? error.errors;
  const fieldErrors = Array.isArray(rawFieldErrors)
    ? rawFieldErrors.filter(isFieldError)
    : undefined;
  return {
    code: error.code,
    message: error.message,
    timestamp:
      typeof error.timestamp === "string" ? error.timestamp : undefined,
    path: typeof error.path === "string" ? error.path : undefined,
    fieldErrors,
  };
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors: FieldValidationError[] = [],
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ApiError";
  }
}

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  accessToken?: string;
  authenticated?: boolean;
  skipRefresh?: boolean;
  retried?: boolean;
};

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  if (isDemoMode) {
    const { demoRequest } = await import("@/demo/demoApi");
    return demoRequest<T>(path, options);
  }
  const {
    accessToken,
    authenticated = false,
    body,
    headers,
    retried = false,
    skipRefresh = false,
    ...requestInit
  } = options;
  const token =
    accessToken ?? (authenticated ? sessionCoordinator.getAccessToken() : null);
  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isFormData) {
    requestHeaders.set("Content-Type", "application/json");
  }
  if (token) requestHeaders.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...requestInit,
      headers: requestHeaders,
      body:
        body === undefined
          ? undefined
          : isFormData
            ? body
            : JSON.stringify(body),
    });
  } catch (cause) {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Unable to reach the API service.",
      [],
      { cause },
    );
  }

  if (
    response.status === 401 &&
    authenticated &&
    !skipRefresh &&
    !retried
  ) {
    const newToken = await sessionCoordinator.refreshAccessToken();
    if (newToken) {
      return apiRequest<T>(path, {
        ...options,
        accessToken: newToken,
        retried: true,
      });
    }
    sessionCoordinator.clearSession();
  }

  const responseBody = await readBody(response);
  if (!response.ok) {
    const parsed = parseError(responseBody);
    throw new ApiError(
      response.status,
      parsed?.code ?? `HTTP_${response.status}`,
      parsed?.message ?? "The request could not be completed.",
      parsed?.fieldErrors,
    );
  }

  return responseBody as T;
}

export type ApiDownload = {
  blob: Blob;
  contentDisposition: string | null;
};

export async function apiDownload(
  path: string,
  options: Omit<ApiRequestOptions, "body"> = {},
): Promise<ApiDownload> {
  if (isDemoMode) {
    throw new ApiError(403, "DEMO_ACTION_DISABLED", "Downloads are disabled in the static demo.");
  }
  const {
    accessToken,
    authenticated = true,
    headers,
    retried = false,
    skipRefresh = false,
    ...requestInit
  } = options;
  const token =
    accessToken ?? (authenticated ? sessionCoordinator.getAccessToken() : null);
  const requestHeaders = new Headers(headers);
  if (token) requestHeaders.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...requestInit,
      headers: requestHeaders,
    });
  } catch (cause) {
    throw new ApiError(0, "NETWORK_ERROR", "Unable to reach the API service.", [], {
      cause,
    });
  }
  if (response.status === 401 && authenticated && !skipRefresh && !retried) {
    const newToken = await sessionCoordinator.refreshAccessToken();
    if (newToken) {
      return apiDownload(path, { ...options, accessToken: newToken, retried: true });
    }
    sessionCoordinator.clearSession();
  }
  if (!response.ok) {
    const parsed = parseError(await readBody(response));
    throw new ApiError(
      response.status,
      parsed?.code ?? `HTTP_${response.status}`,
      parsed?.message ?? "The download could not be completed.",
      parsed?.fieldErrors,
    );
  }
  return {
    blob: await response.blob(),
    contentDisposition: response.headers.get("Content-Disposition"),
  };
}
