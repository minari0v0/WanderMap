package com.wandermap.wandermap.domain.auth.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class EmailSendRequest {
    private String email;

    public EmailSendRequest(String email) {
        this.email = email;
    }
}
