package com.wandermap.wandermap.domain.presence;

import java.util.List;

public record TripPresenceResponse(
        Long tripId,
        int totalOnlineCount,
        int guestCount,
        List<OnlineViewer> viewers) {
    public record OnlineViewer(
            String viewerKey,
            boolean guest,
            Long userId,
            String nickname,
            String profileImage,
            String role) {
    }
}
