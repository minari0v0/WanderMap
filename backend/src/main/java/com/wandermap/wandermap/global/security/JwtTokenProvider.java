package com.wandermap.wandermap.global.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.*;

@Component
public class JwtTokenProvider {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final String HEADER_JSON = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
    private static final Base64.Encoder BASE64_URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder BASE64_URL_DECODER = Base64.getUrlDecoder();

    private final SecretKeySpec secretKeySpec;
    private final long accessTokenExpirationMs;
    private final long refreshTokenExpirationMs;
    private final String encodedHeader;

    public JwtTokenProvider(
            @Value("${jwt.secret:wandermap-local-dev-jwt-secret-key-change-in-production-min-32-bytes}") String secret,
            @Value("${jwt.access-token-expiration:3600000}") long accessTokenExpirationMs,
            @Value("${jwt.refresh-token-expiration:604800000}") long refreshTokenExpirationMs
    ) {
        byte[] rawBytes = secret != null ? secret.getBytes(StandardCharsets.UTF_8) : new byte[0];
        byte[] keyBytes;
        if (rawBytes.length < 32) {
            keyBytes = sha256(rawBytes);
        } else {
            keyBytes = rawBytes;
        }
        this.secretKeySpec = new SecretKeySpec(keyBytes, HMAC_ALGORITHM);
        this.accessTokenExpirationMs = accessTokenExpirationMs;
        this.refreshTokenExpirationMs = refreshTokenExpirationMs;
        this.encodedHeader = BASE64_URL_ENCODER.encodeToString(HEADER_JSON.getBytes(StandardCharsets.UTF_8));
    }

    public record JwtClaims(Long userId, String email, String type, String jti, long expiresAtEpochSec) {}

    public record RefreshTokenResult(String token, String jti, long ttlMillis) {}

    public String generateAccessToken(Long userId, String email) {
        String jti = UUID.randomUUID().toString();
        return createToken(userId, email, "access", jti, accessTokenExpirationMs);
    }

    public RefreshTokenResult generateRefreshToken(Long userId, String email) {
        String jti = UUID.randomUUID().toString();
        String token = createToken(userId, email, "refresh", jti, refreshTokenExpirationMs);
        return new RefreshTokenResult(token, jti, refreshTokenExpirationMs);
    }

    public Optional<JwtClaims> parseAndValidate(String token, String expectedType) {
        if (token == null || token.isBlank() || expectedType == null || expectedType.isBlank()) {
            return Optional.empty();
        }

        String[] parts = token.split("\\.", -1);
        if (parts.length != 3 || parts[0].isEmpty() || parts[1].isEmpty() || parts[2].isEmpty()) {
            return Optional.empty();
        }

        try {
            String headerJson = new String(BASE64_URL_DECODER.decode(parts[0]), StandardCharsets.UTF_8);
            Map<String, Object> header = SimpleJsonParser.parseObject(headerJson);
            if (!"HS256".equals(header.get("alg"))) {
                return Optional.empty();
            }

            String signingInput = parts[0] + "." + parts[1];
            byte[] expectedSignature = sign(signingInput);
            byte[] actualSignature = BASE64_URL_DECODER.decode(parts[2]);
            if (!MessageDigest.isEqual(expectedSignature, actualSignature)) {
                return Optional.empty();
            }

            String payloadJson = new String(BASE64_URL_DECODER.decode(parts[1]), StandardCharsets.UTF_8);
            Map<String, Object> payload = SimpleJsonParser.parseObject(payloadJson);

            Object typeObj = payload.get("type");
            if (!(typeObj instanceof String type) || !expectedType.equals(type)) {
                return Optional.empty();
            }

            Object subObj = payload.get("sub");
            if (subObj == null) {
                return Optional.empty();
            }
            Long userId = (subObj instanceof Number num)
                    ? num.longValue()
                    : Long.parseLong(String.valueOf(subObj));

            Object jtiObj = payload.get("jti");
            if (!(jtiObj instanceof String jti) || jti.isBlank()) {
                return Optional.empty();
            }

            Object expObj = payload.get("exp");
            long exp;
            if (expObj instanceof Number num) {
                exp = num.longValue();
            } else if (expObj instanceof String expStr) {
                exp = Long.parseLong(expStr);
            } else {
                return Optional.empty();
            }

            if (exp <= Instant.now().getEpochSecond()) {
                return Optional.empty();
            }

            Object emailObj = payload.get("email");
            String email = emailObj instanceof String s ? s : null;

            return Optional.of(new JwtClaims(userId, email, type, jti, exp));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private String createToken(Long userId, String email, String type, String jti, long ttlMillis) {
        if (userId == null) {
            throw new IllegalArgumentException("userId must not be null");
        }
        Instant now = Instant.now();
        long iat = now.getEpochSecond();
        long exp = ttlMillis > 0
                ? now.plusMillis(Math.max(1000L, ttlMillis)).getEpochSecond()
                : now.plusMillis(ttlMillis).getEpochSecond();

        StringBuilder payload = new StringBuilder(160);
        payload.append('{');
        payload.append("\"sub\":\"").append(userId).append("\",");
        if (email != null) {
            payload.append("\"email\":\"").append(escapeJson(email)).append("\",");
        } else {
            payload.append("\"email\":null,");
        }
        payload.append("\"type\":\"").append(escapeJson(type)).append("\",");
        payload.append("\"jti\":\"").append(escapeJson(jti)).append("\",");
        payload.append("\"iat\":").append(iat).append(',');
        payload.append("\"exp\":").append(exp);
        payload.append('}');

        String encodedPayload = BASE64_URL_ENCODER.encodeToString(payload.toString().getBytes(StandardCharsets.UTF_8));
        String signingInput = encodedHeader + "." + encodedPayload;
        String encodedSignature = BASE64_URL_ENCODER.encodeToString(sign(signingInput));
        return signingInput + "." + encodedSignature;
    }

    private byte[] sign(String signingInput) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(secretKeySpec);
            return mac.doFinal(signingInput.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Failed to sign JWT with HmacSHA256", e);
        }
    }

    private static byte[] sha256(byte[] input) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(input);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm unavailable", e);
        }
    }

    private static String escapeJson(String value) {
        StringBuilder sb = new StringBuilder(value.length());
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\b' -> sb.append("\\b");
                case '\f' -> sb.append("\\f");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.toString();
    }

    private static final class SimpleJsonParser {
        private static final int MAX_DEPTH = 16;

        private final String input;
        private int pos;

        private SimpleJsonParser(String input) {
            this.input = input;
        }

        static Map<String, Object> parseObject(String json) {
            if (json == null) {
                throw new IllegalArgumentException("JSON input is null");
            }
            SimpleJsonParser parser = new SimpleJsonParser(json);
            parser.skipWhitespace();
            Map<String, Object> map = parser.readObject(0);
            parser.skipWhitespace();
            if (parser.pos != parser.input.length()) {
                throw new IllegalArgumentException("Trailing content in JSON");
            }
            return map;
        }

        private Map<String, Object> readObject(int depth) {
            if (depth > MAX_DEPTH) {
                throw new IllegalArgumentException("JSON depth limit exceeded");
            }
            expect('{');
            skipWhitespace();
            Map<String, Object> map = new LinkedHashMap<>();
            if (peek() == '}') {
                pos++;
                return map;
            }
            while (true) {
                skipWhitespace();
                String key = readString();
                skipWhitespace();
                expect(':');
                skipWhitespace();
                Object value = readValue(depth + 1);
                map.put(key, value);
                skipWhitespace();
                char next = peek();
                if (next == ',') {
                    pos++;
                } else if (next == '}') {
                    pos++;
                    return map;
                } else {
                    throw new IllegalArgumentException("Expected ',' or '}' in JSON object");
                }
            }
        }

        private List<Object> readArray(int depth) {
            if (depth > MAX_DEPTH) {
                throw new IllegalArgumentException("JSON depth limit exceeded");
            }
            expect('[');
            skipWhitespace();
            List<Object> list = new ArrayList<>();
            if (peek() == ']') {
                pos++;
                return list;
            }
            while (true) {
                skipWhitespace();
                list.add(readValue(depth + 1));
                skipWhitespace();
                char next = peek();
                if (next == ',') {
                    pos++;
                } else if (next == ']') {
                    pos++;
                    return list;
                } else {
                    throw new IllegalArgumentException("Expected ',' or ']' in JSON array");
                }
            }
        }

        private Object readValue(int depth) {
            char c = peek();
            return switch (c) {
                case '"' -> readString();
                case '{' -> readObject(depth);
                case '[' -> readArray(depth);
                case 't' -> {
                    expectLiteral("true");
                    yield Boolean.TRUE;
                }
                case 'f' -> {
                    expectLiteral("false");
                    yield Boolean.FALSE;
                }
                case 'n' -> {
                    expectLiteral("null");
                    yield null;
                }
                default -> {
                    if (c == '-' || (c >= '0' && c <= '9')) {
                        yield readNumber();
                    }
                    throw new IllegalArgumentException("Unexpected token in JSON: " + c);
                }
            };
        }

        private String readString() {
            expect('"');
            StringBuilder sb = new StringBuilder();
            while (pos < input.length()) {
                char c = input.charAt(pos++);
                if (c == '"') {
                    return sb.toString();
                }
                if (c == '\\') {
                    if (pos >= input.length()) {
                        throw new IllegalArgumentException("Unterminated escape sequence");
                    }
                    char esc = input.charAt(pos++);
                    switch (esc) {
                        case '"', '\\', '/' -> sb.append(esc);
                        case 'b' -> sb.append('\b');
                        case 'f' -> sb.append('\f');
                        case 'n' -> sb.append('\n');
                        case 'r' -> sb.append('\r');
                        case 't' -> sb.append('\t');
                        case 'u' -> {
                            if (pos + 4 > input.length()) {
                                throw new IllegalArgumentException("Invalid unicode escape");
                            }
                            String hex = input.substring(pos, pos + 4);
                            pos += 4;
                            sb.append((char) Integer.parseInt(hex, 16));
                        }
                        default -> throw new IllegalArgumentException("Invalid escape character: \\" + esc);
                    }
                } else if (c < 0x20) {
                    throw new IllegalArgumentException("Unescaped control character in JSON string");
                } else {
                    sb.append(c);
                }
            }
            throw new IllegalArgumentException("Unterminated JSON string");
        }

        private Number readNumber() {
            int start = pos;
            if (peek() == '-') {
                pos++;
            }
            if (pos >= input.length() || !Character.isDigit(input.charAt(pos))) {
                throw new IllegalArgumentException("Invalid JSON number");
            }
            while (pos < input.length() && Character.isDigit(input.charAt(pos))) {
                pos++;
            }
            boolean isDecimal = false;
            if (pos < input.length() && input.charAt(pos) == '.') {
                isDecimal = true;
                pos++;
                if (pos >= input.length() || !Character.isDigit(input.charAt(pos))) {
                    throw new IllegalArgumentException("Invalid JSON decimal");
                }
                while (pos < input.length() && Character.isDigit(input.charAt(pos))) {
                    pos++;
                }
            }
            if (pos < input.length() && (input.charAt(pos) == 'e' || input.charAt(pos) == 'E')) {
                isDecimal = true;
                pos++;
                if (pos < input.length() && (input.charAt(pos) == '+' || input.charAt(pos) == '-')) {
                    pos++;
                }
                if (pos >= input.length() || !Character.isDigit(input.charAt(pos))) {
                    throw new IllegalArgumentException("Invalid JSON exponent");
                }
                while (pos < input.length() && Character.isDigit(input.charAt(pos))) {
                    pos++;
                }
            }
            String numStr = input.substring(start, pos);
            if (!isDecimal) {
                try {
                    return Long.parseLong(numStr);
                } catch (NumberFormatException ignored) {
                    return Double.parseDouble(numStr);
                }
            }
            return Double.parseDouble(numStr);
        }

        private void expectLiteral(String literal) {
            if (!input.startsWith(literal, pos)) {
                throw new IllegalArgumentException("Expected literal: " + literal);
            }
            pos += literal.length();
        }

        private void expect(char expected) {
            if (pos >= input.length() || input.charAt(pos) != expected) {
                throw new IllegalArgumentException("Expected '" + expected + "'");
            }
            pos++;
        }

        private char peek() {
            if (pos >= input.length()) {
                throw new IllegalArgumentException("Unexpected end of JSON");
            }
            return input.charAt(pos);
        }

        private void skipWhitespace() {
            while (pos < input.length()) {
                char c = input.charAt(pos);
                if (c == ' ' || c == '\t' || c == '\n' || c == '\r') {
                    pos++;
                } else {
                    break;
                }
            }
        }
    }
}
