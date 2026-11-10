package com.wandermap.wandermap.domain.itinerary;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class UpdatePlaceDiaryRequest {
    private String name;
    private String category;
    private String address;
    private String expectedVisitTime;
    private Integer durationMinutes;
    private String memo;
    private Integer rating;
    private String review;
    private List<String> photos;
}

