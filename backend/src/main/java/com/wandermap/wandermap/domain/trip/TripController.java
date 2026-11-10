package com.wandermap.wandermap.domain.trip;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/trips")
@RequiredArgsConstructor
public class TripController {

    private final TripService tripService;

    @PostMapping
    public ResponseEntity<TripResponse> createTrip(
            @RequestBody TripCreateRequest request,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId) {
        if (request.getUserId() == null && headerUserId != null) {
            request.setUserId(headerUserId);
        }
        TripResponse response = tripService.createTrip(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/join/{inviteCode}")
    public ResponseEntity<TripResponse> joinTrip(
            @PathVariable String inviteCode,
            @RequestParam(required = false) Long userId,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId) {
        Long resolvedUserId = userId != null ? userId : headerUserId;
        TripResponse response = tripService.joinTrip(inviteCode, resolvedUserId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{idOrCode}")
    public ResponseEntity<TripResponse> getTrip(@PathVariable String idOrCode) {
        if (idOrCode != null && idOrCode.matches("^\\d+$")) {
            return ResponseEntity.ok(tripService.getTrip(Long.parseLong(idOrCode)));
        }
        return ResponseEntity.ok(tripService.getTripByInviteCode(idOrCode));
    }

    @GetMapping("/invite/{inviteCode}")
    public ResponseEntity<TripResponse> getTripByInviteCode(@PathVariable String inviteCode) {
        TripResponse response = tripService.getTripByInviteCode(inviteCode);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/my")
    public ResponseEntity<java.util.List<TripResponse>> getMyTrips(
            @RequestParam(required = false) Long userId,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId) {
        Long resolvedUserId = userId != null ? userId : headerUserId;
        java.util.List<TripResponse> response = tripService.getMyTrips(resolvedUserId);
        return ResponseEntity.ok(response);
    }
}
