package com.wandermap.wandermap.domain.itinerary;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/trips/{tripId}/itinerary")
@RequiredArgsConstructor
public class ItineraryController {

    private final ItineraryService itineraryService;

    @GetMapping
    public ResponseEntity<TripItineraryResponse> getItinerary(
            @PathVariable Long tripId,
            @RequestParam(required = false) Long userId,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId
    ) {
        Long resolvedUserId = userId != null ? userId : headerUserId;
        return ResponseEntity.ok(itineraryService.getTripItinerary(tripId, resolvedUserId));
    }

    @PutMapping("/days/{dayNumber}/memo")
    public ResponseEntity<TripItineraryResponse> updateDayMemo(
            @PathVariable Long tripId,
            @PathVariable int dayNumber,
            @RequestBody Map<String, Object> body,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId
    ) {
        String memo = body.get("memo") != null ? String.valueOf(body.get("memo")) : "";
        Long bodyUserId = body.get("userId") != null ? Long.valueOf(String.valueOf(body.get("userId"))) : null;
        Long resolvedUserId = bodyUserId != null ? bodyUserId : headerUserId;
        return ResponseEntity.ok(itineraryService.updateDayMemo(tripId, dayNumber, memo, resolvedUserId));
    }

    @PostMapping("/places")
    public ResponseEntity<TripItineraryResponse> addPlace(
            @PathVariable Long tripId,
            @RequestBody AddPlaceRequest request,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId
    ) {
        if (request.getUserId() == null && headerUserId != null) {
            request.setUserId(headerUserId);
        }
        return ResponseEntity.ok(itineraryService.addPlace(tripId, request));
    }

    @PostMapping("/places/batch")
    public ResponseEntity<TripItineraryResponse> addPlacesBatch(
            @PathVariable Long tripId,
            @RequestBody BatchAddPlacePayload payload,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId
    ) {
        Long resolvedUserId = payload.getUserId() != null ? payload.getUserId() : headerUserId;
        return ResponseEntity.ok(
                itineraryService.addPlacesBatch(
                        tripId,
                        payload.getPlaces(),
                        payload.isReplaceAll(),
                        resolvedUserId
                )
        );
    }

    @PutMapping("/places/{itineraryPlaceId}")
    public ResponseEntity<TripItineraryResponse> updatePlaceDiary(
            @PathVariable Long tripId,
            @PathVariable Long itineraryPlaceId,
            @RequestParam(required = false) Long userId,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId,
            @RequestBody UpdatePlaceDiaryRequest request
    ) {
        Long resolvedUserId = userId != null ? userId : headerUserId;
        return ResponseEntity.ok(itineraryService.updatePlaceDiary(tripId, itineraryPlaceId, request, resolvedUserId));
    }

    @DeleteMapping("/places/{itineraryPlaceId}")
    public ResponseEntity<TripItineraryResponse> deletePlace(
            @PathVariable Long tripId,
            @PathVariable Long itineraryPlaceId,
            @RequestParam(required = false) Long userId,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId
    ) {
        Long resolvedUserId = userId != null ? userId : headerUserId;
        return ResponseEntity.ok(itineraryService.deletePlace(tripId, itineraryPlaceId, resolvedUserId));
    }

    @PutMapping("/days/{dayNumber}/reorder")
    public ResponseEntity<TripItineraryResponse> reorderDayPlaces(
            @PathVariable Long tripId,
            @PathVariable int dayNumber,
            @RequestBody ReorderPayload payload,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId
    ) {
        Long resolvedUserId = payload.getUserId() != null ? payload.getUserId() : headerUserId;
        return ResponseEntity.ok(
                itineraryService.reorderDayPlaces(tripId, dayNumber, payload.getPlaceIds(), resolvedUserId)
        );
    }

    @PostMapping("/places/{itineraryPlaceId}/vote")
    public ResponseEntity<TripItineraryResponse> votePlace(
            @PathVariable Long tripId,
            @PathVariable Long itineraryPlaceId,
            @RequestBody Map<String, Object> body,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId
    ) {
        Long bodyUserId = body.get("userId") != null ? Long.valueOf(String.valueOf(body.get("userId"))) : null;
        Long resolvedUserId = bodyUserId != null ? bodyUserId : headerUserId;
        String voteType = body.get("voteType") != null ? String.valueOf(body.get("voteType")) : "UP";
        return ResponseEntity.ok(itineraryService.votePlace(tripId, itineraryPlaceId, resolvedUserId, voteType));
    }

    @Data
    public static class BatchAddPlacePayload {
        private List<AddPlaceRequest> places;
        private boolean replaceAll;
        private Long userId;
    }

    @Data
    public static class ReorderPayload {
        private List<Long> placeIds;
        private Long userId;
    }
}

