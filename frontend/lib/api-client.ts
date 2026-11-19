import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
})

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

let refreshPromise: Promise<string | null> | null = null

function clearClientAuthStorage() {
  if (typeof window === "undefined") return
  localStorage.removeItem("isAuthenticated")
  localStorage.removeItem("userId")
  localStorage.removeItem("email")
  localStorage.removeItem("nickname")
  localStorage.removeItem("profileImage")
  localStorage.removeItem("bio")
  localStorage.removeItem("emailVerified")
  localStorage.removeItem("provider")
  localStorage.removeItem("linkedProviders")
  localStorage.removeItem("accessToken")
  localStorage.removeItem("refreshToken")
  window.dispatchEvent(new CustomEvent("wandermap:user-updated", { detail: null }))
}

async function performTokenRefresh(): Promise<string | null> {
  if (typeof window === "undefined") return null
  const refreshToken = localStorage.getItem("refreshToken")
  if (!refreshToken) return null

  try {
    const response = await axios.post<{
      accessToken: string
      refreshToken: string
    }>(
      `${API_BASE_URL}/api/auth/refresh`,
      { refreshToken },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      }
    )

    const { accessToken, refreshToken: nextRefreshToken } = response.data
    if (!accessToken) {
      clearClientAuthStorage()
      return null
    }

    localStorage.setItem("accessToken", accessToken)
    if (nextRefreshToken) {
      localStorage.setItem("refreshToken", nextRefreshToken)
    }
    return accessToken
  } catch {
    clearClientAuthStorage()
    return null
  }
}

// 요청 인터셉터: JWT Access Token 자동 첨부 (+ 레거시 X-User-Id 폴백 병행)
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    config.headers = config.headers || {}
    const accessToken = localStorage.getItem("accessToken")
    if (accessToken) {
      config.headers["Authorization"] = `Bearer ${accessToken}`
    }
    const isAuth = localStorage.getItem("isAuthenticated")
    const userId = localStorage.getItem("userId")
    if (isAuth === "true" && userId) {
      config.headers["X-User-Id"] = userId
    }
  }
  return config
})

// 응답 인터셉터: 401 만료 시 Refresh Token으로 1회 자동 갱신 및 재시도
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined
    const status = error.response?.status
    const requestUrl = originalRequest?.url || ""

    const isAuthEndpoint =
      requestUrl.includes("/api/auth/login") ||
      requestUrl.includes("/api/auth/signup") ||
      requestUrl.includes("/api/auth/refresh") ||
      requestUrl.includes("/api/auth/logout")

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint &&
      typeof window !== "undefined"
    ) {
      originalRequest._retry = true

      if (!refreshPromise) {
        refreshPromise = performTokenRefresh().finally(() => {
          refreshPromise = null
        })
      }

      const newAccessToken = await refreshPromise
      if (newAccessToken) {
        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`
        return apiClient(originalRequest)
      }
    }

    return Promise.reject(error)
  }
)
