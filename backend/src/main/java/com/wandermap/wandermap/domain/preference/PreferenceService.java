package com.wandermap.wandermap.domain.preference;

import com.wandermap.wandermap.domain.auth.User;
import com.wandermap.wandermap.domain.auth.UserRepository;
import com.wandermap.wandermap.domain.trip.Trip;
import com.wandermap.wandermap.domain.trip.TripRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PreferenceService {

    private final PreferenceRepository preferenceRepository;
    private final TripRepository tripRepository;
    private final UserRepository userRepository;

    @Transactional
    public PreferenceResponse submitPreference(Long tripId, PreferenceSubmitRequest request) {
        User user = requireAuthenticatedUser(request.getUserId());

        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 여행 방입니다. ID: " + tripId));

        Preference preference = preferenceRepository.findByTripIdAndUserId(tripId, user.getId())
                .map(existing -> {
                    existing.update(
                            request.getFoodCategories(),
                            request.getActivityTypes(),
                            request.getExcludedKeywords(),
                            request.getFreeMemo()
                    );
                    return existing;
                })
                .orElseGet(() -> Preference.builder()
                        .trip(trip)
                        .user(user)
                        .foodCategories(request.getFoodCategories())
                        .activityTypes(request.getActivityTypes())
                        .excludedKeywords(request.getExcludedKeywords())
                        .freeMemo(request.getFreeMemo())
                        .build());

        Preference saved = preferenceRepository.save(preference);
        return PreferenceResponse.from(saved);
    }

    public PreferenceResponse getMyPreference(Long tripId, Long userId) {
        User user = requireAuthenticatedUser(userId);
        return preferenceRepository.findByTripIdAndUserId(tripId, user.getId())
                .map(PreferenceResponse::from)
                .orElse(null);
    }

    public List<PreferenceResponse> getTripPreferences(Long tripId) {
        return preferenceRepository.findByTripId(tripId).stream()
                .map(PreferenceResponse::from)
                .collect(Collectors.toList());
    }

    private User requireAuthenticatedUser(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("로그인이 필요한 기능입니다.");
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("로그인이 필요한 기능입니다."));
    }
}
