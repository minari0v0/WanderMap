package com.wandermap.wandermap.domain.trip;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
public class TripCreateRequest {
    private String title;
    private String destination;
    private LocalDate startDate;
    private LocalDate endDate;
    private Long userId; // 임시 로그인 처리용 userId
}
