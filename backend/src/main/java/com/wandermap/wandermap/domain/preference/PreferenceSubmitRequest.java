package com.wandermap.wandermap.domain.preference;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class PreferenceSubmitRequest {
    private List<String> foodCategories;
    private List<String> activityTypes;
    private String excludedKeywords;
    private String freeMemo;
    private Long userId; // Mock 인증 사용자 ID
}
