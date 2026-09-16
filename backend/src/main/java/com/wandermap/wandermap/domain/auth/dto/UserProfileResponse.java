package com.wandermap.wandermap.domain.auth.dto;

import com.wandermap.wandermap.domain.auth.User;
import com.wandermap.wandermap.domain.auth.UserSocialAccount;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class UserProfileResponse {
    private Long id;
    private String email;
    private String nickname;
    private String profileImage;
    private String bio;
    private boolean emailVerified;
    private String provider;
    private boolean hasPassword;
    private List<String> linkedProviders;

    public static UserProfileResponse from(User user, List<UserSocialAccount> socialAccounts) {
        List<String> providers = socialAccounts.stream()
                .map(UserSocialAccount::getProvider)
                .toList();

        return UserProfileResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .nickname(user.getNickname())
                .profileImage(user.getProfileImage())
                .bio(user.getBio())
                .emailVerified(user.isEmailVerified())
                .provider(user.getProvider())
                .hasPassword(user.getPassword() != null && !user.getPassword().isBlank())
                .linkedProviders(providers)
                .build();
    }
}
