package com.wandermap.wandermap.domain.itinerary;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PlaceVoteRepository extends JpaRepository<PlaceVote, Long> {
    List<PlaceVote> findByItineraryPlaceId(Long itineraryPlaceId);
    List<PlaceVote> findByItineraryPlaceIdIn(List<Long> itineraryPlaceIds);
    Optional<PlaceVote> findByItineraryPlaceIdAndUserId(Long itineraryPlaceId, Long userId);
    void deleteByItineraryPlaceId(Long itineraryPlaceId);
    void deleteByItineraryPlaceIdIn(List<Long> itineraryPlaceIds);
    void deleteByUserId(Long userId);
}

