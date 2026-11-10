package com.wandermap.wandermap.domain.preference;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/trips/{tripId}/preferences")
@RequiredArgsConstructor
public class PreferenceController {

    private final PreferenceService preferenceService;

    @PostMapping
    public ResponseEntity<PreferenceResponse> submitPreference(
            @PathVariable Long tripId,
            @RequestBody PreferenceSubmitRequest request,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId) {
        if (request.getUserId() == null && headerUserId != null) {
            request.setUserId(headerUserId);
        }
        PreferenceResponse response = preferenceService.submitPreference(tripId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<PreferenceResponse> getMyPreference(
            @PathVariable Long tripId,
            @RequestParam(required = false) Long userId,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId) {
        Long resolvedUserId = userId != null ? userId : headerUserId;
        PreferenceResponse response = preferenceService.getMyPreference(tripId, resolvedUserId);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<PreferenceResponse>> getTripPreferences(
            @PathVariable Long tripId) {
        List<PreferenceResponse> responses = preferenceService.getTripPreferences(tripId);
        return ResponseEntity.ok(responses);
    }
}
