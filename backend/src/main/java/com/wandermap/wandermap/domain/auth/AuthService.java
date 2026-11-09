package com.wandermap.wandermap.domain.auth;

import com.wandermap.wandermap.domain.preference.PreferenceRepository;
import com.wandermap.wandermap.domain.trip.Trip;
import com.wandermap.wandermap.domain.trip.TripMemberRepository;
import com.wandermap.wandermap.domain.trip.TripRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthService {

    private final UserRepository userRepository;
    private final UserSocialAccountRepository socialAccountRepository;
    private final EmailVerificationRepository emailVerificationRepository;
    private final TripRepository tripRepository;
    private final TripMemberRepository tripMemberRepository;
    private final PreferenceRepository preferenceRepository;
    private final PasswordEncoder passwordEncoder;

    private static final java.util.regex.Pattern PASSWORD_PATTERN =
            java.util.regex.Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d).{8,20}$");
    private static final java.util.regex.Pattern NICKNAME_PATTERN =
            java.util.regex.Pattern.compile("^[a-zA-Z0-9가-힣_\\-\\s]{2,16}$");

    private static final int EXPIRY_MINUTES = 5;
    private static final int RESEND_COOLDOWN_SECONDS = 30;
    private static final int MAX_RESEND_COUNT = 5;

    @Transactional
    public UserResponse signup(SignupRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new IllegalArgumentException("이메일을 입력해 주세요.");
        }
        if (request.getPassword() == null || !PASSWORD_PATTERN.matcher(request.getPassword()).matches()) {
            throw new IllegalArgumentException("비밀번호는 영문과 숫자를 포함하여 8~20자여야 합니다.");
        }
        if (request.getNickname() == null || request.getNickname().isBlank()) {
            throw new IllegalArgumentException("닉네임을 입력해 주세요.");
        }

        String normalizedEmail = request.getEmail().trim().toLowerCase();
        String trimmedNickname = request.getNickname().trim();

        if (!NICKNAME_PATTERN.matcher(trimmedNickname).matches()) {
            throw new IllegalArgumentException("닉네임은 2~16자의 한글, 영문, 숫자만 사용 가능합니다.");
        }
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new IllegalArgumentException("이미 사용 중인 이메일입니다: " + normalizedEmail);
        }
        if (userRepository.existsByNickname(trimmedNickname)) {
            throw new IllegalArgumentException("이미 사용 중인 닉네임입니다: " + trimmedNickname);
        }

        User user = User.builder()
                .email(normalizedEmail)
                .password(passwordEncoder.encode(request.getPassword()))
                .nickname(trimmedNickname)
                .profileImage(request.getProfileImage() != null && !request.getProfileImage().isBlank()
                        ? request.getProfileImage()
                        : User.generateRandomProfileImage())
                .provider("LOCAL")
                .emailVerified(false)
                .build();

        User savedUser = userRepository.save(user);
        return buildUserResponse(savedUser);
    }

    public UserResponse login(LoginRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new IllegalArgumentException("이메일을 입력해 주세요.");
        }
        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new IllegalArgumentException("비밀번호를 입력해 주세요.");
        }

        String normalizedEmail = request.getEmail().trim().toLowerCase();

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new IllegalArgumentException("가입되지 않은 이메일이거나 비밀번호가 올바르지 않습니다."));

        if (user.getPassword() == null || user.getPassword().isBlank()) {
            throw new IllegalArgumentException("소셜 로그인으로 가입된 계정입니다. 간편 로그인을 이용해 주세요.");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("가입되지 않은 이메일이거나 비밀번호가 올바르지 않습니다.");
        }

        return buildUserResponse(user);
    }

    public UserResponse getMe(Long userId) {
        User user = getUser(userId);
        return buildUserResponse(user);
    }

    public boolean isNicknameDuplicate(String nickname, Long excludeUserId) {
        if (nickname == null || nickname.isBlank()) {
            throw new IllegalArgumentException("닉네임을 입력해 주세요.");
        }
        String trimmed = nickname.trim();
        if (excludeUserId != null) {
            User current = userRepository.findById(excludeUserId).orElse(null);
            if (current != null && trimmed.equals(current.getNickname())) {
                return false;
            }
        }
        return userRepository.existsByNickname(trimmed);
    }

    @Transactional
    public UserResponse updateProfile(Long userId, String nickname, String profileImage, String bio) {
        User user = getUser(userId);

        if ("LOCAL".equalsIgnoreCase(user.getProvider()) && !user.isEmailVerified()) {
            throw new IllegalArgumentException("이메일 인증을 완료한 후에만 프로필을 설정할 수 있습니다.");
        }

        if (nickname != null && !nickname.isBlank()) {
            String trimmedNickname = nickname.trim();
            if (!NICKNAME_PATTERN.matcher(trimmedNickname).matches()) {
                throw new IllegalArgumentException("닉네임은 2~16자의 한글, 영문, 숫자만 사용 가능합니다.");
            }
            if (!trimmedNickname.equals(user.getNickname()) && userRepository.existsByNickname(trimmedNickname)) {
                throw new IllegalArgumentException("이미 사용 중인 닉네임입니다.");
            }
        }

        user.updateProfile(nickname, profileImage, bio);
        return buildUserResponse(user);
    }

    @Transactional
    public void changePassword(Long userId, String currentPassword, String newPassword, String newPasswordConfirm) {
        User user = getUser(userId);

        if (newPassword == null || !PASSWORD_PATTERN.matcher(newPassword).matches()) {
            throw new IllegalArgumentException("새 비밀번호는 8~20자의 영문과 숫자를 조합하여 입력해 주세요.");
        }
        if (newPasswordConfirm != null && !newPassword.equals(newPasswordConfirm)) {
            throw new IllegalArgumentException("새 비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        }

        if (user.getPassword() != null && !user.getPassword().isBlank()) {
            if (currentPassword == null || !passwordEncoder.matches(currentPassword, user.getPassword())) {
                throw new IllegalArgumentException("현재 비밀번호가 일치하지 않습니다.");
            }
            if (passwordEncoder.matches(newPassword, user.getPassword())) {
                throw new IllegalArgumentException("현재 사용 중인 비밀번호와 동일한 비밀번호로는 변경할 수 없습니다.");
            }
        }

        user.updatePassword(passwordEncoder.encode(newPassword));
    }

    @Transactional
    public String sendEmailVerificationCode(Long userId, String emailParam) {
        String targetEmail;
        if (userId != null) {
            User user = getUser(userId);
            targetEmail = user.getEmail();
        } else if (emailParam != null && !emailParam.isBlank()) {
            targetEmail = emailParam.trim().toLowerCase();
        } else {
            throw new IllegalArgumentException("인증할 이메일 정보가 필요합니다.");
        }

        LocalDateTime now = LocalDateTime.now();
        EmailVerification verification = emailVerificationRepository.findByEmail(targetEmail).orElse(null);

        if (verification != null && !verification.isExpired()) {
            if (!verification.canResend()) {
                throw new IllegalArgumentException("인증 코드는 30초 간격으로 재전송할 수 있습니다. 잠시 후 다시 시도해 주세요.");
            }
            if (verification.getResendCount() >= MAX_RESEND_COUNT) {
                throw new IllegalArgumentException("인증 코드 재전송 횟수(최대 5회)를 초과했습니다. 잠시 후 다시 시도해 주세요.");
            }
        }

        String code = generate6DigitCode();
        LocalDateTime expiresAt = now.plusMinutes(EXPIRY_MINUTES);
        LocalDateTime resendAvailableAt = now.plusSeconds(RESEND_COOLDOWN_SECONDS);

        if (verification == null) {
            verification = EmailVerification.builder()
                    .email(targetEmail)
                    .code(code)
                    .resendCount(0)
                    .expiresAt(expiresAt)
                    .resendAvailableAt(resendAvailableAt)
                    .build();
        } else if (verification.isExpired()) {
            verification.resetCode(code, expiresAt, resendAvailableAt);
        } else {
            verification.updateCode(code, expiresAt, resendAvailableAt);
        }
        emailVerificationRepository.save(verification);

        System.out.println("\n==========================================");
        System.out.println("[WanderMap 이메일 인증 코드] " + targetEmail + " -> " + code + " (유효시간 5분)");
        System.out.println("==========================================\n");
        log.info("[Email Verification] To: {}, Code: {}", targetEmail, code);

        return code;
    }

    @Transactional
    public UserResponse verifyEmailCode(Long userId, String emailParam, String code) {
        if (code == null || code.trim().length() != 6) {
            throw new IllegalArgumentException("6자리 인증 코드를 정확히 입력해 주세요.");
        }

        User user = userId != null ? getUser(userId) : null;
        String targetEmail = user != null
                ? user.getEmail()
                : (emailParam != null ? emailParam.trim().toLowerCase() : null);

        if (targetEmail == null || targetEmail.isBlank()) {
            throw new IllegalArgumentException("인증할 이메일 정보가 없습니다.");
        }

        EmailVerification verification = emailVerificationRepository.findByEmail(targetEmail)
                .orElseThrow(() -> new IllegalArgumentException("인증 요청 내역이 존재하지 않습니다. 코드를 다시 전송해 주세요."));

        if (verification.isExpired()) {
            throw new IllegalArgumentException("인증 코드가 만료되었습니다. 재전송 버튼을 눌러 새 코드를 받아주세요.");
        }

        if (!verification.getCode().equals(code.trim())) {
            throw new IllegalArgumentException("인증 코드가 일치하지 않습니다. 다시 확인해 주세요.");
        }

        emailVerificationRepository.delete(verification);

        if (user == null) {
            user = userRepository.findByEmail(targetEmail).orElse(null);
        }
        if (user != null) {
            user.verifyEmail();
            return buildUserResponse(user);
        }
        return null;
    }

    @Transactional
    public UserResponse linkSocial(Long userId, String provider, String oauthId) {
        User user = getUser(userId);
        String upperProvider = provider.toUpperCase();

        if (socialAccountRepository.findByUserIdAndProvider(userId, upperProvider).isEmpty()) {
            UserSocialAccount socialAccount = UserSocialAccount.builder()
                    .user(user)
                    .provider(upperProvider)
                    .oauthId(oauthId != null && !oauthId.isBlank() ? oauthId : "linked-" + upperProvider.toLowerCase() + "-" + userId)
                    .build();
            socialAccountRepository.save(socialAccount);
        }

        return buildUserResponse(user);
    }

    @Transactional
    public UserResponse unlinkSocial(Long userId, String provider) {
        User user = getUser(userId);
        String upperProvider = provider.toUpperCase();

        socialAccountRepository.deleteByUserIdAndProvider(userId, upperProvider);
        return buildUserResponse(user);
    }

    @Transactional
    public void withdraw(Long userId) {
        User user = getUser(userId);

        // 1. 유저가 제출한 선호도 설문 및 참여한 여정 멤버십 정리
        preferenceRepository.deleteByUserId(userId);
        tripMemberRepository.deleteByUser(user);

        // 2. 유저가 생성한 여정 방 및 해당 방의 하위 데이터 정리
        List<Trip> createdTrips = tripRepository.findByCreatedBy(user);
        for (Trip trip : createdTrips) {
            preferenceRepository.deleteByTripId(trip.getId());
            tripMemberRepository.deleteByTrip(trip);
            tripRepository.delete(trip);
        }

        // 3. 소셜 연동, 이메일 인증 내역 및 계정 영구 삭제
        socialAccountRepository.deleteByUserId(userId);
        emailVerificationRepository.deleteByEmail(user.getEmail());
        userRepository.delete(user);
    }

    private User getUser(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("사용자 ID가 필요합니다.");
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다. ID: " + userId));
    }

    private UserResponse buildUserResponse(User user) {
        List<String> linked = socialAccountRepository.findByUserId(user.getId())
                .stream()
                .map(UserSocialAccount::getProvider)
                .collect(Collectors.toList());
        return UserResponse.from(user, linked);
    }

    private String generate6DigitCode() {
        SecureRandom random = new SecureRandom();
        int number = random.nextInt(900000) + 100000;
        return String.valueOf(number);
    }
}
