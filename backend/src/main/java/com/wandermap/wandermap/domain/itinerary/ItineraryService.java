package com.wandermap.wandermap.domain.itinerary;

import com.wandermap.wandermap.domain.auth.User;
import com.wandermap.wandermap.domain.auth.UserRepository;
import com.wandermap.wandermap.domain.trip.Trip;
import com.wandermap.wandermap.domain.trip.TripMemberRepository;
import com.wandermap.wandermap.domain.trip.TripRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ItineraryService {

    private final TripRepository tripRepository;
    private final TripMemberRepository tripMemberRepository;
    private final UserRepository userRepository;
    private final PlaceRepository placeRepository;
    private final ItineraryDayRepository itineraryDayRepository;
    private final ItineraryPlaceRepository itineraryPlaceRepository;
    private final PlaceVoteRepository placeVoteRepository;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    private static final Comparator<ItineraryPlace> PLACE_TIME_COMPARATOR = (a, b) -> {
        LocalTime t1 = a.getExpectedVisitTime();
        LocalTime t2 = b.getExpectedVisitTime();
        if (t1 != null && t2 != null) {
            int cmp = t1.compareTo(t2);
            if (cmp != 0) return cmp;
        } else if (t1 != null) {
            return -1;
        } else if (t2 != null) {
            return 1;
        }
        int orderCmp = Integer.compare(
                a.getVisitOrder() != null ? a.getVisitOrder() : 0,
                b.getVisitOrder() != null ? b.getVisitOrder() : 0
        );
        if (orderCmp != 0) return orderCmp;
        Long id1 = a.getId();
        Long id2 = b.getId();
        if (id1 != null && id2 != null) return id1.compareTo(id2);
        return 0;
    };

    @Transactional
    public TripItineraryResponse getTripItinerary(Long tripId, Long userId) {
        Trip trip = getTrip(tripId);
        List<ItineraryDay> days = ensureItineraryDays(trip);
        return buildItineraryResponse(trip, days, userId);
    }

    @Transactional
    public List<ItineraryDay> ensureItineraryDays(Trip trip) {
        List<ItineraryDay> existing = itineraryDayRepository.findByTripIdOrderByDayNumberAsc(trip.getId());
        LocalDate start = trip.getStartDate() != null ? trip.getStartDate() : LocalDate.now();
        LocalDate end = trip.getEndDate() != null ? trip.getEndDate() : start;

        long rawDays = ChronoUnit.DAYS.between(start, end) + 1;
        int totalDays = (int) Math.max(1, Math.min(30, rawDays));

        Map<Integer, ItineraryDay> existingByNumber = existing.stream()
                .collect(Collectors.toMap(ItineraryDay::getDayNumber, d -> d, (a, b) -> a));

        boolean createdAny = false;
        for (int i = 1; i <= totalDays; i++) {
            if (!existingByNumber.containsKey(i)) {
                ItineraryDay newDay = ItineraryDay.builder()
                        .trip(trip)
                        .dayNumber(i)
                        .date(start.plusDays(i - 1))
                        .memo("")
                        .build();
                itineraryDayRepository.save(newDay);
                createdAny = true;
            }
        }

        if (createdAny) {
            return itineraryDayRepository.findByTripIdOrderByDayNumberAsc(trip.getId());
        }
        return existing;
    }

    @Transactional
    public TripItineraryResponse updateDayMemo(Long tripId, int dayNumber, String memo, Long userId) {
        requireAuthenticatedUser(userId);
        Trip trip = getTrip(tripId);
        List<ItineraryDay> days = ensureItineraryDays(trip);
        ItineraryDay targetDay = days.stream()
                .filter(d -> d.getDayNumber() == dayNumber)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 일자입니다: Day " + dayNumber));

        targetDay.updateMemo(memo != null ? memo : "");
        return buildItineraryResponse(trip, days, userId);
    }

    @Transactional
    public TripItineraryResponse addPlace(Long tripId, AddPlaceRequest req) {
        User user = requireAuthenticatedUser(req.getUserId());
        Trip trip = getTrip(tripId);
        List<ItineraryDay> days = ensureItineraryDays(trip);
        int targetDayNumber = req.getDayNumber() != null && req.getDayNumber() >= 1 ? req.getDayNumber() : 1;

        ItineraryDay targetDay = days.stream()
                .filter(d -> d.getDayNumber() == targetDayNumber)
                .findFirst()
                .orElseGet(() -> days.get(0));

        Place place = resolveOrCreatePlace(
                req.getGooglePlaceId(),
                req.getName(),
                req.getCategory(),
                req.getAddress(),
                req.getLatitude(),
                req.getLongitude()
        );

        List<ItineraryPlace> currentDayPlaces = itineraryPlaceRepository.findByDayIdOrderByVisitOrderAsc(targetDay.getId());
        int nextOrder = currentDayPlaces.size() + 1;

        ItineraryPlace itineraryPlace = ItineraryPlace.builder()
                .day(targetDay)
                .place(place)
                .visitOrder(nextOrder)
                .expectedVisitTime(parseTime(req.getExpectedVisitTime(), LocalTime.of(Math.min(22, 9 + nextOrder * 2), 0)))
                .durationMinutes(req.getDurationMinutes() != null ? req.getDurationMinutes() : 60)
                .travelMinutesFromPrev(nextOrder > 1 ? 20 : 0)
                .memo(req.getMemo() != null ? req.getMemo() : "")
                .rating(req.getRating())
                .review(req.getReview() != null ? req.getReview() : "")
                .photos(req.getPhotos() != null ? req.getPhotos() : Collections.emptyList())
                .status("VOTING")
                .build();

        ItineraryPlace saved = itineraryPlaceRepository.save(itineraryPlace);
        sortAndReindexDayPlaces(targetDay.getId());

        PlaceVote initialVote = PlaceVote.builder()
                .itineraryPlace(saved)
                .user(user)
                .voteType("UP")
                .build();
        placeVoteRepository.save(initialVote);
        recalculatePlaceStatus(trip, saved);

        return buildItineraryResponse(trip, days, user.getId());
    }

    @Transactional
    public TripItineraryResponse addPlacesBatch(Long tripId, List<AddPlaceRequest> requests, boolean replaceAll, Long userId) {
        requireAuthenticatedUser(userId);
        Trip trip = getTrip(tripId);
        List<ItineraryDay> days = ensureItineraryDays(trip);

        if (replaceAll && !days.isEmpty()) {
            List<Long> dayIds = days.stream().map(ItineraryDay::getId).toList();
            List<ItineraryPlace> oldPlaces = itineraryPlaceRepository.findByDayIdInOrderByVisitOrderAsc(dayIds);
            if (!oldPlaces.isEmpty()) {
                List<Long> oldPlaceIds = oldPlaces.stream().map(ItineraryPlace::getId).toList();
                placeVoteRepository.deleteByItineraryPlaceIdIn(oldPlaceIds);
                itineraryPlaceRepository.deleteAll(oldPlaces);
            }
        }

        if (requests != null) {
            for (AddPlaceRequest req : requests) {
                if (req.getUserId() == null) {
                    req.setUserId(userId);
                }
                addPlaceInternal(trip, days, req);
            }
        }

        for (ItineraryDay day : days) {
            sortAndReindexDayPlaces(day.getId());
        }

        return buildItineraryResponse(trip, days, userId);
    }

    @Transactional
    public TripItineraryResponse updatePlaceDiary(Long tripId, Long itineraryPlaceId, UpdatePlaceDiaryRequest req, Long userId) {
        requireAuthenticatedUser(userId);
        Trip trip = getTrip(tripId);
        ItineraryPlace item = itineraryPlaceRepository.findById(itineraryPlaceId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 일정 장소입니다. ID: " + itineraryPlaceId));

        if (item.getPlace() != null) {
            item.getPlace().updateInfo(req.getName(), req.getCategory(), req.getAddress());
        }

        LocalTime parsedTime = req.getExpectedVisitTime() != null
                ? parseTime(req.getExpectedVisitTime(), item.getExpectedVisitTime())
                : null;

        item.updateDetails(
                parsedTime,
                req.getDurationMinutes(),
                req.getMemo(),
                req.getRating(),
                req.getReview(),
                req.getPhotos()
        );

        if (item.getDay() != null) {
            sortAndReindexDayPlaces(item.getDay().getId());
        }

        List<ItineraryDay> days = ensureItineraryDays(trip);
        return buildItineraryResponse(trip, days, userId);
    }

    @Transactional
    public TripItineraryResponse deletePlace(Long tripId, Long itineraryPlaceId, Long userId) {
        requireAuthenticatedUser(userId);
        Trip trip = getTrip(tripId);
        ItineraryPlace item = itineraryPlaceRepository.findById(itineraryPlaceId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 일정 장소입니다. ID: " + itineraryPlaceId));

        Long dayId = item.getDay().getId();
        placeVoteRepository.deleteByItineraryPlaceId(itineraryPlaceId);
        itineraryPlaceRepository.delete(item);

        // 남은 장소를 방문 예정 시간 오름차순으로 재정렬 (1, 2, 3...)
        sortAndReindexDayPlaces(dayId);

        List<ItineraryDay> days = ensureItineraryDays(trip);
        return buildItineraryResponse(trip, days, userId);
    }

    @Transactional
    public TripItineraryResponse reorderDayPlaces(Long tripId, int dayNumber, List<Long> orderedPlaceIds, Long userId) {
        requireAuthenticatedUser(userId);
        Trip trip = getTrip(tripId);
        List<ItineraryDay> days = ensureItineraryDays(trip);
        ItineraryDay targetDay = days.stream()
                .filter(d -> d.getDayNumber() == dayNumber)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 일자입니다: Day " + dayNumber));

        List<ItineraryPlace> dayPlaces = itineraryPlaceRepository.findByDayIdOrderByVisitOrderAsc(targetDay.getId());
        Map<Long, ItineraryPlace> byId = dayPlaces.stream()
                .collect(Collectors.toMap(ItineraryPlace::getId, p -> p));

        int order = 1;
        if (orderedPlaceIds != null) {
            for (Long pid : orderedPlaceIds) {
                ItineraryPlace p = byId.remove(pid);
                if (p != null) {
                    p.updateVisitOrder(order++);
                }
            }
        }
        for (ItineraryPlace leftover : byId.values()) {
            leftover.updateVisitOrder(order++);
        }

        return buildItineraryResponse(trip, days, userId);
    }

    @Transactional
    public TripItineraryResponse votePlace(Long tripId, Long itineraryPlaceId, Long userId, String voteType) {
        User user = requireAuthenticatedUser(userId);
        Trip trip = getTrip(tripId);
        ItineraryPlace item = itineraryPlaceRepository.findById(itineraryPlaceId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 일정 장소입니다."));

        String normalizedVote = "DOWN".equalsIgnoreCase(voteType) ? "DOWN" : "UP";
        Optional<PlaceVote> existingOpt = placeVoteRepository.findByItineraryPlaceIdAndUserId(itineraryPlaceId, userId);

        if (existingOpt.isPresent()) {
            PlaceVote existing = existingOpt.get();
            if (existing.getVoteType().equalsIgnoreCase(normalizedVote)) {
                placeVoteRepository.delete(existing);
            } else {
                existing.updateVoteType(normalizedVote);
            }
        } else {
            PlaceVote vote = PlaceVote.builder()
                    .itineraryPlace(item)
                    .user(user)
                    .voteType(normalizedVote)
                    .build();
            placeVoteRepository.save(vote);
        }

        recalculatePlaceStatus(trip, item);
        List<ItineraryDay> days = ensureItineraryDays(trip);
        return buildItineraryResponse(trip, days, userId);
    }

    private void addPlaceInternal(Trip trip, List<ItineraryDay> days, AddPlaceRequest req) {
        int targetDayNumber = req.getDayNumber() != null && req.getDayNumber() >= 1 ? req.getDayNumber() : 1;
        ItineraryDay targetDay = days.stream()
                .filter(d -> d.getDayNumber() == targetDayNumber)
                .findFirst()
                .orElseGet(() -> days.get(0));

        Place place = resolveOrCreatePlace(
                req.getGooglePlaceId(),
                req.getName(),
                req.getCategory(),
                req.getAddress(),
                req.getLatitude(),
                req.getLongitude()
        );

        List<ItineraryPlace> currentDayPlaces = itineraryPlaceRepository.findByDayIdOrderByVisitOrderAsc(targetDay.getId());
        int nextOrder = currentDayPlaces.size() + 1;

        ItineraryPlace itineraryPlace = ItineraryPlace.builder()
                .day(targetDay)
                .place(place)
                .visitOrder(nextOrder)
                .expectedVisitTime(parseTime(req.getExpectedVisitTime(), LocalTime.of(Math.min(22, 9 + nextOrder * 2), 0)))
                .durationMinutes(req.getDurationMinutes() != null ? req.getDurationMinutes() : 60)
                .travelMinutesFromPrev(nextOrder > 1 ? 20 : 0)
                .memo(req.getMemo() != null ? req.getMemo() : "")
                .rating(req.getRating())
                .review(req.getReview() != null ? req.getReview() : "")
                .photos(req.getPhotos() != null ? req.getPhotos() : Collections.emptyList())
                .status("VOTING")
                .build();

        ItineraryPlace saved = itineraryPlaceRepository.save(itineraryPlace);
        if (req.getUserId() != null) {
            userRepository.findById(req.getUserId()).ifPresent(user -> {
                PlaceVote initialVote = PlaceVote.builder()
                        .itineraryPlace(saved)
                        .user(user)
                        .voteType("UP")
                        .build();
                placeVoteRepository.save(initialVote);
                recalculatePlaceStatus(trip, saved);
            });
        }
    }

    private void recalculatePlaceStatus(Trip trip, ItineraryPlace item) {
        List<PlaceVote> votes = placeVoteRepository.findByItineraryPlaceId(item.getId());
        long upCount = votes.stream().filter(v -> "UP".equalsIgnoreCase(v.getVoteType())).count();
        int memberCount = Math.max(1, tripMemberRepository.findByTrip(trip).size());
        int requiredVotes = memberCount <= 1 ? 1 : (int) Math.ceil(memberCount * (2.0 / 3.0));

        if (upCount >= requiredVotes) {
            item.updateStatus("CONFIRMED");
        } else {
            item.updateStatus("VOTING");
        }
    }

    private Place resolveOrCreatePlace(
            String googlePlaceId,
            String name,
            String category,
            String address,
            BigDecimal latitude,
            BigDecimal longitude
    ) {
        if (googlePlaceId != null && !googlePlaceId.isBlank()) {
            Optional<Place> existing = placeRepository.findByGooglePlaceId(googlePlaceId.trim());
            if (existing.isPresent()) {
                return existing.get();
            }
        }

        Place place = Place.builder()
                .googlePlaceId(googlePlaceId != null && !googlePlaceId.isBlank() ? googlePlaceId.trim() : null)
                .name(name != null && !name.isBlank() ? name.trim() : "추천 장소")
                .category(category != null && !category.isBlank() ? category.trim() : "관광 · 명소")
                .address(address != null && !address.isBlank() ? address.trim() : "")
                .latitude(latitude)
                .longitude(longitude)
                .build();
        return placeRepository.save(place);
    }

    private TripItineraryResponse buildItineraryResponse(Trip trip, List<ItineraryDay> days, Long userId) {
        List<Long> dayIds = days.stream().map(ItineraryDay::getId).toList();
        List<ItineraryPlace> allPlaces = dayIds.isEmpty()
                ? Collections.emptyList()
                : itineraryPlaceRepository.findByDayIdInOrderByVisitOrderAsc(dayIds);

        List<Long> itineraryPlaceIds = allPlaces.stream().map(ItineraryPlace::getId).toList();
        List<PlaceVote> allVotes = itineraryPlaceIds.isEmpty()
                ? Collections.emptyList()
                : placeVoteRepository.findByItineraryPlaceIdIn(itineraryPlaceIds);

        Map<Long, List<PlaceVote>> votesByPlaceId = allVotes.stream()
                .collect(Collectors.groupingBy(v -> v.getItineraryPlace().getId()));

        Map<Long, List<ItineraryPlace>> placesByDayId = allPlaces.stream()
                .collect(Collectors.groupingBy(p -> p.getDay().getId()));

        List<TripItineraryResponse.DayItem> dayItems = new ArrayList<>();
        for (ItineraryDay day : days) {
            List<ItineraryPlace> dayPlaces = new ArrayList<>(
                    placesByDayId.getOrDefault(day.getId(), Collections.emptyList())
            );
            dayPlaces.sort(PLACE_TIME_COMPARATOR);

            List<TripItineraryResponse.PlaceItem> placeItems = new ArrayList<>();
            int idxOrder = 1;
            for (ItineraryPlace ip : dayPlaces) {
                Place p = ip.getPlace();
                List<PlaceVote> votes = votesByPlaceId.getOrDefault(ip.getId(), Collections.emptyList());
                int up = (int) votes.stream().filter(v -> "UP".equalsIgnoreCase(v.getVoteType())).count();
                int down = (int) votes.stream().filter(v -> "DOWN".equalsIgnoreCase(v.getVoteType())).count();
                String myVote = userId == null ? null : votes.stream()
                        .filter(v -> v.getUser() != null && userId.equals(v.getUser().getId()))
                        .map(PlaceVote::getVoteType)
                        .findFirst()
                        .orElse(null);

                placeItems.add(TripItineraryResponse.PlaceItem.builder()
                        .id(ip.getId())
                        .placeId(p != null ? p.getId() : null)
                        .dayNumber(day.getDayNumber())
                        .visitOrder(idxOrder++)
                        .name(p != null ? p.getName() : "장소")
                        .category(p != null ? p.getCategory() : "관광 · 명소")
                        .address(p != null ? p.getAddress() : "")
                        .latitude(p != null ? p.getLatitude() : null)
                        .longitude(p != null ? p.getLongitude() : null)
                        .expectedVisitTime(ip.getExpectedVisitTime() != null ? ip.getExpectedVisitTime().format(TIME_FMT) : "14:00")
                        .durationMinutes(ip.getDurationMinutes() != null ? ip.getDurationMinutes() : 60)
                        .travelMinutesFromPrev(ip.getTravelMinutesFromPrev() != null ? ip.getTravelMinutesFromPrev() : 0)
                        .memo(ip.getMemo() != null ? ip.getMemo() : "")
                        .rating(ip.getRating())
                        .review(ip.getReview() != null ? ip.getReview() : "")
                        .photos(ip.getPhotos() != null ? ip.getPhotos() : Collections.emptyList())
                        .status(ip.getStatus() != null ? ip.getStatus() : "VOTING")
                        .votesUp(up)
                        .votesDown(down)
                        .myVote(myVote)
                        .build());
            }

            dayItems.add(TripItineraryResponse.DayItem.builder()
                    .id(day.getId())
                    .dayNumber(day.getDayNumber())
                    .date(day.getDate())
                    .memo(day.getMemo() != null ? day.getMemo() : "")
                    .places(placeItems)
                    .build());
        }

        int memberCount = Math.max(1, tripMemberRepository.findByTrip(trip).size());

        return TripItineraryResponse.builder()
                .tripId(trip.getId())
                .totalDays(days.size())
                .memberCount(memberCount)
                .days(dayItems)
                .build();
    }

    private void sortAndReindexDayPlaces(Long dayId) {
        List<ItineraryPlace> dayPlaces = new ArrayList<>(
                itineraryPlaceRepository.findByDayIdOrderByVisitOrderAsc(dayId)
        );
        dayPlaces.sort(PLACE_TIME_COMPARATOR);
        for (int i = 0; i < dayPlaces.size(); i++) {
            dayPlaces.get(i).updateVisitOrder(i + 1);
        }
    }

    private Trip getTrip(Long tripId) {
        return tripRepository.findById(tripId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 여행 방입니다. ID: " + tripId));
    }

    private User requireAuthenticatedUser(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("로그인이 필요한 기능입니다.");
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("로그인이 필요한 기능입니다."));
    }

    private LocalTime parseTime(String timeStr, LocalTime fallback) {
        if (timeStr == null || timeStr.isBlank()) {
            return fallback;
        }
        try {
            String trimmed = timeStr.trim();
            if (trimmed.length() == 5) {
                return LocalTime.parse(trimmed, TIME_FMT);
            }
            return LocalTime.parse(trimmed);
        } catch (Exception e) {
            return fallback;
        }
    }
}

