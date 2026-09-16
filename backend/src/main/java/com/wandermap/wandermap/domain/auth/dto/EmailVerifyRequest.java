package com.wandermap.wandermap.domain.auth.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class EmailVerifyRequest {
    private String email;
    private String code;

    public EmailVerifyRequest(String email, String code) {
        this.email = email;
        this.code = code;
    }
}
