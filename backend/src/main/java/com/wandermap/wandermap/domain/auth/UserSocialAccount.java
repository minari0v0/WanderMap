package com.wandermap.wandermap.domain.auth;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_social_accounts", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"provider", "oauth_id"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserSocialAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 20)
    private String provider; // KAKAO | NAVER | GOOGLE

    @Column(name = "oauth_id", nullable = false)
    private String oauthId;

    @CreationTimestamp
    @Column(name = "linked_at", updatable = false)
    private LocalDateTime linkedAt;

    @Builder
    public UserSocialAccount(User user, String provider, String oauthId) {
        this.user = user;
        this.provider = provider;
        this.oauthId = oauthId;
    }
}
