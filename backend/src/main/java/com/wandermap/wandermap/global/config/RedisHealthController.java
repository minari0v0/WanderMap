package com.wandermap.wandermap.global.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/health")
public class RedisHealthController {

    private final StringRedisTemplate redisTemplate;

    public RedisHealthController(ObjectProvider<StringRedisTemplate> redisTemplateProvider) {
        this.redisTemplate = redisTemplateProvider != null ? redisTemplateProvider.getIfAvailable() : null;
    }

    @Bean
    public ApplicationRunner redisStartupCheck() {
        return args -> {
            Map<String, Object> result = checkRedis();
            if ("UP".equals(result.get("status"))) {
                log.info("[Upstash Redis] Connected successfully (PING={}, latency={}ms)",
                        result.get("ping"), result.get("latencyMs"));
            } else {
                log.warn("[Upstash Redis] Unavailable — running with in-memory fallback (cause={})",
                        result.get("error"));
            }
        };
    }

    @GetMapping("/redis")
    public ResponseEntity<Map<String, Object>> checkRedisHealth() {
        return ResponseEntity.ok(checkRedis());
    }

    private Map<String, Object> checkRedis() {
        Map<String, Object> body = new LinkedHashMap<>();
        long startedAt = System.nanoTime();

        if (redisTemplate == null) {
            body.put("status", "DEGRADED");
            body.put("provider", "FALLBACK");
            body.put("latencyMs", 0L);
            body.put("error", "StringRedisTemplate bean is not configured");
            return body;
        }

        try {
            String pong = redisTemplate.execute((RedisCallback<String>) connection -> connection.ping());
            long latencyMs = (System.nanoTime() - startedAt) / 1_000_000L;
            body.put("status", "UP");
            body.put("provider", "REDIS");
            body.put("ping", pong != null ? pong : "PONG");
            body.put("latencyMs", latencyMs);
            return body;
        } catch (Exception e) {
            long latencyMs = (System.nanoTime() - startedAt) / 1_000_000L;
            body.put("status", "DEGRADED");
            body.put("provider", "FALLBACK");
            body.put("latencyMs", latencyMs);
            body.put("error", e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
            return body;
        }
    }
}
