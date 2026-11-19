package com.wandermap.wandermap.global.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class RefreshTokenStore {

    private static final String KEY_PREFIX = "auth:refresh:";
    private static final String VALUE_ACTIVE = "1";

    private final StringRedisTemplate redisTemplate;
    private final ConcurrentHashMap<String, Instant> fallbackStore = new ConcurrentHashMap<>();

    @Autowired
    public RefreshTokenStore(ObjectProvider<StringRedisTemplate> redisTemplateProvider) {
        this.redisTemplate = redisTemplateProvider != null ? redisTemplateProvider.getIfAvailable() : null;
    }

    public RefreshTokenStore(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void save(Long userId, String jti, Duration ttl) {
        if (userId == null || jti == null || jti.isBlank() || ttl == null || ttl.isNegative() || ttl.isZero()) {
            return;
        }
        String key = buildKey(userId, jti);
        Instant expiresAt = Instant.now().plus(ttl);
        pruneExpiredFallbackIfNeeded();

        if (redisTemplate != null) {
            try {
                redisTemplate.opsForValue().set(key, VALUE_ACTIVE, ttl);
                fallbackStore.remove(key);
                return;
            } catch (Exception e) {
                log.warn("Redis unavailable during refresh token save; using in-memory fallback. key={}, cause={}", key, e.getMessage());
            }
        }
        fallbackStore.put(key, expiresAt);
    }

    public boolean exists(Long userId, String jti) {
        if (userId == null || jti == null || jti.isBlank()) {
            return false;
        }
        String key = buildKey(userId, jti);

        if (redisTemplate != null) {
            try {
                Boolean existsInRedis = redisTemplate.hasKey(key);
                if (Boolean.TRUE.equals(existsInRedis)) {
                    return true;
                }
                return isValidInFallback(key);
            } catch (Exception e) {
                log.warn("Redis unavailable during refresh token exists check; checking in-memory fallback. key={}, cause={}", key, e.getMessage());
            }
        }
        return isValidInFallback(key);
    }

    public void delete(Long userId, String jti) {
        if (userId == null || jti == null || jti.isBlank()) {
            return;
        }
        String key = buildKey(userId, jti);
        fallbackStore.remove(key);

        if (redisTemplate != null) {
            try {
                redisTemplate.delete(key);
            } catch (Exception e) {
                log.warn("Redis unavailable during refresh token delete; removed from fallback only. key={}, cause={}", key, e.getMessage());
            }
        }
    }

    public void deleteAllForUser(Long userId) {
        if (userId == null) {
            return;
        }
        String userPrefix = KEY_PREFIX + userId + ":";
        fallbackStore.keySet().removeIf(k -> k.startsWith(userPrefix));

        if (redisTemplate != null) {
            try {
                Set<String> keysToDelete = new HashSet<>();
                ScanOptions scanOptions = ScanOptions.scanOptions()
                        .match(userPrefix + "*")
                        .count(100)
                        .build();
                try (Cursor<String> cursor = redisTemplate.scan(scanOptions)) {
                    if (cursor != null) {
                        while (cursor.hasNext()) {
                            keysToDelete.add(cursor.next());
                        }
                    }
                }
                if (!keysToDelete.isEmpty()) {
                    redisTemplate.delete(keysToDelete);
                }
            } catch (Exception e) {
                log.warn("Redis unavailable during deleteAllForUser; cleared fallback only. userId={}, cause={}", userId, e.getMessage());
            }
        }
    }

    private boolean isValidInFallback(String key) {
        Instant expiresAt = fallbackStore.get(key);
        if (expiresAt == null) {
            return false;
        }
        if (!expiresAt.isAfter(Instant.now())) {
            fallbackStore.remove(key, expiresAt);
            return false;
        }
        return true;
    }

    private void pruneExpiredFallbackIfNeeded() {
        if (fallbackStore.size() > 1000) {
            Instant now = Instant.now();
            fallbackStore.entrySet().removeIf(entry -> !entry.getValue().isAfter(now));
        }
    }

    private static String buildKey(Long userId, String jti) {
        return KEY_PREFIX + userId + ":" + jti;
    }
}
