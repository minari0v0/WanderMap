package com.wandermap.wandermap.domain.itinerary;

import com.wandermap.wandermap.domain.trip.Trip;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "itinerary_days", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"trip_id", "day_number"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ItineraryDay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @Column(name = "day_number", nullable = false)
    private Integer dayNumber;

    @Column(nullable = false)
    private LocalDate date;

    @Column(columnDefinition = "TEXT")
    private String memo;

    @Builder
    public ItineraryDay(Trip trip, Integer dayNumber, LocalDate date, String memo) {
        this.trip = trip;
        this.dayNumber = dayNumber;
        this.date = date;
        this.memo = memo;
    }

    public void updateMemo(String memo) {
        this.memo = memo;
    }
}

