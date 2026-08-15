package com.wandermap.wandermap.domain.preference;

import com.wandermap.wandermap.domain.auth.User;
import com.wandermap.wandermap.domain.trip.Trip;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "preferences", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"trip_id", "user_id"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Preference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "food_categories", columnDefinition = "jsonb")
    private List<String> foodCategories = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "activity_types", columnDefinition = "jsonb")
    private List<String> activityTypes = new ArrayList<>();

    @Column(name = "excluded_keywords", length = 200)
    private String excludedKeywords;

    @Column(name = "free_memo", columnDefinition = "TEXT")
    private String freeMemo;

    @CreationTimestamp
    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Builder
    public Preference(Trip trip, User user, List<String> foodCategories, List<String> activityTypes, String excludedKeywords, String freeMemo) {
        this.trip = trip;
        this.user = user;
        this.foodCategories = foodCategories != null ? foodCategories : new ArrayList<>();
        this.activityTypes = activityTypes != null ? activityTypes : new ArrayList<>();
        this.excludedKeywords = excludedKeywords;
        this.freeMemo = freeMemo;
    }

    public void update(List<String> foodCategories, List<String> activityTypes, String excludedKeywords, String freeMemo) {
        this.foodCategories = foodCategories != null ? foodCategories : new ArrayList<>();
        this.activityTypes = activityTypes != null ? activityTypes : new ArrayList<>();
        this.excludedKeywords = excludedKeywords;
        this.freeMemo = freeMemo;
        this.submittedAt = LocalDateTime.now();
    }
}
