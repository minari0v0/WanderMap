package com.wandermap.wandermap.domain.presence;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class TripPresenceStore {

    private static final String KEY_PREFIX = "trip:presence:";
    private static final Duration HASH_TTL = Duration.ofSeconds(90);
    private static final Base64.Encoder B64_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder B64_DECODER = Base64.getUrlDecoder();

    private final StringRedisTemplate redisTemplate;
    private final ConcurrentHashMap<Long, ConcurrentHashMap<String, PresenceRecord>> fallbackStore = new ConcurrentHashMap<>();

    @Autowired
    public TripPresenceStore(ObjectProvider<StringRedisTemplate> redisTemplateProvider) {
        this.redisTemplate = redisTemplateProvider != null ? redisTemplateProvider.getIfAvailable() : null;
    }

    public TripPresenceStore(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public record PresenceRecord(
            String viewerKey,
            boolean guest,
            Long userId,
            String nickname,
            String profileImage,
            String role,
            long expiresAtEpochMs) {
    }

    public void upsert(Long tripId, PresenceRecord record) {
        if (tripId == null || record == null || record.viewerKey() == null || record.viewerKey().isBlank()) {
            return;
        }
        String key = buildKey(tripId);
        String encoded = encode(record);

        if (redisTemplate != null) {
            try {
                redisTemplate.opsForHash().put(key, record.viewerKey(), encoded);
                redisTemplate.expire(key, HASH_TTL);
                ConcurrentHashMap<String, PresenceRecord> fallbackTrip = fallbackStore.get(tripId);
                if (fallbackTrip != null) {
                    fallbackTrip.remove(record.viewerKey());
                    if (fallbackTrip.isEmpty()) {
                        fallbackStore.remove(tripId, fallbackTrip);
                    }
                }
                return;
            } catch (Exception e) {
                log.warn("Redis unavailable during presence upsert; using in-memory fallback. key={}, cause={}", key,
                        e.getMessage());
            }
        }

        pruneExpiredFallbackIfNeeded();
        fallbackStore.computeIfAbsent(tripId, k -> new ConcurrentHashMap<>()).put(record.viewerKey(), record);
    }

    public void remove(Long tripId, String viewerKey) {
        if (tripId == null || viewerKey == null || viewerKey.isBlank()) {
            return;
        }
        fallbackStore.computeIfPresent(tripId, (id, map) -> {
            map.remove(viewerKey);
            return map.isEmpty() ? null : map;
        });

        if (redisTemplate != null) {
            String key = buildKey(tripId);
            try {
                redisTemplate.opsForHash().delete(key, viewerKey);
            } catch (Exception e) {
                log.warn("Redis unavailable during presence remove; cleared fallback only. key={}, cause={}", key,
                        e.getMessage());
            }
        }
    }

    public List<PresenceRecord> listActive(Long tripId) {
        if (tripId == null) {
            return List.of();
        }
        long now = System.currentTimeMillis();
        Map<String, PresenceRecord> merged = new LinkedHashMap<>();

        if (redisTemplate != null) {
            String key = buildKey(tripId);
            try {
                Map<Object, Object> entries = redisTemplate.opsForHash().entries(key);
                if (entries != null && !entries.isEmpty()) {
                    List<Object> expiredFields = new ArrayList<>();
                    for (Map.Entry<Object, Object> entry : entries.entrySet()) {
                        String viewerKey = String.valueOf(entry.getKey());
                        String rawValue = entry.getValue() != null ? String.valueOf(entry.getValue()) : "";
                        PresenceRecord decoded = decode(viewerKey, rawValue);
                        if (decoded == null || decoded.expiresAtEpochMs() <= now) {
                            expiredFields.add(entry.getKey());
                        } else {
                            merged.put(viewerKey, decoded);
                        }
                    }
                    if (!expiredFields.isEmpty()) {
                        try {
                            redisTemplate.opsForHash().delete(key, expiredFields.toArray());
                        } catch (Exception ignored) {
                            // Lazy expiry cleanup failure does not affect active list
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Redis unavailable during presence listActive; reading fallback. key={}, cause={}", key,
                        e.getMessage());
            }
        }

        ConcurrentHashMap<String, PresenceRecord> fallbackTrip = fallbackStore.get(tripId);
        if (fallbackTrip != null && !fallbackTrip.isEmpty()) {
            fallbackTrip.entrySet().removeIf(entry -> entry.getValue().expiresAtEpochMs() <= now);
            for (Map.Entry<String, PresenceRecord> entry : fallbackTrip.entrySet()) {
                merged.putIfAbsent(entry.getKey(), entry.getValue());
            }
            if (fallbackTrip.isEmpty()) {
                fallbackStore.remove(tripId, fallbackTrip);
            }
        }

        List<PresenceRecord> result = new ArrayList<>(merged.values());
        result.sort(Comparator
                .comparing(PresenceRecord::guest)
                .thenComparingInt(r -> roleRank(r.role()))
                .thenComparing(r -> r.nickname() != null ? r.nickname() : "", String.CASE_INSENSITIVE_ORDER)
                .thenComparing(PresenceRecord::viewerKey));
        return result;
    }

    private void pruneExpiredFallbackIfNeeded() {
        if (fallbackStore.size() > 500) {
            long now = System.currentTimeMillis();
            fallbackStore.entrySet().removeIf(entry -> {
                entry.getValue().entrySet().removeIf(e -> e.getValue().expiresAtEpochMs() <= now);
                return entry.getValue().isEmpty();
            });
        }
    }

    private static int roleRank(String role) {
        if ("OWNER".equalsIgnoreCase(role))
            return 0;
        if ("MEMBER".equalsIgnoreCase(role))
            return 1;
        if ("GUEST".equalsIgnoreCase(role))
            return 2;
        return 3;
    }

    private static String buildKey(Long tripId) {
        return KEY_PREFIX + tripId;
    }

    private static String encode(PresenceRecord record) {
        String safeRole = record.role() != null ? record.role().replace("|", "") : "GUEST";
        String userIdStr = record.userId() != null ? String.valueOf(record.userId()) : "";
        String encodedNickname = encodeB64(record.nickname());
        String encodedProfile = encodeB64(record.profileImage());
        return record.expiresAtEpochMs()
                + "|" + (record.guest() ? "1" : "0")
                + "|" + userIdStr
                + "|" + safeRole
                + "|" + encodedNickname
                + "|" + encodedProfile;
    }

    private static PresenceRecord decode(String viewerKey, String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return null;
        }
        String[] parts = rawValue.split("\\|", -1);
        if (parts.length < 6) {
            return null;
        }
        try {
            long expiresAt = Long.parseLong(parts[0]);
            boolean guest = "1".equals(parts[1]);
            Long userId = parts[2].isEmpty() ? null : Long.parseLong(parts[2]);
            String role = parts[3].isEmpty() ? "GUEST" : parts[3];
            String nickname = decodeB64(parts[4]);
            String profileImage = decodeB64(parts[5]);
            return new PresenceRecord(
                    viewerKey,
                    guest,
                    userId,
                    nickname.isEmpty() ? (guest ? "손님" : "여행가") : nickname,
                    profileImage.isEmpty() ? null : profileImage,
                    role,
                    expiresAt);
        } catch (Exception e) {
            return null;
        }
    }

    private static String encodeB64(String value) {
        if (value == null || value.isEmpty()) {
            return "";
        }
        return B64_ENCODER.encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    private static String decodeB64(String encoded) {
        if (encoded == null || encoded.isEmpty()) {
            return "";
        }
        return new String(B64_DECODER.decode(encoded), StandardCharsets.UTF_8);
    }
}
