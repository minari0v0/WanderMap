package com.wandermap.wandermap.domain.presence;

import com.wandermap.wandermap.global.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/trips/{tripId}/presence")
@RequiredArgsConstructor
public class PresenceController {

    private final PresenceService presenceService;

    public record PresenceRequest(String sessionId) {
    }

    @GetMapping
    public ResponseEntity<TripPresenceResponse> getPresence(@PathVariable Long tripId) {
        return ResponseEntity.ok(presenceService.getPresence(tripId));
    }

    @PostMapping("/heartbeat")
    public ResponseEntity<TripPresenceResponse> heartbeat(
            @PathVariable Long tripId,
            @RequestParam(required = false) String sessionId,
            @RequestBody(required = false) PresenceRequest body) {
        String resolvedSessionId = (body != null && body.sessionId() != null && !body.sessionId().isBlank())
                ? body.sessionId()
                : sessionId;
        return ResponseEntity.ok(
                presenceService.heartbeat(tripId, SecurityUtils.getCurrentUserId(), resolvedSessionId));
    }

    @PostMapping("/leave")
    public ResponseEntity<Void> leavePost(
            @PathVariable Long tripId,
            @RequestParam(required = false) String sessionId,
            @RequestBody(required = false) PresenceRequest body) {
        String resolvedSessionId = (body != null && body.sessionId() != null && !body.sessionId().isBlank())
                ? body.sessionId()
                : sessionId;
        presenceService.leave(tripId, SecurityUtils.getCurrentUserId(), resolvedSessionId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> leaveDelete(
            @PathVariable Long tripId,
            @RequestParam(required = false) String sessionId) {
        presenceService.leave(tripId, SecurityUtils.getCurrentUserId(), sessionId);
        return ResponseEntity.noContent().build();
    }
}
