package com.wandermap.wandermap.domain.itinerary;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "itinerary_places")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ItineraryPlace {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "day_id", nullable = false)
    private ItineraryDay day;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "place_id")
    private Place place;

    @Column(name = "visit_order", nullable = false)
    private Integer visitOrder;

    @Column(name = "expected_visit_time")
    private LocalTime expectedVisitTime;

    @Column(name = "duration_minutes")
    private Integer durationMinutes = 60;

    @Column(name = "travel_minutes_from_prev")
    private Integer travelMinutesFromPrev = 0;

    @Column(columnDefinition = "TEXT")
    private String memo;

    @Column
    private Integer rating;

    @Column(columnDefinition = "TEXT")
    private String review;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<String> photos = new ArrayList<>();

    @Column(length = 20)
    private String status = "VOTING";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public ItineraryPlace(
            ItineraryDay day,
            Place place,
            Integer visitOrder,
            LocalTime expectedVisitTime,
            Integer durationMinutes,
            Integer travelMinutesFromPrev,
            String memo,
            Integer rating,
            String review,
            List<String> photos,
            String status
    ) {
        this.day = day;
        this.place = place;
        this.visitOrder = visitOrder;
        this.expectedVisitTime = expectedVisitTime;
        this.durationMinutes = durationMinutes != null ? durationMinutes : 60;
        this.travelMinutesFromPrev = travelMinutesFromPrev != null ? travelMinutesFromPrev : 0;
        this.memo = memo;
        this.rating = rating;
        this.review = review;
        this.photos = photos != null ? new ArrayList<>(photos) : new ArrayList<>();
        this.status = status != null ? status : "VOTING";
    }

    public void updateVisitOrder(int visitOrder) {
        this.visitOrder = visitOrder;
    }

    public void updateStatus(String status) {
        this.status = status;
    }

    public void updateDetails(
            LocalTime expectedVisitTime,
            Integer durationMinutes,
            String memo,
            Integer rating,
            String review,
            List<String> photos
    ) {
        if (expectedVisitTime != null) {
            this.expectedVisitTime = expectedVisitTime;
        }
        if (durationMinutes != null) {
            this.durationMinutes = durationMinutes;
        }
        if (memo != null) {
            this.memo = memo;
        }
        if (rating != null) {
            this.rating = rating;
        }
        if (review != null) {
            this.review = review;
        }
        if (photos != null) {
            this.photos = new ArrayList<>(photos);
        }
    }
}

