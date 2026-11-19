package com.wandermap.wandermap.domain.auth;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class EmailOtpStore {

    private static final String OTP_PREFIX = "auth:otp:";
    private static final String COOLDOWN_PREFIX = "auth:otp:cooldown:";
    private static final String COUNT_PREFIX = "auth:otp:count:";

    private final StringRedisTemplate redisTemplate;
    private final ConcurrentHashMap<String, OtpFallbackEntry> fallbackOtps = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Instant> fallbackCooldowns = new ConcurrentHashMap<>();

    private record OtpFallbackEntry(String code, int sendCount, Instant expiresAt) {}

    @Autowired
    public EmailOtpStore(ObjectProvider<StringRedisTemplate> redisTemplateProvider) {
        this.redisTemplate = redisTemplateProvider != null ? redisTemplateProvider.getIfAvailable() : null;
    }

    public EmailOtpStore(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public boolean isCooldownActive(String email) {
        String norm = normalize(email);
        if (norm.isEmpty()) {
            return false;
        }
        String key = COOLDOWN_PREFIX + norm;

        if (redisTemplate != null) {
            try {
                Boolean exists = redisTemplate.hasKey(key);
                if (Boolean.TRUE.equals(exists)) {
                    return true;
                }
            } catch (Exception e) {
                log.warn("Redis unavailable during isCooldownActive; checking fallback. cause={}", e.getMessage());
            }
        }

        Instant cooldownUntil = fallbackCooldowns.get(norm);
        if (cooldownUntil != null) {
            if (cooldownUntil.isAfter(Instant.now())) {
                return true;
            }
            fallbackCooldowns.remove(norm, cooldownUntil);
        }
        return false;
    }

    public int getResendCount(String email) {
        String norm = normalize(email);
        if (norm.isEmpty()) {
            return 0;
        }
        String key = COUNT_PREFIX + norm;

        if (redisTemplate != null) {
            try {
                String raw = redisTemplate.opsForValue().get(key);
                if (raw != null && !raw.isBlank()) {
                    return Integer.parseInt(raw.trim());
                }
            } catch (Exception e) {
                log.warn("Redis unavailable during getResendCount; checking fallback. cause={}", e.getMessage());
            }
        }

        OtpFallbackEntry entry = fallbackOtps.get(norm);
        if (entry != null) {
            if (entry.expiresAt().isAfter(Instant.now())) {
                return entry.sendCount();
            }
            fallbackOtps.remove(norm, entry);
        }
        return 0;
    }

    public void saveOtp(String email, String code, Duration otpTtl, Duration cooldownTtl) {
        String norm = normalize(email);
        if (norm.isEmpty() || code == null) {
            return;
        }
        String otpKey = OTP_PREFIX + norm;
        String cooldownKey = COOLDOWN_PREFIX + norm;
        String countKey = COUNT_PREFIX + norm;

        if (redisTemplate != null) {
            try {
                redisTemplate.opsForValue().set(otpKey, code, otpTtl);
                redisTemplate.opsForValue().set(cooldownKey, "1", cooldownTtl);
                redisTemplate.opsForValue().increment(countKey);
                redisTemplate.expire(countKey, otpTtl);
                fallbackOtps.remove(norm);
                fallbackCooldowns.remove(norm);
                return;
            } catch (Exception e) {
                log.warn("Redis unavailable during saveOtp; using fallback. cause={}", e.getMessage());
            }
        }

        Instant now = Instant.now();
        fallbackOtps.compute(norm, (k, existing) -> {
            int nextCount = (existing != null && existing.expiresAt().isAfter(now))
                    ? existing.sendCount() + 1
                    : 1;
            return new OtpFallbackEntry(code, nextCount, now.plus(otpTtl));
        });
        fallbackCooldowns.put(norm, now.plus(cooldownTtl));
    }

    public Optional<String> getOtp(String email) {
        String norm = normalize(email);
        if (norm.isEmpty()) {
            return Optional.empty();
        }
        String otpKey = OTP_PREFIX + norm;

        if (redisTemplate != null) {
            try {
                String val = redisTemplate.opsForValue().get(otpKey);
                if (val != null && !val.isBlank()) {
                    return Optional.of(val);
                }
            } catch (Exception e) {
                log.warn("Redis unavailable during getOtp; checking fallback. cause={}", e.getMessage());
            }
        }

        OtpFallbackEntry entry = fallbackOtps.get(norm);
        if (entry != null) {
            if (entry.expiresAt().isAfter(Instant.now())) {
                return Optional.ofNullable(entry.code());
            }
            fallbackOtps.remove(norm, entry);
        }
        return Optional.empty();
    }

    public void clearOtp(String email) {
        String norm = normalize(email);
        if (norm.isEmpty()) {
            return;
        }
        fallbackOtps.remove(norm);
        fallbackCooldowns.remove(norm);

        if (redisTemplate != null) {
            try {
                redisTemplate.delete(List.of(OTP_PREFIX + norm, COOLDOWN_PREFIX + norm, COUNT_PREFIX + norm));
            } catch (Exception e) {
                log.warn("Redis unavailable during clearOtp. cause={}", e.getMessage());
            }
        }
    }

    private static String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }
}
