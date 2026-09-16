package com.wandermap.wandermap.domain.auth;

import com.wandermap.wandermap.domain.auth.dto.AuthResponse;
import com.wandermap.wandermap.domain.auth.dto.LoginRequest;
import com.wandermap.wandermap.domain.auth.dto.RegisterRequest;
import com.wandermap.wandermap.domain.auth.dto.UserProfileResponse;
import com.wandermap.wandermap.global.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final UserSocialAccountRepository socialAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (request.getPassword() == null || !request.getPassword().equals(request.getPasswordConfirm())) {
            throw new IllegalArgumentException("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        }

        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new IllegalArgumentException("이미 사용 중인 이메일 주소입니다.");
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .nickname(request.getNickname())
                .emailVerified(false)
                .provider("LOCAL")
                .build();

        userRepository.save(user);

        String accessToken = tokenProvider.generateAccessToken(user.getId(), user.getEmail());
        String refreshToken = tokenProvider.generateRefreshToken(user.getId());

        UserProfileResponse userProfile = UserProfileResponse.from(user, Collections.emptyList());
        return AuthResponse.of(accessToken, refreshToken, userProfile);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("가입되지 않은 이메일 주소입니다."));

        if (user.getPassword() == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("비밀번호가 올바르지 않습니다.");
        }

        String accessToken = tokenProvider.generateAccessToken(user.getId(), user.getEmail());
        String refreshToken = tokenProvider.generateRefreshToken(user.getId());

        List<UserSocialAccount> socialAccounts = socialAccountRepository.findByUserId(user.getId());
        UserProfileResponse userProfile = UserProfileResponse.from(user, socialAccounts);
        return AuthResponse.of(accessToken, refreshToken, userProfile);
    }
}
