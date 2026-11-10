package com.wandermap.wandermap.domain.itinerary;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "places")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Place {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "google_place_id", unique = true, length = 100)
    private String googlePlaceId;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 100)
    private String category;

    @Column(length = 300)
    private String address;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitude;

    @CreationTimestamp
    @Column(name = "cached_at", updatable = false)
    private LocalDateTime cachedAt;

    @Builder
    public Place(String googlePlaceId, String name, String category, String address, BigDecimal latitude, BigDecimal longitude) {
        this.googlePlaceId = googlePlaceId;
        this.name = name;
        this.category = category;
        this.address = address;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public void updateInfo(String name, String category, String address) {
        if (name != null && !name.isBlank()) {
            this.name = name.trim();
        }
        if (category != null && !category.isBlank()) {
            this.category = category.trim();
        }
        if (address != null) {
            this.address = address.trim();
        }
    }
}

