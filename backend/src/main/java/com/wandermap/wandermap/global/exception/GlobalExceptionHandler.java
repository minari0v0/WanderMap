package com.wandermap.wandermap.global.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatusException(ResponseStatusException ex) {
        String msg = ex.getReason() != null ? ex.getReason() : "요청을 처리할 수 없습니다.";
        return ResponseEntity
                .status(ex.getStatusCode())
                .body(Map.of(
                        "status", ex.getStatusCode().value(),
                        "error", msg,
                        "message", msg
                ));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgumentException(IllegalArgumentException ex) {
        String msg = ex.getMessage() != null ? ex.getMessage() : "잘못된 요청입니다.";
        HttpStatus status = msg.contains("로그인")
                ? HttpStatus.UNAUTHORIZED
                : msg.contains("존재하지 않는")
                    ? HttpStatus.NOT_FOUND
                    : HttpStatus.BAD_REQUEST;

        return ResponseEntity
                .status(status)
                .body(Map.of(
                        "status", status.value(),
                        "error", msg,
                        "message", msg
                ));
    }
}

