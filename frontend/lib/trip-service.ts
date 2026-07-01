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
}
