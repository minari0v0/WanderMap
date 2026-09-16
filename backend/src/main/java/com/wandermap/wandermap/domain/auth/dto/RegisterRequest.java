package com.wandermap.wandermap.domain.auth.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class RegisterRequest {
    private String nickname;
    private String email;
    private String password;
    private String passwordConfirm;

    public RegisterRequest(String nickname, String email, String password, String passwordConfirm) {
        this.nickname = nickname;
        this.email = email;
        this.password = password;
        this.passwordConfirm = passwordConfirm;
    }
}
