package com.wandermap.wandermap.domain.auth;

import com.wandermap.wandermap.domain.auth.dto.*;
import com.wandermap.wandermap.global.mail.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final EmailService emailService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/email/send-code")
    public ResponseEntity<Map<String, String>> sendEmailCode(@RequestBody EmailSendRequest request) {
        emailService.sendVerificationCode(request.getEmail());
        return ResponseEntity.ok(Map.of("message", "인증 코드가 이메일로 발송되었습니다. (유효 시간 5분)"));
    }

    @PostMapping("/email/verify-code")
    public ResponseEntity<Map<String, Object>> verifyEmailCode(@RequestBody EmailVerifyRequest request) {
        boolean verified = emailService.verifyCode(request.getEmail(), request.getCode());
        return ResponseEntity.ok(Map.of("verified", verified, "message", "이메일 인증이 완료되었습니다."));
    }
}
