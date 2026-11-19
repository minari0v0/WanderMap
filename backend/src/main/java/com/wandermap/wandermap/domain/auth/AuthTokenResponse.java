package com.wandermap.wandermap.domain.auth;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AuthTokenResponse {
    private UserResponse user;
    private String accessToken;
    private String refreshToken;
}
