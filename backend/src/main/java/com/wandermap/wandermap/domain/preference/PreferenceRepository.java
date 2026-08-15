package com.wandermap.wandermap.domain.preference;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PreferenceRepository extends JpaRepository<Preference, Long> {
    Optional<Preference> findByTripIdAndUserId(Long tripId, Long userId);
    List<Preference> findByTripId(Long tripId);
    boolean existsByTripIdAndUserId(Long tripId, Long userId);
}
