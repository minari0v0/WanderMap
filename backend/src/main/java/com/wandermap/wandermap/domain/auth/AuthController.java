package com.wandermap.wandermap.domain.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequest request) {
        try {
            UserResponse response = authService.signup(request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "message", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            UserResponse response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "message", e.getMessage()));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMe(@RequestParam Long userId) {
        try {
            UserResponse response = authService.getMe(userId);
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
            boolean isDuplicate = authService.isNicknameDuplicate(nickname, userId);
            return ResponseEntity.ok(isDuplicate);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "message", e.getMessage()));
        }
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, Object> body) {
        try {
            Long userId = body.get("userId") != null ? Long.valueOf(String.valueOf(body.get("userId"))) : null;
            String nickname = body.get("nickname") != null ? String.valueOf(body.get("nickname")) : null;
            String profileImage = body.get("profileImage") != null ? String.valueOf(body.get("profileImage")) : null;
            String bio = body.get("bio") != null ? String.valueOf(body.get("bio")) : null;

            UserResponse response = authService.updateProfile(userId, nickname, profileImage, bio);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "message", e.getMessage()));
        }
    }

    @PostMapping("/password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, Object> body) {
        try {
            Long userId = body.get("userId") != null ? Long.valueOf(String.valueOf(body.get("userId"))) : null;
            String currentPassword = body.get("currentPassword") != null ? String.valueOf(body.get("currentPassword")) : null;
            String newPassword = body.get("newPassword") != null ? String.valueOf(body.get("newPassword")) : null;
            String newPasswordConfirm = body.get("newPasswordConfirm") != null ? String.valueOf(body.get("newPasswordConfirm")) : null;

            authService.changePassword(userId, currentPassword, newPassword, newPasswordConfirm);
            return ResponseEntity.ok(Map.of("message", "비밀번호가 성공적으로 변경되었습니다."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "message", e.getMessage()));
        }
    }

    @PostMapping("/email/verification-request")
    public ResponseEntity<?> requestEmailVerification(@RequestBody Map<String, Object> body) {
        try {
            Long userId = body.get("userId") != null ? Long.valueOf(String.valueOf(body.get("userId"))) : null;
            String email = body.get("email") != null ? String.valueOf(body.get("email")) : null;

            String code = authService.sendEmailVerificationCode(userId, email);
            return ResponseEntity.ok(Map.of(
                    "message", "인증 코드가 발송되었습니다. (유효시간 5분)",
                    "devCode", code
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "message", e.getMessage()));
        }
    }

    @PostMapping("/email/verify")
    public ResponseEntity<?> verifyEmail(@RequestBody Map<String, Object> body) {
        try {
            Long userId = body.get("userId") != null ? Long.valueOf(String.valueOf(body.get("userId"))) : null;
            String email = body.get("email") != null ? String.valueOf(body.get("email")) : null;
            String code = body.get("code") != null ? String.valueOf(body.get("code")) : null;

            UserResponse updatedUser = authService.verifyEmailCode(userId, email, code);
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
            @RequestBody Map<String, Object> body
    ) {
        try {
            Long userId = body.get("userId") != null ? Long.valueOf(String.valueOf(body.get("userId"))) : null;
            String oauthId = body.get("oauthId") != null ? String.valueOf(body.get("oauthId")) : null;

            UserResponse response = authService.linkSocial(userId, provider, oauthId);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "message", e.getMessage()));
        }
    }

    @DeleteMapping("/social/{provider}")
    public ResponseEntity<?> unlinkSocial(
            @PathVariable String provider,
            @RequestParam Long userId
    ) {
        try {
            UserResponse response = authService.unlinkSocial(userId, provider);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "message", e.getMessage()));
        }
    }

    @DeleteMapping("/withdraw")
    public ResponseEntity<?> withdraw(@RequestParam Long userId) {
        try {
            authService.withdraw(userId);
            return ResponseEntity.ok(Map.of("message", "회원 탈퇴가 완료되었습니다."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage(), "message", e.getMessage()));
        }
    }
}
