import axios from "axios"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
})

// 요청 인터셉터: 로그인 세션이 있을 경우 X-User-Id 헤더 자동 첨부
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const isAuth = localStorage.getItem("isAuthenticated")
    const userId = localStorage.getItem("userId")
    if (isAuth === "true" && userId) {
      config.headers = config.headers || {}
      config.headers["X-User-Id"] = userId
    }
  }
  return config
})
