package com.wandermap.wandermap.domain.trip;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
public class TripResponse {
    private final Long id;
    private final String inviteCode;
    private final String title;
    private final String destination;
    private final LocalDate startDate;
    private final LocalDate endDate;
    private final String status;
    private final Long createdById;
    private final String createdByName;

    @Builder
    public TripResponse(Long id, String inviteCode, String title, String destination,
                        LocalDate startDate, LocalDate endDate, String status,
                        Long createdById, String createdByName) {
        this.id = id;
        this.inviteCode = inviteCode;
        this.title = title;
        this.destination = destination;
        this.startDate = startDate;
        this.endDate = endDate;
        this.status = status;
        this.createdById = createdById;
        this.createdByName = createdByName;
    }

    public static TripResponse from(Trip trip) {
        return TripResponse.builder()
                .id(trip.getId())
                .inviteCode(trip.getInviteCode())
                .title(trip.getTitle())
                .destination(trip.getDestination())
                .startDate(trip.getStartDate())
                .endDate(trip.getEndDate())
                .status(trip.getStatus().name())
                .createdById(trip.getCreatedBy() != null ? trip.getCreatedBy().getId() : null)
                .createdByName(trip.getCreatedBy() != null ? trip.getCreatedBy().getNickname() : "Unknown")
                .build();
    }
}
