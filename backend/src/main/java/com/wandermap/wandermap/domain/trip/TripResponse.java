package com.wandermap.wandermap.domain.trip;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

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
    private final List<MemberDto> members;

    @Getter
    @Builder
    public static class MemberDto {
        private final Long id;
        private final String nickname;
        private final String email;
        private final String profileImage;
        private final String role;
    }

    @Builder
    public TripResponse(Long id, String inviteCode, String title, String destination,
                        LocalDate startDate, LocalDate endDate, String status,
                        Long createdById, String createdByName, List<MemberDto> members) {
        this.id = id;
        this.inviteCode = inviteCode;
        this.title = title;
        this.destination = destination;
        this.startDate = startDate;
        this.endDate = endDate;
        this.status = status;
        this.createdById = createdById;
        this.createdByName = createdByName;
        this.members = members != null ? members : Collections.emptyList();
    }

    public static TripResponse from(Trip trip) {
        return from(trip, Collections.emptyList());
    }

    public static TripResponse from(Trip trip, List<TripMember> tripMembers) {
        List<MemberDto> memberDtos = tripMembers == null
                ? Collections.emptyList()
                : tripMembers.stream()
                        .filter(tm -> tm.getUser() != null)
                        .map(tm -> MemberDto.builder()
                                .id(tm.getUser().getId())
                                .nickname(tm.getUser().getNickname())
                                .email(tm.getUser().getEmail())
                                .profileImage(tm.getUser().getProfileImage())
                                .role(tm.getRole() != null ? tm.getRole().name() : "MEMBER")
                                .build())
                        .toList();

        if (memberDtos.isEmpty() && trip.getCreatedBy() != null) {
            memberDtos = List.of(MemberDto.builder()
                    .id(trip.getCreatedBy().getId())
                    .nickname(trip.getCreatedBy().getNickname())
                    .email(trip.getCreatedBy().getEmail())
                    .profileImage(trip.getCreatedBy().getProfileImage())
                    .role("OWNER")
                    .build());
        }

        return TripResponse.builder()
                .id(trip.getId())
                .inviteCode(trip.getInviteCode())
                .title(trip.getTitle())
                .destination(trip.getDestination())
                .startDate(trip.getStartDate())
                .endDate(trip.getEndDate())
                .status(trip.getStatus().name())
                .createdById(trip.getCreatedBy() != null ? trip.getCreatedBy().getId() : null)
                .createdByName(trip.getCreatedBy() != null ? trip.getCreatedBy().getNickname() : "여행가")
                .members(memberDtos)
                .build();
    }
}
