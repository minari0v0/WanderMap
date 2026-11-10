package com.wandermap.wandermap.domain.itinerary;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class AddPlaceRequest {
    private Integer dayNumber;
    private String googlePlaceId;
    private String name;
    private String category;
    private String address;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String expectedVisitTime;
    private Integer durationMinutes;
    private String memo;
    private Integer rating;
    private String review;
    private List<String> photos;
    private Long userId;
}

