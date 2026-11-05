import { apiClient } from "./api-client"

export interface UserResponse {
  id: number
  email: string
  nickname: string
  profileImage?: string | null
  bio?: string | null
  emailVerified: boolean
  provider: string
  linkedProviders?: string[]
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

export interface ProfileUpdatePayload {
  userId: number
  nickname?: string
  profileImage?: string
  bio?: string
}

export interface PasswordChangePayload {
  userId: number
  currentPassword?: string
  newPassword: string
  newPasswordConfirm?: string
}

export const DEFAULT_PROFILE_IMAGE = "emoji:😺?bg=sage"

const PRESET_EMOJIS = [
  "🐹",
  "🐰",
  "😺",
  "🐶",
  "🦊",
  "🦔",
  "🐘",
  "🐻",
  "❄️",
  "🐵",
  "🐼",
  "🦁",
]

const PRESET_BG_IDS = [
  "sage",
  "peach",
  "sand",
  "coral",
  "silver",
  "bluegray",
  "lavender",
  "white",
]

export function generateRandomProfileImage(): string {
  const emoji = PRESET_EMOJIS[Math.floor(Math.random() * PRESET_EMOJIS.length)]
  const bg = PRESET_BG_IDS[Math.floor(Math.random() * PRESET_BG_IDS.length)]
  return `emoji:${emoji}?bg=${bg}`
}

export function getProfileBgClass(imgUrl?: string | null): string {
  if (!imgUrl) return "bg-[#EDFAF4]"
  if (imgUrl.includes("bg=sage")) return "bg-[#EDFAF4]"
  if (imgUrl.includes("bg=peach")) return "bg-[#FFF4EE]"
  if (imgUrl.includes("bg=sand")) return "bg-[#F7F6F3]"
  if (imgUrl.includes("bg=coral")) return "bg-[#FFF0F0]"
  if (imgUrl.includes("bg=silver")) return "bg-[#F2F4F6]"
  if (imgUrl.includes("bg=bluegray")) return "bg-[#ECEFF2]"
  if (imgUrl.includes("bg=lavender")) return "bg-[#F1F0F5]"
  if (imgUrl.includes("bg=white")) return "bg-white"
  return "bg-[#EDFAF4]"
}

export function isCustomImageAvatar(imgUrl?: string | null): boolean {
  if (!imgUrl || !imgUrl.trim()) return false
  if (imgUrl.startsWith("data:")) return true
  if (imgUrl.startsWith("http://") || imgUrl.startsWith("https://")) return true
  return false
}

export function getProfileEmoji(imgUrl?: string | null): string {
  if (!imgUrl || !imgUrl.trim()) return "😺"
  if (imgUrl.startsWith("emoji:")) {
    const raw = imgUrl.slice("emoji:".length).split("?")[0].trim()
    return raw || "😺"
  }
  // 레거시 기본 캐릭터 경로 호환
  if (imgUrl.includes("profile_puppy")) return "🐶"
  if (imgUrl.includes("profile_fox")) return "🦊"
  if (imgUrl.includes("profile_squrel")) return "🐹"
  if (imgUrl.includes("profile_cat")) return "😺"
  return "😺"
}

export function getCleanAvatarUrl(imgUrl?: string | null): string {
  if (!imgUrl || !imgUrl.trim()) return DEFAULT_PROFILE_IMAGE
  if (imgUrl.startsWith("data:")) return imgUrl
  return imgUrl.split("?")[0]
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

  checkNickname: async (nickname: string, userId?: number): Promise<boolean> => {
    const response = await apiClient.get<boolean>("/api/auth/check-nickname", {
      params: { nickname, userId },
    })
    return response.data
  },

  updateProfile: async (payload: ProfileUpdatePayload): Promise<UserResponse> => {
    const response = await apiClient.put<UserResponse>("/api/auth/profile", payload)
    authService.setSession(response.data)
    return response.data
  },

  changePassword: async (payload: PasswordChangePayload): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>("/api/auth/password", payload)
    return response.data
  },

  requestEmailVerification: async (
    userId: number,
    email: string
  ): Promise<{ message: string; devCode?: string }> => {
    const response = await apiClient.post<{ message: string; devCode?: string }>(
      "/api/auth/email/verification-request",
      { userId, email }
    )
    return response.data
  },

  verifyEmailCode: async (
    userId: number,
    email: string,
    code: string
  ): Promise<{ verified: boolean; message: string; user?: UserResponse }> => {
    const response = await apiClient.post<{
      verified: boolean
      message: string
      user?: UserResponse
    }>("/api/auth/email/verify", { userId, email, code })
    if (response.data.user && response.data.user.id) {
      authService.setSession(response.data.user)
    } else {
      const current = authService.getSession()
      if (current) {
        authService.setSession({ ...current, emailVerified: true })
      }
    }
    return response.data
  },

  linkSocial: async (userId: number, provider: string, oauthId?: string): Promise<UserResponse> => {
    const response = await apiClient.post<UserResponse>(`/api/auth/social/${provider}`, {
      userId,
      oauthId,
    })
    authService.setSession(response.data)
    return response.data
  },

  unlinkSocial: async (userId: number, provider: string): Promise<UserResponse> => {
    const response = await apiClient.delete<UserResponse>(`/api/auth/social/${provider}`, {
      params: { userId },
    })
    authService.setSession(response.data)
    return response.data
  },

  withdraw: async (userId: number): Promise<void> => {
    await apiClient.delete("/api/auth/withdraw", {
      params: { userId },
    })
    authService.clearSession()
  },

  setSession: (user: UserResponse) => {
    if (typeof window === "undefined") return
    const existingAvatar = localStorage.getItem("profileImage")
    const resolvedAvatar =
      user.profileImage && user.profileImage.trim()
        ? user.profileImage
        : existingAvatar || generateRandomProfileImage()

    localStorage.setItem("isAuthenticated", "true")
    localStorage.setItem("userId", String(user.id))
    localStorage.setItem("email", user.email)
    localStorage.setItem("nickname", user.nickname)
    localStorage.setItem("profileImage", resolvedAvatar)
    localStorage.setItem("bio", user.bio || "")
    localStorage.setItem("emailVerified", String(user.emailVerified))
    localStorage.setItem("provider", user.provider || "LOCAL")
    localStorage.setItem("linkedProviders", JSON.stringify(user.linkedProviders || []))
    window.dispatchEvent(
      new CustomEvent("wandermap:user-updated", {
        detail: { ...user, profileImage: resolvedAvatar },
      })
    )
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
    localStorage.removeItem("linkedProviders")
    window.dispatchEvent(new CustomEvent("wandermap:user-updated", { detail: null }))
  },

  getSession: (): UserResponse | null => {
    if (typeof window === "undefined") return null
    const isAuth = localStorage.getItem("isAuthenticated")
    if (isAuth !== "true") return null
    const id = Number(localStorage.getItem("userId"))
    if (!id) return null
    let linkedProviders: string[] = []
    try {
      const raw = localStorage.getItem("linkedProviders")
      if (raw) linkedProviders = JSON.parse(raw)
    } catch {}
    return {
      id,
      email: localStorage.getItem("email") || "",
      nickname: localStorage.getItem("nickname") || "여행가",
      profileImage: localStorage.getItem("profileImage") || DEFAULT_PROFILE_IMAGE,
      bio: localStorage.getItem("bio") || "나만의 특별한 여정을 기록하고 관리하고 있습니다.",
      emailVerified: localStorage.getItem("emailVerified") === "true",
      provider: localStorage.getItem("provider") || "LOCAL",
      linkedProviders,
      createdAt: "",
    }
  },
}
