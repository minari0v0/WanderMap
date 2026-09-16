package com.wandermap.wandermap.global.mail;

import com.wandermap.wandermap.domain.auth.EmailVerification;
import com.wandermap.wandermap.domain.auth.EmailVerificationRepository;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final EmailVerificationRepository verificationRepository;

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:noreply@wandermap.io}")
    private String senderEmail;

    private static final int EXPIRY_MINUTES = 5;
    private static final int RESEND_COOLDOWN_SECONDS = 30;
    private static final int MAX_RESEND_COUNT = 5;

    @Transactional
    public void sendVerificationCode(String email) {
        LocalDateTime now = LocalDateTime.now();
        EmailVerification verification = verificationRepository.findByEmail(email).orElse(null);

        if (verification != null) {
            // 30초 쿨다운 검증
            if (!verification.canResend()) {
                throw new IllegalStateException("인증 메일은 30초 간격으로 재발송할 수 있습니다. 잠시 후 다시 시도해 주세요.");
            }
            // 최대 5회 제한 검증
            if (verification.getResendCount() >= MAX_RESEND_COUNT) {
                throw new IllegalStateException("인증 메일 재발송 횟수(최대 5회)를 초과했습니다. 나중에 다시 시도해 주세요.");
            }
        }

        String code = generate6DigitCode();
        LocalDateTime expiresAt = now.plusMinutes(EXPIRY_MINUTES);
        LocalDateTime resendAvailableAt = now.plusSeconds(RESEND_COOLDOWN_SECONDS);

        if (verification == null) {
            verification = EmailVerification.builder()
                    .email(email)
                    .code(code)
                    .resendCount(0)
                    .expiresAt(expiresAt)
                    .resendAvailableAt(resendAvailableAt)
                    .build();
        } else {
            verification.updateCode(code, expiresAt, resendAvailableAt);
        }
        verificationRepository.save(verification);

        // HTML 메일 전송
        sendHtmlEmail(email, code);
    }

    @Transactional
    public boolean verifyCode(String email, String code) {
        EmailVerification verification = verificationRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("인증 요청 내역이 존재하지 않습니다."));

        if (verification.isExpired()) {
            throw new IllegalStateException("인증 번호가 만료되었습니다. 다시 발송해 주세요.");
        }

        if (!verification.getCode().equals(code.trim())) {
            throw new IllegalArgumentException("인증 번호가 일치하지 않습니다. 다시 확인해 주세요.");
        }

        // 인증 성공 후 레코드 삭제
        verificationRepository.delete(verification);
        return true;
    }

    private String generate6DigitCode() {
        SecureRandom random = new SecureRandom();
        int number = random.nextInt(900000) + 100000;
        return String.valueOf(number);
    }

    private void sendHtmlEmail(String toEmail, String code) {
        String subject = "[WanderMap] 회원가입 이메일 본인 인증 번호 안내";
        String htmlContent = buildEmailTemplate(code);

        // 1. 개발 및 테스트 편의를 위해 콘솔에 인증 코드 즉시 출력
        System.out.println("\n========================================");
        System.out.println("[Email Verify Code] " + toEmail + " -> " + code);
        System.out.println("========================================\n");

        // 2. 실제 SMTP 계정 설정 확인
        if (mailSender == null || senderEmail == null || senderEmail.isBlank() || senderEmail.contains("noreply")) {
            log.info("[SMTP Skip] spring.mail 계정이 미설정되어 이메일 발송을 스킵하고 콘솔 로그로 대체합니다.");
            return;
        }

        // 3. 실제 SMTP 메일 발송
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(senderEmail);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("[SMTP Success] 이메일 발송 성공: {}", toEmail);
        } catch (Exception e) {
            log.warn("[SMTP Error] 이메일 전송 중 예외 발생: {}", e.getMessage());
        }
    }

    private String buildEmailTemplate(String code) {
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>WanderMap 이메일 인증</title>
        </head>
        <body style="margin: 0; padding: 30px 15px; background-color: #F8F9FA; font-family: 'Suit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 28px; border: 1px solid #F1EFE9; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.04);">
                <!-- 상단 헤더 배너 -->
                <div style="background-color: #FFF5F0; padding: 22px 30px; text-align: center;">
                    <span style="font-size: 16px; font-weight: 800; letter-spacing: -0.5px; color: #FF5A36;">WanderMap</span>
                </div>
                
                <!-- 메인 본문 -->
                <div style="padding: 40px 35px 30px 35px; text-align: center;">
                    <div style="font-size: 40px; line-height: 1; margin-bottom: 20px;">🍊</div>
                    
                    <h2 style="font-size: 22px; font-weight: 800; color: #18181B; margin: 0 0 14px 0; letter-spacing: -0.5px;">
                        당신만의 특별한 여행을 위해
                    </h2>
                    
                    <p style="font-size: 13px; line-height: 1.65; color: #6B6B72; margin: 0 0 28px 0;">
                        안녕하세요! 실시간 여행 협업 플랫폼 <strong>WanderMap</strong>에 오신 것을 진심으로 환영합니다.<br>
                        본인 인증 및 계정 연동을 완료하기 위해 아래의 6자리 인증 코드를 입력창에 입력해주세요.
                    </p>
                    
                    <!-- 6자리 인증 번호 점선 박스 -->
                    <div style="background-color: #FFFAF8; border: 1.5px dashed #FF8A65; border-radius: 18px; padding: 24px 20px; margin-bottom: 22px;">
                        <div style="font-size: 11px; font-weight: 700; color: #FF5A36; letter-spacing: 1px; margin-bottom: 8px;">인증 번호</div>
                        <div style="font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #FF4500; font-family: 'Courier New', monospace;">
                            """ + code + """
                        </div>
                    </div>
                    
                    <p style="font-size: 12px; font-weight: 600; color: #8C8C94; margin: 0 0 28px 0;">
                        인증 코드는 발송 후 <strong style="color: #FF5A36;">5분 동안</strong> 유효합니다.<br>
                        시간이 지나면 만료되므로 인증을 다시 시도해주세요.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #F1EFE9; margin: 24px 0;">
                    
                    <p style="font-size: 11px; color: #A1A1AA; line-height: 1.5; margin: 0;">
                        본 메일은 회원님의 요청에 의해 발송된 시스템 자동 메일입니다.<br>
                        요청하지 않으셨다면 이 메일을 무시하셔도 안전합니다.
                    </p>
                </div>
                
                <!-- 푸터 -->
                <div style="background-color: #FAFAFA; padding: 14px; text-align: center; border-top: 1px solid #F1EFE9;">
                    <span style="font-size: 11px; color: #A1A1AA;">© 2026 WanderMap. All rights reserved.</span>
                </div>
            </div>
        </body>
        </html>
        """;
    }
}
