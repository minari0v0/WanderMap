package com.wandermap.wandermap.domain.itinerary;

public record PlaceVoteResponse(
        Long itineraryPlaceId,
        int votesUp,
        int votesDown,
        String myVote,
        String status
) {}
