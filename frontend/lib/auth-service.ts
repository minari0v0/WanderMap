import { apiClient } from "./api-client"

export interface UserResponse {
  id: number
  email: string
  nickname: string
  profileImage?: string | null
  bio?: string | null
  emailVerified: boolean
  provider: string
  createdAt: string
}

export interface SignupRequest {
  email: string
  password: string
  nickname: string
  profileImage?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export const authService = {
  signup: async (data: SignupRequest): Promise<UserResponse> => {
    const response = await apiClient.post<UserResponse>("/api/auth/signup", data)
    return response.data
  },

  login: async (data: LoginRequest): Promise<UserResponse> => {
    const response = await apiClient.post<UserResponse>("/api/auth/login", data)
    return response.data
  },

  getMe: async (userId: number): Promise<UserResponse> => {
    const response = await apiClient.get<UserResponse>("/api/auth/me", {
      params: { userId },
    })
    return response.data
  },

  setSession: (user: UserResponse) => {
    if (typeof window === "undefined") return
    localStorage.setItem("isAuthenticated", "true")
    localStorage.setItem("userId", String(user.id))
    localStorage.setItem("email", user.email)
    localStorage.setItem("nickname", user.nickname)
    localStorage.setItem("profileImage", user.profileImage || "")
    localStorage.setItem("bio", user.bio || "")
    localStorage.setItem("emailVerified", String(user.emailVerified))
    localStorage.setItem("provider", user.provider)
  },

  clearSession: () => {
    if (typeof window === "undefined") return
    localStorage.removeItem("isAuthenticated")
    localStorage.removeItem("userId")
    localStorage.removeItem("email")
    localStorage.removeItem("nickname")
    localStorage.removeItem("profileImage")
    localStorage.removeItem("bio")
    localStorage.removeItem("emailVerified")
    localStorage.removeItem("provider")
  },

  getSession: (): UserResponse | null => {
    if (typeof window === "undefined") return null
    const isAuth = localStorage.getItem("isAuthenticated")
    if (isAuth !== "true") return null
    const id = Number(localStorage.getItem("userId"))
    if (!id) return null
    return {
      id,
      email: localStorage.getItem("email") || "",
      nickname: localStorage.getItem("nickname") || "여행가",
      profileImage: localStorage.getItem("profileImage") || null,
      bio: localStorage.getItem("bio") || null,
      emailVerified: localStorage.getItem("emailVerified") === "true",
      provider: localStorage.getItem("provider") || "LOCAL",
      createdAt: "",
    }
  },
}
