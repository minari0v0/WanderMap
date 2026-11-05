package com.wandermap.wandermap.domain.auth;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

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
    private List<String> linkedProviders;
    private LocalDateTime createdAt;

    public static UserResponse from(User user) {
        return from(user, Collections.emptyList());
    }

    public static UserResponse from(User user, List<String> linkedProviders) {
        if (user == null) return null;
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .nickname(user.getNickname())
                .profileImage(user.getProfileImage())
                .bio(user.getBio())
                .emailVerified(user.isEmailVerified())
                .provider(user.getProvider())
                .linkedProviders(linkedProviders != null ? linkedProviders : Collections.emptyList())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
