package com.wandermap.wandermap.domain.auth;

import com.wandermap.wandermap.domain.auth.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getMyProfile(@AuthenticationPrincipal Object principal) {
        Long userId = extractUserId(principal);
        UserProfileResponse response = userService.getMyProfile(userId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/me/email/send-code")
    public ResponseEntity<Map<String, String>> sendVerificationEmail(@AuthenticationPrincipal Object principal) {
        Long userId = extractUserId(principal);
        userService.sendEmailVerification(userId);
        return ResponseEntity.ok(Map.of("message", "인증 코드가 이메일로 발송되었습니다. (유효 시간 5분)"));
    }

    @PostMapping("/me/email/verify-code")
    public ResponseEntity<Map<String, Object>> verifyEmail(@AuthenticationPrincipal Object principal,
                                                          @RequestBody Map<String, String> request) {
        Long userId = extractUserId(principal);
        String code = request.get("code");
        userService.verifyEmail(userId, code);
        return ResponseEntity.ok(Map.of("verified", true, "message", "이메일 본인 인증이 완료되었습니다."));
    }

    @PatchMapping("/me/profile")
    public ResponseEntity<UserProfileResponse> updateProfile(@AuthenticationPrincipal Object principal,
                                                             @RequestBody ProfileUpdateRequest request) {
        Long userId = extractUserId(principal);
        UserProfileResponse response = userService.updateProfile(userId, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/me/password")
    public ResponseEntity<Map<String, String>> changePassword(@AuthenticationPrincipal Object principal,
                                                              @RequestBody PasswordChangeRequest request) {
        Long userId = extractUserId(principal);
        userService.changePassword(userId, request);
        return ResponseEntity.ok(Map.of("message", "비밀번호가 성공적으로 변경되었습니다."));
    }

    @PostMapping("/me/social-links/{provider}")
    public ResponseEntity<UserProfileResponse> linkSocial(@AuthenticationPrincipal Object principal,
                                                          @PathVariable String provider,
                                                          @RequestBody(required = false) Map<String, String> body) {
        Long userId = extractUserId(principal);
        String oauthId = body != null && body.containsKey("oauthId") ? body.get("oauthId") : "mock-" + provider + "-id";
        UserProfileResponse response = userService.linkSocial(userId, provider, oauthId);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/me/social-links/{provider}")
    public ResponseEntity<UserProfileResponse> unlinkSocial(@AuthenticationPrincipal Object principal,
                                                            @PathVariable String provider) {
        Long userId = extractUserId(principal);
        UserProfileResponse response = userService.unlinkSocial(userId, provider);
        return ResponseEntity.ok(response);
    }

    private Long extractUserId(Object principal) {
        if (principal instanceof Long id) {
            return id;
        }
        // 개발/테스트 fallback: 기본 ID 1
        return 1L;
    }
}
