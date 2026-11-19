package com.wandermap.wandermap.global.config;

import com.wandermap.wandermap.global.security.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Value("${CORS_ALLOWED_ORIGINS:http://localhost:3000,http://127.0.0.1:3000}")
    private String allowedOrigins;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex.authenticationEntryPoint((req, res, authEx) -> {
                res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                res.setCharacterEncoding("UTF-8");
                res.setContentType("application/json;charset=UTF-8");
                res.getWriter().write("{\"status\":401,\"error\":\"로그인이 필요하거나 인증이 만료되었습니다.\",\"message\":\"로그인이 필요하거나 인증이 만료되었습니다.\"}");
            }))
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/health/redis").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/signup", "/api/auth/login", "/api/auth/refresh", "/api/auth/logout").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/auth/check-nickname").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/trips/my").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/trips/*/preferences/me").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/trips/invite/**", "/api/trips/*", "/api/trips/*/itinerary", "/api/trips/*/expenses", "/api/trips/*/preferences").permitAll()
                .requestMatchers("/api/trips/*/presence", "/api/trips/*/presence/**").permitAll()
                .requestMatchers("/ws/**").permitAll()
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
