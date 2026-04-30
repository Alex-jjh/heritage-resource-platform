const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  skipAuth?: boolean;
};

type FormRequestOptions = Omit<RequestInit, "body" | "headers"> & {
  headers?: HeadersInit;
  skipAuth?: boolean;
};

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(callback: () => void) {
  onUnauthorized = callback;
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

function buildUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

async function parseErrorMessage(response: Response): Promise<string> {
  const fallback = `Request failed with status ${response.status}`;
  const contentType = response.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const errorBody = await response.json();
      return errorBody?.message ?? fallback;
    }

    const text = await response.text();
    return text || fallback;
  } catch {
    return fallback;
  }
}

async function handleResponse<T>(
  response: Response,
  sentWithToken: boolean
): Promise<T> {
  if (response.status === 401) {
    if (sentWithToken) {
      onUnauthorized?.();
    }
    throw new ApiError("Unauthorized", 401);
  }

  if (response.status === 403) {
    const message = await parseErrorMessage(response);
    throw new ApiError(message || "Access denied", 403);
  }

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, headers: customHeaders, skipAuth, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(customHeaders as Record<string, string>),
  };

  let sentWithToken = false;

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      sentWithToken = true;
    }
  }

  const response = await fetch(buildUrl(path), {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return handleResponse<T>(response, sentWithToken);
}

async function uploadForm<T>(
  path: string,
  formData: FormData,
  options: FormRequestOptions = {}
): Promise<T> {
  const { headers: customHeaders, skipAuth, ...rest } = options;

  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  };

  let sentWithToken = false;

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      sentWithToken = true;
    }
  }

  const response = await fetch(buildUrl(path), {
    ...rest,
    method: rest.method ?? "POST",
    headers,
    body: formData,
  });

  return handleResponse<T>(response, sentWithToken);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),

  uploadForm,
};
