package com.wandermap.wandermap.domain.auth;

import com.wandermap.wandermap.global.security.JwtTokenProvider;
import com.wandermap.wandermap.global.security.RefreshTokenStore;
import com.wandermap.wandermap.global.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenStore refreshTokenStore;

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequest request) {
        try {
            UserResponse response = authService.signup(request);
            return ResponseEntity.ok(issueTokens(response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "message", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            UserResponse response = authService.login(request);
            return ResponseEntity.ok(issueTokens(response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "message", e.getMessage()));
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody(required = false) Map<String, String> body) {
        String refreshToken = body != null ? body.get("refreshToken") : null;
        Optional<JwtTokenProvider.JwtClaims> claimsOpt = jwtTokenProvider.parseAndValidate(refreshToken, "refresh");
        if (claimsOpt.isEmpty()) {
            return unauthorizedRefreshResponse("유효하지 않거나 만료된 리프레시 토큰입니다.");
        }

        JwtTokenProvider.JwtClaims claims = claimsOpt.get();
        if (!refreshTokenStore.exists(claims.userId(), claims.jti())) {
            return unauthorizedRefreshResponse("만료되었거나 이미 사용된 리프레시 토큰입니다.");
        }

        UserResponse user;
        try {
            user = authService.getMe(claims.userId());
        } catch (IllegalArgumentException e) {
            refreshTokenStore.delete(claims.userId(), claims.jti());
            return unauthorizedRefreshResponse("존재하지 않는 사용자입니다.");
        }

        refreshTokenStore.delete(claims.userId(), claims.jti());
        return ResponseEntity.ok(issueTokens(user));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody(required = false) Map<String, String> body) {
        String refreshToken = body != null ? body.get("refreshToken") : null;
        if (refreshToken != null && !refreshToken.isBlank()) {
            jwtTokenProvider.parseAndValidate(refreshToken, "refresh")
                    .ifPresent(claims -> refreshTokenStore.delete(claims.userId(), claims.jti()));
        }
        return ResponseEntity.ok(Map.of("message", "로그아웃 되었습니다."));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMe(
            @RequestParam(required = false) Long userId,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId
    ) {
        try {
            Long resolvedUserId = resolveUserId(userId != null ? userId : headerUserId);
            UserResponse response = authService.getMe(resolvedUserId);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "message", e.getMessage()));
        }
    }

    @GetMapping("/check-nickname")
    public ResponseEntity<?> checkNickname(
            @RequestParam String nickname,
            @RequestParam(required = false) Long userId
    ) {
        try {
            Long resolvedUserId = resolveUserId(userId);
            boolean isDuplicate = authService.isNicknameDuplicate(nickname, resolvedUserId);
            return ResponseEntity.ok(isDuplicate);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "message", e.getMessage()));
        }
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(
            @RequestBody Map<String, Object> body,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId
    ) {
        try {
            Long bodyUserId = parseLongValue(body.get("userId"));
            Long resolvedUserId = resolveUserId(bodyUserId != null ? bodyUserId : headerUserId);
            String nickname = body.get("nickname") != null ? String.valueOf(body.get("nickname")) : null;
            String profileImage = body.get("profileImage") != null ? String.valueOf(body.get("profileImage")) : null;
            String bio = body.get("bio") != null ? String.valueOf(body.get("bio")) : null;

            UserResponse response = authService.updateProfile(resolvedUserId, nickname, profileImage, bio);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "message", e.getMessage()));
        }
    }

    @PostMapping("/password")
    public ResponseEntity<?> changePassword(
            @RequestBody Map<String, Object> body,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId
    ) {
        try {
            Long bodyUserId = parseLongValue(body.get("userId"));
            Long resolvedUserId = resolveUserId(bodyUserId != null ? bodyUserId : headerUserId);
            String currentPassword = body.get("currentPassword") != null ? String.valueOf(body.get("currentPassword")) : null;
            String newPassword = body.get("newPassword") != null ? String.valueOf(body.get("newPassword")) : null;
            String newPasswordConfirm = body.get("newPasswordConfirm") != null ? String.valueOf(body.get("newPasswordConfirm")) : null;

            authService.changePassword(resolvedUserId, currentPassword, newPassword, newPasswordConfirm);
            return ResponseEntity.ok(Map.of("message", "비밀번호가 성공적으로 변경되었습니다."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "message", e.getMessage()));
        }
    }

    @PostMapping("/email/verification-request")
    public ResponseEntity<?> requestEmailVerification(
            @RequestBody Map<String, Object> body,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId
    ) {
        try {
            Long bodyUserId = parseLongValue(body.get("userId"));
            Long resolvedUserId = resolveUserId(bodyUserId != null ? bodyUserId : headerUserId);
            String email = body.get("email") != null ? String.valueOf(body.get("email")) : null;

            String code = authService.sendEmailVerificationCode(resolvedUserId, email);
            return ResponseEntity.ok(Map.of(
                    "message", "인증 코드가 발송되었습니다. (유효시간 5분)",
                    "devCode", code
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "message", e.getMessage()));
        }
    }

    @PostMapping("/email/verify")
    public ResponseEntity<?> verifyEmail(
            @RequestBody Map<String, Object> body,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId
    ) {
        try {
            Long bodyUserId = parseLongValue(body.get("userId"));
            Long resolvedUserId = resolveUserId(bodyUserId != null ? bodyUserId : headerUserId);
            String email = body.get("email") != null ? String.valueOf(body.get("email")) : null;
            String code = body.get("code") != null ? String.valueOf(body.get("code")) : null;

            UserResponse updatedUser = authService.verifyEmailCode(resolvedUserId, email, code);
            return ResponseEntity.ok(Map.of(
                    "verified", true,
                    "message", "이메일 인증이 완료되었습니다.",
                    "user", updatedUser != null ? updatedUser : Map.of()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "message", e.getMessage()));
        }
    }

    @PostMapping("/social/{provider}")
    public ResponseEntity<?> linkSocial(
            @PathVariable String provider,
            @RequestBody Map<String, Object> body,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId
    ) {
        try {
            Long bodyUserId = parseLongValue(body.get("userId"));
            Long resolvedUserId = resolveUserId(bodyUserId != null ? bodyUserId : headerUserId);
            String oauthId = body.get("oauthId") != null ? String.valueOf(body.get("oauthId")) : null;

            UserResponse response = authService.linkSocial(resolvedUserId, provider, oauthId);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "message", e.getMessage()));
        }
    }

    @DeleteMapping("/social/{provider}")
    public ResponseEntity<?> unlinkSocial(
            @PathVariable String provider,
            @RequestParam(required = false) Long userId,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId
    ) {
        try {
            Long resolvedUserId = resolveUserId(userId != null ? userId : headerUserId);
            UserResponse response = authService.unlinkSocial(resolvedUserId, provider);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "message", e.getMessage()));
        }
    }

    @DeleteMapping("/withdraw")
    public ResponseEntity<?> withdraw(
            @RequestParam(required = false) Long userId,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId
    ) {
        try {
            Long resolvedUserId = resolveUserId(userId != null ? userId : headerUserId);
            authService.withdraw(resolvedUserId);
            return ResponseEntity.ok(Map.of("message", "회원 탈퇴가 완료되었습니다."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "message", e.getMessage()));
        }
    }

    private AuthTokenResponse issueTokens(UserResponse user) {
        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail());
        JwtTokenProvider.RefreshTokenResult refreshResult = jwtTokenProvider.generateRefreshToken(user.getId(), user.getEmail());
        refreshTokenStore.save(user.getId(), refreshResult.jti(), Duration.ofMillis(refreshResult.ttlMillis()));
        return AuthTokenResponse.builder()
                .user(user)
                .accessToken(accessToken)
                .refreshToken(refreshResult.token())
                .build();
    }

    private static Long resolveUserId(Long fallbackUserId) {
        Long authUserId = SecurityUtils.getCurrentUserId();
        return authUserId != null ? authUserId : fallbackUserId;
    }

    private static Long parseLongValue(Object raw) {
        if (raw == null) {
            return null;
        }
        if (raw instanceof Number number) {
            return number.longValue();
        }
        String str = String.valueOf(raw).trim();
        if (str.isEmpty() || "null".equalsIgnoreCase(str)) {
            return null;
        }
        return Long.valueOf(str);
    }

    private static ResponseEntity<Map<String, Object>> unauthorizedRefreshResponse(String message) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "status", 401,
                "error", message,
                "message", message
        ));
    }
}
