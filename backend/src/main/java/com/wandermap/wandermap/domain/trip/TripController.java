package com.wandermap.wandermap.domain.trip;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/trips")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // 임시 CORS 허용
public class TripController {

    private final TripService tripService;

    @PostMapping
    public ResponseEntity<TripResponse> createTrip(@RequestBody TripCreateRequest request) {
        TripResponse response = tripService.createTrip(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/join/{inviteCode}")
    public ResponseEntity<TripResponse> joinTrip(
            @PathVariable String inviteCode,
            @RequestParam(required = false) Long userId) {
        TripResponse response = tripService.joinTrip(inviteCode, userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TripResponse> getTrip(@PathVariable Long id) {
        TripResponse response = tripService.getTrip(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/invite/{inviteCode}")
    public ResponseEntity<TripResponse> getTripByInviteCode(@PathVariable String inviteCode) {
        TripResponse response = tripService.getTripByInviteCode(inviteCode);
        return ResponseEntity.ok(response);
    }
}
