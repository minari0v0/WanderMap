import { apiClient } from "./api-client"

export interface TripMemberItem {
  id: number
  nickname: string
  email?: string | null
  profileImage?: string | null
  role: "OWNER" | "MEMBER" | "GUEST"
}

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
  members?: TripMemberItem[]
}

export interface TripCreateRequest {
  title: string
  destination: string
  startDate: string
  endDate: string
  userId?: number
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

export interface ItineraryPlaceItem {
  id: number
  placeId: number | null
  dayNumber: number
  visitOrder: number
  name: string
  category: string
  address: string
  latitude?: number | null
  longitude?: number | null
  expectedVisitTime: string
  durationMinutes: number
  travelMinutesFromPrev: number
  memo: string
  rating: number | null
  review: string
  photos: string[]
  status: "VOTING" | "CONFIRMED" | string
  votesUp: number
  votesDown: number
  myVote: "UP" | "DOWN" | null
}

export interface ItineraryDayItem {
  id: number
  dayNumber: number
  date: string
  memo: string
  places: ItineraryPlaceItem[]
}

export interface TripItineraryResponse {
  tripId: number
  totalDays: number
  memberCount: number
  days: ItineraryDayItem[]
}

export interface AddPlacePayload {
  dayNumber: number
  googlePlaceId?: string
  name: string
  category: string
  address: string
  latitude?: number
  longitude?: number
  expectedVisitTime?: string
  durationMinutes?: number
  memo?: string
  rating?: number | null
  review?: string
  photos?: string[]
  userId?: number
}

export interface UpdatePlaceDiaryPayload {
  name?: string
  category?: string
  address?: string
  expectedVisitTime?: string
  durationMinutes?: number
  memo?: string
  rating?: number | null
  review?: string
  photos?: string[]
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

  getMyTrips: async (userId: number): Promise<TripResponse[]> => {
    const response = await apiClient.get<TripResponse[]>("/api/trips/my", {
      params: { userId },
    })
    return response.data
  },

  // =========================================================================
  // 일정 (Itinerary) & 여행 다이어리 (Travel Diary) API
  // =========================================================================
  getItinerary: async (tripId: number, userId?: number): Promise<TripItineraryResponse> => {
    const response = await apiClient.get<TripItineraryResponse>(`/api/trips/${tripId}/itinerary`, {
      params: userId ? { userId } : undefined,
    })
    return response.data
  },

  updateDayMemo: async (
    tripId: number,
    dayNumber: number,
    memo: string,
    userId?: number
  ): Promise<TripItineraryResponse> => {
    const response = await apiClient.put<TripItineraryResponse>(
      `/api/trips/${tripId}/itinerary/days/${dayNumber}/memo`,
      { memo, userId }
    )
    return response.data
  },

  addPlace: async (tripId: number, payload: AddPlacePayload): Promise<TripItineraryResponse> => {
    const response = await apiClient.post<TripItineraryResponse>(
      `/api/trips/${tripId}/itinerary/places`,
      payload
    )
    return response.data
  },

  addPlacesBatch: async (
    tripId: number,
    places: AddPlacePayload[],
    replaceAll = false,
    userId?: number
  ): Promise<TripItineraryResponse> => {
    const response = await apiClient.post<TripItineraryResponse>(
      `/api/trips/${tripId}/itinerary/places/batch`,
      { places, replaceAll, userId }
    )
    return response.data
  },

  updatePlaceDiary: async (
    tripId: number,
    itineraryPlaceId: number,
    payload: UpdatePlaceDiaryPayload,
    userId?: number
  ): Promise<TripItineraryResponse> => {
    const response = await apiClient.put<TripItineraryResponse>(
      `/api/trips/${tripId}/itinerary/places/${itineraryPlaceId}`,
      payload,
      { params: userId ? { userId } : undefined }
    )
    return response.data
  },

  deletePlace: async (
    tripId: number,
    itineraryPlaceId: number,
    userId?: number
  ): Promise<TripItineraryResponse> => {
    const response = await apiClient.delete<TripItineraryResponse>(
      `/api/trips/${tripId}/itinerary/places/${itineraryPlaceId}`,
      { params: userId ? { userId } : undefined }
    )
    return response.data
  },

  reorderDayPlaces: async (
    tripId: number,
    dayNumber: number,
    placeIds: number[],
    userId?: number
  ): Promise<TripItineraryResponse> => {
    const response = await apiClient.put<TripItineraryResponse>(
      `/api/trips/${tripId}/itinerary/days/${dayNumber}/reorder`,
      { placeIds, userId }
    )
    return response.data
  },

  votePlace: async (
    tripId: number,
    itineraryPlaceId: number,
    userId: number,
    voteType: "UP" | "DOWN"
  ): Promise<TripItineraryResponse> => {
    const response = await apiClient.post<TripItineraryResponse>(
      `/api/trips/${tripId}/itinerary/places/${itineraryPlaceId}/vote`,
      { userId, voteType }
    )
    return response.data
  },
}
