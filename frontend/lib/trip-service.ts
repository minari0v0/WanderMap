import { apiClient } from "./api-client"

export interface TripResponse {
  id: number
  inviteCode: string
  title: string
  destination: string
  startDate: string
  endDate: string
  status: string
  createdById: number | null
  createdByName: string
}

export interface TripCreateRequest {
  title: string
  destination: string
  startDate: string
  endDate: string
  userId?: number // 임시 mock 로그인용
}

export interface PreferenceSubmitRequest {
  foodCategories: string[]
  activityTypes: string[]
  excludedKeywords?: string
  freeMemo?: string
  userId?: number
}

export interface PreferenceResponse {
  id: number
  tripId: number
  userId: number
  userNickname: string
  foodCategories: string[]
  activityTypes: string[]
  excludedKeywords: string
  freeMemo: string
  submittedAt: string
}

export const tripService = {
  createTrip: async (data: TripCreateRequest): Promise<TripResponse> => {
    const response = await apiClient.post<TripResponse>("/api/trips", data)
    return response.data
  },

  joinTrip: async (inviteCode: string, userId?: number): Promise<TripResponse> => {
    const response = await apiClient.post<TripResponse>(`/api/trips/join/${inviteCode}`, null, {
      params: { userId },
    })
    return response.data
  },

  getTrip: async (id: number): Promise<TripResponse> => {
    const response = await apiClient.get<TripResponse>(`/api/trips/${id}`)
    return response.data
  },

  getTripByInviteCode: async (inviteCode: string): Promise<TripResponse> => {
    const response = await apiClient.get<TripResponse>(`/api/trips/invite/${inviteCode}`)
    return response.data
  },

  submitPreference: async (tripId: number, data: PreferenceSubmitRequest): Promise<PreferenceResponse> => {
    const response = await apiClient.post<PreferenceResponse>(`/api/trips/${tripId}/preferences`, data)
    return response.data
  },

  getMyPreference: async (tripId: number, userId?: number): Promise<PreferenceResponse | null> => {
    const response = await apiClient.get<PreferenceResponse | null>(`/api/trips/${tripId}/preferences/me`, {
      params: { userId },
    })
    return response.data
  },

  getTripPreferences: async (tripId: number): Promise<PreferenceResponse[]> => {
    const response = await apiClient.get<PreferenceResponse[]>(`/api/trips/${tripId}/preferences`)
    return response.data
  },
}
