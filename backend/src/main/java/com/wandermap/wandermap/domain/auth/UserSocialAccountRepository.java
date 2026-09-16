package com.wandermap.wandermap.domain.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserSocialAccountRepository extends JpaRepository<UserSocialAccount, Long> {
    List<UserSocialAccount> findByUserId(Long userId);
    Optional<UserSocialAccount> findByProviderAndOauthId(String provider, String oauthId);
    Optional<UserSocialAccount> findByUserIdAndProvider(Long userId, String provider);
    void deleteByUserIdAndProvider(Long userId, String provider);
}
