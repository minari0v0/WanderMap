package com.wandermap.wandermap.domain.itinerary;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ItineraryPlaceRepository extends JpaRepository<ItineraryPlace, Long> {
    List<ItineraryPlace> findByDayIdOrderByVisitOrderAsc(Long dayId);
    List<ItineraryPlace> findByDayIdInOrderByVisitOrderAsc(List<Long> dayIds);
    void deleteByDayIdIn(List<Long> dayIds);
}

