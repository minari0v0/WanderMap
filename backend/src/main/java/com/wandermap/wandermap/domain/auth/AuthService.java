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

    private static final java.util.regex.Pattern NICKNAME_PATTERN =
            java.util.regex.Pattern.compile("^[a-zA-Z0-9가-힣]{2,10}$");
    private static final java.util.regex.Pattern PASSWORD_PATTERN =
            java.util.regex.Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]{8,20}$");
    private static final java.util.regex.Pattern EMAIL_PATTERN =
            java.util.regex.Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,6}$");

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (request.getEmail() == null || !EMAIL_PATTERN.matcher(request.getEmail().trim()).matches()) {
            throw new IllegalArgumentException("올바른 이메일 형식을 입력해주세요.");
        }

        if (request.getNickname() == null || !NICKNAME_PATTERN.matcher(request.getNickname().trim()).matches()) {
            throw new IllegalArgumentException("닉네임은 2~10자의 한글, 영문, 숫자만 사용 가능합니다.");
        }

        if (request.getPassword() == null || !PASSWORD_PATTERN.matcher(request.getPassword()).matches()) {
            throw new IllegalArgumentException("비밀번호는 8~20자의 영문과 숫자를 조합하여 입력해주세요.");
        }

        if (!request.getPassword().equals(request.getPasswordConfirm())) {
            throw new IllegalArgumentException("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        }

        if (userRepository.findByEmail(request.getEmail().trim()).isPresent()) {
            throw new IllegalArgumentException("이미 사용 중인 이메일 주소입니다.");
        }

        User user = User.builder()
                .email(request.getEmail().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .nickname(request.getNickname().trim())
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
    public boolean checkNickname(String nickname) {
        if (nickname == null || !NICKNAME_PATTERN.matcher(nickname.trim()).matches()) {
            return false;
        }
        return !userRepository.existsByNickname(nickname.trim());
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail().trim())
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
