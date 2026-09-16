import axios from "axios"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
})

// Axios Request 인터셉터: 로컬 스토리지의 JWT 토큰 자동 첨부
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

export interface UserProfile {
  id: number
  email: string
  nickname: string
  profileImage: string
  bio: string
  emailVerified: boolean
  provider: string
  hasPassword: boolean
  linkedProviders: string[]
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  user: UserProfile
}

export const authService = {
  // 1. 회원가입
  async register(params: {
    nickname: string
    email: string
    password: string
    passwordConfirm: string
  }): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>("/api/auth/register", params)
    this.saveAuthSession(res.data)
    return res.data
  },

  // 닉네임 중복 확인
  async checkNickname(nickname: string): Promise<{ available: boolean; message: string }> {
    const res = await api.get<{ available: boolean; message: string }>(
      `/api/auth/check-nickname?nickname=${encodeURIComponent(nickname)}`
    )
    return res.data
  },

  // 이메일 중복 확인
  async checkEmail(email: string): Promise<{ available: boolean; message: string }> {
    const res = await api.get<{ available: boolean; message: string }>(
      `/api/auth/check-email?email=${encodeURIComponent(email)}`
    )
    return res.data
  },

  // 2. 로그인
  async login(params: { email: string; password: string }): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>("/api/auth/login", params)
    this.saveAuthSession(res.data)
    return res.data
  },

  // 3. 내 프로필 조회
  async getMyProfile(): Promise<UserProfile> {
    const res = await api.get<UserProfile>("/api/users/me")
    return res.data
  },

  // 4. 이메일 인증 번호 발송
  async sendVerificationEmail(): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>("/api/users/me/email/send-code")
    return res.data
  },

  // 5. 이메일 인증 번호 확인
  async verifyEmailCode(code: string): Promise<{ verified: boolean; message: string }> {
    const res = await api.post<{ verified: boolean; message: string }>("/api/users/me/email/verify-code", { code })
    return res.data
  },

  // 6. 프로필 수정
  async updateProfile(params: { nickname: string; profileImage?: string; bio?: string }): Promise<UserProfile> {
    const res = await api.patch<UserProfile>("/api/users/me/profile", params)
    return res.data
  },

  // 7. 비밀번호 변경
  async changePassword(params: {
    currentPassword?: string
    newPassword: string
    newPasswordConfirm: string
  }): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>("/api/users/me/password", params)
    return res.data
  },

  // 8. 소셜 계정 연동 / 해제
  async linkSocial(provider: string): Promise<UserProfile> {
    const res = await api.post<UserProfile>(`/api/users/me/social-links/${provider}`, {
      oauthId: `mock-${provider.toLowerCase()}-${Date.now()}`,
    })
    return res.data
  },

  async unlinkSocial(provider: string): Promise<UserProfile> {
    const res = await api.delete<UserProfile>(`/api/users/me/social-links/${provider}`)
    return res.data
  },

  // 세션 저장/로그아웃
  saveAuthSession(auth: AuthResponse) {
    if (typeof window === "undefined") return
    localStorage.setItem("accessToken", auth.accessToken)
    localStorage.setItem("refreshToken", auth.refreshToken)
    localStorage.setItem("userId", String(auth.user.id))
    localStorage.setItem("nickname", auth.user.nickname)
    localStorage.setItem("email", auth.user.email)
    localStorage.setItem("isAuthenticated", "true")
  },

  logout() {
    if (typeof window === "undefined") return
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")
    localStorage.removeItem("userId")
    localStorage.removeItem("nickname")
    localStorage.removeItem("email")
    localStorage.removeItem("isAuthenticated")
  },

  getStoredToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem("accessToken")
  },
}
