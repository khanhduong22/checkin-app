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

export function setToken(_token: string) {
  // Deprecated: Admin uses 100% HttpOnly cookie 'access_token'
}

export function removeToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("admin_token");
    sessionStorage.removeItem("admin_token");
    localStorage.removeItem("limart_staff_jwt_token");
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string>),
  };

  // Normalize endpoint: ensure leading /api if relative path and not already /api
  let normalizedEndpoint = endpoint;
  if (!endpoint.startsWith("http") && !endpoint.startsWith("/api")) {
    normalizedEndpoint = endpoint.startsWith("/") ? `/api${endpoint}` : `/api/${endpoint}`;
  }
  const url = normalizedEndpoint;

  try {
    const response = await fetch(url, {
      credentials: "include",
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
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    return request<T>(endpoint, {
      method: "POST",
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  },

  upload: <T>(endpoint: string, formData: FormData) => {
    return request<T>(endpoint, {
      method: "POST",
      body: formData,
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
