package com.wandermap.wandermap.domain.auth;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "email_verifications")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EmailVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false, length = 6)
    private String code;

    @Column(name = "resend_count", nullable = false)
    private int resendCount = 0;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "resend_available_at", nullable = false)
    private LocalDateTime resendAvailableAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public EmailVerification(String email, String code, int resendCount, LocalDateTime expiresAt, LocalDateTime resendAvailableAt) {
        this.email = email;
        this.code = code;
        this.resendCount = resendCount;
        this.expiresAt = expiresAt;
        this.resendAvailableAt = resendAvailableAt;
    }

    public void updateCode(String code, LocalDateTime expiresAt, LocalDateTime resendAvailableAt) {
        this.code = code;
        this.resendCount += 1;
        this.expiresAt = expiresAt;
        this.resendAvailableAt = resendAvailableAt;
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(this.expiresAt);
    }

    public boolean canResend() {
        return LocalDateTime.now().isAfter(this.resendAvailableAt);
    }
}
