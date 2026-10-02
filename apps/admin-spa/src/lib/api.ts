export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("admin_token") ||
    sessionStorage.getItem("admin_token") ||
    null
  );
}

export function setToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("admin_token", token);
  }
}

export function removeToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("admin_token");
    sessionStorage.removeItem("admin_token");
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // If endpoint is relative, prepend baseUrl or let Vite proxy handle /api
  const url = endpoint.startsWith("http") ? endpoint : endpoint;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Unauthorized: could redirect to login or clear token if in production
      console.warn("[API] Unauthorized request to", endpoint);
    }

    const contentType = response.headers.get("content-type");
    let responseData: any = null;

    if (contentType && contentType.includes("application/json")) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      const errorMessage =
        (responseData && (responseData.error || responseData.message)) ||
        `HTTP Error ${response.status}: ${response.statusText}`;
      throw new ApiError(errorMessage, response.status, responseData);
    }

    // Unwrap { success: true, data: ... } if present
    if (responseData && typeof responseData === "object" && responseData.success === true) {
      if ("data" in responseData && responseData.data !== undefined) {
        const extraKeys = Object.keys(responseData).filter(
          (k) => k !== "success" && k !== "data"
        );
        if (extraKeys.length > 0) {
          if (Array.isArray(responseData.data)) {
            return responseData as T;
          }
          return { ...responseData, ...responseData.data } as T;
        }
        if (typeof responseData.data === "object" && !Array.isArray(responseData.data)) {
          // Object response: merge top-level and .data to keep all fields intact (e.g. for dashboard-stats)
          return { ...responseData, ...responseData.data } as T;
        }
        return responseData.data as T;
      }
    }

    return responseData as T;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(
      err?.message || "Lỗi kết nối tới máy chủ (Network Error)",
      0
    );
  }
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, string | number>) => {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          searchParams.append(key, String(val));
        }
      });
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes("?") ? "&" : "?") + qs;
      }
    }
    return request<T>(url, { method: "GET" });
  },

  post: <T>(endpoint: string, body?: any) => {
    return request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put: <T>(endpoint: string, body?: any) => {
    return request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  patch: <T>(endpoint: string, body?: any) => {
    return request<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete: <T>(endpoint: string) => {
    return request<T>(endpoint, { method: "DELETE" });
  },
};

/** SWR default fetcher */
export const swrFetcher = <T>(url: string): Promise<T> => api.get<T>(url);
