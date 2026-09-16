package com.wandermap.wandermap.domain.auth;

import com.wandermap.wandermap.domain.auth.dto.PasswordChangeRequest;
import com.wandermap.wandermap.domain.auth.dto.ProfileUpdateRequest;
import com.wandermap.wandermap.domain.auth.dto.UserProfileResponse;
import com.wandermap.wandermap.global.mail.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserSocialAccountRepository socialAccountRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public UserProfileResponse getMyProfile(Long userId) {
        User user = getUser(userId);
        List<UserSocialAccount> socialAccounts = socialAccountRepository.findByUserId(userId);
        return UserProfileResponse.from(user, socialAccounts);
    }

    @Transactional
    public void sendEmailVerification(Long userId) {
        User user = getUser(userId);
        emailService.sendVerificationCode(user.getEmail());
    }

    @Transactional
    public void verifyEmail(Long userId, String code) {
        User user = getUser(userId);
        emailService.verifyCode(user.getEmail(), code);
        user.verifyEmail();
    }

    @Transactional
    public UserProfileResponse updateProfile(Long userId, ProfileUpdateRequest request) {
        User user = getUser(userId);
        user.updateProfile(request.getNickname(), request.getProfileImage(), request.getBio());
        List<UserSocialAccount> socialAccounts = socialAccountRepository.findByUserId(userId);
        return UserProfileResponse.from(user, socialAccounts);
    }

    @Transactional
    public void changePassword(Long userId, PasswordChangeRequest request) {
        User user = getUser(userId);

        if (!request.getNewPassword().equals(request.getNewPasswordConfirm())) {
            throw new IllegalArgumentException("새 비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        }

        // 기존 비밀번호가 설정되어 있는 경우 현재 비밀번호 확인
        if (user.getPassword() != null && !user.getPassword().isBlank()) {
            if (request.getCurrentPassword() == null || !passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
                throw new IllegalArgumentException("현재 비밀번호가 일치하지 않습니다.");
            }
        }

        user.updatePassword(passwordEncoder.encode(request.getNewPassword()));
    }

    @Transactional
    public UserProfileResponse linkSocial(Long userId, String provider, String oauthId) {
        User user = getUser(userId);
        String upperProvider = provider.toUpperCase();

        if (socialAccountRepository.findByUserIdAndProvider(userId, upperProvider).isEmpty()) {
            UserSocialAccount socialAccount = UserSocialAccount.builder()
                    .user(user)
                    .provider(upperProvider)
                    .oauthId(oauthId)
                    .build();
            socialAccountRepository.save(socialAccount);
        }

        List<UserSocialAccount> socialAccounts = socialAccountRepository.findByUserId(userId);
        return UserProfileResponse.from(user, socialAccounts);
    }

    @Transactional
    public UserProfileResponse unlinkSocial(Long userId, String provider) {
        User user = getUser(userId);
        String upperProvider = provider.toUpperCase();

        socialAccountRepository.deleteByUserIdAndProvider(userId, upperProvider);

        List<UserSocialAccount> socialAccounts = socialAccountRepository.findByUserId(userId);
        return UserProfileResponse.from(user, socialAccounts);
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + userId));
    }
}
