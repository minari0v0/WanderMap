package com.wandermap.wandermap.domain.itinerary;

import com.wandermap.wandermap.domain.auth.User;
import com.wandermap.wandermap.domain.auth.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.Map;
import java.util.Optional;

@Slf4j
@Component
public class PlaceVoteAsyncPersister {

    private static final int LOCK_STRIPE_COUNT = 64;

    private final PlaceVoteStore placeVoteStore;
    private final PlaceVoteRepository placeVoteRepository;
    private final ItineraryPlaceRepository itineraryPlaceRepository;
    private final UserRepository userRepository;
    private final TransactionTemplate transactionTemplate;
    private final Object[] lockStripes = new Object[LOCK_STRIPE_COUNT];

    public PlaceVoteAsyncPersister(
            PlaceVoteStore placeVoteStore,
            PlaceVoteRepository placeVoteRepository,
            ItineraryPlaceRepository itineraryPlaceRepository,
            UserRepository userRepository,
            PlatformTransactionManager transactionManager
    ) {
        this.placeVoteStore = placeVoteStore;
        this.placeVoteRepository = placeVoteRepository;
        this.itineraryPlaceRepository = itineraryPlaceRepository;
        this.userRepository = userRepository;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        for (int i = 0; i < LOCK_STRIPE_COUNT; i++) {
            this.lockStripes[i] = new Object();
        }
    }

    @Async
    public void syncVoteToDatabase(
            Long itineraryPlaceId,
            Long userId,
            int requiredVotes,
            String fallbackStatus
    ) {
        if (itineraryPlaceId == null || userId == null) {
            return;
        }
        Object stripeLock = lockStripes[Math.floorMod(itineraryPlaceId.hashCode(), LOCK_STRIPE_COUNT)];
        synchronized (stripeLock) {
            try {
                transactionTemplate.executeWithoutResult(status -> {
                    String latestVote = placeVoteStore.getUserVote(itineraryPlaceId, userId);

                    ItineraryPlace item = itineraryPlaceRepository.findById(itineraryPlaceId).orElse(null);
                    if (item == null) {
                        return;
                    }

                    Optional<PlaceVote> existingOpt =
                            placeVoteRepository.findByItineraryPlaceIdAndUserId(itineraryPlaceId, userId);

                    if (latestVote == null) {
                        existingOpt.ifPresent(placeVoteRepository::delete);
                    } else if (existingOpt.isPresent()) {
                        PlaceVote existing = existingOpt.get();
                        if (!latestVote.equalsIgnoreCase(existing.getVoteType())) {
                            existing.updateVoteType(latestVote);
                        }
                    } else {
                        User user = userRepository.findById(userId).orElse(null);
                        if (user != null) {
                            PlaceVote created = PlaceVote.builder()
                                    .itineraryPlace(item)
                                    .user(user)
                                    .voteType(latestVote)
                                    .build();
                            placeVoteRepository.save(created);
                        }
                    }

                    String authoritativeStatus = resolveAuthoritativeStatus(
                            itineraryPlaceId,
                            requiredVotes,
                            fallbackStatus
                    );
                    if (authoritativeStatus != null && !authoritativeStatus.equals(item.getStatus())) {
                        item.updateStatus(authoritativeStatus);
                    }
                });
            } catch (Exception e) {
                log.warn("Async place vote DB sync failed. placeId={}, userId={}, cause={}",
                        itineraryPlaceId, userId, e.getMessage());
            }
        }
    }

    private String resolveAuthoritativeStatus(Long itineraryPlaceId, int requiredVotes, String fallbackStatus) {
        Map<Long, String> currentVotes = placeVoteStore.getVotesIfInitialized(itineraryPlaceId);
        if (currentVotes == null) {
            return fallbackStatus;
        }
        long upCount = currentVotes.values().stream()
                .filter(v -> "UP".equalsIgnoreCase(v))
                .count();
        return upCount >= requiredVotes ? "CONFIRMED" : "VOTING";
    }
}
