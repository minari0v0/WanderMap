package com.wandermap.wandermap.domain.expense;

import com.wandermap.wandermap.domain.auth.User;
import com.wandermap.wandermap.domain.trip.Trip;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "trip_expenses")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TripExpense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @Column(name = "day_number", nullable = false)
    private Integer dayNumber;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false)
    private Long amount;

    @Column(name = "currency", length = 10)
    private String currency;

    @Column(name = "payer_type", nullable = false, length = 20)
    private String payerType; // UNSPECIFIED | SHARED | MEMBER

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payer_user_id")
    private User payerUser;

    @Column(name = "payer_name", length = 60)
    private String payerName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public String getCurrency() {
        return (currency != null && !currency.isBlank()) ? currency : "KRW";
    }

    @Builder
    public TripExpense(
            Trip trip,
            Integer dayNumber,
            String title,
            Long amount,
            String currency,
            String payerType,
            User payerUser,
            String payerName,
            User createdBy
    ) {
        this.trip = trip;
        this.dayNumber = dayNumber;
        this.title = title;
        this.amount = amount;
        this.currency = (currency != null && !currency.isBlank()) ? currency : "KRW";
        this.payerType = payerType != null ? payerType : "UNSPECIFIED";
        this.payerUser = payerUser;
        this.payerName = payerName;
        this.createdBy = createdBy;
    }
}
