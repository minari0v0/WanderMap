package com.wandermap.wandermap.domain.auth.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ProfileUpdateRequest {
    private String nickname;
    private String profileImage;
    private String bio;

    public ProfileUpdateRequest(String nickname, String profileImage, String bio) {
        this.nickname = nickname;
        this.profileImage = profileImage;
        this.bio = bio;
    }
}
