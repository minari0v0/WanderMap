package com.wandermap.wandermap.domain.trip;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class TripInviteCacheStore {

    private static final String KEY_PREFIX = "trip:invite:";
    private static final Duration CACHE_TTL = Duration.ofHours(1);

    private final StringRedisTemplate redisTemplate;
    private final ConcurrentHashMap<String, CacheEntry> fallbackStore = new ConcurrentHashMap<>();

    private record CacheEntry(Long tripId, Instant expiresAt) {}

    @Autowired
    public TripInviteCacheStore(ObjectProvider<StringRedisTemplate> redisTemplateProvider) {
        this.redisTemplate = redisTemplateProvider != null ? redisTemplateProvider.getIfAvailable() : null;
    }

    public TripInviteCacheStore(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public Optional<Long> getTripId(String inviteCode) {
        if (inviteCode == null || inviteCode.isBlank()) {
            return Optional.empty();
        }
        String cleanCode = inviteCode.trim();
        String key = KEY_PREFIX + cleanCode;

        if (redisTemplate != null) {
            try {
                String raw = redisTemplate.opsForValue().get(key);
                if (raw != null && !raw.isBlank()) {
                    return Optional.of(Long.parseLong(raw.trim()));
                }
            } catch (Exception e) {
                log.warn("Redis unavailable during invite cache get; checking fallback. key={}, cause={}", key, e.getMessage());
            }
        }

        CacheEntry entry = fallbackStore.get(cleanCode);
        if (entry != null) {
            if (entry.expiresAt().isAfter(Instant.now())) {
                return Optional.ofNullable(entry.tripId());
            }
            fallbackStore.remove(cleanCode, entry);
        }
        return Optional.empty();
    }

    public void cache(String inviteCode, Long tripId) {
        if (inviteCode == null || inviteCode.isBlank() || tripId == null) {
            return;
        }
        String cleanCode = inviteCode.trim();
        String key = KEY_PREFIX + cleanCode;

        if (redisTemplate != null) {
            try {
                redisTemplate.opsForValue().set(key, String.valueOf(tripId), CACHE_TTL);
                fallbackStore.remove(cleanCode);
                return;
            } catch (Exception e) {
                log.warn("Redis unavailable during invite cache set; using fallback. key={}, cause={}", key, e.getMessage());
            }
        }

        if (fallbackStore.size() > 1000) {
            Instant now = Instant.now();
            fallbackStore.entrySet().removeIf(entry -> !entry.getValue().expiresAt().isAfter(now));
        }
        fallbackStore.put(cleanCode, new CacheEntry(tripId, Instant.now().plus(CACHE_TTL)));
    }

    public void evict(String inviteCode) {
        if (inviteCode == null || inviteCode.isBlank()) {
            return;
        }
        String cleanCode = inviteCode.trim();
        fallbackStore.remove(cleanCode);

        if (redisTemplate != null) {
            String key = KEY_PREFIX + cleanCode;
            try {
                redisTemplate.delete(key);
            } catch (Exception e) {
                log.warn("Redis unavailable during invite cache evict. key={}, cause={}", key, e.getMessage());
            }
        }
    }
}
