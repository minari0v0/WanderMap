package com.wandermap.wandermap.domain.auth.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class PasswordChangeRequest {
    private String currentPassword;
    private String newPassword;
    private String newPasswordConfirm;

    public PasswordChangeRequest(String currentPassword, String newPassword, String newPasswordConfirm) {
        this.currentPassword = currentPassword;
        this.newPassword = newPassword;
        this.newPasswordConfirm = newPasswordConfirm;
    }
}
