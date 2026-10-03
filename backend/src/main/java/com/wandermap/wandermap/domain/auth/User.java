package com.wandermap.wandermap.domain.auth;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(length = 255)
    private String password;

    @Column(nullable = false, length = 50)
    private String nickname;

    @Column(name = "profile_image", length = 500)
    private String profileImage;

    @Column(length = 255)
    private String bio;

    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified = false;

    @Column(length = 20)
    private String provider; // LOCAL | KAKAO | NAVER | GOOGLE

    @Column(name = "oauth_id")
    private String oauthId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public User(String email, String password, String nickname, String profileImage, String bio, Boolean emailVerified, String provider, String oauthId) {
        this.email = email;
        this.password = password;
        this.nickname = nickname;
        this.profileImage = profileImage;
        this.bio = (bio != null && !bio.isBlank()) ? bio : "나만의 특별한 무드를 담은 취향 저장소를 만들고 있습니다.";
        this.emailVerified = emailVerified != null ? emailVerified : false;
        this.provider = (provider != null) ? provider : "LOCAL";
        this.oauthId = oauthId;
    }

    public void updateProfile(String nickname, String profileImage, String bio) {
        if (nickname != null && !nickname.isBlank()) this.nickname = nickname;
        if (profileImage != null) this.profileImage = profileImage;
        if (bio != null) this.bio = bio;
    }

    public void verifyEmail() {
        this.emailVerified = true;
    }
}
