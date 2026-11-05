package com.wandermap.wandermap.domain.auth;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.concurrent.ThreadLocalRandom;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

    private static final String[] PRESET_EMOJIS = {
            "🐹", "🐰", "😺", "🐶", "🦊", "🦔", "🐘", "🐻", "❄️", "🐵", "🐼", "🦁"
    };

    private static final String[] PRESET_BG_IDS = {
            "sage", "peach", "sand", "coral", "silver", "bluegray", "lavender", "white"
    };

    public static String generateRandomProfileImage() {
        ThreadLocalRandom random = ThreadLocalRandom.current();
        String emoji = PRESET_EMOJIS[random.nextInt(PRESET_EMOJIS.length)];
        String bg = PRESET_BG_IDS[random.nextInt(PRESET_BG_IDS.length)];
        return "emoji:" + emoji + "?bg=" + bg;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(length = 255)
    private String password;

    @Column(nullable = false, length = 50)
    private String nickname;

    @Column(name = "profile_image", columnDefinition = "TEXT")
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
        this.profileImage = (profileImage != null && !profileImage.isBlank()) ? profileImage : generateRandomProfileImage();
        this.bio = (bio != null && !bio.isBlank()) ? bio : "나만의 특별한 무드를 담은 취향 저장소를 만들고 있습니다.";
        this.emailVerified = emailVerified != null ? emailVerified : false;
        this.provider = (provider != null) ? provider : "LOCAL";
        this.oauthId = oauthId;
    }

    public void updateProfile(String nickname, String profileImage, String bio) {
        if (nickname != null && !nickname.isBlank()) {
            this.nickname = nickname.trim();
        }
        if (profileImage != null) {
            this.profileImage = profileImage;
        }
        if (bio != null) {
            this.bio = bio.trim();
        }
    }

    public void updatePassword(String encodedPassword) {
        this.password = encodedPassword;
    }

    public void verifyEmail() {
        this.emailVerified = true;
    }
}
