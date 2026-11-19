package com.wandermap.wandermap.domain.itinerary;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisOperations;
import org.springframework.data.redis.core.SessionCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class PlaceVoteStore {

    private static final String VOTES_KEY_PREFIX = "trip:votes:";
    private static final String MEMBER_COUNT_PREFIX = "trip:memberCount:";
    private static final String INIT_MARKER = "_init";
    private static final Duration VOTES_TTL = Duration.ofDays(7);
    private static final Duration MEMBER_COUNT_TTL = Duration.ofMinutes(10);

    private final StringRedisTemplate redisTemplate;
    private final ConcurrentHashMap<Long, ConcurrentHashMap<Long, String>> fallbackVotes = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, MemberCountEntry> fallbackMemberCounts = new ConcurrentHashMap<>();

    private record MemberCountEntry(int count, Instant expiresAt) {}

    public record VoteToggleResult(String myVote, int votesUp, int votesDown) {}

    @Autowired
    public PlaceVoteStore(ObjectProvider<StringRedisTemplate> redisTemplateProvider) {
        this.redisTemplate = redisTemplateProvider != null ? redisTemplateProvider.getIfAvailable() : null;
    }

    public PlaceVoteStore(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public Map<Long, String> getVotesIfInitialized(Long placeId) {
        if (placeId == null) {
            return null;
        }
        String key = buildVotesKey(placeId);

        if (redisTemplate != null) {
            try {
                Map<Object, Object> entries = redisTemplate.opsForHash().entries(key);
                if (entries != null && !entries.isEmpty()) {
                    return decodeVoteMap(entries);
                }
            } catch (Exception e) {
                log.warn("Redis unavailable during getVotesIfInitialized; checking fallback. key={}, cause={}", key, e.getMessage());
            }
        }

        ConcurrentHashMap<Long, String> fb = fallbackVotes.get(placeId);
        return fb != null ? new LinkedHashMap<>(fb) : null;
    }

    public Map<Long, Map<Long, String>> getVotesBatchIfInitialized(List<Long> placeIds) {
        if (placeIds == null || placeIds.isEmpty()) {
            return Collections.emptyMap();
        }
        List<Long> uniqueIds = placeIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (uniqueIds.isEmpty()) {
            return Collections.emptyMap();
        }

        Map<Long, Map<Long, String>> result = new LinkedHashMap<>();

        if (redisTemplate != null) {
            try {
                List<Object> rawResults = redisTemplate.executePipelined(new SessionCallback<Object>() {
                    @Override
                    @SuppressWarnings("unchecked")
                    public <K, V> Object execute(RedisOperations<K, V> operations) {
                        RedisOperations<String, String> ops =
                                (RedisOperations<String, String>) (RedisOperations<?, ?>) operations;
                        for (Long placeId : uniqueIds) {
                            ops.opsForHash().entries(buildVotesKey(placeId));
                        }
                        return null;
                    }
                });

                if (rawResults != null) {
                    int limit = Math.min(uniqueIds.size(), rawResults.size());
                    for (int i = 0; i < limit; i++) {
                        Object raw = rawResults.get(i);
                        if (raw instanceof Map<?, ?> entries && !entries.isEmpty()) {
                            result.put(uniqueIds.get(i), decodeVoteMap(entries));
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Redis unavailable during getVotesBatchIfInitialized; checking fallback. cause={}", e.getMessage());
            }
        }

        for (Long placeId : uniqueIds) {
            if (!result.containsKey(placeId)) {
                ConcurrentHashMap<Long, String> fb = fallbackVotes.get(placeId);
                if (fb != null) {
                    result.put(placeId, new LinkedHashMap<>(fb));
                }
            }
        }

        return result;
    }

    public void warmVotes(Long placeId, Map<Long, String> votesByUserId) {
        if (placeId == null) {
            return;
        }
        String key = buildVotesKey(placeId);
        Map<String, String> fields = toHashFields(votesByUserId);

        if (redisTemplate != null) {
            try {
                redisTemplate.delete(key);
                redisTemplate.opsForHash().putAll(key, fields);
                redisTemplate.expire(key, VOTES_TTL);
                fallbackVotes.remove(placeId);
                return;
            } catch (Exception e) {
                log.warn("Redis unavailable during warmVotes; using fallback. key={}, cause={}", key, e.getMessage());
            }
        }

        putFallbackVotes(placeId, votesByUserId);
    }

    public void warmVotesBatch(Map<Long, Map<Long, String>> votesByPlaceId) {
        if (votesByPlaceId == null || votesByPlaceId.isEmpty()) {
            return;
        }

        if (redisTemplate != null) {
            try {
                redisTemplate.executePipelined(new SessionCallback<Object>() {
                    @Override
                    @SuppressWarnings("unchecked")
                    public <K, V> Object execute(RedisOperations<K, V> operations) {
                        RedisOperations<String, String> ops =
                                (RedisOperations<String, String>) (RedisOperations<?, ?>) operations;
                        for (Map.Entry<Long, Map<Long, String>> entry : votesByPlaceId.entrySet()) {
                            Long placeId = entry.getKey();
                            if (placeId == null) continue;
                            String key = buildVotesKey(placeId);
                            Map<String, String> fields = toHashFields(entry.getValue());
                            ops.delete(key);
                            ops.opsForHash().putAll(key, fields);
                            ops.expire(key, VOTES_TTL);
                        }
                        return null;
                    }
                });
                for (Long placeId : votesByPlaceId.keySet()) {
                    if (placeId != null) {
                        fallbackVotes.remove(placeId);
                    }
                }
                return;
            } catch (Exception e) {
                log.warn("Redis unavailable during warmVotesBatch; using fallback. cause={}", e.getMessage());
            }
        }

        for (Map.Entry<Long, Map<Long, String>> entry : votesByPlaceId.entrySet()) {
            if (entry.getKey() != null) {
                putFallbackVotes(entry.getKey(), entry.getValue());
            }
        }
    }

    public VoteToggleResult toggleVote(Long placeId, Long userId, String normalizedVote) {
        if (placeId == null || userId == null) {
            return new VoteToggleResult(null, 0, 0);
        }
        String voteValue = "DOWN".equalsIgnoreCase(normalizedVote) ? "DOWN" : "UP";
        String key = buildVotesKey(placeId);
        String userField = String.valueOf(userId);

        if (redisTemplate != null) {
            try {
                Object existingObj = redisTemplate.opsForHash().get(key, userField);
                String existingVote = existingObj != null ? String.valueOf(existingObj) : null;

                String nextVote;
                if (voteValue.equalsIgnoreCase(existingVote)) {
                    redisTemplate.opsForHash().delete(key, userField);
                    nextVote = null;
                } else {
                    redisTemplate.opsForHash().put(key, userField, voteValue);
                    nextVote = voteValue;
                }

                Map<Object, Object> entries = redisTemplate.opsForHash().entries(key);
                if (entries == null || !entries.containsKey(INIT_MARKER)) {
                    redisTemplate.opsForHash().put(key, INIT_MARKER, "1");
                }
                redisTemplate.expire(key, VOTES_TTL);
                fallbackVotes.remove(placeId);

                int up = 0;
                int down = 0;
                if (entries != null) {
                    for (Map.Entry<Object, Object> entry : entries.entrySet()) {
                        String field = String.valueOf(entry.getKey());
                        if (INIT_MARKER.equals(field)) continue;
                        String val = entry.getValue() != null ? String.valueOf(entry.getValue()) : "";
                        if ("UP".equalsIgnoreCase(val)) up++;
                        else if ("DOWN".equalsIgnoreCase(val)) down++;
                    }
                }
                return new VoteToggleResult(nextVote, up, down);
            } catch (Exception e) {
                log.warn("Redis unavailable during toggleVote; using fallback. key={}, cause={}", key, e.getMessage());
            }
        }

        ConcurrentHashMap<Long, String> fb = fallbackVotes.computeIfAbsent(placeId, k -> new ConcurrentHashMap<>());
        synchronized (fb) {
            String existingVote = fb.get(userId);
            String nextVote;
            if (voteValue.equalsIgnoreCase(existingVote)) {
                fb.remove(userId);
                nextVote = null;
            } else {
                fb.put(userId, voteValue);
                nextVote = voteValue;
            }
            int up = 0;
            int down = 0;
            for (String v : fb.values()) {
                if ("UP".equalsIgnoreCase(v)) up++;
                else if ("DOWN".equalsIgnoreCase(v)) down++;
            }
            return new VoteToggleResult(nextVote, up, down);
        }
    }

    public String getUserVote(Long placeId, Long userId) {
        if (placeId == null || userId == null) {
            return null;
        }
        String key = buildVotesKey(placeId);
        String userField = String.valueOf(userId);

        if (redisTemplate != null) {
            try {
                Object val = redisTemplate.opsForHash().get(key, userField);
                if (val != null) {
                    return String.valueOf(val);
                }
                Boolean initialized = redisTemplate.opsForHash().hasKey(key, INIT_MARKER);
                if (Boolean.TRUE.equals(initialized)) {
                    return null;
                }
            } catch (Exception e) {
                log.warn("Redis unavailable during getUserVote; checking fallback. key={}, cause={}", key, e.getMessage());
            }
        }

        ConcurrentHashMap<Long, String> fb = fallbackVotes.get(placeId);
        return fb != null ? fb.get(userId) : null;
    }

    public void setSingleVoteIfInitialized(Long placeId, Long userId, String voteType) {
        if (placeId == null || userId == null || voteType == null) {
            return;
        }
        String voteValue = "DOWN".equalsIgnoreCase(voteType) ? "DOWN" : "UP";
        String key = buildVotesKey(placeId);

        if (redisTemplate != null) {
            try {
                Boolean initialized = redisTemplate.opsForHash().hasKey(key, INIT_MARKER);
                if (Boolean.TRUE.equals(initialized)) {
                    redisTemplate.opsForHash().put(key, String.valueOf(userId), voteValue);
                    redisTemplate.expire(key, VOTES_TTL);
                }
                return;
            } catch (Exception e) {
                log.warn("Redis unavailable during setSingleVoteIfInitialized. key={}, cause={}", key, e.getMessage());
            }
        }

        ConcurrentHashMap<Long, String> fb = fallbackVotes.get(placeId);
        if (fb != null) {
            fb.put(userId, voteValue);
        }
    }

    public void evictPlace(Long placeId) {
        if (placeId == null) {
            return;
        }
        fallbackVotes.remove(placeId);
        if (redisTemplate != null) {
            String key = buildVotesKey(placeId);
            try {
                redisTemplate.delete(key);
            } catch (Exception e) {
                log.warn("Redis unavailable during evictPlace. key={}, cause={}", key, e.getMessage());
            }
        }
    }

    public void evictPlaces(Collection<Long> placeIds) {
        if (placeIds == null || placeIds.isEmpty()) {
            return;
        }
        List<String> keys = placeIds.stream()
                .filter(Objects::nonNull)
                .peek(fallbackVotes::remove)
                .map(PlaceVoteStore::buildVotesKey)
                .distinct()
                .toList();
        if (keys.isEmpty()) {
            return;
        }
        if (redisTemplate != null) {
            try {
                redisTemplate.delete(keys);
            } catch (Exception e) {
                log.warn("Redis unavailable during evictPlaces. count={}, cause={}", keys.size(), e.getMessage());
            }
        }
    }

    public Integer getCachedMemberCount(Long tripId) {
        if (tripId == null) {
            return null;
        }
        String key = buildMemberCountKey(tripId);
        if (redisTemplate != null) {
            try {
                String raw = redisTemplate.opsForValue().get(key);
                if (raw != null && !raw.isBlank()) {
                    return Integer.parseInt(raw.trim());
                }
            } catch (Exception e) {
                log.warn("Redis unavailable during getCachedMemberCount; checking fallback. key={}, cause={}", key, e.getMessage());
            }
        }

        MemberCountEntry entry = fallbackMemberCounts.get(tripId);
        if (entry != null) {
            if (entry.expiresAt().isAfter(Instant.now())) {
                return entry.count();
            }
            fallbackMemberCounts.remove(tripId, entry);
        }
        return null;
    }

    public void cacheMemberCount(Long tripId, int count) {
        if (tripId == null) {
            return;
        }
        int safeCount = Math.max(1, count);
        String key = buildMemberCountKey(tripId);
        if (redisTemplate != null) {
            try {
                redisTemplate.opsForValue().set(key, String.valueOf(safeCount), MEMBER_COUNT_TTL);
                fallbackMemberCounts.remove(tripId);
                return;
            } catch (Exception e) {
                log.warn("Redis unavailable during cacheMemberCount; using fallback. key={}, cause={}", key, e.getMessage());
            }
        }
        fallbackMemberCounts.put(tripId, new MemberCountEntry(safeCount, Instant.now().plus(MEMBER_COUNT_TTL)));
    }

    public void evictMemberCount(Long tripId) {
        if (tripId == null) {
            return;
        }
        fallbackMemberCounts.remove(tripId);
        if (redisTemplate != null) {
            String key = buildMemberCountKey(tripId);
            try {
                redisTemplate.delete(key);
            } catch (Exception e) {
                log.warn("Redis unavailable during evictMemberCount. key={}, cause={}", key, e.getMessage());
            }
        }
    }

    private void putFallbackVotes(Long placeId, Map<Long, String> votesByUserId) {
        if (fallbackVotes.size() > 1000) {
            fallbackVotes.clear();
        }
        ConcurrentHashMap<Long, String> map = new ConcurrentHashMap<>();
        if (votesByUserId != null) {
            for (Map.Entry<Long, String> entry : votesByUserId.entrySet()) {
                if (entry.getKey() != null && entry.getValue() != null) {
                    map.put(entry.getKey(), "DOWN".equalsIgnoreCase(entry.getValue()) ? "DOWN" : "UP");
                }
            }
        }
        fallbackVotes.put(placeId, map);
    }

    private static Map<String, String> toHashFields(Map<Long, String> votesByUserId) {
        Map<String, String> fields = new LinkedHashMap<>();
        fields.put(INIT_MARKER, "1");
        if (votesByUserId != null) {
            for (Map.Entry<Long, String> entry : votesByUserId.entrySet()) {
                if (entry.getKey() != null && entry.getValue() != null) {
                    fields.put(
                            String.valueOf(entry.getKey()),
                            "DOWN".equalsIgnoreCase(entry.getValue()) ? "DOWN" : "UP"
                    );
                }
            }
        }
        return fields;
    }

    private static Map<Long, String> decodeVoteMap(Map<?, ?> entries) {
        Map<Long, String> votes = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : entries.entrySet()) {
            String field = String.valueOf(entry.getKey());
            if (INIT_MARKER.equals(field)) continue;
            try {
                Long userId = Long.parseLong(field);
                String vote = entry.getValue() != null ? String.valueOf(entry.getValue()) : "";
                if ("UP".equalsIgnoreCase(vote) || "DOWN".equalsIgnoreCase(vote)) {
                    votes.put(userId, vote.toUpperCase());
                }
            } catch (NumberFormatException ignored) {
                // Ignore non-numeric hash fields
            }
        }
        return votes;
    }

    private static String buildVotesKey(Long placeId) {
        return VOTES_KEY_PREFIX + placeId;
    }

    private static String buildMemberCountKey(Long tripId) {
        return MEMBER_COUNT_PREFIX + tripId;
    }
}
