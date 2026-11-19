package com.wandermap.wandermap.domain.presence;

import com.wandermap.wandermap.domain.auth.User;
import com.wandermap.wandermap.domain.auth.UserRepository;
import com.wandermap.wandermap.domain.trip.Trip;
import com.wandermap.wandermap.domain.trip.TripMember;
import com.wandermap.wandermap.domain.trip.TripMemberRepository;
import com.wandermap.wandermap.domain.trip.TripRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PresenceService {

    private static final long PRESENCE_TTL_MS = 45_000L;

    private final TripPresenceStore presenceStore;
    private final TripRepository tripRepository;
    private final TripMemberRepository tripMemberRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public TripPresenceResponse heartbeat(Long tripId, Long currentUserId, String sessionId) {
        if (tripId == null) {
            return new TripPresenceResponse(null, 0, 0, List.of());
        }
        Trip trip = tripRepository.findById(tripId).orElse(null);
        if (trip == null) {
            return new TripPresenceResponse(tripId, 0, 0, List.of());
        }

        long expiresAt = System.currentTimeMillis() + PRESENCE_TTL_MS;
        String cleanSessionId = sanitizeSessionId(sessionId);

        User user = currentUserId != null ? userRepository.findById(currentUserId).orElse(null) : null;
        if (user != null) {
            String role = resolveUserRole(trip, user.getId());
            presenceStore.upsert(tripId, new TripPresenceStore.PresenceRecord(
                    "user:" + user.getId(),
                    false,
                    user.getId(),
                    user.getNickname(),
                    user.getProfileImage(),
                    role,
                    expiresAt));
            if (!cleanSessionId.isEmpty()) {
                presenceStore.remove(tripId, "guest:" + cleanSessionId);
            }
        } else if (!cleanSessionId.isEmpty()) {
            presenceStore.upsert(tripId, new TripPresenceStore.PresenceRecord(
                    "guest:" + cleanSessionId,
                    true,
                    null,
                    "손님",
                    null,
                    "GUEST",
                    expiresAt));
        }

        return buildResponse(tripId);
    }

    public void leave(Long tripId, Long currentUserId, String sessionId) {
        if (tripId == null) {
            return;
        }
        if (currentUserId != null) {
            presenceStore.remove(tripId, "user:" + currentUserId);
        }
        String cleanSessionId = sanitizeSessionId(sessionId);
        if (!cleanSessionId.isEmpty()) {
            presenceStore.remove(tripId, "guest:" + cleanSessionId);
        }
    }

    public TripPresenceResponse getPresence(Long tripId) {
        if (tripId == null) {
            return new TripPresenceResponse(null, 0, 0, List.of());
        }
        return buildResponse(tripId);
    }

    private TripPresenceResponse buildResponse(Long tripId) {
        List<TripPresenceStore.PresenceRecord> active = presenceStore.listActive(tripId);
        int guestCount = 0;
        for (TripPresenceStore.PresenceRecord record : active) {
            if (record.guest()) {
                guestCount++;
            }
        }
        List<TripPresenceResponse.OnlineViewer> viewers = active.stream()
                .map(r -> new TripPresenceResponse.OnlineViewer(
                        r.viewerKey(),
                        r.guest(),
                        r.userId(),
                        r.nickname(),
                        r.profileImage(),
                        r.role()))
                .toList();
        return new TripPresenceResponse(tripId, viewers.size(), guestCount, viewers);
    }

    private String resolveUserRole(Trip trip, Long userId) {
        if (trip.getCreatedBy() != null && userId.equals(trip.getCreatedBy().getId())) {
            return "OWNER";
        }
        List<TripMember> members = tripMemberRepository.findByTrip(trip);
        for (TripMember member : members) {
            if (member.getUser() != null && userId.equals(member.getUser().getId())) {
                return member.getRole() != null ? member.getRole().name() : "MEMBER";
            }
        }
        return "GUEST";
    }

    private static String sanitizeSessionId(String sessionId) {
        if (sessionId == null) {
            return "";
        }
        String cleaned = sessionId.replaceAll("[^A-Za-z0-9_-]", "");
        return cleaned.length() > 64 ? cleaned.substring(0, 64) : cleaned;
    }
}
