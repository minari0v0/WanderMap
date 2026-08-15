package com.wandermap.wandermap.domain.preference;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
public class PreferenceResponse {
    private final Long id;
    private final Long tripId;
    private final Long userId;
    private final String userNickname;
    private final List<String> foodCategories;
    private final List<String> activityTypes;
    private final String excludedKeywords;
    private final String freeMemo;
    private final LocalDateTime submittedAt;

    @Builder
    public PreferenceResponse(Long id, Long tripId, Long userId, String userNickname, List<String> foodCategories, List<String> activityTypes, String excludedKeywords, String freeMemo, LocalDateTime submittedAt) {
        this.id = id;
        this.tripId = tripId;
        this.userId = userId;
        this.userNickname = userNickname;
        this.foodCategories = foodCategories;
        this.activityTypes = activityTypes;
        this.excludedKeywords = excludedKeywords;
        this.freeMemo = freeMemo;
        this.submittedAt = submittedAt;
    }

    public static PreferenceResponse from(Preference preference) {
        return PreferenceResponse.builder()
                .id(preference.getId())
                .tripId(preference.getTrip().getId())
                .userId(preference.getUser().getId())
                .userNickname(preference.getUser().getNickname())
                .foodCategories(preference.getFoodCategories())
                .activityTypes(preference.getActivityTypes())
                .excludedKeywords(preference.getExcludedKeywords())
                .freeMemo(preference.getFreeMemo())
                .submittedAt(preference.getSubmittedAt())
                .build();
    }
}
