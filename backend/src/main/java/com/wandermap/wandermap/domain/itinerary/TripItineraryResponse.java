package com.wandermap.wandermap.domain.itinerary;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter
@Builder
public class TripItineraryResponse {
    private Long tripId;
    private int totalDays;
    private int memberCount;
    private List<DayItem> days;

    @Getter
    @Builder
    public static class DayItem {
        private Long id;
        private int dayNumber;
        private LocalDate date;
        private String memo;
        private List<PlaceItem> places;
    }

    @Getter
    @Builder
    public static class PlaceItem {
        private Long id;
        private Long placeId;
        private int dayNumber;
        private int visitOrder;
        private String name;
        private String category;
        private String address;
        private BigDecimal latitude;
        private BigDecimal longitude;
        private String expectedVisitTime;
        private Integer durationMinutes;
        private Integer travelMinutesFromPrev;
        private String memo;
        private Integer rating;
        private String review;
        private List<String> photos;
        private String status;
        private int votesUp;
        private int votesDown;
        private String myVote;
    }
}

