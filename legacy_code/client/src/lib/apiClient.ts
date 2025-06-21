/**
 * Enhanced API client with comprehensive JSON/HTML conflict prevention
 */

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
  redirectTo?: string;
}

interface ApiError extends Error {
  status?: number;
  isApiError: boolean;
  responseType?: string;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = '') {
    this.baseURL = baseURL;
  }

  /**
   * Enhanced fetch wrapper that prevents JSON/HTML conflicts
   */
  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Ensure we request JSON and include credentials
    const config: RequestInit = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      
      if (!contentType || !contentType.includes('application/json')) {
        // HTML response detected - likely a routing or auth issue
        const error: ApiError = new Error(
          `Unexpected response type: Expected JSON, got ${contentType || 'unknown'}`
        ) as ApiError;
        error.status = response.status;
        error.isApiError = true;
        error.responseType = contentType || 'unknown';
        throw error;
      }

      // Parse JSON response
      const data = await response.json();
      
      // Handle HTTP errors with JSON responses
      if (!response.ok) {
        const error: ApiError = new Error(
          data.error || data.message || `HTTP ${response.status}`
        ) as ApiError;
        error.status = response.status;
        error.isApiError = true;
        error.responseType = 'json';
        throw error;
      }

      return data;
      
    } catch (error) {
      // Network or parsing errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const apiError: ApiError = new Error('Network error - please check your connection') as ApiError;
        apiError.isApiError = true;
        apiError.responseType = 'network';
        throw apiError;
      }
      
      // Re-throw API errors as-is
      if ((error as any).isApiError) {
        throw error;
      }
      
      // Unknown errors
      const apiError: ApiError = new Error('An unexpected error occurred') as ApiError;
      apiError.isApiError = true;
      apiError.responseType = 'unknown';
      throw apiError;
    }
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

/**
 * Legacy apiRequest function for backward compatibility
 */
export async function apiRequest<T = any>(
  method: string,
  endpoint: string,
  data?: any
): Promise<T> {
  try {
    const response = await apiClient.request<T>(endpoint, {
      method,
      body: data ? JSON.stringify(data) : undefined,
    });
    
    // Return data directly for backward compatibility
    return response.data || response;
  } catch (error) {
    const apiError = error as ApiError;
    
    // Handle auth errors specifically
    if (apiError.status === 401 || apiError.status === 403) {
      // Redirect to login for auth errors
      window.location.href = '/';
      throw new Error('Authentication required');
    }
    
    // Re-throw with better error message
    throw new Error(apiError.message || 'API request failed');
  }
}

export type { ApiResponse, ApiError };