package com.wandermap.wandermap.domain.auth;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class UserResponse {
    private Long id;
    private String email;
    private String nickname;
    private String profileImage;
    private String bio;
    private boolean emailVerified;
    private String provider;
    private LocalDateTime createdAt;

    public static UserResponse from(User user) {
        if (user == null) return null;
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .nickname(user.getNickname())
                .profileImage(user.getProfileImage())
                .bio(user.getBio())
                .emailVerified(user.isEmailVerified())
                .provider(user.getProvider())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
